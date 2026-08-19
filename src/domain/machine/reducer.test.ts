import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "./reducer";
import { createInitialState } from "./state";

describe("challenge state machine", () => {
  it("applies the Week 5 transition once across repeated dispatches", () => {
    const state = { ...createInitialState(), stage: "week5-transition" as const };
    const once = challengeReducer(state, { type: "WEEK5_ADVANCE_CONFIRMED" });
    const twice = challengeReducer(once, { type: "WEEK5_ADVANCE_CONFIRMED" });
    expect(twice.log.filter((event) => event.dedupeKey === "week5-applied")).toHaveLength(1);
    expect(twice.stage).toBe("week5-event");
  });

  it("does not treat exploratory allocation changes as attempts", () => {
    const state = challengeReducer(createInitialState(), { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(500) });
    expect(state.log).toHaveLength(0);
    expect(state.drafts.working?.goal).toBe(500);
  });

  it("starts the season straight from a confirmed-only Working Plan", () => {
    let state = createInitialState();
    state = challengeReducer(state, { type: "SETUP_SELECTED", setupId: "gym-sublet" });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(900) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(300) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(400) });
    state = challengeReducer(state, { type: "PLAN_SAVE_REQUESTED", mode: "working" });
    // No conditional income means no lower-resource version to build, so there is no
    // screen in between whose only message is that there is nothing to do.
    expect(state.stage).toBe("season-weeks");
    expect(state.saved.working).toBeDefined();
  });

  it("marks a calculation the product answered as supplied, on the calculation", () => {
    // `support` is what the grader reads and what the screens read. This field is the older
    // one and nothing set it, so anything asking it whether the student produced a figure was
    // told yes however the figure got there — which is how a child who pressed "Show the
    // answer" came to be told they had worked it out.
    let state = challengeReducer(createInitialState(), { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "1", value: dollars(1), correct: false });
    state = challengeReducer(state, { type: "SHOW_AND_CONTINUE_USED", interactionId: "reliable-floor" });
    expect(state.calculations["reliable-floor"]?.supplied).toBe(true);
    expect(state.support["reliable-floor"]).toBe("answer_supplied");
    // And a later correct answer does not un-supply it.
    state = challengeReducer(state, { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true });
    expect(state.calculations["reliable-floor"]?.supplied).toBe(true);
  });

  it("writes no calculation for a hand-over that is not one", () => {
    // The opening ranking and the plan boards take the same action with their own ids.
    const state = challengeReducer(createInitialState(), { type: "SHOW_AND_CONTINUE_USED", interactionId: "setup-order" });
    expect(state.calculations).toEqual({});
    expect(state.support["setup-order"]).toBe("answer_supplied");
  });

  it("routes a conditional Working Plan to Fallback Version", () => {
    let state = createInitialState();
    state = challengeReducer(state, { type: "SETUP_SELECTED", setupId: "cousin-room" });
    state = challengeReducer(state, { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(900) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(1800) });
    state = challengeReducer(state, { type: "PLAN_SAVE_REQUESTED", mode: "working" });
    expect(state.stage).toBe("fallback-version");
  });
});
