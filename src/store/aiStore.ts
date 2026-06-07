import { create } from "zustand";
import { runAiAction } from "../core/ai/aiActions";
import {
  codexDetect,
  codexLogin,
  codexLoginStatus,
  codexLogout,
  codexUsage,
  codexUsageInspect,
  formatCodexUsageInspectLog,
  isAiAvailable,
  type CodexUsageResult,
} from "../core/ai/codexClient";
import { translateActionLabel } from "../core/ai/i18nActions";
import { formatCodexProgressLine } from "../core/ai/parseProgress";
import { COWORK_PIPELINE, getActionDefinition } from "../core/ai/presets";
import i18n from "../i18n";
import type {
  AiActionId,
  AiActionResult,
  AiCapabilityId,
  AiResultRecord,
  CapabilityModels,
  CoworkStep,
} from "../core/ai/types";
import { getCapabilityFromAction } from "../core/ai/types";

const settingsStorageKey = "r2md-studio-ai-settings";
const coworkPipelineStorageKey = "r2md-studio-cowork-pipeline";

interface PersistedAiSettings {
  codexPath: string;
  capabilityModels: CapabilityModels;
  customStyle: string;
}

interface LegacyPersistedAiSettings {
  codexPath?: string;
  model?: string;
  capabilityModels?: Partial<CapabilityModels>;
  customStyle?: string;
}

interface AiState {
  codexPath: string;
  capabilityModels: CapabilityModels;
  customStyle: string;
  loggedIn: boolean;
  loginDetail: string;
  loginLog: string[];
  running: boolean;
  runningActionId: AiActionId | null;
  progressLog: string[];
  lastResult: AiActionResult | null;
  resultHistory: AiResultRecord[];
  selectedResultId: string | null;
  coworkSteps: CoworkStep[];
  isSettingsOpen: boolean;
  isAiPanelOpen: boolean;
  statusMessage: string;
  usage: CodexUsageResult | null;
  usageLoading: boolean;
  setCodexPath: (path: string) => void;
  setCapabilityModel: (capability: AiCapabilityId, model: string) => void;
  setCustomStyle: (style: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openAiPanel: () => void;
  closeAiPanel: () => void;
  refreshLoginStatus: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  detectCodexPath: () => Promise<void>;
  startLogin: () => Promise<void>;
  startLogout: () => Promise<void>;
  runAction: (actionId: AiActionId, markdown: string) => Promise<AiActionResult>;
  resetCoworkSteps: () => void;
  setCoworkStepAction: (stepId: string, actionId: AiActionId) => void;
  removeCoworkStep: (stepId: string) => void;
  moveCoworkStep: (stepId: string, direction: "up" | "down") => void;
  addCoworkStep: (actionId?: AiActionId) => void;
  runCoworkStep: (stepId: string, markdown: string) => Promise<AiActionResult | null>;
  runCoworkPipeline: (markdown: string) => Promise<string | null>;
  selectResult: (id: string) => void;
  clearResults: () => void;
}

const defaultCapabilityModels: CapabilityModels = {
  academic: "",
  mermaid: "",
  roleplay: "",
  cowork: "",
};

function readPersistedSettings(): PersistedAiSettings {
  if (typeof window === "undefined") {
    return { codexPath: "", capabilityModels: defaultCapabilityModels, customStyle: "" };
  }

  try {
    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) {
      return { codexPath: "", capabilityModels: defaultCapabilityModels, customStyle: "" };
    }
    const parsed = JSON.parse(raw) as LegacyPersistedAiSettings;
    const legacyModel = typeof parsed.model === "string" ? parsed.model : "";
    const capabilityModels: CapabilityModels = {
      ...defaultCapabilityModels,
      ...(parsed.capabilityModels ?? {}),
    };

    if (legacyModel && !Object.values(capabilityModels).some(Boolean)) {
      capabilityModels.academic = legacyModel;
      capabilityModels.mermaid = legacyModel;
      capabilityModels.roleplay = legacyModel;
      capabilityModels.cowork = legacyModel;
    }

    return {
      codexPath: typeof parsed.codexPath === "string" ? parsed.codexPath : "",
      capabilityModels,
      customStyle: typeof parsed.customStyle === "string" ? parsed.customStyle : "",
    };
  } catch {
    return { codexPath: "", capabilityModels: defaultCapabilityModels, customStyle: "" };
  }
}

function persistSettings(settings: PersistedAiSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

interface PersistedCoworkPipeline {
  steps: { actionId: AiActionId }[];
}

function createCoworkStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCoworkStepFromAction(actionId: AiActionId): CoworkStep {
  const definition = getActionDefinition(actionId);
  return {
    id: createCoworkStepId(),
    actionId,
    label: definition?.label ?? actionId,
    status: "pending",
  };
}

function readPersistedCoworkPipeline(): PersistedCoworkPipeline | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(coworkPipelineStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedCoworkPipeline;
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistCoworkPipeline(steps: CoworkStep[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    coworkPipelineStorageKey,
    JSON.stringify({
      steps: steps.map((step) => ({ actionId: step.actionId })),
    }),
  );
}

function createDefaultCoworkSteps(): CoworkStep[] {
  return COWORK_PIPELINE.map((actionId) => createCoworkStepFromAction(actionId));
}

function createInitialCoworkSteps(): CoworkStep[] {
  const persisted = readPersistedCoworkPipeline();
  if (!persisted) {
    return createDefaultCoworkSteps();
  }

  return persisted.steps.map((step) => createCoworkStepFromAction(step.actionId));
}

function withPersistedCoworkSteps(steps: CoworkStep[]): { coworkSteps: CoworkStep[] } {
  persistCoworkPipeline(steps);
  return { coworkSteps: steps };
}

function resolveModelForAction(state: AiState, actionId: AiActionId): string | undefined {
  const capability = getCapabilityFromAction(actionId);
  const model = state.capabilityModels[capability]?.trim();
  return model || undefined;
}

function createResultId(): string {
  return `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toResultRecord(result: AiActionResult, label: string): AiResultRecord {
  return {
    id: createResultId(),
    actionId: result.actionId,
    label,
    ok: result.ok,
    markdown: result.markdown,
    error: result.error,
    createdAt: new Date().toISOString(),
  };
}

function actionLabel(actionId: AiActionId): string {
  return translateActionLabel(i18n.t.bind(i18n), actionId);
}

const persisted = readPersistedSettings();

export const useAiStore = create<AiState>((set, get) => ({
  codexPath: persisted.codexPath,
  capabilityModels: persisted.capabilityModels,
  customStyle: persisted.customStyle,
  loggedIn: false,
  loginDetail: "",
  loginLog: [],
  running: false,
  runningActionId: null,
  progressLog: [],
  lastResult: null,
  resultHistory: [],
  selectedResultId: null,
  coworkSteps: createInitialCoworkSteps(),
  isSettingsOpen: false,
  isAiPanelOpen: false,
  statusMessage: "",
  usage: null,
  usageLoading: false,

  setCodexPath: (path) => {
    const state = get();
    persistSettings({
      codexPath: path,
      capabilityModels: state.capabilityModels,
      customStyle: state.customStyle,
    });
    set({ codexPath: path });
  },

  setCapabilityModel: (capability, model) => {
    const state = get();
    const capabilityModels = {
      ...state.capabilityModels,
      [capability]: model,
    };
    persistSettings({
      codexPath: state.codexPath,
      capabilityModels,
      customStyle: state.customStyle,
    });
    set({ capabilityModels });
  },

  setCustomStyle: (style) => {
    const state = get();
    persistSettings({
      codexPath: state.codexPath,
      capabilityModels: state.capabilityModels,
      customStyle: style,
    });
    set({ customStyle: style });
  },

  openSettings: () => {
    set({ isSettingsOpen: true });
    void get().refreshLoginStatus();
    void get().refreshUsage();
  },

  closeSettings: () => set({ isSettingsOpen: false }),

  openAiPanel: () => {
    set({
      isAiPanelOpen: true,
      progressLog: [],
    });
    void get().refreshLoginStatus();
  },

  closeAiPanel: () => set({ isAiPanelOpen: false }),

  refreshLoginStatus: async () => {
    if (!isAiAvailable()) {
      set({
        loggedIn: false,
        loginDetail: i18n.t("ai.store.webNoLogin"),
      });
      return;
    }

    try {
      const status = await codexLoginStatus(get().codexPath || undefined);
      set({
        loggedIn: status.loggedIn,
        loginDetail: status.detail,
      });
      if (status.loggedIn) {
        void get().refreshUsage();
      } else {
        set({ usage: null });
      }
    } catch (error) {
      set({
        loggedIn: false,
        loginDetail: error instanceof Error ? error.message : i18n.t("ai.store.cannotReadLogin"),
        usage: null,
      });
    }
  },

  refreshUsage: async () => {
    if (!isAiAvailable() || !get().loggedIn) {
      set({ usage: null, usageLoading: false });
      return;
    }

    set({ usageLoading: true });
    try {
      const usage = await codexUsage();
      if (!usage.ok) {
        const inspect = await codexUsageInspect();
        const debugLines = formatCodexUsageInspectLog(inspect);
        console.warn("[codex usage]", usage.message, inspect);
        set((state) => ({
          usage,
          usageLoading: false,
          loginLog: [...state.loginLog, `[usage] ${usage.message}`, ...debugLines],
        }));
        return;
      }
      set({ usage, usageLoading: false });
    } catch (error) {
      console.warn("[codex usage] invoke failed", error);
      try {
        const inspect = await codexUsageInspect();
        const debugLines = formatCodexUsageInspectLog(inspect);
        set((state) => ({
          usage: null,
          usageLoading: false,
          loginLog: [
            ...state.loginLog,
            `[usage] ${error instanceof Error ? error.message : i18n.t("ai.store.cannotReadUsage")}`,
            ...debugLines,
          ],
        }));
      } catch {
        set({ usage: null, usageLoading: false });
      }
    }
  },

  detectCodexPath: async () => {
    if (!isAiAvailable()) {
      set({ statusMessage: i18n.t("ai.store.desktopDetectOnly") });
      return;
    }

    try {
      const result = await codexDetect(get().codexPath || undefined);
      if (result.found) {
        get().setCodexPath(result.path);
        set({ statusMessage: i18n.t("ai.store.detectedCodex", { path: result.path }) });
      } else {
        set({ statusMessage: result.path });
      }
    } catch (error) {
      set({
        statusMessage: error instanceof Error ? error.message : i18n.t("ai.store.detectFailed"),
      });
    }
  },

  startLogin: async () => {
    if (!isAiAvailable()) {
      set({ statusMessage: i18n.t("ai.store.desktopLoginOnly") });
      return;
    }

    set({ loginLog: [], statusMessage: i18n.t("ai.store.startingLogin") });
    try {
      const result = await codexLogin(get().codexPath || undefined, (line) => {
        set((state) => ({ loginLog: [...state.loginLog, line] }));
      });
      await get().refreshLoginStatus();
      set({
        statusMessage: result.message,
      });
      if (result.ok) {
        void get().refreshUsage();
      }
    } catch (error) {
      set({
        statusMessage: error instanceof Error ? error.message : i18n.t("ai.store.loginFailed"),
      });
    }
  },

  startLogout: async () => {
    if (!isAiAvailable()) {
      set({ statusMessage: i18n.t("ai.store.desktopLogoutOnly") });
      return;
    }

    try {
      const result = await codexLogout(get().codexPath || undefined);
      await get().refreshLoginStatus();
      set({ statusMessage: result.message, usage: null });
    } catch (error) {
      set({
        statusMessage: error instanceof Error ? error.message : i18n.t("ai.store.logoutFailed"),
      });
    }
  },

  runAction: async (actionId, markdown) => {
    const state = get();
    const label = actionLabel(actionId);

    if (!state.loggedIn) {
      const result: AiActionResult = {
        ok: false,
        markdown: "",
        actionId,
        error: i18n.t("ai.store.notLoggedInRun"),
      };
      const record = toResultRecord(result, label);
      set({
        lastResult: result,
        resultHistory: [record, ...state.resultHistory].slice(0, 30),
        selectedResultId: record.id,
        statusMessage: result.error ?? i18n.t("ai.store.aiFailed"),
      });
      return result;
    }

    set({
      running: true,
      runningActionId: actionId,
      progressLog: [i18n.t("ai.store.startingCodex")],
      statusMessage: i18n.t("ai.store.aiProcessing", { label }),
    });

    const result = await runAiAction(actionId, {
      markdown,
      customStyle: state.customStyle,
      codexPath: state.codexPath || undefined,
      model: resolveModelForAction(state, actionId),
      onProgress: (line) => {
        const formatted = formatCodexProgressLine(line);
        if (!formatted) {
          return;
        }
        set((current) => ({
          progressLog: [...current.progressLog, formatted].slice(-100),
        }));
      },
    });

    const record = toResultRecord(result, label);
    set({
      running: false,
      runningActionId: null,
      lastResult: result,
      resultHistory: [record, ...get().resultHistory].slice(0, 30),
      selectedResultId: record.id,
      statusMessage: result.ok ? i18n.t("ai.store.aiDone", { label }) : (result.error ?? i18n.t("ai.store.aiFailed")),
    });

    return result;
  },

  resetCoworkSteps: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(coworkPipelineStorageKey);
    }
    set({
      ...withPersistedCoworkSteps(createDefaultCoworkSteps()),
      progressLog: [],
      statusMessage: i18n.t("ai.store.coworkReset"),
    });
  },

  setCoworkStepAction: (stepId, actionId) => {
    const definition = getActionDefinition(actionId);
    const steps = get().coworkSteps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            actionId,
            label: definition?.label ?? actionId,
            status: "pending" as const,
            error: undefined,
            resultMarkdown: undefined,
            resultId: undefined,
          }
        : step,
    );
    set({
      ...withPersistedCoworkSteps(steps),
      statusMessage: i18n.t("ai.store.coworkUpdated", { label: definition?.label ?? actionId }),
    });
  },

  removeCoworkStep: (stepId) => {
    const steps = get().coworkSteps;
    if (steps.length <= 1) {
      set({ statusMessage: i18n.t("ai.store.coworkMinSteps") });
      return;
    }

    const next = steps.filter((step) => step.id !== stepId);
    set({
      ...withPersistedCoworkSteps(next),
      statusMessage: i18n.t("ai.store.coworkDeleted"),
    });
  },

  moveCoworkStep: (stepId, direction) => {
    const steps = [...get().coworkSteps];
    const index = steps.findIndex((step) => step.id === stepId);
    if (index === -1) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) {
      return;
    }

    const [item] = steps.splice(index, 1);
    steps.splice(targetIndex, 0, item);
    set({
      ...withPersistedCoworkSteps(steps),
      statusMessage:
        direction === "up" ? i18n.t("ai.store.coworkMovedUp") : i18n.t("ai.store.coworkMovedDown"),
    });
  },

  addCoworkStep: (actionId = "academic:structure") => {
    const definition = getActionDefinition(actionId);
    const steps = [...get().coworkSteps, createCoworkStepFromAction(actionId)];
    set({
      ...withPersistedCoworkSteps(steps),
      statusMessage: i18n.t("ai.store.coworkAdded", { label: definition?.label ?? actionId }),
    });
  },

  runCoworkStep: async (stepId, markdown) => {
    const state = get();
    const step = state.coworkSteps.find((entry) => entry.id === stepId);
    if (!step) {
      return null;
    }

    if (!state.loggedIn) {
      const result: AiActionResult = {
        ok: false,
        markdown: "",
        actionId: step.actionId,
        error: i18n.t("ai.store.notLoggedInRun"),
      };
      const record = toResultRecord(result, i18n.t("ai.store.coworkStepResult", { label: step.label }));
      set({
        lastResult: result,
        resultHistory: [record, ...state.resultHistory].slice(0, 30),
        selectedResultId: record.id,
        coworkSteps: state.coworkSteps.map((entry) =>
          entry.id === stepId ? { ...entry, status: "error", error: result.error } : entry,
        ),
        statusMessage: result.error ?? i18n.t("ai.store.coworkStepFailed"),
      });
      return result;
    }

    set({
      coworkSteps: state.coworkSteps.map((entry) =>
        entry.id === stepId
          ? { ...entry, status: "running", error: undefined, resultMarkdown: undefined, resultId: undefined }
          : entry,
      ),
      running: true,
      runningActionId: step.actionId,
      progressLog: [i18n.t("ai.store.coworkStepStart", { label: step.label })],
      statusMessage: i18n.t("ai.store.coworkRunning", { label: step.label }),
    });

    const result = await runAiAction(step.actionId, {
      markdown,
      customStyle: state.customStyle,
      codexPath: state.codexPath || undefined,
      model: resolveModelForAction(state, step.actionId),
      onProgress: (line) => {
        const formatted = formatCodexProgressLine(line);
        if (!formatted) {
          return;
        }
        set((current) => ({
          progressLog: [...current.progressLog, formatted].slice(-100),
        }));
      },
    });

    const record = toResultRecord(result, i18n.t("ai.store.coworkStepResult", { label: step.label }));
    set({
      running: false,
      runningActionId: null,
      lastResult: result,
      resultHistory: [record, ...get().resultHistory].slice(0, 30),
      selectedResultId: record.id,
      coworkSteps: get().coworkSteps.map((entry) =>
        entry.id === stepId
          ? {
              ...entry,
              status: result.ok ? "done" : "error",
              error: result.error,
              resultMarkdown: result.ok ? result.markdown : undefined,
              resultId: record.id,
            }
          : entry,
      ),
      statusMessage: result.ok
        ? i18n.t("ai.store.coworkDone", { label: step.label })
        : (result.error ?? i18n.t("ai.store.coworkStepFailed")),
    });

    return result;
  },

  runCoworkPipeline: async (markdown) => {
    set({
      coworkSteps: get().coworkSteps.map((step) => ({
        ...step,
        status: "pending" as const,
        error: undefined,
        resultMarkdown: undefined,
        resultId: undefined,
      })),
      progressLog: [i18n.t("ai.store.coworkPipelineStart")],
      statusMessage: i18n.t("ai.store.coworkPipelineRunning"),
    });

    let current = markdown;
    const steps = get().coworkSteps;

    for (const step of steps) {
      const result = await get().runCoworkStep(step.id, current);
      if (!result?.ok) {
        return null;
      }
      current = result.markdown;
    }

    const pipelineResult: AiActionResult = {
      ok: true,
      markdown: current,
      actionId: "cowork:pipeline",
    };
    const record = toResultRecord(pipelineResult, i18n.t("ai.store.coworkFullResult"));
    set({
      lastResult: pipelineResult,
      resultHistory: [record, ...get().resultHistory].slice(0, 30),
      selectedResultId: record.id,
      statusMessage: i18n.t("ai.store.coworkPipelineDone"),
    });

    return current;
  },

  selectResult: (id) => {
    const record = get().resultHistory.find((entry) => entry.id === id);
    if (!record) {
      return;
    }
    set({
      selectedResultId: id,
      lastResult: {
        ok: record.ok,
        markdown: record.markdown,
        actionId: record.actionId,
        error: record.error,
      },
    });
  },

  clearResults: () =>
    set({
      resultHistory: [],
      selectedResultId: null,
      lastResult: null,
      progressLog: [],
    }),
}));

if (isAiAvailable()) {
  queueMicrotask(() => {
    void useAiStore.getState().refreshLoginStatus();
    void useAiStore.getState().detectCodexPath();
  });
}
