import type { WorldId } from "../core/ids";
import { COMPETENCIES, requiredEvidenceRequirementsFor } from "./competencies";
import type { CompetencyId, EvidenceRequirementId } from "./types";

/**
 * The rule that keeps the model honest.
 *
 * > A competency is only in the product once at least one world can produce **every one**
 * > of its evidence requirements.
 *
 * A competency with no world is a plan, not a product. The distinction the whole file
 * exists to protect is between *not yet available* and *not yet assessed*: a district
 * reads those two sentences completely differently, and only one of them is a statement
 * about their students. An objective BOW cannot assess yet must read "coming," never "0%."
 *
 * **Why a mapping alone is not enough.** A mapping is a claim that a competency covers
 * part of a standard. It says nothing about whether anything exists that can observe the
 * student. Reporting an objective assessable because a row exists in the mapping table
 * would be the exact failure this file prevents.
 */

/**
 * One world's claim about what it can actually produce, for one competency.
 *
 * At Checkpoint 8 this is absorbed into `WorldContract.evidenceCoverage` and each world
 * declares its own; until then it is a single explicit list, because a competency layer
 * that guessed which worlds exist would be inventing the very claim it is here to check.
 */
export interface WorldEvidenceCoverage {
  worldId: WorldId;
  competencyId: CompetencyId;
  /** Every evidence requirement this world has a stated production route for. */
  producedEvidenceRequirementIds: readonly EvidenceRequirementId[];
}

/**
 * What Basketball actually produces — earned by an observer, not declared by a plan.
 *
 * Every id below is one Basketball's observer has a real production route for.
 * `coverage.test.ts` beside that observer reads its route table and fails the build if this
 * array ever claims a requirement nothing observes. The rows are written out here rather
 * than imported from the world so a person can review the claim; the test is what stops the
 * two drifting apart.
 *
 * The claim is per requirement rather than per competency on purpose: this array says what a
 * world produces, and `isCompetencyAvailable` — not the author of this array — decides what
 * that adds up to. A row listing four of five requirements is written down honestly and
 * makes nothing available.
 *
 * **`plan-within-income.er3` was that missing fifth, and it is here now because the world
 * changed.** It could not be produced from the board as it stood: three amounts moved freely,
 * only the saved result was recorded, and the plan of a student who set the course line
 * first was identical to the plan of one who typed the leftovers into it. Reading the size
 * of the course line instead would have made one set of priorities the right answer, which
 * `balance.ts` sweeps this scenario specifically to prove none of them is.
 *
 * What closed it was not a new reading of the old evidence. It was a new statement the
 * student makes: closing the opening plan by naming the row that takes what is left over.
 * That is the difference ER3 is about, said out loud rather than inferred, and it is
 * neutral about amounts — a student who plans $0 for the course has still planned it.
 * Attempts saved before the control existed contain no such statement and score `null`,
 * which is what "the world never presented the opportunity" has always meant.
 *
 * Checkpoint 8 replaces this array with the world contracts.
 */
export const BUILT_WORLD_COVERAGE: readonly WorldEvidenceCoverage[] = [
  {
    worldId: "basketball",
    competencyId: "adapt-a-plan",
    producedEvidenceRequirementIds: [
      "adapt-a-plan.er1",
      "adapt-a-plan.er2",
      "adapt-a-plan.er3",
      "adapt-a-plan.er4",
      "adapt-a-plan.er5",
    ],
  },
  /**
   * `sort-by-need-want-goal` — declared for as long as this product has existed, and
   * unassessable by any world in it until Week 3 had a decision in it.
   *
   * The competency's evidence requirements were an empty array, so nothing could produce
   * them and `isCompetencyAvailable` correctly reported it unavailable. What changed is not
   * a new reading of an old log: it is a week where three claims want the same money, the
   * student says which ones get it, and says what made them leave the rest out. A log
   * written before that week existed carries none of it and scores `null` on all four —
   * which is what "the world never presented the opportunity" has always meant here.
   *
   * The fourth is the written one, and it is required. The objective this competency covers
   * in full asks the student to *explain*; a world that offered only the closed-set tap and
   * still claimed full coverage would be over-claiming, and `coverageClaims.test.ts` is
   * where that stops being a matter of anybody's care.
   */
  {
    worldId: "basketball",
    competencyId: "sort-by-need-want-goal",
    producedEvidenceRequirementIds: [
      "sort-by-need-want-goal.er1",
      "sort-by-need-want-goal.er2",
      "sort-by-need-want-goal.er3",
      "sort-by-need-want-goal.er4",
    ],
  },
  /**
   * The same competency, produced by the market, from the same event.
   *
   * §9.1 is the claim that which story a student picks does not change what is measured. It
   * held only while both worlds covered the same list, and it stopped holding the moment
   * Basketball gained a week where three claims want one pot. The market's answer is the
   * tips jar after the first Saturday: same `COMPETING_CLAIMS_SETTLED` event, same four
   * reason ids, same three reads, its own three claims and its own words. A class that lets
   * students choose now measures both halves of the room on this.
   */
  {
    worldId: "food-truck",
    competencyId: "sort-by-need-want-goal",
    producedEvidenceRequirementIds: [
      "sort-by-need-want-goal.er1",
      "sort-by-need-want-goal.er2",
      "sort-by-need-want-goal.er3",
      "sort-by-need-want-goal.er4",
    ],
  },
  {
    worldId: "basketball",
    competencyId: "plan-within-income",
    producedEvidenceRequirementIds: [
      "plan-within-income.er1",
      "plan-within-income.er2",
      "plan-within-income.er3",
      "plan-within-income.er4",
      "plan-within-income.er5",
    ],
  },
  // Run the Pop-Up produces the same two competencies from a completely different world: a
  // night market, four Saturdays, trays of food that spoil, and a rented generator that dies
  // with the biggest Saturday still ahead. The rows below match Basketball's exactly, and that
  // is the point of §9.1 — the story changes and what is measured does not.
  //
  // `save-toward-a-goal` is absent from both, for the same reason in both. See the note in
  // `worlds/food-truck/coverage.ts`.
  {
    worldId: "food-truck",
    competencyId: "adapt-a-plan",
    producedEvidenceRequirementIds: [
      "adapt-a-plan.er1",
      "adapt-a-plan.er2",
      "adapt-a-plan.er3",
      "adapt-a-plan.er4",
      "adapt-a-plan.er5",
    ],
  },
  {
    worldId: "food-truck",
    competencyId: "plan-within-income",
    producedEvidenceRequirementIds: [
      "plan-within-income.er1",
      "plan-within-income.er2",
      "plan-within-income.er3",
      "plan-within-income.er4",
      "plan-within-income.er5",
    ],
  },
] as const;

/**
 * Whether some built world produces every required evidence requirement of this competency.
 *
 * A competency whose evidence requirements have not been written yet is never available:
 * there is nothing for a world to produce, so no world can have produced it. That is the
 * honest reading, and it stops an unwritten competency being reported as covered because
 * the check passed vacuously.
 */
export function isCompetencyAvailable(
  id: CompetencyId,
  coverage: readonly WorldEvidenceCoverage[] = BUILT_WORLD_COVERAGE,
): boolean {
  const required = requiredEvidenceRequirementsFor(id);
  if (required.length === 0) return false;
  return coverage.some((claim) => {
    if (claim.competencyId !== id) return false;
    const produced = new Set(claim.producedEvidenceRequirementIds);
    return required.every((requirementRow) => produced.has(requirementRow.id));
  });
}

/** The set every reporting question asks against. Derived, never stored. */
export function availableCompetencyIds(
  coverage: readonly WorldEvidenceCoverage[] = BUILT_WORLD_COVERAGE,
): ReadonlySet<CompetencyId> {
  return new Set(
    COMPETENCIES.filter((competency) => isCompetencyAvailable(competency.id, coverage)).map(
      (competency) => competency.id,
    ),
  );
}

/** Which worlds can currently assess this competency, for the "which worlds" question. */
export function worldsAssessing(
  id: CompetencyId,
  coverage: readonly WorldEvidenceCoverage[] = BUILT_WORLD_COVERAGE,
): readonly WorldId[] {
  const required = requiredEvidenceRequirementsFor(id);
  if (required.length === 0) return [];
  return coverage
    .filter((claim) => {
      if (claim.competencyId !== id) return false;
      const produced = new Set(claim.producedEvidenceRequirementIds);
      return required.every((requirementRow) => produced.has(requirementRow.id));
    })
    .map((claim) => claim.worldId);
}
