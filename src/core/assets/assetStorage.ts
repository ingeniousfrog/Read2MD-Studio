import { deleteBrowserAssets } from "./browserAssetStorage";
import { isTauriRuntime } from "../import/tauriRuntime";

const APP_ASSETS_DIR = "read2md-studio/assets";

export async function getDocumentAssetsDir(docId: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const { appDataDir, join } = await import("@tauri-apps/api/path");
  const base = await appDataDir();
  return join(base, APP_ASSETS_DIR, docId);
}

export async function ensureDocumentAssetsDir(docId: string): Promise<string | null> {
  const dir = await getDocumentAssetsDir(docId);
  if (!dir) {
    return null;
  }

  const { mkdir, exists } = await import("@tauri-apps/plugin-fs");
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function deleteDocumentAssetsDir(docId: string): Promise<void> {
  if (isTauriRuntime()) {
    const dir = await getDocumentAssetsDir(docId);
    if (!dir) {
      return;
    }

    const { exists, remove } = await import("@tauri-apps/plugin-fs");
    if (await exists(dir)) {
      await remove(dir, { recursive: true });
    }
    return;
  }

  if (typeof indexedDB !== "undefined") {
    await deleteBrowserAssets(docId);
  }
}

export async function resolveAssetFileUrl(docId: string, filename: string): Promise<string | null> {
  if (isTauriRuntime()) {
    const dir = await getDocumentAssetsDir(docId);
    if (!dir) {
      return null;
    }

    const { join } = await import("@tauri-apps/api/path");
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    const filePath = await join(dir, filename);
    return convertFileSrc(filePath);
  }

  const { getBrowserAssetObjectUrl } = await import("./browserAssetStorage");
  return getBrowserAssetObjectUrl(docId, filename);
}
