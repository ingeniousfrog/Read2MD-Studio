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
      return "已连接 Codex，准备处理…";
    }
    if (json.type === "turn.started") {
      return "模型开始生成内容…";
    }
    if (json.type === "turn.completed") {
      return "本回合生成完成。";
    }
    if (json.type === "turn.failed") {
      return json.error?.message ?? "本回合执行失败。";
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
