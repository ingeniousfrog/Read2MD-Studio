const DB_NAME = "r2md-studio-assets";
const STORE_NAME = "blobs";
const DB_VERSION = 1;

interface StoredBlob {
  key: string;
  docId: string;
  filename: string;
  mime: string;
  bytes: ArrayBuffer;
}

function assetKey(docId: string, filename: string): string {
  return `${docId}/${filename}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("无法打开 IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("docId", "docId", { unique: false });
      }
    };
  });
}

export async function saveBrowserAsset(
  docId: string,
  filename: string,
  bytes: Uint8Array,
  mime: string,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: StoredBlob = {
      key: assetKey(docId, filename),
      docId,
      filename,
      mime,
      bytes: new Uint8Array(bytes).buffer,
    };
    const request = store.put(record);
    request.onerror = () => reject(request.error ?? new Error("保存图片失败"));
    request.onsuccess = () => resolve();
  });
  db.close();
}

export async function getBrowserAssetBlob(docId: string, filename: string): Promise<Blob | null> {
  const db = await openDb();
  const record = await new Promise<StoredBlob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(assetKey(docId, filename));
    request.onerror = () => reject(request.error ?? new Error("读取图片失败"));
    request.onsuccess = () => resolve((request.result as StoredBlob | undefined) ?? null);
  });
  db.close();

  if (!record) {
    return null;
  }

  return new Blob([record.bytes], { type: record.mime });
}

export async function getBrowserAssetObjectUrl(docId: string, filename: string): Promise<string | null> {
  const blob = await getBrowserAssetBlob(docId, filename);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function readBrowserAssetAsDataUrl(docId: string, filename: string): Promise<string | null> {
  const blob = await getBrowserAssetBlob(docId, filename);
  if (!blob) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败"));
    reader.readAsDataURL(blob);
  });
}

export async function deleteBrowserAssets(docId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("docId");
    const request = index.openCursor(IDBKeyRange.only(docId));
    request.onerror = () => reject(request.error ?? new Error("删除图片失败"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
        return;
      }
      resolve();
    };
  });
  db.close();
}
