import i18n from "../../i18n";
import { isTauriRuntime } from "../import/tauriRuntime";
import type { PlatformOutput } from "../platform/commonAdapter";

export type CopyMode = "html" | "plain-text-fallback";

export interface CopyResult {
  ok: boolean;
  mode: CopyMode;
  message: string;
}

export async function copyHtml(output: PlatformOutput): Promise<CopyResult> {
  if (isTauriRuntime()) {
    try {
      const { writeHtml } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeHtml(output.html, output.plainText);
      return {
        ok: true,
        mode: "html",
        message: i18n.t("copy.htmlCopied"),
      };
    } catch (error) {
      try {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(output.plainText);
        return {
          ok: true,
          mode: "plain-text-fallback",
          message: i18n.t("copy.plainTextFallback"),
        };
      } catch {
        const message = error instanceof Error ? error.message : i18n.t("export.copyPermissionFailed");
        return {
          ok: false,
          mode: "plain-text-fallback",
          message,
        };
      }
    }
  }

  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return {
      ok: false,
      mode: "plain-text-fallback",
      message: i18n.t("copy.clipboardUnsupported"),
    };
  }

  if ("ClipboardItem" in window) {
    const ClipboardItemConstructor = window.ClipboardItem;
    const clipboardItem = new ClipboardItemConstructor({
      "text/html": new Blob([output.html], { type: "text/html" }),
      "text/plain": new Blob([output.plainText], { type: "text/plain" }),
    });

    await navigator.clipboard.write([clipboardItem]);

    return {
      ok: true,
      mode: "html",
      message: i18n.t("copy.htmlCopied"),
    };
  }

  await navigator.clipboard.writeText(output.plainText);

  return {
    ok: true,
    mode: "plain-text-fallback",
    message: i18n.t("copy.plainTextFallback"),
  };
}
