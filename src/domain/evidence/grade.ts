import type { GradeResult, MicroSkillObservation } from "./types";
import { STRUCTURED_MICRO_SKILLS } from "../blueprint/microSkills";
import { CONCEPTS } from "../blueprint/concepts";
import { REASONING_CRITERIA, reasoningMaximumFrom } from "../blueprint/reasoning";

/** Derived from the blueprint rather than written down, so adding a skill cannot make it lie. */
export const STRUCTURED_MAXIMUM = STRUCTURED_MICRO_SKILLS.reduce((total, skill) => total + skill.maxPoints, 0);

/**
 * The same, for the half a person marks — and the rubric's arithmetic, not the weight's.
 *
 * This read `CONCEPTS.find((c) => c.id === "financial-defense")?.weight ?? 10`, which made
 * it the third place ten was typed and the wrong one of the three to read. Every surface
 * that shows this number shows it under a total summed from `REASONING_CRITERIA`, so the
 * denominator has to come from that same list; taking it from the weight meant the two
 * halves of the fraction had independent sources and could disagree without anything
 * saying so. `reasoningMaximumFrom` sums the criteria and asserts the weight matches, so
 * the fraction moves in one piece and the third copy of ten is gone with the fallback.
 *
 * It also makes the criteria path safe wherever it is totalled without a clamp:
 * `reasoningTotal` is a sum of per-criterion clamps over exactly this list, so it cannot
 * reach a number this one does not cover.
 */
export const REASONING_MAXIMUM = reasoningMaximumFrom(REASONING_CRITERIA, CONCEPTS);

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

/**
 * The points, and nothing that reads as a verdict.
 *
 * This used to take `concepts` as well, and the only thing it did with them was compute a
 * `summary` — `strong_application` / `secure_application` / `developing_application` /
 * `limited_application`, off a 65/80/90 ladder over the composite total. Nothing rendered it,
 * the four strings could not be shown to a teacher as they stood, and the composite it rested
 * on is the one the student page removed. Both are gone, so the parameter is too: a function
 * that takes an argument it does not read is a function lying about what it depends on.
 */
export function deriveGrade(
  observations: MicroSkillObservation[],
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
    return { structuredPoints, structuredMaximum: STRUCTURED_MAXIMUM, reasoningPoints: reasoning, finalPoints: null, incomplete: true };
  }
  if (reasoning === null) {
    return { structuredPoints, structuredMaximum: STRUCTURED_MAXIMUM, reasoningPoints: null, finalPoints: null, incomplete: false };
  }

  return {
    structuredPoints,
    structuredMaximum: STRUCTURED_MAXIMUM,
    reasoningPoints: reasoning,
    finalPoints: structuredPoints + reasoning,
    incomplete: false,
  };
}
