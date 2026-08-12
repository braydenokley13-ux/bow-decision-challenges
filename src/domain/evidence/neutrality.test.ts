import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { AssessmentFacts, AlternateStateEvidence, PlanSnapshot } from "./types";
import { observeStructured } from "./observe";

function snapshot(sequence = 10): PlanSnapshot {
  return {
    id: `snapshot-${sequence}`,
    sequence,
    inputs: {
      mode: "final",
      amounts: { goal: dollars(800), reserve: dollars(400), flexibleCash: dollars(1450) },
      includeCompletion: true,
      includeOutcome: false,
      includeOptionalWork: true,
      setupId: "flexible-1000",
      week5Applied: true,
      numbersVersion: "pup-numbers-1",
    },
  };
}

function alternate(): AlternateStateEvidence {
  return {
    entered: true,
    saved: true,
    amountFreed: dollars(800),
    absorbTarget: dollars(800),
    residual: dollars(0),
    unassigned: dollars(0),
    residualAcknowledged: false,
    lockedMoveAttempts: 0,
    changedOnlyAdjustable: true,
    savesBeforeAcceptable: 0,
    support: "standard_access",
    evidenceRefs: ["saved-plan"],
  };
}

function facts(): AssessmentFacts {
  return {
    calculations: {
      "setup-middle-total": { calcId: "setup-middle-total", attempts: [{ raw: "1400", value: dollars(1400), correct: true, eventRef: "middle" }], support: "standard_access", supplied: false },
      "setup-lowest-total": { calcId: "setup-lowest-total", attempts: [{ raw: "1000", value: dollars(1000), correct: true, eventRef: "low" }], support: "standard_access", supplied: false },
      "essentials-total": { calcId: "essentials-total", attempts: [{ raw: "1600", value: dollars(1600), correct: true, eventRef: "must-pay" }], support: "standard_access", supplied: false },
      "reliable-floor": { calcId: "reliable-floor", attempts: [{ raw: "5000", value: dollars(5000), correct: true, eventRef: "safe" }], support: "standard_access", supplied: false },
      "week5-change": { calcId: "week5-change", attempts: [{ raw: "1050", value: dollars(1050), correct: true, eventRef: "week5" }], support: "standard_access", supplied: false },
    },
    opening: { snapshot: snapshot(1), balance: dollars(0), firstSaveBalance: dollars(0), conditionalExposure: dollars(1800), support: "standard_access", evidenceRefs: ["opening"] },
    fallback: alternate(),
    firstResponse: alternate(),
    preview: alternate(),
    final: { snapshot: snapshot(10), balance: dollars(0), acknowledgedResidual: false, lockedMoveAttempts: 0, support: "standard_access", evidenceRefs: ["final"] },
    selectedSetupId: "flexible-1000",
    selectedGapTiles: ["required-cost", "setup-cost"],
    applicableGapTiles: ["required-cost", "setup-cost"],
    optionalDecision: { accepted: true, sequence: 9, evidenceRef: "job-choice" },
    finalPlanSequence: 10,
    defenseSubmitted: false,
  };
}

function scores(input: AssessmentFacts, ids: string[]) {
  const observations = observeStructured(input);
  return ids.map((id) => observations.find((item) => item.microSkillId === id)?.points);
}

describe("choice-neutral scoring", () => {
  it("gives equal C4 credit to the bonus-cash path and safe-cash-only path", () => {
    const withBonus = facts();
    const safeCashOnly = facts();
    safeCashOnly.opening = { ...safeCashOnly.opening!, conditionalExposure: dollars(0) };
    delete safeCashOnly.fallback;
    safeCashOnly.firstResponse = alternate();
    expect(scores(withBonus, ["C4.1", "C4.2", "C4.3", "C4.4"])).toEqual(scores(safeCashOnly, ["C4.1", "C4.2", "C4.3", "C4.4"]));
  });

  it("does not reward saving more, holding more backup money, or keeping more spending cash", () => {
    const courseFirst = facts();
    const cashFirst = facts();
    courseFirst.opening!.snapshot.inputs.amounts = { goal: dollars(1200), reserve: dollars(200), flexibleCash: dollars(1000) };
    cashFirst.opening!.snapshot.inputs.amounts = { goal: dollars(200), reserve: dollars(700), flexibleCash: dollars(1500) };
    expect(scores(courseFirst, ["C3.1", "C3.2", "C3.3"])).toEqual(scores(cashFirst, ["C3.1", "C3.2", "C3.3"]));
  });

  it("does not reward a particular housing choice", () => {
    const nearby = facts();
    const longCommute = facts();
    nearby.selectedSetupId = "stable-1800";
    longCommute.selectedSetupId = "flexible-1000";
    expect(scores(nearby, ["C2.1", "C2.2"])).toEqual(scores(longCommute, ["C2.1", "C2.2"]));
  });

  it("scores nothing at all on whether the extra work was taken or declined", () => {
    const takesJob = facts();
    const keepsRest = facts();
    keepsRest.optionalDecision = { accepted: false, sequence: 9, evidenceRef: "rest-choice" };
    keepsRest.final = { ...keepsRest.final!, snapshot: { ...snapshot(10), inputs: { ...snapshot(10).inputs, includeOptionalWork: false } } };
    const everySkill = observeStructured(takesJob).map((observation) => observation.microSkillId);
    expect(scores(takesJob, everySkill)).toEqual(scores(keepsRest, everySkill));
  });

  it("does not reward which category a student cut to absorb the Week 5 shortfall", () => {
    const cutTheGoal = facts();
    const cutSpendingMoney = facts();
    cutTheGoal.firstResponse = alternate();
    cutSpendingMoney.firstResponse = alternate();
    cutTheGoal.opening!.snapshot.inputs.amounts = { goal: dollars(200), reserve: dollars(700), flexibleCash: dollars(1500) };
    cutSpendingMoney.opening!.snapshot.inputs.amounts = { goal: dollars(1200), reserve: dollars(200), flexibleCash: dollars(1000) };
    expect(scores(cutTheGoal, ["C5.6"])).toEqual(scores(cutSpendingMoney, ["C5.6"]));
  });
});

