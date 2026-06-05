export interface CodeBlock {
  lang: string;
  code: string;
}

export interface MathBlock {
  latex: string;
  display: boolean;
}

export interface ProcessedBlocks {
  codeBlocks: CodeBlock[];
  mathBlocks: MathBlock[];
}

const FORMULA_ATTRS = ["data-formula", "data-latex", "latex", "data-math"];

const COMPLEX_TEX_MARKERS = ["\\underbrace", "\\overbrace", "\\frac", "\\begin{", "\\sqrt", "\\sum", "\\int"];

const NOISE_SELECTORS = [
  ".qr_code_pc",
  ".reward_area",
  ".rich_media_tool",
  ".like_a_look_info",
  "#js_pc_qr_code",
  ".share_notice",
  ".reward_qrcode_area",
  ".js_underline_link_tooltip",
];

export function mathPlaceholderToken(index: number): string {
  return `R2MDMATHPH${index}END`;
}

export function codePlaceholderToken(index: number): string {
  return `R2MDCODEPH${index}END`;
}

function isComplexLatex(latex: string): boolean {
  return COMPLEX_TEX_MARKERS.some((marker) => latex.includes(marker));
}

function latexHasSubscript(latex: string): boolean {
  return /_(?:\{[^}]+\}|[0-9A-Za-z])/.test(latex);
}

function normalizeExtractedLatex(latex: string): string {
  let cleaned = latex.trim().replace(/,+$/, "").trim();
  cleaned = cleaned.replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ");

  if (isComplexLatex(cleaned)) {
    return cleaned;
  }

  if (!latexHasSubscript(cleaned)) {
    // \mathbf{W}0 -> \mathbf{W}_{0}
    cleaned = cleaned.replace(/\}(\d)(?![.\d])/g, "}_{$1}");
    // "W 0" -> "W_{0}"
    cleaned = cleaned.replace(/([A-Za-z\\}]) (\d)(?![.\d])/g, "$1_{$2}");
  }

  return cleaned;
}

function decodeFormulaAttribute(value: string): string | null {
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  return raw;
}

function latexFromAttributes(node: Element): string | null {
  for (const attr of FORMULA_ATTRS) {
    const value = node.getAttribute(attr);
    if (value) {
      const decoded = decodeFormulaAttribute(value);
      if (decoded) {
        return decoded;
      }
    }
  }
  return null;
}

function latexFromMjxContainer(container: Element): string | null {
  const candidates: string[] = [];

  for (const attr of ["data-latex", "data-formula", "latex"]) {
    const value = container.getAttribute(attr);
    if (value) {
      candidates.push(value);
    }
  }

  for (const annotation of container.querySelectorAll("annotation")) {
    const encoding = (annotation.getAttribute("encoding") ?? "").toLowerCase();
    const text = annotation.textContent?.trim() ?? "";
    if (text && (encoding.includes("tex") || encoding === "application/x-tex" || !encoding)) {
      candidates.push(text);
    }
  }

  const best = candidates
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];

  return best ? best : null;
}

function hasFormulaAncestor(node: Element): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (parent.tagName === "SCRIPT" || parent.tagName.toLowerCase() === "mjx-container") {
      break;
    }
    for (const attr of FORMULA_ATTRS) {
      if (parent.getAttribute(attr)) {
        return true;
      }
    }
    parent = parent.parentElement;
  }
  return false;
}

function isDataFormulaDisplay(node: Element): boolean {
  if (!node.getAttribute("data-formula")) {
    return false;
  }
  const tag = node.tagName.toLowerCase();
  if (tag !== "section" && tag !== "div" && tag !== "p") {
    return false;
  }
  const style = (node.getAttribute("style") ?? "").replace(/\s+/g, "").toLowerCase();
  return style.includes("text-align:center") || style.includes("display:block");
}

function replaceWithMathPlaceholder(
  doc: Document,
  node: Element | Node,
  mathBlocks: MathBlock[],
  latex: string,
  display: boolean,
): void {
  const normalized = normalizeExtractedLatex(latex);
  mathBlocks.push({ latex: normalized, display });
  const token = mathPlaceholderToken(mathBlocks.length - 1);

  if (display) {
    const placeholder = doc.createElement("p");
    placeholder.textContent = token;
    (node as ChildNode).replaceWith(placeholder);
  } else {
    (node as ChildNode).replaceWith(doc.createTextNode(token));
  }
}

function extractMathBlocks(root: Element, doc: Document): { mathBlocks: MathBlock[]; mjxCount: number } {
  const mathBlocks: MathBlock[] = [];
  const mjxContainers = Array.from(root.querySelectorAll("mjx-container"));
  const mjxCount = mjxContainers.length;

  for (const script of Array.from(root.querySelectorAll("script"))) {
    const type = (script.getAttribute("type") ?? "").toLowerCase();
    if (!type.includes("math/tex")) {
      continue;
    }
    const latex = script.textContent?.trim() ?? "";
    if (latex) {
      replaceWithMathPlaceholder(doc, script, mathBlocks, latex, type.includes("mode=display"));
    }
  }

  for (const container of mjxContainers) {
    if (!container.parentNode) {
      continue;
    }
    const latex = latexFromMjxContainer(container);
    if (latex) {
      const displayAttr = (container.getAttribute("display") ?? "").toLowerCase();
      replaceWithMathPlaceholder(doc, container, mathBlocks, latex, displayAttr === "true");
    }
  }

  for (const node of Array.from(root.querySelectorAll("*"))) {
    if (!node.parentNode || !root.contains(node)) {
      continue;
    }
    const tag = node.tagName.toLowerCase();
    if (tag === "script" || tag === "mjx-container") {
      continue;
    }
    if (hasFormulaAncestor(node)) {
      continue;
    }
    const latex = latexFromAttributes(node);
    if (!latex) {
      continue;
    }
    replaceWithMathPlaceholder(doc, node, mathBlocks, latex, isDataFormulaDisplay(node));
  }

  return { mathBlocks, mjxCount };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function extractCodeTextFromElement(element: Element): string {
  const lineItems = Array.from(element.querySelectorAll(".code-snippet__line"))
    .map((line) => line.textContent?.replace(/^\s*\d+\s+/, "").replace(/\s+$/, "") ?? "")
    .filter((line) => line.length > 0);

  if (lineItems.length > 0) {
    return lineItems.join("\n");
  }

  const codeTags = Array.from(element.querySelectorAll("code"));
  if (codeTags.length > 1) {
    const lines = codeTags
      .map((code) => code.textContent ?? "")
      .filter((line) => line.trim().length > 0);
    if (lines.length > 0) {
      return lines.join("\n");
    }
  }

  const target = element.querySelector("pre") ?? element.querySelector("code") ?? element;

  // Prefer real newlines already present in the text (most <pre> code keeps them).
  // Only treat <br> and block-level line containers (p/div/li) as line breaks.
  // Never break on <span> boundaries: WeChat wraps highlighted tokens in spans,
  // and splitting there shreds a single line into many.
  const html = target.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>\s*/gi, "\n");

  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((line) => line.replace(/^\s*\d+\s+/, "").replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractCodeBlocks(root: Element, doc: Document): CodeBlock[] {
  const codeBlocks: CodeBlock[] = [];
  const seen = new Set<Element>();

  const blocks = [
    ...Array.from(root.querySelectorAll(".code-snippet__fix")),
    ...Array.from(root.querySelectorAll("section[class*='code-snippet'], pre[class*='code-snippet']")),
  ];

  for (const block of blocks) {
    if (seen.has(block) || !root.contains(block)) {
      continue;
    }
    if (block.closest(".code-snippet__fix") && block.closest(".code-snippet__fix") !== block) {
      continue;
    }
    seen.add(block);

    for (const idx of Array.from(block.querySelectorAll(".code-snippet__line-index"))) {
      idx.remove();
    }

    const pre = block.querySelector("pre[data-lang]");
    const lang = pre?.getAttribute("data-lang")?.toLowerCase() ?? "";
    const code = extractCodeTextFromElement(block);
    if (!code) {
      continue;
    }

    const placeholder = doc.createElement("p");
    placeholder.textContent = codePlaceholderToken(codeBlocks.length);
    codeBlocks.push({ lang, code });
    block.replaceWith(placeholder);
  }

  // Standalone <pre> blocks (generic blogs, or wechat code not wrapped in code-snippet).
  for (const pre of Array.from(root.querySelectorAll("pre"))) {
    if (!root.contains(pre) || pre.querySelector("img, svg")) {
      continue;
    }
    const code = extractCodeTextFromElement(pre);
    if (!code) {
      continue;
    }
    const lang = pre.getAttribute("data-lang")?.toLowerCase() ?? "";
    const placeholder = doc.createElement("p");
    placeholder.textContent = codePlaceholderToken(codeBlocks.length);
    codeBlocks.push({ lang, code });
    pre.replaceWith(placeholder);
  }

  return codeBlocks;
}

function removeNoise(root: Element): void {
  for (const selector of NOISE_SELECTORS) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      node.remove();
    }
  }
  for (const style of Array.from(root.querySelectorAll("style, script"))) {
    style.remove();
  }
}

export function processWechatContent(root: Element, doc: Document): ProcessedBlocks {
  const { mathBlocks } = extractMathBlocks(root, doc);
  removeNoise(root);
  const codeBlocks = extractCodeBlocks(root, doc);
  return { codeBlocks, mathBlocks };
}

function inlineMathMarkup(latex: string): string {
  return `$${latex.replace(/\$/g, "\\$")}$`;
}

export function restoreCodeBlocks(markdown: string, codeBlocks: CodeBlock[]): string {
  let result = markdown;
  for (let index = 0; index < codeBlocks.length; index += 1) {
    const block = codeBlocks[index];
    const fenced = `\n\`\`\`${block.lang}\n${block.code}\n\`\`\`\n`;
    result = result.split(codePlaceholderToken(index)).join(fenced);
  }
  return result;
}

export function restoreMathBlocks(markdown: string, mathBlocks: MathBlock[]): string {
  let result = markdown;
  for (let index = 0; index < mathBlocks.length; index += 1) {
    const block = mathBlocks[index];
    const latex = block.latex.trim();
    const replacement = block.display ? `\n\n$$\n${latex}\n$$\n\n` : inlineMathMarkup(latex);
    result = result.split(mathPlaceholderToken(index)).join(replacement);
  }
  return result;
}
