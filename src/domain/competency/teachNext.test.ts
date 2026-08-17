import { describe, expect, it } from "vitest";
import { COMPETENCIES, requiredEvidenceRequirementsFor } from "./competencies";
import { GAP_THRESHOLD_PERCENT, teachNextFrom } from "./teachNext";
import { MINIMUM_ASSESSED_FOR_A_STATE, type ObjectiveDemand } from "./objectiveState";
import { RETEACH_TOPICS, reteachFor } from "./reteach";
import { COMPETENCY_MODEL_VERSION, RUBRIC_VERSION, type CompetencyResult, type CompetencyResultState, type EvidenceRequirementId, type RubricLevel } from "./types";

/**
 * §18.2, asserted from the outside.
 *
 * The interesting cases are all refusals. A recommendation is the one thing on a teacher's
 * screen they will act on within a day, so every path that could produce one from evidence
 * that does not support it is tested here rather than reasoned about.
 */

const DEMAND: ObjectiveDemand = { anyOf: ["plan-within-income"], allOf: [] };
const REQUIREMENTS = requiredEvidenceRequirementsFor("plan-within-income");
const ER = (index: number) => REQUIREMENTS[index]!.id;

/** One student, with every required requirement at 5 unless this one says otherwise. */
function student(
  overrides: Partial<Record<EvidenceRequirementId, RubricLevel | null>> = {},
  state: CompetencyResultState = "developing",
): readonly CompetencyResult[] {
  return [{
    competencyId: "plan-within-income",
    state,
    levels: REQUIREMENTS.map((requirement) => ({
      evidenceRequirementId: requirement.id,
      level: requirement.id in overrides ? overrides[requirement.id]! : 5,
    })),
    competencyModelVersion: COMPETENCY_MODEL_VERSION,
    rubricVersion: RUBRIC_VERSION,
  }];
}

function classOf(count: number, overrides: Partial<Record<EvidenceRequirementId, RubricLevel | null>> = {}) {
  return Array.from({ length: count }, () => student(overrides));
}

describe("the reteach table", () => {
  it("has a topic for every misconception a requirement names", () => {
    const named = COMPETENCIES.flatMap((competency) =>
      competency.evidenceRequirements.flatMap((requirement) => requirement.misconceptionIfNot ?? []));
    const missing = [...new Set(named)].filter((misconception) => reteachFor(misconception) === undefined);
    expect(missing, "a teach-next card could be emitted with nothing to teach").toEqual([]);
  });

  it("names no misconception the competency model does not", () => {
    const known = new Set(COMPETENCIES.flatMap((competency) => competency.misconceptions));
    expect(RETEACH_TOPICS.filter((topic) => !known.has(topic.misconception)).map((topic) => topic.id)).toEqual([]);
  });

  it("offers nothing at all for an unnamed misconception", () => {
    expect(reteachFor(null)).toBeUndefined();
    expect(reteachFor("something nobody wrote down")).toBeUndefined();
  });
});

describe("what to teach next", () => {
  it("says nothing when nobody has a usable result", () => {
    const reading = teachNextFrom([], DEMAND);
    expect(reading.state).toBe("not-assessed");
    expect(reading.assessed).toBe(0);
    expect(reading.top).toBeNull();
    expect(reading.reteach).toBeNull();
  });

  it("counts a student with no usable result out of the denominator rather than into it", () => {
    const reading = teachNextFrom(
      [...classOf(5, { [ER(2)]: 0 }), student({}, "not-observed"), student({}, "incomplete")],
      DEMAND,
    );
    expect(reading.assessed).toBe(5);
  });

  it("refuses a recommendation, and every percentage, below the minimum denominator", () => {
    const reading = teachNextFrom(classOf(MINIMUM_ASSESSED_FOR_A_STATE - 1, { [ER(2)]: 0 }), DEMAND);
    expect(reading.state).toBe("too-few-assessed");
    expect(reading.top).toBeNull();
    expect(reading.reteach).toBeNull();
    // The counts are still true and are still carried; only the share is refused.
    expect(reading.gaps.every((gap) => gap.percentOfAssessed === null)).toBe(true);
    expect(reading.gaps.find((gap) => gap.evidenceRequirementId === ER(2))?.struggled).toBe(4);
  });

  it("names the gap, its misconception and what to teach, once one clears the threshold", () => {
    // Six of ten students set savings as the remainder: ER3, the one the whole model exists for.
    const reading = teachNextFrom([...classOf(6, { [ER(2)]: 0 }), ...classOf(4)], DEMAND);
    expect(reading.state).toBe("one-gap");
    expect(reading.assessed).toBe(10);
    expect(reading.top?.evidenceRequirementId).toBe(ER(2));
    expect(reading.top?.struggled).toBe(6);
    expect(reading.top?.percentOfAssessed).toBe(60);
    expect(reading.top?.misconception).toBe("Savings is leftover money");
    expect(reading.reteach?.id).toBe("savings-first");
  });

  it("counts a partly-right answer as a gap, exactly as the rubric does", () => {
    const reading = teachNextFrom([...classOf(3, { [ER(2)]: 2 }), ...classOf(7)], DEMAND);
    expect(reading.state).toBe("one-gap");
    expect(reading.top?.struggled).toBe(3);
    expect(reading.top?.percentOfAssessed).toBe(30);
  });

  it("says no single gap stands out rather than promoting the largest small one", () => {
    // One student each on four different requirements: 10% apiece, under the threshold.
    const reading = teachNextFrom(
      [student({ [ER(0)]: 0 }), student({ [ER(1)]: 0 }), student({ [ER(2)]: 0 }), student({ [ER(3)]: 0 }), ...classOf(6)],
      DEMAND,
    );
    expect(reading.state).toBe("no-single-gap");
    expect(reading.top).toBeNull();
    expect(reading.gaps[0]?.percentOfAssessed).toBeLessThan(GAP_THRESHOLD_PERCENT);
  });

  it("says no single gap stands out when the class simply did it", () => {
    const reading = teachNextFrom(classOf(8), DEMAND);
    expect(reading.state).toBe("no-single-gap");
    expect(reading.gaps.every((gap) => gap.struggled === 0)).toBe(true);
  });

  it("treats a requirement nobody was asked as an absence rather than as a failure", () => {
    const reading = teachNextFrom(classOf(10, { [ER(4)]: null }), DEMAND);
    const unasked = reading.gaps.find((gap) => gap.evidenceRequirementId === ER(4));
    expect(unasked?.struggled).toBe(0);
    expect(unasked?.observed).toBe(0);
    expect(unasked?.notObserved).toBe(10);
    expect(reading.state).toBe("no-single-gap");
  });

  it("breaks a tie the same way every time", () => {
    const tied = [...classOf(3, { [ER(1)]: 0 }), ...classOf(3, { [ER(3)]: 0 }), ...classOf(4)];
    const first = teachNextFrom(tied, DEMAND);
    const second = teachNextFrom([...tied].reverse(), DEMAND);
    expect(first.top?.evidenceRequirementId).toBe(second.top?.evidenceRequirementId);
    expect(first.gaps.map((gap) => gap.evidenceRequirementId)).toEqual(second.gaps.map((gap) => gap.evidenceRequirementId));
  });

  it("still names the gap when the model names no misconception behind it", () => {
    // ER2 — "Covers what is required first" — deliberately carries no named misconception.
    const reading = teachNextFrom([...classOf(9, { [ER(1)]: 0 }), ...classOf(1)], DEMAND);
    expect(reading.state).toBe("one-gap");
    expect(reading.top?.misconception).toBeNull();
    expect(reading.reteach).toBeNull();
    expect(reading.top?.label).toBe(REQUIREMENTS[1]!.label);
  });
});
