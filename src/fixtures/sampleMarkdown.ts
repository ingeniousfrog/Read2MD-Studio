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

## 表格兼容性测试

### 简单表格

| 名称 | 状态 | 说明 |
| --- | --- | --- |
| 编辑器 | 已完成 | 支持 Markdown 输入 |
| 预览 | 已完成 | 支持主题排版 |
| 复制 | 已完成 | 支持公众号 HTML |

### 长文本表格

| 模块 | 长文本说明 | 风险 |
| --- | --- | --- |
| 表格滚动 | 这是一段很长很长的说明文字，用来测试表格在预览区域中是否会撑爆布局，也用来测试复制到公众号时单元格 padding、border 和文字换行是否还能保留。 | 中 |
| 公式排版 | 当前使用 KaTeX 输出 HTML 和 CSS，复制到公众号时会尽量内联 CSS，但公众号后台可能仍会过滤部分复杂样式。 | 高 |

### 对齐表格

| 指标 | 数值 | 备注 |
| :--- | ---: | :---: |
| 阅读完成率 | 68% | 稳定 |
| 转发率 | 12% | 观察中 |
| 收藏率 | 23% | 较好 |

## 公式兼容性测试

行内公式：$E = mc^2$。这句话用于确认公式能和正文自然混排。

块级公式：

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

复杂公式：

$$
\\operatorname{softmax}(x_i)=\\frac{e^{x_i}}{\\sum_j e^{x_j}}
$$

\`\`\`ts
type PublishTarget = "wechat";

export function describeTarget(target: PublishTarget) {
  return \`Copy article HTML for \${target}\`;
}
\`\`\`

![Read2MD preview image](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80)
`;
