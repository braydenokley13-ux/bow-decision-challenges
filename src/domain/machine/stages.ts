import type { StageId } from "../evidence/types";

export const STAGE_ORDER: readonly StageId[] = [
  "entry", "join", "choose-world", "role-contract", "setup-comparison", "working-plan",
  "fallback-version", "income-check", "week5-transition", "week5-event", "first-response",
  "opportunity-final-repair", "remaining-risk-preview", "defense", "submitted",
] as const;

/**
 * The five steps a student sees, and which stages belong to each. Single source of
 * truth so the progress indicator can never drift from the stage machine.
 */
export const PROGRESS_STEPS: readonly { label: string; stages: readonly StageId[] }[] = [
  { label: "Setup", stages: ["role-contract", "setup-comparison"] },
  { label: "First Plan", stages: ["working-plan"] },
  { label: "Backup Check", stages: ["fallback-version", "income-check", "week5-transition"] },
  { label: "Week 5", stages: ["week5-event", "first-response", "opportunity-final-repair", "remaining-risk-preview"] },
  { label: "Explain It", stages: ["defense", "submitted"] },
] as const;

export function progressIndexFor(stage: StageId): number {
  return Math.max(0, PROGRESS_STEPS.findIndex((step) => step.stages.includes(stage)));
}
