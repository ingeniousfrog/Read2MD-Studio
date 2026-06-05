export type HeadingStyle = "wechat" | "editorial" | "accent-bar" | "card";

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
];

export const wechatNativeTokens: ThemeTokenInput = {
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
};

export const defaultCustomTokens: ThemeTokenInput = {
  primaryColor: "#176b87",
  textColor: "#25313f",
  mutedColor: "#536171",
  backgroundColor: "#ffffff",
  headingColor: "#121926",
  linkColor: "#176b87",
  borderColor: "#dce3eb",
  codeBackground: "#eef2f6",
  blockquoteBackground: "#f4f7fa",
  fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
  headingFontWeight: 700,
  paragraphLineHeight: 1.78,
  paragraphSpacing: 14,
  radius: 6,
  headingStyle: "editorial",
  baseFontSize: 16,
  h1FontSize: 30,
  h2FontSize: 23,
  h3FontSize: 18,
  strongColor: "#111827",
  preBackground: "#f3f6f9",
  h2Numbering: false,
};

export function normalizeThemeTokens(partial: Partial<ThemeTokenInput>): ThemeTokenInput {
  const merged = { ...defaultCustomTokens, ...partial };

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

  return merged;
}
