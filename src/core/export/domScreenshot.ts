import { domToBlob, waitUntilLoad, type Options } from "modern-screenshot";

const MAX_CANVAS_DIMENSION = 16384;

/** WebKit rejects fetch() on large data: URLs — return them directly. */
export function createScreenshotFetchFn(): NonNullable<Options["fetchFn"]> {
  return async (url: string) => {
    if (url.startsWith("data:")) {
      return url;
    }
    return false;
  };
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function pickScreenshotScale(contentHeight: number, preferred = 2): number {
  let scale = preferred;
  while (contentHeight * scale > MAX_CANVAS_DIMENSION && scale > 0.75) {
    scale -= 0.25;
  }
  return Math.max(0.75, scale);
}

export async function captureElementToBlob(
  element: HTMLElement,
  options: Pick<Options, "width" | "height" | "backgroundColor"> & { preferredScale?: number },
): Promise<Blob> {
  await waitUntilLoad(element, { timeout: 30_000 });

  const contentHeight = Math.max(element.scrollHeight, element.offsetHeight, 1);
  const scale = pickScreenshotScale(contentHeight, options.preferredScale ?? 2);

  return domToBlob(element, {
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    scale,
    fetchFn: createScreenshotFetchFn(),
  });
}
