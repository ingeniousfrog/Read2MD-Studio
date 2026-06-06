import { useEffect, useState } from "react";
import { AiModal } from "./components/AiModal";
import { DocumentList } from "./components/DocumentList";
import { EditorPane } from "./components/EditorPane";
import { PreviewPane } from "./components/PreviewPane";
import { SettingsModal } from "./components/SettingsModal";
import { Toolbar } from "./components/Toolbar";
import { WorkspaceSplit } from "./components/WorkspaceSplit";
import { resolveMarkdownAssetUrls } from "./core/assets/resolveAssets";
import { renderMarkdown } from "./core/markdown/renderMarkdown";
import { getActiveTheme } from "./core/theme/themes";
import { useEditorStore } from "./store/editorStore";

const SIDEBAR_COLLAPSED_KEY = "r2md-sidebar-collapsed";

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  const markdown = useEditorStore((state) => state.markdown);
  const activeDocId = useEditorStore((state) => state.activeDocId);
  const themeId = useEditorStore((state) => state.themeId);
  const customThemeTokens = useEditorStore((state) => state.customThemeTokens);
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const setThemeId = useEditorStore((state) => state.setThemeId);
  const [previewMarkdown, setPreviewMarkdown] = useState(markdown);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveMarkdownAssetUrls(activeDocId, markdown);
        if (!cancelled) {
          setPreviewMarkdown(resolved);
        }
      } catch {
        if (!cancelled) {
          setPreviewMarkdown(markdown);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeDocId, markdown]);

  const rendered = renderMarkdown({
    markdown: previewMarkdown,
  });
  const activeTheme = getActiveTheme(themeId, customThemeTokens, customThemeName);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="app-shell">
      <Toolbar markdownValue={markdown} />
      <main className="workspace">
        <DocumentList collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        <WorkspaceSplit
          left={<EditorPane markdownValue={markdown} onMarkdownChange={setMarkdown} />}
          right={
            <PreviewPane
              rawHtml={rendered.rawHtml}
              theme={activeTheme}
              themeId={themeId}
              onThemeChange={setThemeId}
            />
          }
        />
      </main>
      <AiModal />
      <SettingsModal />
    </div>
  );
}

export default App;
