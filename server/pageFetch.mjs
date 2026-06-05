import { fetchHtml, formatNetworkError } from "./fetchHtml.mjs";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": BROWSER_UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

export function isValidHttpUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchPageHtml(urlString) {
  if (!isValidHttpUrl(urlString)) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "请输入有效的 http 或 https 链接。",
      status: 0,
      html: "",
    };
  }

  const { response, html, error } = await fetchHtml(urlString, {
    headers: {
      ...BROWSER_HEADERS,
      Referer: new URL(urlString).origin,
    },
  });

  if (error || !response) {
    return {
      ok: false,
      reason: "network",
      message: formatNetworkError(error),
      status: 0,
      html: "",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "network",
      message: `抓取失败（HTTP ${response.status}），请确认链接可访问。`,
      status: response.status,
      html,
    };
  }

  if (!html || html.trim().length < 100) {
    return {
      ok: false,
      reason: "network",
      message: "页面内容为空或过短，无法提取正文。",
      status: response.status,
      html,
    };
  }

  return {
    ok: true,
    reason: null,
    message: "抓取成功",
    status: response.status,
    html,
  };
}
