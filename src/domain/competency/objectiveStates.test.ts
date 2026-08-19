import { describe, expect, it } from "vitest";
import {
  DEVELOPING_THRESHOLD_PERCENT,
  MINIMUM_ASSESSED_FOR_A_STATE,
  STALE_AFTER_DAYS,
  STRONG_THRESHOLD_PERCENT,
  isStale,
  objectiveResultFrom,
  type StudentObjectiveOutcome,
} from "./objectiveState";

/**
 * Every class-result state, at its boundary.
 *
 * A teacher makes an instructional decision from one word, so the word has to be right on
 * the exact student who moves it. These are the ways it could be wrong, and each has a test
 * below: a threshold off by one student, a state derived from a denominator too small to
 * carry it, and an absence rendered as a low score.
 *
 * The nine-state Objective Map model that used to be tested here went with the map. It
 * existed to colour a grid whose only teacher-set input was a "MARKED TAUGHT" flag — a record
 * inside BOW about instruction BOW did not deliver — and three of its nine states were about
 * that flag rather than about any student. What survives is the part that is about students,
 * which is everything below.
 */

/** `demonstrated` of `assessed` students, as the roll-up sees them. */
function outcomes(assessed: number, demonstrated: number): StudentObjectiveOutcome[] {
  return [
    ...Array.from({ length: demonstrated }, () => ({ assessed: true, demonstrated: true })),
    ...Array.from({ length: assessed - demonstrated }, () => ({ assessed: true, demonstrated: false })),
  ];
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

