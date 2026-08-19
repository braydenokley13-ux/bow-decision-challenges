import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "../machine/reducer";
import { createInitialState, type ChallengeState } from "../machine/state";
import type { ChallengeAction } from "../machine/actions";
import { deriveResult } from "./result";

const run = (state: ChallengeState, ...actions: ChallengeAction[]) => actions.reduce(challengeReducer, state);

/**
 * A student who takes every available shortcut still reaches the end of the challenge.
 * These tests pin the floor: support must actually suppress credit, and no micro-skill
 * may be earned simply by arriving at the final screen.
 */
const setup: ChallengeAction[] = [
  { type: "SETUP_SELECTED", setupId: "gym-sublet" },
  { type: "SETUP_RANKED", order: ["cousin-room", "teammate-share", "gym-sublet"], correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: "1800", value: dollars(1800), correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true },
];

// Confirmed-only path: available $5,000, locked $3,400, so $1,600 is adjustable.
const balancedWorkingPlan: ChallengeAction[] = [
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(400) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(0) },
  { type: "PLAN_SAVE_REQUESTED", mode: "working" },
];

// Week 5 adds a $700 required cost, so the entry state is $700 short of balancing.
const toWeek5: ChallengeAction[] = [
  { type: "GO_TO_STAGE", stage: "week5-transition" },
  { type: "WEEK5_ADVANCE_CONFIRMED" },
  { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true },
  { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "700", value: dollars(700), correct: true },
  { type: "GO_TO_STAGE", stage: "first-response" },
];

const decisionsAndBalancedFinal: ChallengeAction[] = [
  { type: "OPTIONAL_WORK_DECIDED", accepted: false },
  { type: "COMPLETION_INCOME_DECIDED", included: false },
  { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "goal", amount: dollars(900) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "reserve", amount: dollars(0) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "flexibleCash", amount: dollars(0) },
  { type: "PLAN_SAVE_REQUESTED", mode: "final" },
];

const pointsOf = (state: ChallengeState) =>
  Object.fromEntries(deriveResult(state.log).observations.map((observation) => [observation.microSkillId, observation.points]));

describe("support level suppresses structured credit", () => {
  it("awards nothing for a Working Plan the board built for the student", () => {
    const supplied = pointsOf(run(createInitialState(), ...setup,
      { type: "SHOW_AND_CONTINUE_USED", interactionId: "working" }, ...balancedWorkingPlan));
    const independent = pointsOf(run(createInitialState(), ...setup, ...balancedWorkingPlan));

    expect(independent["C3.2"]).toBe(5);
    expect(independent["C3.3"]).toBe(5);
    // `null`, and these two lines used to read `.toBe(0)`.
    //
    // The premise above — *"support must actually suppress credit"* — is unchanged and a null
    // suppresses it harder than a zero, because a null can never become a positive judgement
    // anywhere downstream. What the zero additionally did was assert a *failure*: it reported
    // to a teacher that this child had been unable to build a plan, when what happened is that
    // BOW built it for them, and it then admitted the child to the class denominator on the
    // strength of that. An assessment judge traced the whole chain. The rule this file exists
    // to pin is the floor on credit; the zero was a claim beyond it.
    expect(supplied["C3.2"]).toBeNull();
    expect(supplied["C3.3"]).toBeNull();
  });

  it("caps a scaffolded final plan below independent credit", () => {
    const base = run(createInitialState(), ...setup, ...balancedWorkingPlan, ...toWeek5,
      { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response", acknowledgedResidual: dollars(700) });
    const scaffolded = pointsOf(run(base, { type: "SCAFFOLD_OPENED", interactionId: "final" }, ...decisionsAndBalancedFinal));
    const independent = pointsOf(run(base, ...decisionsAndBalancedFinal));

    expect(independent["C5.4"]).toBe(5);
    expect(scaffolded["C5.4"]).toBe(3);
  });
});

describe("C5.6 is not awarded for merely finishing", () => {
  const reachFinal = (...firstResponse: ChallengeAction[]) =>
    pointsOf(run(createInitialState(), ...setup, ...balancedWorkingPlan, ...toWeek5, ...firstResponse, ...decisionsAndBalancedFinal));

  it("gives no credit when the student changes nothing and banks the shortfall", () => {
    const passive = reachFinal({ type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response", acknowledgedResidual: dollars(700) });
    expect(passive["C5.6"]).toBe(0);
    // The same attempt still reaches a balanced final plan, so C5.6 is genuinely independent.
    expect(passive["C5.4"]).toBe(5);
  });

  it("gives partial credit for a token adjustment", () => {
    const token = reachFinal(
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "reserve", amount: dollars(200) },
      { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response", acknowledgedResidual: dollars(500) },
    );
    expect(token["C5.6"]).toBe(2);
  });

  it("gives full credit for absorbing the whole shortfall from existing resources", () => {
    const full = reachFinal(
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(500) },
      { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
    );
    expect(full["C5.6"]).toBe(5);
  });

  it("does not depend on whether the extra work was accepted", () => {
    const firstResponse: ChallengeAction[] = [
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(500) },
      { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
    ];
    const base = run(createInitialState(), ...setup, ...balancedWorkingPlan, ...toWeek5, ...firstResponse);
    const declined = pointsOf(run(base, ...decisionsAndBalancedFinal));
    const accepted = pointsOf(run(base,
      { type: "OPTIONAL_WORK_DECIDED", accepted: true },
      { type: "COMPLETION_INCOME_DECIDED", included: false },
      { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "goal", amount: dollars(1200) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "reserve", amount: dollars(100) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "flexibleCash", amount: dollars(0) },
      { type: "PLAN_SAVE_REQUESTED", mode: "final" },
    ));
    expect(accepted["C5.6"]).toBe(declined["C5.6"]);
    expect(accepted["C5.4"]).toBe(declined["C5.4"]);
  });
});

describe("Week 5 components exclude changes worth nothing", () => {
  it("does not require selecting a $0 travel cost for the setup with no extra travel", () => {
    // gym-sublet has no event travel cost, so 'required-cost' is the only applicable component.
    const state = run(createInitialState(), ...setup, ...balancedWorkingPlan, ...toWeek5,
      { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(500) },
      { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" }, ...decisionsAndBalancedFinal);
    expect(pointsOf(state)["C5.3"]).toBe(5);
  });
});
