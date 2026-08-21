// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createPopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { runToCarryOn } from "../../platform/identity/runCopies";
import { rememberClosingQuestion, writeClosingAnswer } from "../../student/closingQuestion";
import { popUpSubmission } from "./PopUpContext";

describe("Food Truck continuity contracts", () => {
  it("surfaces a fork instead of silently selecting by log length", () => {
    const here = { meta: { sessionId: "same" }, log: [{ timestamp: 10, choice: "home" }] };
    const there = { meta: { sessionId: "same" }, log: [{ timestamp: 20, choice: "away" }] };
    expect(runToCarryOn(here, there).forked).toBe(true);
  });

  it("delivers the student's closing answer outside the evidence log", () => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    } });
    const state = createPopUpState(1);
    state.meta.sessionId = "market-session";
    state.meta.classCode = "PFDEM";
    state.meta.seatCode = "7";
    state.meta.assignmentId = "assignment-2";
    rememberClosingQuestion("market-session", { text: "What would you change?", required: false });
    writeClosingAnswer("market-session", "I would order fewer trays.");
    const submission = popUpSubmission(state);
    expect(submission.assignmentId).toBe("assignment-2");
    expect(submission.closingAnswer?.questionText).toBe("What would you change?");
    expect(submission.closingAnswer?.answer).toBe("I would order fewer trays.");
    expect(submission.log).toEqual([]);
  });
});
