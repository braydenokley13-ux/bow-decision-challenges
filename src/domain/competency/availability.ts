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
 * Note the second row. It is a **partial** production route, and recording it is the point:
 * this array says what a world produces, and `isCompetencyAvailable` — not the author of
 * this array — decides what that adds up to. Four of five is written down honestly and
 * makes nothing available.
 *
 * **Why `plan-within-income` is four fifths.** ER1, ER2, ER4 and ER5 map cleanly onto
 * Basketball's micro-skills and its written defense. ER3 — *savings is a deliberate figure
 * set before the discretionary categories, not the remainder after them* — has no honest
 * route in this world, for two independent reasons:
 *
 * 1. **The order is not in the log.** Basketball's three amounts move freely on one board
 *    and only the saved result is recorded, so the plan of a student who set the course
 *    line first is identical to the plan of one who typed the leftovers into it. The §19.2
 *    timeline judges ER3 on exactly that ordering, and this world cannot see it.
 * 2. **The amount cannot stand in for the order.** Scoring a larger course line would make
 *    one set of priorities the right answer, and `balance.ts` sweeps this scenario
 *    specifically to prove none of them is — "commit late, hold cash, keep options open,
 *    even at the cost of the course" is a reading the design protects on purpose.
 *
 * So the objective that competency fully covers stays unassessable, and the honest word for
 * it remains "coming." Closing the gap is a world change — record the order the amounts
 * were set in, or give a world a savings target the student sets — and it is the first
 * thing a second world for that objective has to carry.
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
  {
    worldId: "basketball",
    competencyId: "plan-within-income",
    producedEvidenceRequirementIds: [
      "plan-within-income.er1",
      "plan-within-income.er2",
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
