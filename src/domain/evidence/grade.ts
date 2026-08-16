import type { ConceptResult, GradeResult, MicroSkillObservation } from "./types";
import { STRUCTURED_MICRO_SKILLS } from "../blueprint/microSkills";
import { CONCEPTS } from "../blueprint/concepts";

/** Derived from the blueprint rather than written down, so adding a skill cannot make it lie. */
export const STRUCTURED_MAXIMUM = STRUCTURED_MICRO_SKILLS.reduce((total, skill) => total + skill.maxPoints, 0);
export const REASONING_MAXIMUM = CONCEPTS.find((concept) => concept.id === "financial-defense")?.weight ?? 10;

/** The educator scores the written reasoning; nothing stops them typing 40 without this. */
function clampReasoning(points: number | null): number | null {
  if (points === null) return null;
  if (!Number.isFinite(points)) return null;
  return Math.min(REASONING_MAXIMUM, Math.max(0, Math.round(points)));
}

export interface GradeContext {
  /** The student turned the plan in. An unfinished attempt is not a low score. */
  submitted: boolean;
}

export function deriveGrade(
  observations: MicroSkillObservation[],
  concepts: ConceptResult[],
  reasoningPoints: number | null = null,
  context: GradeContext = { submitted: true },
): GradeResult {
  const unobserved = observations.some((observation) => observation.points === null);
  const structuredPoints = observations.reduce((sum, observation) => sum + (observation.points ?? 0), 0);
  const reasoning = clampReasoning(reasoningPoints);

  // Walking away and running into a technical problem used to look identical, because both
  // produced a null grade. A submitted attempt is always gradeable: unobserved skills are
  // simply skills this student did not show.
  const incomplete = unobserved && !context.submitted;
  if (incomplete) {
    return { structuredPoints, structuredMaximum: STRUCTURED_MAXIMUM, reasoningPoints: reasoning, finalPoints: null, incomplete: true, summary: "incomplete" };
  }
  if (reasoning === null) {
    return { structuredPoints, structuredMaximum: STRUCTURED_MAXIMUM, reasoningPoints: null, finalPoints: null, incomplete: false, summary: "pending_reasoning" };
  }

  const finalPoints = structuredPoints + reasoning;
  const notDemonstrated = concepts.filter((concept) => concept.status === "not_demonstrated" || concept.status === "not_observed").length;
  const developing = concepts.some((concept) => concept.status === "developing");
  const summary = finalPoints < 65 || notDemonstrated >= 2
    ? "limited_application"
    : finalPoints < 80 || developing || notDemonstrated === 1
      ? "developing_application"
      : finalPoints < 90
        ? "secure_application"
        : concepts.every((concept) => concept.status === "demonstrated_independently" || concept.status === "demonstrated_with_support")
          ? "strong_application"
          : "developing_application";
  return { structuredPoints, structuredMaximum: STRUCTURED_MAXIMUM, reasoningPoints: reasoning, finalPoints, incomplete: false, summary };
}
