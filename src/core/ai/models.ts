import type { AiCapabilityId } from "./types";

export interface CodexModelOption {
  value: string;
  label: string;
}

export const CODEX_MODEL_OPTIONS: CodexModelOption[] = [
  { value: "", label: "默认（跟随 Codex 配置）" },
  { value: "gpt-5.5", label: "GPT-5.5" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-5-codex", label: "GPT-5 Codex" },
  { value: "o3", label: "o3" },
  { value: "o4-mini", label: "o4-mini" },
  { value: "codex-mini-latest", label: "Codex Mini" },
];

export const CAPABILITY_MODEL_LABELS: Record<AiCapabilityId, string> = {
  academic: "Academic Paper",
  mermaid: "Beautiful Mermaid",
  roleplay: "Story Roleplay",
  cowork: "Cowork 流水线",
};

export function getModelLabel(value: string): string {
  if (!value) {
    return CODEX_MODEL_OPTIONS[0].label;
  }
  return CODEX_MODEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
