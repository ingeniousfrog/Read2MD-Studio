import type { LocalizeImagesResult } from "./assetTypes";
import { ensureDocumentAssetsDir } from "./assetStorage";
import { saveBrowserAsset } from "./browserAssetStorage";
import { downloadImageBytes } from "./downloadImage";
import {
  assetFilename,
  extensionFromImageUrl,
  isRemoteHttpImage,
  listMarkdownImageUrls,
  replaceMarkdownImageUrl,
  toR2mdAssetUrl,
} from "./imageUrl";
import { isTauriRuntime } from "../import/tauriRuntime";

function mimeFromExtension(extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    default:
      return "image/jpeg";
  }
}

async function saveLocalizedImage(
  docId: string,
  url: string,
  filename: string,
  extension: string,
): Promise<void> {
  const { bytes, contentType } = await downloadImageBytes(url);

  if (isTauriRuntime()) {
    const assetsDir = await ensureDocumentAssetsDir(docId);
    if (!assetsDir) {
      throw new Error("无法创建本地 assets 目录");
    }
    const { join } = await import("@tauri-apps/api/path");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await join(assetsDir, filename);
    await writeFile(filePath, bytes);
    return;
  }

  const mime = contentType?.split(";")[0]?.trim() || mimeFromExtension(extension);
  await saveBrowserAsset(docId, filename, bytes, mime);
}

export async function localizeDocumentImages(
  docId: string,
  markdown: string,
): Promise<LocalizeImagesResult> {
  const images = listMarkdownImageUrls(markdown);
  const remoteImages = images.filter((entry) => isRemoteHttpImage(entry.url));

  if (remoteImages.length === 0) {
    return { markdown, assetFiles: [], warnings: [] };
  }

  if (!isTauriRuntime() && typeof indexedDB === "undefined") {
    return {
      markdown,
      assetFiles: [],
      warnings: ["当前环境无法本地化图片，请使用桌面版导入。"],
    };
  }

  let result = markdown;
  const assetFiles: string[] = [];
  const warnings: string[] = [];
  let index = 1;

  for (const entry of remoteImages) {
    const extension = extensionFromImageUrl(entry.url);
    const filename = assetFilename(index, extension);
    index += 1;

    try {
      await saveLocalizedImage(docId, entry.url, filename, extension);
      const localizedUrl = toR2mdAssetUrl(filename);
      result = replaceMarkdownImageUrl(result, entry.url, localizedUrl);
      assetFiles.push(filename);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      warnings.push(`图片下载失败（${detail}）：${entry.url.slice(0, 72)}…`);
    }
  }

  return { markdown: result, assetFiles, warnings };
}
