import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { mathPlugin } from "./mathPlugin";

export interface RenderMarkdownInput {
  markdown: string;
}

export interface RenderMarkdownOutput {
  rawHtml: string;
  warnings: string[];
}

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (code, language): string => {
    const escapedCode = escapeHtml(code);

    if (language === "mermaid") {
      return `<code class="language-mermaid">${escapedCode}</code>`;
    }

    if (!language) {
      return `<pre><code class="hljs">${escapedCode}</code></pre>`;
    }

    if (!hljs.getLanguage(language)) {
      return `<pre><code class="hljs">${escapedCode}</code></pre>`;
    }

    try {
      const highlighted = hljs.highlight(code, {
        language,
        ignoreIllegals: true,
      }).value;

      return `<pre><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>`;
    } catch {
      return `<pre><code class="hljs">${escapedCode}</code></pre>`;
    }
  },
});

const defaultTableOpen =
  markdown.renderer.rules.table_open ??
  ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));
const defaultTableClose =
  markdown.renderer.rules.table_close ??
  ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));

markdown.renderer.rules.table_open = (tokens, index, options, _environment, renderer): string =>
  `<div class="r2md-table-scroll">${defaultTableOpen(tokens, index, options, _environment, renderer)}`;
markdown.renderer.rules.table_close = (tokens, index, options, _environment, renderer): string =>
  `${defaultTableClose(tokens, index, options, _environment, renderer)}</div>`;

markdown.use(mathPlugin);

const defaultFenceRule =
  markdown.renderer.rules.fence ??
  ((tokens, index, options, _environment, renderer) =>
    renderer.renderToken(tokens, index, options));

markdown.renderer.rules.fence = (tokens, index, options, environment, renderer): string => {
  const token = tokens[index];
  const language = token.info.trim().split(/\s+/g)[0]?.toLowerCase();

  if (language === "mermaid") {
    return `<pre class="r2md-mermaid-pending"><code class="language-mermaid">${escapeHtml(token.content.trim())}</code></pre>\n`;
  }

  return defaultFenceRule(tokens, index, options, environment, renderer);
};

const BARE_MERMAID_BLOCK =
  /(?:^|\n)((?:flowchart|graph)\s+(?:TD|TB|BT|RL|LR)\b[\s\S]*?)(?=\n{2,}|$)/i;

function normalizeMermaidFences(markdown: string): string {
  if (/```\s*mermaid/i.test(markdown)) {
    return markdown;
  }

  const match = markdown.match(BARE_MERMAID_BLOCK);
  if (!match) {
    return markdown;
  }

  const block = match[1].trim();
  if (!block) {
    return markdown;
  }

  return markdown.replace(match[1], `\`\`\`mermaid\n${block}\n\`\`\``);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(input: RenderMarkdownInput): RenderMarkdownOutput {
  const normalized = normalizeMermaidFences(input.markdown);
  const rawHtml = markdown.render(normalized);

  return {
    rawHtml,
    warnings: [],
  };
}
