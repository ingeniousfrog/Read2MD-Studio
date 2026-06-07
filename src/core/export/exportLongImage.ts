import i18n from "../../i18n";
import { inlineR2mdAssetImages } from "../assets/inlineAssets";
import { renderMarkdown } from "../markdown/renderMarkdown";
import { rasterizeMermaidInHtml } from "../markdown/rasterizeMermaid";
import { applyThemeHtml } from "../theme/applyTheme";
import type { ThemeDefinition } from "../theme/themes";
import { captureElementToBlob } from "./domScreenshot";

const EXPORT_WIDTH = 750;

export interface ExportLongImageInput {
  markdown: string;
  theme: ThemeDefinition;
  docId: string | null;
  title?: string;
}

export interface ExportLongImageResult {
  ok: boolean;
  blob?: Blob;
  filename: string;
  message: string;
  warnings: string[];
}

function sanitizeFilename(title: string): string {
  const trimmed = title.trim() || "read2md-article";
  return `${trimmed.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80)}.png`;
}

async function inlineExternalImagesInContainer(container: HTMLElement): Promise<string[]> {
  const warnings: string[] = [];
  const images = Array.from(container.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src");
      if (!source || source.startsWith("data:")) {
        return;
      }

      try {
        const response = await fetch(source, { mode: "cors", credentials: "omit" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read image blob"));
          reader.readAsDataURL(blob);
        });
        image.setAttribute("src", dataUrl);
      } catch {
        warnings.push(i18n.t("warnings.imageInlineFailed", { source }));
      }
    }),
  );

  return warnings;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportLongImage(input: ExportLongImageInput): Promise<ExportLongImageResult> {
  if (typeof document === "undefined") {
    return {
      ok: false,
      filename: "read2md-article.png",
      message: i18n.t("export.unsupported"),
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const rendered = renderMarkdown({ markdown: input.markdown });
  const themed = applyThemeHtml({ rawHtml: rendered.rawHtml, theme: input.theme });
  const mermaidResult = await rasterizeMermaidInHtml(themed.html);
  warnings.push(...mermaidResult.warnings, ...rendered.warnings);

  const localizedHtml = await inlineR2mdAssetImages(mermaidResult.html, input.docId);
  const filename = sanitizeFilename(input.title ?? "read2md-article");

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = `${EXPORT_WIDTH}px`;
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";

  const style = document.createElement("style");
  style.textContent = themed.css;
  host.appendChild(style);

  const sheet = document.createElement("div");
  sheet.className = "preview-sheet export-long-image-sheet";
  sheet.style.width = `${EXPORT_WIDTH}px`;
  sheet.style.padding = "32px 28px";
  sheet.style.background = "#ffffff";
  sheet.innerHTML = localizedHtml;
  host.appendChild(sheet);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const imageWarnings = await inlineExternalImagesInContainer(sheet);
    warnings.push(...imageWarnings);

    const blob = await captureElementToBlob(sheet, {
      width: EXPORT_WIDTH,
      backgroundColor: "#ffffff",
      preferredScale: 2,
    });

    triggerBrowserDownload(blob, filename);

    return {
      ok: true,
      blob,
      filename,
      message: i18n.t("export.success"),
      warnings,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      filename,
      message: detail ? `${i18n.t("export.failed")} (${detail})` : i18n.t("export.failed"),
      warnings,
    };
  } finally {
    host.remove();
  }
}
