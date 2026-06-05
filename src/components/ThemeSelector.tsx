import { themes, type ThemeId } from "../core/theme/themes";

interface ThemeSelectorProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export function ThemeSelector({ themeId, onThemeChange }: ThemeSelectorProps) {
  return (
    <label className="theme-selector">
      <span>Theme</span>
      <select value={themeId} onChange={(event) => onThemeChange(event.target.value as ThemeId)}>
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
    </label>
  );
}
