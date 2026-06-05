import { resolveAssetFileUrl } from "./assetStorage";
import {
  filenameFromR2mdAssetUrl,
  isR2mdAssetUrl,
  listMarkdownImageUrls,
  replaceMarkdownImageUrl,
} from "./imageUrl";

export async function resolveMarkdownAssetUrls(
  docId: string | null,
  markdown: string,
): Promise<string> {
  if (!docId) {
    return markdown;
  }

  let result = markdown;
  for (const entry of listMarkdownImageUrls(markdown)) {
    if (!isR2mdAssetUrl(entry.url)) {
      continue;
    }
    const filename = filenameFromR2mdAssetUrl(entry.url);
    if (!filename) {
      continue;
    }

    const resolved = await resolveAssetFileUrl(docId, filename);
    if (resolved) {
      result = replaceMarkdownImageUrl(result, entry.url, resolved);
    }
  }

  return result;
}
