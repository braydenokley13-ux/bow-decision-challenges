import { observeCompetencies } from "../domain/competency/observe";
import { objectiveResultFrom, studentOutcomeFor, type ObjectiveResult, type StudentObjectiveOutcome } from "../domain/competency/objectiveState";
import type { CompetencyId, CompetencyResult, CompetencyResultState } from "../domain/competency/types";
import { observeBasketballFromLog } from "../domain/scenario/worlds/basketball/observer";
import { scoredExplanationsFrom } from "../domain/scenario/worlds/basketball/writtenDefense";
import { demandFor, type StandardRef } from "../domain/standards";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";

/**
 * One class's evidence, against one objective a teacher assigned.
 *
 * The join the product exists to make: a teacher chose 1.3, students played a world, and
 * this turns what they did into a sentence about 1.3 that the mappings actually support.
 * Nothing here decides what 1.3 asks for — `demandFor` does, from the mappings — and nothing
 * here decides what counts as demonstrating a competency; `observeCompetencies` does, from
 * the common rubric. This is the plumbing between them, and it holds two rules of its own:
 *
 * - **A submission that produced no usable result is not in the denominator.** A student
 *   whose written explanation nobody has read yet is *incomplete*, which is an absence, and
 *   counting it as a failure would report a fact about a teacher's marking backlog as a fact
 *   about a child.
 * - **Only submissions attributed to an assignment on this objective are counted.** A class
 *   that has been set two things has two denominators, and pooling them would report one
 *   assignment's evidence under the other's number.
 */

export interface CompetencyBreakdownRow {
  competencyId: CompetencyId;
  /** How many students landed in each state. Absences included, and named as absences. */
  counts: Record<CompetencyResultState, number>;
}

export interface ObjectiveClassResult {
  record: ClassRecord;
  assignment: Assignment;
  /** Students who turned work in against this assignment. Never the size of the class. */
  submitted: number;
  /** Of those, how many still have writing nobody has read. */
  awaitingReading: number;
  result: ObjectiveResult;
  competencies: readonly CompetencyBreakdownRow[];
  lastSubmittedAt: number | null;
}

const EMPTY_COUNTS: Record<CompetencyResultState, number> = {
  demonstrated: 0,
  "demonstrated-with-support": 0,
  developing: 0,
  "not-yet-demonstrated": 0,
  "not-observed": 0,
  incomplete: 0,
};

/**
 * One student's competency results, from the log they turned in.
 *
 * The world is named here because there is one. Checkpoint 8 replaces this line with the
 * world contract's own observer lookup; until a second world exists, pretending to dispatch
 * would be a layer with one case in it.
 */
export function competencyResultsFor(submission: AttributedSubmission): readonly CompetencyResult[] {
  const scored = scoredExplanationsFrom(submission.reasoningCriteria);
  const observations = observeBasketballFromLog(submission.log, scored ? { scoredExplanations: scored } : {});
  return observeCompetencies(observations, { submitted: true });
}

/**
 * What this class did against this objective, or `null` if it was never set it.
 *
 * `null` rather than an empty result, because "this class was not asked to do this" and
 * "this class was asked and nobody has finished" are different sentences and only the second
 * belongs on an objective's results.
 */
export function objectiveResultForClass(input: {
  ref: StandardRef;
  record: ClassRecord;
  assignments: readonly Assignment[];
  submissions: readonly AttributedSubmission[];
}): ObjectiveClassResult | null {
  const assignment = input.assignments.find(
    (entry) => entry.objectiveRef?.frameworkId === input.ref.frameworkId && entry.objectiveRef.code === input.ref.code,
  );
  if (!assignment) return null;

  const mine = input.submissions.filter((submission) => submission.assignmentId === assignment.id);
  const demand = demandFor(input.ref);
  const outcomes: StudentObjectiveOutcome[] = [];
  const counts = new Map<CompetencyId, Record<CompetencyResultState, number>>();

  for (const submission of mine) {
    const results = competencyResultsFor(submission);
    outcomes.push(studentOutcomeFor(results, demand));
    for (const result of results) {
      const row = counts.get(result.competencyId) ?? { ...EMPTY_COUNTS };
      row[result.state] += 1;
      counts.set(result.competencyId, row);
    }
  }

  // Ordered by the demand rather than by whichever competency happened to be observed
  // first, so the skill the objective actually rests on is the row a teacher reads first.
  const ordered = [...demand.allOf, ...demand.anyOf, ...[...counts.keys()].filter((id) => ![...demand.allOf, ...demand.anyOf].includes(id))];
  return {
    record: input.record,
    assignment,
    submitted: mine.length,
    awaitingReading: mine.filter((submission) => submission.reasoningPoints === null).length,
    result: objectiveResultFrom(outcomes),
    competencies: [...new Set(ordered)].flatMap((competencyId) => {
      const row = counts.get(competencyId);
      return row ? [{ competencyId, counts: row }] : [];
    }),
    lastSubmittedAt: mine.reduce<number | null>((latest, submission) => Math.max(latest ?? 0, submission.submittedAt), null),
  };
}
