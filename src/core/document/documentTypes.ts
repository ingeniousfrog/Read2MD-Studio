import { defaultThemeId } from "../theme/themes";
import { defaultCustomTokens, type ThemeTokenInput } from "../theme/themeTokens";
import type { ThemeId } from "../theme/themes";

export type DocumentSource = "blank" | "wechat" | "html";

export interface StudioDocument {
  id: string;
  title: string;
  markdown: string;
  themeId: ThemeId;
  customThemeTokens: ThemeTokenInput;
  customThemeName: string;
  source: DocumentSource;
  sourceUrl?: string;
  /** Filenames under assets/{docId}/ for localized images */
  assetFiles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedTheme {
  id: string;
  name: string;
  tokens: ThemeTokenInput;
  createdAt: string;
}

export function createDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSavedThemeId(): string {
  return `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlankDocument(title = "未命名文档"): StudioDocument {
  const now = new Date().toISOString();
  return {
    id: createDocumentId(),
    title,
    markdown: "",
    themeId: defaultThemeId,
    customThemeTokens: defaultCustomTokens,
    customThemeName: "Custom",
    source: "blank",
    createdAt: now,
    updatedAt: now,
  };
}

export function createImportedDocument(input: {
  title: string;
  markdown: string;
  tokens: ThemeTokenInput;
  themeName: string;
  source: Exclude<DocumentSource, "blank">;
  sourceUrl?: string;
  assetFiles?: string[];
}): StudioDocument {
  const now = new Date().toISOString();
  return {
    id: createDocumentId(),
    title: input.title,
    markdown: input.markdown,
    themeId: "custom",
    customThemeTokens: input.tokens,
    customThemeName: input.themeName,
    source: input.source,
    sourceUrl: input.sourceUrl,
    assetFiles: input.assetFiles,
    createdAt: now,
    updatedAt: now,
  };
}
