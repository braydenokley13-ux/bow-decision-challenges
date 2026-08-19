import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "./reducer";
import { snapshotForMode } from "./selectors";
import { createInitialState, type ChallengeState } from "./state";
import type { ChallengeAction } from "./actions";

const run = (state: ChallengeState, ...actions: ChallengeAction[]) => actions.reduce(challengeReducer, state);

/**
 * Which plan is the season running on.
 *
 * The safety-check screen answers that question in prose, in front of the student, before
 * they touch it: *"This is a check, not a new plan — the season runs on the plan you saved."*
 * Everything in this file is that sentence, asserted.
 *
 * The run below is the one a critic played in a browser. A student counts the $800 attendance
 * bonus, splits $3,900 across the three rows as $1,200 / $1,400 / $1,300, saves it, and meets
 * the check. They take the bonus out of Backup money to show the plan still holds without it —
 * $600 — and carry on. Four screens later the Week 5 board opens on $1,200 / $1,400 / $1,300,
 * which is right, and one press of the smallest control on it turned the board into
 * $1,150 / $600 / $1,300: Backup money down $800 on a row nobody had touched, `was $1,400`
 * printed beside `$600`, and "Cut from your earlier plan $850" over a fifty-dollar cut.
 *
 * The reducer was seeding the Week 5 draft from `drafts.fallback` while the screen drew
 * `drafts.working`, so the first edit — which writes the whole draft, not one row — committed
 * a plan the student had never seen in one piece. A merge of two plans is worse than either,
 * and it is the plan the season resolves against and the plan a teacher marks.
 */
const countTheBonus: ChallengeAction[] = [
  { type: "SETUP_SELECTED", setupId: "cousin-room" },
  { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true },
];

/** $1,200 / $1,400 / $1,300 — the whole $3,900, which is what makes it saveable. */
const theSavedPlan: ChallengeAction[] = [
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(1400) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(1300) },
  { type: "PLAN_SAVE_REQUESTED", mode: "working" },
];

/** The one press the check asks for: take the $800 that might not come out of Backup money. */
const theSafetyCheck: ChallengeAction[] = [
  { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "reserve", amount: dollars(600) },
  { type: "PLAN_SAVE_REQUESTED", mode: "fallback" },
];

const atWeek5 = () => run(createInitialState(), ...countTheBonus, ...theSavedPlan, ...theSafetyCheck);

describe("the plan Week 5 lands on is the plan the student saved", () => {
  it("keeps the saved plan under a student who saved a safety check", () => {
    const state = atWeek5();
    expect(state.saved.working).toBeDefined();
    expect(state.saved.fallback).toBeDefined();
    expect(snapshotForMode(state, "week5-first-response")?.amounts).toEqual({ goal: 1200, reserve: 1400, flexibleCash: 1300 });
  });

  it("moves only the row the student moved, on the first press of the smallest control", () => {
    // One press of "Decrease Sports-media course by $50" on a board nobody has otherwise
    // touched. The other two rows are not part of this act and must not move.
    const state = run(atWeek5(), { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(1150) });
    expect(state.drafts["week5-first-response"]).toEqual({ goal: 1150, reserve: 1400, flexibleCash: 1300 });
  });

  it("saves the student's own plan when Week 5 is saved without an edit", () => {
    // The same seam at the other end of the screen: pressing save on an untouched board
    // built the snapshot from the seed too, so a student who accepted the shortfall turned in
    // a plan they had never made. What is saved is what was drawn.
    const state = run(atWeek5(), { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response", acknowledgedResidual: dollars(1000) });
    const snapshot = state.snapshots.find((entry) => entry.inputs.mode === "week5-first-response");
    expect(snapshot?.inputs.amounts).toEqual({ goal: 1200, reserve: 1400, flexibleCash: 1300 });
  });

  it("shows the same plan it edits, on every mode that carries one forward", () => {
    // The defect was not a wrong rule, it was two rules. Whatever the seed is, the board a
    // student sees before their first press and the draft their first press writes have to be
    // the same numbers — for the backup check and both repairs as well as for Week 5.
    const modes = ["fallback", "week5-first-response", "final", "remaining-risk"] as const;
    for (const mode of modes) {
      const before = snapshotForMode(atWeek5(), mode)?.amounts;
      const after = run(atWeek5(), { type: "PLAN_AMOUNT_CHANGED", mode, category: "goal", amount: dollars(0) }).drafts[mode];
      expect({ mode, ...after }).toEqual({ mode, ...before, goal: 0 });
    }
  });
});
