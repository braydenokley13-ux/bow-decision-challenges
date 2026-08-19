import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { MINIMUM_ASSESSED_FOR_A_STATE, MINIMUM_RESULTS_FOR_CLASS_NARRATION } from "../domain/competency/objectiveState";
import { buildSubmission } from "../test/runChallenge";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import { classSpineFrom } from "./classSpine";
import { objectiveResultForClass } from "./objectiveResults";

/**
 * One derivation, two surfaces, and the denominator that governs both.
 *
 * Two defects are pinned here and they are the two a teacher would have caught the product
 * on. The debrief used to roll this evidence up to concept level and print "nothing here
 * needs reteaching" for a class whose objective page was prescribing a reteach off a failed
 * required requirement — so the first half asserts that the reading behind both is the same
 * object, not two computations that happen to agree today. And a class page used to narrate
 * consensus from a single submission — so the second half asserts that under the minimum
 * denominator there is no share, no state and no lesson, and that the counts survive.
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

/** A class nobody set an objective on. The service synthesises one of these on read (§17.3). */
const LEGACY_ASSIGNMENT: Assignment = {
  ...ASSIGNMENT,
  id: "assignment-H4KVW-legacy",
  objectiveRef: null,
  competencyIds: ["plan-within-income", "adapt-a-plan"],
};

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

/**
 * One seat's run. `savingsAsLeftovers` closes the opening plan by dropping the remainder
 * into the course row, which is the "savings is whatever is left" behaviour ER3 exists to
 * catch; the alternative names a row on purpose.
 */
function seat(seatCode: string, options: { savingsAsLeftovers?: boolean; read?: boolean; assignment?: Assignment } = {}): AttributedSubmission {
  const built = buildSubmission({
    seatCode,
    closeOpeningInto: options.savingsAsLeftovers ? "goal" : "flexibleCash",
  });
  return {
    ...built,
    assignmentId: (options.assignment ?? ASSIGNMENT).id,
    reasoningPoints: options.read === false ? null : 10,
    ...(options.read === false ? {} : { reasoningCriteria: READ_AND_STRONG }),
  };
}

function classOf(count: number, options: { savingsAsLeftovers?: boolean; assignment?: Assignment } = {}): AttributedSubmission[] {
  return Array.from({ length: count }, (_, index) => seat(String(index + 1), options));
}

describe("the debrief and the objective page read one derivation", () => {
  const submissions = classOf(6, { savingsAsLeftovers: true });

  it("produces the identical reading from the class's own assignment and from the objective", () => {
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    const objective = objectiveResultForClass({ ref: BUDGET, record: CLASS, assignments: [ASSIGNMENT], submissions });
    expect(objective).not.toBeNull();
    expect(spine.reading).toEqual(objective);
  });

  it("names the same requirement, with the same counts, on both", () => {
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    const objective = objectiveResultForClass({ ref: BUDGET, record: CLASS, assignments: [ASSIGNMENT], submissions })!;
    const fromClass = spine.reading!.teachNext;
    expect(fromClass.state).toBe("one-gap");
    expect(fromClass.top!.evidenceRequirementId).toBe(objective.teachNext.top!.evidenceRequirementId);
    expect(fromClass.top!.struggled).toBe(objective.teachNext.top!.struggled);
    expect(fromClass.assessed).toBe(objective.teachNext.assessed);
    // The failure this replaced: a surface saying nothing needs reteaching while a required
    // requirement was short in most of the class.
    expect(fromClass.top!.struggled).toBeGreaterThan(0);
    expect(fromClass.gaps.map((gap) => gap.evidenceRequirementId))
      .toEqual(objective.teachNext.gaps.map((gap) => gap.evidenceRequirementId));
  });

  it("reads a class nobody set an objective on against what the challenge measures", () => {
    const legacy = classOf(6, { savingsAsLeftovers: true, assignment: LEGACY_ASSIGNMENT });
    const spine = classSpineFrom({ record: CLASS, assignments: [LEGACY_ASSIGNMENT], submissions: legacy });
    expect(spine.objectiveRef).toBeNull();
    expect(spine.reading).not.toBeNull();
    expect(spine.assessed).toBe(6);
    expect(spine.reading!.teachNext.gaps.length).toBeGreaterThan(0);
  });

  it("keeps both surfaces on the same module rather than on the same intention", () => {
    // A source scan, because the drift this guards is a second derivation somebody adds in
    // a hurry — invisible to any test that only checks today's numbers agree.
    const debrief = readFileSync("src/educator/Debrief.tsx", "utf8");
    expect(debrief).toContain("classSpineFrom");
    // The concept roll-up is what masked a failed required requirement. Nothing on this page
    // may decide what to review from it again.
    expect(debrief).not.toMatch(/analysis\.concepts|needsFollowUp/);
    const classPage = readFileSync("src/educator/RealClassPages.tsx", "utf8");
    expect(classPage).toContain("classSpineFrom");
    expect(classPage).not.toMatch(/analysis\.concepts|needsFollowUp/);
  });
});

describe("the minimum denominator", () => {
  it("is the same number everywhere it is applied", () => {
    expect(MINIMUM_RESULTS_FOR_CLASS_NARRATION).toBe(MINIMUM_ASSESSED_FOR_A_STATE);
  });

  it("refuses every claim about the class one result short of it", () => {
    const submissions = classOf(MINIMUM_RESULTS_FOR_CLASS_NARRATION - 1, { savingsAsLeftovers: true });
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    expect(spine.assessed).toBe(MINIMUM_RESULTS_FOR_CLASS_NARRATION - 1);
    expect(spine.narratable).toBe(false);
    expect(spine.submitted).toBe(MINIMUM_RESULTS_FOR_CLASS_NARRATION - 1);
    // No share, at any level of the reading.
    expect(spine.reading!.result.percentDemonstrated).toBeNull();
    expect(spine.reading!.result.state).toBe("too-few-assessed");
    for (const gap of spine.reading!.teachNext.gaps) expect(gap.percentOfAssessed).toBeNull();
    // No lesson, and no spotlight to point at children for a reason it declined to state.
    expect(spine.reading!.teachNext.state).toBe("too-few-assessed");
    expect(spine.reading!.teachNext.top).toBeNull();
    expect(spine.reading!.spotlight).toBeNull();
  });

  it("keeps the counts, because a count is true at any denominator", () => {
    const submissions = classOf(3, { savingsAsLeftovers: true });
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    expect(spine.submitted).toBe(3);
    expect(spine.reading!.result.assessed).toBe(3);
    expect(spine.reading!.teachNext.gaps.length).toBeGreaterThan(0);
    expect(spine.reading!.teachNext.gaps.some((gap) => gap.struggled > 0)).toBe(true);
  });

  it("starts describing the class at exactly the minimum", () => {
    const submissions = classOf(MINIMUM_RESULTS_FOR_CLASS_NARRATION, { savingsAsLeftovers: true });
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    expect(spine.assessed).toBe(MINIMUM_RESULTS_FOR_CLASS_NARRATION);
    expect(spine.narratable).toBe(true);
    expect(spine.reading!.result.percentDemonstrated).not.toBeNull();
  });

  it("separates what the room did from what it showed", () => {
    // Five runs in and nobody's writing read: what students decided is countable and is
    // shown, and every claim that rests on a usable result is still refused.
    const submissions = Array.from({ length: 5 }, (_, index) => seat(String(index + 1), { read: false }));
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    expect(spine.submitted).toBe(5);
    expect(spine.awaitingReading).toBe(5);
    expect(spine.assessed).toBe(0);
    expect(spine.narratable).toBe(true);
    expect(spine.reading!.result.percentDemonstrated).toBeNull();
    expect(spine.reading!.result.state).toBe("not-assessed");
    expect(spine.reading!.teachNext.state).toBe("not-assessed");
    expect(spine.reading!.spotlight).toBeNull();
  });

  it("counts a student whose writing nobody has read as an absence rather than a result", () => {
    const submissions = [
      ...classOf(5, { savingsAsLeftovers: true }),
      seat("20", { read: false }),
      seat("21", { read: false }),
    ];
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions });
    expect(spine.submitted).toBe(7);
    expect(spine.awaitingReading).toBe(2);
    expect(spine.assessed).toBe(5);
  });

  it("says nothing at all about a class nobody has submitted to", () => {
    const spine = classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions: [] });
    expect(spine.submitted).toBe(0);
    expect(spine.assessed).toBe(0);
    expect(spine.narratable).toBe(false);
    expect(spine.reading!.result.state).toBe("not-assessed");
    expect(spine.reading!.teachNext.state).toBe("not-assessed");
  });
});
