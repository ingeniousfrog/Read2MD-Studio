export type AiCapabilityId = "academic" | "mermaid" | "roleplay" | "cowork";

export type AcademicActionId = "structure" | "summarize" | "toc";

export type MermaidActionId = "flowchart" | "sequence" | "mindmap";

export type RoleplayPresetId =
  | "academic"
  | "wechat"
  | "xiaohongshu"
  | "tech-evangelist"
  | "custom";

export type AiActionId =
  | `academic:${AcademicActionId}`
  | `mermaid:${MermaidActionId}`
  | `roleplay:${RoleplayPresetId}`
  | "cowork:pipeline";

export type CoworkStepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface CoworkStep {
  id: string;
  actionId: AiActionId;
  label: string;
  status: CoworkStepStatus;
  error?: string;
  resultMarkdown?: string;
  resultId?: string;
}

export interface AiResultRecord {
  id: string;
  actionId: AiActionId;
  label: string;
  ok: boolean;
  markdown: string;
  error?: string;
  createdAt: string;
}

export interface AiActionResult {
  ok: boolean;
  markdown: string;
  actionId: AiActionId;
  error?: string;
}

export type CapabilityModels = Record<AiCapabilityId, string>;

export interface RunAiActionOptions {
  markdown: string;
  customStyle?: string;
  codexPath?: string;
  model?: string;
  onProgress?: (line: string) => void;
}

export function getCapabilityFromAction(actionId: AiActionId): AiCapabilityId {
  if (actionId === "cowork:pipeline") {
    return "cowork";
  }
  if (actionId.startsWith("academic:")) {
    return "academic";
  }
  if (actionId.startsWith("mermaid:")) {
    return "mermaid";
  }
  return "roleplay";
}

export type AiApplyMode = "append" | "replace" | "new-doc";
