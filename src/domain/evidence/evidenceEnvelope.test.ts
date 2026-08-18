import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "../machine/reducer";
import { createInitialState, type ChallengeState } from "../machine/state";
import type { ChallengeAction } from "../machine/actions";
import { CONCEPTS } from "../blueprint/concepts";
import { evidenceRequirementById } from "../competency/competencies";
import { PLAN_UNDER_PRESSURE_LAUNCH } from "../scenario/registry";
import { BASKETBALL_EVIDENCE_ROUTES } from "../scenario/worlds/basketball/observer";
import { EVIDENCE_EVENT_TYPES } from "./types";
import { deriveGrade, REASONING_MAXIMUM, STRUCTURED_MAXIMUM } from "./grade";
import { PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";

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
    { type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category: "flexibleCash", amount: dollars(400), at: START + 200_000 },
    { type: "DEFENSE_SUBMITTED", tileIds: ["a", "b"], text: "x".repeat(40), at: START + 600_000 },
  );

describe("the shared evidence envelope", () => {
  const log = aRun().log;

  it("stamps every event with the challenge, its version, and the session", () => {
    expect(log.length).toBeGreaterThan(0);
    for (const event of log) {
      expect(event.challengeId).toBe(PLAN_UNDER_PRESSURE.id);
      expect(event.challengeVersion).toBe(PLAN_UNDER_PRESSURE.version);
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

  it("tags events with the requirements the world can actually observe, and nothing else", () => {
    // A tag is a claim about relevance, never about mastery: "this action is evidence about
    // whether the plan balanced," never "this student can balance a plan." It still has to
    // be true — a tag naming a requirement nothing observes would put a line in the §19.2
    // evidence timeline with no judgement behind it and no way to reach one.
    const routed = new Set(
      BASKETBALL_EVIDENCE_ROUTES
        .filter((route) => route.via !== "not-produced")
        .map((route) => route.evidenceRequirementId),
    );
    for (const event of log) {
      for (const id of event.evidenceRequirementIds) {
        expect(evidenceRequirementById(id), `${event.type} tags ${id}`).toBeDefined();
        expect(routed.has(id), `${event.type} tags ${id}, which nothing observes`).toBe(true);
      }
      // The competency tags are derived from the requirement tags, so the two can never
      // disagree — an event filed under a skill without saying what about it is a claim
      // with no evidence trail.
      const derived = new Set(event.evidenceRequirementIds.map((id) => evidenceRequirementById(id)?.competencyId));
      expect(new Set(event.competencyIds)).toEqual(derived);
    }
    const floor = log.find((event) => event.type === "CALCULATION_SUBMITTED");
    expect(floor?.evidenceRequirementIds).toEqual(["plan-within-income.er1"]);
    expect(floor?.competencyIds).toEqual(["plan-within-income"]);
    const defense = log.find((event) => event.type === "DEFENSE_SUBMITTED");
    expect(defense?.competencyIds).toEqual(["plan-within-income", "adapt-a-plan", "sort-by-need-want-goal"]);
  });

  it("tags savings-was-planned on the one statement that is evidence about it, and nowhere else", () => {
    // This assertion used to read the other way round: `plan-within-income.er3` appeared on
    // no event at all, because nothing in this world was evidence about it. What changed is
    // the world, not the reading — closing a plan by naming the row that takes the leftovers
    // is a statement the student makes, and it is the only moment here that speaks to
    // whether the savings figure was set or arrived. The general rule above still does the
    // real work: a tag has to have a production route behind it. This pins which moment.
    const tagged = log.filter((event) => event.evidenceRequirementIds.includes("plan-within-income.er3"));
    expect(tagged.map((event) => event.type)).toEqual(["PLAN_REMAINDER_ASSIGNED"]);
    expect(tagged[0]?.competencyIds).toEqual(["plan-within-income"]);
  });

  it("does not tag it on the repair boards, where nothing is judged from it", () => {
    // The same control appears on the backup version. Its statement is real, and no observer
    // reads it — so tagging it would put a sentence in the §19.2 trail that no judgement
    // stands behind.
    const repaired = run(createInitialState(START),
      { type: "SETUP_SELECTED", setupId: "teammate-share" },
      { type: "PLAN_REMAINDER_ASSIGNED", mode: "fallback", category: "reserve", amount: dollars(300) },
    );
    const declaration = repaired.log.find((event) => event.type === "PLAN_REMAINDER_ASSIGNED");
    expect(declaration?.evidenceRequirementIds).toEqual([]);
    expect(declaration?.competencyIds).toEqual([]);
  });

  it("records reaching a screen as its own fact", () => {
    // Stage progression is recorded, not inferred: a student who reached a screen and did
    // nothing has to be distinguishable from one who never got there. Where the session
    // opens depends on the launch — straight into Avery's deal until the world picker
    // ships, onto the choice once it has — and the log says whichever actually happened.
    const entered = log.filter((event) => event.type === "STAGE_ENTERED");
    expect(entered.length).toBeGreaterThan(0);
    expect(entered.map((event) => (event.payload as { stage: string }).stage))
      .toContain(PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld ? "choose-world" : "role-contract");
    expect(entered.map((event) => (event.payload as { from: string }).from)).toContain("entry");
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
