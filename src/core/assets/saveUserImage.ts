import { ensureDocumentAssetsDir, writeDocumentAssetFile } from "./assetStorage";
import { saveBrowserAsset } from "./browserAssetStorage";
import { assetFilename, toR2mdAssetUrl } from "./imageUrl";
import { isTauriRuntime } from "../import/tauriRuntime";

function extensionFromFile(file: File): string {
  const name = file.name.toLowerCase();
  for (const ext of [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]) {
    if (name.endsWith(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  }

  switch (file.type) {
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/bmp":
      return ".bmp";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".jpg";
  }
}

export function nextAssetImageIndex(markdown: string, assetFiles: string[] = []): number {
  let maxIndex = assetFiles.length;
  for (const match of markdown.matchAll(/image-(\d{3})\./g)) {
    const value = Number.parseInt(match[1] ?? "0", 10);
    if (!Number.isNaN(value)) {
      maxIndex = Math.max(maxIndex, value);
    }
  }
  return maxIndex + 1;
}

export async function saveUserImage(
  docId: string,
  file: File,
  nextIndex: number,
): Promise<{ filename: string; assetUrl: string }> {
  const extension = extensionFromFile(file);
  const filename = assetFilename(nextIndex, extension);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";

  if (isTauriRuntime()) {
    const assetsDir = await ensureDocumentAssetsDir(docId);
    if (!assetsDir) {
      throw new Error("无法创建本地 assets 目录");
    }
    await writeDocumentAssetFile(docId, filename, bytes);
  } else {
    if (typeof indexedDB === "undefined") {
      throw new Error("当前环境无法保存图片");
    }
    await saveBrowserAsset(docId, filename, bytes, mime);
  }

  return {
    filename,
    assetUrl: toR2mdAssetUrl(filename),
  };
}
