import { useEffect, useRef, useState } from "react";
import { isAiAvailable } from "../core/ai/codexClient";
import { AI_ACTIONS, COWORK_CAPABILITY_GROUPS, getCoworkEligibleActions } from "../core/ai/presets";
import type { AiActionId, CoworkStepStatus } from "../core/ai/types";
import { useAiStore } from "../store/aiStore";
import { useEditorStore } from "../store/editorStore";
import { AiResultActions } from "./AiResultActions";

const MAIN_TABS = [
  { id: "academic", label: "论文结构化" },
  { id: "mermaid", label: "Mermaid 图解" },
  { id: "roleplay", label: "风格改写" },
  { id: "cowork", label: "Cowork 流水线" },
] as const;

type MainTabId = (typeof MAIN_TABS)[number]["id"];

const COWORK_STATUS_LABEL: Record<CoworkStepStatus, string> = {
  pending: "待执行",
  running: "执行中",
  done: "已完成",
  error: "失败",
  skipped: "已跳过",
};

function formatResultTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AiModal() {
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
  const [activeTab, setActiveTab] = useState<MainTabId>("academic");
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

  const filteredActions =
    activeTab === "cowork" ? [] : AI_ACTIONS.filter((action) => action.capability === activeTab);

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

  return (
    <div className="ai-modal-backdrop" role="presentation" onClick={closeAiPanel}>
      <div
        className="ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ai-modal-header">
          <div>
            <h2 id="ai-modal-title">AI 助手</h2>
            <p>基于本地 Codex，对当前文档一键改写与发布流水线</p>
          </div>
          <button type="button" className="ai-modal-close" aria-label="关闭" onClick={closeAiPanel}>
            ×
          </button>
        </header>

        {!desktopAvailable ? (
          <p className="ai-modal-hint ai-modal-body">AI 功能仅桌面端可用，请使用 Tauri 版 Read2MD Studio。</p>
        ) : (
          <>
            {!loggedIn && (
              <div className="ai-modal-alert">
                <span>Codex 未登录或会话已过期，请先在设置中完成授权。</span>
                <button type="button" className="ghost-button" onClick={openSettings}>
                  打开设置
                </button>
              </div>
            )}

            <nav className="ai-modal-tabs" aria-label="AI 能力">
              {MAIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "is-active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="ai-modal-body">
              {activeTab === "roleplay" && (
                <label className="import-dialog-field ai-style-field">
                  自定义风格（用于「自定义风格」动作）
                  <textarea
                    value={customStyle}
                    placeholder="例如：像产品发布会演讲稿，节奏明快、有感染力"
                    onChange={(event) => setCustomStyle(event.target.value)}
                  />
                </label>
              )}

              {activeTab !== "cowork" && (
                <div className="ai-action-list">
                  {filteredActions.map((action) => (
                    <article key={action.id} className="ai-action-card">
                      <div>
                        <h3>{action.label}</h3>
                        <p>{action.description}</p>
                      </div>
                      <button
                        type="button"
                        className="ai-run-button"
                        disabled={running || !markdown.trim() || !loggedIn}
                        onClick={() => void handleRun(action.id)}
                      >
                        {running && runningActionId === action.id ? "处理中…" : "运行"}
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === "cowork" && (
                <section className="ai-cowork-section">
                  <p className="ai-modal-hint">
                    按顺序执行各 AI 步骤，每步基于上一步结果继续演进。可调整步骤类型、顺序，或增删步骤。
                  </p>
                  <div className="cowork-toolbar">
                    <button
                      type="button"
                      className="ai-run-button"
                      disabled={running || !markdown.trim() || !loggedIn || coworkSteps.length === 0}
                      onClick={() => void handleRunAll()}
                    >
                      {running ? "执行中…" : "一键执行"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={running}
                      onClick={() => resetCoworkSteps()}
                    >
                      恢复默认
                    </button>
                  </div>
                  <ol className="cowork-step-list">
                    {coworkSteps.map((step, index) => (
                      <li key={step.id} className={`cowork-step cowork-step-${step.status}`}>
                        <div className="cowork-step-index">{index + 1}</div>
                        <div className="cowork-step-body">
                          <label className="cowork-step-field">
                            <span className="cowork-step-field-label">步骤动作</span>
                            <select
                              value={step.actionId}
                              disabled={running}
                              onChange={(event) =>
                                setCoworkStepAction(step.id, event.target.value as AiActionId)
                              }
                            >
                              {COWORK_CAPABILITY_GROUPS.map((group) => (
                                <optgroup key={group.capability} label={group.label}>
                                  {getCoworkEligibleActions(group.capability).map((action) => (
                                    <option key={action.id} value={action.id}>
                                      {action.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </label>
                          <span className="cowork-step-status">{COWORK_STATUS_LABEL[step.status]}</span>
                          {step.error && <p className="ai-result-error">{step.error}</p>}
                        </div>
                        <div className="cowork-step-actions">
                          <div className="cowork-step-reorder">
                            <button
                              type="button"
                              className="ghost-button ghost-button-icon"
                              aria-label="上移"
                              disabled={running || index === 0}
                              onClick={() => moveCoworkStep(step.id, "up")}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="ghost-button ghost-button-icon"
                              aria-label="下移"
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
                              查看结果
                            </button>
                          )}
                          <button
                            type="button"
                            className="ghost-button ghost-button-compact"
                            disabled={running || !markdown.trim() || !loggedIn}
                            onClick={() => void handleRunStep(step.id)}
                          >
                            {step.status === "running" ? "执行中" : "执行"}
                          </button>
                          <button
                            type="button"
                            className="ghost-button ghost-button-icon ghost-button-danger"
                            aria-label="删除步骤"
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
                    + 添加步骤
                  </button>
                </section>
              )}

              {(running || progressLog.length > 0) && (
                <section className="ai-progress-panel" aria-live="polite">
                  <div className="ai-progress-header">
                    <h3>运行日志</h3>
                    {running && <span className="ai-progress-badge">执行中</span>}
                  </div>
                  <pre ref={progressRef} className="ai-progress-log">
                    {progressLog.join("\n")}
                  </pre>
                </section>
              )}

              {statusMessage && <p className="ai-panel-status">{statusMessage}</p>}

              {selectedResult && (
                <section className="ai-result-panel">
                  <div className="ai-result-header">
                    <h3>{selectedResult.ok ? "生成结果" : "执行失败"}</h3>
                    <button type="button" className="ghost-button" onClick={clearResults}>
                      清空历史
                    </button>
                  </div>

                  {resultHistory.length > 1 && (
                    <div className="ai-result-tabs" role="tablist" aria-label="历史结果">
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
                          <span className="ai-result-tab-time">{formatResultTime(record.createdAt)}</span>
                          {!record.ok && <span className="ai-result-tab-error">失败</span>}
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
