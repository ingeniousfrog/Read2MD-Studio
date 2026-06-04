export const sampleMarkdown = `# Read2MD Studio

一间轻量的 Markdown 发布工作台，用来写作、预览、排版，并复制为公众号可粘贴 HTML。

## 核心能力

### 排版目标

这里有 **加粗文本**、*斜体文本*，也有一段 \`inline code\`，用来检查基础行内样式。

> 好的排版不是装饰，而是让读者更快进入内容。

- Markdown 编辑
- 实时预览
- 主题排版
- 公众号 HTML 内联复制

| 模块 | 当前实现 | 后续方向 |
| --- | --- | --- |
| md_core | TypeScript markdown-it | Rust / WASM |
| md_theme | TypeScript CSS theme | Rust CSS 校验 |
| md_platform | WeChat adapter | Zhihu / Juejin |

\`\`\`ts
type PublishTarget = "wechat";

export function describeTarget(target: PublishTarget) {
  return \`Copy article HTML for \${target}\`;
}
\`\`\`

![Read2MD preview image](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80)

数学公式占位文本：E = mc^2，后续可以替换为 MathJax、KaTeX 或服务端公式图片方案。
`;
