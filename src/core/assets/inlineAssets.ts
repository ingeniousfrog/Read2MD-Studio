import { filenameFromR2mdAssetUrl, isR2mdAssetUrl } from "./imageUrl";
import { readAssetAsDataUrl } from "./readAsset";

export async function inlineR2mdAssetImages(html: string, docId: string | null): Promise<string> {
  if (!docId || typeof document === "undefined") {
    return html;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  let changed = false;

  for (const image of Array.from(parsed.querySelectorAll("img"))) {
    const source = image.getAttribute("src") ?? "";
    if (!isR2mdAssetUrl(source)) {
      continue;
    }
    const filename = filenameFromR2mdAssetUrl(source);
    if (!filename) {
      continue;
    }
    const dataUrl = await readAssetAsDataUrl(docId, filename);
    if (dataUrl) {
      image.setAttribute("src", dataUrl);
      image.setAttribute("data-r2md-image", "localized");
      changed = true;
    }
  }

  return changed ? parsed.body.innerHTML : html;
}
