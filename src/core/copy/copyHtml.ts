import type { PlatformOutput } from "../platform/commonAdapter";

export type CopyMode = "html" | "plain-text-fallback";

export interface CopyResult {
  ok: boolean;
  mode: CopyMode;
  message: string;
}

export async function copyHtml(output: PlatformOutput): Promise<CopyResult> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return {
      ok: false,
      mode: "plain-text-fallback",
      message: "当前浏览器不支持剪贴板写入。",
    };
  }

  if ("ClipboardItem" in window) {
    const ClipboardItemConstructor = window.ClipboardItem;
    const clipboardItem = new ClipboardItemConstructor({
      "text/html": new Blob([output.html], { type: "text/html" }),
      "text/plain": new Blob([output.plainText], { type: "text/plain" }),
    });

    await navigator.clipboard.write([clipboardItem]);

    return {
      ok: true,
      mode: "html",
      message: "已复制公众号 HTML，可直接粘贴。",
    };
  }

  await navigator.clipboard.writeText(output.plainText);

  return {
    ok: true,
    mode: "plain-text-fallback",
    message: "浏览器不支持 HTML 剪贴板，已降级复制纯文本。",
  };
}
