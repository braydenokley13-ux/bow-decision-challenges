import { evidenceRequirementById } from "../domain/competency/competencies";
import { observeCompetencies } from "../domain/competency/observe";
import {
  objectiveResultFrom,
  studentOutcomeFor,
  type ObjectiveDemand,
  type ObjectiveResult,
  type StudentObjectiveOutcome,
} from "../domain/competency/objectiveState";
import { teachNextFrom, type TeachNextReading } from "../domain/competency/teachNext";
import type { CompetencyId, CompetencyResult, CompetencyResultState, EvidenceRequirementObservation } from "../domain/competency/types";
import { spotlightFor, type MisconceptionSpotlight, type SeatResults } from "./misconceptions";
import { contractFor } from "../domain/scenario/contracts";
import { DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { demandFor, type StandardRef } from "../domain/standards";
import type { Assignment, AttributedSubmission, ClassRecord, SubmissionRecord } from "../platform/classes/types";

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
  /**
   * What to teach next, from the same evidence and the same denominator (§18.2). It refuses
   * a recommendation wherever the result refuses a state, so the two can never disagree
   * about whether this class has been assessed.
   */
  teachNext: TeachNextReading;
  /**
   * The class's own work behind the gap being recommended (§18.3). `null` wherever there is
   * no recommendation — a spotlight without a teach-next card would be BOW pointing at
   * students for a reason it declined to state.
   */
  spotlight: MisconceptionSpotlight | null;
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
 * Which world produced this submission, read off the student's own events.
 *
 * The log is the record. A submission has no top-level world because the events carry one
 * each, stamped when they were written — so this cannot disagree with the evidence the way a
 * second, separately-stored field could.
 */
export function worldOfSubmission(submission: SubmissionRecord) {
  return submission.log[0]?.worldId ?? DEFAULT_WORLD_ID;
}

/**
 * One student's competency results, from the log they turned in.
 *
 * Dispatched through the world's own contract rather than importing one world's observer.
 * A world with no contract produces nothing at all — not a fallback to somebody else's
 * rules, which would publish a judgement about a game the student never played.
 */
export function competencyObservationsFor(submission: SubmissionRecord): readonly EvidenceRequirementObservation[] {
  return withTeacherJudgement(machineObservationsFor(submission), submission);
}

/**
 * What the world's own observer said, before anybody disagreed with it.
 *
 * Every roll-up in the product wants the version with the teacher's last word folded in —
 * that is the whole point of an override, and `competencyObservationsFor` is what they call.
 * The evidence trail is the one surface that wants the other thing, and it wants it for the
 * reason the override exists at all: it prints BOW's reading and the teacher's side by side,
 * so a second teacher can see what the first one disagreed with.
 *
 * It was reading the folded version, so after an override the row said **You: Part of it** and
 * **BOW: Part of it** — the machine's original reading vanished from the only screen that
 * showed it, while a comment two lines away promised "both, always". An override that hides
 * what it overrode is not a record of a disagreement, it is a rewrite of one.
 */
export function machineObservationsFor(submission: SubmissionRecord): readonly EvidenceRequirementObservation[] {
  const contract = contractFor(worldOfSubmission(submission));
  if (!contract) return [];
  return contract.observe(submission.log, { reasoningCriteria: submission.reasoningCriteria });
}

/**
 * The teacher's reading, where they have recorded one.
 *
 * §19.4 says a teacher may disagree with a machine judgement on the record, and the record
 * was being kept faithfully and read by nothing. Every roll-up in the product — the student
 * headline, the class share, the teach-next reading, the objective map — went through this
 * function and none of them saw an override, so a teacher who wrote *"they told me they just
 * tapped the button; this was not a planned figure"* against a requirement then read
 * **Demonstrated** at the top of the same page and found their student counted among the
 * demonstrators on the next one. That is worse than not having the feature: it takes the
 * disagreement and reports the opposite.
 *
 * Overrides are appended, so the standing level per requirement is the teacher's last word,
 * and the machine's original is untouched in the log and still shown beside it in the trail.
 * The support cap is not re-applied: a person who has read the run has already accounted for
 * whatever help the student had, and capping their judgement would be the engine overruling
 * the human it exists to defer to.
 */
export function withTeacherJudgement(
  observed: readonly EvidenceRequirementObservation[],
  submission: Pick<SubmissionRecord, "overrides">,
): readonly EvidenceRequirementObservation[] {
  const overrides = submission.overrides ?? [];
  if (overrides.length === 0) return observed;
  // Oldest first in the record, so the last entry for a requirement is the current reading.
  const latest = new Map<string, (typeof overrides)[number]>();
  for (const override of overrides) latest.set(override.evidenceRequirementId, override);

  const judged: EvidenceRequirementObservation[] = [];
  for (const override of latest.values()) {
    const requirement = evidenceRequirementById(override.evidenceRequirementId);
    if (!requirement) continue;
    judged.push({
      evidenceRequirementId: requirement.id,
      // Stated as the requirement's own kind so the engine accepts it. This is the one place
      // a level for a written explanation may arrive without a world having inferred it,
      // because a person typed it.
      kind: requirement.kind,
      level: override.level,
      supportLevel: "standard_access",
      evidenceRefs: [],
      reason: `A teacher read this differently: ${override.note}`,
    });
  }
  return [...observed, ...judged];
}

export function competencyResultsFor(submission: AttributedSubmission): readonly CompetencyResult[] {
  return observeCompetencies(competencyObservationsFor(submission), { submitted: true });
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
  return classResultFor({
    record: input.record,
    assignment,
    demand: demandFor(input.ref),
    submissions: input.submissions,
  });
}

/**
 * The derivation itself, with the demand handed in rather than looked up.
 *
 * Two surfaces read this and they must never disagree: the objective page asks it what one
 * class did against one objective, and the class page and the debrief ask it what that same
 * class did against whatever it was set. Splitting the two would be splitting the product's
 * account of the same evidence in half, which is the defect that let a debrief say nothing
 * needed reteaching while the objective page prescribed a lesson for the same class.
 */
export function classResultFor(input: {
  record: ClassRecord;
  assignment: Assignment;
  demand: ObjectiveDemand;
  submissions: readonly AttributedSubmission[];
}): ObjectiveClassResult {
  const { assignment, demand } = input;
  const mine = input.submissions.filter((submission) => submission.assignmentId === assignment.id);
  const outcomes: StudentObjectiveOutcome[] = [];
  const counts = new Map<CompetencyId, Record<CompetencyResultState, number>>();
  const perStudent: (readonly CompetencyResult[])[] = [];
  // Only seats with a usable result reach the spotlight, for the same reason only they
  // reach the denominator: a student nobody assessed is an absence, not a data point.
  const assessedSeats: SeatResults[] = [];

  for (const submission of mine) {
    const results = competencyResultsFor(submission);
    const outcome = studentOutcomeFor(results, demand);
    outcomes.push(outcome);
    perStudent.push(results);
    if (outcome.assessed) assessedSeats.push({ seatCode: submission.seatCode, submission, results });
    for (const result of results) {
      const row = counts.get(result.competencyId) ?? { ...EMPTY_COUNTS };
      row[result.state] += 1;
      counts.set(result.competencyId, row);
    }
  }

  const teachNext = teachNextFrom(perStudent, demand);

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
    teachNext,
    spotlight: teachNext.top ? spotlightFor(teachNext.top.evidenceRequirementId, assessedSeats) : null,
  };
}
