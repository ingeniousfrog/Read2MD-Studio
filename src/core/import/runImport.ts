import { fetchImportUrl, type ImportUrlKind } from "./fetchImportUrl";
import { extractThemeTokens, buildImportedThemeName } from "./extractThemeTokens";
import { htmlToMarkdown } from "./htmlToMarkdown";
import type { FetchWechatFailureReason, ImportArticleResult } from "./importTypes";
import { parseGenericHtml } from "./parseGenericHtml";
import { parseWechatHtml } from "./parseWechatHtml";

function buildImportResult(
  parsed: ReturnType<typeof parseWechatHtml>,
  kind?: ImportUrlKind,
): ImportArticleResult {
  const markdown = htmlToMarkdown(parsed.contentHtml, parsed.title, parsed.codeBlocks, parsed.mathBlocks);
  const tokens = extractThemeTokens(parsed.contentHtml, kind);
  const themeName = buildImportedThemeName(parsed.title, parsed.meta.accountName);

  return {
    markdown,
    tokens,
    themeName,
    meta: parsed.meta,
  };
}

export async function runUnifiedUrlImport(url: string): Promise<
  | { ok: true; result: ImportArticleResult; kind: ImportUrlKind }
  | { ok: false; reason: FetchWechatFailureReason; message: string; verification?: boolean }
> {
  const fetched = await fetchImportUrl(url);

  if (!fetched.ok) {
    return {
      ok: false,
      reason: fetched.reason,
      message: fetched.message,
      verification: fetched.verification,
    };
  }

  try {
    const parsed =
      fetched.kind === "wechat"
        ? parseWechatHtml(fetched.html, url)
        : parseGenericHtml(fetched.html, url);

    return {
      ok: true,
      result: buildImportResult(parsed, fetched.kind),
      kind: fetched.kind,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "network",
      message: error instanceof Error ? error.message : "解析页面失败。",
    };
  }
}

/** @deprecated Use runUnifiedUrlImport */
export async function runUrlImport(url: string): Promise<
  | { ok: true; result: ImportArticleResult }
  | { ok: false; reason: FetchWechatFailureReason; message: string }
> {
  const result = await runUnifiedUrlImport(url);
  if (!result.ok) {
    return result;
  }
  return { ok: true, result: result.result };
}

export function runWechatHtmlImport(html: string, sourceUrl = ""): ImportArticleResult {
  const parsed = parseWechatHtml(html, sourceUrl);
  return buildImportResult(parsed, "wechat");
}

export function runGenericHtmlImport(html: string, sourceUrl = ""): ImportArticleResult {
  const parsed = parseGenericHtml(html, sourceUrl);
  return buildImportResult(parsed, "generic");
}

/** @deprecated Use runWechatHtmlImport or runGenericHtmlImport */
export function runHtmlImport(html: string, sourceUrl = ""): ImportArticleResult {
  return runWechatHtmlImport(html, sourceUrl);
}
