import { useEffect, useRef, useState } from "react";
import type { DocumentSource } from "../core/document/documentTypes";
import { useEditorStore } from "../store/editorStore";
import { ImportDialog } from "./ImportDialog";

interface DocumentListProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

function sourceLabel(source: DocumentSource): string {
  if (source === "wechat") {
    return "微信";
  }
  if (source === "html") {
    return "网页";
  }
  return "新建";
}

export function DocumentList({ collapsed, onToggleCollapse }: DocumentListProps) {
  const documents = useEditorStore((state) => state.documents);
  const activeDocId = useEditorStore((state) => state.activeDocId);
  const createDocument = useEditorStore((state) => state.createDocument);
  const selectDocument = useEditorStore((state) => state.selectDocument);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const removeDocument = useEditorStore((state) => state.removeDocument);
  const importUrlToNewDoc = useEditorStore((state) => state.importUrlToNewDoc);

  const [importOpen, setImportOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const startRename = (id: string, currentTitle: string) => {
    setOpenMenuId(null);
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const commitRename = () => {
    if (renamingId) {
      renameDocument(renamingId, renameValue);
      setRenamingId(null);
      setRenameValue("");
    }
  };

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  if (collapsed) {
    return (
      <aside className="document-list-pane document-list-pane-collapsed" aria-label="Document list">
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label="展开文档列表"
          onClick={onToggleCollapse}
        >
          »
        </button>
        <button type="button" className="sidebar-icon-button" title="新建" onClick={createDocument}>
          +
        </button>
        <button type="button" className="sidebar-icon-button" title="导入 URL" onClick={() => setImportOpen(true)}>
          ↓
        </button>
        {importOpen && (
          <ImportDialog onClose={() => setImportOpen(false)} onImportUrl={importUrlToNewDoc} />
        )}
      </aside>
    );
  }

  return (
    <aside className="document-list-pane" aria-label="Document list">
      <div className="document-list-header">
        <h2>我的文档</h2>
        <div className="document-list-header-actions">
          <span>{documents.length}</span>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-label="收起文档列表"
            onClick={onToggleCollapse}
          >
            «
          </button>
        </div>
      </div>

      <div className="document-list-actions">
        <button type="button" className="doc-action-primary" onClick={createDocument}>
          + 新建
        </button>
        <button type="button" className="doc-action-secondary" onClick={() => setImportOpen(true)}>
          导入 URL
        </button>
      </div>

      <div className="document-list-scroll">
        {documents.length === 0 ? (
          <div className="document-list-empty">
            <p>还没有文档</p>
            <p>点击「新建」或「导入 URL」开始写作。</p>
          </div>
        ) : (
          <ul className="document-list">
            {documents.map((doc) => (
              <li key={doc.id}>
                {renamingId === doc.id ? (
                  <div className="document-rename-form">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitRename();
                        }
                        if (event.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      autoFocus
                    />
                    <button type="button" onClick={commitRename}>
                      确定
                    </button>
                  </div>
                ) : (
                  <div
                    className="document-list-item-row"
                    ref={openMenuId === doc.id ? menuRef : undefined}
                  >
                    <button
                      type="button"
                      className={`document-list-item${
                        activeDocId === doc.id ? " document-list-item-active" : ""
                      }`}
                      onClick={() => {
                        selectDocument(doc.id);
                        setOpenMenuId(null);
                      }}
                    >
                      <span className="document-list-title">{doc.title}</span>
                      <span className="document-list-meta">
                        <span className="document-source-badge">{sourceLabel(doc.source)}</span>
                        {formatTimestamp(doc.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="document-list-item-menu-trigger"
                      aria-label={`文档操作：${doc.title}`}
                      aria-expanded={openMenuId === doc.id}
                      aria-haspopup="menu"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((prev) => (prev === doc.id ? null : doc.id));
                      }}
                    >
                      ⋯
                    </button>
                    {openMenuId === doc.id && (
                      <div className="doc-item-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => startRename(doc.id, doc.title)}
                        >
                          重命名
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="doc-item-menu-danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            removeDocument(doc.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {importOpen && (
        <ImportDialog onClose={() => setImportOpen(false)} onImportUrl={importUrlToNewDoc} />
      )}
    </aside>
  );
}
