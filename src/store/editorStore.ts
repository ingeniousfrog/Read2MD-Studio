import { create } from "zustand";
import {
  createBlankDocument,
  createImportedDocument,
  createSavedThemeId,
  type SavedTheme,
  type StudioDocument,
} from "../core/document/documentTypes";
import { deleteDocumentAssetsDir } from "../core/assets/assetStorage";
import {
  isRemoteHttpImage,
  isWechatHostedImage,
  listMarkdownImageUrls,
} from "../core/assets/imageUrl";
import { localizeDocumentImages } from "../core/assets/localizeImages";
import { runUnifiedUrlImport } from "../core/import/runImport";
import type { ImportedArticle } from "../core/import/importTypes";
import {
  defaultThemeId,
  getBuiltinThemeTokens,
  getThemeById,
  type ThemeId,
} from "../core/theme/themes";
import {
  defaultCustomTokens,
  normalizeThemeTokens,
  type HeadingLevelConfig,
  type ThemeTokenInput,
} from "../core/theme/themeTokens";
import { sampleMarkdown } from "../fixtures/sampleMarkdown";

export type PlatformId = "wechat";
export type CopyStatus = "idle" | "copying" | "success" | "error";
export type ThemeActionTone = "idle" | "success" | "error";

interface LegacyPersistedEditorState {
  markdown: string;
  themeId: ThemeId;
  customThemeTokens: ThemeTokenInput;
  customThemeName: string;
}

interface EditorState {
  documents: StudioDocument[];
  activeDocId: string | null;
  savedThemes: SavedTheme[];
  markdown: string;
  themeId: ThemeId;
  platform: PlatformId;
  copyStatus: CopyStatus;
  statusMessage: string;
  warnings: string[];
  customThemeTokens: ThemeTokenInput;
  customThemeName: string;
  isThemePanelOpen: boolean;
  themeActionStatus: {
    tone: ThemeActionTone;
    message: string;
  };
  setMarkdown: (markdown: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  setPlatform: (platform: PlatformId) => void;
  setCopyStatus: (copyStatus: CopyStatus, statusMessage: string) => void;
  setWarnings: (warnings: string[]) => void;
  openThemePanel: () => void;
  closeThemePanel: () => void;
  toggleThemePanel: () => void;
  updateCustomThemeToken: <K extends keyof ThemeTokenInput>(
    key: K,
    value: ThemeTokenInput[K],
  ) => void;
  setHeadingLevels: (levels: HeadingLevelConfig[]) => void;
  resetCustomThemeFromTheme: (themeId: Exclude<ThemeId, "custom">) => void;
  setCustomThemeName: (name: string) => void;
  setCustomThemeTokens: (tokens: ThemeTokenInput) => void;
  setThemeActionStatus: (tone: ThemeActionTone, message: string) => void;
  createDocument: () => void;
  selectDocument: (id: string) => void;
  renameDocument: (id: string, title: string) => void;
  removeDocument: (id: string) => void;
  importUrlToNewDoc: (url: string) => Promise<{ ok: true } | { ok: false; message: string; verification?: boolean }>;
  relocalizeDocumentImagesIfNeeded: (id: string) => Promise<void>;
  registerAssetFile: (filename: string) => void;
  saveCurrentThemeAsPreset: (name: string) => void;
  applySavedTheme: (id: string) => void;
  removeSavedTheme: (id: string) => void;
}

const legacyStorageKey = "r2md-studio-editor";
const documentsStorageKey = "r2md-studio-documents";
const savedThemesStorageKey = "r2md-studio-saved-themes";
const historyStorageKey = "r2md-studio-import-history";

function isValidThemeId(value: unknown): value is ThemeId {
  return value === "clean" || value === "tech" || value === "wechat-card" || value === "custom";
}

function parseThemeTokens(value: unknown): ThemeTokenInput {
  if (!value || typeof value !== "object") {
    return defaultCustomTokens;
  }

  const record = value as Record<string, unknown>;
  const stringKeys = [
    "primaryColor",
    "textColor",
    "mutedColor",
    "backgroundColor",
    "headingColor",
    "linkColor",
    "borderColor",
    "codeBackground",
    "blockquoteBackground",
    "fontFamily",
  ];
  const numberKeys = ["headingFontWeight", "paragraphLineHeight", "paragraphSpacing", "radius"];
  const hasLegacyShape =
    stringKeys.every((key) => typeof record[key] === "string") &&
    numberKeys.every((key) => typeof record[key] === "number" && !Number.isNaN(record[key]));

  if (!hasLegacyShape) {
    return defaultCustomTokens;
  }

  return normalizeThemeTokens(record as Partial<ThemeTokenInput>);
}

function isValidThemeTokens(value: unknown): value is ThemeTokenInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const stringKeys = [
    "primaryColor",
    "textColor",
    "mutedColor",
    "backgroundColor",
    "headingColor",
    "linkColor",
    "borderColor",
    "codeBackground",
    "blockquoteBackground",
    "fontFamily",
  ];
  const numberKeys = ["headingFontWeight", "paragraphLineHeight", "paragraphSpacing", "radius"];

  return (
    stringKeys.every((key) => typeof record[key] === "string") &&
    numberKeys.every((key) => typeof record[key] === "number" && !Number.isNaN(record[key]))
  );
}

function isValidDocument(value: unknown): value is StudioDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.markdown === "string" &&
    isValidThemeId(record.themeId) &&
    isValidThemeTokens(record.customThemeTokens) &&
    typeof record.customThemeName === "string" &&
    (record.source === "blank" || record.source === "wechat" || record.source === "html") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function isValidSavedTheme(value: unknown): value is SavedTheme {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    isValidThemeTokens(record.tokens) &&
    typeof record.createdAt === "string"
  );
}

function isValidImportedArticle(value: unknown): value is ImportedArticle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.url === "string" &&
    typeof record.title === "string" &&
    typeof record.accountName === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.markdown === "string" &&
    typeof record.themeName === "string" &&
    isValidThemeTokens(record.tokens)
  );
}

function readLegacyState(): LegacyPersistedEditorState {
  if (typeof window === "undefined") {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
      customThemeTokens: defaultCustomTokens,
      customThemeName: "Custom",
    };
  }

  const storedValue = window.localStorage.getItem(legacyStorageKey);
  if (!storedValue) {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
      customThemeTokens: defaultCustomTokens,
      customThemeName: "Custom",
    };
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<LegacyPersistedEditorState>;
    return {
      markdown: parsed.markdown || sampleMarkdown,
      themeId: isValidThemeId(parsed.themeId) ? parsed.themeId : defaultThemeId,
      customThemeTokens: parseThemeTokens(parsed.customThemeTokens),
      customThemeName:
        typeof parsed.customThemeName === "string" && parsed.customThemeName.trim().length > 0
          ? parsed.customThemeName
          : "Custom",
    };
  } catch {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
      customThemeTokens: defaultCustomTokens,
      customThemeName: "Custom",
    };
  }
}

function readImportHistory(): ImportedArticle[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(historyStorageKey);
  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidImportedArticle);
  } catch {
    return [];
  }
}

function migrateToDocuments(): { documents: StudioDocument[]; activeDocId: string | null } {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(documentsStorageKey) : null;

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        const documents = parsed
          .filter(isValidDocument)
          .map((doc) => ({
            ...doc,
            customThemeTokens: parseThemeTokens(doc.customThemeTokens),
          }));
        if (documents.length > 0) {
          return { documents, activeDocId: documents[0].id };
        }
        return { documents: [], activeDocId: null };
      }
    } catch {
      // fall through to migration
    }
  }

  const legacy = readLegacyState();
  const history = readImportHistory();
  const documents: StudioDocument[] = [];

  if (history.length > 0) {
    for (const item of history) {
      documents.push(
        createImportedDocument({
          title: item.title,
          markdown: item.markdown,
          tokens: item.tokens,
          themeName: item.themeName,
          source: "wechat",
          sourceUrl: item.url,
        }),
      );
    }
  } else {
    const blank = createBlankDocument("示例文档");
    blank.markdown = legacy.markdown;
    blank.themeId = legacy.themeId;
    blank.customThemeTokens = legacy.customThemeTokens;
    blank.customThemeName = legacy.customThemeName;
    documents.push(blank);
  }

  return {
    documents,
    activeDocId: documents[0]?.id ?? null,
  };
}

function readSavedThemes(): SavedTheme[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(savedThemesStorageKey);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isValidSavedTheme)
      .map((theme) => ({
        ...theme,
        tokens: parseThemeTokens(theme.tokens),
      }));
  } catch {
    return [];
  }
}

function persistDocuments(documents: StudioDocument[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(documentsStorageKey, JSON.stringify(documents));
}

function persistSavedThemes(savedThemes: SavedTheme[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(savedThemesStorageKey, JSON.stringify(savedThemes));
}

function syncLegacyStorage(doc: StudioDocument): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    legacyStorageKey,
    JSON.stringify({
      markdown: doc.markdown,
      themeId: doc.themeId,
      customThemeTokens: doc.customThemeTokens,
      customThemeName: doc.customThemeName,
    }),
  );
}

function clearLegacyStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(legacyStorageKey);
}

function emptyWorkspaceMirror(): Pick<
  EditorState,
  "markdown" | "themeId" | "customThemeTokens" | "customThemeName"
> {
  return {
    markdown: "",
    themeId: defaultThemeId,
    customThemeTokens: defaultCustomTokens,
    customThemeName: "Custom",
  };
}

function documentToMirror(doc: StudioDocument): Pick<
  EditorState,
  "markdown" | "themeId" | "customThemeTokens" | "customThemeName"
> {
  return {
    markdown: doc.markdown,
    themeId: doc.themeId,
    customThemeTokens: doc.customThemeTokens,
    customThemeName: doc.customThemeName,
  };
}

const relocalizeInFlight = new Set<string>();

function documentHasRemoteWechatImages(markdown: string): boolean {
  return listMarkdownImageUrls(markdown).some(
    (entry) => isRemoteHttpImage(entry.url) && isWechatHostedImage(entry.url),
  );
}

async function relocalizeDocument(doc: StudioDocument): Promise<StudioDocument | null> {
  if (!documentHasRemoteWechatImages(doc.markdown)) {
    return null;
  }
  if (relocalizeInFlight.has(doc.id)) {
    return null;
  }

  relocalizeInFlight.add(doc.id);
  try {
    const localized = await localizeDocumentImages(doc.id, doc.markdown);
    if (localized.assetFiles.length === 0) {
      return null;
    }

    return {
      ...doc,
      markdown: localized.markdown,
      assetFiles: localized.assetFiles,
      updatedAt: new Date().toISOString(),
    };
  } finally {
    relocalizeInFlight.delete(doc.id);
  }
}

function updateActiveDocument(
  get: () => EditorState,
  patch: Partial<StudioDocument>,
): StudioDocument[] {
  const state = get();
  const now = new Date().toISOString();
  const documents = state.documents.map((doc) =>
    doc.id === state.activeDocId
      ? {
          ...doc,
          ...patch,
          updatedAt: now,
        }
      : doc,
  );
  persistDocuments(documents);
  const active = documents.find((doc) => doc.id === state.activeDocId);
  if (active) {
    syncLegacyStorage(active);
  }
  return documents;
}

const migrated = migrateToDocuments();
const initialSavedThemes = readSavedThemes();
const initialActiveDoc =
  migrated.documents.find((doc) => doc.id === migrated.activeDocId) ?? migrated.documents[0];

export const useEditorStore = create<EditorState>((set, get) => ({
  documents: migrated.documents,
  activeDocId: initialActiveDoc?.id ?? null,
  savedThemes: initialSavedThemes,
  markdown: initialActiveDoc?.markdown ?? "",
  themeId: initialActiveDoc?.themeId ?? defaultThemeId,
  platform: "wechat",
  copyStatus: "idle",
  statusMessage: "草稿已自动保存",
  warnings: [],
  customThemeTokens: initialActiveDoc?.customThemeTokens ?? defaultCustomTokens,
  customThemeName: initialActiveDoc?.customThemeName ?? "Custom",
  isThemePanelOpen: false,
  themeActionStatus: { tone: "idle", message: "" },

  setMarkdown: (markdown) => {
    const documents = updateActiveDocument(get, { markdown });
    set({ markdown, documents, statusMessage: "草稿已自动保存" });
  },

  setThemeId: (themeId) => {
    const documents = updateActiveDocument(get, { themeId });
    set({ themeId, documents, statusMessage: "主题已更新" });
  },

  setPlatform: (platform) => set({ platform }),

  setCopyStatus: (copyStatus, statusMessage) => set({ copyStatus, statusMessage }),

  setWarnings: (warnings) => set({ warnings }),

  openThemePanel: () => set({ isThemePanelOpen: true }),
  closeThemePanel: () => set({ isThemePanelOpen: false }),
  toggleThemePanel: () => set((state) => ({ isThemePanelOpen: !state.isThemePanelOpen })),

  updateCustomThemeToken: (key, value) => {
    const state = get();
    const customThemeTokens = normalizeThemeTokens({
      ...state.customThemeTokens,
      [key]: value,
    });
    const documents = updateActiveDocument(get, {
      customThemeTokens,
      themeId: "custom",
    });
    set({
      customThemeTokens,
      themeId: "custom",
      documents,
      statusMessage: "自定义主题已更新",
    });
  },

  setHeadingLevels: (levels) => {
    const customThemeTokens = normalizeThemeTokens({
      ...get().customThemeTokens,
      headingLevels: levels,
    });
    const documents = updateActiveDocument(get, {
      customThemeTokens,
      themeId: "custom",
    });
    set({
      customThemeTokens,
      themeId: "custom",
      documents,
      statusMessage: "标题样式已更新",
    });
  },

  resetCustomThemeFromTheme: (themeId) => {
    const customThemeTokens = getBuiltinThemeTokens(themeId);
    const sourceTheme = getThemeById(themeId);
    const customThemeName = `${sourceTheme.name} Custom`;
    const documents = updateActiveDocument(get, {
      customThemeTokens,
      customThemeName,
      themeId: "custom",
    });
    set({
      customThemeTokens,
      customThemeName,
      themeId: "custom",
      documents,
      isThemePanelOpen: true,
      statusMessage: "已基于当前主题生成自定义主题",
    });
  },

  setCustomThemeName: (name) => {
    const documents = updateActiveDocument(get, { customThemeName: name });
    set({ customThemeName: name, documents });
  },

  setCustomThemeTokens: (tokens) => {
    const documents = updateActiveDocument(get, {
      customThemeTokens: tokens,
      themeId: "custom",
    });
    set({
      customThemeTokens: tokens,
      themeId: "custom",
      documents,
      statusMessage: "自定义主题已更新",
    });
  },

  setThemeActionStatus: (tone, message) =>
    set({ themeActionStatus: { tone, message } }),

  createDocument: () => {
    const doc = createBlankDocument();
    const documents = [doc, ...get().documents];
    persistDocuments(documents);
    syncLegacyStorage(doc);
    set({
      documents,
      activeDocId: doc.id,
      ...documentToMirror(doc),
      statusMessage: "已新建文档",
    });
  },

  selectDocument: (id) => {
    const doc = get().documents.find((entry) => entry.id === id);
    if (!doc) {
      return;
    }
    syncLegacyStorage(doc);
    set({
      activeDocId: id,
      ...documentToMirror(doc),
      statusMessage: `已切换到：${doc.title}`,
    });
    void get().relocalizeDocumentImagesIfNeeded(id);
  },

  registerAssetFile: (filename) => {
    const state = get();
    if (!state.activeDocId) {
      return;
    }

    const documents = state.documents.map((doc) => {
      if (doc.id !== state.activeDocId) {
        return doc;
      }
      const assetFiles = doc.assetFiles ?? [];
      if (assetFiles.includes(filename)) {
        return doc;
      }
      return {
        ...doc,
        assetFiles: [...assetFiles, filename],
        updatedAt: new Date().toISOString(),
      };
    });

    persistDocuments(documents);
    set({
      documents,
      statusMessage: `已插入图片：${filename}`,
    });
  },

  relocalizeDocumentImagesIfNeeded: async (id) => {
    const doc = get().documents.find((entry) => entry.id === id);
    if (!doc) {
      return;
    }

    const updated = await relocalizeDocument(doc);
    if (!updated) {
      return;
    }

    const documents = get().documents.map((entry) => (entry.id === updated.id ? updated : entry));
    persistDocuments(documents);

    if (get().activeDocId === updated.id) {
      syncLegacyStorage(updated);
      set({
        documents,
        ...documentToMirror(updated),
        statusMessage: `已本地化 ${updated.assetFiles?.length ?? 0} 张图片：${updated.title}`,
      });
      return;
    }

    set({ documents });
  },

  renameDocument: (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    const documents = get().documents.map((doc) =>
      doc.id === id ? { ...doc, title: trimmed, updatedAt: new Date().toISOString() } : doc,
    );
    persistDocuments(documents);
    const isActive = get().activeDocId === id;
    set({
      documents,
      ...(isActive ? { statusMessage: `已重命名为：${trimmed}` } : {}),
    });
  },

  removeDocument: (id) => {
    const state = get();
    void deleteDocumentAssetsDir(id);
    const documents = state.documents.filter((doc) => doc.id !== id);
    persistDocuments(documents);

    if (documents.length === 0) {
      clearLegacyStorage();
      set({
        documents,
        activeDocId: null,
        ...emptyWorkspaceMirror(),
        statusMessage: "已删除全部文档",
      });
      return;
    }

    if (state.activeDocId === id) {
      const next = documents[0];
      syncLegacyStorage(next);
      set({
        documents,
        activeDocId: next.id,
        ...documentToMirror(next),
        statusMessage: `已删除文档，切换到：${next.title}`,
      });
      return;
    }

    set({ documents, statusMessage: "已删除文档" });
  },

  importUrlToNewDoc: async (url) => {
    const imported = await runUnifiedUrlImport(url);
    if (!imported.ok) {
      return {
        ok: false,
        message: imported.message,
        verification: imported.verification,
      };
    }

    const draft = createImportedDocument({
      title: imported.result.meta.title,
      markdown: imported.result.markdown,
      tokens: imported.result.tokens,
      themeName: imported.result.themeName,
      source: imported.kind === "wechat" ? "wechat" : "html",
      sourceUrl: url,
    });

    const localized = await localizeDocumentImages(draft.id, draft.markdown);
    const doc = {
      ...draft,
      markdown: localized.markdown,
      assetFiles: localized.assetFiles,
    };

    const documents = [doc, ...get().documents];
    persistDocuments(documents);
    syncLegacyStorage(doc);

    const warningSuffix =
      localized.warnings.length > 0 ? `（${localized.warnings.join(" ")}）` : "";

    set({
      documents,
      activeDocId: doc.id,
      ...documentToMirror(doc),
      statusMessage: `已导入：${doc.title}${warningSuffix}`,
      warnings: localized.warnings,
    });

    return { ok: true };
  },

  saveCurrentThemeAsPreset: (name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const state = get();
    const preset: SavedTheme = {
      id: createSavedThemeId(),
      name: trimmed,
      tokens: { ...state.customThemeTokens },
      createdAt: new Date().toISOString(),
    };
    const savedThemes = [preset, ...state.savedThemes];
    persistSavedThemes(savedThemes);
    set({
      savedThemes,
      themeActionStatus: { tone: "success", message: `主题已保存：${trimmed}` },
      statusMessage: `主题已保存：${trimmed}`,
    });
  },

  applySavedTheme: (id) => {
    const preset = get().savedThemes.find((theme) => theme.id === id);
    if (!preset) {
      return;
    }

    const documents = updateActiveDocument(get, {
      customThemeTokens: parseThemeTokens(preset.tokens),
      customThemeName: preset.name,
      themeId: "custom",
    });

    set({
      customThemeTokens: parseThemeTokens(preset.tokens),
      customThemeName: preset.name,
      themeId: "custom",
      documents,
      statusMessage: `已应用主题：${preset.name}`,
    });
  },

  removeSavedTheme: (id) => {
    const savedThemes = get().savedThemes.filter((theme) => theme.id !== id);
    persistSavedThemes(savedThemes);
    set({ savedThemes, statusMessage: "已删除保存的主题" });
  },
}));

if (initialActiveDoc && documentHasRemoteWechatImages(initialActiveDoc.markdown)) {
  queueMicrotask(() => {
    void useEditorStore.getState().relocalizeDocumentImagesIfNeeded(initialActiveDoc.id);
  });
}
