import { useTranslation } from "react-i18next";
import type { AiApplyMode } from "../core/ai/types";
import { useEditorStore } from "../store/editorStore";

interface AiResultActionsProps {
  markdown: string;
  onApplied?: () => void;
}

export function AiResultActions({ markdown, onApplied }: AiResultActionsProps) {
  const { t } = useTranslation();
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
      renameDocument(newDocId, t("ai.newDocTitle"));
    } else if (activeDocId) {
      renameDocument(activeDocId, t("ai.newDocTitle"));
    }
    onApplied?.();
  };

  return (
    <div className="ai-result-actions">
      <button type="button" className="ghost-button" onClick={() => apply("append")}>
        {t("ai.append")}
      </button>
      <button type="button" className="ghost-button" onClick={() => apply("replace")}>
        {t("ai.replace")}
      </button>
      <button type="button" className="import-button" onClick={() => apply("new-doc")}>
        {t("ai.saveAsNew")}
      </button>
    </div>
  );
}
