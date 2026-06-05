import { themes, type ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";

interface ThemeSelectorProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export function ThemeSelector({ themeId, onThemeChange }: ThemeSelectorProps) {
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const savedThemes = useEditorStore((state) => state.savedThemes);
  const applySavedTheme = useEditorStore((state) => state.applySavedTheme);

  const currentValue =
    themeId === "custom" ? "custom" : themeId;

  const handleChange = (value: string) => {
    if (value.startsWith("saved:")) {
      applySavedTheme(value.slice("saved:".length));
      return;
    }
    onThemeChange(value as ThemeId);
  };

  return (
    <div className="theme-selector-bar">
      <label className="theme-selector-label">
        <span className="sr-only">预览主题</span>
        <select
          className="theme-selector"
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          aria-label="选择预览主题"
        >
          <option value="custom">文章主题 · {customThemeName}</option>
          <optgroup label="内置主题">
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </optgroup>
          {savedThemes.length > 0 && (
            <optgroup label="已保存">
              {savedThemes.map((theme) => (
                <option key={theme.id} value={`saved:${theme.id}`}>
                  {theme.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
    </div>
  );
}
