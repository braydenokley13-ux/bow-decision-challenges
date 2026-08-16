import { COMPETENCIES, evidenceRequirementById, requiredEvidenceRequirementsFor } from "./competencies";
import type {
  CompetencyId,
  CompetencyResult,
  CompetencyResultState,
  EvidenceRequirementId,
  EvidenceRequirementLevel,
  EvidenceRequirementObservation,
  RubricLevel,
  SupportLevel,
} from "./types";
import { COMPETENCY_MODEL_VERSION, RUBRIC_VERSION } from "./types";

/**
 * The shared engine: observations in, competency results out.
 *
 * Everything above this file knows one world. Everything below it knows none. The engine
 * applies the common rubric (§10.3) and the mastery rules (§10.4) and nothing else — it has
 * no idea which world produced the observations it is given, it takes no world id, and no
 * branch in it reads one. That is not tidiness. Two worlds whose evidence is rolled up by
 * two different rules are two incomparable measurements wearing the same word, and the
 * entire multiple-world thesis is the claim that they are comparable.
 *
 * `neutrality.test.ts` scans this directory's source and fails the build if a scoring
 * function here ever takes or reads a world.
 *
 * **The rule the whole file is arranged around: `null` is not zero.** A student who never
 * reached an evidence requirement has not failed it. Every path below treats an unobserved
 * requirement as absent — never as a low score, never as a reason to lower a state — and
 * `nullNotZero.test.ts` asserts it from the outside.
 */

/**
 * What each support level allows, per §10.3.
 *
 * Applied by the engine rather than trusted from the observer, so the cap holds even for a
 * world whose scorer forgot about it. Plan Under Pressure's own `supportCap()` agrees on
 * the three levels it actually stamps on an event; it returns 5 for `natural_consequence`
 * because it expresses "saw the consequence and fixed it" on the quality axis instead and
 * never stamps that support level. The product definition puts the cap here, so here it is.
 */
export const SUPPORT_CAPS: Readonly<Record<SupportLevel, RubricLevel>> = {
  standard_access: 5,
  natural_consequence: 4,
  direct_scaffold: 3,
  answer_supplied: 0,
};

/** The claimed level, held to what the support on screen allows. `null` stays `null`. */
export function levelUnderRubric(claimed: RubricLevel | null, supportLevel: SupportLevel): RubricLevel | null {
  if (claimed === null) return null;
  const cap = SUPPORT_CAPS[supportLevel];
  return claimed <= cap ? claimed : cap;
}

/** What the engine needs to know about the attempt, and deliberately nothing more. */
export interface MasteryContext {
  /**
   * The student turned the work in.
   *
   * An unfinished attempt is not a low score. §10.4 makes this the difference between
   * *incomplete* and a result, and a student whose Chromebook died is not a student who
   * cannot budget.
   */
  submitted: boolean;
}

/**
 * The level that stands for each requirement, after the rubric is applied.
 *
 * An observer that speaks about the same requirement twice is revisiting a judgement — the
 * §19.2 timeline shows exactly that — so the last one stands. Anything else would mean a
 * student's earliest attempt outranked their final one, or their best moment outranked what
 * they actually ended on.
 *
 * Two observations are dropped rather than used: one naming a requirement that does not
 * exist, and one whose `kind` disagrees with the requirement's. The second is the important
 * one. It is how a challenge would machine-score a written explanation, and the safe
 * failure is to record nothing — which reads as *incomplete* — rather than to publish a
 * level for student writing that no person ever read.
 */
function standingLevels(
  observations: readonly EvidenceRequirementObservation[],
): ReadonlyMap<EvidenceRequirementId, RubricLevel | null> {
  const standing = new Map<EvidenceRequirementId, RubricLevel | null>();
  for (const observation of observations) {
    const requirement = evidenceRequirementById(observation.evidenceRequirementId);
    if (!requirement) continue;
    if (requirement.kind !== observation.kind) continue;
    standing.set(requirement.id, levelUnderRubric(observation.level, observation.supportLevel));
  }
  return standing;
}

/**
 * §10.4, in the order the rows have to be read.
 *
 * The six rows of the table are reproduced exactly whenever every required requirement was
 * observed. Two orderings are decided here because the table leaves them open, and both are
 * decided the same way — toward claiming less:
 *
 * - **Nothing observed at all** reads *not observed* whether or not the student submitted.
 *   "The situation never presented this" is true either way, and it is the more precise of
 *   the two sentences; *incomplete* additionally implies an attempt was made.
 * - **Some requirements missing, nothing negative seen, and the student did submit** — the
 *   case the table does not name — reads *incomplete*. Calling it demonstrated would claim
 *   a skill from evidence that was never produced; calling it developing or not-yet would
 *   score a `null`. Incomplete is the only answer that does neither, and it produces no
 *   competency result and no objective state, which is the correct amount to say.
 *
 * Returns `null` for a competency with no required evidence requirements: nobody has
 * written what would count, so there is nothing to be right or wrong about.
 */
export function masteryStateFor(
  levels: readonly (RubricLevel | null)[],
  context: MasteryContext,
): CompetencyResultState | null {
  if (levels.length === 0) return null;
  const missing = levels.some((level) => level === null);
  if (levels.every((level) => level === null)) return "not-observed";
  if (missing && !context.submitted) return "incomplete";
  if (levels.some((level) => level === 0)) return "not-yet-demonstrated";
  if (levels.some((level) => level === 2)) return "developing";
  if (missing) return "incomplete";
  return levels.some((level) => level === 3) ? "demonstrated-with-support" : "demonstrated";
}

/**
 * One competency's result, from whatever was observed about it.
 *
 * `levels` carries every evidence requirement the competency declares, required or not, so
 * the row a teacher reads is the whole rubric rather than the part that happened to be
 * reached. The state is computed from the required ones alone — an optional requirement is
 * real evidence and is still reported, but it is not the bar.
 */
export function competencyResultFor(
  competencyId: CompetencyId,
  observations: readonly EvidenceRequirementObservation[],
  context: MasteryContext,
): CompetencyResult | null {
  const standing = standingLevels(observations);
  const competency = COMPETENCIES.find((entry) => entry.id === competencyId);
  if (!competency) return null;
  const levels: EvidenceRequirementLevel[] = competency.evidenceRequirements.map((requirement) => ({
    evidenceRequirementId: requirement.id,
    level: standing.get(requirement.id) ?? null,
  }));
  const state = masteryStateFor(
    requiredEvidenceRequirementsFor(competencyId).map((requirement) => standing.get(requirement.id) ?? null),
    context,
  );
  if (state === null) return null;
  return {
    competencyId,
    state,
    levels,
    competencyModelVersion: COMPETENCY_MODEL_VERSION,
    rubricVersion: RUBRIC_VERSION,
  };
}

/**
 * Every competency the observations speak to, in the model's own order.
 *
 * A competency nothing was observed about is absent rather than present-and-not-observed.
 * Twenty-one rows of "not observed" on every result is noise that would make the handful
 * that mean something harder to find, and absence already says it.
 */
export function observeCompetencies(
  observations: readonly EvidenceRequirementObservation[],
  context: MasteryContext = { submitted: true },
): readonly CompetencyResult[] {
  const spokenTo = new Set<CompetencyId>();
  for (const observation of observations) {
    const requirement = evidenceRequirementById(observation.evidenceRequirementId);
    if (requirement) spokenTo.add(requirement.competencyId);
  }
  return COMPETENCIES.filter((competency) => spokenTo.has(competency.id)).flatMap((competency) => {
    const result = competencyResultFor(competency.id, observations, context);
    return result ? [result] : [];
  });
}

/**
 * The states that count as having demonstrated the competency, per §10.5.
 *
 * *Demonstrated with support* counts: the student did it. How much help they needed is
 * carried in the level and belongs in the reteach decision, not in whether the objective
 * was met.
 */
export function isDemonstrated(state: CompetencyResultState): boolean {
  return state === "demonstrated" || state === "demonstrated-with-support";
}

/**
 * Whether a result may be counted at all.
 *
 * *Not observed* and *incomplete* are absences, not outcomes. A roll-up that put them in
 * its denominator would be reporting a fact about a broken Chromebook as a fact about a
 * student, which is the specific mistake §10.4 exists to prevent.
 */
export function isCountable(state: CompetencyResultState): boolean {
  return state !== "not-observed" && state !== "incomplete";
}
