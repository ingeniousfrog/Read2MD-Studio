import { create } from "zustand";
import { defaultThemeId, type ThemeId } from "../core/theme/themes";
import { sampleMarkdown } from "../fixtures/sampleMarkdown";

export type PlatformId = "wechat";
export type CopyStatus = "idle" | "copying" | "success" | "error";

interface PersistedEditorState {
  markdown: string;
  themeId: ThemeId;
}

interface EditorState {
  markdown: string;
  themeId: ThemeId;
  platform: PlatformId;
  copyStatus: CopyStatus;
  statusMessage: string;
  warnings: string[];
  setMarkdown: (markdown: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  setPlatform: (platform: PlatformId) => void;
  setCopyStatus: (copyStatus: CopyStatus, statusMessage: string) => void;
  setWarnings: (warnings: string[]) => void;
}

const storageKey = "r2md-studio-editor";

function readPersistedState(): PersistedEditorState {
  if (typeof window === "undefined") {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
    };
  }

  const storedValue = window.localStorage.getItem(storageKey);

  if (!storedValue) {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
    };
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PersistedEditorState>;
    return {
      markdown: parsed.markdown || sampleMarkdown,
      themeId: parsed.themeId || defaultThemeId,
    };
  } catch {
    return {
      markdown: sampleMarkdown,
      themeId: defaultThemeId,
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
  setMarkdown: (markdown) => {
    const nextState = {
      ...get(),
      markdown,
    };

    persistState({
      markdown: nextState.markdown,
      themeId: nextState.themeId,
    });
    set({
      markdown,
      statusMessage: "草稿已自动保存",
    });
  },
  setThemeId: (themeId) => {
    const nextState = {
      ...get(),
      themeId,
    };

    persistState({
      markdown: nextState.markdown,
      themeId: nextState.themeId,
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
}));
