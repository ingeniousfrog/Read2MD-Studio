import DOMPurify from "dompurify";
import juice from "juice";
import i18n from "../../i18n";
import { inlineR2mdAssetImages } from "../assets/inlineAssets";
import { rasterizeMermaidInHtml } from "../markdown/rasterizeMermaid";
import { applyThemeHtml } from "../theme/applyTheme";
import { injectH2Numbering, stripH2PseudoCss, themeUsesH2Numbering } from "../theme/h2Numbering";
import { extractPlainTextFromHtml, type PlatformAdapterInput, type PlatformOutput } from "./commonAdapter";

const formulaCompatibilityNote = () => i18n.t("warnings.formulaNote");
const mermaidCompatibilityNote = () => i18n.t("warnings.mermaidNote");
const imageCompatibilityWarning = () => i18n.t("warnings.externalImage");
const imageFetchFailureWarning = () => i18n.t("warnings.imageFetchFailed");

export async function buildWechatOutput(input: PlatformAdapterInput): Promise<PlatformOutput> {
  const themed = applyThemeHtml({
    rawHtml: input.rawHtml,
    theme: input.theme,
  });
  const warnings = [...(input.warnings ?? [])];
  const hasFormula = /<svg[\s>]/i.test(themed.html);
  const hasExternalImage = /<img\s[^>]*src=["']https?:\/\//i.test(themed.html);
  const hasMermaid = /r2md-mermaid-pending/i.test(themed.html);

  if (hasFormula) {
    warnings.push(formulaCompatibilityNote());
  }
  if (hasExternalImage) {
    warnings.push(imageCompatibilityWarning());
  }

  const mermaidResult = await rasterizeMermaidInHtml(themed.html);
  if (mermaidResult.warnings.length > 0) {
    warnings.push(...mermaidResult.warnings);
  }
  if (hasMermaid && mermaidResult.warnings.length === 0) {
    warnings.push(mermaidCompatibilityNote());
  }

  // Pull formula blocks out before inlining CSS. juice relies on cheerio, which
  // lowercases attribute names (viewBox -> viewbox) and breaks SVG rendering.
  // MathJax may emit nested <svg> nodes (e.g. underbrace labels); a naive
  // <svg>...</svg> regex would split them and drop inner content on restore.
  const { html: htmlWithoutSvg, svgMap } = extractFormulaPlaceholders(mermaidResult.html);
  const usesH2Numbering = themeUsesH2Numbering(input.theme);
  const badgeColor = input.theme.tokens?.primaryColor ?? "#95633a";
  const htmlForInline = usesH2Numbering
    ? injectH2Numbering(htmlWithoutSvg, badgeColor)
    : htmlWithoutSvg;
  const cssForInline = usesH2Numbering ? stripH2PseudoCss(themed.css) : themed.css;

  let inlineHtml = "";

  try {
    inlineHtml = juice.inlineContent(htmlForInline, cssForInline, {
      inlinePseudoElements: true,
      preserveImportant: true,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : i18n.t("warnings.inlineCssFailed"));
    inlineHtml = htmlForInline;
  }

  const sanitizedHtml = DOMPurify.sanitize(inlineHtml, {
    ADD_ATTR: ["style", "target"],
  });

  const localizedHtml = await inlineR2mdAssetImages(sanitizedHtml, input.docId ?? null);
  const imageResult = await inlineExternalImages(localizedHtml);
  if (imageResult.failedCount > 0) {
    warnings.push(imageFetchFailureWarning());
    imageResult.failedSources.slice(0, 3).forEach((source) => {
      warnings.push(i18n.t("warnings.imageInlineFailed", { source }));
    });
  }

  // Restore the trusted, self-contained MathJax SVG output last so it is never
  // mangled by juice, DOMPurify, or the DOM parser used for image inlining.
  const finalHtml = restoreSvgPlaceholders(imageResult.html, svgMap);
  const plainText = extractPlainTextFromHtml(finalHtml);

  return {
    html: finalHtml,
    plainText,
    warnings,
  };
}

const formulaBlockPattern =
  /<section\s+class="[^"]*\br2md-formula-block\b[^"]*"[^>]*>[\s\S]*?<\/section>/gi;
const formulaInlinePattern =
  /<span\s+class="[^"]*\br2md-formula-inline\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi;

function extractFormulaPlaceholders(html: string): { html: string; svgMap: Map<string, string> } {
  const svgMap = new Map<string, string>();
  let index = 0;

  const replaced = html.replace(formulaBlockPattern, (match) => {
    const token = `@@R2MD_FORMULA_${index}@@`;
    svgMap.set(token, match);
    index += 1;
    return token;
  }).replace(formulaInlinePattern, (match) => {
    const token = `@@R2MD_FORMULA_${index}@@`;
    svgMap.set(token, match);
    index += 1;
    return token;
  });

  return {
    html: replaced,
    svgMap,
  };
}

function restoreSvgPlaceholders(html: string, svgMap: Map<string, string>): string {
  let result = html;

  for (const [token, svg] of svgMap) {
    result = result.split(token).join(svg);
  }

  return result;
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
