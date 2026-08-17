import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { MINIMUM_ASSESSED_FOR_A_STATE } from "../domain/competency/objectiveState";
import { buildSubmission } from "../test/runChallenge";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import { objectiveResultForClass } from "./objectiveResults";
import { writtenExplanationOf } from "./misconceptions";

/**
 * Teach-next and the misconception spotlight, on evidence a real run produced.
 *
 * The unit tests one layer down prove the arithmetic. What is proved here is the join: that
 * a recommendation on a teacher's screen came from submissions this class actually made,
 * that it refuses itself under exactly the conditions the result refuses a state, and that
 * a student BOW has nothing to say about never appears as a student who got it wrong.
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

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

/**
 * One seat's run. `savingsAsLeftovers` closes the opening plan by dropping the remainder
 * into the course row, which is the "savings is whatever is left" behaviour ER3 exists to
 * catch; the alternative names a row on purpose.
 */
function seat(seatCode: string, options: { savingsAsLeftovers?: boolean; read?: boolean } = {}): AttributedSubmission {
  const built = buildSubmission({
    seatCode,
    closeOpeningInto: options.savingsAsLeftovers ? "goal" : "flexibleCash",
  });
  return {
    ...built,
    assignmentId: ASSIGNMENT.id,
    reasoningPoints: options.read === false ? null : 10,
    ...(options.read === false ? {} : { reasoningCriteria: READ_AND_STRONG }),
  };
}

function resultFor(submissions: readonly AttributedSubmission[]) {
  const result = objectiveResultForClass({ ref: BUDGET, record: CLASS, assignments: [ASSIGNMENT], submissions });
  if (!result) throw new Error("expected a result for a class that was set this objective");
  return result;
}

describe("what a teacher is told to teach next", () => {
  it("says nothing at all about a class nobody has submitted to", () => {
    const result = resultFor([]);
    expect(result.teachNext.state).toBe("not-assessed");
    expect(result.teachNext.top).toBeNull();
    expect(result.spotlight).toBeNull();
  });

  it("refuses the recommendation, but not the counts, below the minimum denominator", () => {
    const few = Array.from({ length: MINIMUM_ASSESSED_FOR_A_STATE - 1 }, (_, index) => seat(String(index + 1)));
    const result = resultFor(few);
    expect(result.teachNext.state).toBe("too-few-assessed");
    expect(result.teachNext.assessed).toBe(MINIMUM_ASSESSED_FOR_A_STATE - 1);
    expect(result.teachNext.top).toBeNull();
    expect(result.spotlight).toBeNull();
    // No percentage may exist anywhere in the reading at this denominator.
    expect(result.teachNext.gaps.every((gap) => gap.percentOfAssessed === null)).toBe(true);
    expect(result.teachNext.gaps.length).toBeGreaterThan(0);
  });

  it("never counts a student whose writing nobody has read into the denominator", () => {
    const result = resultFor([
      ...Array.from({ length: 5 }, (_, index) => seat(String(index + 1))),
      seat("20", { read: false }),
      seat("21", { read: false }),
    ]);
    expect(result.submitted).toBe(7);
    expect(result.awaitingReading).toBe(2);
    expect(result.teachNext.assessed).toBe(5);
  });

  it("recommends only from what students did, and shows its working", () => {
    // Six of eight closed the opening plan by letting the leftovers land on the goal.
    const result = resultFor([
      ...Array.from({ length: 6 }, (_, index) => seat(String(index + 1), { savingsAsLeftovers: true })),
      ...Array.from({ length: 2 }, (_, index) => seat(String(index + 10))),
    ]);
    expect(result.teachNext.assessed).toBe(8);
    expect(result.teachNext.state).toBe("one-gap");
    const top = result.teachNext.top!;
    expect(top.struggled).toBeGreaterThanOrEqual(6);
    expect(top.percentOfAssessed).toBeGreaterThanOrEqual(20);
    // The count, the denominator and the requirement all travel together.
    expect(top.struggled).toBeLessThanOrEqual(result.teachNext.assessed);
    expect(top.label.length).toBeGreaterThan(0);
    expect(top.observableRule.length).toBeGreaterThan(0);
  });

  it("names a misconception only where the model names one, and never invents a lesson", () => {
    const result = resultFor(Array.from({ length: 8 }, (_, index) => seat(String(index + 1), { savingsAsLeftovers: true })));
    const top = result.teachNext.top!;
    if (top.misconception === null) {
      expect(result.teachNext.reteach).toBeNull();
    } else {
      expect(result.teachNext.reteach).not.toBeNull();
      expect(result.teachNext.reteach!.misconception).toBe(top.misconception);
    }
  });

  it("says no single gap stands out when a class simply did it", () => {
    const result = resultFor(Array.from({ length: 8 }, (_, index) => seat(String(index + 1))));
    expect(result.teachNext.state).toBe("no-single-gap");
    expect(result.teachNext.top).toBeNull();
    expect(result.spotlight).toBeNull();
  });
});

describe("the misconception spotlight", () => {
  const struggling = Array.from({ length: 6 }, (_, index) => seat(String(index + 1), { savingsAsLeftovers: true }));
  const fine = Array.from({ length: 2 }, (_, index) => seat(String(index + 10)));

  it("quotes the class's own work, and nobody else's", () => {
    const result = resultFor([...struggling, ...fine]);
    const spotlight = result.spotlight!;
    expect(spotlight).not.toBeNull();
    const seats = spotlight.evidenced.map((example) => example.seatCode);
    expect(seats.length).toBeGreaterThan(0);
    for (const example of spotlight.evidenced) {
      const source = [...struggling, ...fine].find((entry) => entry.seatCode === example.seatCode)!;
      expect(example.writing).toBe(writtenExplanationOf(source));
    }
  });

  it("separates a student whose run shows it from a student BOW has nothing on", () => {
    const result = resultFor([...struggling, ...fine]);
    const spotlight = result.spotlight!;
    const evidencedSeats = new Set(spotlight.evidenced.map((example) => example.seatCode));
    const missingSeats = new Set(spotlight.missing.map((absence) => absence.seatCode));
    // A seat is in exactly one list. An absence is never also a finding.
    for (const code of evidencedSeats) expect(missingSeats.has(code)).toBe(false);
    expect(spotlight.evidenced.length + spotlight.missing.length).toBeLessThanOrEqual(result.teachNext.assessed);
  });

  it("only ever reports levels the rubric actually produced", () => {
    const result = resultFor([...struggling, ...fine]);
    for (const example of result.spotlight!.evidenced) expect([0, 2]).toContain(example.level);
  });

  it("is withheld entirely when there is no recommendation to explain", () => {
    expect(resultFor(Array.from({ length: 8 }, (_, index) => seat(String(index + 1)))).spotlight).toBeNull();
    expect(resultFor([]).spotlight).toBeNull();
  });
});
