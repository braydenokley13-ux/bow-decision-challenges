import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "../machine/reducer";
import { createInitialState, type ChallengeState } from "../machine/state";
import type { ChallengeAction } from "../machine/actions";
import { CONCEPTS } from "../blueprint/concepts";
import { EVIDENCE_EVENT_TYPES } from "./types";
import { deriveGrade, REASONING_MAXIMUM, STRUCTURED_MAXIMUM } from "./grade";

const run = (state: ChallengeState, ...actions: (ChallengeAction & { at?: number })[]) =>
  actions.reduce(challengeReducer, state);

const START = 1_760_000_000_000;

const aRun = () =>
  run(createInitialState(START),
    { type: "SESSION_STARTED", sessionId: "session-abc", classCode: "BOW301", seatCode: "07", at: START },
    { type: "SETUP_SELECTED", setupId: "teammate-share", at: START + 20_000 },
    { type: "COURSE_DEPOSIT_DECIDED", taken: false, at: START + 35_000 },
    { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true, at: START + 50_000 },
    { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true, at: START + 90_000 },
    { type: "DEFENSE_SUBMITTED", tileIds: ["a", "b"], text: "x".repeat(40), at: START + 600_000 },
  );

describe("the shared evidence envelope", () => {
  const log = aRun().log;

  it("stamps every event with the challenge, its version, and the session", () => {
    expect(log.length).toBeGreaterThan(0);
    for (const event of log) {
      expect(event.challengeId).toBe("plan-under-pressure");
      expect(event.challengeVersion).toBe("2.1.0-mvp");
      expect(event.stage).toBeTruthy();
      expect(Array.isArray(event.conceptIds)).toBe(true);
    }
    // The session id is only known from the moment the student joins.
    const afterJoin = log.filter((event) => event.type !== "SESSION_STARTED");
    for (const event of afterJoin) expect(event.sessionId).toBe("session-abc");
  });

  it("carries real wall-clock times, so duration is recoverable", () => {
    const first = log[0]!;
    const last = log.at(-1)!;
    expect(first.timestamp).toBeGreaterThanOrEqual(START);
    expect(last.timestamp - first.timestamp).toBe(600_000);
    // Order still comes from the sequence, never from the clock.
    expect(log.map((event) => event.sequence)).toEqual(log.map((_, index) => index + 1));
  });

  it("never goes backwards even if a device clock does", () => {
    const state = run(createInitialState(START),
      { type: "SETUP_SELECTED", setupId: "gym-sublet", at: START + 10_000 },
      { type: "COURSE_DEPOSIT_DECIDED", taken: true, at: START - 999_999 },
    );
    const stamps = state.log.map((event) => event.timestamp);
    expect([...stamps].sort((a, b) => a - b)).toEqual(stamps);
  });

  it("tags events with concepts from the canonical vocabulary and nothing else", () => {
    const known = new Set(CONCEPTS.map((concept) => concept.id));
    for (const event of log) for (const concept of event.conceptIds) expect(known).toContain(concept);
    const setup = log.find((event) => event.type === "SETUP_SELECTED");
    expect(setup?.conceptIds).toEqual(["full-cost"]);
    const floor = log.find((event) => event.type === "CALCULATION_SUBMITTED");
    expect(floor?.conceptIds).toEqual(["income-reliability"]);
  });

  it("records reaching a screen as its own fact", () => {
    const entered = log.filter((event) => event.type === "STAGE_ENTERED");
    expect(entered.length).toBeGreaterThan(0);
    expect(entered.map((event) => (event.payload as { stage: string }).stage)).toContain("role-contract");
  });

  it("writes only the event types the data doctrine allows", () => {
    // Any new event type has to be added to EVIDENCE_EVENT_TYPES deliberately, which is
    // where the "collect only what earns its place" decision is reviewed.
    const allowed = new Set<string>(EVIDENCE_EVENT_TYPES);
    for (const event of log) expect(allowed).toContain(event.type);
    for (const forbidden of ["MOUSE_MOVED", "KEY_PRESSED", "FIELD_FOCUSED", "IDLE_DETECTED"]) {
      expect(allowed.has(forbidden)).toBe(false);
    }
  });
});

describe("the grade cannot be pushed outside its own scale", () => {
  const observations = [{ microSkillId: "C1.1", conceptId: "income-reliability", points: 5, outcome: "demonstrated", supportLevel: "standard_access", evidenceRefs: ["x"], reason: "" }] as never;

  it("clamps educator-entered reasoning points to the rubric", () => {
    expect(deriveGrade(observations, [], 40).reasoningPoints).toBe(REASONING_MAXIMUM);
    expect(deriveGrade(observations, [], -5).reasoningPoints).toBe(0);
    expect(deriveGrade(observations, [], 7.4).reasoningPoints).toBe(7);
    expect(deriveGrade(observations, [], Number.NaN).reasoningPoints).toBeNull();
  });

  it("derives the structured maximum from the blueprint rather than restating it", () => {
    expect(STRUCTURED_MAXIMUM).toBe(90);
    expect(deriveGrade(observations, [], 5).structuredMaximum).toBe(STRUCTURED_MAXIMUM);
  });

  it("separates a student who stopped from a student who finished without showing everything", () => {
    const partial = [
      ...(observations as unknown[]),
      { microSkillId: "C1.2", conceptId: "income-reliability", points: null, outcome: "not_observed", supportLevel: "standard_access", evidenceRefs: ["y"], reason: "" },
    ] as never;
    expect(deriveGrade(partial, [], 5, { submitted: false }).incomplete).toBe(true);
    expect(deriveGrade(partial, [], 5, { submitted: false }).finalPoints).toBeNull();
    const finished = deriveGrade(partial, [], 5, { submitted: true });
    expect(finished.incomplete).toBe(false);
    expect(finished.finalPoints).toBe(10);
  });
});
