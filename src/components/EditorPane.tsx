import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";

interface EditorPaneProps {
  markdownValue: string;
  onMarkdownChange: (markdownValue: string) => void;
}

export function EditorPane({ markdownValue, onMarkdownChange }: EditorPaneProps) {
  return (
    <section className="pane editor-pane" aria-label="Markdown editor">
      <div className="pane-header">
        <span>Markdown</span>
      </div>
      <CodeMirror
        value={markdownValue}
        height="100%"
        extensions={[markdown(), EditorView.lineWrapping]}
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
