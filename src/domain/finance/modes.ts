import type { PlanMode } from "./types";

export interface PlanModeDescriptor {
  mode: PlanMode;
  baseline: PlanMode | null;
  increment: 50 | 100;
  residualLabel: "stillExposed" | "gapRemaining" | "none";
}

export const PLAN_MODES: Record<PlanMode, PlanModeDescriptor> = {
  working: { mode: "working", baseline: null, increment: 100, residualLabel: "none" },
  fallback: { mode: "fallback", baseline: "working", increment: 100, residualLabel: "stillExposed" },
  "week5-first-response": { mode: "week5-first-response", baseline: "working", increment: 50, residualLabel: "gapRemaining" },
  final: { mode: "final", baseline: "week5-first-response", increment: 50, residualLabel: "gapRemaining" },
  "remaining-risk": { mode: "remaining-risk", baseline: "final", increment: 50, residualLabel: "stillExposed" },
};
