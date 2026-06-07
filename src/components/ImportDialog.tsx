import { useState } from "react";
import { useTranslation } from "react-i18next";
import { detectImportUrlKind } from "../core/import/fetchImportUrl";

interface ImportDialogProps {
  onClose: () => void;
  onImportUrl: (url: string) => Promise<{ ok: true } | { ok: false; message: string; verification?: boolean }>;
}

export function ImportDialog({ onClose, onImportUrl }: ImportDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmedUrl = url.trim();
  const detectedKind = trimmedUrl ? detectImportUrlKind(trimmedUrl) : null;

  const handleSubmit = async () => {
    setLoading(true);
    setStatus("");

    try {
      if (!trimmedUrl) {
        setStatus(t("import.enterUrl"));
        return;
      }

      if (!detectedKind) {
        setStatus(t("import.invalidUrl"));
        return;
      }

      const result = await onImportUrl(trimmedUrl);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="import-dialog-header">
          <h2 id="import-dialog-title">{t("import.title")}</h2>
          <button type="button" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </div>

        <p className="import-dialog-hint">{t("import.hint")}</p>

        {detectedKind && (
          <p className="import-dialog-detect">
            {detectedKind === "wechat" ? t("import.detectWechat") : t("import.detectGeneric")}
          </p>
        )}

        <label className="import-dialog-field">
          <span>{t("import.urlLabel")}</span>
          <input
            type="url"
            placeholder={t("import.urlPlaceholder")}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSubmit();
              }
            }}
          />
        </label>

        {status && <p className="import-dialog-status">{status}</p>}

        <div className="import-dialog-actions">
          <button type="button" className="import-secondary-button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="import-button" onClick={handleSubmit} disabled={loading}>
            {loading ? t("import.importing") : t("import.import")}
          </button>
        </div>
      </div>
    </div>
  );
}
