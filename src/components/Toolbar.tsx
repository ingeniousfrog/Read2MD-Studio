import { copyHtml } from "../core/copy/copyHtml";
import { buildWechatOutput } from "../core/platform/wechatAdapter";
import { renderMarkdown } from "../core/markdown/renderMarkdown";
import { getThemeById, type ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";
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
  const setCopyStatus = useEditorStore((state) => state.setCopyStatus);
  const setWarnings = useEditorStore((state) => state.setWarnings);

  const handleCopyWechat = async () => {
    setCopyStatus("copying", "正在生成公众号 HTML...");

    try {
      const rendered = renderMarkdown({
        markdown: markdownValue,
      });
      const output = buildWechatOutput({
        rawHtml: rendered.rawHtml,
        theme: getThemeById(themeId),
        warnings: rendered.warnings,
      });
      const result = await copyHtml(output);

      setWarnings(output.warnings);
      setCopyStatus(result.ok ? "success" : "error", result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "复制失败，请检查浏览器权限。";
      setWarnings([message]);
      setCopyStatus("error", message);
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
        <button className="copy-button" type="button" onClick={handleCopyWechat} disabled={copyStatus === "copying"}>
          {copyStatus === "copying" ? "Copying..." : "Copy for WeChat"}
        </button>
      </div>
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
    </header>
  );
}
