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
    state = challengeReducer(state, { type: "SETUP_SELECTED", setupId: "stable-1800" });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(900) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(300) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(400) });
    state = challengeReducer(state, { type: "PLAN_SAVE_REQUESTED", mode: "working" });
    // No conditional income means no lower-resource version to build, so there is no
    // screen in between whose only message is that there is nothing to do.
    expect(state.stage).toBe("week5-transition");
    expect(state.saved.working).toBeDefined();
  });

  it("routes a conditional Working Plan to Fallback Version", () => {
    let state = createInitialState();
    state = challengeReducer(state, { type: "SETUP_SELECTED", setupId: "flexible-1000" });
    state = challengeReducer(state, { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(500) });
    state = challengeReducer(state, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(1500) });
    state = challengeReducer(state, { type: "PLAN_SAVE_REQUESTED", mode: "working" });
    expect(state.stage).toBe("fallback-version");
  });
});
