import type { ThemeDefinition } from "./themes";
import type { HeadingStyle, ThemeTokenInput } from "./themeTokens";

function h2BadgeCss(primaryColor: string): string {
  return `
.r2md-article .r2md-h2-badge,
.r2md-article h2::before {
  display: inline-block;
  min-width: 28px;
  margin-right: 10px;
  padding: 1px 7px;
  color: #ffffff;
  background: ${primaryColor};
  font-size: 12px;
  vertical-align: middle;
}`;
}

function buildHeadingCss(tokens: ThemeTokenInput): string {
  const {
    headingStyle,
    headingColor,
    headingFontWeight,
    h1FontSize,
    h2FontSize,
    h3FontSize,
    primaryColor,
    borderColor,
    blockquoteBackground,
    h2Numbering,
  } = tokens;

  if (headingStyle === "wechat") {
    return `
.r2md-article h1 {
  margin: 0 0 20px;
  color: ${headingColor};
  font-size: ${h1FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.4;
}
.r2md-article h2 {
  margin: 28px 0 12px;
  color: ${headingColor};
  font-size: ${h2FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.4;
}
.r2md-article h3 {
  margin: 20px 0 10px;
  color: ${headingColor};
  font-size: ${h3FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.4;
}`;
  }

  if (headingStyle === "card") {
    const counterCss = h2Numbering
      ? `
.r2md-article {
  counter-reset: r2md-h2;
}
.r2md-article h2 {
  counter-increment: r2md-h2;
}
.r2md-article h2::before {
  content: counter(r2md-h2, decimal-leading-zero);
}
${h2BadgeCss(primaryColor)}`
      : "";

    return `
.r2md-article h1 {
  margin: 0 0 24px;
  padding: 18px 20px;
  color: ${headingColor};
  font-size: ${h1FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.28;
  background: ${blockquoteBackground};
  border: 1px solid ${borderColor};
}
.r2md-article h2 {
  margin: 34px 0 16px;
  color: ${primaryColor};
  font-size: ${h2FontSize}px;
  font-weight: ${headingFontWeight};
}
.r2md-article h3 {
  margin: 26px 0 10px;
  color: ${headingColor};
  font-size: ${h3FontSize}px;
  font-weight: ${headingFontWeight};
}
${counterCss}`;
  }

  if (headingStyle === "accent-bar") {
    return `
.r2md-article h1 {
  margin: 0 0 26px;
  color: ${headingColor};
  font-size: ${h1FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.18;
}
.r2md-article h1::after {
  content: "";
  display: block;
  width: 72px;
  height: 4px;
  margin-top: 14px;
  background: ${primaryColor};
}
.r2md-article h2 {
  margin: 34px 0 16px;
  padding-left: 12px;
  border-left: 4px solid ${primaryColor};
  color: ${headingColor};
  font-size: ${h2FontSize}px;
  font-weight: ${headingFontWeight};
}
.r2md-article h3 {
  margin: 26px 0 10px;
  color: ${primaryColor};
  font-size: ${h3FontSize}px;
  font-weight: ${headingFontWeight};
}`;
  }

  return `
.r2md-article h1 {
  color: ${headingColor};
  font-size: ${h1FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.25;
  margin: 0 0 24px;
  padding-bottom: 14px;
  border-bottom: 2px solid ${borderColor};
}
.r2md-article h2 {
  color: ${headingColor};
  font-size: ${h2FontSize}px;
  font-weight: ${headingFontWeight};
  line-height: 1.35;
  margin: 34px 0 14px;
}
.r2md-article h3 {
  color: ${headingColor};
  font-size: ${h3FontSize}px;
  font-weight: ${headingFontWeight};
  margin: 26px 0 10px;
}`;
}

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
    paragraphLineHeight,
    paragraphSpacing,
    radius,
    baseFontSize,
    strongColor,
    preBackground,
    headingStyle,
  } = tokens;

  const linkDecoration =
    headingStyle === "card" ? "dashed" : headingStyle === "wechat" ? "none" : "solid";
  const blockquoteBorderWidth = headingStyle === "card" ? 5 : 4;
  const preCodeColor = headingStyle === "card" ? blockquoteBackground : "inherit";

  return `
.r2md-article {
  color: ${textColor};
  font-family: ${fontFamily};
  font-size: ${baseFontSize}px;
  line-height: ${paragraphLineHeight};
  letter-spacing: 0;
  background: ${backgroundColor};
}
${buildHeadingCss(tokens)}
.r2md-article p {
  margin: ${paragraphSpacing}px 0;
}
.r2md-article strong {
  color: ${strongColor};
}
.r2md-article em {
  color: ${mutedColor};
}
.r2md-article a {
  color: ${linkColor};
  text-decoration: none;
  ${linkDecoration === "none" ? "" : `border-bottom: 1px ${linkDecoration} ${primaryColor};`}
}
.r2md-article blockquote {
  margin: 22px 0;
  padding: ${headingStyle === "card" ? "16px 18px" : "12px 18px"};
  color: ${mutedColor};
  background: ${blockquoteBackground};
  border-left: ${blockquoteBorderWidth}px solid ${primaryColor};
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
  background: ${blockquoteBackground};
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
  color: ${preCodeColor};
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

export function headingStyleLabel(style: HeadingStyle): string {
  if (style === "wechat") {
    return "公众号原文风";
  }
  if (style === "card") {
    return "卡片风（排版模板）";
  }
  if (style === "accent-bar") {
    return "强调条（科技风）";
  }
  return "编辑风（简洁）";
}
