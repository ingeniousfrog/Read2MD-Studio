import type { ThemeTokenInput } from "../theme/themeTokens";
import type { CodeBlock, MathBlock } from "./wechatContentProcessor";

export type ImportStatusKind = "idle" | "loading" | "verification" | "error" | "success";

export interface ImportStatus {
  kind: ImportStatusKind;
  message: string;
}

export interface WechatArticleMeta {
  title: string;
  author: string;
  accountName: string;
  publishTime: string;
  sourceUrl: string;
}

export interface ParsedWechatArticle {
  contentHtml: string;
  title: string;
  meta: WechatArticleMeta;
  codeBlocks: CodeBlock[];
  mathBlocks: MathBlock[];
}

export interface ImportArticleResult {
  markdown: string;
  tokens: ThemeTokenInput;
  themeName: string;
  meta: WechatArticleMeta;
}

export interface ImportedArticle {
  id: string;
  url: string;
  title: string;
  accountName: string;
  createdAt: string;
  markdown: string;
  tokens: ThemeTokenInput;
  themeName: string;
}

export type FetchWechatFailureReason = "verification" | "network" | "invalid-url";

export type FetchWechatResult =
  | { ok: true; html: string }
  | { ok: false; reason: FetchWechatFailureReason; message: string };
