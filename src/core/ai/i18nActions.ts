import type { TFunction } from "i18next";
import type { AiActionId } from "./types";

export function translateActionLabel(t: TFunction, actionId: AiActionId): string {
  return t(`ai.actions.${actionId}.label`, { defaultValue: actionId });
}

export function translateActionDescription(t: TFunction, actionId: AiActionId): string {
  return t(`ai.actions.${actionId}.description`, { defaultValue: "" });
}

export function translateCoworkStatus(
  t: TFunction,
  status: "pending" | "running" | "done" | "error" | "skipped",
): string {
  return t(`ai.status.${status}`);
}
