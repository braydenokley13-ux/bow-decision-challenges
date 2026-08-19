import type { ConceptId } from "../blueprint/types";
import { evidenceRequirementById } from "../competency/competencies";
import type { CompetencyId, EvidenceRequirementId } from "../competency/types";
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
  "chosen-setup-total": "full-cost",
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
  SETUP_RANKED: ["full-cost"],
  // Three claims against one week's cash is a budget that will not close, decided in front
  // of the student rather than on a board. It speaks to what a workable division of money
  // looks like when there is not enough of it, and to nothing about income or adaptation.
  COMPETING_CLAIMS_SETTLED: ["viable-budget"],
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
  if (type === "PLAN_SAVE_REQUESTED" || type === "PLAN_SAVED" || type === "PLAN_REMAINDER_ASSIGNED" || type === "LOCKED_MOVE_ATTEMPTED") {
    const mode = (payload as { mode?: PlanMode }).mode;
    return mode ? PLAN_CONCEPTS[mode] : [];
  }
  return STATIC_CONCEPTS[type] ?? [];
}

/**
 * The same tagging, in the vocabulary a second world can share.
 *
 * Written per moment rather than derived from the concept tags. Deriving would have been
 * one fewer table and it would have over-claimed: the Week 5 arithmetic and the Week 5
 * repair are both the `adaptation` concept, and tagging the calculation as evidence about
 * "uses only money that can still move" would put a sentence in the evidence trail that is
 * not true of it.
 *
 * A tag only names a requirement Basketball's observer actually produces —
 * `evidenceEnvelope.test.ts` reads the observer's route table and fails if one appears here
 * that nothing can observe. `plan-within-income.er3` was nowhere below until this world had
 * a moment that was evidence about it; it now appears on exactly one, and on one mode of it.
 */
const CALC_REQUIREMENTS: Record<CalcId, readonly EvidenceRequirementId[]> = {
  "reliable-floor": ["plan-within-income.er1"],
  // Working out what the chosen place costs over eight weeks is a full-cost comparison. The
  // plan carries that cost as a locked amount the student never types, so the calculation is
  // not evidence about whether their plan covered it.
  "chosen-setup-total": [],
  "essentials-total": ["plan-within-income.er2"],
  "week5-change": ["adapt-a-plan.er1"],
};

const PLAN_REQUIREMENTS: Record<PlanMode, readonly EvidenceRequirementId[]> = {
  working: ["plan-within-income.er2", "plan-within-income.er4"],
  fallback: ["plan-within-income.er1"],
  "week5-first-response": ["adapt-a-plan.er2", "adapt-a-plan.er3"],
  final: ["adapt-a-plan.er2", "adapt-a-plan.er4"],
  "remaining-risk": ["plan-within-income.er1"],
};

/**
 * Naming the row that takes the rest, per mode.
 *
 * Only the opening plan is tagged. That is the first and only moment in this world where a
 * student is dividing money they have not divided before, which is what ER3 is about; the
 * later boards are repairs to a plan that already exists, and Basketball's observer reads
 * nothing from them. A tag on a mode nothing is judged from would put a sentence in the
 * §19.2 evidence trail that no judgement ever stands behind.
 */
const REMAINDER_REQUIREMENTS: Partial<Record<PlanMode, readonly EvidenceRequirementId[]>> = {
  working: ["plan-within-income.er3"],
};

const STATIC_REQUIREMENTS: Partial<Record<EvidenceEventType, readonly EvidenceRequirementId[]>> = {
  // The whole of the settlement, in one event: how far the money was made to reach, what
  // kind of reason was given, and whether that reason is true of what actually went unpaid.
  // Three requirements from one moment because the moment carries three separable facts —
  // the observer reads each of them from a different field of the same payload.
  COMPETING_CLAIMS_SETTLED: [
    "sort-by-need-want-goal.er1",
    "sort-by-need-want-goal.er2",
    "sort-by-need-want-goal.er3",
  ],
  INCOME_SOURCE_TOGGLED: ["plan-within-income.er1"],
  COMPLETION_INCOME_DECIDED: ["plan-within-income.er1"],
  GAP_TILE_TOGGLED: ["adapt-a-plan.er1"],
  DEFENSE_SUBMITTED: ["plan-within-income.er5", "adapt-a-plan.er5", "sort-by-need-want-goal.er4"],
};

export function evidenceRequirementsForEvent(type: EvidenceEventType, payload: unknown): readonly EvidenceRequirementId[] {
  if (type === "CALCULATION_SUBMITTED") {
    const calcId = (payload as { calcId?: CalcId }).calcId;
    return calcId ? CALC_REQUIREMENTS[calcId] : [];
  }
  if (type === "PLAN_REMAINDER_ASSIGNED") {
    const mode = (payload as { mode?: PlanMode }).mode;
    return (mode ? REMAINDER_REQUIREMENTS[mode] : undefined) ?? [];
  }
  if (type === "PLAN_SAVE_REQUESTED" || type === "PLAN_SAVED" || type === "LOCKED_MOVE_ATTEMPTED") {
    const mode = (payload as { mode?: PlanMode }).mode;
    return mode ? PLAN_REQUIREMENTS[mode] : [];
  }
  return STATIC_REQUIREMENTS[type] ?? [];
}

/**
 * Derived from the requirement tags, never listed separately.
 *
 * A second list would be a second thing to keep in step, and the failure mode is silent: an
 * event tagged with a competency but none of its requirements files evidence under a skill
 * without saying what about it.
 */
export function competenciesForEvent(type: EvidenceEventType, payload: unknown): readonly CompetencyId[] {
  const competencyIds = evidenceRequirementsForEvent(type, payload)
    .flatMap((id) => {
      const requirement = evidenceRequirementById(id);
      return requirement ? [requirement.competencyId] : [];
    });
  return [...new Set(competencyIds)];
}
