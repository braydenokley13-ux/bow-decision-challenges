import { describe, expect, it } from "vitest";
import { dollars } from "../../../core/money";
import { payForTrays, resolveSeason, sellCap, type PopUpChoices } from "./economy";
import { popUpLedger, type LedgerInput } from "./ledger";
import { POP_UP_NUMBERS as N } from "./numbers";
import { resolveMarket } from "./resolution";
import type { PopUpLineId, PopUpPlan } from "./types";

/**
 * The last Saturday, and the state a student red team could not get out of.
 *
 * What they hit, playing well: Bridge Gate, four trays a night for the first three Saturdays,
 * the whole generator bill off the cushion — and then Saturday 4, a crowd of 78, the biggest
 * night of the market, offering *0 trays*, *0 is all your stock line pays for*, and no control
 * anywhere on the screen that could move the $110 in the cushion or the $200 in their own cut
 * back into stock. No warning came before it. They sold nothing.
 *
 * The stock line divides by $60 and the crowds do not, so ending the third Saturday with less
 * than one tray's worth of stock is not a strange plan — it is what cooking close to the crowd
 * produces. And nothing in this world's fiction ever said the cash in the box could not buy
 * food: Ramos Foods delivers on the Saturday morning and takes money. The rule the student hit
 * was a rule of the model, not of the market, and it took the biggest night away from them
 * without ever having been stated.
 *
 * So the last Saturday's order can name a line to pay for what the stock line will not, and
 * every dollar it moves comes off the end of the run. These tests hold both halves: the way
 * out exists, and it costs exactly what it says it costs.
 */

const BILL = N.generator.replacement - N.generator.deposit;

/** Cam's run: the plan, the three Saturdays, and the bill taken off the cushion. */
function camsRun(over: Partial<LedgerInput> = {}): LedgerInput {
  const opening: PopUpPlan = { stock: dollars(770), cushion: dollars(300), cut: dollars(200) };
  const base: LedgerInput = {
    spotId: "bridge-gate",
    counted: { catering: false, rebate: false },
    opening,
    openingSaved: true,
    coverLine: "cushion",
    foodLine: null,
    trays: { first: 4, middle: 4, last: 6 },
    helper: true,
    repair: null,
    ...over,
  };
  const held = popUpLedger(base, N).held;
  return { ...base, repair: { ...held, cushion: dollars(held.cushion - BILL) } };
}

describe("the last Saturday is not a room with no door", () => {
  it("reproduces the state the red team was stranded in", () => {
    // The screen they photographed, in the ledger's own numbers: $50 on the stock line, $110
    // in the cushion, $200 in their cut, and a crowd of 78 walking past a truck cooking
    // nothing. Everything below is measured against this.
    const ledger = popUpLedger(camsRun(), N);
    expect(ledger.afterRepair).toEqual({ stock: dollars(50), cushion: dollars(110), cut: dollars(200) });
    expect(ledger.afterRepair.stock).toBeLessThan(N.trayCost);
    expect(sellCap(N, "bridge-gate", 4, true)).toBe(78);
    expect(ledger.saturdays.find((day) => day.saturday === 4)?.cooked).toBe(0);
  });

  it("lets the order name a line to pay for what the stock line will not", () => {
    const stranded = popUpLedger(camsRun(), N);
    const rescued = popUpLedger(camsRun({ foodLine: "cut" }), N);
    const last = rescued.saturdays.find((day) => day.saturday === 4);
    expect(last?.cooked, "the truck still opens with nothing on it").toBeGreaterThan(0);
    expect(rescued.takings).toBeGreaterThan(stranded.takings);
  });

  it("charges every dollar of it to the line the student named", () => {
    // The whole point of the exit being a decision rather than a repair: it is their own pay,
    // and what they spend on food is what they do not bank.
    const rescued = popUpLedger(camsRun({ foodLine: "cut" }), N);
    const last = rescued.saturdays.find((day) => day.saturday === 4)!;
    const cost = last.trays * N.trayCost;
    expect(rescued.banked).toBe(dollars(200 - (cost - 50)));
    expect(rescued.banked).toBeLessThan(dollars(200));
    // And the cushion, which they did not name, is untouched by it.
    expect(rescued.afterRepair.cushion).toBe(dollars(110));
  });

  it("never reaches past the stock line on any Saturday but the last", () => {
    // Saturdays 1 to 3 each have a Saturday after them to answer a small order with, and the
    // opening plan is only a plan if the money it puts on a line stays there. The exit exists
    // because the fourth Saturday has nothing after it, so it is the fourth Saturday's alone.
    const thin: LedgerInput = {
      spotId: "middle-row",
      counted: { catering: false, rebate: false },
      opening: { stock: dollars(50), cushion: dollars(1260), cut: dollars(200) },
      openingSaved: true,
      coverLine: "cushion",
      foodLine: "cushion",
      trays: { first: 6, middle: 6, last: 0 },
      helper: false,
      repair: null,
    };
    const ledger = popUpLedger(thin, N);
    for (const saturday of [1, 2, 3] as const) {
      expect(ledger.saturdays.find((day) => day.saturday === saturday)?.cooked, `Saturday ${saturday}`).toBe(0);
    }
    expect(ledger.held.cushion, "an earlier Saturday spent the cushion").toBe(dollars(1260));
  });

  it("cannot cook more than the stock line and the named line hold between them", () => {
    // The exit is a door, not a printing press. Six trays wanted, $250 on the two lines: four.
    const spend = payForTrays(N, { stock: dollars(50), cushion: dollars(110), cut: dollars(200) }, 6, "cut");
    expect(spend.trays).toBe(4);
    expect(spend.fromStock).toBe(dollars(50));
    expect(spend.fromLine).toBe(dollars(190));
    expect(spend.left).toEqual({ stock: dollars(0), cushion: dollars(110), cut: dollars(10) });
  });

  it("says out loud, at the settle-up, that the cut went into the food", () => {
    const verdicts = resolveMarket(camsRun({ foodLine: "cut" }), N).verdicts;
    const cut = verdicts.find((entry) => entry.id === "cut")!;
    expect(cut.outcome).toBe("fell_short");
    expect(cut.detail).toContain("went back into the market");
  });

  it("leaves a run that names no line exactly where it was", () => {
    // The exit is offered, not taken for them. A student who says "only the stock line" gets
    // the market they had, and the ending still tells them the truth about it.
    const stranded = resolveMarket(camsRun(), N).verdicts;
    expect(stranded.find((entry) => entry.id === "stock")?.outcome).toBe("fell_short");
    expect(stranded.find((entry) => entry.id === "repair")?.outcome).toBe("cost_you");
  });

  it("prices a whole season the same way the live ledger does", () => {
    // `economy.ts` resolves a season for the balance harness and `ledger.ts` resolves one for
    // the screens. They are two functions and they have to agree about this, or a sweep would
    // be pricing a market no student can play.
    const choices: PopUpChoices = {
      spotId: "bridge-gate",
      countCatering: false,
      countRebate: false,
      plan: { stock: dollars(770), cushion: dollars(300), cut: dollars(200) },
      trays: { first: 4, middle: 4, last: 6 },
      helper: true,
      coverLine: "cushion",
      repairOrder: ["cushion", "stock", "cut"],
      foodLine: "cut",
    };
    const season = resolveSeason(N, choices);
    const ledger = popUpLedger(camsRun({ foodLine: "cut" }), N);
    expect(season.plates.sold).toBe(ledger.plates.sold);
    expect(season.banked).toBe(ledger.banked);
    expect(season.takings).toBe(ledger.takings);
  });

  it("changes nothing at all for a season that names no line", () => {
    // The sweep in `balance.ts` builds its strategies without one, so the whole published
    // strategy space has to be exactly the space it was before this existed.
    const base: PopUpChoices = {
      spotId: "middle-row",
      countCatering: false,
      countRebate: false,
      plan: { stock: dollars(700), cushion: dollars(610), cut: dollars(200) },
      trays: { first: 3, middle: 4, last: 4 },
      helper: false,
      coverLine: "cushion",
      repairOrder: ["cushion", "stock", "cut"],
    };
    // Everything but the echo of the choices themselves, which now carries the field.
    const outcomeOf = (choices: PopUpChoices) => {
      const outcome: Partial<ReturnType<typeof resolveSeason>> = { ...resolveSeason(N, choices) };
      delete outcome.choices;
      return outcome;
    };
    for (const line of [null] as (PopUpLineId | null)[]) {
      expect(outcomeOf({ ...base, foodLine: line })).toEqual(outcomeOf(base));
    }
    // …and with the field left off altogether, which is how `balance.ts` builds every one of
    // the strategies it sweeps.
    expect(outcomeOf(base)).toEqual(outcomeOf({ ...base }));
  });
});
