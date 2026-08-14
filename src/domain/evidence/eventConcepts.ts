import type { ConceptId } from "../blueprint/types";
import type { CalcId } from "../core/ids";
import type { PlanMode } from "../finance/types";
import type { EvidenceEventType } from "./types";

/**
 * Which canonical BOW concepts an event can speak to.
 *
 * Tagging happens once, where the event is written, so every surface downstream — this
 * challenge's educator views, the debrief, and anything a second challenge adds later —
 * reads the same vocabulary instead of re-deriving it. A tag is a claim about relevance,
 * not about mastery: it says "this action is evidence about budgeting", never "this student
 * can budget."
 */

const CALC_CONCEPTS: Record<CalcId, ConceptId> = {
  "reliable-floor": "income-reliability",
  "setup-middle-total": "full-cost",
  "setup-lowest-total": "full-cost",
  "essentials-total": "viable-budget",
  "week5-change": "adaptation",
};

const PLAN_CONCEPTS: Record<PlanMode, readonly ConceptId[]> = {
  working: ["viable-budget"],
  fallback: ["contingency", "income-reliability"],
  "week5-first-response": ["adaptation"],
  final: ["adaptation", "viable-budget"],
  "remaining-risk": ["adaptation", "contingency"],
};

const STATIC_CONCEPTS: Partial<Record<EvidenceEventType, readonly ConceptId[]>> = {
  SETUP_SELECTED: ["full-cost"],
  COURSE_DEPOSIT_DECIDED: ["viable-budget", "contingency"],
  INCOME_SOURCE_TOGGLED: ["income-reliability"],
  GAP_TILE_TOGGLED: ["adaptation"],
  OPTIONAL_WORK_DECIDED: ["adaptation"],
  COMPLETION_INCOME_DECIDED: ["income-reliability", "adaptation"],
  DEFENSE_SUBMITTED: ["financial-defense"],
};

export function conceptsForEvent(type: EvidenceEventType, payload: unknown): readonly ConceptId[] {
  if (type === "CALCULATION_SUBMITTED") {
    const calcId = (payload as { calcId?: CalcId }).calcId;
    const concept = calcId ? CALC_CONCEPTS[calcId] : undefined;
    return concept ? [concept] : [];
  }
  if (type === "PLAN_SAVE_REQUESTED" || type === "PLAN_SAVED" || type === "LOCKED_MOVE_ATTEMPTED") {
    const mode = (payload as { mode?: PlanMode }).mode;
    return mode ? PLAN_CONCEPTS[mode] : [];
  }
  return STATIC_CONCEPTS[type] ?? [];
}
