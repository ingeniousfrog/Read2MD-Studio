import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isAiAvailable } from "../core/ai/codexClient";
import {
  translateActionDescription,
  translateActionLabel,
  translateCoworkStatus,
} from "../core/ai/i18nActions";
import {
  AI_CAPABILITY_SECTIONS,
  AI_MAIN_GROUPS,
  COWORK_CAPABILITY_GROUPS,
  getActionsForMainGroup,
  getCoworkEligibleActions,
} from "../core/ai/presets";
import type { AiActionId, CoworkStepStatus } from "../core/ai/types";
import { useAiStore } from "../store/aiStore";
import { useEditorStore } from "../store/editorStore";
import { AiResultActions } from "./AiResultActions";

type MainTabId = (typeof AI_MAIN_GROUPS)[number]["id"];

function formatResultTime(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AiModal() {
  const { t, i18n } = useTranslation();
  const isOpen = useAiStore((state) => state.isAiPanelOpen);
  const closeAiPanel = useAiStore((state) => state.closeAiPanel);
  const running = useAiStore((state) => state.running);
  const runningActionId = useAiStore((state) => state.runningActionId);
  const progressLog = useAiStore((state) => state.progressLog);
  const resultHistory = useAiStore((state) => state.resultHistory);
  const selectedResultId = useAiStore((state) => state.selectedResultId);
  const selectResult = useAiStore((state) => state.selectResult);
  const customStyle = useAiStore((state) => state.customStyle);
  const setCustomStyle = useAiStore((state) => state.setCustomStyle);
  const runAction = useAiStore((state) => state.runAction);
  const clearResults = useAiStore((state) => state.clearResults);
  const statusMessage = useAiStore((state) => state.statusMessage);
  const loggedIn = useAiStore((state) => state.loggedIn);
  const coworkSteps = useAiStore((state) => state.coworkSteps);
  const resetCoworkSteps = useAiStore((state) => state.resetCoworkSteps);
  const setCoworkStepAction = useAiStore((state) => state.setCoworkStepAction);
  const removeCoworkStep = useAiStore((state) => state.removeCoworkStep);
  const moveCoworkStep = useAiStore((state) => state.moveCoworkStep);
  const addCoworkStep = useAiStore((state) => state.addCoworkStep);
  const runCoworkStep = useAiStore((state) => state.runCoworkStep);
  const runCoworkPipeline = useAiStore((state) => state.runCoworkPipeline);
  const openSettings = useAiStore((state) => state.openSettings);

  const markdown = useEditorStore((state) => state.markdown);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const [activeTab, setActiveTab] = useState<MainTabId>("understand");
  const progressRef = useRef<HTMLPreElement>(null);

  const desktopAvailable = isAiAvailable();
  const selectedResult =
    resultHistory.find((entry) => entry.id === selectedResultId) ?? resultHistory[0] ?? null;

  useEffect(() => {
    const panel = progressRef.current;
    if (!panel) {
      return;
    }
    panel.scrollTop = panel.scrollHeight;
  }, [progressLog, running]);

  if (!isOpen) {
    return null;
  }

  const handleRun = async (actionId: AiActionId) => {
    if (!markdown.trim()) {
      return;
    }
    const result = await runAction(actionId, markdown);
    if (result.ok) {
      setMarkdown(result.markdown);
    }
  };

  const handleRunStep = async (stepId: string) => {
    const result = await runCoworkStep(stepId, markdown);
    if (result?.ok) {
      setMarkdown(result.markdown);
    }
  };

  const handleRunAll = async () => {
    const result = await runCoworkPipeline(markdown);
    if (result) {
      setMarkdown(result);
    }
  };

  const renderActionSections = (group: "understand" | "generate") => {
    const sections = AI_CAPABILITY_SECTIONS[group];

    return sections.map((section) => {
      const actions = getActionsForMainGroup(group, section.capability);
      if (actions.length === 0) {
        return null;
      }

      return (
        <section key={section.capability} className="ai-capability-section">
          <h3 className="ai-capability-title">{t(`ai.sections.${section.capability}`)}</h3>
          <div className="ai-action-list">
            {actions.map((action) => (
              <article key={action.id} className="ai-action-card">
                <div>
                  <h3>{translateActionLabel(t, action.id)}</h3>
                  <p>{translateActionDescription(t, action.id)}</p>
                </div>
                <button
                  type="button"
                  className="ai-run-button"
                  disabled={running || !markdown.trim() || !loggedIn}
                  onClick={() => void handleRun(action.id)}
                >
                  {running && runningActionId === action.id ? t("common.running") : t("common.run")}
                </button>
              </article>
            ))}
          </div>
        </section>
      );
    });
  };

  return (
    <div className="ai-modal-backdrop" role="presentation" onClick={closeAiPanel}>
      <div
        className="ai-modal ai-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ai-modal-header">
          <div>
            <h2 id="ai-modal-title">{t("ai.title")}</h2>
            <p>{t("ai.subtitle")}</p>
          </div>
          <button type="button" className="ai-modal-close" aria-label={t("common.close")} onClick={closeAiPanel}>
            ×
          </button>
        </header>

        {!desktopAvailable ? (
          <p className="ai-modal-hint ai-modal-body">{t("ai.desktopOnly")}</p>
        ) : (
          <>
            {!loggedIn && (
              <div className="ai-modal-alert">
                <span>{t("ai.notLoggedIn")}</span>
                <button type="button" className="ghost-button" onClick={openSettings}>
                  {t("ai.openSettings")}
                </button>
              </div>
            )}

            <nav className="ai-modal-tabs" aria-label={t("ai.title")}>
              {AI_MAIN_GROUPS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "is-active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {t(`ai.${tab.id === "cowork" ? "cowork" : tab.id}`)}
                </button>
              ))}
            </nav>

            <div className="ai-modal-split">
              <div className="ai-modal-controls">
                {activeTab === "generate" && (
                  <label className="import-dialog-field ai-style-field">
                    {t("ai.customStyleLabel")}
                    <textarea
                      value={customStyle}
                      placeholder={t("ai.customStylePlaceholder")}
                      onChange={(event) => setCustomStyle(event.target.value)}
                    />
                  </label>
                )}

                {(activeTab === "understand" || activeTab === "generate") && renderActionSections(activeTab)}

                {activeTab === "cowork" && (
                  <section className="ai-cowork-section">
                    <p className="ai-modal-hint">{t("ai.coworkHint")}</p>
                    <div className="cowork-toolbar">
                      <button
                        type="button"
                        className="ai-run-button"
                        disabled={running || !markdown.trim() || !loggedIn || coworkSteps.length === 0}
                        onClick={() => void handleRunAll()}
                      >
                        {running ? t("ai.runningAll") : t("ai.runAll")}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={running}
                        onClick={() => resetCoworkSteps()}
                      >
                        {t("ai.resetDefault")}
                      </button>
                    </div>
                    <ol className="cowork-step-list">
                      {coworkSteps.map((step, index) => (
                        <li key={step.id} className={`cowork-step cowork-step-${step.status}`}>
                          <div className="cowork-step-index">{index + 1}</div>
                          <div className="cowork-step-body">
                            <label className="cowork-step-field">
                              <span className="cowork-step-field-label">{t("ai.stepAction")}</span>
                              <select
                                value={step.actionId}
                                disabled={running}
                                onChange={(event) =>
                                  setCoworkStepAction(step.id, event.target.value as AiActionId)
                                }
                              >
                                {COWORK_CAPABILITY_GROUPS.map((group) => (
                                  <optgroup key={group.capability} label={t(`ai.sections.${group.capability}`)}>
                                    {getCoworkEligibleActions(group.capability).map((action) => (
                                      <option key={action.id} value={action.id}>
                                        {translateActionLabel(t, action.id)}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </label>
                            <span className="cowork-step-status">
                              {translateCoworkStatus(t, step.status as CoworkStepStatus)}
                            </span>
                            {step.error && <p className="ai-result-error">{step.error}</p>}
                          </div>
                          <div className="cowork-step-actions">
                            <div className="cowork-step-reorder">
                              <button
                                type="button"
                                className="ghost-button ghost-button-icon"
                                aria-label={t("ai.moveUp")}
                                disabled={running || index === 0}
                                onClick={() => moveCoworkStep(step.id, "up")}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="ghost-button ghost-button-icon"
                                aria-label={t("ai.moveDown")}
                                disabled={running || index === coworkSteps.length - 1}
                                onClick={() => moveCoworkStep(step.id, "down")}
                              >
                                ↓
                              </button>
                            </div>
                            {step.resultId && (
                              <button
                                type="button"
                                className="ghost-button ghost-button-compact"
                                onClick={() => selectResult(step.resultId!)}
                              >
                                {t("ai.viewResult")}
                              </button>
                            )}
                            <button
                              type="button"
                              className="ghost-button ghost-button-compact"
                              disabled={running || !markdown.trim() || !loggedIn}
                              onClick={() => void handleRunStep(step.id)}
                            >
                              {step.status === "running" ? t("ai.executing") : t("ai.execute")}
                            </button>
                            <button
                              type="button"
                              className="ghost-button ghost-button-icon ghost-button-danger"
                              aria-label={t("ai.deleteStep")}
                              disabled={running || coworkSteps.length <= 1}
                              onClick={() => removeCoworkStep(step.id)}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      className="cowork-add-step"
                      disabled={running}
                      onClick={() => addCoworkStep()}
                    >
                      {t("ai.addStep")}
                    </button>
                  </section>
                )}

                {statusMessage && <p className="ai-panel-status">{statusMessage}</p>}
              </div>

              <aside className="ai-modal-results">
                {(running || progressLog.length > 0) && (
                  <section className="ai-progress-panel" aria-live="polite">
                    <div className="ai-progress-header">
                      <h3>{t("ai.progressLog")}</h3>
                      {running && <span className="ai-progress-badge">{t("ai.executingBadge")}</span>}
                    </div>
                    <pre ref={progressRef} className="ai-progress-log">
                      {progressLog.join("\n")}
                    </pre>
                  </section>
                )}

                {selectedResult ? (
                  <section className="ai-result-panel">
                    <div className="ai-result-header">
                      <h3>{selectedResult.ok ? t("ai.resultTitle") : t("ai.resultFailed")}</h3>
                      <button type="button" className="ghost-button" onClick={clearResults}>
                        {t("ai.clearHistory")}
                      </button>
                    </div>

                    {resultHistory.length > 1 && (
                      <div className="ai-result-tabs" role="tablist" aria-label={t("ai.historyResults")}>
                        {resultHistory.map((record) => (
                          <button
                            key={record.id}
                            type="button"
                            role="tab"
                            aria-selected={selectedResultId === record.id}
                            className={selectedResultId === record.id ? "is-active" : ""}
                            onClick={() => selectResult(record.id)}
                          >
                            <span className="ai-result-tab-label">{record.label}</span>
                          <span className="ai-result-tab-time">
                            {formatResultTime(record.createdAt, i18n.language)}
                          </span>
                          {!record.ok && <span className="ai-result-tab-error">{t("ai.failedBadge")}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedResult.error && <p className="ai-result-error">{selectedResult.error}</p>}
                    {selectedResult.ok && (
                      <>
                        <pre className="ai-result-preview">
                          {selectedResult.markdown.slice(0, 1600)}
                          {selectedResult.markdown.length > 1600 ? "\n…" : ""}
                        </pre>
                        <AiResultActions markdown={selectedResult.markdown} />
                      </>
                    )}
                  </section>
                ) : (
                  <section className="ai-result-panel ai-result-empty">
                    <h3>{t("ai.resultTitle")}</h3>
                    <p className="ai-modal-hint">{t("ai.resultEmptyHint")}</p>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
