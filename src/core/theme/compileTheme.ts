import type { ThemeDefinition } from "./themes";
import type { ThemeTokenInput } from "./themeTokens";

export function compileThemeCss(tokens: ThemeTokenInput): string {
  const {
    primaryColor,
    textColor,
    mutedColor,
    backgroundColor,
    headingColor,
    linkColor,
    borderColor,
    codeBackground,
    blockquoteBackground,
    fontFamily,
    headingFontWeight,
    paragraphLineHeight,
    paragraphSpacing,
    radius,
  } = tokens;

  const tableHeaderBackground = blockquoteBackground;
  const preBackground = codeBackground;

  return `
.r2md-article {
  color: ${textColor};
  font-family: ${fontFamily};
  font-size: 16px;
  line-height: ${paragraphLineHeight};
  letter-spacing: 0;
  background: ${backgroundColor};
}
.r2md-article h1 {
  color: ${headingColor};
  font-size: 30px;
  font-weight: ${headingFontWeight};
  line-height: 1.25;
  margin: 0 0 24px;
  padding-bottom: 14px;
  border-bottom: 2px solid ${borderColor};
}
.r2md-article h2 {
  color: ${headingColor};
  font-size: 23px;
  font-weight: ${headingFontWeight};
  line-height: 1.35;
  margin: 34px 0 14px;
  padding-left: 12px;
  border-left: 4px solid ${primaryColor};
}
.r2md-article h3 {
  color: ${headingColor};
  font-size: 18px;
  font-weight: ${headingFontWeight};
  margin: 26px 0 10px;
}
.r2md-article p {
  margin: ${paragraphSpacing}px 0;
}
.r2md-article strong {
  color: ${headingColor};
}
.r2md-article em {
  color: ${mutedColor};
}
.r2md-article a {
  color: ${linkColor};
  text-decoration: none;
  border-bottom: 1px solid ${primaryColor};
}
.r2md-article blockquote {
  margin: 22px 0;
  padding: 12px 18px;
  color: ${mutedColor};
  background: ${blockquoteBackground};
  border-left: 4px solid ${primaryColor};
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
  border: 1px solid ${borderColor};
}
.r2md-article th,
.r2md-article td {
  padding: 10px 12px;
  border: 1px solid ${borderColor};
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}
.r2md-article th {
  background: ${tableHeaderBackground};
  color: ${headingColor};
}
.r2md-article code {
  padding: 2px 6px;
  border-radius: ${radius}px;
  background: ${codeBackground};
  color: ${primaryColor};
  font-family: "SFMono-Regular", Consolas, monospace;
}
.r2md-article pre {
  overflow: auto;
  margin: 22px 0;
  padding: 16px;
  border-radius: ${radius}px;
  background: ${preBackground};
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
  border-radius: ${radius}px;
}
`;
}

export function buildCustomTheme(tokens: ThemeTokenInput, name: string): ThemeDefinition {
  return {
    id: "custom",
    name,
    description: "A custom theme compiled from user-defined tokens.",
    css: compileThemeCss(tokens),
    tokens,
    isCustom: true,
  };
}
