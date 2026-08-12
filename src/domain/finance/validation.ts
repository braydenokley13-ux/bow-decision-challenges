import { isOnIncrement } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import { PLAN_MODES } from "./modes";
import type { PlanAmounts, PlanMode } from "./types";

export function validatePlanAmounts(amounts: PlanAmounts, mode: PlanMode, n: ScenarioNumbers): string[] {
  const issues: string[] = [];
  const step = PLAN_MODES[mode].increment;
  for (const [category, value] of Object.entries(amounts)) {
    if (!isOnIncrement(value, step)) issues.push(`${category} must be a nonnegative $${step} increment.`);
  }
  if (amounts.goal > n.goalCap) issues.push("The course goal cannot exceed the course cost.");
  return issues;
}
