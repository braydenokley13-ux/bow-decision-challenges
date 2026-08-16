import type { PlanMode } from "./types";

/**
 * Which interaction a money moment gets.
 *
 * `board` is the full planning surface — two towers, three free rows, a week meter. It is
 * expensive in screen and in minutes, and it is worth it exactly twice: the first time a
 * student splits this money, and the moment in Week 5 when a bill lands on a plan that is
 * already fully committed. Both are questions about the whole plan at once.
 *
 * `adjust` is the compact instrument: one number to clear, the three amounts the student
 * already chose, one tap per row. Every other moment is an adjustment — the total moved by
 * a known amount and something has to absorb it — and handing back the whole board for
 * that was what made five different beats feel like the same screen five times.
 *
 * This lives in the model rather than in the stage that renders it because it is a claim
 * about the decisions, not about the layout, and `modes.test.ts` holds it to that.
 */
export type PlanInstrument = "board" | "adjust";

export interface PlanModeDescriptor {
  mode: PlanMode;
  baseline: PlanMode | null;
  instrument: PlanInstrument;
  increment: 50 | 100;
  residualLabel: "stillExposed" | "gapRemaining" | "none";
}

export const PLAN_MODES: Record<PlanMode, PlanModeDescriptor> = {
  working: { mode: "working", baseline: null, instrument: "board", increment: 100, residualLabel: "none" },
  fallback: { mode: "fallback", baseline: "working", instrument: "adjust", increment: 100, residualLabel: "stillExposed" },
  "week5-first-response": { mode: "week5-first-response", baseline: "working", instrument: "board", increment: 50, residualLabel: "gapRemaining" },
  final: { mode: "final", baseline: "week5-first-response", instrument: "adjust", increment: 50, residualLabel: "gapRemaining" },
  "remaining-risk": { mode: "remaining-risk", baseline: "final", instrument: "adjust", increment: 50, residualLabel: "stillExposed" },
};

export const PLAN_MODE_IDS = Object.keys(PLAN_MODES) as PlanMode[];

/** The modes that get the full board. Kept small on purpose; `modes.test.ts` enforces it. */
export function boardModes(): PlanMode[] {
  return PLAN_MODE_IDS.filter((mode) => PLAN_MODES[mode].instrument === "board");
}
