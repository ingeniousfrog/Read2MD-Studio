import type { AiApplyMode } from "../core/ai/types";
import { useEditorStore } from "../store/editorStore";

interface AiResultActionsProps {
  markdown: string;
  onApplied?: () => void;
}

export function AiResultActions({ markdown, onApplied }: AiResultActionsProps) {
  const currentMarkdown = useEditorStore((state) => state.markdown);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const createDocument = useEditorStore((state) => state.createDocument);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const activeDocId = useEditorStore((state) => state.activeDocId);

  const apply = (mode: AiApplyMode) => {
    if (mode === "append") {
      const next = currentMarkdown.trim() ? `${currentMarkdown.trim()}\n\n${markdown}` : markdown;
      setMarkdown(next);
      onApplied?.();
      return;
    }

    if (mode === "replace") {
      setMarkdown(markdown);
      onApplied?.();
      return;
    }

    createDocument();
    const newDocId = useEditorStore.getState().activeDocId;
    setMarkdown(markdown);
    if (newDocId) {
      renameDocument(newDocId, "AI 生成");
    } else if (activeDocId) {
      renameDocument(activeDocId, "AI 生成");
    }
    onApplied?.();
  };

  return (
    <div className="ai-result-actions">
      <button type="button" className="ghost-button" onClick={() => apply("append")}>
        插入文末
      </button>
      <button type="button" className="ghost-button" onClick={() => apply("replace")}>
        替换全文
      </button>
      <button type="button" className="import-button" onClick={() => apply("new-doc")}>
        另存为新文档
      </button>
    </div>
  );
}
