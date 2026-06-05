import type { FetchWechatFailureReason } from "./importTypes";
import { formatImportErrorMessage } from "./formatImportError";
import { isValidWechatArticleUrl } from "./fetchWechatArticle";

export type ImportUrlKind = "wechat" | "generic";

interface ProxyResponse {
  ok: boolean;
  html?: string;
  kind?: ImportUrlKind;
  verification?: boolean;
  reason?: string;
  message?: string;
}

export type FetchImportUrlResult =
  | { ok: true; html: string; kind: ImportUrlKind }
  | { ok: false; reason: FetchWechatFailureReason; message: string; verification?: boolean };

export function detectImportUrlKind(url: string): ImportUrlKind | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return isValidWechatArticleUrl(url) ? "wechat" : "generic";
  } catch {
    return null;
  }
}

async function requestImportUrl(url: string): Promise<Response> {
  return fetch(`/api/import-url?url=${encodeURIComponent(url)}`);
}

async function readImportPayload(response: Response): Promise<ProxyResponse | null> {
  try {
    return (await response.json()) as ProxyResponse;
  } catch {
    return null;
  }
}

function buildImportFailure(
  payload: ProxyResponse | null,
  response: Response,
): FetchImportUrlResult {
  if (payload?.verification || payload?.reason === "verification") {
    return {
      ok: false,
      reason: "verification",
      message: payload?.message ?? "微信要求环境验证，请稍后重试。",
      verification: true,
    };
  }

  const rawMessage = payload?.message ?? `抓取失败（HTTP ${response.status}）。`;
  return {
    ok: false,
    reason: payload?.reason === "invalid-url" ? "invalid-url" : "network",
    message: formatImportErrorMessage(rawMessage),
  };
}

export async function fetchImportUrl(url: string): Promise<FetchImportUrlResult> {
  const kind = detectImportUrlKind(url);
  if (!kind) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "请输入有效的 http 或 https 链接。",
    };
  }

  try {
    let response = await requestImportUrl(url);
    let payload = await readImportPayload(response);

    if ((!response.ok || !payload?.ok || !payload.html) && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      response = await requestImportUrl(url);
      payload = await readImportPayload(response);
    }

    if (!response.ok || !payload?.ok || !payload.html) {
      return buildImportFailure(payload, response);
    }

    return {
      ok: true,
      html: payload.html,
      kind: payload.kind ?? kind,
    };
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "无法连接本地抓取服务，请确认 dev server 已启动。";
    return {
      ok: false,
      reason: "network",
      message: formatImportErrorMessage(rawMessage),
    };
  }
}
