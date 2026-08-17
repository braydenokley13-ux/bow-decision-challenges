import { describe, expect, it } from "vitest";
import { evidenceTrail, judgementsOf, type TrailEvent } from "./trail";
import type { EvidenceRequirementObservation } from "./types";

/**
 * The trail exists so a teacher who disagrees can see what BOW saw. Every test here is a
 * way that promise could be broken quietly.
 */

const LOG: TrailEvent[] = [
  { id: "event-1", sequence: 1, timestamp: 10, stage: "working-plan", type: "CALCULATION_SUBMITTED" },
  { id: "event-2", sequence: 2, timestamp: 20, stage: "working-plan", type: "PLAN_REMAINDER_ASSIGNED" },
  { id: "event-3", sequence: 3, timestamp: 30, stage: "first-response", type: "PLAN_SAVED" },
];

function observation(overrides: Partial<EvidenceRequirementObservation> = {}): EvidenceRequirementObservation {
  return {
    evidenceRequirementId: "plan-within-income.er3",
    kind: "decision",
    level: 5,
    supportLevel: "standard_access",
    evidenceRefs: ["event-2"],
    reason: "Named the row that took the rest before filling the others.",
    ...overrides,
  };
}

describe("the evidence trail", () => {
  it("anchors a judgement to the moment it was earned, not the first moment it touched", () => {
    const trail = evidenceTrail(LOG, [observation({ evidenceRefs: ["event-1", "event-2", "event-3"] })]);
    expect(trail.moments).toHaveLength(1);
    expect(trail.moments[0]?.eventId).toBe("event-3");
    // Every moment it was built from is still carried, so the whole chain is reachable.
    expect(trail.moments[0]?.judgements[0]?.evidenceRefs).toEqual(["event-1", "event-2", "event-3"]);
  });

  it("puts every judgement on an event that is really in this student's log", () => {
    const trail = evidenceTrail(LOG, [observation(), observation({ evidenceRequirementId: "plan-within-income.er4", evidenceRefs: ["event-3"] })]);
    const ids = new Set(LOG.map((event) => event.id));
    for (const moment of trail.moments) expect(ids.has(moment.eventId)).toBe(true);
  });

  it("keeps a requirement the run never presented out of the timeline entirely", () => {
    const trail = evidenceTrail(LOG, [observation({ level: null, evidenceRefs: ["not-observed:plan-remainder"] })]);
    expect(trail.moments).toHaveLength(0);
    expect(trail.notObserved).toHaveLength(1);
    expect(trail.notObserved[0]?.level).toBeNull();
  });

  it("shows a revisited requirement twice, and marks which reading stands", () => {
    const trail = evidenceTrail(LOG, [
      observation({ level: 2, evidenceRefs: ["event-1"], reason: "Savings was set after everything else." }),
      observation({ level: 5, evidenceRefs: ["event-3"], reason: "Set a figure first on the second pass." }),
    ]);
    const judgements = judgementsOf(trail);
    expect(judgements).toHaveLength(2);
    expect(judgements.find((entry) => entry.level === 2)?.superseded).toBe(true);
    expect(judgements.find((entry) => entry.level === 5)?.superseded).toBe(false);
  });

  it("says when the rubric, and not the student, is why a level is not higher", () => {
    const trail = evidenceTrail(LOG, [observation({ level: 5, supportLevel: "direct_scaffold" })]);
    const judgement = trail.moments[0]?.judgements[0];
    expect(judgement?.claimed).toBe(5);
    expect(judgement?.level).toBe(3);
    expect(judgement?.cappedBySupport).toBe(true);
  });

  it("does not mark an uncapped judgement as capped", () => {
    const trail = evidenceTrail(LOG, [observation({ level: 2, supportLevel: "standard_access" })]);
    expect(trail.moments[0]?.judgements[0]?.cappedBySupport).toBe(false);
  });

  it("refuses a machine level claimed against a written explanation", () => {
    // `er5` is an explanation requirement. An observer offering it as a decision is the one
    // mistake that would put a machine grade on a paragraph nobody read.
    const trail = evidenceTrail(LOG, [observation({ evidenceRequirementId: "plan-within-income.er5", kind: "decision" })]);
    expect(judgementsOf(trail)).toHaveLength(0);
  });

  it("drops an observation naming a requirement that does not exist", () => {
    const trail = evidenceTrail(LOG, [observation({ evidenceRequirementId: "plan-within-income.er6" })]);
    expect(judgementsOf(trail)).toHaveLength(0);
  });

  it("reads in the order the student produced it", () => {
    const trail = evidenceTrail(LOG, [
      observation({ evidenceRequirementId: "plan-within-income.er4", evidenceRefs: ["event-3"] }),
      observation({ evidenceRequirementId: "plan-within-income.er1", evidenceRefs: ["event-1"] }),
    ]);
    expect(trail.moments.map((moment) => moment.sequence)).toEqual([1, 3]);
  });
});
