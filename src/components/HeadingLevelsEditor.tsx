import { useState } from "react";
import {
  createHeadingLevel,
  headingLevelLabel,
  type HeadingLevelConfig,
} from "../core/theme/themeTokens";

const fontWeightOptions = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
];

interface HeadingLevelsEditorProps {
  levels: HeadingLevelConfig[];
  disabled: boolean;
  h2Numbering: boolean;
  onChange: (levels: HeadingLevelConfig[]) => void;
  onH2NumberingChange: (value: boolean) => void;
}

export function HeadingLevelsEditor({
  levels,
  disabled,
  h2Numbering,
  onChange,
  onH2NumberingChange,
}: HeadingLevelsEditorProps) {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(levels[0]?.level ?? null);
  const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
  const usedLevels = new Set(sortedLevels.map((entry) => entry.level));
  const nextLevel = [1, 2, 3, 4, 5, 6].find((level) => !usedLevels.has(level));

  const updateLevel = (level: number, patch: Partial<HeadingLevelConfig>) => {
    onChange(
      sortedLevels.map((entry) =>
        entry.level === level ? { ...entry, ...patch, level } : entry,
      ),
    );
  };

  const removeLevel = (level: number) => {
    if (sortedLevels.length <= 1) {
      return;
    }
    onChange(sortedLevels.filter((entry) => entry.level !== level));
    if (expandedLevel === level) {
      setExpandedLevel(null);
    }
  };

  const addLevel = () => {
    if (!nextLevel) {
      return;
    }
    const created = createHeadingLevel(nextLevel);
    onChange([...sortedLevels, created].sort((a, b) => a.level - b.level));
    setExpandedLevel(nextLevel);
  };

  return (
    <div className="heading-levels-editor">
      <ul className="heading-level-list">
        {sortedLevels.map((entry) => {
          const expanded = expandedLevel === entry.level;
          return (
            <li key={entry.level} className={`heading-level-item${expanded ? " is-expanded" : ""}`}>
              <button
                type="button"
                className="heading-level-summary"
                disabled={disabled}
                onClick={() => setExpandedLevel(expanded ? null : entry.level)}
              >
                <span className="heading-level-mark">{headingLevelLabel(entry.level)}</span>
                <span className="heading-level-preview">
                  {entry.fontSize}px · {entry.fontWeight}
                </span>
                <span className="heading-level-chevron">{expanded ? "▾" : "▸"}</span>
              </button>
              {expanded && (
                <div className="heading-level-body">
                  <label className="theme-token-field">
                    <span>字号</span>
                    <input
                      type="number"
                      min={12}
                      max={48}
                      disabled={disabled}
                      value={entry.fontSize}
                      onChange={(event) =>
                        updateLevel(entry.level, { fontSize: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="theme-token-field">
                    <span>颜色</span>
                    <input
                      type="color"
                      disabled={disabled}
                      value={entry.color}
                      onChange={(event) => updateLevel(entry.level, { color: event.target.value })}
                    />
                  </label>
                  <label className="theme-token-field">
                    <span>字重</span>
                    <select
                      disabled={disabled}
                      value={entry.fontWeight}
                      onChange={(event) =>
                        updateLevel(entry.level, { fontWeight: Number(event.target.value) })
                      }
                    >
                      {fontWeightOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.value})
                        </option>
                      ))}
                    </select>
                  </label>
                  {entry.level === 2 && (
                    <label className="theme-token-field theme-token-field-checkbox">
                      <span>序号徽章</span>
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={h2Numbering}
                        onChange={(event) => onH2NumberingChange(event.target.checked)}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="heading-level-remove"
                    disabled={disabled || sortedLevels.length <= 1}
                    onClick={() => removeLevel(entry.level)}
                  >
                    移除此级
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="heading-level-add"
        disabled={disabled || !nextLevel}
        onClick={addLevel}
      >
        {nextLevel ? `+ 添加 ${nextLevel} 级标题` : "已包含全部 6 级标题"}
      </button>
    </div>
  );
}
