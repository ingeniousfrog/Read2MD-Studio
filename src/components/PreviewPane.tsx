import { applyThemeHtml } from "../core/theme/applyTheme";
import type { ThemeDefinition, ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";
import { ThemePanel } from "./ThemePanel";
import { ThemeSelector } from "./ThemeSelector";

interface PreviewPaneProps {
  rawHtml: string;
  theme: ThemeDefinition;
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export function PreviewPane({ rawHtml, theme, themeId, onThemeChange }: PreviewPaneProps) {
  const toggleThemePanel = useEditorStore((state) => state.toggleThemePanel);
  const isThemePanelOpen = useEditorStore((state) => state.isThemePanelOpen);

  const themed = applyThemeHtml({
    rawHtml,
    theme,
  });

  return (
    <section className="pane preview-pane" aria-label="Article preview">
      <div className="pane-header">
        <span>Preview</span>
        <div className="preview-header-actions">
          <ThemeSelector themeId={themeId} onThemeChange={onThemeChange} />
          <button type="button" className="theme-panel-toggle" onClick={toggleThemePanel}>
            {isThemePanelOpen ? "收起配置" : "展开配置"}
          </button>
        </div>
      </div>
      <div className="preview-layout">
        <div className="preview-scroll">
          <style>{themed.css}</style>
          <div className="preview-sheet" dangerouslySetInnerHTML={{ __html: themed.html }} />
        </div>
        <ThemePanel themeId={themeId} onThemeChange={onThemeChange} />
      </div>
    </section>
  );
}
