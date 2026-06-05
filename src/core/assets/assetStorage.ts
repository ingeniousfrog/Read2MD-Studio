import { deleteBrowserAssets } from "./browserAssetStorage";
import { isTauriRuntime } from "../import/tauriRuntime";

const ASSETS_ROOT = "read2md-studio/assets";

export function getDocumentAssetsRelativeDir(docId: string): string {
  return `${ASSETS_ROOT}/${docId}`;
}

export function getAssetRelativePath(docId: string, filename: string): string {
  return `${ASSETS_ROOT}/${docId}/${filename}`;
}

async function tauriFs() {
  const { BaseDirectory, mkdir, exists, remove, writeFile, readFile } = await import(
    "@tauri-apps/plugin-fs"
  );
  const baseDir = BaseDirectory.AppData;
  return { baseDir, mkdir, exists, remove, writeFile, readFile };
}

export async function getDocumentAssetsDir(docId: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const { appDataDir, join } = await import("@tauri-apps/api/path");
  const base = await appDataDir();
  return join(base, getDocumentAssetsRelativeDir(docId));
}

export async function ensureDocumentAssetsDir(docId: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const relativeDir = getDocumentAssetsRelativeDir(docId);
  const { baseDir, mkdir, exists } = await tauriFs();
  if (!(await exists(relativeDir, { baseDir }))) {
    await mkdir(relativeDir, { baseDir, recursive: true });
  }
  return getDocumentAssetsDir(docId);
}

export async function writeDocumentAssetFile(
  docId: string,
  filename: string,
  bytes: Uint8Array,
): Promise<void> {
  const relativePath = getAssetRelativePath(docId, filename);
  const { baseDir, writeFile } = await tauriFs();
  await writeFile(relativePath, bytes, { baseDir });
}

export async function readDocumentAssetFile(docId: string, filename: string): Promise<Uint8Array> {
  const relativePath = getAssetRelativePath(docId, filename);
  const { baseDir, readFile } = await tauriFs();
  return readFile(relativePath, { baseDir });
}

export async function documentAssetExists(docId: string, filename: string): Promise<boolean> {
  const relativePath = getAssetRelativePath(docId, filename);
  const { baseDir, exists } = await tauriFs();
  return exists(relativePath, { baseDir });
}

export async function deleteDocumentAssetsDir(docId: string): Promise<void> {
  if (isTauriRuntime()) {
    const relativeDir = getDocumentAssetsRelativeDir(docId);
    const { baseDir, exists, remove } = await tauriFs();
    if (await exists(relativeDir, { baseDir })) {
      await remove(relativeDir, { baseDir, recursive: true });
    }
    return;
  }

  if (typeof indexedDB !== "undefined") {
    await deleteBrowserAssets(docId);
  }
}

export async function resolveAssetFileUrl(docId: string, filename: string): Promise<string | null> {
  if (isTauriRuntime()) {
    const exists = await documentAssetExists(docId, filename);
    if (!exists) {
      return null;
    }

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
