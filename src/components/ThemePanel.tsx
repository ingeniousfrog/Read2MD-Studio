import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { HeadingLevelsEditor } from "./HeadingLevelsEditor";
import { headingStyleLabel } from "../core/theme/compileTheme";
import { defaultCustomTokens, type HeadingStyle, type ThemeTokenInput } from "../core/theme/themeTokens";
import {
  downloadThemeJson,
  exportThemeJson,
  parseImportedThemeJson,
} from "../core/theme/themeExport";
import { themes, type ThemeId } from "../core/theme/themes";
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

const headingStyleOptions: { value: HeadingStyle; label: string }[] = [
  { value: "wechat", label: headingStyleLabel("wechat") },
  { value: "editorial", label: headingStyleLabel("editorial") },
  { value: "accent-bar", label: headingStyleLabel("accent-bar") },
  { value: "card", label: headingStyleLabel("card") },
];

type ThemeTab = "global" | "headings" | "body" | "formula" | "code" | "image" | "quote";

const themeTabs: { id: ThemeTab; labelKey: string }[] = [
  { id: "global", labelKey: "theme.tabs.global" },
  { id: "headings", labelKey: "theme.tabs.headings" },
  { id: "body", labelKey: "theme.tabs.body" },
  { id: "formula", labelKey: "theme.tabs.formula" },
  { id: "code", labelKey: "theme.tabs.code" },
  { id: "image", labelKey: "theme.tabs.image" },
  { id: "quote", labelKey: "theme.tabs.quote" },
];

interface ThemePanelProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

function ColorField({
  label,
  tokenKey,
  disabled,
  value,
  onChange,
}: {
  label: string;
  tokenKey: keyof ThemeTokenInput;
  disabled: boolean;
  value: string;
  onChange: (key: keyof ThemeTokenInput, value: string) => void;
}) {
  return (
    <label className="theme-token-field">
      <span>{label}</span>
      <input
        type="color"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(tokenKey, event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  tokenKey,
  disabled,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  tokenKey: keyof ThemeTokenInput;
  disabled: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (key: keyof ThemeTokenInput, value: number) => void;
}) {
  return (
    <label className="theme-token-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(tokenKey, Number(event.target.value))}
      />
    </label>
  );
}

export function ThemePanel({ themeId, onThemeChange }: ThemePanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ThemeTab>("global");
  const [menuOpen, setMenuOpen] = useState(false);

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
  const setHeadingLevels = useEditorStore((state) => state.setHeadingLevels);

  if (!isOpen) {
    return null;
  }

  const isCustomTheme = themeId === "custom";
  const tokens = customThemeTokens;

  const ensureCustomMode = () => {
    if (themeId !== "custom") {
      resetCustomThemeFromTheme(themeId);
      onThemeChange("custom");
    }
  };

  const handleSavePreset = () => {
    const trimmed = customThemeName.trim();
    if (!trimmed) {
      setThemeActionStatus("error", "请先填写主题名称");
      return;
    }
    saveCurrentThemeAsPreset(trimmed);
    setThemeActionStatus("success", `已保存：${trimmed}`);
  };

  const handleExportTheme = () => {
    downloadThemeJson(
      exportThemeJson({ name: customThemeName, tokens: customThemeTokens }),
    );
    setThemeActionStatus("success", "主题已导出");
    setMenuOpen(false);
  };

  const handleImportTheme = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const result = parseImportedThemeJson(await file.text());
      if (!result.ok) {
        setThemeActionStatus("error", result.error);
        return;
      }
      setCustomThemeName(result.theme.name);
      setCustomThemeTokens(result.theme.tokens);
      onThemeChange("custom");
      setThemeActionStatus("success", `已导入：${result.theme.name}`);
    } catch {
      setThemeActionStatus("error", "读取主题文件失败");
    }
    setMenuOpen(false);
  };

  const handleResetCustomTheme = () => {
    setCustomThemeTokens(defaultCustomTokens);
    setCustomThemeName("自定义主题");
    onThemeChange("custom");
    setThemeActionStatus("success", "已恢复默认");
    setMenuOpen(false);
  };

  const handleHeadingStyleChange = (style: HeadingStyle) => {
    ensureCustomMode();
    updateCustomThemeToken("headingStyle", style);
    if (style === "card") {
      updateCustomThemeToken("h2Numbering", true);
    }
  };

  const updateColor = (key: keyof ThemeTokenInput, value: string) => {
    ensureCustomMode();
    updateCustomThemeToken(key, value);
  };

  const updateNumber = (key: keyof ThemeTokenInput, value: number) => {
    ensureCustomMode();
    updateCustomThemeToken(key, value);
  };

  const handlePresetSelect = (id: ThemeId) => {
    if (id === "custom") {
      onThemeChange("custom");
      return;
    }
    onThemeChange(id);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "global":
        return (
          <div className="theme-token-grid">
            <label className="theme-token-field">
              <span>标题风格</span>
              <select
                value={tokens.headingStyle}
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
            <label className="theme-token-field">
              <span>正文字体</span>
              <select
                value={tokens.fontFamily}
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
            <NumberField label="全局圆角" tokenKey="radius" disabled={!isCustomTheme} value={tokens.radius} min={0} max={24} step={1} onChange={updateNumber} />
            <ColorField label="主色" tokenKey="primaryColor" disabled={!isCustomTheme} value={tokens.primaryColor} onChange={updateColor} />
            <ColorField label="页面背景" tokenKey="backgroundColor" disabled={!isCustomTheme} value={tokens.backgroundColor} onChange={updateColor} />
            <ColorField label="正文颜色" tokenKey="textColor" disabled={!isCustomTheme} value={tokens.textColor} onChange={updateColor} />
            <ColorField label="次要文字" tokenKey="mutedColor" disabled={!isCustomTheme} value={tokens.mutedColor} onChange={updateColor} />
            <ColorField label="链接颜色" tokenKey="linkColor" disabled={!isCustomTheme} value={tokens.linkColor} onChange={updateColor} />
            <ColorField label="边框颜色" tokenKey="borderColor" disabled={!isCustomTheme} value={tokens.borderColor} onChange={updateColor} />
          </div>
        );

      case "headings":
        return (
          <HeadingLevelsEditor
            levels={tokens.headingLevels}
            disabled={!isCustomTheme}
            h2Numbering={tokens.h2Numbering}
            onChange={(levels) => {
              ensureCustomMode();
              setHeadingLevels(levels);
            }}
            onH2NumberingChange={(value) => {
              ensureCustomMode();
              updateCustomThemeToken("h2Numbering", value);
            }}
          />
        );

      case "body":
        return (
          <div className="theme-token-grid">
            <NumberField label="正文字号" tokenKey="baseFontSize" disabled={!isCustomTheme} value={tokens.baseFontSize} min={12} max={22} step={1} onChange={updateNumber} />
            <NumberField label="行高" tokenKey="paragraphLineHeight" disabled={!isCustomTheme} value={tokens.paragraphLineHeight} min={1} max={3} step={0.01} onChange={updateNumber} />
            <NumberField label="段间距" tokenKey="paragraphSpacing" disabled={!isCustomTheme} value={tokens.paragraphSpacing} min={0} max={40} step={1} onChange={updateNumber} />
            <ColorField label="强调色" tokenKey="strongColor" disabled={!isCustomTheme} value={tokens.strongColor} onChange={updateColor} />
          </div>
        );

      case "formula":
        return (
          <div className="theme-token-grid">
            <ColorField label="公式颜色" tokenKey="formulaColor" disabled={!isCustomTheme} value={tokens.formulaColor} onChange={updateColor} />
            <NumberField label="字号倍数" tokenKey="formulaFontScale" disabled={!isCustomTheme} value={tokens.formulaFontScale} min={0.8} max={2} step={0.05} onChange={updateNumber} />
            <ColorField label="背景色" tokenKey="formulaBackground" disabled={!isCustomTheme} value={tokens.formulaBackground} onChange={updateColor} />
            <label className="theme-token-field theme-token-field-checkbox">
              <span>卡片包裹</span>
              <input type="checkbox" checked={tokens.formulaCardEnabled} disabled={!isCustomTheme} onChange={(e) => updateCustomThemeToken("formulaCardEnabled", e.target.checked)} />
            </label>
            <ColorField label="卡片边框" tokenKey="formulaCardBorderColor" disabled={!isCustomTheme} value={tokens.formulaCardBorderColor} onChange={updateColor} />
            <NumberField label="卡片圆角" tokenKey="formulaCardRadius" disabled={!isCustomTheme} value={tokens.formulaCardRadius} min={0} max={24} step={1} onChange={updateNumber} />
            <NumberField label="卡片内边距" tokenKey="formulaCardPadding" disabled={!isCustomTheme} value={tokens.formulaCardPadding} min={0} max={40} step={1} onChange={updateNumber} />
          </div>
        );

      case "code":
        return (
          <div className="theme-token-grid">
            <ColorField label="行内代码背景" tokenKey="codeBackground" disabled={!isCustomTheme} value={tokens.codeBackground} onChange={updateColor} />
            <ColorField label="代码块背景" tokenKey="preBackground" disabled={!isCustomTheme} value={tokens.preBackground} onChange={updateColor} />
            <ColorField label="代码文字" tokenKey="codeTextColor" disabled={!isCustomTheme} value={tokens.codeTextColor} onChange={updateColor} />
            <NumberField label="代码字号" tokenKey="codeFontSize" disabled={!isCustomTheme} value={tokens.codeFontSize} min={10} max={20} step={1} onChange={updateNumber} />
          </div>
        );

      case "image":
        return (
          <div className="theme-token-grid">
            <NumberField label="圆角" tokenKey="imageRadius" disabled={!isCustomTheme} value={tokens.imageRadius} min={0} max={24} step={1} onChange={updateNumber} />
            <ColorField label="边框色" tokenKey="imageBorderColor" disabled={!isCustomTheme} value={tokens.imageBorderColor === "transparent" ? "#ffffff" : tokens.imageBorderColor} onChange={updateColor} />
            <label className="theme-token-field theme-token-field-checkbox">
              <span>阴影</span>
              <input type="checkbox" checked={tokens.imageShadow} disabled={!isCustomTheme} onChange={(e) => updateCustomThemeToken("imageShadow", e.target.checked)} />
            </label>
            <ColorField label="图注颜色" tokenKey="imageCaptionColor" disabled={!isCustomTheme} value={tokens.imageCaptionColor} onChange={updateColor} />
          </div>
        );

      case "quote":
        return (
          <div className="theme-token-grid">
            <ColorField label="引用背景" tokenKey="blockquoteBackground" disabled={!isCustomTheme} value={tokens.blockquoteBackground} onChange={updateColor} />
            <ColorField label="表格边框" tokenKey="borderColor" disabled={!isCustomTheme} value={tokens.borderColor} onChange={updateColor} />
            <ColorField label="表头文字" tokenKey="headingColor" disabled={!isCustomTheme} value={tokens.headingColor} onChange={updateColor} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <aside className="theme-panel" aria-label="Theme panel">
      <div className="theme-panel-sticky">
        <div className="theme-panel-top">
          <div className="theme-panel-title-row">
            <h3>主题</h3>
            <div className="theme-panel-menu-wrap">
              <button type="button" className="theme-panel-menu-btn" onClick={() => setMenuOpen((v) => !v)}>
                更多
              </button>
              {menuOpen && (
                <div className="theme-panel-menu">
                  <button type="button" onClick={() => fileInputRef.current?.click()}>导入主题</button>
                  <button type="button" onClick={handleExportTheme}>导出主题</button>
                  <button type="button" onClick={handleResetCustomTheme}>恢复默认</button>
                </div>
              )}
            </div>
          </div>

          <div className="theme-preset-row">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-preset-chip${themeId === theme.id ? " theme-preset-chip-active" : ""}`}
                onClick={() => handlePresetSelect(theme.id)}
              >
                {theme.name}
              </button>
            ))}
          </div>

          <div className="theme-panel-save-row">
            <input
              type="text"
              placeholder="主题名称"
              value={customThemeName}
              onChange={(event) => setCustomThemeName(event.target.value)}
            />
            <button type="button" className="theme-panel-button" onClick={handleSavePreset}>
              保存
            </button>
          </div>

          {!isCustomTheme && (
            <p className="theme-panel-hint">调整参数后将自动保存为自定义主题。</p>
          )}

          {themeActionStatus.message && (
            <p className={`theme-panel-status theme-panel-status-${themeActionStatus.tone}`}>
              {themeActionStatus.message}
            </p>
          )}

          {savedThemes.length > 0 && (
            <ul className="saved-theme-list saved-theme-list-compact">
              {savedThemes.map((theme) => (
                <li key={theme.id}>
                  <button type="button" onClick={() => applySavedTheme(theme.id)}>{theme.name}</button>
                  <button type="button" onClick={() => removeSavedTheme(theme.id)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="theme-tabs" role="tablist">
          {themeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`theme-tab${activeTab === tab.id ? " theme-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportTheme} />

      <div className="theme-tab-panel" role="tabpanel">
        {renderTabContent()}
      </div>
    </aside>
  );
}
