import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CodexRateWindow } from "../core/ai/codexClient";
import { isAiAvailable } from "../core/ai/codexClient";
import { CODEX_MODEL_OPTIONS } from "../core/ai/models";
import type { AiCapabilityId } from "../core/ai/types";
import { useAiStore } from "../store/aiStore";

const CAPABILITY_ORDER: AiCapabilityId[] = ["academic", "mermaid", "roleplay", "cowork"];

function formatPlanLabel(planType?: string): string {
  if (!planType) {
    return "Codex";
  }
  return planType.replace(/_/g, " ").toUpperCase();
}

function UsageMeter({
  label,
  window,
  t,
}: {
  label: string;
  window?: CodexRateWindow;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (!window) {
    return (
      <div className="settings-usage-meter">
        <div className="settings-usage-meter-header">
          <span>{label}</span>
          <span className="settings-usage-meter-meta">{t("settings.noUsageData")}</span>
        </div>
      </div>
    );
  }

  const usedPercent = Math.min(100, Math.max(0, window.usedPercent));
  const remainingPercent = Math.min(100, Math.max(0, window.remainingPercent));
  const resetLabel = formatResetCountdown(window.resetsAt, t);

  return (
    <div className="settings-usage-meter">
      <div className="settings-usage-meter-header">
        <span>{label}</span>
        <span className="settings-usage-meter-meta">
          {t("settings.remaining", { percent: remainingPercent.toFixed(0) })} · {resetLabel}
        </span>
      </div>
      <div className="settings-usage-bar" aria-hidden>
        <div className="settings-usage-bar-fill" style={{ width: `${usedPercent}%` }} />
      </div>
      <div className="settings-usage-meter-footer">
        <span>{t("settings.used", { percent: usedPercent.toFixed(0) })}</span>
        {window.windowMinutes ? (
          <span>{t("settings.windowMinutes", { minutes: window.windowMinutes })}</span>
        ) : null}
      </div>
    </div>
  );
}

function formatResetCountdown(
  resetsAt: number | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!resetsAt) {
    return t("common.unknownReset");
  }
  const diffMs = resetsAt * 1000 - Date.now();
  if (diffMs <= 0) {
    return t("common.resetSoon");
  }
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    return t("common.resetInDays", { count: Math.floor(hours / 24) });
  }
  if (hours > 0) {
    return t("common.resetInHours", { hours, minutes });
  }
  return t("common.resetInMinutes", { minutes });
}

export function SettingsModal() {
  const { t } = useTranslation();
  const isOpen = useAiStore((state) => state.isSettingsOpen);
  const closeSettings = useAiStore((state) => state.closeSettings);
  const codexPath = useAiStore((state) => state.codexPath);
  const capabilityModels = useAiStore((state) => state.capabilityModels);
  const loggedIn = useAiStore((state) => state.loggedIn);
  const loginDetail = useAiStore((state) => state.loginDetail);
  const loginLog = useAiStore((state) => state.loginLog);
  const statusMessage = useAiStore((state) => state.statusMessage);
  const usage = useAiStore((state) => state.usage);
  const usageLoading = useAiStore((state) => state.usageLoading);
  const setCodexPath = useAiStore((state) => state.setCodexPath);
  const setCapabilityModel = useAiStore((state) => state.setCapabilityModel);
  const refreshLoginStatus = useAiStore((state) => state.refreshLoginStatus);
  const refreshUsage = useAiStore((state) => state.refreshUsage);
  const detectCodexPath = useAiStore((state) => state.detectCodexPath);
  const startLogin = useAiStore((state) => state.startLogin);
  const startLogout = useAiStore((state) => state.startLogout);

  const desktopAvailable = isAiAvailable();

  useEffect(() => {
    if (isOpen && desktopAvailable) {
      void refreshLoginStatus();
      void refreshUsage();
    }
  }, [isOpen, desktopAvailable, refreshLoginStatus, refreshUsage]);

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
          <h2 id="settings-dialog-title">{t("settings.title")}</h2>
          <button type="button" aria-label={t("common.close")} onClick={closeSettings}>
            ×
          </button>
        </div>

        {!desktopAvailable ? (
          <p className="import-dialog-hint">{t("settings.webOnlyHint")}</p>
        ) : (
          <div className="settings-layout">
            <section className="settings-card settings-account-card">
              <div className="settings-account-main">
                <span className={`settings-status-dot ${loggedIn ? "is-online" : "is-offline"}`} />
                <div>
                  <div className="settings-account-title-row">
                    <strong>{loggedIn ? usage?.accountEmail ?? t("settings.loggedInCodex") : t("settings.loggedOut")}</strong>
                    {loggedIn && usage?.planType ? (
                      <span className="settings-plan-badge">{formatPlanLabel(usage.planType)}</span>
                    ) : null}
                  </div>
                  {loginDetail && <p className="settings-account-detail">{loginDetail}</p>}
                </div>
              </div>
              <div className="settings-action-row settings-action-row-compact">
                <button type="button" className="import-button" onClick={() => void startLogin()}>
                  {t("settings.loginCodex")}
                </button>
                <button type="button" className="ghost-button" onClick={() => void startLogout()}>
                  {t("settings.logoutCodex")}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    void refreshLoginStatus();
                    void refreshUsage();
                  }}
                >
                  {t("common.refresh")}
                </button>
              </div>
            </section>

            {loggedIn && usage?.ok && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <h3>{t("settings.usageTitle")}</h3>
                  {usageLoading && <span className="settings-usage-loading">{t("settings.usageUpdating")}</span>}
                </div>
                <UsageMeter label={t("settings.sessionLabel")} window={usage.session} t={t} />
                <UsageMeter label={t("settings.weeklyLabel")} window={usage.weekly} t={t} />
                <div className="settings-credits-row">
                  <span>{t("settings.creditsBalance")}</span>
                  <strong>
                    {usage.creditsUnlimited
                      ? t("settings.creditsUnlimited")
                      : usage.creditsBalance != null
                        ? usage.creditsBalance.toFixed(1)
                        : t("common.none")}
                  </strong>
                </div>
              </section>
            )}

            <section className="settings-card">
              <h3>{t("settings.codexPath")}</h3>
              <p className="import-dialog-hint">{t("settings.codexPathHint")}</p>
              <label className="import-dialog-field">
                <div className="settings-inline-actions">
                  <input
                    type="text"
                    value={codexPath}
                    placeholder={t("settings.codexPathPlaceholder")}
                    onChange={(event) => setCodexPath(event.target.value)}
                  />
                  <button type="button" className="ghost-button" onClick={() => void detectCodexPath()}>
                    {t("settings.autoDetect")}
                  </button>
                </div>
              </label>
            </section>

            <section className="settings-card settings-model-section">
              <h3>{t("settings.modelConfig")}</h3>
              <p className="import-dialog-hint">{t("settings.modelConfigHint")}</p>
              <div className="settings-model-grid">
                {CAPABILITY_ORDER.map((capability) => (
                  <label key={capability} className="settings-model-field">
                    <span>{t(`models.${capability}`)}</span>
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

            {loginLog.length > 0 && (
              <section className="settings-card settings-log-panel">
                <p className="settings-log-title">{t("settings.loginLog")}</p>
                <pre>
                  {loginLog.map((line, index) => {
                    const urlMatch = line.match(/https?:\/\/\S+/);
                    if (urlMatch) {
                      return (
                        <span key={`${line}-${index}`}>
                          {line}
                          {"\n"}
                          <a href={urlMatch[0]} target="_blank" rel="noreferrer">
                            {t("settings.openAuthLink")}
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
              </section>
            )}

            {statusMessage && <p className="settings-status-message">{statusMessage}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
