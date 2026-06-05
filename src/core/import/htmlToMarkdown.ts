import { Sitdown } from "sitdown";
import type { CodeBlock, MathBlock } from "./wechatContentProcessor";
import { restoreCodeBlocks, restoreMathBlocks } from "./wechatContentProcessor";

let sitdownService: Sitdown | null = null;

function getSitdownService(): Sitdown {
  if (!sitdownService) {
    sitdownService = new Sitdown({
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      hr: "---",
      keepFilter: [],
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
  // Repair the placeholder-only output first so the cleanup regexes never
  // touch restored code/formula content.
  let body = repairMarkdown(service.HTMLToMD(contentHtml));
  body = restoreCodeBlocks(body, codeBlocks);
  body = restoreMathBlocks(body, mathBlocks);
  body = collapseBlankLinesOutsideCode(body);

  if (!title) {
    return body;
  }

  const heading = `# ${title.trim()}`;
  return body ? `${heading}\n\n${body}` : heading;
}
