import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { CalcId } from "../core/ids";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import type { ScenarioNumbers } from "../scenario/types";
import {
  essentialsExpectation,
  reliableFloorExpectation,
  setupTotalsByRank,
  week5ChangeExpectation,
} from "../scenario/expectations";
import type { AssessmentFacts, CalculationEvidence } from "./types";
import { observeStructured } from "./observe";

/**
 * The grader used to carry the basketball dollar amounts as literals in its own source
 * while the scenario held every one of them, so re-pricing the model marked correct
 * answers wrong without failing a test. These tests are the gate on that: every entered
 * calculation is checked against a re-priced scenario, and the re-priced answer is the
 * one that scores.
 */

/** The same scenario shape with every relevant amount moved. */
const REPRICED: ScenarioNumbers = {
  ...SCENARIO_NUMBERS,
  version: "test-repriced",
  savings: dollars(300),
  basePay: dollars(5200),
  reliableFloor: dollars(5500),
  essentialsPerWeek: dollars(250),
  essentialsTotal: dollars(2000),
  outcomeIncome: dollars(1200),
  requiredWeek5Cost: dollars(900),
  setupCosts: { "stable-1800": dollars(2100), "shared-1400": dollars(1650), "flexible-1000": dollars(1150) },
  setupEventCosts: { "stable-1800": dollars(0), "shared-1400": dollars(200), "flexible-1000": dollars(400) },
};

function calc(calcId: CalcId, value: number): CalculationEvidence {
  return {
    calcId,
    attempts: [{ raw: String(value), value: dollars(value), correct: true, eventRef: `event-${calcId}` }],
    support: "standard_access",
    supplied: false,
  };
}

function factsWith(calculations: Partial<Record<CalcId, CalculationEvidence>>): AssessmentFacts {
  return {
    calculations,
    // C3.1 is only observed once a Working Plan exists, so the fixture carries one.
    opening: {
      snapshot: {
        id: "s-1",
        sequence: 1,
        inputs: {
          mode: "working",
          amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
          includeCompletion: false,
          includeOutcome: true,
          includeOptionalWork: false,
          setupId: "flexible-1000",
          week5Applied: false,
          numbersVersion: "test-repriced",
        },
      },
      balance: dollars(0),
      firstSaveBalance: dollars(0),
      conditionalExposure: dollars(0),
      support: "standard_access",
      evidenceRefs: ["opening"],
    },
    selectedSetupId: "flexible-1000",
    selectedGapTiles: [],
    applicableGapTiles: [],
    defenseSubmitted: false,
  };
}

const pointsFor = (facts: AssessmentFacts, id: string, n: ScenarioNumbers) =>
  observeStructured(facts, n).find((observation) => observation.microSkillId === id)?.points;

describe("expected answers are derived from the scenario, never hardcoded", () => {
  it("derives the reliable floor, essentials and setup ranks from the numbers in force", () => {
    expect(reliableFloorExpectation(SCENARIO_NUMBERS)).toBe(5000);
    expect(essentialsExpectation(SCENARIO_NUMBERS)).toBe(1600);
    expect(setupTotalsByRank(SCENARIO_NUMBERS)).toEqual({ lowest: 1000, middle: 1400, highest: 1800 });

    expect(reliableFloorExpectation(REPRICED)).toBe(5500);
    expect(essentialsExpectation(REPRICED)).toBe(2000);
    expect(setupTotalsByRank(REPRICED)).toEqual({ lowest: 1150, middle: 1650, highest: 2100 });
  });

  it("keeps the scenario's own redundant totals consistent with its parts", () => {
    // `reliableFloor` and `essentialsTotal` restate amounts the scenario already holds.
    // If they ever drift, the student and the grader disagree about the same number.
    expect(SCENARIO_NUMBERS.reliableFloor).toBe(SCENARIO_NUMBERS.savings + SCENARIO_NUMBERS.basePay);
    expect(SCENARIO_NUMBERS.essentialsTotal).toBe(SCENARIO_NUMBERS.essentialsPerWeek * SCENARIO_NUMBERS.weeks);
  });

  it("scores the re-priced answer correct and the old answer wrong", () => {
    const repricedRun = factsWith({
      "reliable-floor": calc("reliable-floor", 5500),
      "essentials-total": calc("essentials-total", 2000),
      "setup-middle-total": calc("setup-middle-total", 1650),
      "setup-lowest-total": calc("setup-lowest-total", 1150),
    });
    for (const [skill] of [["C1.1"], ["C3.1"], ["C2.1"], ["C2.2"]]) {
      expect(pointsFor(repricedRun, skill!, REPRICED)).toBe(5);
    }

    const staleRun = factsWith({
      "reliable-floor": calc("reliable-floor", 5000),
      "essentials-total": calc("essentials-total", 1600),
      "setup-middle-total": calc("setup-middle-total", 1400),
      "setup-lowest-total": calc("setup-lowest-total", 1000),
    });
    for (const [skill] of [["C1.1"], ["C3.1"], ["C2.1"], ["C2.2"]]) {
      expect(pointsFor(staleRun, skill!, REPRICED)).toBe(0);
    }
  });

  it("re-prices the Week 5 change against the setup the student chose", () => {
    const countedOutcome = { setupId: "flexible-1000" as const, countedOutcome: true };
    expect(week5ChangeExpectation(SCENARIO_NUMBERS, countedOutcome)).toBe(1000 + 700 + 350);
    expect(week5ChangeExpectation(REPRICED, countedOutcome)).toBe(1200 + 900 + 400);

    // The cheapest-to-reach setup adds no travel, so the total is smaller and the grader
    // must not expect the other setup's number.
    expect(week5ChangeExpectation(REPRICED, { setupId: "stable-1800", countedOutcome: false })).toBe(900);
    expect(week5ChangeExpectation(REPRICED, { setupId: undefined, countedOutcome: false })).toBeNull();
  });

  it("holds no calculation checkpoint open when the scenario cannot price it", () => {
    const noSetup: AssessmentFacts = { ...factsWith({ "week5-change": calc("week5-change", 2050) }), selectedGapTiles: [], applicableGapTiles: [] };
    delete noSetup.selectedSetupId;
    const observation = observeStructured(noSetup, SCENARIO_NUMBERS).find((item) => item.microSkillId === "C5.1");
    expect(observation?.outcome).toBe("not_observed");
    expect(observation?.points).toBeNull();
  });
});
