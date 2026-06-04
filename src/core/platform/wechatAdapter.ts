import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import juice from "juice";
import katexCss from "katex/dist/katex.min.css?inline";
import { applyThemeHtml } from "../theme/applyTheme";
import { extractPlainTextFromHtml, type PlatformAdapterInput, type PlatformOutput } from "./commonAdapter";

const formulaCompatibilityWarning = "公式已转换为 PNG 图片；若公众号后台仍拒绝插入，后续需要接入图片上传。";
const formulaRenderFailureWarning = "有公式未能转换为 PNG，已保留为 KaTeX HTML，公众号后台可能显示异常。";
const imageCompatibilityWarning = "检测到外链图片，已尝试转为内嵌图片；若仍插入失败，后续需要接入图片上传或素材库。";
const imageFetchFailureWarning = "有外链图片因浏览器跨域限制无法转为内嵌图片，复制后可能需要在公众号后台重新上传。";

export async function buildWechatOutput(input: PlatformAdapterInput): Promise<PlatformOutput> {
  const themed = applyThemeHtml({
    rawHtml: input.rawHtml,
    theme: input.theme,
  });
  const warnings = [...(input.warnings ?? [])];
  const hasFormula = themed.html.includes("katex");
  const hasExternalImage = /<img\s[^>]*src=["']https?:\/\//i.test(themed.html);

  if (hasFormula) {
    warnings.push(formulaCompatibilityWarning);
  }
  if (hasExternalImage) {
    warnings.push(imageCompatibilityWarning);
  }

  let inlineHtml = "";

  try {
    inlineHtml = juice.inlineContent(themed.html, `${themed.css}\n${katexCss}`, {
      inlinePseudoElements: true,
      preserveImportant: true,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Failed to inline theme CSS.");
    inlineHtml = themed.html;
  }

  const html = DOMPurify.sanitize(inlineHtml, {
    ADD_ATTR: ["style", "target"],
  });
  const formulaResult = await replaceFormulaNodesWithPngImages(html);
  if (formulaResult.failedCount > 0) {
    warnings.push(formulaRenderFailureWarning);
  }

  const imageResult = await inlineExternalImages(formulaResult.html);
  if (imageResult.failedCount > 0) {
    warnings.push(imageFetchFailureWarning);
    imageResult.failedSources.slice(0, 3).forEach((source) => {
      warnings.push(`无法内嵌图片：${source}`);
    });
  }

  const finalHtml = DOMPurify.sanitize(imageResult.html, {
    ADD_ATTR: ["style", "target"],
    ADD_DATA_URI_TAGS: ["img"],
  });
  const plainText = extractPlainTextFromHtml(finalHtml);

  return {
    html: finalHtml,
    plainText,
    warnings,
  };
}

async function inlineExternalImages(html: string): Promise<{ html: string; failedCount: number; failedSources: string[] }> {
  if (typeof document === "undefined") {
    return {
      html,
      failedCount: 0,
      failedSources: [],
    };
  }

  const parsedDocument = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(parsedDocument.querySelectorAll("img"));
  let failedCount = 0;
  const failedSources: string[] = [];

  for (const image of images) {
    const source = image.getAttribute("src");

    if (!source || !/^https?:\/\//i.test(source)) {
      continue;
    }

    try {
      const dataUrl = await fetchImageAsPngDataUrl(source);
      image.setAttribute("src", dataUrl);
      image.setAttribute("data-r2md-image", "inlined");
    } catch {
      failedCount += 1;
      failedSources.push(source);
      image.setAttribute("data-r2md-image", "external");
    }
  }

  return {
    html: parsedDocument.body.innerHTML,
    failedCount,
    failedSources,
  };
}

async function fetchImageAsPngDataUrl(source: string): Promise<string> {
  const response = await fetch(source, {
    mode: "cors",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Image request failed: ${response.status}`);
  }

  const blob = await response.blob();
  return convertBlobImageToPngDataUrl(blob);
}

async function replaceFormulaNodesWithPngImages(html: string): Promise<{ html: string; failedCount: number }> {
  if (typeof document === "undefined") {
    return {
      html,
      failedCount: 0,
    };
  }

  const parsedDocument = new DOMParser().parseFromString(html, "text/html");
  const displayFormulaNodes = Array.from(parsedDocument.querySelectorAll(".katex-display"));
  let failedCount = 0;

  failedCount += await replaceNodes(displayFormulaNodes, true);

  const inlineFormulaNodes = Array.from(parsedDocument.querySelectorAll(".katex"));
  failedCount += await replaceNodes(inlineFormulaNodes, false);

  return {
    html: parsedDocument.body.innerHTML,
    failedCount,
  };
}

async function replaceNodes(nodes: Element[], isDisplay: boolean): Promise<number> {
  let failedCount = 0;

  for (const node of nodes) {
    try {
      const image = await createFormulaImage(node, isDisplay);
      node.replaceWith(image);
    } catch {
      failedCount += 1;
      node.setAttribute("data-r2md-formula", "html-fallback");
    }
  }

  return failedCount;
}

async function createFormulaImage(node: Element, isDisplay: boolean): Promise<HTMLImageElement> {
  const formulaText = node.textContent?.replace(/\s+/g, " ").trim() || "formula";
  const pngDataUrl = await renderFormulaNodeToPngDataUrl(node, isDisplay);
  const image = document.createElement("img");

  image.src = pngDataUrl;
  image.alt = formulaText;
  image.setAttribute("data-r2md-formula", "png");
  image.style.display = isDisplay ? "block" : "inline-block";
  image.style.maxWidth = "100%";
  image.style.height = "auto";
  image.style.margin = isDisplay ? "12px auto" : "0 2px";
  image.style.verticalAlign = isDisplay ? "middle" : "-0.18em";

  return image;
}

async function convertBlobImageToPngDataUrl(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image could not be loaded.")));
    image.decoding = "async";
    image.src = source;
  });
}

async function renderFormulaNodeToPngDataUrl(node: Element, isDisplay: boolean): Promise<string> {
  const container = document.createElement("div");

  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = isDisplay ? "760px" : "auto";
  container.style.maxWidth = "760px";
  container.style.padding = "8px";
  container.style.background = "#ffffff";
  container.style.color = "#25313f";
  container.style.zIndex = "-1";
  container.innerHTML = `<style>${katexCss}</style>${node.outerHTML}`;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      logging: false,
      scale: 2,
      useCORS: true,
      windowWidth: 760,
    });

    return canvas.toDataURL("image/png");
  } finally {
    document.body.removeChild(container);
  }
}
