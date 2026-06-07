import mermaid from "mermaid";
import i18n from "../../i18n";
import { sanitizeMermaidDefinition } from "./sanitizeMermaid";

let initialized = false;
let renderGeneration = 0;

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
    flowchart: {
      htmlLabels: false,
    },
  });
  initialized = true;
}

/** Pre-initialize Mermaid at app startup to avoid first-render race. */
export function preinitializeMermaid(): void {
  ensureMermaid();
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

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForRenderReady(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await waitForNextFrame();
  await waitForNextFrame();
}

function clearMermaidError(parent: HTMLPreElement): void {
  const sibling = parent.nextElementSibling;
  if (sibling?.classList.contains("r2md-mermaid-error")) {
    sibling.remove();
  }
  delete parent.dataset.mermaidRendered;
}

export function hasPendingMermaidBlocks(container: HTMLElement): boolean {
  return collectMermaidBlocks(container).length > 0;
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

    if (parent.dataset.mermaidRendered === "1") {
      continue;
    }

    const definition = decodeHtmlEntities(code.textContent?.trim() ?? "");
    if (!definition || !isMermaidDefinition(definition)) {
      continue;
    }

    clearMermaidError(parent);
    results.push(parent);
  }

  return results;
}

async function renderSingleBlock(parent: HTMLPreElement, generation: number): Promise<boolean> {
  if (generation !== renderGeneration) {
    return false;
  }

  const code = parent.querySelector("code");
  const definition = decodeHtmlEntities(code?.textContent?.trim() ?? "");
  if (!definition || !parent.isConnected) {
    return false;
  }

  const id = `r2md-mermaid-${Math.random().toString(36).slice(2, 10)}`;
  const sanitized = sanitizeMermaidDefinition(definition);

  try {
    const { svg } = await mermaid.render(id, sanitized);
    if (generation !== renderGeneration || !parent.isConnected) {
      return false;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "r2md-mermaid";
    wrapper.innerHTML = svg;
    parent.replaceWith(wrapper);
    return true;
  } catch (error) {
    if (generation !== renderGeneration || !parent.isConnected) {
      return false;
    }

    const message = error instanceof Error ? error.message : i18n.t("warnings.mermaidRenderFailed");
    clearMermaidError(parent);

    const fallback = document.createElement("div");
    fallback.className = "r2md-mermaid-error";
    fallback.textContent = i18n.t("warnings.mermaidPreviewFailed", { message });
    parent.insertAdjacentElement("afterend", fallback);
    return false;
  }
}

export async function renderMermaidBlocks(container: HTMLElement): Promise<void> {
  const generation = ++renderGeneration;
  await waitForRenderReady();

  if (generation !== renderGeneration || !container.isConnected) {
    return;
  }

  const blocks = collectMermaidBlocks(container);
  if (blocks.length === 0) {
    return;
  }

  ensureMermaid();

  for (const parent of blocks) {
    if (generation !== renderGeneration) {
      return;
    }
    await renderSingleBlock(parent, generation);
  }
}

export async function renderMermaidBlocksWithRetry(container: HTMLElement): Promise<void> {
  await renderMermaidBlocks(container);

  if (!container.isConnected) {
    return;
  }

  const remaining = collectMermaidBlocks(container);
  if (remaining.length === 0) {
    return;
  }

  await waitForRenderReady();
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 120);
  });

  if (!container.isConnected) {
    return;
  }

  await renderMermaidBlocks(container);
}
