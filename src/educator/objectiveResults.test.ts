import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { MINIMUM_ASSESSED_FOR_A_STATE } from "../domain/competency/objectiveState";
import { scoredExplanationsFrom } from "../domain/scenario/worlds/basketball/writtenDefense";
import { buildSubmission } from "../test/runChallenge";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import { competencyResultsFor, objectiveResultForClass } from "./objectiveResults";

/**
 * What a teacher is told about an objective, and everything they must not be told.
 *
 * Three rules do the work, and each is a way this screen could lie:
 *
 * - a percentage without its denominator,
 * - a class state from a handful of students,
 * - a missing piece of evidence rendered as a failure.
 *
 * The third is the one that costs a child something. A student whose written explanation
 * nobody has read yet is *incomplete*, which is an absence — counting them at the bottom of
 * the denominator would report a teacher's marking backlog as a fact about them.
 */

const NOW = 1_780_000_000_000;
const BUDGET = { frameworkId: "nysed-pf-2026" as const, code: "1.3" };

const CLASS: ClassRecord = {
  code: "H4KVW",
  label: "Period 3",
  challengeId: "plan-under-pressure",
  createdAt: NOW,
  expiresAt: NOW + 1000,
};

const ASSIGNMENT: Assignment = {
  id: "assignment-H4KVW-AAAAACCCCC",
  classId: "H4KVW",
  objectiveRef: BUDGET,
  competencyIds: ["plan-within-income"],
  allowedWorldIds: ["basketball"],
  studentChoosesWorld: false,
  format: "decision-challenge",
  assignedStudentIds: null,
  createdAt: NOW,
};

/** Full marks on every criterion — a person who read the writing and thought it was good. */
const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

function submission(seatCode: string, options: { scores?: ReasoningScores; assignmentId?: string } = {}): AttributedSubmission {
  const built = buildSubmission({ seatCode });
  return {
    ...built,
    assignmentId: options.assignmentId ?? ASSIGNMENT.id,
    reasoningPoints: options.scores ? 10 : null,
    ...(options.scores ? { reasoningCriteria: options.scores } : {}),
  };
}

function resultFor(submissions: readonly AttributedSubmission[], assignments: readonly Assignment[] = [ASSIGNMENT]) {
  return objectiveResultForClass({ ref: BUDGET, record: CLASS, assignments, submissions });
}

describe("what a class did against one objective", () => {
  it("says nothing at all about a class that was never set it", () => {
    // Not the same sentence as "set it and nobody finished", and only the second belongs on
    // an objective's results.
    const elsewhere: Assignment = { ...ASSIGNMENT, objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.1" } };
    expect(resultFor([submission("7")], [elsewhere])).toBeNull();
    expect(resultFor([], [{ ...ASSIGNMENT, objectiveRef: null }])).toBeNull();
  });

  it("reports not yet assessed, never 0%, when nobody has turned anything in", () => {
    const result = resultFor([]);
    expect(result?.result.state).toBe("not-assessed");
    expect(result?.result.percentDemonstrated).toBeNull();
    expect(result?.submitted).toBe(0);
  });

  it("counts a student whose writing nobody has read as unassessed rather than as a failure", () => {
    // `plan-within-income` requires an explanation, and BOW never scores one. Until a person
    // has, the competency is incomplete — which is an absence and stays out of the
    // denominator entirely.
    const result = resultFor([submission("7"), submission("8"), submission("9")]);
    expect(result?.submitted).toBe(3);
    expect(result?.awaitingReading).toBe(3);
    expect(result?.result.assessed).toBe(0);
    expect(result?.result.state).toBe("not-assessed");
    const breakdown = result?.competencies.find((row) => row.competencyId === "plan-within-income");
    expect(breakdown?.counts.incomplete).toBe(3);
    expect(breakdown?.counts["not-yet-demonstrated"]).toBe(0);
  });

  it("shows the count and refuses a class state below the minimum denominator", () => {
    // The three-student case: "3 of 3 assessed" is true, and any state derived from three is
    // a claim about the students nobody assessed.
    const three = ["7", "8", "9"].map((seat) => submission(seat, { scores: READ_AND_STRONG }));
    const result = resultFor(three);
    expect(result?.result.assessed).toBe(3);
    expect(result?.result.demonstrated).toBe(3);
    expect(result?.result.state).toBe("too-few-assessed");
    expect(result?.result.percentDemonstrated).toBeNull();
  });

  it("reports a share only once enough students have a usable result", () => {
    const enough = Array.from({ length: MINIMUM_ASSESSED_FOR_A_STATE }, (_, index) =>
      submission(String(index + 7), { scores: READ_AND_STRONG }));
    const result = resultFor(enough);
    expect(result?.result.assessed).toBe(MINIMUM_ASSESSED_FOR_A_STATE);
    expect(result?.result.percentDemonstrated).toBe(100);
    expect(result?.result.state).toBe("strong");
  });

  it("keeps two assignments in one class apart", () => {
    // A class set two things has two denominators. Pooling them would report one
    // assignment's evidence under the other's number.
    const second: Assignment = { ...ASSIGNMENT, id: "assignment-H4KVW-DDDDDEEEEE", createdAt: NOW + 1 };
    const result = resultFor(
      [submission("7", { scores: READ_AND_STRONG }), submission("8", { scores: READ_AND_STRONG, assignmentId: second.id })],
      [ASSIGNMENT, second],
    );
    expect(result?.assignment.id).toBe(ASSIGNMENT.id);
    expect(result?.submitted).toBe(1);
  });

  it("leads with the skill the objective actually rests on", () => {
    const result = resultFor([submission("7", { scores: READ_AND_STRONG })]);
    expect(result?.competencies[0]?.competencyId).toBe("plan-within-income");
  });
});

describe("a person's reading of the writing, on the shared rubric", () => {
  it("produces no level at all until somebody has read it", () => {
    expect(scoredExplanationsFrom(undefined)).toBeUndefined();
    expect(scoredExplanationsFrom({})).toBeUndefined();
    const unread = competencyResultsFor(submission("7"));
    const levels = unread.find((result) => result.competencyId === "plan-within-income")?.levels;
    expect(levels?.find((level) => level.evidenceRequirementId === "plan-within-income.er5")?.level).toBeNull();
  });

  it("reads full marks on the parts the requirement asks for as demonstrated", () => {
    const scored = scoredExplanationsFrom(READ_AND_STRONG);
    expect(scored?.["plan-within-income.er5"]).toBe(5);
    expect(scored?.["adapt-a-plan.er5"]).toBe(5);
  });

  it("marks a gap as a gap rather than as nothing", () => {
    // Named the trade-off and quoted no numbers. One part of the requirement is missing, so
    // it is partial — not a zero, and not silently full marks either.
    const noNumbers = scoredExplanationsFrom({ "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 0 });
    expect(noNumbers?.["plan-within-income.er5"]).toBe(2);
    // Quoted numbers and named neither what was given up nor what for: two parts missing.
    const numbersOnly = scoredExplanationsFrom({ "C6.1": 2, "C6.2": 0, "C6.3": 0, "C6.4": 4 });
    expect(numbersOnly?.["plan-within-income.er5"]).toBe(0);
  });

  it("does not let workability stand behind a requirement it does not answer", () => {
    // "Why the plan holds" is a claim about the plan, not about a trade-off or a protected
    // line. Marking it alone moves neither requirement.
    const workabilityOnly = scoredExplanationsFrom({ "C6.1": 2 });
    expect(workabilityOnly?.["plan-within-income.er5"]).toBe(0);
    expect(workabilityOnly?.["adapt-a-plan.er5"]).toBe(0);
  });

  it("never invents a level a person did not give", () => {
    // Every level below comes out of marks somebody typed. Two students with the same marks
    // get the same level, and no level exists without marks.
    const first = scoredExplanationsFrom({ "C6.2": 1, "C6.3": 2, "C6.4": 4 });
    const second = scoredExplanationsFrom({ "C6.2": 1, "C6.3": 2, "C6.4": 4 });
    expect(first).toEqual(second);
    expect(first?.["plan-within-income.er5"]).toBe(4);
  });
});
