import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { challengeReducer } from "../machine/reducer";
import { createInitialState, type ChallengeState } from "../machine/state";
import type { ChallengeAction } from "../machine/actions";
import { deriveResult } from "./result";
import { STRUCTURED_MICRO_SKILLS } from "../blueprint/microSkills";
import { CONCEPTS } from "../blueprint/concepts";

const run = (s: ChallengeState, ...a: ChallengeAction[]) => a.reduce(challengeReducer, s);
const pts = (s: ChallengeState) => Object.fromEntries(deriveResult(s.log).observations.map((o) => [o.microSkillId, o.points]));

describe("blueprint arithmetic holds", () => {
  it("18 micro-skills at 5 points reconcile to the 90 structured maximum", () => {
    expect(STRUCTURED_MICRO_SKILLS).toHaveLength(18);
    expect(STRUCTURED_MICRO_SKILLS.reduce((n, s) => n + s.maxPoints, 0)).toBe(90);
  });

  it("concept weights reconcile to 90 structured plus 10 reasoning", () => {
    const structured = CONCEPTS.filter((c) => c.id !== "financial-defense").reduce((n, c) => n + c.weight, 0);
    const reasoning = CONCEPTS.find((c) => c.id === "financial-defense")!.weight;
    expect(structured).toBe(90);
    expect(reasoning).toBe(10);
  });

  it("every micro-skill belongs to exactly one concept", () => {
    for (const skill of STRUCTURED_MICRO_SKILLS) {
      const owners = CONCEPTS.filter((c) => c.microSkillIds.includes(skill.id));
      expect(owners).toHaveLength(1);
      expect(owners[0]!.id).toBe(skill.conceptId);
    }
  });
});

// A complete, competent run used as the baseline for perturbation tests.
const competent = (over: Partial<{ setup: "stable-1800" | "shared-1400" | "flexible-1000"; takeWork: boolean; countCompletion: boolean }> = {}) => {
  const setupId = over.setup ?? "stable-1800";
  const cost = { "stable-1800": 1800, "shared-1400": 1400, "flexible-1000": 1000 }[setupId];
  const event = { "stable-1800": 0, "shared-1400": 150, "flexible-1000": 350 }[setupId];
  const takeWork = over.takeWork ?? false;
  const countCompletion = over.countCompletion ?? false;
  const spendableWorking = 5000 - (cost + 1600);
  const lockedFinal = cost + 1600 + 700 + event;
  const availFinal = 5000 + (countCompletion ? 800 : 0) + (takeWork ? 500 : 0);
  const spendableFinal = availFinal - lockedFinal;
  const availFR = 5000;
  const spendableFR = availFR - lockedFinal;

  let s = run(createInitialState(),
    { type: "SETUP_SELECTED", setupId },
    { type: "CALCULATION_SUBMITTED", calcId: "setup-middle-total", raw: "1400", value: dollars(1400), correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "setup-lowest-total", raw: "1000", value: dollars(1000), correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true },
    { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(Math.min(1200, spendableWorking)) },
    { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(Math.max(0, spendableWorking - 1200)) },
    { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(0) },
    { type: "PLAN_SAVE_REQUESTED", mode: "working" },
    { type: "GO_TO_STAGE", stage: "week5-transition" },
    { type: "WEEK5_ADVANCE_CONFIRMED" },
    { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true },
    ...(event > 0 ? [{ type: "GAP_TILE_TOGGLED", tileId: "setup-cost", selected: true } as ChallengeAction] : []),
    { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: String(700 + event), value: dollars(700 + event), correct: true },
    { type: "GO_TO_STAGE", stage: "first-response" },
    // absorb everything possible with existing money
    { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(Math.max(0, Math.min(1200, spendableFR))) },
    { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "reserve", amount: dollars(Math.max(0, spendableFR - 1200)) },
    { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "flexibleCash", amount: dollars(0) },
    { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
    { type: "OPTIONAL_WORK_DECIDED", accepted: takeWork },
    { type: "COMPLETION_INCOME_DECIDED", included: countCompletion },
    { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "goal", amount: dollars(Math.max(0, Math.min(1200, spendableFinal))) },
    { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "reserve", amount: dollars(Math.max(0, spendableFinal - 1200)) },
    { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "flexibleCash", amount: dollars(0) },
    { type: "PLAN_SAVE_REQUESTED", mode: "final" },
  );
  if (countCompletion) {
    const spendablePreview = 5000 + (takeWork ? 500 : 0) - lockedFinal;
    s = run(s,
      { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "goal", amount: dollars(Math.max(0, Math.min(1200, spendablePreview))) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "reserve", amount: dollars(Math.max(0, spendablePreview - 1200)) },
      { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "flexibleCash", amount: dollars(0) },
      { type: "PLAN_SAVE_REQUESTED", mode: "remaining-risk" },
    );
  }
  return s;
};

describe("no structured points depend on a lifestyle preference", () => {
  it("scores the three setups identically for the same quality of work", () => {
    const a = pts(competent({ setup: "stable-1800" }));
    const b = pts(competent({ setup: "shared-1400" }));
    const c = pts(competent({ setup: "flexible-1000" }));
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("scores taking and declining the optional work identically", () => {
    expect(pts(competent({ takeWork: true }))).toEqual(pts(competent({ takeWork: false })));
  });

  it("does not penalise carrying the $800 forward when the extra check is passed", () => {
    const counted = pts(competent({ countCompletion: true }));
    const excluded = pts(competent({ countCompletion: false }));
    expect(counted).toEqual(excluded);
  });
});

describe("every scored path reaches a complete, gradeable result", () => {
  for (const setup of ["stable-1800", "shared-1400", "flexible-1000"] as const) {
    for (const takeWork of [true, false]) {
      for (const countCompletion of [true, false]) {
        it(`${setup} / work=${takeWork} / $800=${countCompletion} produces no unobserved micro-skill`, () => {
          const result = deriveResult(competent({ setup, takeWork, countCompletion }).log, 8);
          const unobserved = result.observations.filter((o) => o.points === null).map((o) => o.microSkillId);
          expect(unobserved).toEqual([]);
          expect(result.grade.incomplete).toBe(false);
          expect(result.grade.structuredPoints).toBe(90);
          expect(result.grade.finalPoints).toBe(98);
        });
      }
    }
  }
});
