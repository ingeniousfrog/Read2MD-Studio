import { JSDOM } from "jsdom";
import { fetchWechatHtml } from "../server/wechatFetch.mjs";
import { parseWechatHtml } from "../src/core/import/parseWechatHtml";
import { htmlToMarkdown } from "../src/core/import/htmlToMarkdown";

function setupDom(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  (globalThis as unknown as { window: Window }).window = dom.window as unknown as Window;
  (globalThis as unknown as { document: Document }).document = dom.window.document;
  (globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser = dom.window.DOMParser;
  (globalThis as unknown as { Node: typeof Node }).Node = dom.window.Node;
  (globalThis as unknown as { Element: typeof Element }).Element = dom.window.Element;
}

async function analyze(url: string) {
  const fetched = await fetchWechatHtml(url);
  if (!fetched.ok || !fetched.html) {
    console.error("fetch failed", url, fetched);
    return;
  }

  setupDom(fetched.html, url);
  const parsed = parseWechatHtml(fetched.html, url);
  const md = htmlToMarkdown(parsed.contentHtml, parsed.title, parsed.codeBlocks, parsed.mathBlocks);

  console.log("\n===", url.split("/").pop(), "===");
  console.log("title:", parsed.title);
  console.log("math blocks:", parsed.mathBlocks.length);
  console.log("code blocks:", parsed.codeBlocks.length);

  if (parsed.mathBlocks.length > 0) {
    console.log("math samples:");
    for (const block of parsed.mathBlocks.slice(0, 8)) {
      console.log(" -", block.display ? "display" : "inline", block.latex.slice(0, 120));
    }
  }

  const emptyNumbered = md.match(/^\d+\.\s*$/gm) ?? [];
  console.log("empty numbered lines:", emptyNumbered.length);

  const placeholderLeft = (md.match(/R2MDMATHPH\d+END/g) ?? []).length;
  console.log("unrestored math placeholders:", placeholderLeft);

  for (const needle of ["javac", "Delta W", "\\\\Delta", "commons-io", "3.", "4.", "5."]) {
    const index = md.indexOf(needle);
    if (index >= 0) {
      console.log(`\n--- context: ${needle} ---`);
      console.log(md.slice(Math.max(0, index - 120), index + 280));
    }
  }
}

const urls = process.argv.slice(2);
if (urls.length === 0) {
  urls.push(
    "https://mp.weixin.qq.com/s/9gMCz2yy7GZFwtVjp7p72g",
    "https://mp.weixin.qq.com/s/BxiimnSw1W-iwQVjNvv31g",
  );
}

for (const url of urls) {
  await analyze(url);
}
