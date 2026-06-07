import i18n from "../../i18n";

export function formatCodexProgressLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const json = JSON.parse(trimmed) as {
      type?: string;
      message?: string;
      error?: { message?: string };
    };

    if (json.type === "thread.started") {
      return i18n.t("progress.threadStarted");
    }
    if (json.type === "turn.started") {
      return i18n.t("progress.turnStarted");
    }
    if (json.type === "turn.completed") {
      return i18n.t("progress.turnCompleted");
    }
    if (json.type === "turn.failed") {
      return json.error?.message ?? i18n.t("progress.turnFailed");
    }
    if (json.type === "error" && json.message) {
      return json.message;
    }
    if (json.message) {
      return json.message;
    }
  } catch {
    return trimmed;
  }

  return null;
}
