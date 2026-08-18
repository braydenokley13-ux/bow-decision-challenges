import { evidenceRequirementById } from "../../../competency/competencies";
import type { CompetencyId, EvidenceRequirementId } from "../../../competency/types";
import type { EvidenceEventType } from "../../../evidence/types";
import type { PopUpBoardId, PopUpSumId } from "./types";

/**
 * Which evidence requirements each of this world's moments can speak to.
 *
 * A tag is a claim about relevance, never about mastery: it says "this action is evidence
 * about whether the plan counted only money that was actually there," never "this student
 * plans within their income." The level lives in an observation, and only `observer.ts`
 * produces one.
 *
 * It is written per moment rather than derived from anything, because deriving would
 * over-claim. Ordering trays and hiring a friend are decisions this world cares about a great
 * deal and judges not at all — they are preferences, and `balance.ts` exists to prove none of
 * them is the right answer. Tagging them would put a line in the §19.2 evidence timeline with
 * no judgement behind it and no way to reach one.
 *
 * `coverage.test.ts` reads the observer's route table and fails the build if a tag here names
 * a requirement nothing in this world can observe.
 */

const SUM_REQUIREMENTS: Record<PopUpSumId, readonly EvidenceRequirementId[]> = {
  "owed-up-front": ["plan-within-income.er2"],
  "cash-to-plan": ["plan-within-income.er1"],
  // What a tray order costs is full-cost arithmetic, the same way Basketball's eight-week
  // housing total is. It prices a decision the world never scores, so it is evidence about
  // nothing in the rubric — and saying so is more useful than a tag that cannot be cashed.
  "first-order": [],
  "swap-gap": ["adapt-a-plan.er1"],
};

const BOARD_SAVE_REQUIREMENTS: Record<PopUpBoardId, readonly EvidenceRequirementId[]> = {
  opening: ["plan-within-income.er2", "plan-within-income.er4"],
  repair: ["adapt-a-plan.er3", "adapt-a-plan.er4"],
};

/**
 * Naming the line that takes the rest, per board.
 *
 * Only the opening plan is tagged. That is the one moment in this world where money is being
 * divided for the first time, which is what `plan-within-income.er3` is about. The repair
 * board offers the same control over a plan that already exists, and the observer reads
 * nothing from it.
 */
const REMAINDER_REQUIREMENTS: Partial<Record<PopUpBoardId, readonly EvidenceRequirementId[]>> = {
  opening: ["plan-within-income.er3"],
};

const LOCKED_MOVE_REQUIREMENTS: Partial<Record<PopUpBoardId, readonly EvidenceRequirementId[]>> = {
  repair: ["adapt-a-plan.er2"],
};

const STATIC_REQUIREMENTS: Partial<Record<EvidenceEventType, readonly EvidenceRequirementId[]>> = {
  POPUP_CONDITIONAL_MONEY_DECIDED: ["plan-within-income.er1"],
  POPUP_COVER_LINE_NAMED: ["plan-within-income.er1"],
  // The whole of the tips settlement, in one event: how far the jar was made to reach, what
  // kind of reason was given for the rest, and whether that reason is true of what actually
  // went unpaid. Three requirements from one moment because the moment carries three
  // separable facts, and the observer reads each of them from a different field of the same
  // payload. This is the one event this world shares with the other one, so the tags are the
  // same tags — a market student and a season student answer the same question here.
  COMPETING_CLAIMS_SETTLED: [
    "sort-by-need-want-goal.er1",
    "sort-by-need-want-goal.er2",
    "sort-by-need-want-goal.er3",
  ],
  POPUP_WRITEUP_SUBMITTED: ["plan-within-income.er5", "adapt-a-plan.er5", "sort-by-need-want-goal.er4"],
};

export function popUpEvidenceRequirementsForEvent(type: EvidenceEventType, payload: unknown): readonly EvidenceRequirementId[] {
  if (type === "POPUP_SUM_SUBMITTED") {
    const sumId = (payload as { sumId?: PopUpSumId }).sumId;
    return sumId ? SUM_REQUIREMENTS[sumId] : [];
  }
  const board = (payload as { board?: PopUpBoardId }).board;
  if (type === "POPUP_REMAINDER_ASSIGNED") return (board ? REMAINDER_REQUIREMENTS[board] : undefined) ?? [];
  if (type === "POPUP_LOCKED_MOVE_ATTEMPTED") return (board ? LOCKED_MOVE_REQUIREMENTS[board] : undefined) ?? [];
  if (type === "POPUP_PLAN_SAVE_REQUESTED" || type === "POPUP_PLAN_SAVED") return board ? BOARD_SAVE_REQUIREMENTS[board] : [];
  return STATIC_REQUIREMENTS[type] ?? [];
}

/**
 * Derived from the requirement tags, never listed separately. An event filed under a skill
 * without saying what about it is a claim with no evidence trail.
 */
export function popUpCompetenciesForEvent(type: EvidenceEventType, payload: unknown): readonly CompetencyId[] {
  return [...new Set(
    popUpEvidenceRequirementsForEvent(type, payload).flatMap((id) => {
      const requirement = evidenceRequirementById(id);
      return requirement ? [requirement.competencyId] : [];
    }),
  )];
}
