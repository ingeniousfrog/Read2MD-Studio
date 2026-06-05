import { fetchHtml, formatNetworkError } from "./fetchHtml.mjs";

const WECHAT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN";

const VERIFICATION_MARKERS = [
  "环境异常",
  "完成验证后即可继续访问",
  "verify.weixin.qq.com",
  "secitpverify",
];

export function isValidWechatArticleUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname === "mp.weixin.qq.com" && url.pathname.startsWith("/s/");
  } catch {
    return false;
  }
}

export function isVerificationPage(html) {
  if (!html || typeof html !== "string") {
    return true;
  }
  return VERIFICATION_MARKERS.some((marker) => html.includes(marker));
}

export async function fetchWechatHtml(urlString) {
  if (!isValidWechatArticleUrl(urlString)) {
    return {
      ok: false,
      reason: "invalid-url",
      message: "仅支持 mp.weixin.qq.com/s/ 开头的微信公众号文章链接。",
      status: 0,
      html: "",
      verification: false,
    };
  }

  const { response, html, error } = await fetchHtml(urlString, {
    headers: {
      "User-Agent": WECHAT_UA,
      Referer: "https://mp.weixin.qq.com/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  if (error || !response) {
    return {
      ok: false,
      reason: "network",
      message: formatNetworkError(error),
      status: 0,
      html: "",
      verification: false,
    };
  }

  try {
    const verification = isVerificationPage(html);

    if (!response.ok) {
      return {
        ok: false,
        reason: verification ? "verification" : "network",
        message: verification
          ? "微信要求环境验证，请稍后重试。"
          : `抓取失败（HTTP ${response.status}），请稍后重试。`,
        status: response.status,
        html,
        verification,
      };
    }

    if (verification) {
      return {
        ok: false,
        reason: "verification",
        message: "微信要求环境验证，请稍后重试。",
        status: response.status,
        html,
        verification: true,
      };
    }

    if (!html.includes("js_content")) {
      return {
        ok: false,
        reason: "network",
        message: "未找到文章正文，请确认链接有效。",
        status: response.status,
        html,
        verification: false,
      };
    }

    return {
      ok: true,
      reason: null,
      message: "抓取成功",
      status: response.status,
      html,
      verification: false,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network",
      message: formatNetworkError(error),
      status: 0,
      html: "",
      verification: false,
    };
  }
}
