import type { StageId } from "../evidence/types";

export const STAGE_ORDER: readonly StageId[] = [
  "entry", "join", "choose-world", "role-contract", "setup-comparison", "working-plan",
  "fallback-version", "income-check", "week5-transition", "week5-event", "first-response",
  "opportunity-final-repair", "remaining-risk-preview", "defense", "submitted",
] as const;

export const PROGRESS_STAGES = ["Setup", "Working Plan", "Plan Check", "Week 5", "Defense"] as const;

export function isPreWeek5(stage: StageId): boolean {
  return STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf("week5-transition");
}
