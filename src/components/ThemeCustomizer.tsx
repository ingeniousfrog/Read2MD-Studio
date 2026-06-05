import { useEditorStore } from "../store/editorStore";
import type { ThemeTokenInput } from "../core/theme/themeTokens";

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

const colorFields: { key: keyof ThemeTokenInput; label: string }[] = [
  { key: "primaryColor", label: "主色" },
  { key: "textColor", label: "正文色" },
  { key: "mutedColor", label: "次要文字色" },
  { key: "backgroundColor", label: "背景色" },
  { key: "headingColor", label: "标题色" },
  { key: "linkColor", label: "链接色" },
  { key: "borderColor", label: "边框色" },
  { key: "codeBackground", label: "代码背景" },
  { key: "blockquoteBackground", label: "引用背景" },
];

const numberFields: {
  key: keyof ThemeTokenInput;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "paragraphLineHeight", label: "段落行高", min: 1, max: 3, step: 0.01 },
  { key: "paragraphSpacing", label: "段落间距", min: 0, max: 40, step: 1 },
  { key: "radius", label: "圆角", min: 0, max: 24, step: 1 },
];

export function ThemeCustomizer() {
  const isOpen = useEditorStore((state) => state.isThemeCustomizerOpen);
  const customThemeTokens = useEditorStore((state) => state.customThemeTokens);
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const updateCustomThemeToken = useEditorStore((state) => state.updateCustomThemeToken);
  const setCustomThemeName = useEditorStore((state) => state.setCustomThemeName);
  const closeThemeCustomizer = useEditorStore((state) => state.closeThemeCustomizer);

  if (!isOpen) {
    return null;
  }

  return (
    <section className="theme-customizer" aria-label="Theme customizer">
      <div className="theme-customizer-header">
        <div>
          <h2>主题定制</h2>
          <p>调整常用样式变量，Preview 会实时更新。</p>
        </div>
        <button type="button" className="theme-customizer-close" onClick={closeThemeCustomizer}>
          收起
        </button>
      </div>

      <label className="theme-token-field theme-token-field-wide">
        <span>主题名称</span>
        <input
          type="text"
          value={customThemeName}
          onChange={(event) => setCustomThemeName(event.target.value)}
        />
      </label>

      <div className="theme-token-grid">
        {colorFields.map((field) => (
          <label key={field.key} className="theme-token-field">
            <span>{field.label}</span>
            <input
              type="color"
              value={customThemeTokens[field.key] as string}
              onChange={(event) => updateCustomThemeToken(field.key, event.target.value)}
            />
          </label>
        ))}

        <label className="theme-token-field">
          <span>字体</span>
          <select
            value={customThemeTokens.fontFamily}
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
              value={customThemeTokens[field.key] as number}
              onChange={(event) =>
                updateCustomThemeToken(field.key, Number(event.target.value))
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}
