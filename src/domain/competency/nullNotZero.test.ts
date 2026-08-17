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

const resultFrom = (levels: readonly (RubricLevel | null)[], submitted = true): CompetencyResult | null =>
  competencyResultFor(
    "adapt-a-plan",
    REQUIRED.map((id, index) => decision(id, levels[index] ?? null)),
    { submitted },
  );

describe("an unobserved requirement is absent, never a zero", () => {
  it("reports not observed when nothing was seen, rather than not yet demonstrated", () => {
    expect(resultFrom([null, null, null, null])?.state).toBe("not-observed");
    expect(masteryStateFor([null, null], { submitted: true })).toBe("not-observed");
    expect(masteryStateFor([null, null], { submitted: false })).toBe("not-observed");
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

  it("still reports a real failure that sits beside a missing requirement", () => {
    // The mirror image, and the reason "any null means incomplete" is not the rule. A
    // student who was observed getting one wrong has produced evidence of a gap, and a
    // second requirement they never reached does not erase it.
    expect(resultFrom([0, 5, 5, null])?.state).toBe("not-yet-demonstrated");
    expect(resultFrom([2, 5, 5, null])?.state).toBe("developing");
  });

  it("separates a student who stopped from one who finished without showing everything", () => {
    // The same shape `grade.ts` already holds: an unfinished attempt is incomplete, and a
    // finished one is judged on what it contains.
    expect(resultFrom([5, 5, 5, 5], false)?.state).toBe("demonstrated");
    expect(resultFrom([5, 5, 5, null], false)?.state).toBe("incomplete");
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
    expect(observeCompetencies([], { submitted: true })).toEqual([]);
  });
});
