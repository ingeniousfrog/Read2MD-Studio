import { useState } from "react";
import { detectImportUrlKind } from "../core/import/fetchImportUrl";

interface ImportDialogProps {
  onClose: () => void;
  onImportUrl: (url: string) => Promise<{ ok: true } | { ok: false; message: string; verification?: boolean }>;
}

export function ImportDialog({ onClose, onImportUrl }: ImportDialogProps) {
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
        setStatus("请输入网页链接。");
        return;
      }

      if (!detectedKind) {
        setStatus("请输入有效的 http 或 https 链接。");
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
          <h2 id="import-dialog-title">导入 URL</h2>
          <button type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="import-dialog-hint">
          粘贴任意网页链接，系统将自动抓取 HTML 并转换为 Markdown。微信公众号与其他博客/文档页均支持。
        </p>

        {detectedKind && (
          <p className="import-dialog-detect">
            检测到：{detectedKind === "wechat" ? "微信公众号文章" : "普通网页"}
          </p>
        )}

        <label className="import-dialog-field">
          <span>网页链接</span>
          <input
            type="url"
            placeholder="https://mp.weixin.qq.com/s/... 或 https://example.com/blog/..."
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
            取消
          </button>
          <button type="button" className="import-button" onClick={handleSubmit} disabled={loading}>
            {loading ? "导入中..." : "导入"}
          </button>
        </div>
      </div>
    </div>
  );
}
