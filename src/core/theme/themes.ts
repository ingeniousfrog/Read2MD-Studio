import { buildCustomTheme } from "./compileTheme";
import type { ThemeTokenInput } from "./themeTokens";

export type ThemeId = "clean" | "tech" | "wechat-card" | "custom";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  css: string;
  tokens?: ThemeTokenInput;
  isCustom?: boolean;
}

const cleanTokens: ThemeTokenInput = {
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

const techTokens: ThemeTokenInput = {
  primaryColor: "#168aad",
  textColor: "#18212f",
  mutedColor: "#334155",
  backgroundColor: "#ffffff",
  headingColor: "#0f172a",
  linkColor: "#0b7285",
  borderColor: "#d5e4ea",
  codeBackground: "#e8f6f9",
  blockquoteBackground: "#eef9fb",
  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  headingFontWeight: 700,
  paragraphLineHeight: 1.72,
  paragraphSpacing: 14,
  radius: 6,
  headingStyle: "accent-bar",
  baseFontSize: 16,
  h1FontSize: 32,
  h2FontSize: 23,
  h3FontSize: 18,
  strongColor: "#0f172a",
  preBackground: "#0f172a",
  h2Numbering: false,
};

const wechatCardTokens: ThemeTokenInput = {
  primaryColor: "#95633a",
  textColor: "#2e2a25",
  mutedColor: "#5c4b3a",
  backgroundColor: "#ffffff",
  headingColor: "#2a2118",
  linkColor: "#8b4d22",
  borderColor: "#ead8c4",
  codeBackground: "#f7efe5",
  blockquoteBackground: "#fbf6ef",
  fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  headingFontWeight: 700,
  paragraphLineHeight: 1.85,
  paragraphSpacing: 14,
  radius: 6,
  headingStyle: "card",
  baseFontSize: 16,
  h1FontSize: 28,
  h2FontSize: 22,
  h3FontSize: 18,
  strongColor: "#8b4d22",
  preBackground: "#2a2118",
  h2Numbering: true,
};

export const themes: ThemeDefinition[] = [
  {
    id: "clean",
    name: "Clean",
    description: "A restrained editorial style for quiet long-form reading.",
    tokens: cleanTokens,
    css: `
.r2md-article {
  color: #25313f;
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  font-size: 16px;
  line-height: 1.78;
  letter-spacing: 0;
}
.r2md-article h1 {
  color: #121926;
  font-size: 30px;
  line-height: 1.25;
  margin: 0 0 24px;
  padding-bottom: 14px;
  border-bottom: 2px solid #d8e0ea;
}
.r2md-article h2 {
  color: #172033;
  font-size: 23px;
  line-height: 1.35;
  margin: 34px 0 14px;
}
.r2md-article h3 {
  color: #24324a;
  font-size: 18px;
  margin: 26px 0 10px;
}
.r2md-article p {
  margin: 14px 0;
}
.r2md-article strong {
  color: #111827;
}
.r2md-article em {
  color: #536171;
}
.r2md-article a {
  color: #176b87;
  text-decoration: none;
  border-bottom: 1px solid #9ac6d4;
}
.r2md-article blockquote {
  margin: 22px 0;
  padding: 12px 18px;
  color: #48596d;
  background: #f4f7fa;
  border-left: 4px solid #8eb3c7;
}
.r2md-article ul,
.r2md-article ol {
  padding-left: 24px;
}
.r2md-article li {
  margin: 8px 0;
}
.r2md-article .r2md-table-scroll {
  width: 100%;
  overflow-x: auto;
  margin: 22px 0;
}
.r2md-article table {
  width: 100%;
  min-width: 560px;
  margin: 0;
  border-collapse: collapse;
  font-size: 14px;
}
.r2md-article thead,
.r2md-article tbody {
  width: 100%;
}
.r2md-article tr {
  border: 1px solid #dce3eb;
}
.r2md-article th,
.r2md-article td {
  padding: 10px 12px;
  border: 1px solid #dce3eb;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
.r2md-article th {
  background: #eef3f7;
  color: #172033;
}
.r2md-article code {
  padding: 2px 6px;
  border-radius: 4px;
  background: #eef2f6;
  color: #1c5d72;
  font-family: "SFMono-Regular", Consolas, monospace;
}
.r2md-article pre {
  overflow: auto;
  margin: 22px 0;
  padding: 16px;
  border-radius: 6px;
  background: #f3f6f9;
}
.r2md-article pre code {
  padding: 0;
  background: transparent;
  color: inherit;
}
.r2md-article img {
  display: block;
  max-width: 100%;
  margin: 22px auto;
  border-radius: 6px;
}
`,
  },
  {
    id: "tech",
    name: "Tech",
    description: "A precise engineering style with crisp contrast and blue accents.",
    tokens: techTokens,
    css: `
.r2md-article {
  color: #18212f;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.72;
  letter-spacing: 0;
}
.r2md-article h1 {
  margin: 0 0 26px;
  color: #0f172a;
  font-size: 32px;
  line-height: 1.18;
}
.r2md-article h1::after {
  content: "";
  display: block;
  width: 72px;
  height: 4px;
  margin-top: 14px;
  background: #168aad;
}
.r2md-article h2 {
  margin: 34px 0 16px;
  padding-left: 12px;
  border-left: 4px solid #168aad;
  color: #102033;
  font-size: 23px;
}
.r2md-article h3 {
  margin: 26px 0 10px;
  color: #23566b;
  font-size: 18px;
}
.r2md-article p {
  margin: 14px 0;
}
.r2md-article a {
  color: #0b7285;
  font-weight: 700;
}
.r2md-article blockquote {
  margin: 22px 0;
  padding: 14px 18px;
  color: #334155;
  background: #eef9fb;
  border: 1px solid #c5ebf2;
}
.r2md-article .r2md-table-scroll {
  width: 100%;
  overflow-x: auto;
  margin: 22px 0;
}
.r2md-article table {
  width: 100%;
  min-width: 560px;
  margin: 0;
  border-collapse: collapse;
  font-size: 14px;
}
.r2md-article thead,
.r2md-article tbody {
  width: 100%;
}
.r2md-article tr {
  border: 1px solid #d5e4ea;
}
.r2md-article th,
.r2md-article td {
  padding: 11px 12px;
  border: 1px solid #d5e4ea;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
.r2md-article th {
  color: #0f4c5c;
  background: #e8f6f9;
}
.r2md-article code {
  padding: 2px 6px;
  border-radius: 4px;
  background: #e8f6f9;
  color: #07576c;
  font-family: "SFMono-Regular", Consolas, monospace;
}
.r2md-article pre {
  overflow: auto;
  margin: 22px 0;
  padding: 18px;
  border-radius: 6px;
  background: #0f172a;
}
.r2md-article pre code {
  padding: 0;
  background: transparent;
  color: #dce9f2;
}
.r2md-article img {
  display: block;
  max-width: 100%;
  margin: 24px auto;
  border-radius: 4px;
}
`,
  },
  {
    id: "wechat-card",
    name: "WeChat Card",
    description: "A warm card-like article style designed for public account pasting.",
    tokens: wechatCardTokens,
    css: `
.r2md-article {
  color: #2e2a25;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  line-height: 1.85;
  letter-spacing: 0;
  counter-reset: r2md-h2;
}
.r2md-article h1 {
  margin: 0 0 24px;
  padding: 18px 20px;
  color: #2a2118;
  font-size: 28px;
  line-height: 1.28;
  background: #f7efe5;
  border: 1px solid #ead8c4;
}
.r2md-article h2 {
  margin: 34px 0 16px;
  color: #5d3f25;
  font-size: 22px;
  counter-increment: r2md-h2;
}
.r2md-article h2::before {
  content: counter(r2md-h2, decimal-leading-zero);
  display: inline-block;
  min-width: 28px;
  margin-right: 10px;
  padding: 1px 7px;
  color: #ffffff;
  background: #95633a;
  font-size: 12px;
  vertical-align: middle;
}
.r2md-article h3 {
  margin: 26px 0 10px;
  color: #725436;
  font-size: 18px;
}
.r2md-article p {
  margin: 14px 0;
}
.r2md-article strong {
  color: #8b4d22;
}
.r2md-article a {
  color: #8b4d22;
  text-decoration: none;
  border-bottom: 1px dashed #c49a72;
}
.r2md-article blockquote {
  margin: 22px 0;
  padding: 16px 18px;
  color: #5c4b3a;
  background: #fbf6ef;
  border-left: 5px solid #c49a72;
}
.r2md-article .r2md-table-scroll {
  width: 100%;
  overflow-x: auto;
  margin: 22px 0;
}
.r2md-article table {
  width: 100%;
  min-width: 560px;
  margin: 0;
  border-collapse: collapse;
  font-size: 14px;
}
.r2md-article thead,
.r2md-article tbody {
  width: 100%;
}
.r2md-article tr {
  border: 1px solid #ead8c4;
}
.r2md-article th,
.r2md-article td {
  padding: 10px 12px;
  border: 1px solid #ead8c4;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
.r2md-article th {
  color: #5d3f25;
  background: #f7efe5;
}
.r2md-article code {
  padding: 2px 6px;
  border-radius: 4px;
  background: #f7efe5;
  color: #8b4d22;
  font-family: "SFMono-Regular", Consolas, monospace;
}
.r2md-article pre {
  overflow: auto;
  margin: 22px 0;
  padding: 16px;
  border-radius: 6px;
  background: #2a2118;
}
.r2md-article pre code {
  padding: 0;
  background: transparent;
  color: #f7efe5;
}
.r2md-article img {
  display: block;
  max-width: 100%;
  margin: 24px auto;
  border-radius: 6px;
}
`,
  },
];

export const defaultThemeId: ThemeId = "clean";

export function getThemeById(themeId: ThemeId): ThemeDefinition {
  if (themeId === "custom") {
    return buildCustomTheme(cleanTokens, "Custom");
  }
  return themes.find((theme) => theme.id === themeId) ?? themes[0];
}

export function getActiveTheme(
  themeId: ThemeId,
  customTokens: ThemeTokenInput,
  customName: string,
): ThemeDefinition {
  if (themeId === "custom") {
    return buildCustomTheme(customTokens, customName);
  }
  return getThemeById(themeId);
}

export function getBuiltinThemeTokens(themeId: Exclude<ThemeId, "custom">): ThemeTokenInput {
  const theme = getThemeById(themeId);
  return theme.tokens ?? cleanTokens;
}
