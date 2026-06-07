import { useTranslation } from "react-i18next";
import { themes, type ThemeId } from "../core/theme/themes";
import { useEditorStore } from "../store/editorStore";

interface ThemeSelectorProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export function ThemeSelector({ themeId, onThemeChange }: ThemeSelectorProps) {
  const { t } = useTranslation();
  const customThemeName = useEditorStore((state) => state.customThemeName);
  const savedThemes = useEditorStore((state) => state.savedThemes);
  const applySavedTheme = useEditorStore((state) => state.applySavedTheme);

  const currentValue = themeId === "custom" ? "custom" : themeId;

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
        <span className="sr-only">{t("theme.previewTheme")}</span>
        <select
          className="theme-selector"
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          aria-label={t("theme.selectTheme")}
        >
          <option value="custom">{t("theme.customTheme", { name: customThemeName })}</option>
          <optgroup label={t("theme.builtinThemes")}>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </optgroup>
          {savedThemes.length > 0 && (
            <optgroup label={t("theme.savedThemes")}>
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
