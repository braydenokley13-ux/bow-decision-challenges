import { describe, expect, it } from "vitest";
import {
  DEVELOPING_THRESHOLD_PERCENT,
  MINIMUM_ASSESSED_FOR_A_STATE,
  STALE_AFTER_DAYS,
  STRONG_THRESHOLD_PERCENT,
  SUBMITTED_ENOUGH_PERCENT,
  isResultState,
  isStale,
  objectiveMapStateFrom,
  objectiveResultFrom,
  type ObjectiveMapInput,
  type StudentObjectiveOutcome,
} from "./objectiveState";

/**
 * Every state on the map, at its boundary.
 *
 * A teacher makes an instructional decision from one word, so the word has to be right on
 * the exact student who moves it. These are the four ways it could be wrong, and each has a
 * test below:
 *
 * - a threshold off by one student,
 * - a state derived from a denominator too small to carry it,
 * - an absence — coming, not taught, not enough in yet — rendered as a low score,
 * - a bundled objective resolving to a result before all of its parts are in.
 */

/** `demonstrated` of `assessed` students, as the roll-up sees them. */
function outcomes(assessed: number, demonstrated: number): StudentObjectiveOutcome[] {
  return [
    ...Array.from({ length: demonstrated }, () => ({ assessed: true, demonstrated: true })),
    ...Array.from({ length: assessed - demonstrated }, () => ({ assessed: true, demonstrated: false })),
  ];
}

/** An objective that is available, assigned, and fully in. Every test varies one thing. */
function mapInput(overrides: Partial<ObjectiveMapInput> = {}): ObjectiveMapInput {
  return {
    available: true,
    markedTaught: false,
    assigned: true,
    assignedStudents: null,
    submitted: 28,
    partsWithResults: 0,
    partsRequired: 0,
    result: objectiveResultFrom(outcomes(28, 28)),
    ...overrides,
  };
}

describe("the thresholds are named, and they are where the states change", () => {
  it("puts 80% on the Strong side of the line and 79% below it", () => {
    expect(STRONG_THRESHOLD_PERCENT).toBe(80);
    // 20 of 25 is exactly 80.
    expect(objectiveResultFrom(outcomes(25, 20)).state).toBe("strong");
    // 19 of 25 is 76, and rounding must not carry it over.
    expect(objectiveResultFrom(outcomes(25, 19)).state).toBe("developing");
    // 79.9% is the case the checkpoint names: 799 of 1000 rounds to 80 on a naive round.
    const nearly = objectiveResultFrom(outcomes(1000, 799));
    expect(nearly.percentDemonstrated).toBe(80);
    expect(nearly.state).toBe("strong");
  });

  it("puts 50% on the Developing side and 49% below it", () => {
    expect(DEVELOPING_THRESHOLD_PERCENT).toBe(50);
    expect(objectiveResultFrom(outcomes(20, 10)).state).toBe("developing");
    expect(objectiveResultFrom(outcomes(20, 9)).state).toBe("needs-attention");
  });

  it("refuses a state, and a percentage, until five students have been assessed", () => {
    expect(MINIMUM_ASSESSED_FOR_A_STATE).toBe(5);
    const four = objectiveResultFrom(outcomes(4, 4));
    expect(four.state).toBe("too-few-assessed");
    expect(four.percentDemonstrated).toBeNull();
    expect(four.assessed).toBe(4);
    expect(four.demonstrated).toBe(4);

    const five = objectiveResultFrom(outcomes(5, 5));
    expect(five.state).toBe("strong");
    expect(five.percentDemonstrated).toBe(100);
  });

  it("labels a result stale on the day after ninety, not on it", () => {
    expect(STALE_AFTER_DAYS).toBe(90);
    expect(isStale(90)).toBe(false);
    expect(isStale(91)).toBe(true);
  });
});

describe("what one objective reads as on the map", () => {
  it("says coming, never a score, when no world can assess it", () => {
    // The most important row in the table. An objective BOW cannot assess must never look
    // like one a class did badly at, whatever else is true about it.
    const coming = mapInput({ available: false, markedTaught: true, submitted: 28 });
    expect(objectiveMapStateFrom(coming)).toBe("not-available");
    expect(isResultState("not-available")).toBe(false);
  });

  it("starts at not taught, and moves only when a person says so", () => {
    expect(objectiveMapStateFrom(mapInput({ assigned: false }))).toBe("not-taught");
    expect(objectiveMapStateFrom(mapInput({ assigned: false, markedTaught: true }))).toBe("taught-not-assessed");
    // Never inferred: submissions on some other objective do not tick this one.
    expect(objectiveMapStateFrom(mapInput({ assigned: false, submitted: 28 }))).toBe("not-taught");
  });

  it("reads as assigned until enough of a named group has turned work in", () => {
    expect(SUBMITTED_ENOUGH_PERCENT).toBe(80);
    const set = (submitted: number) => objectiveMapStateFrom(mapInput({ assignedStudents: 10, submitted, result: objectiveResultFrom(outcomes(submitted, submitted)) }));
    expect(set(7)).toBe("assigned");
    expect(set(8)).toBe("strong");
  });

  it("does not guess a denominator it was never given", () => {
    // A whole-class assignment carries no roster, so "80% are in" is unanswerable. Waiting
    // for a number BOW has never been told would leave every real class reading *assigned*
    // forever, and inventing one would tell a teacher their class is behind when it is not.
    expect(objectiveMapStateFrom(mapInput({ assignedStudents: null, submitted: 0, result: objectiveResultFrom([]) }))).toBe("assigned");
    expect(objectiveMapStateFrom(mapInput({ assignedStudents: null, submitted: 1, result: objectiveResultFrom(outcomes(6, 6)) }))).toBe("strong");
  });

  it("holds a bundled objective at partially assessed until every part is in", () => {
    // §15.3: it never resolves to Strong, Developing or Needs attention while a part is
    // missing. A third of an objective's demand is not a low score on the objective.
    const half = mapInput({ partsRequired: 3, partsWithResults: 2 });
    expect(objectiveMapStateFrom(half)).toBe("partially-assessed");
    expect(isResultState("partially-assessed")).toBe(false);
    expect(objectiveMapStateFrom({ ...half, partsWithResults: 3 })).toBe("strong");
  });

  it("shows the count rather than a state when too few have a usable result", () => {
    const few = mapInput({ submitted: 4, result: objectiveResultFrom(outcomes(4, 4)) });
    expect(objectiveMapStateFrom(few)).toBe("too-few-assessed");
    expect(isResultState("too-few-assessed")).toBe(false);
  });

  it("stays assigned when work is in but nobody has a usable result yet", () => {
    // Every submission waiting on a person to read its writing. That is a marking backlog,
    // not a class that failed, so it reads as the assignment it still is.
    const unread = mapInput({ submitted: 28, result: objectiveResultFrom([]) });
    expect(objectiveMapStateFrom(unread)).toBe("assigned");
  });

  it("carries every result state through, and only those three", () => {
    for (const [assessed, demonstrated, expected] of [[10, 9, "strong"], [10, 6, "developing"], [10, 2, "needs-attention"]] as const) {
      const state = objectiveMapStateFrom(mapInput({ result: objectiveResultFrom(outcomes(assessed, demonstrated)) }));
      expect(state, `${demonstrated}/${assessed}`).toBe(expected);
      expect(isResultState(state)).toBe(true);
    }
  });
});
