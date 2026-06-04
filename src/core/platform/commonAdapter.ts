import { applyThemeHtml } from "../theme/applyTheme";
import type { ThemeDefinition } from "../theme/themes";

export interface PlatformAdapterInput {
  rawHtml: string;
  theme: ThemeDefinition;
  warnings?: string[];
}

export interface PlatformOutput {
  html: string;
  plainText: string;
  warnings: string[];
}

export function extractPlainTextFromHtml(html: string): string {
  const documentBody = new DOMParser().parseFromString(html, "text/html").body;
  return documentBody.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "";
}

export function buildCommonOutput(input: PlatformAdapterInput): PlatformOutput {
  const themed = applyThemeHtml({
    rawHtml: input.rawHtml,
    theme: input.theme,
  });

  return {
    html: themed.html,
    plainText: extractPlainTextFromHtml(themed.html),
    warnings: input.warnings ?? [],
  };
}
