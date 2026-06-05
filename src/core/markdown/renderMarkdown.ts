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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(input: RenderMarkdownInput): RenderMarkdownOutput {
  const rawHtml = markdown.render(input.markdown);

  return {
    rawHtml,
    warnings: [],
  };
}
