import { useEffect, useRef } from "react";
import { isAiAvailable } from "../core/ai/codexClient";
import { renderMermaidBlocks } from "../core/markdown/renderMermaid";
import { applyThemeHtml } from "../core/theme/applyTheme";
import type { ThemeDefinition, ThemeId } from "../core/theme/themes";
import { useAiStore } from "../store/aiStore";
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
  const openAiPanel = useAiStore((state) => state.openAiPanel);
  const aiRunning = useAiStore((state) => state.running);
  const previewRef = useRef<HTMLDivElement>(null);
  const aiAvailable = isAiAvailable();

  const themed = applyThemeHtml({
    rawHtml,
    theme,
  });

  useEffect(() => {
    const container = previewRef.current;
    if (!container) {
      return;
    }
    void renderMermaidBlocks(container);
  }, [themed.html]);

  return (
    <section className="pane preview-pane" aria-label="Article preview">
      <div className="pane-header">
        <span>Preview</span>
        <div className="preview-header-actions">
          <button
            type="button"
            className={`preview-ai-button${aiRunning ? " is-running" : ""}`}
            title={aiAvailable ? "AI 助手" : "AI 助手（仅桌面端）"}
            disabled={!aiAvailable}
            onClick={openAiPanel}
          >
            {aiRunning && <span className="preview-ai-dot" aria-hidden />}
            AI 助手
          </button>
          <ThemeSelector themeId={themeId} onThemeChange={onThemeChange} />
          <button type="button" className="theme-panel-toggle" onClick={toggleThemePanel}>
            {isThemePanelOpen ? "收起配置" : "展开配置"}
          </button>
        </div>
      </div>
      <div className="preview-layout">
        <div className="preview-scroll">
          <style>{themed.css}</style>
          <div
            ref={previewRef}
            className="preview-sheet"
            dangerouslySetInnerHTML={{ __html: themed.html }}
          />
        </div>
        <ThemePanel themeId={themeId} onThemeChange={onThemeChange} />
      </div>
    </section>
  );
}
