import { requiredEvidenceRequirementsFor } from "./competencies";
import { MINIMUM_ASSESSED_FOR_A_STATE, studentOutcomeFor, type ObjectiveDemand } from "./objectiveState";
import { reteachFor, type ReteachTopic } from "./reteach";
import type { CompetencyId, CompetencyResult, EvidenceRequirementId, RubricLevel } from "./types";

/**
 * "What should I teach next?", computed rather than written.
 *
 * §18.2 defines this exactly, and the definition is the whole value of it: a teacher will
 * act on this on Monday, so every sentence it produces has to be traceable to a count of
 * real students. Nothing here generates prose, nothing here is a model, and nothing here can
 * produce a recommendation the evidence does not carry.
 *
 * Four rules hold it, and three of them are refusals:
 *
 * - **The denominator is assessed students.** Not the class, not the submissions, not the
 *   students who happened to reach the requirement. A share of the wrong denominator is the
 *   single easiest way to tell a teacher something untrue about a room of children.
 * - **Below the minimum denominator there is no recommendation at all.** The counts are still
 *   true and are still shown; the recommendation is refused, because "teach this next" from
 *   three students is a claim about the twenty-five nobody assessed.
 * - **A requirement nobody was given the opportunity to meet is not a gap.** `null` is not
 *   zero here either. It is carried separately, as an absence, so a spotlight can say which
 *   of the two it is looking at.
 * - **No single gap is a real answer.** A class spread across small issues is a good outcome
 *   and gets said as one, rather than having the largest of the small issues promoted.
 */

/** A gap has to reach this share of assessed students before it is worth a lesson. §18.2. */
export const GAP_THRESHOLD_PERCENT = 20;

/** A rubric level that says the student did not get there. §18.2 counts 2s and 0s. */
export function isShortfall(level: RubricLevel | null): boolean {
  return level === 0 || level === 2;
}

export interface RequirementGap {
  evidenceRequirementId: EvidenceRequirementId;
  competencyId: CompetencyId;
  /** What a teacher would call it. */
  label: string;
  /** The rubric row in words, so the recommendation can be checked against the rule. */
  observableRule: string;
  /** Assessed students whose level here was 2 or 0. */
  struggled: number;
  /** Assessed students who were given the opportunity at all. Never the class size. */
  observed: number;
  /** Assessed students the world never asked. An absence, and named as one. */
  notObserved: number;
  /** Share of the assessed denominator. `null` when that denominator cannot carry a share. */
  percentOfAssessed: number | null;
  /** The named wrong idea a failure here indicates, or `null` where none is named. */
  misconception: string | null;
}

export type TeachNextState =
  /** Nobody has a usable result, so there is nothing to read. */
  | "not-assessed"
  /** Counts only. Below the minimum denominator no recommendation is made. */
  | "too-few-assessed"
  /** Assessed, and the class is spread across small issues rather than one shared idea. */
  | "no-single-gap"
  /** One requirement clears the threshold, and it is what to teach next. */
  | "one-gap";

export interface TeachNextReading {
  state: TeachNextState;
  /** Students with a usable result against the objective's demand. The denominator. */
  assessed: number;
  /** Every required requirement behind this objective, worst first. Always the full list. */
  gaps: readonly RequirementGap[];
  /** The gap to act on. `null` in every state but `one-gap`. */
  top: RequirementGap | null;
  /** What to teach, looked up from the misconception. `null` when none is named for it. */
  reteach: ReteachTopic | null;
}

/** The level this student reached on this requirement, or `null` if it was never observed. */
export function levelFor(results: readonly CompetencyResult[], id: EvidenceRequirementId): RubricLevel | null {
  for (const result of results) {
    for (const level of result.levels) if (level.evidenceRequirementId === id) return level.level;
  }
  return null;
}

/**
 * One class's teach-next reading, from one competency result set per student.
 *
 * The caller supplies the demand, because which competencies an objective rests on is a fact
 * about a framework and nothing in this directory may know one.
 */
export function teachNextFrom(
  students: readonly (readonly CompetencyResult[])[],
  demand: ObjectiveDemand,
): TeachNextReading {
  const assessedStudents = students.filter((results) => studentOutcomeFor(results, demand).assessed);
  const assessed = assessedStudents.length;
  const competencies = [...new Set([...demand.allOf, ...demand.anyOf])];
  const enough = assessed >= MINIMUM_ASSESSED_FOR_A_STATE;

  const gaps: RequirementGap[] = competencies
    .flatMap((competencyId) => requiredEvidenceRequirementsFor(competencyId))
    .map((requirement) => {
      const levels = assessedStudents.map((results) => levelFor(results, requirement.id));
      const observed = levels.filter((level) => level !== null).length;
      const struggled = levels.filter(isShortfall).length;
      return {
        evidenceRequirementId: requirement.id,
        competencyId: requirement.competencyId,
        label: requirement.label,
        observableRule: requirement.observableRule,
        struggled,
        observed,
        notObserved: assessed - observed,
        percentOfAssessed: enough ? Math.round((struggled / assessed) * 100) : null,
        misconception: requirement.misconceptionIfNot,
      };
    })
    // Worst first, and ties broken by requirement id so two runs of the same evidence can
    // never disagree about what a teacher should do on Monday.
    .sort((a, b) => b.struggled - a.struggled || a.evidenceRequirementId.localeCompare(b.evidenceRequirementId));

  if (assessed === 0) return { state: "not-assessed", assessed, gaps, top: null, reteach: null };
  if (!enough) return { state: "too-few-assessed", assessed, gaps, top: null, reteach: null };

  const leader = gaps[0];
  const clears = leader !== undefined && leader.percentOfAssessed !== null && leader.percentOfAssessed >= GAP_THRESHOLD_PERCENT;
  if (!leader || !clears) return { state: "no-single-gap", assessed, gaps, top: null, reteach: null };
  return {
    state: "one-gap",
    assessed,
    gaps,
    top: leader,
    reteach: reteachFor(leader.misconception) ?? null,
  };
}
