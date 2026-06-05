# Read2MD-Studio

Read2MD-Studio is a lightweight Markdown publishing workspace for writing, styling, previewing, and copying platform-friendly article HTML.

The current MVP focuses on one clean workflow:

Markdown editing -> live preview -> theme styling -> WeChat-ready inline HTML -> clipboard

The TypeScript core is split into clear modules so the rendering, theme, and platform layers can evolve independently. A Tauri desktop build is also available for local installation.

## Features

- Markdown editor powered by CodeMirror 6
- Live preview rendered with `markdown-it`
- Math formula rendering (MathJax SVG)
- Code block highlighting with `highlight.js`
- Three built-in article themes plus custom theme editor:
  - `clean`
  - `tech`
  - `wechat-card`
- Tabbed theme panel: headings (H1/H2/H3), formulas, code blocks, images, quotes/tables
- URL import for WeChat articles and generic web pages
- Multi-document library with local persistence
- WeChat copy flow using `juice` to inline CSS
- HTML cleanup with DOMPurify
- Draft and theme autosave in `localStorage`
- Zustand store for editor state
- macOS desktop app (`.dmg`) via Tauri

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

## Desktop App (Tauri)

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (1.77+)
- Xcode Command Line Tools (macOS): `xcode-select --install`

### Development

```bash
npm run tauri:dev
```

This starts the Vite dev server and opens the app in a native window. URL import uses the Tauri HTTP plugin in desktop mode and the Vite dev proxy in browser mode.

### Build macOS `.dmg`

```bash
npm run tauri:build
```

Output:

```text
src-tauri/target/release/bundle/dmg/Read2MD-Studio_0.1.0_aarch64.dmg
```

On first launch, unsigned builds may require right-click → Open to bypass Gatekeeper. If the app bounces in the dock and quits immediately, rebuild with `npm run tauri:build` after pulling the latest fixes.

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
- No Zhihu or Juejin copy adapters yet
- No cloud sync or authentication
- Desktop `.dmg` is unsigned (no notarization)
- WeChat import may hit environment verification on some networks
