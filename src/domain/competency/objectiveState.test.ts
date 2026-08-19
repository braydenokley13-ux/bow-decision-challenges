import { describe, expect, it } from "vitest";
import { COMPETENCIES, evidenceRequirementById, requiredEvidenceRequirementsFor } from "./competencies";
import { competencyResultFor } from "./observe";
import {
  DEVELOPING_THRESHOLD_PERCENT,
  MINIMUM_ASSESSED_FOR_A_STATE,
  STALE_AFTER_DAYS,
  STRONG_THRESHOLD_PERCENT,
  isStale,
  objectiveResultFrom,
  studentOutcomeFor,
  type ObjectiveDemand,
  type StudentObjectiveOutcome,
} from "./objectiveState";
import type { CompetencyId, CompetencyResult, EvidenceRequirementId, EvidenceRequirementObservation, RubricLevel } from "./types";

/**
 * The words a teacher makes an instructional decision from.
 *
 * "Needs attention" sends a teacher back over a topic with twenty-eight children. It has to
 * mean one thing, it has to mean it the same way in every jurisdiction, and it must never
 * be computed from a handful of students and read as a fact about a class.
 */

// The engine discards an observation whose `kind` disagrees with the requirement's own —
// exactly the case `trail.test.ts` covers for an explanation offered as a decision. A fixed
// "decision" here used to work only because every competency this suite exercised had
// nothing but decision requirements; `save-toward-a-goal.er5` is an explanation, so the kind
// has to come from the requirement itself or its observation is silently dropped.
const observation = (
  id: EvidenceRequirementId,
  level: RubricLevel | null,
): EvidenceRequirementObservation => ({
  evidenceRequirementId: id,
  kind: evidenceRequirementById(id)?.kind ?? "decision",
  level,
  supportLevel: "standard_access",
  evidenceRefs: [`event:${id}`],
  reason: "A test observation.",
});

function resultAt(competencyId: CompetencyId, level: RubricLevel | null): CompetencyResult {
  const ids = requiredEvidenceRequirementsFor(competencyId).map((requirement) => requirement.id);
  const result = competencyResultFor(competencyId, ids.map((id) => observation(id, level)));
  if (!result) throw new Error(`${competencyId} has no required evidence requirements`);
  return result;
}

const outcomes = (demonstrated: number, notDemonstrated: number, unassessed = 0): StudentObjectiveOutcome[] => [
  ...Array.from({ length: demonstrated }, () => ({ assessed: true, demonstrated: true })),
  ...Array.from({ length: notDemonstrated }, () => ({ assessed: true, demonstrated: false })),
  ...Array.from({ length: unassessed }, () => ({ assessed: false, demonstrated: false })),
];

describe("one student, against one objective", () => {
  const demand: ObjectiveDemand = { anyOf: ["adapt-a-plan"], allOf: [] };

  it("counts demonstrated with support as demonstrated", () => {
    // The student did it. How much help they needed belongs in what to reteach, not in
    // whether the objective was met.
    expect(studentOutcomeFor([resultAt("adapt-a-plan", 3)], demand)).toEqual({ assessed: true, demonstrated: true });
    expect(studentOutcomeFor([resultAt("adapt-a-plan", 5)], demand)).toEqual({ assessed: true, demonstrated: true });
  });

  it("counts an assessed student who did not demonstrate as assessed", () => {
    // The denominator is students who produced a result, not students who succeeded.
    expect(studentOutcomeFor([resultAt("adapt-a-plan", 0)], demand)).toEqual({ assessed: true, demonstrated: false });
    expect(studentOutcomeFor([resultAt("adapt-a-plan", 2)], demand)).toEqual({ assessed: true, demonstrated: false });
  });

  it("counts an unobserved or unfinished attempt out of the denominator entirely", () => {
    expect(studentOutcomeFor([resultAt("adapt-a-plan", null)], demand).assessed).toBe(false);
    expect(studentOutcomeFor([], demand)).toEqual({ assessed: false, demonstrated: false });
  });

  it("holds a bundled objective at unassessed until every part of it has a result", () => {
    // The completion-rule case. Reporting a percentage against one of two halves is how a
    // district gets told something about two thirds of an objective that nobody measured.
    // The two real bundled objectives rest on competencies whose evidence requirements are
    // still unwritten, so the shape is exercised with two that are written.
    const bundled: ObjectiveDemand = { anyOf: [], allOf: ["adapt-a-plan", "save-toward-a-goal"] };
    const halfway = studentOutcomeFor([resultAt("adapt-a-plan", 5)], bundled);
    expect(halfway).toEqual({ assessed: false, demonstrated: false });
    const both = studentOutcomeFor([resultAt("adapt-a-plan", 5), resultAt("save-toward-a-goal", 5)], bundled);
    expect(both).toEqual({ assessed: true, demonstrated: true });
  });

  it("produces no result at all for a competency whose requirements nobody has written", () => {
    // Not an empty result, and certainly not a passing one: nothing. A competency with no
    // evidence requirements would satisfy "every required one is at 4 or 5" vacuously, and
    // vacuous demonstration is the most dangerous kind — it reports a skill as shown
    // precisely because nobody has said what showing it would look like.
    //
    // Named two competencies, and one of them had its requirements written, at which point the
    // test was asserting the rule about a competency the rule no longer covers. The set is
    // derived now: whichever competencies are still unwritten today are the ones checked, so
    // this keeps meaning the same thing as they are written one by one, and stops meaning
    // anything only when the last one is — which is the day it should be deleted.
    const unwritten = COMPETENCIES.filter((competency) => competency.evidenceRequirements.length === 0);
    expect(unwritten.length, "every competency is written; this test has nothing left to guard").toBeGreaterThan(0);
    for (const competency of unwritten) {
      expect(competencyResultFor(competency.id, []), competency.id).toBeNull();
    }
  });
});

describe("one class, against one objective", () => {
  it("holds the two thresholds in one place, as numbers a person can change", () => {
    expect(STRONG_THRESHOLD_PERCENT).toBe(80);
    expect(DEVELOPING_THRESHOLD_PERCENT).toBe(50);
    expect(MINIMUM_ASSESSED_FOR_A_STATE).toBe(5);
    expect(STALE_AFTER_DAYS).toBe(90);
  });

  it("reads strong at the threshold and developing just below it", () => {
    expect(objectiveResultFrom(outcomes(8, 2)).state).toBe("strong");
    expect(objectiveResultFrom(outcomes(79, 21)).state).toBe("developing");
    expect(objectiveResultFrom(outcomes(5, 5)).state).toBe("developing");
    expect(objectiveResultFrom(outcomes(49, 51)).state).toBe("needs-attention");
  });

  it("refuses a state, and a percentage, below the minimum denominator", () => {
    // "3 of 28 assessed" is true. "Needs attention" from those three is a claim about the
    // twenty-five nobody looked at, and it is the sentence a teacher would act on.
    const few = objectiveResultFrom(outcomes(1, 3, 24));
    expect(few.state).toBe("too-few-assessed");
    expect(few.percentDemonstrated).toBeNull();
    expect(few.assessed).toBe(4);
    expect(objectiveResultFrom(outcomes(4, 1, 23)).percentDemonstrated).toBe(80);
  });

  it("reports not assessed rather than zero when nobody has a result", () => {
    const none = objectiveResultFrom(outcomes(0, 0, 28));
    expect(none.state).toBe("not-assessed");
    expect(none.percentDemonstrated).toBeNull();
    expect(none.demonstrated).toBe(0);
  });

  it("never counts an unassessed student against the class", () => {
    // The same five demonstrations, once in a class of five and once in a class of
    // twenty-eight where the rest never submitted. The result is a fact about the five.
    expect(objectiveResultFrom(outcomes(5, 0))).toEqual(objectiveResultFrom(outcomes(5, 0, 23)));
  });

  it("labels an old result as old rather than as current", () => {
    expect(isStale(89)).toBe(false);
    expect(isStale(91)).toBe(true);
  });
});
