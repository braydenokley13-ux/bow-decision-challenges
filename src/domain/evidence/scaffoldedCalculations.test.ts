import { describe, expect, it } from "vitest";
import { challengeReducer, type TimestampedAction } from "../machine/reducer";
import { createInitialState, type ChallengeState } from "../machine/state";
import type { CalcId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import { availableFor, lockedFor } from "../finance/formulas";
import { snapshotForMode } from "../machine/selectors";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { essentialsExpectation, reliableFloorExpectation, setupCostOrder } from "../scenario/expectations";
import { deriveFacts } from "./facts";
import { observeStructured } from "./observe";
import { runChallenge } from "../../test/runChallenge";

/**
 * The two questions that stopped printing their own answer.
 *
 * Question one used to print the two payments with a plus sign between them, and question
 * three used to print the weekly amount with the number of weeks beside it, both directly
 * above the box asking for the total. There was no arithmetic left in either, which is the
 * same as saying the micro-skill behind them was worth nothing.
 *
 * Taking the printed sum away only means something if the help that replaces it is recorded.
 * These pin the two halves of that: a student who works it out unaided is scored as having
 * worked it out unaided, and a student who opens the step-by-step hint first is capped at the
 * level §10.3 caps supported work at, however right the answer they then give.
 */

const CALCS: readonly { calcId: CalcId; skill: "C1.1" | "C3.1"; expected: Dollars }[] = [
  { calcId: "reliable-floor", skill: "C1.1", expected: reliableFloorExpectation(N) },
  { calcId: "essentials-total", skill: "C3.1", expected: essentialsExpectation(N) },
];

/** A run that has reached the planning board, with the two totals still to answer. */
function atThePlan(): ChallengeState {
  let at = 1_770_000_000_000;
  let state = createInitialState(at);
  const send = (action: TimestampedAction) => {
    at += 1000;
    state = challengeReducer(state, { ...action, at });
  };
  send({ type: "SESSION_STARTED", sessionId: "session-scaffold", classCode: "H4KVW", seatCode: "7" });
  send({ type: "GO_TO_STAGE", stage: "setup-comparison" });
  send({ type: "SETUP_RANKED", order: setupCostOrder(N), correct: true });
  send({ type: "SETUP_SELECTED", setupId: "cousin-room" });
  send({ type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: String(N.setupCosts["cousin-room"]), value: N.setupCosts["cousin-room"], correct: true });
  send({ type: "GO_TO_STAGE", stage: "working-plan" });
  return state;
}

/**
 * Closes the opening plan on exactly zero. The essentials total is only observed against a
 * plan that was actually saved, so a run that stops at the calculation is `not_observed`
 * rather than scored — which is correct, and not what these tests are about.
 */
function savePlan(state: ChallengeState): ChallengeState {
  const input = snapshotForMode(state, "working")!;
  const spendable = Math.max(0, availableFor(input, N) - lockedFor(input, N));
  const goal = Math.min(N.course.fullPrice, Math.floor(spendable / 2 / N.openingIncrement) * N.openingIncrement);
  let next = state;
  for (const [category, amount] of [["goal", goal], ["reserve", 0], ["flexibleCash", spendable - goal]] as const) {
    next = challengeReducer(next, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category, amount: dollars(amount) });
  }
  return challengeReducer(next, { type: "PLAN_SAVE_REQUESTED", mode: "working" });
}

function pointsFor(state: ChallengeState, skill: "C1.1" | "C3.1") {
  return observeStructured(deriveFacts([...savePlan(state).log], N)).find((observation) => observation.microSkillId === skill)!;
}

describe("the two questions that no longer print their own sum", () => {
  it.each(CALCS)("scores $skill at full marks when the student works it out unaided", ({ calcId, skill, expected }) => {
    let state = atThePlan();
    state = challengeReducer(state, { type: "CALCULATION_SUBMITTED", calcId, raw: String(expected), value: expected, correct: true });
    const observation = pointsFor(state, skill);
    expect(observation.points).toBe(5);
    expect(observation.supportLevel).toBe("standard_access");
  });

  it.each(CALCS)("caps $skill at three once the step-by-step hint has been opened", ({ calcId, skill, expected }) => {
    let state = atThePlan();
    // The shape the screen produces: two attempts that do not reconcile, the hint, then the
    // right answer. The hint is what caps it — not the two misses, which would otherwise have
    // scored a corrected four.
    for (const wrong of [dollars(expected - 100), dollars(expected + 100)]) {
      state = challengeReducer(state, { type: "CALCULATION_SUBMITTED", calcId, raw: String(wrong), value: wrong, correct: false });
    }
    state = challengeReducer(state, { type: "SCAFFOLD_OPENED", interactionId: calcId });
    state = challengeReducer(state, { type: "CALCULATION_SUBMITTED", calcId, raw: String(expected), value: expected, correct: true });
    const observation = pointsFor(state, skill);
    expect(observation.supportLevel).toBe("direct_scaffold");
    expect(observation.points).toBe(3);
  });

  it.each(CALCS)("caps $skill at three even when the hint is opened before a single attempt", ({ calcId, skill, expected }) => {
    let state = atThePlan();
    state = challengeReducer(state, { type: "SCAFFOLD_OPENED", interactionId: calcId });
    state = challengeReducer(state, { type: "CALCULATION_SUBMITTED", calcId, raw: String(expected), value: expected, correct: true });
    expect(pointsFor(state, skill).points).toBe(3);
  });

  it("leaves a correct-first-try run at the levels it has always produced", () => {
    // The screens changed; what a right answer on the first try is worth did not.
    const observed = observeStructured(deriveFacts([...runChallenge().log], N));
    for (const { skill } of CALCS) {
      const observation = observed.find((entry) => entry.microSkillId === skill)!;
      expect(observation.points, skill).toBe(5);
      expect(observation.outcome, skill).toBe("demonstrated");
    }
  });
});
