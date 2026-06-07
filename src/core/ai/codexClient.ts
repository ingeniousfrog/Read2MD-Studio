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

export interface CodexRateWindow {
  usedPercent: number;
  remainingPercent: number;
  windowMinutes?: number;
  resetsAt?: number;
}

export interface CodexUsageResult {
  ok: boolean;
  planType?: string;
  accountEmail?: string;
  session?: CodexRateWindow;
  weekly?: CodexRateWindow;
  creditsBalance?: number;
  creditsUnlimited: boolean;
  message: string;
}

export interface CodexUsageInspectResult {
  authPath: string;
  codexHome: string;
  authFileExists: boolean;
  topLevelKeys: string[];
  authMode?: string;
  hasOpenaiApiKey: boolean;
  tokenFields: string[];
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  hasIdToken: boolean;
  accountIdSource?: string;
  accountIdPreview?: string;
  accountEmail?: string;
  jwtClaimKeys: string[];
  parseError?: string;
}

function formatUsageInspectLines(inspect: CodexUsageInspectResult): string[] {
  const lines = [
    `[usage debug] auth_path=${inspect.authPath}`,
    `[usage debug] codex_home=${inspect.codexHome}`,
    `[usage debug] auth_file_exists=${inspect.authFileExists}`,
    `[usage debug] top_level_keys=${inspect.topLevelKeys.join(", ") || "—"}`,
    `[usage debug] auth_mode=${inspect.authMode ?? "—"}`,
    `[usage debug] has_openai_api_key=${inspect.hasOpenaiApiKey}`,
    `[usage debug] token_fields=${inspect.tokenFields.join(", ") || "—"}`,
    `[usage debug] has_access_token=${inspect.hasAccessToken}`,
    `[usage debug] has_refresh_token=${inspect.hasRefreshToken}`,
    `[usage debug] has_id_token=${inspect.hasIdToken}`,
    `[usage debug] account_id_source=${inspect.accountIdSource ?? "—"}`,
    `[usage debug] account_id_preview=${inspect.accountIdPreview ?? "—"}`,
    `[usage debug] account_email=${inspect.accountEmail ?? "—"}`,
    `[usage debug] jwt_claim_keys=${inspect.jwtClaimKeys.slice(0, 12).join(", ") || "—"}`,
  ];
  if (inspect.parseError) {
    lines.push(`[usage debug] parse_error=${inspect.parseError}`);
  }
  return lines;
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

export async function codexUsage(): Promise<CodexUsageResult> {
  assertDesktop();
  return invoke<CodexUsageResult>("codex_usage");
}

export async function codexUsageInspect(): Promise<CodexUsageInspectResult> {
  assertDesktop();
  return invoke<CodexUsageInspectResult>("codex_usage_inspect");
}

export function formatCodexUsageInspectLog(inspect: CodexUsageInspectResult): string[] {
  return formatUsageInspectLines(inspect);
}

export function getDesktopOnlyMessage(): string {
  return DESKTOP_ONLY_MESSAGE;
}

export function isAiAvailable(): boolean {
  return isTauriRuntime();
}
