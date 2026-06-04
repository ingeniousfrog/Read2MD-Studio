import DOMPurify from "dompurify";
import juice from "juice";
import { applyThemeHtml } from "../theme/applyTheme";
import { extractPlainTextFromHtml, type PlatformAdapterInput, type PlatformOutput } from "./commonAdapter";

export function buildWechatOutput(input: PlatformAdapterInput): PlatformOutput {
  const themed = applyThemeHtml({
    rawHtml: input.rawHtml,
    theme: input.theme,
  });
  const warnings = [...(input.warnings ?? [])];

  let inlineHtml = "";

  try {
    inlineHtml = juice.inlineContent(themed.html, themed.css, {
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
  const plainText = extractPlainTextFromHtml(html);

  return {
    html,
    plainText,
    warnings,
  };
}
