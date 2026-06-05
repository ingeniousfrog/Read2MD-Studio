import { isTauriRuntime } from "../import/tauriRuntime";

const WECHAT_REFERER = "https://mp.weixin.qq.com/";
const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function normalizeFetchUrl(url: string): string {
  const withoutFragment = url.split("#")[0] ?? url;
  return withoutFragment.startsWith("//") ? `https:${withoutFragment}` : withoutFragment;
}

export async function downloadImageBytes(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const fetchUrl = normalizeFetchUrl(url);
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_UA,
    Accept: "image/*,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  };

  if (fetchUrl.includes("mmbiz.qpic.cn") || fetchUrl.includes("mmbiz.qlogo.cn")) {
    headers.Referer = WECHAT_REFERER;
  }

  if (isTauriRuntime()) {
    const { fetch } = await import("@tauri-apps/plugin-http");
    const response = await fetch(fetchUrl, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      contentType: response.headers.get("content-type"),
    };
  }

  const proxyUrl = `/api/wechat-image?url=${encodeURIComponent(fetchUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`代理请求失败 HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    contentType: response.headers.get("content-type"),
  };
}

/** @deprecated Use downloadImageBytes */
export async function downloadImageToAssetsDir(
  url: string,
  assetsDir: string,
  filename: string,
): Promise<void> {
  const { bytes } = await downloadImageBytes(url);
  const { join } = await import("@tauri-apps/api/path");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const filePath = await join(assetsDir, filename);
  await writeFile(filePath, bytes);
}
