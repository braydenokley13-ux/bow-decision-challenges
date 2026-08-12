import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "../machine/reducer";
import { createInitialState, type ChallengeState } from "../machine/state";
import type { ChallengeAction } from "../machine/actions";
import { deriveResult } from "./result";

const run = (state: ChallengeState, ...actions: ChallengeAction[]) => actions.reduce(challengeReducer, state);

describe("Seat 14 golden case", () => {
  it("reconciles to 85/90 structured, 94/100 final, with split C4 status and trajectory", () => {
    let state = createInitialState();
    state = run(state,
      { type: "SETUP_SELECTED", setupId: "flexible-1000" },
      { type: "CALCULATION_SUBMITTED", calcId: "setup-middle-total", raw: "1200", value: dollars(1200), correct: false },
      { type: "CALCULATION_SUBMITTED", calcId: "setup-middle-total", raw: "1400", value: dollars(1400), correct: true },
      { type: "CALCULATION_SUBMITTED", calcId: "setup-lowest-total", raw: "1000", value: dollars(1000), correct: true },
      { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
      { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true },
      { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true },
      { type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: true },
      { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(900) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(2100) },
      { type: "PLAN_SAVE_REQUESTED", mode: "working" },
      { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "goal", amount: dollars(1100) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "reserve", amount: dollars(600) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "flexibleCash", amount: dollars(1600) },
      { type: "PLAN_SAVE_REQUESTED", mode: "fallback", acknowledgedResidual: dollars(900) },
      { type: "WEEK5_ADVANCE_CONFIRMED" },
      { type: "GAP_TILE_TOGGLED", tileId: "lost-outcome", selected: true },
      { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true },
      { type: "GAP_TILE_TOGGLED", tileId: "setup-cost", selected: true },
      { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "1950", value: dollars(1950), correct: false },
      { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "2050", value: dollars(2050), correct: true },
      { type: "GO_TO_STAGE", stage: "first-response" },
      // Absorbs the whole $1,150 shortfall out of the $3,300 still adjustable,
      // before the clinic opportunity is offered.
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(800) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "reserve", amount: dollars(400) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "flexibleCash", amount: dollars(950) },
      { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
      { type: "OPTIONAL_WORK_DECIDED", accepted: true },
      { type: "COMPLETION_INCOME_DECIDED", included: true },
      { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "goal", amount: dollars(800) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "reserve", amount: dollars(400) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "flexibleCash", amount: dollars(1450) },
      { type: "PLAN_SAVE_REQUESTED", mode: "final" },
      { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "goal", amount: dollars(500) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "reserve", amount: dollars(200) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "flexibleCash", amount: dollars(1150) },
      { type: "PLAN_SAVE_REQUESTED", mode: "remaining-risk" },
    );

    const result = deriveResult(state.log, 9);
    expect(Object.fromEntries(result.concepts.map((concept) => [concept.conceptId, concept.points]))).toEqual({
      "income-reliability": 15,
      "full-cost": 9,
      "viable-budget": 15,
      contingency: 17,
      adaptation: 29,
    });
    expect(result.grade.structuredPoints).toBe(85);
    expect(result.grade.finalPoints).toBe(94);
    const c4 = result.concepts.find((concept) => concept.conceptId === "contingency");
    expect(c4?.status).toBe("demonstrated_independently");
    expect(c4?.trajectory).toBe("corrected_after_consequence");
  });
});
