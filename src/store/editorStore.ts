import { create } from "zustand";
import {
  defaultThemeId,
  getBuiltinThemeTokens,
  getThemeById,
  type ThemeId,
} from "../core/theme/themes";
import { defaultCustomTokens, type ThemeTokenInput } from "../core/theme/themeTokens";
import { sampleMarkdown } from "../fixtures/sampleMarkdown";

export type PlatformId = "wechat";
export type CopyStatus = "idle" | "copying" | "success" | "error";
export type ThemeActionTone = "idle" | "success" | "error";

interface PersistedEditorState {
  markdown: string;
  themeId: ThemeId;
  customThemeTokens: ThemeTokenInput;
  customThemeName: string;
}

interface EditorState {
  markdown: string;
  themeId: ThemeId;
  platform: PlatformId;
  copyStatus: CopyStatus;
  statusMessage: string;
  warnings: string[];
  customThemeTokens: ThemeTokenInput;
  customThemeName: string;
  isThemeCustomizerOpen: boolean;
  themeActionStatus: {
    tone: ThemeActionTone;
    message: string;
  };
  setMarkdown: (markdown: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  setPlatform: (platform: PlatformId) => void;
  setCopyStatus: (copyStatus: CopyStatus, statusMessage: string) => void;
  setWarnings: (warnings: string[]) => void;
  openThemeCustomizer: () => void;
  closeThemeCustomizer: () => void;
  toggleThemeCustomizer: () => void;
  updateCustomThemeToken: <K extends keyof ThemeTokenInput>(
    key: K,
    value: ThemeTokenInput[K],
  ) => void;
  resetCustomThemeFromTheme: (themeId: Exclude<ThemeId, "custom">) => void;
  setCustomThemeName: (name: string) => void;
  setCustomThemeTokens: (tokens: ThemeTokenInput) => void;
  setThemeActionStatus: (tone: ThemeActionTone, message: string) => void;
}

const storageKey = "r2md-studio-editor";

function isValidThemeId(value: unknown): value is ThemeId {
  return value === "clean" || value === "tech" || value === "wechat-card" || value === "custom";
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

function readPersistedState(): PersistedEditorState {
  if (typeof window === "undefined") {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
      customThemeTokens: defaultCustomTokens,
      customThemeName: "Custom",
    };
  }

  const storedValue = window.localStorage.getItem(storageKey);

  if (!storedValue) {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
      customThemeTokens: defaultCustomTokens,
      customThemeName: "Custom",
    };
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PersistedEditorState>;
    return {
      markdown: parsed.markdown || sampleMarkdown,
      themeId: isValidThemeId(parsed.themeId) ? parsed.themeId : defaultThemeId,
      customThemeTokens: isValidThemeTokens(parsed.customThemeTokens)
        ? parsed.customThemeTokens
        : defaultCustomTokens,
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

function persistState(state: PersistedEditorState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

const initialState = readPersistedState();

export const useEditorStore = create<EditorState>((set, get) => ({
  markdown: initialState.markdown,
  themeId: initialState.themeId,
  platform: "wechat",
  copyStatus: "idle",
  statusMessage: "草稿已自动保存",
  warnings: [],
  customThemeTokens: initialState.customThemeTokens,
  customThemeName: initialState.customThemeName,
  isThemeCustomizerOpen: false,
  themeActionStatus: {
    tone: "idle",
    message: "",
  },
  setMarkdown: (markdown) => {
    const nextState = get();

    persistState({
      markdown,
      themeId: nextState.themeId,
      customThemeTokens: nextState.customThemeTokens,
      customThemeName: nextState.customThemeName,
    });
    set({
      markdown,
      statusMessage: "草稿已自动保存",
    });
  },
  setThemeId: (themeId) => {
    const nextState = get();

    persistState({
      markdown: nextState.markdown,
      themeId,
      customThemeTokens: nextState.customThemeTokens,
      customThemeName: nextState.customThemeName,
    });
    set({
      themeId,
      statusMessage: "主题已更新",
    });
  },
  setPlatform: (platform) => {
    set({
      platform,
    });
  },
  setCopyStatus: (copyStatus, statusMessage) => {
    set({
      copyStatus,
      statusMessage,
    });
  },
  setWarnings: (warnings) => {
    set({
      warnings,
    });
  },
  openThemeCustomizer: () => {
    set({
      isThemeCustomizerOpen: true,
    });
  },
  closeThemeCustomizer: () => {
    set({
      isThemeCustomizerOpen: false,
    });
  },
  toggleThemeCustomizer: () => {
    set((state) => ({
      isThemeCustomizerOpen: !state.isThemeCustomizerOpen,
    }));
  },
  updateCustomThemeToken: (key, value) => {
    const nextState = get();
    const customThemeTokens = {
      ...nextState.customThemeTokens,
      [key]: value,
    };

    persistState({
      markdown: nextState.markdown,
      themeId: nextState.themeId,
      customThemeTokens,
      customThemeName: nextState.customThemeName,
    });
    set({
      customThemeTokens,
      themeId: "custom",
      statusMessage: "自定义主题已更新",
    });
  },
  resetCustomThemeFromTheme: (themeId) => {
    const nextState = get();
    const customThemeTokens = getBuiltinThemeTokens(themeId);
    const sourceTheme = getThemeById(themeId);
    const customThemeName = `${sourceTheme.name} Custom`;

    persistState({
      markdown: nextState.markdown,
      themeId: "custom",
      customThemeTokens,
      customThemeName,
    });
    set({
      customThemeTokens,
      customThemeName,
      themeId: "custom",
      isThemeCustomizerOpen: true,
      statusMessage: "已基于当前主题生成自定义主题",
    });
  },
  setCustomThemeName: (name) => {
    const nextState = get();

    persistState({
      markdown: nextState.markdown,
      themeId: nextState.themeId,
      customThemeTokens: nextState.customThemeTokens,
      customThemeName: name,
    });
    set({
      customThemeName: name,
    });
  },
  setCustomThemeTokens: (tokens) => {
    const nextState = get();

    persistState({
      markdown: nextState.markdown,
      themeId: "custom",
      customThemeTokens: tokens,
      customThemeName: nextState.customThemeName,
    });
    set({
      customThemeTokens: tokens,
      themeId: "custom",
      statusMessage: "自定义主题已导入",
    });
  },
  setThemeActionStatus: (tone, message) => {
    set({
      themeActionStatus: {
        tone,
        message,
      },
    });
  },
}));
