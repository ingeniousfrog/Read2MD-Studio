import { useState } from "react";
import { copyHtml } from "../core/copy/copyHtml";
import { buildWechatOutput } from "../core/platform/wechatAdapter";
import { renderMarkdown } from "../core/markdown/renderMarkdown";
import { getActiveTheme, type ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";
import { ThemeActions } from "./ThemeActions";
import { ThemeSelector } from "./ThemeSelector";

interface ToolbarProps {
  markdownValue: string;
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export function Toolbar({ markdownValue, themeId, onThemeChange }: ToolbarProps) {
  const copyStatus = useEditorStore((state) => state.copyStatus);
  const statusMessage = useEditorStore((state) => state.statusMessage);
  const warnings = useEditorStore((state) => state.warnings);
  const customThemeTokens = useEditorStore((state) => state.customThemeTokens);
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const setCopyStatus = useEditorStore((state) => state.setCopyStatus);
  const setWarnings = useEditorStore((state) => state.setWarnings);
  const [copyDialog, setCopyDialog] = useState<{
    title: string;
    message: string;
    warnings: string[];
    tone: "success" | "error";
  } | null>(null);

  const handleCopyWechat = async () => {
    setCopyStatus("copying", "正在生成公众号 HTML...");

    try {
      const rendered = renderMarkdown({
        markdown: markdownValue,
      });
      const output = await buildWechatOutput({
        rawHtml: rendered.rawHtml,
        theme: getActiveTheme(themeId, customThemeTokens, customThemeName),
        warnings: rendered.warnings,
      });
      const result = await copyHtml(output);
      const hasWarnings = output.warnings.length > 0;
      const resultTitle = result.ok ? (hasWarnings ? "已复制，但有兼容提醒" : "复制成功") : "复制失败";
      const resultMessage =
        result.ok && hasWarnings ? `${result.message} 请查看下方兼容提醒。` : result.message;

      setWarnings(output.warnings);
      setCopyStatus(result.ok ? "success" : "error", resultMessage);
      setCopyDialog({
        title: resultTitle,
        message: resultMessage,
        warnings: output.warnings,
        tone: result.ok ? "success" : "error",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "复制失败，请检查浏览器权限。";
      setWarnings([message]);
      setCopyStatus("error", message);
      setCopyDialog({
        title: "复制失败",
        message,
        warnings: [message],
        tone: "error",
      });
    }
  };

  return (
    <header className="toolbar">
      <div className="brand-block">
        <p className="eyebrow">Read2MD Studio</p>
        <h1>Markdown Publishing Workbench</h1>
      </div>
      <div className="toolbar-actions">
        <ThemeSelector themeId={themeId} onThemeChange={onThemeChange} />
        <ThemeActions themeId={themeId} />
        <button className="copy-button" type="button" onClick={handleCopyWechat} disabled={copyStatus === "copying"}>
          {copyStatus === "copying" ? "Copying..." : "Copy for WeChat"}
        </button>
      </div>
      {!copyDialog && (
        <>
          <div className={`status-line status-${copyStatus}`} role="status">
            {statusMessage}
          </div>
          {warnings.length > 0 && (
            <div className="warning-line">
              {warnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          )}
        </>
      )}
      {copyDialog && (
        <div className="copy-dialog-backdrop" role="presentation">
          <div className={`copy-dialog copy-dialog-${copyDialog.tone}`} role="alertdialog" aria-modal="true">
            <div className="copy-dialog-header">
              <h2>{copyDialog.title}</h2>
              <button type="button" aria-label="关闭复制结果" onClick={() => setCopyDialog(null)}>
                ×
              </button>
            </div>
            <p>{copyDialog.message}</p>
            {copyDialog.warnings.length > 0 && (
              <ul>
                {copyDialog.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
