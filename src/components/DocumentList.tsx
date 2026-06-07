import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

function sourceLabel(source: DocumentSource, t: (key: string) => string): string {
  if (source === "wechat") {
    return t("document.sourceWechat");
  }
  if (source === "html") {
    return t("document.sourceHtml");
  }
  return t("document.sourceBlank");
}

export function DocumentList({ collapsed, onToggleCollapse }: DocumentListProps) {
  const { t } = useTranslation();
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
          aria-label={t("document.expandList")}
          onClick={onToggleCollapse}
        >
          »
        </button>
        <button type="button" className="sidebar-icon-button" title={t("document.newDoc")} onClick={createDocument}>
          +
        </button>
        <button type="button" className="sidebar-icon-button" title={t("document.importUrl")} onClick={() => setImportOpen(true)}>
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
        <h2>{t("document.myDocuments")}</h2>
        <div className="document-list-header-actions">
          <span>{documents.length}</span>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-label={t("document.collapseList")}
            onClick={onToggleCollapse}
          >
            «
          </button>
        </div>
      </div>

      <div className="document-list-actions">
        <button type="button" className="doc-action-primary" onClick={createDocument}>
          {t("document.newDocButton")}
        </button>
        <button type="button" className="doc-action-secondary" onClick={() => setImportOpen(true)}>
          {t("document.importUrl")}
        </button>
      </div>

      <div className="document-list-scroll">
        {documents.length === 0 ? (
          <div className="document-list-empty">
            <p>{t("document.emptyTitle")}</p>
            <p>{t("document.emptyHint")}</p>
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
                      {t("document.confirm")}
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
                        <span className="document-source-badge">{sourceLabel(doc.source, t)}</span>
                        {formatTimestamp(doc.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="document-list-item-menu-trigger"
                      aria-label={t("document.docActions", { title: doc.title })}
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
                          {t("document.rename")}
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
                          {t("document.delete")}
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
