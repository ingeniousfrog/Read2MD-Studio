# Read2MD-Studio

Read2MD-Studio is a lightweight Markdown publishing workspace for writing, styling, previewing, and copying platform-friendly article HTML.

The current MVP focuses on one clean workflow:

Markdown editing -> live preview -> theme styling -> WeChat-ready inline HTML -> clipboard

It is intentionally small. There is no backend, login, image hosting, article management, Rust, or WASM in this first version. The TypeScript core is split into clear modules so the rendering, theme, and platform layers can later be replaced by Rust/WASM implementations.

## Features

- Markdown editor powered by CodeMirror 6
- Live preview rendered with `markdown-it`
- Code block highlighting with `highlight.js`
- Three built-in article themes:
  - `clean`
  - `tech`
  - `wechat-card`
- WeChat copy flow using `juice` to inline CSS
- HTML cleanup with DOMPurify
- Draft and theme autosave in `localStorage`
- Zustand store for editor state

## Project Structure

```text
src/
  App.tsx
  main.tsx
  components/
    EditorPane.tsx
    PreviewPane.tsx
    Toolbar.tsx
    ThemeSelector.tsx
  core/
    markdown/
      renderMarkdown.ts
    theme/
      themes.ts
      applyTheme.ts
    platform/
      commonAdapter.ts
      wechatAdapter.ts
    copy/
      copyHtml.ts
  fixtures/
    sampleMarkdown.ts
  store/
    editorStore.ts
  styles/
    globals.css
```

The React components only compose the UI and call the core interfaces. Markdown rendering, theme wrapping, WeChat adaptation, HTML cleanup, CSS inlining, and clipboard writing stay outside component code.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## How To Use

1. Write or paste Markdown in the left editor.
2. Check the rendered article in the right preview pane.
3. Choose a theme from the toolbar.
4. Click `Copy for WeChat`.
5. Paste into the WeChat public account editor or another rich-text editor.

The preview pane uses normal browser HTML and scoped theme CSS. The copy button does not copy the preview DOM directly. It rebuilds the article output, inlines the selected theme CSS, sanitizes the result, extracts plain text from the final HTML, and writes both `text/html` and `text/plain` to the clipboard when the browser supports it.

## Core Flow

1. `renderMarkdown` converts Markdown to raw HTML with `markdown-it`.
2. `applyThemeHtml` wraps the raw HTML in `.r2md-article` and attaches theme CSS.
3. `buildWechatOutput` generates WeChat output:
   - apply theme wrapper
   - inline CSS with `juice`
   - sanitize HTML with DOMPurify
   - extract `plainText` from the sanitized HTML
4. `copyHtml` writes HTML and plain text to the clipboard.

## Current Limitations

- No image upload or image hosting
- No formula rendering or formula-to-image conversion
- No Zhihu or Juejin copy adapters yet
- No backend API
- No authentication
- No article library or version history
- No Rust/WASM implementation yet

Future Rust-oriented boundaries are already represented by the TypeScript modules:

- `core/markdown` can become `md_core`
- `core/theme` can become `md_theme`
- `core/platform` can become `md_platform`
- a future `md_wasm` package can expose those modules to the web app
- a future `md_cli` can reuse the same conversion ideas for batch workflows
