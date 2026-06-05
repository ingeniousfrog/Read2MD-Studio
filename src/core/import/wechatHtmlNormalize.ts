const PRESERVE_CLASS = "r2md-keep";

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
  for (const span of Array.from(root.querySelectorAll("span"))) {
    const style = span.getAttribute("style") ?? "";
    const isBadge = style.includes("inline-block") && style.includes("border-radius");
    if (isBadge) {
      continue;
    }
    if (style && !span.hasAttribute("leaf")) {
      continue;
    }
    if (span.children.length > 0 && !span.hasAttribute("leaf")) {
      continue;
    }
    span.replaceWith(span.ownerDocument.createTextNode(span.textContent ?? ""));
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
    const wrapper = root.ownerDocument.createElement("div");
    wrapper.className = `${PRESERVE_CLASS} r2md-wechat-callout`;
    blockquote.replaceWith(wrapper);
    wrapper.appendChild(blockquote);
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

export function normalizeWechatHtmlForMarkdown(html: string): string {
  const document = new DOMParser().parseFromString(`<div id="r2md-root">${html}</div>`, "text/html");
  const root = document.getElementById("r2md-root");
  if (!root) {
    return html;
  }

  removeEmptyTables(root);
  flattenTableCells(root);
  unwrapLeafSpans(root);
  walkAndGroupStats(root);
  preserveStyledHeadings(root);
  preserveStyledBlockquotes(root);

  return root.innerHTML;
}

export function isPreservedWechatHtmlNode(node: unknown): boolean {
  return node instanceof Element && node.classList.contains(PRESERVE_CLASS);
}
