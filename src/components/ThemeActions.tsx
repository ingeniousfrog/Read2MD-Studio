import { useRef } from "react";
import { defaultCustomTokens } from "../core/theme/themeTokens";
import {
  downloadThemeJson,
  exportThemeJson,
  parseImportedThemeJson,
} from "../core/theme/themeExport";
import { getActiveTheme, type ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";

interface ThemeActionsProps {
  themeId: ThemeId;
}

export function ThemeActions({ themeId }: ThemeActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customThemeTokens = useEditorStore((state) => state.customThemeTokens);
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const themeActionStatus = useEditorStore((state) => state.themeActionStatus);
  const resetCustomThemeFromTheme = useEditorStore((state) => state.resetCustomThemeFromTheme);
  const setCustomThemeTokens = useEditorStore((state) => state.setCustomThemeTokens);
  const setCustomThemeName = useEditorStore((state) => state.setCustomThemeName);
  const setThemeActionStatus = useEditorStore((state) => state.setThemeActionStatus);
  const openThemeCustomizer = useEditorStore((state) => state.openThemeCustomizer);
  const toggleThemeCustomizer = useEditorStore((state) => state.toggleThemeCustomizer);

  const handleCustomizeFromCurrent = () => {
    if (themeId === "custom") {
      openThemeCustomizer();
      setThemeActionStatus("success", "已打开自定义主题面板");
      return;
    }

    resetCustomThemeFromTheme(themeId);
    setThemeActionStatus("success", "已基于当前主题生成自定义主题");
  };

  const handleExportTheme = () => {
    const themeJson = exportThemeJson({
      name: customThemeName,
      tokens: customThemeTokens,
    });
    downloadThemeJson(themeJson);
    setThemeActionStatus("success", "主题 JSON 已导出");
  };

  const handleImportTheme = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = parseImportedThemeJson(text);

      if (!result.ok) {
        setThemeActionStatus("error", result.error);
        return;
      }

      setCustomThemeName(result.theme.name);
      setCustomThemeTokens(result.theme.tokens);
      openThemeCustomizer();
      setThemeActionStatus("success", `已导入主题：${result.theme.name}`);
    } catch {
      setThemeActionStatus("error", "读取主题文件失败，请重试。");
    }
  };

  const handleCopyThemeCss = async () => {
    const activeTheme = getActiveTheme(themeId, customThemeTokens, customThemeName);

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setThemeActionStatus("error", "当前浏览器不支持剪贴板写入。");
      return;
    }

    try {
      await navigator.clipboard.writeText(activeTheme.css);
      setThemeActionStatus("success", "主题 CSS 已复制到剪贴板");
    } catch {
      setThemeActionStatus("error", "复制主题 CSS 失败，请检查浏览器权限。");
    }
  };

  const handleResetCustomTheme = () => {
    setCustomThemeTokens(defaultCustomTokens);
    setCustomThemeName("Custom");
    setThemeActionStatus("success", "自定义主题已重置");
  };

  return (
    <div className="theme-actions">
      <button type="button" onClick={handleCustomizeFromCurrent}>
        基于当前主题定制
      </button>
      <button type="button" onClick={toggleThemeCustomizer}>
        主题面板
      </button>
      <button type="button" onClick={handleExportTheme}>
        导出主题 JSON
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        导入主题 JSON
      </button>
      <button type="button" onClick={handleCopyThemeCss}>
        复制主题 CSS
      </button>
      <button type="button" onClick={handleResetCustomTheme}>
        重置自定义主题
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImportTheme}
      />
      {themeActionStatus.message && (
        <span className={`theme-action-status theme-action-status-${themeActionStatus.tone}`}>
          {themeActionStatus.message}
        </span>
      )}
    </div>
  );
}
