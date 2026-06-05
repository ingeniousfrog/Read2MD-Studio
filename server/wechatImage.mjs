const WECHAT_REFERER = "https://mp.weixin.qq.com/";
const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function fetchWechatImage(urlString) {
  const fetchUrl = urlString.startsWith("//") ? `https:${urlString}` : urlString;
  const headers = {
    "User-Agent": DEFAULT_UA,
    Accept: "image/*,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  };

  if (fetchUrl.includes("mmbiz.qpic.cn") || fetchUrl.includes("mmbiz.qlogo.cn")) {
    headers.Referer = WECHAT_REFERER;
  }

  const response = await fetch(fetchUrl, { headers, redirect: "follow" });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      contentType: null,
      bytes: null,
    };
  }

  const buffer = await response.arrayBuffer();
  return {
    ok: true,
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes: Buffer.from(buffer),
  };
}
