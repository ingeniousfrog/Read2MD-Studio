import type { AiActionId, RoleplayPresetId } from "./types";

const OUTPUT_RULES = `
你必须只输出 Markdown 正文，不要输出解释、前言或后记。
不要执行任何 shell 命令，不要读写文件，不要调用工具。
如果原文包含代码块或公式，尽量保留其语义与结构。
`.trim();

export interface RoleplayPreset {
  id: RoleplayPresetId;
  label: string;
  description: string;
}

export const ROLEPLAY_PRESETS: RoleplayPreset[] = [
  {
    id: "academic",
    label: "学术严谨",
    description: "论文/技术报告风格，逻辑严密、术语准确。",
  },
  {
    id: "wechat",
    label: "公众号·轻松语气",
    description: "适合微信公众号，口语化、段落短、有节奏感。",
  },
  {
    id: "xiaohongshu",
    label: "小红书种草",
    description: "轻松活泼、要点突出、适合社交传播。",
  },
  {
    id: "tech-evangelist",
    label: "技术布道",
    description: "面向开发者，强调价值、场景与可实践性。",
  },
  {
    id: "custom",
    label: "自定义风格",
    description: "按用户填写的风格说明改写。",
  },
];

export interface AiActionDefinition {
  id: AiActionId;
  capability: "academic" | "mermaid" | "roleplay" | "cowork";
  label: string;
  description: string;
}

export const AI_ACTIONS: AiActionDefinition[] = [
  {
    id: "academic:structure",
    capability: "academic",
    label: "结构化整理",
    description: "将长文整理为适合发布的结构化 Markdown（标题层级、段落、列表）。",
  },
  {
    id: "academic:summarize",
    capability: "academic",
    label: "长文摘要",
    description: "生成 Executive Summary + 关键要点列表，保留原文核心信息。",
  },
  {
    id: "academic:toc",
    capability: "academic",
    label: "生成目录",
    description: "根据内容生成 H1–H6 目录结构，并适度调整标题层级。",
  },
  {
    id: "mermaid:flowchart",
    capability: "mermaid",
    label: "流程图",
    description: "将核心流程转为 Mermaid flowchart 代码块。",
  },
  {
    id: "mermaid:sequence",
    capability: "mermaid",
    label: "时序图",
    description: "将交互/步骤转为 Mermaid sequenceDiagram 代码块。",
  },
  {
    id: "mermaid:mindmap",
    capability: "mermaid",
    label: "思维导图",
    description: "将知识结构转为 Mermaid mindmap 代码块。",
  },
  {
    id: "roleplay:academic",
    capability: "roleplay",
    label: "学术严谨",
    description: "按学术风格改写全文。",
  },
  {
    id: "roleplay:wechat",
    capability: "roleplay",
    label: "公众号·轻松语气",
    description: "按公众号轻松语气改写全文，口语化、段落短、易读。",
  },
  {
    id: "roleplay:xiaohongshu",
    capability: "roleplay",
    label: "小红书种草",
    description: "按小红书风格改写全文。",
  },
  {
    id: "roleplay:tech-evangelist",
    capability: "roleplay",
    label: "技术布道",
    description: "按技术布道风格改写全文。",
  },
  {
    id: "roleplay:custom",
    capability: "roleplay",
    label: "自定义风格",
    description: "按自定义风格说明改写全文。",
  },
];

export const COWORK_PIPELINE: AiActionId[] = [
  "academic:structure",
  "mermaid:flowchart",
  "roleplay:wechat",
];

const ROLEPLAY_STYLE: Record<Exclude<RoleplayPresetId, "custom">, string> = {
  academic: "学术严谨：逻辑清晰、术语准确、客观中立，适合论文与技术报告。",
  wechat: "公众号·轻松语气：口语化、段落短、有节奏感，适合微信读者快速阅读。",
  xiaohongshu: "小红书种草：活泼、有感染力、要点突出，适合社交传播。",
  "tech-evangelist": "技术布道：面向开发者，强调价值、场景、可实践性与示例。",
};

function wrapDocument(markdown: string): string {
  return `以下是当前文档的 Markdown 内容：

\`\`\`markdown
${markdown}
\`\`\``;
}

export function buildPrompt(
  actionId: AiActionId,
  markdown: string,
  customStyle?: string,
): string {
  const doc = wrapDocument(markdown);

  switch (actionId) {
    case "academic:structure":
      return `${OUTPUT_RULES}

请对以下长文/论文内容进行结构化整理，输出适合发布的 Markdown：
- 合理设置 H1–H3 标题层级
- 长段落拆分为易读短段
- 关键论点用列表呈现
- 保留代码块、公式、引用等语义

${doc}`;

    case "academic:summarize":
      return `${OUTPUT_RULES}

请为以下内容生成摘要版 Markdown，结构如下：
1. ## 摘要（2–4 段）
2. ## 关键要点（bullet list，5–10 条）
3. ## 结论（1 段）

${doc}`;

    case "academic:toc":
      return `${OUTPUT_RULES}

请根据以下内容生成带完整目录结构的 Markdown：
- 在文首插入目录（链接到各标题）
- 调整并补全 H1–H6 标题层级
- 正文保持原意，可适度精简冗余

${doc}`;

    case "mermaid:flowchart":
      return `${OUTPUT_RULES}

请阅读以下内容，提取核心流程，在文首插入一个 \`\`\`mermaid 代码块（flowchart TD 或 LR），
并在代码块后附 1–2 段简要说明。保留原文其余内容。
Mermaid 语法要求：节点文字若含方括号、竖线等特殊字符，必须用双引号包裹标签，例如 C["设计 dp[i] 状态"]。

${doc}`;

    case "mermaid:sequence":
      return `${OUTPUT_RULES}

请阅读以下内容，提取关键交互步骤，在文首插入一个 \`\`\`mermaid 代码块（sequenceDiagram），
并在代码块后附 1–2 段简要说明。保留原文其余内容。

${doc}`;

    case "mermaid:mindmap":
      return `${OUTPUT_RULES}

请阅读以下内容，提炼知识结构，在文首插入一个 \`\`\`mermaid 代码块（mindmap），
并在代码块后附 1–2 段简要说明。保留原文其余内容。

${doc}`;

    case "roleplay:custom":
      return `${OUTPUT_RULES}

请按以下风格改写全文：
${customStyle?.trim() || "保持专业、清晰、易读。"}

${doc}`;

    default:
      if (actionId.startsWith("roleplay:")) {
        const presetId = actionId.replace("roleplay:", "") as Exclude<RoleplayPresetId, "custom">;
        const style = ROLEPLAY_STYLE[presetId] ?? ROLEPLAY_STYLE.academic;
        return `${OUTPUT_RULES}

请按以下风格改写全文：
${style}

${doc}`;
      }

      return `${OUTPUT_RULES}

请优化以下 Markdown 内容，使其更适合发布：

${doc}`;
  }
}

export function getActionDefinition(actionId: AiActionId): AiActionDefinition | undefined {
  return AI_ACTIONS.find((action) => action.id === actionId);
}

export function getCoworkStepLabels(): { actionId: AiActionId; label: string }[] {
  return COWORK_PIPELINE.map((actionId) => {
    const def = getActionDefinition(actionId);
    return {
      actionId,
      label: def?.label ?? actionId,
    };
  });
}

export const COWORK_CAPABILITY_GROUPS: {
  capability: AiActionDefinition["capability"];
  label: string;
}[] = [
  { capability: "academic", label: "论文结构化" },
  { capability: "mermaid", label: "Mermaid 图解" },
  { capability: "roleplay", label: "风格改写" },
];

export function getCoworkEligibleActions(capability: AiActionDefinition["capability"]): AiActionDefinition[] {
  return AI_ACTIONS.filter((action) => action.capability === capability);
}
