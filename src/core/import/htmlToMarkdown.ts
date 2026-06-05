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
  body = collapseBlankLinesOutsideCode(body);

  if (!title) {
    return body;
  }

  const heading = `# ${title.trim()}`;
  return body ? `${heading}\n\n${body}` : heading;
}
