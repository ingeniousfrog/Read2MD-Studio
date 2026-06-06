import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../import/tauriRuntime";

const DESKTOP_ONLY_MESSAGE = "AI 功能仅桌面端可用，请使用 Tauri 版 Read2MD Studio。";

export interface CodexDetectResult {
  path: string;
  found: boolean;
}

export interface CodexLoginStatusResult {
  loggedIn: boolean;
  detail: string;
}

export interface CodexSimpleResult {
  ok: boolean;
  message: string;
}

export interface CodexExecResult {
  ok: boolean;
  output: string;
  error?: string;
}

function assertDesktop(): void {
  if (!isTauriRuntime()) {
    throw new Error(DESKTOP_ONLY_MESSAGE);
  }
}

function pathPayload(codexPath?: string) {
  return codexPath?.trim() ? { codexPath: codexPath.trim() } : null;
}

export async function codexDetect(codexPath?: string): Promise<CodexDetectResult> {
  assertDesktop();
  return invoke<CodexDetectResult>("codex_detect", { request: pathPayload(codexPath) });
}

export async function codexLoginStatus(codexPath?: string): Promise<CodexLoginStatusResult> {
  assertDesktop();
  return invoke<CodexLoginStatusResult>("codex_login_status", { request: pathPayload(codexPath) });
}

export async function codexLogin(
  codexPath: string | undefined,
  onLog: (line: string) => void,
): Promise<CodexSimpleResult> {
  assertDesktop();
  let unlisten: UnlistenFn | null = null;
  try {
    unlisten = await listen<string>("codex://login-log", (event) => {
      if (typeof event.payload === "string" && event.payload.trim()) {
        onLog(event.payload);
      }
    });
    return await invoke<CodexSimpleResult>("codex_login", { request: pathPayload(codexPath) });
  } finally {
    if (unlisten) {
      await unlisten();
    }
  }
}

export async function codexLogout(codexPath?: string): Promise<CodexSimpleResult> {
  assertDesktop();
  return invoke<CodexSimpleResult>("codex_logout", { request: pathPayload(codexPath) });
}

export async function codexExec(input: {
  prompt: string;
  model?: string;
  codexPath?: string;
  onProgress?: (line: string) => void;
}): Promise<CodexExecResult> {
  assertDesktop();
  let unlisten: UnlistenFn | null = null;
  try {
    if (input.onProgress) {
      unlisten = await listen<string>("codex://exec-progress", (event) => {
        if (typeof event.payload === "string" && event.payload.trim()) {
          input.onProgress?.(event.payload);
        }
      });
    }

    return await invoke<CodexExecResult>("codex_exec", {
      request: {
        prompt: input.prompt,
        model: input.model?.trim() || null,
        codexPath: input.codexPath?.trim() || null,
      },
    });
  } finally {
    if (unlisten) {
      await unlisten();
    }
  }
}

export function getDesktopOnlyMessage(): string {
  return DESKTOP_ONLY_MESSAGE;
}

export function isAiAvailable(): boolean {
  return isTauriRuntime();
}
