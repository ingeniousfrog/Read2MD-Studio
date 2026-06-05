import { useRef, useState } from "react";
import { headingStyleLabel } from "../core/theme/compileTheme";
import { defaultCustomTokens, type HeadingStyle, type ThemeTokenInput } from "../core/theme/themeTokens";
import {
  downloadThemeJson,
  exportThemeJson,
  parseImportedThemeJson,
} from "../core/theme/themeExport";
import { getActiveTheme, type ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";

const fontFamilyOptions = [
  { value: 'ui-serif, Georgia, "Times New Roman", serif', label: "Serif" },
  { value: '"Avenir Next", "Segoe UI", sans-serif', label: "Sans" },
  {
    value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    label: "Chinese Sans",
  },
  { value: '"SFMono-Regular", Consolas, monospace', label: "Monospace" },
];

const fontWeightOptions = [
  { value: 400, label: "Regular (400)" },
  { value: 500, label: "Medium (500)" },
  { value: 600, label: "Semibold (600)" },
  { value: 700, label: "Bold (700)" },
  { value: 800, label: "Extra Bold (800)" },
];

const headingStyleOptions: { value: HeadingStyle; label: string }[] = [
  { value: "wechat", label: headingStyleLabel("wechat") },
  { value: "editorial", label: headingStyleLabel("editorial") },
  { value: "accent-bar", label: headingStyleLabel("accent-bar") },
  { value: "card", label: headingStyleLabel("card") },
];

const colorFields: { key: keyof ThemeTokenInput; label: string }[] = [
  { key: "primaryColor", label: "主色" },
  { key: "textColor", label: "正文色" },
  { key: "mutedColor", label: "次要文字色" },
  { key: "backgroundColor", label: "背景色" },
  { key: "headingColor", label: "标题色" },
  { key: "linkColor", label: "链接色" },
  { key: "strongColor", label: "强调色" },
  { key: "borderColor", label: "边框色" },
  { key: "codeBackground", label: "代码背景" },
  { key: "blockquoteBackground", label: "引用背景" },
  { key: "preBackground", label: "代码块背景" },
];

const numberFields: {
  key: keyof ThemeTokenInput;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "baseFontSize", label: "正文字号", min: 12, max: 22, step: 1 },
  { key: "h1FontSize", label: "H1 字号", min: 20, max: 42, step: 1 },
  { key: "h2FontSize", label: "H2 字号", min: 16, max: 32, step: 1 },
  { key: "h3FontSize", label: "H3 字号", min: 14, max: 26, step: 1 },
  { key: "paragraphLineHeight", label: "段落行高", min: 1, max: 3, step: 0.01 },
  { key: "paragraphSpacing", label: "段落间距", min: 0, max: 40, step: 1 },
  { key: "radius", label: "圆角", min: 0, max: 24, step: 1 },
];

interface ThemePanelProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export function ThemePanel({ themeId, onThemeChange }: ThemePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveThemeName, setSaveThemeName] = useState("");

  const isOpen = useEditorStore((state) => state.isThemePanelOpen);
  const customThemeTokens = useEditorStore((state) => state.customThemeTokens);
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const savedThemes = useEditorStore((state) => state.savedThemes);
  const themeActionStatus = useEditorStore((state) => state.themeActionStatus);

  const updateCustomThemeToken = useEditorStore((state) => state.updateCustomThemeToken);
  const resetCustomThemeFromTheme = useEditorStore((state) => state.resetCustomThemeFromTheme);
  const setCustomThemeTokens = useEditorStore((state) => state.setCustomThemeTokens);
  const setCustomThemeName = useEditorStore((state) => state.setCustomThemeName);
  const setThemeActionStatus = useEditorStore((state) => state.setThemeActionStatus);
  const saveCurrentThemeAsPreset = useEditorStore((state) => state.saveCurrentThemeAsPreset);
  const applySavedTheme = useEditorStore((state) => state.applySavedTheme);
  const removeSavedTheme = useEditorStore((state) => state.removeSavedTheme);

  if (!isOpen) {
    return null;
  }

  const isCustomTheme = themeId === "custom";

  const handleSavePreset = () => {
    const trimmed = saveThemeName.trim() || customThemeName.trim();
    if (!trimmed) {
      setThemeActionStatus("error", "请输入主题名称");
      return;
    }
    saveCurrentThemeAsPreset(trimmed);
    setSaveThemeName("");
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
      onThemeChange("custom");
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
    onThemeChange("custom");
    setThemeActionStatus("success", "自定义主题已重置");
  };

  const handleHeadingStyleChange = (style: HeadingStyle) => {
    updateCustomThemeToken("headingStyle", style);
    if (style === "card") {
      updateCustomThemeToken("h2Numbering", true);
    }
  };

  return (
    <aside className="theme-panel" aria-label="Theme panel">
      <div className="theme-panel-section">
        <h3>主题配置</h3>
        <p className="theme-panel-hint">
          {isCustomTheme
            ? "当前使用文章主题，可直接调节下方参数。"
            : "当前使用内置主题。如需细调，请点击「基于内置主题定制」。"}
        </p>
        <div className="theme-panel-actions">
          <button
            type="button"
            onClick={() => {
              const baseThemeId = themeId === "custom" ? "clean" : themeId;
              resetCustomThemeFromTheme(baseThemeId as Exclude<ThemeId, "custom">);
              onThemeChange("custom");
            }}
          >
            基于内置主题定制
          </button>
          <button type="button" onClick={handleExportTheme}>
            导出 JSON
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            导入 JSON
          </button>
          <button type="button" onClick={handleCopyThemeCss}>
            复制 CSS
          </button>
          <button type="button" onClick={handleResetCustomTheme}>
            重置
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImportTheme}
        />
        {themeActionStatus.message && (
          <p className={`theme-panel-status theme-panel-status-${themeActionStatus.tone}`}>
            {themeActionStatus.message}
          </p>
        )}
      </div>

      <div className="theme-panel-section">
        <h3>保存主题</h3>
        <p className="theme-panel-hint">满意当前预览效果后，可命名保存到主题库。</p>
        <div className="theme-panel-row">
          <input
            type="text"
            placeholder="输入主题名称"
            value={saveThemeName}
            onChange={(event) => setSaveThemeName(event.target.value)}
          />
          <button type="button" className="theme-panel-button" onClick={handleSavePreset}>
            保存当前主题
          </button>
        </div>
        {savedThemes.length > 0 && (
          <ul className="saved-theme-list">
            {savedThemes.map((theme) => (
              <li key={theme.id}>
                <button type="button" onClick={() => applySavedTheme(theme.id)}>
                  {theme.name}
                </button>
                <button type="button" onClick={() => removeSavedTheme(theme.id)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="theme-panel-section">
        <h3>版式与排版</h3>
        <div className="theme-token-grid">
          <label className="theme-token-field">
            <span>主题名称</span>
            <input
              type="text"
              value={customThemeName}
              disabled={!isCustomTheme}
              onChange={(event) => setCustomThemeName(event.target.value)}
            />
          </label>
          <label className="theme-token-field">
            <span>标题风格</span>
            <select
              value={customThemeTokens.headingStyle}
              disabled={!isCustomTheme}
              onChange={(event) => handleHeadingStyleChange(event.target.value as HeadingStyle)}
            >
              {headingStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-token-field theme-token-field-checkbox">
            <span>H2 序号徽章</span>
            <input
              type="checkbox"
              checked={customThemeTokens.h2Numbering}
              disabled={!isCustomTheme}
              onChange={(event) => updateCustomThemeToken("h2Numbering", event.target.checked)}
            />
          </label>
          <label className="theme-token-field">
            <span>字体</span>
            <select
              value={customThemeTokens.fontFamily}
              disabled={!isCustomTheme}
              onChange={(event) => updateCustomThemeToken("fontFamily", event.target.value)}
            >
              {fontFamilyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="theme-token-field">
            <span>标题字重</span>
            <select
              value={customThemeTokens.headingFontWeight}
              disabled={!isCustomTheme}
              onChange={(event) =>
                updateCustomThemeToken("headingFontWeight", Number(event.target.value))
              }
            >
              {fontWeightOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {numberFields.map((field) => (
            <label key={field.key} className="theme-token-field">
              <span>{field.label}</span>
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                disabled={!isCustomTheme}
                value={customThemeTokens[field.key] as number}
                onChange={(event) =>
                  updateCustomThemeToken(field.key, Number(event.target.value))
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="theme-panel-section">
        <h3>颜色</h3>
        <div className="theme-token-grid">
          {colorFields.map((field) => (
            <label key={field.key} className="theme-token-field">
              <span>{field.label}</span>
              <input
                type="color"
                disabled={!isCustomTheme}
                value={customThemeTokens[field.key] as string}
                onChange={(event) => updateCustomThemeToken(field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
