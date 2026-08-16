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
 * Empty on purpose.
 *
 * Basketball exists and produces genuinely good planning evidence, but it does not yet
 * emit evidence-requirement observations — wiring its 18 micro-skills onto the evidence
 * requirements of `plan-within-income` and `adapt-a-plan` is Checkpoint 2, and Seat 14 is
 * the gate it has to pass. Declaring the coverage here first would be asserting a
 * production route that nothing has verified, which is the one thing the product
 * definition says never to do: never claim more than the evidence supports.
 *
 * So today no competency is available and no objective is assessable, and the code says so
 * rather than implying an assessment exists. Checkpoint 2 fills this array; Checkpoint 8
 * replaces it with the world contracts.
 */
export const BUILT_WORLD_COVERAGE: readonly WorldEvidenceCoverage[] = [] as const;

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
