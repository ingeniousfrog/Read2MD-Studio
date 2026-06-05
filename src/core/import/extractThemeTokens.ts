import {
  normalizeThemeTokens,
  wechatNativeTokens,
  type ThemeTokenInput,
} from "../theme/themeTokens";
import { getBuiltinThemeTokens } from "../theme/themes";
import type { ImportUrlKind } from "./fetchImportUrl";

const COLOR_PATTERN =
  /(?:^|;)\s*(?:color|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\))/gi;

const WECHAT_LINK_COLOR = "#576b95";

function normalizeColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();

  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }

  const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(trimmed);
  if (rgbMatch) {
    const toHex = (part: string) => Number(part).toString(16).padStart(2, "0");
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  return null;
}

function colorChannels(hex: string): { r: number; g: number; b: number } | null {
  if (!/^#[0-9a-f]{6}$/.test(hex)) {
    return null;
  }

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function isNeutralTextColor(hex: string): boolean {
  const channels = colorChannels(hex);
  if (!channels) {
    return false;
  }

  const { r, g, b } = channels;
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return maxDiff <= 48 && luminance <= 210;
}

function isAccentColor(hex: string): boolean {
  const channels = colorChannels(hex);
  if (!channels) {
    return false;
  }

  const { r, g, b } = channels;
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  return maxDiff > 55 && r > g + 20;
}

function extractColorsFromHtml(contentHtml: string): string[] {
  const colors: string[] = [];
  let match: RegExpExecArray | null = COLOR_PATTERN.exec(contentHtml);

  while (match) {
    const normalized = normalizeColor(match[1]);
    if (normalized) {
      colors.push(normalized);
    }
    match = COLOR_PATTERN.exec(contentHtml);
  }

  COLOR_PATTERN.lastIndex = 0;
  return colors;
}

function pickMostCommon(values: string[], filter?: (value: string) => boolean): string | null {
  const filtered = filter ? values.filter(filter) : values;
  if (filtered.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const value of filtered) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let winner = filtered[0];
  let max = 0;
  for (const [value, count] of counts) {
    if (count > max) {
      max = count;
      winner = value;
    }
  }

  return winner;
}

function extractColorFromStyledElements(document: Document, selectors: string): string | null {
  for (const element of document.querySelectorAll(selectors)) {
    const style = element.getAttribute("style") ?? "";
    const match = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    if (match) {
      const normalized = normalizeColor(match[1]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function extractFontFamily(contentHtml: string): string | null {
  const match = /font-family\s*:\s*([^;"]+)/i.exec(contentHtml);
  if (!match) {
    return null;
  }

  const family = match[1].trim();
  return family.length > 0 ? family : null;
}

function extractLinkColor(document: Document): string | null {
  const anchor = document.querySelector("a[style*='color']");
  if (!anchor) {
    return null;
  }

  const style = anchor.getAttribute("style") ?? "";
  const match = /color\s*:\s*([^;]+)/i.exec(style);
  return match ? normalizeColor(match[1]) : null;
}

function extractWechatBodyColor(document: Document, contentHtml: string): string {
  const paragraphColors: string[] = [];

  for (const element of document.querySelectorAll("p, section, span")) {
    const style = element.getAttribute("style") ?? "";
    const match = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    if (!match) {
      continue;
    }

    const normalized = normalizeColor(match[1]);
    if (normalized && isNeutralTextColor(normalized) && !isAccentColor(normalized)) {
      paragraphColors.push(normalized);
    }
  }

  const fromParagraphs = pickMostCommon(paragraphColors);
  if (fromParagraphs) {
    return fromParagraphs;
  }

  const neutralColors = extractColorsFromHtml(contentHtml).filter(
    (color) => isNeutralTextColor(color) && !isAccentColor(color),
  );
  return pickMostCommon(neutralColors) ?? wechatNativeTokens.textColor;
}

function extractWechatHeadingColor(document: Document, fallback: string): string {
  for (const element of document.querySelectorAll("h1, h2, h3, span[style*='font-size']")) {
    const style = element.getAttribute("style") ?? "";
    const colorMatch = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    const sizeMatch = /font-size:\s*([\d.]+)\s*px/i.exec(style);

    if (colorMatch) {
      const normalized = normalizeColor(colorMatch[1]);
      if (normalized && isNeutralTextColor(normalized) && !isAccentColor(normalized)) {
        return normalized;
      }
    }

    if (sizeMatch && Number(sizeMatch[1]) >= 17) {
      const inherited = extractColorFromStyledElements(
        document,
        `span[style*='font-size:${sizeMatch[1]}']`,
      );
      if (inherited && isNeutralTextColor(inherited) && !isAccentColor(inherited)) {
        return inherited;
      }
    }
  }

  return fallback;
}

function extractWechatThemeTokens(contentHtml: string): ThemeTokenInput {
  const document = new DOMParser().parseFromString(
    `<div id="r2md-root">${contentHtml}</div>`,
    "text/html",
  );

  const textColor = extractWechatBodyColor(document, contentHtml);
  const headingColor = extractWechatHeadingColor(document, wechatNativeTokens.headingColor);
  const linkColor = extractLinkColor(document) ?? WECHAT_LINK_COLOR;
  const fontFamily = extractFontFamily(contentHtml) ?? wechatNativeTokens.fontFamily;

  return normalizeThemeTokens({
    ...wechatNativeTokens,
    textColor,
    mutedColor: textColor,
    headingColor,
    strongColor: headingColor,
    linkColor,
    primaryColor: linkColor,
    fontFamily,
    headingStyle: "wechat",
    h2Numbering: false,
  });
}

function chooseBaseTokens(kind?: ImportUrlKind): ThemeTokenInput {
  if (kind === "wechat") {
    return wechatNativeTokens;
  }
  return getBuiltinThemeTokens("clean");
}

export function extractThemeTokens(contentHtml: string, kind?: ImportUrlKind): ThemeTokenInput {
  if (kind === "wechat") {
    return extractWechatThemeTokens(contentHtml);
  }

  const base = chooseBaseTokens(kind);
  const document = new DOMParser().parseFromString(
    `<div id="r2md-root">${contentHtml}</div>`,
    "text/html",
  );

  const paragraphColor =
    extractColorFromStyledElements(document, "p[style*='color']") ??
    pickMostCommon(extractColorsFromHtml(contentHtml));
  const headingColor =
    extractColorFromStyledElements(document, "h1[style*='color'], h2[style*='color'], h3[style*='color']") ??
    paragraphColor;
  const linkColor = extractLinkColor(document) ?? base.linkColor;
  const fontFamily = extractFontFamily(contentHtml) ?? base.fontFamily;

  return normalizeThemeTokens({
    ...base,
    textColor: paragraphColor ?? base.textColor,
    mutedColor: paragraphColor ?? base.mutedColor,
    headingColor: headingColor ?? base.headingColor,
    strongColor: headingColor ?? base.strongColor,
    linkColor,
    primaryColor: linkColor,
    fontFamily,
  });
}

export function buildImportedThemeName(title?: string, accountName?: string): string {
  const base = title?.trim() || "Imported WeChat Theme";
  if (accountName?.trim()) {
    return `${accountName.trim()} · ${base}`;
  }
  return base;
}
