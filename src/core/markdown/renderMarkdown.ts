import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

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
