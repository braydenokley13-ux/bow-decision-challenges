import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { SetupId } from "../core/ids";
import type { PlanMode } from "../finance/types";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import { setupCostOrder } from "../scenario/expectations";
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

// A complete, competent run used as the baseline for perturbation tests. Every amount is
// read from the scenario, so re-pricing the model changes what this run enters rather than
// breaking the test — the same rule the grader itself now follows.
const N = SCENARIO_NUMBERS;

const balancedFill = (spendable: number) => {
  const goal = Math.max(0, Math.min(N.course.fullPrice, spendable));
  return [
    { type: "PLAN_AMOUNT_CHANGED", category: "goal", amount: dollars(goal) },
    { type: "PLAN_AMOUNT_CHANGED", category: "reserve", amount: dollars(Math.max(0, spendable - goal)) },
    { type: "PLAN_AMOUNT_CHANGED", category: "flexibleCash", amount: dollars(0) },
  ] as const;
};
const fillFor = (mode: PlanMode, spendable: number): ChallengeAction[] =>
  balancedFill(spendable).map((change) => ({ ...change, mode }));

const competent = (over: Partial<{ setup: SetupId; takeWork: boolean; countCompletion: boolean }> = {}) => {
  const setupId = over.setup ?? "gym-sublet";
  const cost = N.setupCosts[setupId];
  const event = N.setupEventCosts[setupId];
  const takeWork = over.takeWork ?? false;
  const countCompletion = over.countCompletion ?? false;
  const reliable = N.savings + N.basePay;
  const spendableWorking = reliable - (cost + N.essentialsTotal);
  const lockedFinal = cost + N.essentialsTotal + N.requiredWeek5Cost + event + (takeWork ? N.optionalWorkCost : 0);
  const spendableFinal = reliable + (countCompletion ? N.completionIncome : 0) + (takeWork ? N.optionalWorkIncome : 0) - lockedFinal;
  const spendableFR = reliable - (cost + N.essentialsTotal + N.requiredWeek5Cost + event);
  const week5Total = N.requiredWeek5Cost + event;

  let s = run(createInitialState(),
    { type: "SETUP_SELECTED", setupId },
    { type: "SETUP_RANKED", order: setupCostOrder(N), correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: String(cost), value: cost, correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: String(N.essentialsTotal), value: N.essentialsTotal, correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: String(reliable), value: dollars(reliable), correct: true },
    ...fillFor("working", spendableWorking),
    { type: "PLAN_SAVE_REQUESTED", mode: "working" },
    { type: "GO_TO_STAGE", stage: "week5-transition" },
    { type: "WEEK5_ADVANCE_CONFIRMED" },
    { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true },
    ...(event > 0 ? [{ type: "GAP_TILE_TOGGLED", tileId: "setup-cost", selected: true } as ChallengeAction] : []),
    { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: String(week5Total), value: dollars(week5Total), correct: true },
    { type: "GO_TO_STAGE", stage: "first-response" },
    // absorb everything possible with existing money
    ...fillFor("week5-first-response", spendableFR),
    { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
    { type: "OPTIONAL_WORK_DECIDED", accepted: takeWork },
    { type: "COMPLETION_INCOME_DECIDED", included: countCompletion },
    ...fillFor("final", spendableFinal),
    { type: "PLAN_SAVE_REQUESTED", mode: "final" },
  );
  if (countCompletion) {
    const spendablePreview = reliable + (takeWork ? N.optionalWorkIncome : 0) - lockedFinal;
    s = run(s,
      ...fillFor("remaining-risk", spendablePreview),
      { type: "PLAN_SAVE_REQUESTED", mode: "remaining-risk" },
    );
  }
  return s;
};

describe("no structured points depend on a lifestyle preference", () => {
  it("scores the three setups identically for the same quality of work", () => {
    const a = pts(competent({ setup: "gym-sublet" }));
    const b = pts(competent({ setup: "teammate-share" }));
    const c = pts(competent({ setup: "cousin-room" }));
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
  for (const setup of ["gym-sublet", "teammate-share", "cousin-room"] as const) {
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
