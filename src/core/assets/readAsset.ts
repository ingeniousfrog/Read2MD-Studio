import { getDocumentAssetsDir } from "./assetStorage";
import { readBrowserAssetAsDataUrl } from "./browserAssetStorage";
import { isTauriRuntime } from "../import/tauriRuntime";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function mimeTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
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

export async function readAssetAsDataUrl(docId: string, filename: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return readBrowserAssetAsDataUrl(docId, filename);
  }

  const dir = await getDocumentAssetsDir(docId);
  if (!dir) {
    return null;
  }

  const { join } = await import("@tauri-apps/api/path");
  const { readFile, exists } = await import("@tauri-apps/plugin-fs");
  const filePath = await join(dir, filename);
  if (!(await exists(filePath))) {
    return null;
  }

  const bytes = await readFile(filePath);
  const mime = mimeTypeFromFilename(filename);
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}
