import type { ParsedWechatArticle, WechatArticleMeta } from "./importTypes";
import { processWechatContent } from "./wechatContentProcessor";

function extractText(document: Document, selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function extractMeta(document: Document, sourceUrl: string): WechatArticleMeta {
  const title =
    extractText(document, "#activity-name") ||
    extractText(document, "h1.rich_media_title") ||
    extractText(document, "title") ||
    "未命名文章";
  const author = extractText(document, "#js_name") || extractText(document, ".rich_media_meta_nickname");
  const publishTime = extractText(document, "#publish_time") || extractText(document, ".rich_media_meta_text");

  return {
    title,
    author,
    accountName: author,
    publishTime,
    sourceUrl,
  };
}

function normalizeImages(root: ParentNode): void {
  for (const image of Array.from(root.querySelectorAll("img"))) {
    const dataSrc = image.getAttribute("data-src") || image.getAttribute("data-original");
    if (dataSrc && !image.getAttribute("src")) {
      image.setAttribute("src", dataSrc);
    }
  }
}

function promoteLargeFontHeadings(root: ParentNode): void {
  for (const span of Array.from(root.querySelectorAll("span[style*='font-size']"))) {
    if (span.closest("pre, code")) {
      continue;
    }
    if (span.querySelector("img, svg")) {
      continue;
    }

    const style = span.getAttribute("style") ?? "";
    const match = /font-size:\s*([\d.]+)\s*px/i.exec(style);
    if (!match) {
      continue;
    }

    const fontSize = Number(match[1]);
    const text = span.textContent?.trim() ?? "";

    if (fontSize < 17 || text.length === 0 || text.length >= 80) {
      continue;
    }

    if (text.length < 4) {
      continue;
    }

    if (fontSize >= 36 && text.length <= 8) {
      continue;
    }

    const ancestorStyle = span.parentElement?.closest("[style]")?.getAttribute("style") ?? "";
    if (/transform\s*:/i.test(ancestorStyle) || /display\s*:\s*flex/i.test(ancestorStyle)) {
      continue;
    }

    if (span.parentElement?.tagName === "H2") {
      continue;
    }

    const heading = span.ownerDocument.createElement("h2");
    heading.textContent = text;
    span.replaceWith(heading);
  }
}

export function parseWechatHtml(html: string, sourceUrl = ""): ParsedWechatArticle {
  const document = new DOMParser().parseFromString(html, "text/html");
  const meta = extractMeta(document, sourceUrl);
  const content = document.querySelector("#js_content");

  if (!content) {
    throw new Error("未找到文章正文 #js_content，请确认 HTML 来自微信公众号文章页。");
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = content.innerHTML;

  const { codeBlocks, mathBlocks } = processWechatContent(wrapper, document);
  normalizeImages(wrapper);
  promoteLargeFontHeadings(wrapper);

  return {
    contentHtml: wrapper.innerHTML,
    title: meta.title,
    meta,
    codeBlocks,
    mathBlocks,
  };
}
