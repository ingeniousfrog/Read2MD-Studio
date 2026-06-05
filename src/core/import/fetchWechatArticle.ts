import type { FetchWechatResult } from "./importTypes";

interface ProxyResponse {
  ok: boolean;
  html?: string;
  verification?: boolean;
  reason?: string;
  message?: string;
}

export function isValidWechatArticleUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.hostname === "mp.weixin.qq.com" && url.pathname.startsWith("/s/");
  } catch {
    return false;
  }
}

export async function fetchWechatArticle(url: string): Promise<FetchWechatResult> {
  if (!isValidWechatArticleUrl(url)) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "仅支持 mp.weixin.qq.com/s/ 开头的微信公众号文章链接。",
    };
  }

  try {
    const response = await fetch(`/api/import-wechat?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      let payload: ProxyResponse | null = null;
      try {
        payload = (await response.json()) as ProxyResponse;
      } catch {
        payload = null;
      }

      if (payload?.verification || payload?.reason === "verification") {
        return {
          ok: false,
          reason: "verification",
          message: payload.message ?? "微信要求环境验证，请改用粘贴 HTML 模式。",
        };
      }

      return {
        ok: false,
        reason: "network",
        message: payload?.message ?? `抓取失败（HTTP ${response.status}）。`,
      };
    }

    const payload = (await response.json()) as ProxyResponse;

    if (!payload.ok || !payload.html) {
      if (payload.verification || payload.reason === "verification") {
        return {
          ok: false,
          reason: "verification",
          message: payload.message ?? "微信要求环境验证，请改用粘贴 HTML 模式。",
        };
      }

      return {
        ok: false,
        reason: "network",
        message: payload.message ?? "抓取失败，请稍后重试或粘贴 HTML。",
      };
    }

    return {
      ok: true,
      html: payload.html,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network",
      message:
        error instanceof Error
          ? error.message
          : "无法连接本地抓取服务，请确认 dev server 已启动，或改用粘贴 HTML 模式。",
    };
  }
}
