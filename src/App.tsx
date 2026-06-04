import { EditorPane } from "./components/EditorPane";
import { PreviewPane } from "./components/PreviewPane";
import { Toolbar } from "./components/Toolbar";
import { renderMarkdown } from "./core/markdown/renderMarkdown";
import { getThemeById } from "./core/theme/themes";
import { useEditorStore } from "./store/editorStore";

function App() {
  const markdown = useEditorStore((state) => state.markdown);
  const themeId = useEditorStore((state) => state.themeId);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const setThemeId = useEditorStore((state) => state.setThemeId);

  const rendered = renderMarkdown({
    markdown,
  });
  const activeTheme = getThemeById(themeId);

  return (
    <div className="app-shell">
      <Toolbar markdownValue={markdown} themeId={themeId} onThemeChange={setThemeId} />
      <main className="workspace">
        <EditorPane markdownValue={markdown} onMarkdownChange={setMarkdown} />
        <PreviewPane rawHtml={rendered.rawHtml} theme={activeTheme} />
      </main>
    </div>
  );
}

export default App;
