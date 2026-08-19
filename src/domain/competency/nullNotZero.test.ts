import { describe, expect, it } from "vitest";
import { requiredEvidenceRequirementsFor } from "./competencies";
import { competencyResultFor, masteryStateFor, observeCompetencies } from "./observe";
import { objectiveResultFrom, studentOutcomeFor } from "./objectiveState";
import type { CompetencyResult, EvidenceRequirementId, EvidenceRequirementObservation, RubricLevel } from "./types";

/**
 * `null` is not zero.
 *
 * A student who never reached an evidence requirement has not failed it. The distinction
 * costs nothing to hold and everything to lose: a roll-up that scores an unreached
 * requirement as a zero reports a fact about a broken Chromebook, a short class period or a
 * world that does not cover that skill as a fact about a child — and it does it silently,
 * because a zero and a real zero look identical from the outside.
 *
 * So it is checked from the outside too. Every assertion below compares a log that is
 * missing something against the same log with the missing part observed, and asserts that
 * the absence never lowered anything.
 */

const decision = (
  id: EvidenceRequirementId,
  level: RubricLevel | null,
): EvidenceRequirementObservation => ({
  evidenceRequirementId: id,
  kind: "decision",
  level,
  supportLevel: "standard_access",
  evidenceRefs: [`event:${id}`],
  reason: "A test observation.",
});

/** Every required requirement of `adapt-a-plan`, in order, so the cases read as real runs. */
const REQUIRED = requiredEvidenceRequirementsFor("adapt-a-plan").map((requirement) => requirement.id);

const resultFrom = (levels: readonly (RubricLevel | null)[]): CompetencyResult | null =>
  competencyResultFor(
    "adapt-a-plan",
    REQUIRED.map((id, index) => decision(id, levels[index] ?? null)),
  );

describe("an unobserved requirement is absent, never a zero", () => {
  it("reports not observed when nothing was seen, rather than not yet demonstrated", () => {
    expect(resultFrom([null, null, null, null])?.state).toBe("not-observed");
    // One assertion where there were two. They differed only by a `{ submitted }` flag that
    // the engine no longer takes: missing evidence settles nothing whether or not the student
    // pressed turn-in, so the pair had become the same call written twice.
    expect(masteryStateFor([null, null])).toBe("not-observed");
  });

  it("never turns a missing requirement into a low result", () => {
    // Three strong observations and one the run never reached. The dangerous answer is
    // "developing" or "not yet demonstrated" — both would be scoring the `null`.
    const state = resultFrom([5, 5, 5, null])?.state;
    expect(state).toBe("incomplete");
    expect(state).not.toBe("developing");
    expect(state).not.toBe("not-yet-demonstrated");
  });

  it("keeps a missing requirement out of the result the observed ones produced", () => {
    // The same student, once with the fourth requirement reached and once without. The
    // observed three are identical in both, and the absence must not have made them worse.
    const reached = resultFrom([5, 5, 5, 5]);
    const missed = resultFrom([5, 5, 5, null]);
    expect(reached?.state).toBe("demonstrated");
    const observedLevels = (result: CompetencyResult | null) =>
      result?.levels.slice(0, 3).map((row) => row.level);
    expect(observedLevels(missed)).toEqual(observedLevels(reached));
  });

  it("settles nothing while a requirement is missing, whichever way the observed ones went", () => {
    // **This test used to assert the opposite** — `[0, 5, 5, null]` was
    // `not-yet-demonstrated` and `[2, 5, 5, null]` was `developing` — under the reasoning
    // *"a student who was observed getting one wrong has produced evidence of a gap, and a
    // second requirement they never reached does not erase it."* That sentence is true about
    // the **row**, which still shows the zero, and false about the **competency**, which is
    // defined as all of its required requirements.
    //
    // What the old rule cost is what an assessment judge measured on a class page: a run with
    // one zero and the rest unobserved reached a settled state and entered the denominator,
    // while a run with three fives and one unmarked written explanation did not. So the class
    // percentage was computed over the children the product had learned least about, a
    // reteach plan was generated naming their seats, and marking the other children's writing
    // did not let them in. Both directions now wait for the same thing.
    expect(resultFrom([0, 5, 5, null])?.state).toBe("incomplete");
    expect(resultFrom([2, 5, 5, null])?.state).toBe("incomplete");
    expect(resultFrom([5, 5, 5, null])?.state).toBe("incomplete");
  });

  it("judges a complete set on what it contains, in both directions", () => {
    // And once every required requirement is in, nothing is held back. The zero is not lost;
    // it was waiting for the rest of the evidence, which is the whole of the change.
    expect(resultFrom([5, 5, 5, 5])?.state).toBe("demonstrated");
    expect(resultFrom([0, 5, 5, 5])?.state).toBe("not-yet-demonstrated");
    expect(resultFrom([2, 5, 5, 5])?.state).toBe("developing");
  });

  it("counts the same number of students in either direction, which is what a class page divides by", () => {
    // The judge's own condition, stated as a test: two runs identical but for one level-0 are
    // both countable or neither. A denominator that admits one and not the other is a class
    // percentage taken over a set chosen by the thing being measured.
    const withZero = resultFrom([0, 5, 5, null])?.state;
    const withFive = resultFrom([5, 5, 5, null])?.state;
    expect(withZero).toBe(withFive);
  });

  it("gives an unobserved requirement a null level rather than leaving the row out", () => {
    // The row has to exist. A teacher reading the rubric needs to see that BOW looked and
    // saw nothing, which is a different sentence from BOW not looking.
    const levels = resultFrom([5, null, 5, 5])?.levels ?? [];
    expect(levels).toHaveLength(5);
    expect(levels.filter((row) => row.level === null).map((row) => row.evidenceRequirementId))
      .toEqual([REQUIRED[1], "adapt-a-plan.er5"]);
  });

  it("counts nobody as a failure at the class level for never having been assessed", () => {
    // The same rule one layer up. Twenty-three students who were never assessed must not
    // make five demonstrations read as 5 of 28.
    const demand = { anyOf: ["adapt-a-plan" as const], allOf: [] };
    const demonstrated = resultFrom([5, 5, 5, 5]);
    const unreached = resultFrom([null, null, null, null]);
    const outcomes = [
      ...Array.from({ length: 5 }, () => studentOutcomeFor(demonstrated ? [demonstrated] : [], demand)),
      ...Array.from({ length: 23 }, () => studentOutcomeFor(unreached ? [unreached] : [], demand)),
    ];
    const objective = objectiveResultFrom(outcomes);
    expect(objective.assessed).toBe(5);
    expect(objective.demonstrated).toBe(5);
    expect(objective.percentDemonstrated).toBe(100);
  });

  it("produces no competency at all for observations nobody made", () => {
    expect(observeCompetencies([])).toEqual([]);
  });
});
