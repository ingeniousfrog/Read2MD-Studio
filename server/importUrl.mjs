import { fetchWechatHtml, isValidWechatArticleUrl } from "./wechatFetch.mjs";
import { fetchPageHtml, isValidHttpUrl } from "./pageFetch.mjs";

export async function fetchImportUrl(urlString) {
  if (!isValidHttpUrl(urlString)) {
    return {
      ok: false,
      kind: null,
      reason: "invalid-url",
      message: "请输入有效的 http 或 https 链接。",
      status: 0,
      html: "",
      verification: false,
    };
  }

  if (isValidWechatArticleUrl(urlString)) {
    const result = await fetchWechatHtml(urlString);
    return {
      ...result,
      kind: "wechat",
    };
  }

  const result = await fetchPageHtml(urlString);
  return {
    ...result,
    kind: "generic",
    verification: false,
  };
}
