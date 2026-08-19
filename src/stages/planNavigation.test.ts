import { describe, expect, it } from "vitest";
import { planPosition, railStop, seedVisited, type PlanPosition } from "./planNavigation";

/**
 * The plan rail must never claim a question was reached when it was not.
 *
 * The regression this pins down: answering question 1 used to mark question 2 as done and
 * make question 3 clickable, though neither had ever been on screen. A student read a rail
 * saying they had finished something they had not seen. Reach is now earned by opening a
 * question, and the rail may offer at most the one real next question beyond that.
 */

const QUESTIONS = 4;

function states(position: PlanPosition) {
  return Array.from({ length: QUESTIONS }, (_, index) => railStop(index, position));
}

describe("the plan rail", () => {
  it("starts with only question 1, nothing done, nothing clickable", () => {
    const position = planPosition({ wanted: 0, visited: 0, gates: { floorReady: false, bonusesAnswered: false, essentialsReady: false }, questions: QUESTIONS });
    expect(states(position)).toEqual([
      { state: "current", open: false },
      { state: "todo", open: false },
      { state: "todo", open: false },
      { state: "todo", open: false },
    ]);
  });

  it("never marks an unreached question done or clickable when question 1 is answered", () => {
    // Floor answered, still on question 1. Question 2 is the real next question and opens;
    // question 3 stays shut even though the old furthest computation would have opened it.
    const position = planPosition({ wanted: 0, visited: 0, gates: { floorReady: true, bonusesAnswered: true, essentialsReady: false }, questions: QUESTIONS });
    expect(position.reachable).toBe(1);
    expect(states(position)).toEqual([
      { state: "current", open: false },
      { state: "todo", open: true },
      { state: "todo", open: false },
      { state: "todo", open: false },
    ]);
  });

  it("opens question 3 only once question 2 has been on screen and answered", () => {
    const gates = { floorReady: true, bonusesAnswered: true, essentialsReady: false };
    const before = planPosition({ wanted: 0, visited: 0, gates, questions: QUESTIONS });
    expect(railStop(2, before).open).toBe(false);
    const after = planPosition({ wanted: 1, visited: 1, gates, questions: QUESTIONS });
    expect(after.at).toBe(1);
    expect(railStop(0, after)).toEqual({ state: "done", open: true });
    expect(railStop(2, after)).toEqual({ state: "todo", open: true });
    expect(railStop(3, after)).toEqual({ state: "todo", open: false });
  });

  it("holds question 3 shut while the two bonuses are unanswered", () => {
    // This used to be the one question in the plan with no gate at all. Both cards opened
    // with "No — leave it out" already pressed — the pedagogically right answer — so a
    // student standing on question 2 was offered *Next* before deciding anything, and the
    // plan then recorded the decision as theirs. Sitting on the question is no longer
    // answering it.
    const gates = { floorReady: true, bonusesAnswered: false, essentialsReady: false };
    const standing = planPosition({ wanted: 1, visited: 1, gates, questions: QUESTIONS });
    expect(standing.reachable).toBe(1);
    expect(railStop(2, standing).open).toBe(false);
    const answered = planPosition({ wanted: 1, visited: 1, gates: { ...gates, bonusesAnswered: true }, questions: QUESTIONS });
    expect(railStop(2, answered).open).toBe(true);
  });

  it("holds question 4 shut until the essentials total is right", () => {
    const at3 = planPosition({ wanted: 2, visited: 2, gates: { floorReady: true, bonusesAnswered: true, essentialsReady: false }, questions: QUESTIONS });
    expect(at3.reachable).toBe(2);
    expect(railStop(3, at3).open).toBe(false);
    const answered = planPosition({ wanted: 2, visited: 2, gates: { floorReady: true, bonusesAnswered: true, essentialsReady: true }, questions: QUESTIONS });
    expect(railStop(3, answered).open).toBe(true);
  });

  it("clamps a wanted question past the frontier back to where the student may stand", () => {
    const position = planPosition({ wanted: 3, visited: 0, gates: { floorReady: true, bonusesAnswered: true, essentialsReady: false }, questions: QUESTIONS });
    expect(position.at).toBe(1);
  });

  it("keeps every opened question clickable when the student walks back", () => {
    const position = planPosition({ wanted: 0, visited: 3, gates: { floorReady: true, bonusesAnswered: true, essentialsReady: true }, questions: QUESTIONS });
    expect(position.at).toBe(0);
    expect(states(position).slice(1).every((stop) => stop.state === "done" && stop.open)).toBe(true);
  });
});

describe("the refresh seed", () => {
  it("puts a fresh student on question 1", () => {
    expect(seedVisited({ floorReady: false, essentialsReady: false, bonusesAnswered: false })).toBe(0);
  });

  it("does not skip question 2 just because question 1 is answered", () => {
    expect(seedVisited({ floorReady: true, essentialsReady: false, bonusesAnswered: false })).toBe(1);
  });

  it("lands past the bonuses only when the log shows they were touched", () => {
    expect(seedVisited({ floorReady: true, essentialsReady: false, bonusesAnswered: true })).toBe(2);
    expect(seedVisited({ floorReady: true, essentialsReady: true, bonusesAnswered: false })).toBe(3);
  });
});
