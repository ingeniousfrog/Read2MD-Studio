import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { editorImageExtension } from "./editorImageExtension";
import { useEditorStore } from "../store/editorStore";

interface EditorPaneProps {
  markdownValue: string;
  onMarkdownChange: (markdownValue: string) => void;
}

export function EditorPane({ markdownValue, onMarkdownChange }: EditorPaneProps) {
  const activeDocId = useEditorStore((state) => state.activeDocId);
  const assetFiles = useEditorStore((state) => {
    const doc = state.documents.find((entry) => entry.id === state.activeDocId);
    return doc?.assetFiles ?? [];
  });
  const registerAssetFile = useEditorStore((state) => state.registerAssetFile);
  const setCopyStatus = useEditorStore((state) => state.setCopyStatus);

  const extensions = useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
      editorImageExtension({
        docId: activeDocId,
        markdown: markdownValue,
        assetFiles,
        onImageInserted: registerAssetFile,
        onError: (message) => setCopyStatus("error", message),
      }),
    ],
    [activeDocId, markdownValue, assetFiles, registerAssetFile, setCopyStatus],
  );

  return (
    <section className="pane editor-pane" aria-label="Markdown editor">
      <div className="pane-header">
        <span>Markdown</span>
      </div>
      <CodeMirror
        value={markdownValue}
        height="100%"
        extensions={extensions}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
        }}
        onChange={onMarkdownChange}
        className="markdown-editor"
      />
    </section>
  );
}
