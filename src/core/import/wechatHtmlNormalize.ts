const PRESERVE_CLASS = "r2md-keep";

function parseFontSizePx(style: string): number | null {
  const match = /font-size:\s*([\d.]+)\s*px/i.exec(style);
  return match ? Number(match[1]) : null;
}

function combinedStyle(element: Element): string {
  const styles: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName !== "DIV" && styles.join().length < 2000) {
    const style = current.getAttribute("style");
    if (style) {
      styles.push(style);
    }
    current = current.parentElement;
  }
  return styles.join(";");
}

function hasTransform(style: string): boolean {
  const withoutTextTransform = style.replace(/text-transform\s*:[^;]*/gi, "");
  return /(?:^|;)transform\s*:/i.test(withoutTextTransform.replace(/\s+/g, ""));
}

function hasFlexLayout(style: string): boolean {
  return /display\s*:\s*flex/i.test(style);
}

function isHiddenElement(element: Element): boolean {
  const style = (element.getAttribute("style") ?? "").replace(/\s+/g, "").toLowerCase();
  return style.includes("visibility:hidden") || style.includes("opacity:0");
}

function compactText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, "").trim();
}

function maxFontSizeInSubtree(element: Element): number {
  let max = parseFontSizePx(element.getAttribute("style") ?? "") ?? 0;
  for (const node of element.querySelectorAll("[style*='font-size']")) {
    const size = parseFontSizePx(node.getAttribute("style") ?? "");
    if (size && size > max) {
      max = size;
    }
  }
  return max;
}

function isTextOnlySpan(span: Element): boolean {
  return Array.from(span.childNodes).every(
    (node) =>
      node.nodeType === Node.TEXT_NODE ||
      (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "BR"),
  );
}

function isWechatStatParagraph(element: Element): boolean {
  if (element.tagName !== "P") {
    return false;
  }
  return !!element.querySelector('span[style*="inline-block"][style*="border-radius"]');
}

function hasAccentStyle(style: string): boolean {
  const normalized = style.replace(/\s+/g, "").toLowerCase();
  return normalized.includes("border-left") || normalized.includes("background");
}

function removeHiddenSubtrees(root: Element): void {
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    if (isHiddenElement(element)) {
      element.remove();
    }
  }
}

function removeDecorativeSingleCharParagraphs(root: Element): void {
  for (const paragraph of Array.from(root.querySelectorAll("p"))) {
    const text = paragraph.textContent?.trim() ?? "";
    if (text.length !== 1 || /^\d$/.test(text)) {
      continue;
    }

    const style = combinedStyle(paragraph);
    const maxFontSize = maxFontSizeInSubtree(paragraph.closest("section") ?? paragraph);

    if (
      hasTransform(style) ||
      maxFontSize >= 36 ||
      (hasFlexLayout(style) && /[\u4e00-\u9fff]/.test(text))
    ) {
      paragraph.remove();
    }
  }
}

function removeWordCloudSections(root: Element): void {
  for (const section of Array.from(root.querySelectorAll("section"))) {
    if (section.classList.contains(PRESERVE_CLASS)) {
      continue;
    }
    if (!section.querySelector("[style*='text-shadow']")) {
      continue;
    }
    const paragraphLengths = Array.from(section.querySelectorAll("p")).map((paragraph) =>
      compactText(paragraph).length,
    );
    const longestParagraph = paragraphLengths.length > 0 ? Math.max(...paragraphLengths) : 0;
    if (longestParagraph <= 40 && compactText(section).length <= 220) {
      section.remove();
    }
  }
}

function convertFlexNumberedRows(root: Element): void {
  const candidates: Element[] = [];

  for (const row of Array.from(root.querySelectorAll("section"))) {
    if (!hasFlexLayout(row.getAttribute("style") ?? "")) {
      continue;
    }

    const columns = Array.from(row.children).filter((child) => child.tagName === "SECTION");
    if (columns.length !== 2) {
      continue;
    }

    const marker = compactText(columns[0]);
    const body = compactText(columns[1]);
    if (/^[1-9]\d*$/.test(marker) && body.length >= 4) {
      candidates.push(row);
    }
  }

  let index = 0;
  while (index < candidates.length) {
    const group: Element[] = [candidates[index]];
    index += 1;

    while (
      index < candidates.length &&
      candidates[index].previousElementSibling === group[group.length - 1]
    ) {
      group.push(candidates[index]);
      index += 1;
    }

    const list = root.ownerDocument.createElement("ol");
    group[0].before(list);

    for (const row of group) {
      const columns = Array.from(row.children).filter((child) => child.tagName === "SECTION");
      const item = root.ownerDocument.createElement("li");
      item.textContent = columns[1]?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      list.appendChild(item);
      row.remove();
    }
  }
}

function removeDecorativeLayoutSections(root: Element): void {
  for (const section of Array.from(root.querySelectorAll("section"))) {
    if (section.classList.contains(PRESERVE_CLASS)) {
      continue;
    }
    if (section.closest("li, td, th, figcaption, blockquote, h1, h2, h3, h4")) {
      continue;
    }

    const textLength = compactText(section).length;
    const style = combinedStyle(section);
    const maxFontSize = maxFontSizeInSubtree(section);
    const transformed = hasTransform(style);
    const flexLayout = hasFlexLayout(style);

    const isShortDecorativeBlock =
      textLength > 0 &&
      textLength <= 24 &&
      (transformed || maxFontSize >= 36 || (flexLayout && textLength <= 12));

    const isEmptyLayoutShell =
      textLength === 0 &&
      (transformed || flexLayout) &&
      !section.querySelector("img, video, iframe, table, pre, code, svg");

    if (isShortDecorativeBlock || isEmptyLayoutShell) {
      section.remove();
    }
  }
}

function unwrapRedundantSections(root: Element): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const section of Array.from(root.querySelectorAll("section"))) {
      if (section.classList.contains(PRESERVE_CLASS)) {
        continue;
      }

      const meaningful = Array.from(section.childNodes).filter((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return (node.textContent?.trim().length ?? 0) > 0;
        }
        return true;
      });

      if (
        meaningful.length === 1 &&
        meaningful[0].nodeType === Node.ELEMENT_NODE &&
        (meaningful[0] as Element).tagName === "SECTION"
      ) {
        const child = meaningful[0] as Element;
        while (child.firstChild) {
          section.insertBefore(child.firstChild, child);
        }
        child.remove();
        changed = true;
      }
    }
  }
}

function removeEmptyTables(root: Element): void {
  for (const table of Array.from(root.querySelectorAll("table"))) {
    if (table.rows.length === 0) {
      table.remove();
    }
  }
}

function flattenTableCells(root: Element): void {
  for (const cell of root.querySelectorAll("th, td")) {
    const text = cell.textContent.replace(/\s+/g, " ").trim();
    cell.textContent = text;
  }
}

function unwrapLeafSpans(root: Element): void {
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (const span of Array.from(root.querySelectorAll("span"))) {
      const style = span.getAttribute("style") ?? "";
      const isBadge = style.includes("inline-block") && style.includes("border-radius");
      if (isBadge) {
        continue;
      }
      if (!isTextOnlySpan(span)) {
        continue;
      }
      span.replaceWith(span.ownerDocument.createTextNode(span.textContent ?? ""));
      changed = true;
    }
    if (!changed) {
      break;
    }
  }
}

function groupSiblingStatParagraphs(root: Element): void {
  const nodes = Array.from(root.childNodes);
  let group: Element[] = [];

  const flush = () => {
    if (group.length === 0) {
      return;
    }
    const wrapper = root.ownerDocument.createElement("div");
    wrapper.className = `${PRESERVE_CLASS} r2md-wechat-stats`;
    group[0].before(wrapper);
    for (const node of group) {
      wrapper.appendChild(node);
    }
    group = [];
  };

  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE && isWechatStatParagraph(node as Element)) {
      group.push(node as Element);
      continue;
    }
    flush();
  }

  flush();
}

function preserveStyledHeadings(root: Element): void {
  for (const heading of Array.from(root.querySelectorAll("h2, h3, h4"))) {
    if (heading.closest(`.${PRESERVE_CLASS}`)) {
      continue;
    }
    const style = heading.getAttribute("style") ?? "";
    if (!style.includes("border-left")) {
      continue;
    }
    const wrapper = root.ownerDocument.createElement("div");
    wrapper.className = `${PRESERVE_CLASS} r2md-wechat-heading`;
    heading.replaceWith(wrapper);
    wrapper.appendChild(heading);
  }
}

function preserveStyledBlockquotes(root: Element): void {
  for (const blockquote of Array.from(root.querySelectorAll("blockquote"))) {
    if (blockquote.closest(`.${PRESERVE_CLASS}`)) {
      continue;
    }
    const style = blockquote.getAttribute("style") ?? "";
    if (!hasAccentStyle(style)) {
      continue;
    }
    blockquote.removeAttribute("style");
    for (const node of Array.from(blockquote.querySelectorAll("[style]"))) {
      node.removeAttribute("style");
    }
  }
}

function walkAndGroupStats(root: Element): void {
  groupSiblingStatParagraphs(root);
  for (const child of Array.from(root.children)) {
    if (child.classList.contains(PRESERVE_CLASS)) {
      continue;
    }
    walkAndGroupStats(child);
  }
}

type NormalizeStep = (root: Element) => void;

const NORMALIZE_STEPS: NormalizeStep[] = [
  removeHiddenSubtrees,
  convertFlexNumberedRows,
  removeDecorativeLayoutSections,
  removeWordCloudSections,
  removeDecorativeSingleCharParagraphs,
  unwrapRedundantSections,
  removeEmptyTables,
  flattenTableCells,
  unwrapLeafSpans,
  walkAndGroupStats,
  preserveStyledHeadings,
  preserveStyledBlockquotes,
];

export function normalizeWechatHtmlForMarkdown(html: string): string {
  const document = new DOMParser().parseFromString(`<div id="r2md-root">${html}</div>`, "text/html");
  const root = document.getElementById("r2md-root");
  if (!root) {
    return html;
  }

  for (const step of NORMALIZE_STEPS) {
    step(root);
  }

  return root.innerHTML;
}

export function isPreservedWechatHtmlNode(node: unknown): boolean {
  return node instanceof Element && node.classList.contains(PRESERVE_CLASS);
}
