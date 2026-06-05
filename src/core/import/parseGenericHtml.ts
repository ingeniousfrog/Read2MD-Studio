import type { ParsedWechatArticle } from "./importTypes";
import { parseWechatHtml } from "./parseWechatHtml";
import { processWechatContent } from "./wechatContentProcessor";

const NOISE_SELECTORS = ["nav", "header", "footer", "aside", "noscript"];

function extractTitle(document: Document): string {
  const ogTitle = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content")
    ?.trim();
  if (ogTitle) {
    return ogTitle;
  }

  const h1 = document.querySelector("h1")?.textContent?.trim();
  if (h1) {
    return h1;
  }

  const title = document.querySelector("title")?.textContent?.trim();
  if (title) {
    return title;
  }

  return "未命名网页";
}

function removeNoise(root: ParentNode): void {
  for (const selector of NOISE_SELECTORS) {
    for (const node of root.querySelectorAll(selector)) {
      node.remove();
    }
  }
}

function pickContentRoot(document: Document): Element {
  const wechatContent = document.querySelector("#js_content");
  if (wechatContent) {
    return wechatContent;
  }

  const article = document.querySelector("article");
  if (article) {
    return article;
  }

  const main = document.querySelector("main");
  if (main) {
    return main;
  }

  return document.body;
}

export function parseGenericHtml(html: string, sourceUrl = ""): ParsedWechatArticle {
  if (html.includes("js_content") || html.includes("mp.weixin.qq.com")) {
    try {
      return parseWechatHtml(html, sourceUrl);
    } catch {
      // Fall through to generic parsing.
    }
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const contentRoot = pickContentRoot(document);
  const title = extractTitle(document);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = contentRoot.innerHTML;
  removeNoise(wrapper);

  for (const image of Array.from(wrapper.querySelectorAll("img"))) {
    const dataSrc = image.getAttribute("data-src") || image.getAttribute("data-original");
    if (dataSrc && !image.getAttribute("src")) {
      image.setAttribute("src", dataSrc);
    }
  }

  const { codeBlocks, mathBlocks } = processWechatContent(wrapper, document);

  return {
    contentHtml: wrapper.innerHTML,
    title,
    meta: {
      title,
      author: "",
      accountName: "",
      publishTime: "",
      sourceUrl,
    },
    codeBlocks,
    mathBlocks,
  };
}
