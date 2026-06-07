import { Sitdown } from "sitdown";
import type { CodeBlock, MathBlock } from "./wechatContentProcessor";
import { restoreCodeBlocks, restoreMathBlocks } from "./wechatContentProcessor";
import { isPreservedWechatHtmlNode, normalizeWechatHtmlForMarkdown } from "./wechatHtmlNormalize";

function sanitizeHtmlForMarkdownConversion(html: string): string {
  return normalizeWechatHtmlForMarkdown(html);
}

let sitdownService: Sitdown | null = null;

function getSitdownService(): Sitdown {
  if (!sitdownService) {
    sitdownService = new Sitdown({
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      hr: "---",
      keepFilter: (node) => isPreservedWechatHtmlNode(node),
    });
  }

  return sitdownService;
}

function repairMarkdown(markdown: string): string {
  return markdown
    .replace(/^\s*[*+-]\s*$/gm, "")
    .replace(/^\s*`{1,2}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeDecorativeHeadingLines(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => {
      const match = /^##\s+\*{0,2}(.+?)\*{0,2}$/.exec(line.trim());
      if (!match) {
        return true;
      }
      const text = match[1].trim();
      return text.length > 10 || /[。！？；，]/.test(text);
    })
    .join("\n");
}

function removeSparseDecorativeLines(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return true;
      }
      const compact = trimmed.replace(/\s+/g, "");
      if (compact.length <= 12 && trimmed.length - compact.length >= 8) {
        return false;
      }
      return true;
    })
    .join("\n");
}
/** Remove decorative single-character lines left from WeChat flex/rotated banners. */
function removeStandaloneSingleCharLines(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length !== 1) {
        return true;
      }
      return !/[\u4e00-\u9fffA-Za-z0-9]/.test(trimmed);
    })
    .join("\n");
}

/** Turn `**1**` followed by body text into ordered list items. */
function repairBoldNumberedItems(markdown: string): string {
  return markdown.replace(/\n\*\*(\d+)\*\*\n+([^\n#*`>-][^\n]*)/g, "\n\n$1. $2");
}

function repairOrphanBoldMarkers(markdown: string): string {
  return markdown
    .replace(/^\*\*\s*$/gm, "")
    .replace(/^##\s+(.+)\n+\*\*\s*$/gm, "## $1");
}

/** Collapse blank lines inside GFM table rows caused by block-level cell content. */
function repairMarkdownTables(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed.startsWith("|")) {
      result.push(line);
      index += 1;
      continue;
    }

    let row = trimmed;
    index += 1;

    while (index < lines.length) {
      const next = lines[index].trim();
      if (next === "") {
        index += 1;
        continue;
      }
      if (next.startsWith("|") && next.endsWith("|") && next.slice(1, -1).includes("|")) {
        break;
      }
      if (next.startsWith("|") || /^:?-{3,}:?$/.test(next.replace(/\|/g, "").trim())) {
        row += ` ${next.replace(/^\|/, "").replace(/\|$/, "").trim()}`;
        index += 1;
        continue;
      }
      break;
    }

    result.push(row.replace(/\s{2,}/g, " ").replace(/ \| \| /g, " | "));
  }

  return result.join("\n");
}

/** Collapse 3+ newlines to 2, but only outside fenced code blocks. */
function collapseBlankLinesOutsideCode(markdown: string): string {
  const segments = markdown.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment, index) =>
      index % 2 === 1 ? segment : segment.replace(/\n{3,}/g, "\n\n"),
    )
    .join("")
    .trim();
}

export function htmlToMarkdown(
  contentHtml: string,
  title?: string,
  codeBlocks: CodeBlock[] = [],
  mathBlocks: MathBlock[] = [],
): string {
  const service = getSitdownService();
  const safeHtml = sanitizeHtmlForMarkdownConversion(contentHtml);
  let body = repairMarkdown(service.HTMLToMD(safeHtml));
  body = repairMarkdownTables(body);
  body = restoreCodeBlocks(body, codeBlocks);
  body = restoreMathBlocks(body, mathBlocks);
  body = repairBoldNumberedItems(body);
  body = repairOrphanBoldMarkers(body);
  body = removeDecorativeHeadingLines(body);
  body = removeSparseDecorativeLines(body);
  body = removeStandaloneSingleCharLines(body);
  body = collapseBlankLinesOutsideCode(body);

  if (!title) {
    return body;
  }

  const heading = `# ${title.trim()}`;
  return body ? `${heading}\n\n${body}` : heading;
}
