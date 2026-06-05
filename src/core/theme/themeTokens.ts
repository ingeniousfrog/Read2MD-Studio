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
];

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
};
