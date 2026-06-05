export type HeadingStyle = "wechat" | "editorial" | "accent-bar" | "card";

export type HeadingLevelConfig = {
  level: number;
  fontSize: number;
  color: string;
  fontWeight: number;
};

export type ThemeTokenInput = {
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  backgroundColor: string;
  headingColor: string;
  linkColor: string;
  borderColor: string;
  codeBackground: string;
  blockquoteBackground: string;
  fontFamily: string;
  headingFontWeight: number;
  paragraphLineHeight: number;
  paragraphSpacing: number;
  radius: number;
  headingStyle: HeadingStyle;
  baseFontSize: number;
  h1FontSize: number;
  h2FontSize: number;
  h3FontSize: number;
  strongColor: string;
  preBackground: string;
  h2Numbering: boolean;
  h1Color: string;
  h2Color: string;
  h3Color: string;
  h1FontWeight: number;
  h2FontWeight: number;
  h3FontWeight: number;
  headingLevels: HeadingLevelConfig[];
  formulaColor: string;
  formulaFontScale: number;
  formulaBackground: string;
  formulaCardEnabled: boolean;
  formulaCardBorderColor: string;
  formulaCardRadius: number;
  formulaCardPadding: number;
  codeFontSize: number;
  codeTextColor: string;
  imageRadius: number;
  imageBorderColor: string;
  imageShadow: boolean;
  imageCaptionColor: string;
};

export const THEME_TOKEN_KEYS: (keyof ThemeTokenInput)[] = [
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
  "headingFontWeight",
  "paragraphLineHeight",
  "paragraphSpacing",
  "radius",
  "headingStyle",
  "baseFontSize",
  "h1FontSize",
  "h2FontSize",
  "h3FontSize",
  "strongColor",
  "preBackground",
  "h2Numbering",
  "h1Color",
  "h2Color",
  "h3Color",
  "h1FontWeight",
  "h2FontWeight",
  "h3FontWeight",
  "headingLevels",
  "formulaColor",
  "formulaFontScale",
  "formulaBackground",
  "formulaCardEnabled",
  "formulaCardBorderColor",
  "formulaCardRadius",
  "formulaCardPadding",
  "codeFontSize",
  "codeTextColor",
  "imageRadius",
  "imageBorderColor",
  "imageShadow",
  "imageCaptionColor",
];

const sharedExtendedDefaults = {
  formulaColor: "#1a1a1a",
  formulaFontScale: 1.05,
  formulaBackground: "#f7f7f7",
  formulaCardEnabled: true,
  formulaCardBorderColor: "#e7e7eb",
  formulaCardRadius: 6,
  formulaCardPadding: 14,
  codeFontSize: 14,
  codeTextColor: "#dce9f2",
  imageRadius: 6,
  imageBorderColor: "transparent",
  imageShadow: false,
  imageCaptionColor: "#8c8c8c",
} as const;

export function createDefaultHeadingLevels(
  partial: Partial<ThemeTokenInput> = {},
): HeadingLevelConfig[] {
  const headingColor = partial.headingColor ?? "#121926";
  const primaryColor = partial.primaryColor ?? "#176b87";
  const weight = partial.headingFontWeight ?? 700;
  const style = partial.headingStyle ?? "editorial";

  return [
    {
      level: 1,
      fontSize: partial.h1FontSize ?? 30,
      color: partial.h1Color ?? headingColor,
      fontWeight: partial.h1FontWeight ?? weight,
    },
    {
      level: 2,
      fontSize: partial.h2FontSize ?? 23,
      color:
        partial.h2Color ?? (style === "card" ? primaryColor : headingColor),
      fontWeight: partial.h2FontWeight ?? weight,
    },
    {
      level: 3,
      fontSize: partial.h3FontSize ?? 18,
      color:
        partial.h3Color ?? (style === "accent-bar" ? primaryColor : headingColor),
      fontWeight: partial.h3FontWeight ?? (weight >= 700 ? 600 : weight),
    },
  ];
}

export function createHeadingLevel(
  level: number,
  partial: Partial<ThemeTokenInput> = {},
): HeadingLevelConfig {
  const headingColor = partial.headingColor ?? "#121926";
  const base = partial.baseFontSize ?? 16;
  const weight = partial.headingFontWeight ?? 700;

  return {
    level,
    fontSize: Math.max(12, base + 6 - level * 2),
    color: headingColor,
    fontWeight: level <= 2 ? weight : weight >= 700 ? 600 : weight,
  };
}

export function headingLevelLabel(level: number): string {
  return `${"#".repeat(level)}  ${level} 级标题`;
}

export function syncLegacyHeadingFields(tokens: ThemeTokenInput): ThemeTokenInput {
  const levels = [...tokens.headingLevels].sort((a, b) => a.level - b.level);
  const next = { ...tokens, headingLevels: levels };

  for (const entry of levels) {
    if (entry.level === 1) {
      next.h1FontSize = entry.fontSize;
      next.h1Color = entry.color;
      next.h1FontWeight = entry.fontWeight;
    }
    if (entry.level === 2) {
      next.h2FontSize = entry.fontSize;
      next.h2Color = entry.color;
      next.h2FontWeight = entry.fontWeight;
    }
    if (entry.level === 3) {
      next.h3FontSize = entry.fontSize;
      next.h3Color = entry.color;
      next.h3FontWeight = entry.fontWeight;
    }
  }

  return next;
}

export function getHeadingLevel(
  tokens: ThemeTokenInput,
  level: number,
): HeadingLevelConfig {
  const found = tokens.headingLevels.find((entry) => entry.level === level);
  if (found) {
    return found;
  }
  return createHeadingLevel(level, tokens);
}

const baseCustomSeed: Partial<ThemeTokenInput> = {
  primaryColor: "#0f766e",
  textColor: "#1e293b",
  mutedColor: "#64748b",
  backgroundColor: "#ffffff",
  headingColor: "#0f172a",
  linkColor: "#0f766e",
  borderColor: "#e2e8f0",
  codeBackground: "#f1f5f9",
  blockquoteBackground: "#f8fafc",
  fontFamily:
    '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif',
  headingFontWeight: 700,
  paragraphLineHeight: 1.78,
  paragraphSpacing: 14,
  radius: 8,
  headingStyle: "editorial",
  baseFontSize: 16,
  h1FontSize: 28,
  h2FontSize: 22,
  h3FontSize: 18,
  strongColor: "#0f172a",
  preBackground: "#0f172a",
  h2Numbering: false,
  ...sharedExtendedDefaults,
  formulaColor: "#0f172a",
  formulaBackground: "#f8fafc",
  formulaCardBorderColor: "#e2e8f0",
  codeTextColor: "#e2e8f0",
  imageCaptionColor: "#64748b",
};

export const defaultCustomTokens: ThemeTokenInput = finalizeThemeTokens(baseCustomSeed);

export const wechatNativeTokens: ThemeTokenInput = finalizeThemeTokens({
  primaryColor: "#576b95",
  textColor: "#3e3e3e",
  mutedColor: "#8c8c8c",
  backgroundColor: "#ffffff",
  headingColor: "#1a1a1a",
  linkColor: "#576b95",
  borderColor: "#e7e7eb",
  codeBackground: "#f6f6f6",
  blockquoteBackground: "#f7f7f7",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  headingFontWeight: 700,
  paragraphLineHeight: 1.75,
  paragraphSpacing: 16,
  radius: 4,
  headingStyle: "wechat",
  baseFontSize: 17,
  h1FontSize: 22,
  h2FontSize: 18,
  h3FontSize: 17,
  strongColor: "#1a1a1a",
  preBackground: "#f6f6f6",
  h2Numbering: false,
  formulaColor: "#1a1a1a",
  formulaBackground: "#f7f7f7",
  formulaCardBorderColor: "#e7e7eb",
  formulaCardRadius: 4,
  codeTextColor: "#3e3e3e",
  imageRadius: 4,
  imageCaptionColor: "#8c8c8c",
});

function isValidHeadingLevels(value: unknown): value is HeadingLevelConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.level === "number" &&
      entry.level >= 1 &&
      entry.level <= 6 &&
      typeof entry.fontSize === "number" &&
      typeof entry.color === "string" &&
      typeof entry.fontWeight === "number",
  );
}

function deriveHeadingColors(
  partial: Partial<ThemeTokenInput>,
  merged: ThemeTokenInput,
): void {
  const headingColor = merged.headingColor;
  const primaryColor = merged.primaryColor;

  if (!partial.h1Color) {
    merged.h1Color = headingColor;
  }
  if (!partial.h2Color) {
    merged.h2Color =
      merged.headingStyle === "card" ? primaryColor : headingColor;
  }
  if (!partial.h3Color) {
    merged.h3Color =
      merged.headingStyle === "accent-bar" ? primaryColor : headingColor;
  }
}

function deriveHeadingWeights(
  partial: Partial<ThemeTokenInput>,
  merged: ThemeTokenInput,
): void {
  const weight = merged.headingFontWeight;
  if (!partial.h1FontWeight) {
    merged.h1FontWeight = weight;
  }
  if (!partial.h2FontWeight) {
    merged.h2FontWeight = weight;
  }
  if (!partial.h3FontWeight) {
    merged.h3FontWeight = weight >= 700 ? 600 : weight;
  }
}

function deriveHeadingLevels(
  partial: Partial<ThemeTokenInput>,
  merged: ThemeTokenInput,
): void {
  if (isValidHeadingLevels(partial.headingLevels)) {
    merged.headingLevels = partial.headingLevels
      .filter((entry, index, list) => list.findIndex((item) => item.level === entry.level) === index)
      .sort((a, b) => a.level - b.level);
    return;
  }

  merged.headingLevels = createDefaultHeadingLevels(merged);
}

function deriveCodeTextColor(
  partial: Partial<ThemeTokenInput>,
  merged: ThemeTokenInput,
): void {
  if (!partial.codeTextColor) {
    merged.codeTextColor =
      merged.headingStyle === "card" ? merged.blockquoteBackground : "#e2e8f0";
  }
  if (!partial.codeFontSize) {
    merged.codeFontSize = 14;
  }
}

function deriveFormulaTokens(
  partial: Partial<ThemeTokenInput>,
  merged: ThemeTokenInput,
): void {
  if (!partial.formulaColor) {
    merged.formulaColor = merged.headingColor;
  }
  if (!partial.formulaFontScale) {
    merged.formulaFontScale = 1.05;
  }
  if (!partial.formulaBackground) {
    merged.formulaBackground = merged.blockquoteBackground;
  }
  if (partial.formulaCardEnabled === undefined) {
    merged.formulaCardEnabled = true;
  }
  if (!partial.formulaCardBorderColor) {
    merged.formulaCardBorderColor = merged.borderColor;
  }
  if (!partial.formulaCardRadius) {
    merged.formulaCardRadius = merged.radius;
  }
  if (!partial.formulaCardPadding) {
    merged.formulaCardPadding = 14;
  }
}

function deriveImageTokens(
  partial: Partial<ThemeTokenInput>,
  merged: ThemeTokenInput,
): void {
  if (!partial.imageRadius) {
    merged.imageRadius = merged.radius;
  }
  if (!partial.imageBorderColor) {
    merged.imageBorderColor = "transparent";
  }
  if (partial.imageShadow === undefined) {
    merged.imageShadow = false;
  }
  if (!partial.imageCaptionColor) {
    merged.imageCaptionColor = merged.mutedColor;
  }
}

function finalizeThemeTokens(partial: Partial<ThemeTokenInput>): ThemeTokenInput {
  const merged = { ...baseCustomSeed, ...partial } as ThemeTokenInput;

  if (merged.headingStyle === "card") {
    merged.h2Numbering = partial.h2Numbering ?? true;
  } else if (merged.headingStyle === "wechat") {
    merged.h2Numbering = false;
  }

  if (!partial.strongColor) {
    merged.strongColor =
      merged.headingStyle === "card" ? merged.linkColor : merged.headingColor;
  }

  if (!partial.preBackground) {
    merged.preBackground =
      merged.headingStyle === "card" ? "#2a2118" : merged.codeBackground;
  }

  deriveHeadingColors(partial, merged);
  deriveHeadingWeights(partial, merged);
  deriveHeadingLevels(partial, merged);
  deriveFormulaTokens(partial, merged);
  deriveCodeTextColor(partial, merged);
  deriveImageTokens(partial, merged);

  return syncLegacyHeadingFields(merged);
}

export function normalizeThemeTokens(partial: Partial<ThemeTokenInput>): ThemeTokenInput {
  return finalizeThemeTokens({ ...defaultCustomTokens, ...partial });
}
