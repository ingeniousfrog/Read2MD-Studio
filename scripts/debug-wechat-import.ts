import { JSDOM } from "jsdom";
import { writeFileSync } from "fs";
import { fetchWechatHtml } from "../server/wechatFetch.mjs";
import { parseWechatHtml } from "../src/core/import/parseWechatHtml";
import { htmlToMarkdown } from "../src/core/import/htmlToMarkdown";

const url = "https://mp.weixin.qq.com/s/6SlCU9U-8j3XazZH3PJzgQ";
const r = await fetchWechatHtml(url);
if (!r.ok) {
  console.error("fetch failed", r);
  process.exit(1);
}

const dom = new JSDOM(r.html, { url });
(globalThis as typeof globalThis & { window: Window; document: Document; DOMParser: typeof DOMParser; Node: typeof Node; Element: typeof Element }).window =
  dom.window as unknown as Window;
(globalThis as unknown as { document: Document }).document = dom.window.document;
(globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser = dom.window.DOMParser;
(globalThis as unknown as { Node: typeof Node }).Node = dom.window.Node;
(globalThis as unknown as { Element: typeof Element }).Element = dom.window.Element;

const parsed = parseWechatHtml(r.html, url);
const md = htmlToMarkdown(parsed.contentHtml, parsed.title, parsed.codeBlocks, parsed.mathBlocks);
writeFileSync("/tmp/wechat-import-debug.md", md);
console.log(md.slice(0, 3000));
console.log("---");
const bad = md.split("\n").filter((line) => line.trim().length === 1);
console.log("single char lines:", bad.length, bad.slice(0, 30));
