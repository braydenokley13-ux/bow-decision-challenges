import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { EvidenceRequirementId, RubricLevel } from "../competency/types";
import type { ChallengeAction } from "../machine/actions";
import { challengeReducer } from "../machine/reducer";
import { createInitialState } from "../machine/state";
import { observeBasketballFromLog } from "./worlds/basketball/observer";
import { observePopUpFromLog } from "./worlds/food-truck/observer";
import { createPopUpState, popUpReducer, type PopUpAction } from "./worlds/food-truck/machine";
import { availableToPlan } from "./worlds/food-truck/economy";
import { POP_UP_NUMBERS } from "./worlds/food-truck/numbers";
import { SCENARIO_NUMBERS } from "./numbers";
import { availableFor, lockedFor } from "../finance/formulas";

/**
 * Do the two worlds judge the same behaviour the same way?
 *
 * `worldParity.test.ts` next door compares what the worlds *declare* — stages, routes, copy,
 * the shape of the contract — and `demand.ts` compares what they *ask of a reader*. Neither
 * compares what the two observers **do with the same student**, and that is the gap an
 * assessment-validity review walked straight through:
 *
 * > *Bea*, Basketball: set the two discretionary rows to the figures she wanted, put what was
 * > left into savings → **Right first time**, *Showed it*.
 * > *Eli*, the market: set the two other lines to the figures he wanted, put what was left
 * > into his cut → **Did not do it**, *Not yet*.
 *
 * One behaviour, opposite verdicts, in one class, pooled into a single line on a state
 * objective — *"80% of the 5 students with a usable result showed it"* — and a reteach card
 * naming one of the two children. Nothing in the product could see it, because everything
 * that compared the worlds compared declarations.
 *
 * So this file compares judgements. Each archetype below is written as a *behaviour* — what
 * the student did with the money — and played through each world's own reducer with that
 * world's own controls, and the two observers have to reach the same level. It is deliberately
 * about `plan-within-income.er3`: that is the requirement carrying the only NYSED objective
 * this product claims, the one both worlds are built to produce, and the one that was wrong.
 * A second requirement that both worlds produce from comparable behaviour belongs here too
 * the day it exists.
 *
 * What this cannot check, and is not trying to: whether the level is *right*. Two worlds that
 * agree can both be wrong, and `plannedSavings.test.ts` and `plannedCut.test.ts` are where
 * each rule argues for itself. This asks only that a child's story does not decide their mark.
 */

const START = 1_770_000_000_000;
const ER3: EvidenceRequirementId = "plan-within-income.er3";

/* ── Basketball ─────────────────────────────────────────────────────────────────────── */

const AVERY_SETUP = "cousin-room" as const;

/** What the opening board has to place, from the numbers in force rather than written down. */
function averySpendable(): number {
  return availableFor(
    {
      mode: "working",
      amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
      includeCompletion: false,
      includeOutcome: false,
      includeOptionalWork: false,
      setupId: AVERY_SETUP,
      week5Applied: false,
      depositTaken: false,
      numbersVersion: SCENARIO_NUMBERS.version,
    },
    SCENARIO_NUMBERS,
  ) - lockedFor(
    {
      mode: "working",
      amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
      includeCompletion: false,
      includeOutcome: false,
      includeOptionalWork: false,
      setupId: AVERY_SETUP,
      week5Applied: false,
      depositTaken: false,
      numbersVersion: SCENARIO_NUMBERS.version,
    },
    SCENARIO_NUMBERS,
  );
}

function averyEr3(board: readonly ChallengeAction[]): RubricLevel | null {
  const actions: ChallengeAction[] = [
    { type: "SETUP_SELECTED", setupId: AVERY_SETUP },
    { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
    { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true },
    ...board,
    { type: "PLAN_SAVE_REQUESTED", mode: "working" },
  ];
  let at = START;
  const state = actions.reduce((current, action) => {
    at += 1000;
    return challengeReducer(current, { ...action, at });
  }, createInitialState(START));
  return observeBasketballFromLog(state.log).find((o) => o.evidenceRequirementId === ER3)?.level ?? null;
}

const typed = (category: "goal" | "reserve" | "flexibleCash", amount: number, via?: "suggested"): ChallengeAction =>
  ({ type: "PLAN_AMOUNT_CHANGED", mode: "working", category, amount: dollars(amount), ...(via ? { via } : {}) });
const sendRest = (category: "goal" | "reserve" | "flexibleCash", amount: number): ChallengeAction =>
  ({ type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category, amount: dollars(amount) });

/* ── The market ─────────────────────────────────────────────────────────────────────── */

const BOOTH = "middle-row" as const;

function marketAvailable(): number {
  return availableToPlan(POP_UP_NUMBERS, BOOTH, { catering: false, rebate: false });
}

function marketEr3(board: readonly PopUpAction[]): RubricLevel | null {
  const actions: PopUpAction[] = [
    { type: "POPUP_SPOT_SELECTED", spotId: BOOTH },
    { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: false },
    { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "rebate", counted: false },
    ...board,
    { type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" },
  ];
  let at = START;
  const state = actions.reduce((current, action) => {
    at += 1000;
    return popUpReducer(current, { ...action, at });
  }, createPopUpState(START));
  return observePopUpFromLog(state.log).find((o) => o.evidenceRequirementId === ER3)?.level ?? null;
}

const line = (name: "stock" | "cushion" | "cut", amount: number, from?: "suggested"): PopUpAction =>
  ({ type: "POPUP_LINE_CHANGED", board: "opening", line: name, amount: dollars(amount), ...(from ? { from } : {}) });
const sendRestTo = (name: "stock" | "cushion" | "cut", amount: number): PopUpAction =>
  ({ type: "POPUP_REMAINDER_ASSIGNED", board: "opening", line: name, amount: dollars(amount) });

/* ── The archetypes ─────────────────────────────────────────────────────────────────── */

/**
 * Each one is a behaviour first and two runs second. The amounts are computed from each
 * world's own numbers, so a re-pricing of either economy leaves the pairs matched.
 */
function archetypes() {
  const avery = averySpendable();
  const market = marketAvailable();
  // The market's cash to plan is never a multiple of its own step, which is why its board
  // cannot be closed without a statement and Basketball's can. That difference is the reason
  // this file exists; it must not become a difference in the judgement.
  const marketRest = market % POP_UP_NUMBERS.planIncrement || POP_UP_NUMBERS.planIncrement;
  const marketSet = market - marketRest;
  return [
    {
      behaviour: "sets the two other rows to the figures they want and lets savings have what is left",
      avery: () => averyEr3([typed("reserve", 1500), typed("flexibleCash", avery - 1500 - 100), sendRest("goal", 100)]),
      market: () => marketEr3([line("stock", marketSet - 500), line("cushion", 500), sendRestTo("cut", marketRest)]),
    },
    {
      behaviour: "sets the savings row and lets another row take the last of the money",
      avery: () => averyEr3([typed("goal", 1200), typed("reserve", 900), sendRest("flexibleCash", avery - 2100)]),
      market: () => marketEr3([line("cut", 500), line("cushion", 400), sendRestTo("stock", market - 900)]),
    },
    {
      behaviour: "sets the savings row and then sends the last of the money there as well",
      avery: () => averyEr3([typed("goal", 1000), typed("reserve", 1000), typed("flexibleCash", avery - 2100), sendRest("goal", 100)]),
      market: () => marketEr3([line("cut", 500), line("cushion", 400), line("stock", marketSet - 900), sendRestTo("cut", marketRest)]),
    },
    {
      behaviour: "types every row until the board balances and never names one",
      avery: () => averyEr3([typed("goal", 1200), typed("reserve", 900), typed("flexibleCash", avery - 2100)]),
      market: () => marketEr3([line("cut", 500), line("cushion", 400), line("stock", market - 900)]),
    },
    {
      behaviour: "takes the split BOW fills in and changes nothing",
      avery: () => averyEr3([typed("goal", 1200, "suggested"), typed("reserve", 900, "suggested"), typed("flexibleCash", avery - 2100, "suggested")]),
      market: () => marketEr3([line("cut", 500, "suggested"), line("cushion", 400, "suggested"), line("stock", market - 900, "suggested")]),
    },
    {
      behaviour: "lets savings take the leftovers, then takes them back off and closes elsewhere",
      avery: () => averyEr3([
        typed("reserve", 1500), typed("flexibleCash", avery - 1500 - 100), sendRest("goal", 100),
        typed("goal", 0), sendRest("flexibleCash", 100),
      ]),
      market: () => marketEr3([
        line("stock", marketSet - 500), line("cushion", 500), sendRestTo("cut", marketRest),
        line("cut", 0), sendRestTo("cushion", marketRest),
      ]),
    },
  ];
}

describe("the two worlds judge the same behaviour the same way", () => {
  it.each(archetypes().map((entry) => [entry.behaviour, entry] as const))(
    "a student who %s is read the same in both",
    (_behaviour, entry) => {
      expect(entry.market(), "the market disagrees with the season about the same student").toBe(entry.avery());
    },
  );

  it("still tells the two savings behaviours apart, so agreement is not agreement on nothing", () => {
    // A rule that answered `null` everywhere would pass the check above and measure nothing.
    // The pair the whole requirement exists to separate has to come out differently in both
    // worlds: savings that is what was left, and savings that was set.
    const [leftovers, planned] = archetypes();
    expect(leftovers!.avery()).toBe(0);
    expect(leftovers!.market()).toBe(0);
    expect(planned!.avery()).toBe(5);
    expect(planned!.market()).toBe(5);
  });

  it("records the arithmetic that makes one board closeable by typing and the other not", () => {
    // Not a defect and not fixable by making one world look like the other: Basketball's
    // spendable money is always a multiple of its $100 step, so a plan can be typed to
    // balance, and the market's cash to plan never is, so the closing statement is
    // compulsory there. What that means is that one world can produce a run this requirement
    // cannot read and the other cannot — a difference in *yield*, which is honest, rather
    // than a difference in *judgement*, which is not. It is pinned here so that a re-pricing
    // of either economy is read as changing what can be observed.
    for (const setupId of Object.keys(SCENARIO_NUMBERS.setupCosts) as (keyof typeof SCENARIO_NUMBERS.setupCosts)[]) {
      const spendable = SCENARIO_NUMBERS.reliableFloor - SCENARIO_NUMBERS.setupCosts[setupId] - SCENARIO_NUMBERS.essentialsTotal;
      expect(spendable % SCENARIO_NUMBERS.openingIncrement, `${setupId} no longer divides`).toBe(0);
    }
    for (const spotId of Object.keys(POP_UP_NUMBERS.spots) as (keyof typeof POP_UP_NUMBERS.spots)[]) {
      const toPlan = POP_UP_NUMBERS.startCash - POP_UP_NUMBERS.permit - POP_UP_NUMBERS.spots[spotId].booth;
      expect(toPlan % POP_UP_NUMBERS.planIncrement, `${spotId} now divides`).not.toBe(0);
    }
  });
});
