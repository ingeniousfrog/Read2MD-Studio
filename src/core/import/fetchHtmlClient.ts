import type { ImportUrlKind } from "./fetchImportUrl";
import type { FetchWechatFailureReason } from "./importTypes";
import { formatImportErrorMessage } from "./formatImportError";
import { isValidWechatArticleUrl } from "./fetchWechatArticle";

const WECHAT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const VERIFICATION_MARKERS = [
  "环境异常",
  "完成验证后即可继续访问",
  "verify.weixin.qq.com",
  "secitpverify",
];

export type FetchHtmlClientResult =
  | { ok: true; html: string; kind: ImportUrlKind }
  | { ok: false; reason: FetchWechatFailureReason; message: string; verification?: boolean };

function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isVerificationPage(html: string): boolean {
  if (!html || typeof html !== "string") {
    return true;
  }
  return VERIFICATION_MARKERS.some((marker) => html.includes(marker));
}

function formatNetworkError(error: unknown): string {
  if (error instanceof Error) {
    return formatImportErrorMessage(error.message);
  }
  return "网络请求失败，请检查网络连接后重试。";
}

async function tauriFetch(url: string, headers: Record<string, string>): Promise<Response> {
  const { fetch } = await import("@tauri-apps/plugin-http");
  return fetch(url, { method: "GET", headers });
}

async function fetchHtml(
  url: string,
  headers: Record<string, string>,
): Promise<{ response: Response | null; html: string; error: unknown }> {
  try {
    const response = await tauriFetch(url, headers);
    const html = await response.text();
    return { response, html, error: null };
  } catch (error) {
    return { response: null, html: "", error };
  }
}

async function fetchWechatHtml(urlString: string): Promise<FetchHtmlClientResult> {
  if (!isValidWechatArticleUrl(urlString)) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "仅支持 mp.weixin.qq.com/s/ 开头的微信公众号文章链接。",
    };
  }

  const { response, html, error } = await fetchHtml(urlString, {
    "User-Agent": WECHAT_UA,
    Referer: "https://mp.weixin.qq.com/",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  });

  if (error || !response) {
    return {
      ok: false,
      reason: "network",
      message: formatNetworkError(error),
    };
  }

  const verification = isVerificationPage(html);

  if (!response.ok) {
    return {
      ok: false,
      reason: verification ? "verification" : "network",
      message: verification
        ? "微信要求环境验证，请稍后重试。"
        : `抓取失败（HTTP ${response.status}），请稍后重试。`,
      verification,
    };
  }

  if (verification) {
    return {
      ok: false,
      reason: "verification",
      message: "微信要求环境验证，请稍后重试。",
      verification: true,
    };
  }

  if (!html.includes("js_content")) {
    return {
      ok: false,
      reason: "network",
      message: "未找到文章正文，请确认链接有效。",
    };
  }

  return { ok: true, html, kind: "wechat" };
}

async function fetchPageHtml(urlString: string): Promise<FetchHtmlClientResult> {
  if (!isValidHttpUrl(urlString)) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "请输入有效的 http 或 https 链接。",
    };
  }

  const { response, html, error } = await fetchHtml(urlString, {
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: new URL(urlString).origin,
  });

  if (error || !response) {
    return {
      ok: false,
      reason: "network",
      message: formatNetworkError(error),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "network",
      message: `抓取失败（HTTP ${response.status}），请确认链接可访问。`,
    };
  }

  if (!html || html.trim().length < 100) {
    return {
      ok: false,
      reason: "network",
      message: "页面内容为空或过短，无法提取正文。",
    };
  }

  return { ok: true, html, kind: "generic" };
}

export async function fetchImportUrlClient(url: string): Promise<FetchHtmlClientResult> {
  if (!isValidHttpUrl(url)) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "请输入有效的 http 或 https 链接。",
    };
  }

  if (isValidWechatArticleUrl(url)) {
    return fetchWechatHtml(url);
  }

  return fetchPageHtml(url);
}

