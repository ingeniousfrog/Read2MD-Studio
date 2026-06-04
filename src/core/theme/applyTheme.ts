import type { ThemeDefinition } from "./themes";

export interface ApplyThemeInput {
  rawHtml: string;
  theme: ThemeDefinition;
}

export interface ApplyThemeOutput {
  html: string;
  css: string;
  themeId: ThemeDefinition["id"];
}

export function applyThemeHtml(input: ApplyThemeInput): ApplyThemeOutput {
  return {
    html: `<article class="r2md-article">${input.rawHtml}</article>`,
    css: input.theme.css,
    themeId: input.theme.id,
  };
}
