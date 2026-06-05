import type { ThemeDefinition } from "./themes";
import type { HeadingLevelConfig, HeadingStyle, ThemeTokenInput } from "./themeTokens";
import { getHeadingLevel } from "./themeTokens";

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

function headingMargin(level: number): string {
  if (level === 1) {
    return "0 0 24px";
  }
  if (level === 2) {
    return "30px 0 14px";
  }
  if (level === 3) {
    return "24px 0 10px";
  }
  if (level === 4) {
    return "20px 0 8px";
  }
  if (level === 5) {
    return "18px 0 8px";
  }
  return "16px 0 8px";
}

function buildGenericHeadingRule(level: HeadingLevelConfig): string {
  return `
.r2md-article h${level.level} {
  margin: ${headingMargin(level.level)};
  color: ${level.color};
  font-size: ${level.fontSize}px;
  font-weight: ${level.fontWeight};
  line-height: 1.35;
}`;
}

function buildStyledHeadingRule(
  level: HeadingLevelConfig,
  tokens: ThemeTokenInput,
): string {
  const { headingStyle, primaryColor, borderColor, blockquoteBackground } = tokens;
  const tag = `h${level.level}`;
  const base = `color: ${level.color}; font-size: ${level.fontSize}px; font-weight: ${level.fontWeight};`;

  if (headingStyle === "wechat") {
    return `
.r2md-article ${tag} {
  margin: ${headingMargin(level.level)};
  ${base}
  line-height: 1.4;
}`;
  }

  if (headingStyle === "card" && level.level === 1) {
    return `
.r2md-article h1 {
  margin: 0 0 24px;
  padding: 18px 20px;
  ${base}
  line-height: 1.28;
  background: ${blockquoteBackground};
  border: 1px solid ${borderColor};
}`;
  }

  if (headingStyle === "accent-bar" && level.level === 1) {
    return `
.r2md-article h1 {
  margin: 0 0 26px;
  ${base}
  line-height: 1.18;
}
.r2md-article h1::after {
  content: "";
  display: block;
  width: 72px;
  height: 4px;
  margin-top: 14px;
  background: ${primaryColor};
}`;
  }

  if (headingStyle === "accent-bar" && level.level === 2) {
    return `
.r2md-article h2 {
  margin: 34px 0 16px;
  padding-left: 12px;
  border-left: 4px solid ${primaryColor};
  ${base}
}`;
  }

  if (headingStyle === "editorial" && level.level === 1) {
    return `
.r2md-article h1 {
  ${base}
  line-height: 1.25;
  margin: 0 0 24px;
  padding-bottom: 14px;
  border-bottom: 2px solid ${borderColor};
}`;
  }

  if (level.level <= 3) {
    return buildGenericHeadingRule(level);
  }

  return buildGenericHeadingRule(level);
}

function buildHeadingCss(tokens: ThemeTokenInput): string {
  const { headingStyle, primaryColor, h2Numbering, headingLevels } = tokens;
  const sortedLevels = [...headingLevels].sort((a, b) => a.level - b.level);

  const counterCss =
    h2Numbering && sortedLevels.some((entry) => entry.level === 2)
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
${headingStyle === "card" ? h2BadgeCss(primaryColor) : h2BadgeCss(primaryColor)}`
      : "";

  const rules = sortedLevels
    .map((level) => buildStyledHeadingRule(getHeadingLevel(tokens, level.level), tokens))
    .join("\n");

  return `${rules}${counterCss}`;
}

function buildFormulaCss(tokens: ThemeTokenInput): string {
  const {
    formulaColor,
    formulaFontScale,
    formulaBackground,
    formulaCardEnabled,
    formulaCardBorderColor,
    formulaCardRadius,
    formulaCardPadding,
    baseFontSize,
  } = tokens;

  const fontSize = Math.round(baseFontSize * formulaFontScale);
  const cardStyles = formulaCardEnabled
    ? `
  padding: ${formulaCardPadding}px;
  background: ${formulaBackground};
  border: 1px solid ${formulaCardBorderColor};
  border-radius: ${formulaCardRadius}px;`
    : "";

  return `
.r2md-article .r2md-formula-block {
  margin: 18px 0;
  text-align: center;
  overflow-x: auto;
  color: ${formulaColor};
  font-size: ${fontSize}px;${cardStyles}
}
.r2md-article .r2md-formula-block svg {
  color: ${formulaColor};
}
.r2md-article .r2md-formula-inline {
  display: inline;
  color: ${formulaColor};
  font-size: ${fontSize}px;
  vertical-align: middle;
}
.r2md-article .r2md-formula-inline svg {
  color: ${formulaColor};
}
.r2md-article .r2md-formula-error {
  color: #a33934;
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
    codeFontSize,
    codeTextColor,
    imageRadius,
    imageBorderColor,
    imageShadow,
    imageCaptionColor,
  } = tokens;

  const linkDecoration =
    headingStyle === "card" ? "dashed" : headingStyle === "wechat" ? "none" : "solid";
  const blockquoteBorderWidth = headingStyle === "card" ? 5 : 4;
  const imageShadowCss = imageShadow
    ? "box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);"
    : "";
  const imageBorderCss =
    imageBorderColor !== "transparent" ? `border: 1px solid ${imageBorderColor};` : "";

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
${buildFormulaCss(tokens)}
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
  font-size: ${codeFontSize}px;
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
  color: ${codeTextColor};
  font-size: ${codeFontSize}px;
}
.r2md-article img {
  display: block;
  max-width: 100%;
  margin: 22px auto;
  border-radius: ${imageRadius}px;
  ${imageBorderCss}
  ${imageShadowCss}
}
.r2md-article figcaption,
.r2md-article .r2md-image-caption {
  margin-top: 8px;
  color: ${imageCaptionColor};
  font-size: 13px;
  text-align: center;
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
    return "卡片风";
  }
  if (style === "accent-bar") {
    return "强调条";
  }
  return "编辑风";
}
