import { BUILT_WORLD_COVERAGE } from "../domain/competency/availability";
import { competencyById, requiredEvidenceRequirementsFor } from "../domain/competency/competencies";
import type { CompetencyId, EvidenceRequirement, EvidenceRequirementId } from "../domain/competency/types";
import type { WorldId } from "../domain/core/ids";
import { competenciesAssessedBy } from "../platform/classes/assignments";
import type { StandardRef } from "../domain/standards/types";

/**
 * What an assignment will actually produce, read off the code rather than authored.
 *
 * The strongest idea in the reference set is an evidence preview beside the builder, and the
 * clearest way to violate the ruling is to fill it with sample text: `"Decision · Invested in
 * marketing to grow audience reach · [Opportunity Cost] · -$2,500 · 12:15 PM"` is a sentence
 * nobody's run produced. Every row this module returns instead is one of two things a person
 * can go check: `competenciesAssessedBy` (the same function the write path uses to decide what
 * an assignment actually measures) and `BUILT_WORLD_COVERAGE` (the same table `isCompetencyAvailable`
 * reads to decide a skill exists in the product at all). There is no third source, and there is
 * no free text field anywhere in the return shape — a caller cannot smuggle a sentence in.
 *
 * `requiredEvidenceRequirementsFor` is deliberate rather than the full list: those are the
 * rows `isCompetencyAvailable` actually checks a story against, so "does this story raise it"
 * is answerable the same way the product already answers "is this skill available at all".
 * An optional row is real evidence too, but it is not the bar the coverage claim is made
 * against, and showing it here would be a second, undeclared bar next to the one the release
 * gate enforces.
 */

/** One required part of a skill, and exactly which of the offered stories actually raise it. */
export interface EvidencePreviewRequirement {
  requirement: EvidenceRequirement;
  /** The subset of `worldIds` passed in that has a stated production route for this part. */
  producedBy: readonly WorldId[];
}

/** One skill this assignment measures, and every required part of it. */
export interface EvidencePreviewSkill {
  competencyId: CompetencyId;
  statement: string;
  requirements: readonly EvidencePreviewRequirement[];
}

/**
 * Whether this world has a stated production route for this one required part.
 *
 * Reads `BUILT_WORLD_COVERAGE` directly rather than `isCompetencyAvailable` — that function
 * answers "is this skill available *somewhere*", which is a different, looser question than
 * "does *this* story raise *this* part", and the preview exists to answer the second one.
 */
function producesRequirement(worldId: WorldId, competencyId: CompetencyId, requirementId: EvidenceRequirementId): boolean {
  return BUILT_WORLD_COVERAGE.some(
    (claim) => claim.worldId === worldId
      && claim.competencyId === competencyId
      && claim.producedEvidenceRequirementIds.includes(requirementId),
  );
}

/**
 * The evidence preview for one objective, against the stories a teacher is offering.
 *
 * `worldIds` is deliberately every *compatible* story rather than only the ones currently
 * checked in the builder — a teacher narrowing the offer should still be able to see the whole
 * picture underneath the narrowing, and the builder itself decides which columns to grey out.
 *
 * `null` (no objective chosen yet) and an objective with no assessed skill both return an
 * empty list; the caller is what says why, in words, because the reason is about the objective
 * and this function only knows the skills.
 */
export function evidencePreviewFor(objectiveRef: StandardRef | null, worldIds: readonly WorldId[]): readonly EvidencePreviewSkill[] {
  if (objectiveRef === null) return [];
  return competenciesAssessedBy(objectiveRef).flatMap((competencyId) => {
    const competency = competencyById(competencyId);
    const required = requiredEvidenceRequirementsFor(competencyId);
    if (!competency || required.length === 0) return [];
    const requirements = required.map((requirement) => ({
      requirement,
      producedBy: worldIds.filter((worldId) => producesRequirement(worldId, competencyId, requirement.id)),
    }));
    return [{ competencyId, statement: competency.statement, requirements }];
  });
}
