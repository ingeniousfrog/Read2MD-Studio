import {
  THEME_TOKEN_KEYS,
  normalizeThemeTokens,
  type ThemeTokenInput,
} from "./themeTokens";

export type ExportedThemeJson = {
  schemaVersion: 1;
  name: string;
  tokens: ThemeTokenInput;
  createdBy: "Read2MD-Studio";
  createdAt: string;
};

export function exportThemeJson(input: {
  name: string;
  tokens: ThemeTokenInput;
}): ExportedThemeJson {
  return {
    schemaVersion: 1,
    name: input.name,
    tokens: input.tokens,
    createdBy: "Read2MD-Studio",
    createdAt: new Date().toISOString(),
  };
}

export function parseImportedThemeJson(
  input: string,
): { ok: true; theme: ExportedThemeJson } | { ok: false; error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "JSON 格式无效，请检查文件内容。" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "主题文件必须是一个 JSON 对象。" };
  }

  const record = parsed as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    return { ok: false, error: "不支持的 schemaVersion，当前仅支持版本 1。" };
  }

  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    return { ok: false, error: "主题名称 name 必须是非空字符串。" };
  }

  if (!record.tokens || typeof record.tokens !== "object") {
    return { ok: false, error: "tokens 字段缺失或类型错误。" };
  }

  const tokensResult = validateTokens(record.tokens as Record<string, unknown>);
  if (!tokensResult.ok) {
    return tokensResult;
  }

  return {
    ok: true,
    theme: {
      schemaVersion: 1,
      name: record.name.trim(),
      tokens: tokensResult.tokens,
      createdBy: "Read2MD-Studio",
      createdAt:
        typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    },
  };
}

function validateTokens(
  tokens: Record<string, unknown>,
): { ok: true; tokens: ThemeTokenInput } | { ok: false; error: string } {
  const legacyRequiredStrings = [
    "primaryColor",
    "textColor",
    "mutedColor",
    "backgroundColor",
    "headingColor",
    "linkColor",
    "borderColor",
    "codeBackground",
    "blockquoteBackground",
    "fontFamily",
  ];
  const legacyRequiredNumbers = [
    "headingFontWeight",
    "paragraphLineHeight",
    "paragraphSpacing",
    "radius",
  ];

  for (const key of legacyRequiredStrings) {
    const value = tokens[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      return { ok: false, error: `tokens.${key} 必须是非空字符串。` };
    }
  }

  for (const key of legacyRequiredNumbers) {
    const value = tokens[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { ok: false, error: `tokens.${key} 必须是有效数字。` };
    }
  }

  const normalized = normalizeThemeTokens(tokens as Partial<ThemeTokenInput>);

  for (const key of THEME_TOKEN_KEYS) {
    if (key === "headingLevels") {
      if (!Array.isArray(normalized.headingLevels) || normalized.headingLevels.length === 0) {
        return { ok: false, error: "tokens.headingLevels 必须是非空数组。" };
      }
      continue;
    }
    const value = normalized[key];
    if (value === undefined || value === null || value === "") {
      return { ok: false, error: `tokens 缺少字段：${key}` };
    }
  }

  return {
    ok: true,
    tokens: normalized,
  };
}

export function downloadThemeJson(theme: ExportedThemeJson): void {
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = theme.name.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/^-+|-+$/g, "") || "custom-theme";

  anchor.href = url;
  anchor.download = `${safeName}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
