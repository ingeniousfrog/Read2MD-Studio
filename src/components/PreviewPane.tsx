import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { isAiAvailable } from "../core/ai/codexClient";
import {
  hasPendingMermaidBlocks,
  renderMermaidBlocksWithRetry,
} from "../core/markdown/renderMermaid";
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
  const { t } = useTranslation();
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

  useLayoutEffect(() => {
    const container = previewRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    const scheduleRender = async () => {
      await renderMermaidBlocksWithRetry(container);
      if (cancelled || !container.isConnected) {
        return;
      }

      if (hasPendingMermaidBlocks(container)) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 200);
        });
        if (!cancelled && container.isConnected) {
          await renderMermaidBlocksWithRetry(container);
        }
      }
    };

    void scheduleRender();

    return () => {
      cancelled = true;
    };
  }, [themed.html, rawHtml]);

  return (
    <section className="pane preview-pane" aria-label={t("common.preview")}>
      <div className="pane-header">
        <span>{t("common.preview")}</span>
        <div className="preview-header-actions">
          <button
            type="button"
            className={`preview-ai-button${aiRunning ? " is-running" : ""}`}
            title={aiAvailable ? t("preview.aiAssistant") : t("preview.aiAssistantDesktopOnly")}
            disabled={!aiAvailable}
            onClick={openAiPanel}
          >
            {aiRunning && <span className="preview-ai-dot" aria-hidden />}
            {t("preview.aiAssistant")}
          </button>
          <ThemeSelector themeId={themeId} onThemeChange={onThemeChange} />
          <button type="button" className="theme-panel-toggle" onClick={toggleThemePanel}>
            {isThemePanelOpen ? t("preview.collapseTheme") : t("preview.expandTheme")}
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
