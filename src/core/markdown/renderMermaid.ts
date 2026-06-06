import mermaid from "mermaid";
import { sanitizeMermaidDefinition } from "./sanitizeMermaid";

let initialized = false;

const MERMAID_START =
  /^(flowchart\b|graph\b|sequenceDiagram\b|classDiagram\b|stateDiagram\b|erDiagram\b|journey\b|gantt\b|pie\b|mindmap\b|timeline\b|quadrantChart\b)/i;

function ensureMermaid(): void {
  if (initialized) {
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  });
  initialized = true;
}

function decodeHtmlEntities(value: string): string {
  if (typeof document === "undefined") {
    return value;
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function isMermaidDefinition(value: string): boolean {
  return MERMAID_START.test(value.trim());
}

function collectMermaidBlocks(container: HTMLElement): HTMLPreElement[] {
  const codes = Array.from(container.querySelectorAll("pre > code"));
  const results: HTMLPreElement[] = [];

  for (const code of codes) {
    const parent = code.parentElement;
    if (!parent || !(parent instanceof HTMLPreElement)) {
      continue;
    }
    if (parent.classList.contains("r2md-mermaid-pending") || code.classList.contains("language-mermaid")) {
      // fast path
    } else {
      const definition = decodeHtmlEntities(code.textContent?.trim() ?? "");
      if (!isMermaidDefinition(definition)) {
        continue;
      }
    }

    if (parent.dataset.mermaidRendered === "1" || parent.dataset.mermaidRendered === "error") {
      continue;
    }

    const definition = decodeHtmlEntities(code.textContent?.trim() ?? "");
    if (!definition || !isMermaidDefinition(definition)) {
      continue;
    }

    results.push(parent);
  }

  return results;
}

export async function renderMermaidBlocks(container: HTMLElement): Promise<void> {
  const blocks = collectMermaidBlocks(container);
  if (blocks.length === 0) {
    return;
  }

  ensureMermaid();

  for (const parent of blocks) {
    const code = parent.querySelector("code");
    const definition = decodeHtmlEntities(code?.textContent?.trim() ?? "");
    if (!definition) {
      continue;
    }

    const id = `r2md-mermaid-${Math.random().toString(36).slice(2, 10)}`;
    const sanitized = sanitizeMermaidDefinition(definition);
    try {
      const { svg } = await mermaid.render(id, sanitized);
      const wrapper = document.createElement("div");
      wrapper.className = "r2md-mermaid";
      wrapper.innerHTML = svg;
      parent.replaceWith(wrapper);
    } catch (error) {
      parent.dataset.mermaidRendered = "error";
      const message = error instanceof Error ? error.message : "Mermaid 渲染失败";
      const fallback = document.createElement("div");
      fallback.className = "r2md-mermaid-error";
      fallback.textContent = `Mermaid 预览失败：${message}`;
      parent.insertAdjacentElement("afterend", fallback);
    }
  }
}
