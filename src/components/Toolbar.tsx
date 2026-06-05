import { useState } from "react";
import { BrandLogo, BrandWordmark } from "./BrandLogo";
import { copyHtml } from "../core/copy/copyHtml";
import { buildWechatOutput } from "../core/platform/wechatAdapter";
import { renderMarkdown } from "../core/markdown/renderMarkdown";
import { getActiveTheme } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";

interface ToolbarProps {
  markdownValue: string;
}

export function Toolbar({ markdownValue }: ToolbarProps) {
  const themeId = useEditorStore((state) => state.themeId);
  const customThemeTokens = useEditorStore((state) => state.customThemeTokens);
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const copyStatus = useEditorStore((state) => state.copyStatus);
  const statusMessage = useEditorStore((state) => state.statusMessage);
  const warnings = useEditorStore((state) => state.warnings);
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
        <div className="brand-logo-wrap" aria-hidden>
          <BrandLogo />
        </div>
        <div>
          <p className="eyebrow">
            <BrandWordmark />
          </p>
          <h1>Markdown 发布工作台</h1>
        </div>
      </div>
      <div className="toolbar-actions">
        <button className="copy-button" type="button" onClick={handleCopyWechat} disabled={copyStatus === "copying"}>
          {copyStatus === "copying" ? "复制中…" : "复制到公众号"}
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
