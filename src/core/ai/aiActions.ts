import { codexExec } from "./codexClient";
import { buildPrompt } from "./presets";
import type { AiActionId, AiActionResult, RunAiActionOptions } from "./types";

function stripMarkdownFence(value: string): string {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

export async function runAiAction(
  actionId: AiActionId,
  options: RunAiActionOptions,
): Promise<AiActionResult> {
  const prompt = buildPrompt(actionId, options.markdown, options.customStyle);

  try {
    const result = await codexExec({
      prompt,
      model: options.model,
      codexPath: options.codexPath,
      onProgress: options.onProgress,
    });

    if (!result.ok) {
      return {
        ok: false,
        markdown: "",
        actionId,
        error: result.error ?? "Codex 执行失败。",
      };
    }

    return {
      ok: true,
      markdown: stripMarkdownFence(result.output),
      actionId,
    };
  } catch (error) {
    return {
      ok: false,
      markdown: "",
      actionId,
      error: error instanceof Error ? error.message : "AI 动作执行失败。",
    };
  }
}
