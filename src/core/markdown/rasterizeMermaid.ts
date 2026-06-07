import mermaid from "mermaid";
import i18n from "../../i18n";
import { blobToDataUrl, captureElementToBlob } from "../export/domScreenshot";
import { sanitizeMermaidDefinition } from "./sanitizeMermaid";
import { preinitializeMermaid } from "./renderMermaid";

const MERMAID_BLOCK_PATTERN =
  /<pre\s+class="[^"]*\br2md-mermaid-pending\b[^"]*"[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;

function decodeHtmlEntities(value: string): string {
  if (typeof document === "undefined") {
    return value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function parseSvgSize(svgMarkup: string): { width: number; height: number } {
  const viewBoxMatch = svgMarkup.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch?.[1]) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return {
        width: Math.max(1, Math.ceil(parts[2])),
        height: Math.max(1, Math.ceil(parts[3])),
      };
    }
  }

  const widthMatch = svgMarkup.match(/\bwidth=["']([\d.]+)/i);
  const heightMatch = svgMarkup.match(/\bheight=["']([\d.]+)/i);
  return {
    width: Math.max(1, Math.ceil(Number(widthMatch?.[1] ?? 800))),
    height: Math.max(1, Math.ceil(Number(heightMatch?.[1] ?? 400))),
  };
}

/**
 * Rasterize SVG via offscreen DOM + modern-screenshot.
 * Avoids WebKit "The operation is insecure" from canvas.drawImage(blobUrl).
 */
async function svgToPngDataUrl(svgMarkup: string): Promise<string> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";

  const { width, height } = parseSvgSize(svgMarkup);
  const wrapper = document.createElement("div");
  wrapper.className = "r2md-mermaid-export";
  wrapper.style.display = "inline-block";
  wrapper.style.width = `${width}px`;
  wrapper.style.background = "#ffffff";
  wrapper.innerHTML = svgMarkup;
  host.appendChild(wrapper);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const blob = await captureElementToBlob(wrapper, {
      width,
      height,
      backgroundColor: "#ffffff",
      preferredScale: 2,
    });
    return blobToDataUrl(blob);
  } finally {
    host.remove();
  }
}

async function renderMermaidToPng(definition: string): Promise<string> {
  preinitializeMermaid();
  const id = `r2md-mermaid-export-${Math.random().toString(36).slice(2, 10)}`;
  const sanitized = sanitizeMermaidDefinition(definition.trim());
  const { svg } = await mermaid.render(id, sanitized);
  return svgToPngDataUrl(svg);
}

function buildMermaidImageTag(dataUrl: string, alt: string): string {
  const safeAlt = alt.replace(/"/g, "&quot;");
  return `<figure class="r2md-mermaid-image"><img src="${dataUrl}" alt="${safeAlt}" style="max-width:100%;height:auto;display:block;margin:1em auto;" data-r2md-mermaid="rasterized" /></figure>`;
}

/**
 * Replace pending Mermaid code blocks in HTML with rasterized PNG images.
 * Used by WeChat copy and long-image export pipelines.
 */
export async function rasterizeMermaidInHtml(html: string): Promise<{ html: string; warnings: string[] }> {
  if (typeof document === "undefined") {
    return { html, warnings: [] };
  }

  const warnings: string[] = [];
  const matches = [...html.matchAll(MERMAID_BLOCK_PATTERN)];

  if (matches.length === 0) {
    return { html, warnings };
  }

  let result = html;

  for (const match of matches) {
    const fullBlock = match[0];
    const encodedDefinition = match[1] ?? "";
    const definition = decodeHtmlEntities(encodedDefinition);

    try {
      const dataUrl = await renderMermaidToPng(definition);
      const imageTag = buildMermaidImageTag(dataUrl, "Mermaid diagram");
      result = result.replace(fullBlock, imageTag);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mermaid rasterization failed";
      warnings.push(i18n.t("warnings.mermaidRasterizeFailed", { message }));
    }
  }

  return { html: result, warnings };
}
