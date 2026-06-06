import { useEffect } from "react";
import { isAiAvailable } from "../core/ai/codexClient";
import { CAPABILITY_MODEL_LABELS, CODEX_MODEL_OPTIONS } from "../core/ai/models";
import type { AiCapabilityId } from "../core/ai/types";
import { useAiStore } from "../store/aiStore";

const CAPABILITY_ORDER: AiCapabilityId[] = ["academic", "mermaid", "roleplay", "cowork"];

export function SettingsModal() {
  const isOpen = useAiStore((state) => state.isSettingsOpen);
  const closeSettings = useAiStore((state) => state.closeSettings);
  const codexPath = useAiStore((state) => state.codexPath);
  const capabilityModels = useAiStore((state) => state.capabilityModels);
  const loggedIn = useAiStore((state) => state.loggedIn);
  const loginDetail = useAiStore((state) => state.loginDetail);
  const loginLog = useAiStore((state) => state.loginLog);
  const statusMessage = useAiStore((state) => state.statusMessage);
  const setCodexPath = useAiStore((state) => state.setCodexPath);
  const setCapabilityModel = useAiStore((state) => state.setCapabilityModel);
  const refreshLoginStatus = useAiStore((state) => state.refreshLoginStatus);
  const detectCodexPath = useAiStore((state) => state.detectCodexPath);
  const startLogin = useAiStore((state) => state.startLogin);
  const startLogout = useAiStore((state) => state.startLogout);

  const desktopAvailable = isAiAvailable();

  useEffect(() => {
    if (isOpen && desktopAvailable) {
      void refreshLoginStatus();
    }
  }, [isOpen, desktopAvailable, refreshLoginStatus]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="import-dialog-backdrop" role="presentation" onClick={closeSettings}>
      <div
        className="import-dialog settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="import-dialog-header">
          <h2 id="settings-dialog-title">设置</h2>
          <button type="button" aria-label="关闭" onClick={closeSettings}>
            ×
          </button>
        </div>

        {!desktopAvailable ? (
          <p className="import-dialog-hint">
            Codex 登录与 AI 功能仅桌面版可用。Web 版可继续使用写作、预览与复制功能。
          </p>
        ) : (
          <>
            <p className="import-dialog-hint">
              通过本地 Codex CLI 完成登录授权。点击「登录 Codex」后将在浏览器中完成 OAuth。
            </p>

            <div className="settings-status-card">
              <span className={`settings-status-dot ${loggedIn ? "is-online" : "is-offline"}`} />
              <div>
                <strong>{loggedIn ? "已登录" : "未登录"}</strong>
                {loginDetail && <p>{loginDetail}</p>}
              </div>
            </div>

            <label className="import-dialog-field">
              Codex 路径
              <div className="settings-inline-actions">
                <input
                  type="text"
                  value={codexPath}
                  placeholder="留空则自动探测"
                  onChange={(event) => setCodexPath(event.target.value)}
                />
                <button type="button" className="ghost-button" onClick={() => void detectCodexPath()}>
                  自动探测
                </button>
              </div>
            </label>

            <section className="settings-model-section">
              <h3>模型配置</h3>
              <p className="import-dialog-hint">为不同 AI 能力单独选择模型，留空则使用 Codex 默认配置。</p>
              <div className="settings-model-grid">
                {CAPABILITY_ORDER.map((capability) => (
                  <label key={capability} className="settings-model-field">
                    <span>{CAPABILITY_MODEL_LABELS[capability]}</span>
                    <select
                      value={capabilityModels[capability]}
                      onChange={(event) => setCapabilityModel(capability, event.target.value)}
                    >
                      {CODEX_MODEL_OPTIONS.map((option) => (
                        <option key={`${capability}-${option.value || "default"}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <div className="settings-action-row">
              <button type="button" className="import-button" onClick={() => void startLogin()}>
                登录 Codex
              </button>
              <button type="button" className="ghost-button" onClick={() => void startLogout()}>
                退出登录
              </button>
              <button type="button" className="ghost-button" onClick={() => void refreshLoginStatus()}>
                刷新状态
              </button>
            </div>

            {loginLog.length > 0 && (
              <div className="settings-log-panel">
                <p className="settings-log-title">登录日志</p>
                <pre>
                  {loginLog.map((line, index) => {
                    const urlMatch = line.match(/https?:\/\/\S+/);
                    if (urlMatch) {
                      return (
                        <span key={`${line}-${index}`}>
                          {line}
                          {"\n"}
                          <a href={urlMatch[0]} target="_blank" rel="noreferrer">
                            在浏览器中打开授权链接
                          </a>
                          {"\n"}
                        </span>
                      );
                    }
                    return (
                      <span key={`${line}-${index}`}>
                        {line}
                        {"\n"}
                      </span>
                    );
                  })}
                </pre>
              </div>
            )}

            {statusMessage && <p className="settings-status-message">{statusMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
}
