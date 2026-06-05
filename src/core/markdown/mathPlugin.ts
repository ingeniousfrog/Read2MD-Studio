import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";
import { texToSvg } from "./mathToSvg";

export function mathPlugin(markdown: MarkdownIt): void {
  markdown.inline.ruler.before("escape", "r2md_math_inline", mathInlineRule);
  markdown.block.ruler.before("fence", "r2md_math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  markdown.renderer.rules.r2md_math_inline = renderInlineMath;
  markdown.renderer.rules.r2md_math_block = renderBlockMath;
}

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== "$" || state.src[state.pos + 1] === "$") {
    return false;
  }

  const closingDelimiter = findClosingInlineDelimiter(state.src, state.pos + 1);

  if (closingDelimiter < 0) {
    return false;
  }

  const content = state.src.slice(state.pos + 1, closingDelimiter);

  if (!content.trim()) {
    return false;
  }

  if (!silent) {
    const token = state.push("r2md_math_inline", "math", 0);
    token.content = content;
    token.markup = "$";
  }

  state.pos = closingDelimiter + 1;
  return true;
}

function mathBlockRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const startPosition = state.bMarks[startLine] + state.tShift[startLine];
  const endPosition = state.eMarks[startLine];
  const firstLine = state.src.slice(startPosition, endPosition);
  const trimmedFirstLine = firstLine.trim();

  if (!trimmedFirstLine.startsWith("$$")) {
    return false;
  }

  if (silent) {
    return true;
  }

  const firstContent = trimmedFirstLine.slice(2);
  const sameLineClosingIndex = firstContent.lastIndexOf("$$");

  if (sameLineClosingIndex >= 0 && firstContent.slice(0, sameLineClosingIndex).trim()) {
    pushBlockToken(state, startLine, startLine + 1, firstContent.slice(0, sameLineClosingIndex));
    return true;
  }

  const lines = [firstContent];
  let nextLine = startLine + 1;
  let foundClosing = false;

  while (nextLine < endLine) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const lineEnd = state.eMarks[nextLine];
    const line = state.src.slice(lineStart, lineEnd);
    const closingIndex = line.indexOf("$$");

    if (closingIndex >= 0) {
      lines.push(line.slice(0, closingIndex));
      foundClosing = true;
      break;
    }

    lines.push(line);
    nextLine += 1;
  }

  if (!foundClosing) {
    return false;
  }

  pushBlockToken(state, startLine, nextLine + 1, lines.join("\n"));
  return true;
}

function pushBlockToken(state: StateBlock, startLine: number, nextLine: number, content: string): void {
  const token = state.push("r2md_math_block", "math", 0);
  token.block = true;
  token.content = content.trim();
  token.markup = "$$";
  token.map = [startLine, nextLine];
  state.line = nextLine;
}

function renderInlineMath(tokens: Token[], index: number): string {
  return renderMath(tokens[index].content, false);
}

function renderBlockMath(tokens: Token[], index: number): string {
  const svg = renderMath(tokens[index].content, true);

  return `<section class="r2md-formula-block">${svg}</section>\n`;
}

function renderMath(content: string, displayMode: boolean): string {
  try {
    const svg = texToSvg(content, { displayMode });

    if (displayMode) {
      return svg;
    }

    return `<span class="r2md-formula-inline">${svg}</span>`;
  } catch {
    const escaped = escapeHtml(content);

    return displayMode
      ? `<section class="r2md-formula-block r2md-formula-error">$$ ${escaped} $$</section>`
      : `<span class="r2md-formula-inline r2md-formula-error">$ ${escaped} $</span>`;
  }
}

function findClosingInlineDelimiter(source: string, start: number): number {
  let index = start;

  while (index < source.length) {
    index = source.indexOf("$", index);

    if (index < 0) {
      return -1;
    }

    if (source[index - 1] !== "\\") {
      return index;
    }

    index += 1;
  }

  return -1;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
