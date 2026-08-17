import { isCountable, isDemonstrated } from "./observe";
import type { CompetencyId, CompetencyResult } from "./types";

/**
 * Competency results → the state a teacher reads against one objective.
 *
 * Two layers meet here and they are deliberately kept apart. *Which* competencies an
 * objective's demand rests on is a fact about one state's framework and lives in
 * `src/domain/standards/` — nothing in this directory may know that New York calls one of
 * them 1.3. *How many students have to have demonstrated it before the word "Strong" is
 * allowed on a screen* is a product decision that is the same in every jurisdiction, so it
 * lives here, in one file, as named constants.
 *
 * The caller joins the two: it reads the objective's demand out of the mappings, expresses
 * it as an `ObjectiveDemand`, and hands it here with each student's competency results.
 *
 * The two guards below are not decoration. A percentage computed from three students will
 * be read as a fact about twenty-eight, and a "Strong" earned in September is not a fact
 * about March.
 */

/** At or above this share of assessed students, the objective reads Strong. */
export const STRONG_THRESHOLD_PERCENT = 80;

/** At or above this share — and below Strong — it reads Developing. Below it, Needs attention. */
export const DEVELOPING_THRESHOLD_PERCENT = 50;

/**
 * Below this many assessed students, BOW shows the count and refuses the state.
 *
 * "3 of 28 assessed" is a true sentence. "Needs attention" derived from those three is a
 * claim about the twenty-five who were never assessed.
 */
export const MINIMUM_ASSESSED_FOR_A_STATE = 5;

/**
 * Below this many usable results, no surface describes the class as a class.
 *
 * The same product decision as the line above, applied one level out: a share of the
 * assessed students is refused below the minimum, and so is every sentence that speaks
 * about the room rather than about the students in it — "the whole class chose…", a
 * distribution, a lesson to teach next. Counts and individual work are still shown, because
 * both are true at any denominator.
 *
 * It is written as one value rather than two so the two can never drift into a screen that
 * refuses the number and keeps the sentence.
 */
export const MINIMUM_RESULTS_FOR_CLASS_NARRATION = MINIMUM_ASSESSED_FOR_A_STATE;

/** Past this, a state is shown with its date and in muted styling rather than as current. */
export const STALE_AFTER_DAYS = 90;

/**
 * What an objective asks for, said without naming the framework that asks it.
 *
 * `allOf` carries a completion rule — the objectives that bundle several skills under one
 * number, where demonstrating one part is not demonstrating the objective. When it is
 * present it wins outright; `anyOf` is the ordinary case, where a single competency mapped
 * to the whole of the objective is enough.
 *
 * Competencies that merely support an objective belong in neither list. They appear in the
 * evidence trail and never move a state.
 */
export interface ObjectiveDemand {
  /** Any one of these, demonstrated, meets the demand. */
  anyOf: readonly CompetencyId[];
  /** Every one of these must be demonstrated. Empty when the objective bundles nothing. */
  allOf: readonly CompetencyId[];
}

/** One student, against one objective. */
export interface StudentObjectiveOutcome {
  /**
   * A usable result exists.
   *
   * *Not observed* and *incomplete* are not results. A student who is not assessed is
   * missing from the denominator, not sitting at the bottom of it.
   */
  assessed: boolean;
  /** The evidence reached the objective's demand. */
  demonstrated: boolean;
}

export type ObjectiveResultState =
  | "strong"
  | "developing"
  | "needs-attention"
  | "too-few-assessed"
  | "not-assessed";

export interface ObjectiveResult {
  state: ObjectiveResultState;
  /** Students with a usable result. */
  assessed: number;
  /** Of those, how many reached the demand. */
  demonstrated: number;
  /**
   * `null` below the minimum denominator, so a caller cannot render a percentage the
   * evidence does not support even by accident. Rounded, because a teacher reads a whole
   * number and a spurious decimal implies a precision that five students do not have.
   */
  percentDemonstrated: number | null;
}

/** Only results that can be counted, keyed by competency. */
function usableResults(results: readonly CompetencyResult[]): ReadonlyMap<CompetencyId, CompetencyResult> {
  const usable = new Map<CompetencyId, CompetencyResult>();
  for (const result of results) if (isCountable(result.state)) usable.set(result.competencyId, result);
  return usable;
}

/**
 * One student's outcome on one objective.
 *
 * A bundled objective is assessed only when every part of it has a result — otherwise it is
 * *partially assessed*, which is not the same as a low one, and reporting a percentage
 * against a third of an objective's demand is how a district gets misled.
 */
export function studentOutcomeFor(
  results: readonly CompetencyResult[],
  demand: ObjectiveDemand,
): StudentObjectiveOutcome {
  const usable = usableResults(results);
  const met = (id: CompetencyId) => {
    const result = usable.get(id);
    return result !== undefined && isDemonstrated(result.state);
  };
  if (demand.allOf.length > 0) {
    return {
      assessed: demand.allOf.every((id) => usable.has(id)),
      demonstrated: demand.allOf.every(met),
    };
  }
  return {
    assessed: demand.anyOf.some((id) => usable.has(id)),
    demonstrated: demand.anyOf.some(met),
  };
}

/**
 * The class-level state, from one outcome per student.
 *
 * Students with no usable result are counted out, not counted as failures. That is the
 * whole reason the denominator is `assessed` rather than the size of the class, and it is
 * why the count travels with the state everywhere it is displayed.
 */
export function objectiveResultFrom(outcomes: readonly StudentObjectiveOutcome[]): ObjectiveResult {
  const assessedOutcomes = outcomes.filter((outcome) => outcome.assessed);
  const assessed = assessedOutcomes.length;
  const demonstrated = assessedOutcomes.filter((outcome) => outcome.demonstrated).length;
  if (assessed === 0) return { state: "not-assessed", assessed: 0, demonstrated: 0, percentDemonstrated: null };
  if (assessed < MINIMUM_ASSESSED_FOR_A_STATE) {
    return { state: "too-few-assessed", assessed, demonstrated, percentDemonstrated: null };
  }
  const percentDemonstrated = Math.round((demonstrated / assessed) * 100);
  const state = percentDemonstrated >= STRONG_THRESHOLD_PERCENT
    ? "strong"
    : percentDemonstrated >= DEVELOPING_THRESHOLD_PERCENT
      ? "developing"
      : "needs-attention";
  return { state, assessed, demonstrated, percentDemonstrated };
}

/** Whether a result is old enough that it must be shown with its date rather than as current. */
export function isStale(daysSinceLastAssessed: number): boolean {
  return daysSinceLastAssessed > STALE_AFTER_DAYS;
}

/**
 * The share of assigned students who have to have turned work in before an assignment stops
 * reading as still open (§15.3).
 *
 * It is the same 80 as the Strong threshold and it is deliberately a second constant. They
 * answer different questions — "is enough of the class in yet" and "did enough of them
 * demonstrate it" — and a product decision to move one is not a decision to move the other.
 */
export const SUBMITTED_ENOUGH_PERCENT = 80;

/**
 * What one objective reads as on the map, for one class.
 *
 * §15.3 defines these and insists none of them overlap, because a teacher makes
 * instructional decisions from the word. Two are absences rather than outcomes and must
 * never be coloured like a low score: *not available* is a fact about BOW, and *not taught*
 * is the default a teacher has not acted on yet.
 *
 * `assessed` from the specification is not here. It is defined there as transient — "resolves
 * immediately into one of the three below" — so a state nothing can ever be observed in is a
 * step in a derivation rather than a value, and it is written as one below.
 */
export type ObjectiveMapState =
  | "not-available"
  | "not-taught"
  | "taught-not-assessed"
  | "assigned"
  | "partially-assessed"
  | "too-few-assessed"
  | "strong"
  | "developing"
  | "needs-attention";

/** What the map needs to know about one objective in one class, and deliberately no more. */
export interface ObjectiveMapInput {
  /** Some built world produces every required requirement of a competency mapped `full`. */
  available: boolean;
  /** A person ticked it. §15.3: set by the teacher, never inferred. */
  markedTaught: boolean;
  /** An assignment for this objective exists on this class. */
  assigned: boolean;
  /**
   * How many students it was set for, when the assignment names them.
   *
   * `null` for a whole-class assignment, which is most of them: V1 has no roster (§17.4), so
   * there is no denominator to measure a submission rate against. The rule that needs one is
   * skipped rather than guessed at.
   */
  assignedStudents: number | null;
  submitted: number;
  /**
   * For a bundled objective, how many of the competencies its completion rule requires have
   * a usable class result. Zero for every objective without a completion rule.
   */
  partsWithResults: number;
  partsRequired: number;
  result: ObjectiveResult;
}

/**
 * §15.3, in the order the rows have to be read.
 *
 * The order is the whole of the correctness here. Availability comes first because an
 * objective BOW cannot assess must never read as one a class did badly at. Partial
 * assessment comes before any result state because a bundled objective with a third of its
 * evidence in is not Developing — it is a third of an objective, and §15.3 says it never
 * resolves to a result state until it is complete. The denominator guard comes before the
 * thresholds for the same reason it does one layer down: a state derived from three students
 * will be read as a fact about twenty-eight.
 */
export function objectiveMapStateFrom(input: ObjectiveMapInput): ObjectiveMapState {
  if (!input.available) return "not-available";
  if (!input.assigned) return input.markedTaught ? "taught-not-assessed" : "not-taught";

  // An assignment that named its students carries its own denominator, so "is enough of the
  // class in yet" is answerable. One set for the whole class does not, and guessing at the
  // size of a room BOW has never been told about is how a teacher gets told their class is
  // behind when every student in it has finished.
  const enoughIn = input.assignedStudents === null
    ? input.submitted > 0
    : input.submitted * 100 >= input.assignedStudents * SUBMITTED_ENOUGH_PERCENT;
  if (!enoughIn) return "assigned";

  if (input.partsRequired > 0 && input.partsWithResults < input.partsRequired) return "partially-assessed";
  if (input.result.assessed === 0) return "assigned";
  if (input.result.percentDemonstrated === null) return "too-few-assessed";
  return input.result.state === "strong" || input.result.state === "developing" || input.result.state === "needs-attention"
    ? input.result.state
    : "too-few-assessed";
}

/**
 * Whether this state is a claim about students at all.
 *
 * The four that are not carry no percentage, no denominator and no colour from the result
 * ramp — and a surface that treated them as low scores would be reporting a fact about BOW's
 * coverage, or about a teacher's week, as a fact about a room of children.
 */
export function isResultState(state: ObjectiveMapState): boolean {
  return state === "strong" || state === "developing" || state === "needs-attention";
}
