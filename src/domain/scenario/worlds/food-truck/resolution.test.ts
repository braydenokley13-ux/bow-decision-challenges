import { describe, expect, it } from "vitest";
import { dollars, formatDollars } from "../../../core/money";
import { runPopUp, type PopUpRunOptions } from "../../../../test/runPopUp";
import { analyseBalance } from "./balance";
import { crowdOn, playSaturday, sellCap } from "./economy";
import { popUpLedger, type LedgerInput } from "./ledger";
import { createPopUpState, ledgerInputFor, ledgerOf, popUpReducer } from "./machine";
import { POP_UP_NUMBERS as N } from "./numbers";
import { resolveMarket, type MarketVerdict } from "./resolution";
import { POP_UP_SCENARIO } from "./scenario";
import type { SaturdayNumber, SpotId } from "./types";

const SPOTS = Object.keys(N.spots) as SpotId[];
const SATURDAYS: SaturdayNumber[] = [1, 2, 3, 4];

/** Any dollar figure a student can read. */
const ANY_MONEY = /\$[\d,]+/;
/** A dollar figure other than $0 — what "money changed hands" looks like on the page. */
const MONEY_MOVED = /\$(?!0\b)[1-9][\d,]*/;

function verdictsFor(options: PopUpRunOptions = {}) {
  return resolveMarket(ledgerInputFor(runPopUp(options))).verdicts;
}

function verdict(verdicts: readonly MarketVerdict[], id: MarketVerdict["id"]): MarketVerdict {
  const found = verdicts.find((entry) => entry.id === id);
  expect(found, `no ${id} verdict`).toBeDefined();
  return found!;
}

/**
 * Four Saturdays, four different nights.
 *
 * The defect this file exists against: `crowdOn` returned the spot's ordinary crowd for
 * Saturdays 1, 2 and 3, so the standing order that covered two of them was one question
 * wearing two dates, and the generator screen printed two byte-identical result cards. The
 * fiction described weather that moved no number.
 */
describe("no two Saturdays are the same night", () => {
  it.each(SPOTS)("gives %s four different crowds", (spotId) => {
    const crowds = SATURDAYS.map((saturday) => crowdOn(N, spotId, saturday));
    expect(new Set(crowds).size, `${spotId}: ${crowds.join("/")}`).toBe(SATURDAYS.length);
  });

  it("never lets the two nights one order covers take the same number of plates", () => {
    // The charge, exactly: Saturdays 2 and 3 were the same decision twice, because the world
    // had two demand states and both of those nights sat in the first one. One standing order
    // still covers both, and there is now no booth and no window at which they agree.
    for (const spotId of SPOTS) {
      for (const helper of [false, true]) {
        expect(sellCap(N, spotId, 2, helper), `${spotId} helper=${helper}`)
          .not.toBe(sellCap(N, spotId, 3, helper));
      }
    }
  });

  it("writes two different nights into the log where it used to write one twice", () => {
    // Reproduced before the fix at the middle row: SATURDAY 2 and SATURDAY 3 printed
    // 40 cooked / 38 sold / 2 binned / $456, byte for byte, from one order.
    const played = runPopUp().log.filter((event) => event.type === "POPUP_SATURDAY_PLAYED");
    expect(played).toHaveLength(N.saturdays);
    const shapeOf = (saturday: SaturdayNumber) => {
      const event = played.find((entry) => (entry.payload as { saturday?: number }).saturday === saturday);
      const payload = { ...(event!.payload as Record<string, unknown>) };
      delete payload.saturday;
      return JSON.stringify(payload);
    };
    expect(shapeOf(2)).not.toBe(shapeOf(3));
  });

  it("makes one order for two unequal nights a trade rather than a sum", () => {
    // The standing order covers Saturdays 2 and 3 and cannot satisfy both. Whatever is cooked,
    // either food goes in the bin on the thin night or the crowd on the busy one goes unfed —
    // which is the sentence this world prints about itself and did not used to mean.
    for (const spotId of SPOTS) {
      for (const helper of [false, true]) {
        const busiest = Math.max(sellCap(N, spotId, 2, helper), sellCap(N, spotId, 3, helper));
        for (let trays = 0; trays <= Math.ceil(busiest / N.platesPerTray) + 1; trays += 1) {
          const nights = ([2, 3] as SaturdayNumber[]).map((saturday) => {
            const night = playSaturday(N, spotId, saturday, trays, helper);
            return { spoiled: night.spoiled, unfed: sellCap(N, spotId, saturday, helper) - night.sold };
          });
          const binned = nights.reduce((total, night) => total + night.spoiled, 0);
          const unfed = nights.reduce((total, night) => total + night.unfed, 0);
          expect(binned + unfed, `${spotId} ${trays} trays costs nothing either way`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("still contains no strategy that is right whatever the student wants", () => {
    // The publication gate, restated where the change that could break it lives. Re-pricing a
    // night is re-pricing the world, and the sweep is what says the world still has a decision
    // in it rather than an answer key.
    const report = analyseBalance(N);
    expect(report.alwaysRight.map((entry) => `${entry.dimension}/${entry.option}`)).toEqual([]);
    expect(report.deadOptions.map((entry) => `${entry.dimension}/${entry.option}`)).toEqual([]);
    expect(report.dominatedSpots).toEqual([]);
  }, 30_000);
});

describe("the ending says what each call actually did", () => {
  it("names only decisions the student actually faced", () => {
    // A run that stopped before the generator never stood at the repair board, and a verdict
    // on a question nobody was asked is a verdict about nothing.
    const stopped = resolveMarket(ledgerInputFor(runPopUp({ stopAfterSaturdayThree: true })));
    expect(stopped.verdicts.map((entry) => entry.id)).not.toContain("repair");

    // Before Marisol is answered there is no answer to judge.
    let state = createPopUpState(1);
    for (const action of [
      { type: "SESSION_STARTED", sessionId: "session-1", classCode: "H4KVW", seatCode: "1" },
      { type: "POPUP_SPOT_SELECTED", spotId: "middle-row" },
    ] as const) state = popUpReducer(state, action);
    expect(resolveMarket(ledgerInputFor(state)).verdicts.map((entry) => entry.id)).not.toContain("helper");

    // And a complete run faces every one of them.
    expect(verdictsFor().map((entry) => entry.id).sort())
      .toEqual(["booth", "conditional", "cut", "helper", "repair", "stock"]);
  });

  it("puts a name and a number on every verdict, and never leaves a blank in one", () => {
    for (const options of [{}, { spotId: "back-lane" as SpotId, bookHelper: true }, { countCatering: true }]) {
      for (const entry of verdictsFor(options)) {
        expect(entry.label.length, entry.id).toBeGreaterThan(3);
        expect(entry.detail, entry.id).not.toMatch(/[{}]/);
        expect(entry.detail.trim().endsWith("."), `${entry.id}: ${entry.detail}`).toBe(true);
      }
    }
  });

  it("never heads a verdict with a word its own detail contradicts", () => {
    // The defect the other world shipped and this one must not: NO EFFECT printed over a
    // sentence reporting that the student paid $200 more. A student who reads one of those
    // learns to stop reading the headings.
    const runs: PopUpRunOptions[] = [
      {},
      { bookHelper: true },
      { bookHelper: true, trays: { first: 0, middle: 0, last: 0 } },
      { spotId: "back-lane", trays: { first: 2, middle: 1, last: 3 } },
      { spotId: "bridge-gate", bookHelper: true, countRebate: true, trays: { first: 4, middle: 5, last: 8 } },
      { countCatering: true, coverLine: "stock" },
      { cushionShare: 0, repairOrder: ["stock"] },
      { trays: { first: 5, middle: 8, last: 0 }, cushionShare: 0, reachForCommitted: 2 },
    ];
    for (const options of runs) {
      for (const entry of verdictsFor(options)) {
        // Every verdict names the money, because the money is what happened.
        expect(entry.detail, `${entry.id} names no money at all: ${entry.detail}`).toMatch(ANY_MONEY);
        // And a verdict headed "No effect" names none of it moving.
        if (entry.outcome === "no_effect") {
          expect(entry.detail, `no_effect names money moving: ${entry.detail}`).not.toMatch(MONEY_MOVED);
        }
      }
    }
  });

  it("reads the run rather than a table of outcomes", () => {
    // Two runs that differ in one decision have to differ in what the ending says about it.
    // A verdict that reads the same for everybody is a template with a heading on it.
    const alone = verdict(verdictsFor({ bookHelper: false }), "helper");
    const booked = verdict(verdictsFor({ bookHelper: true }), "helper");
    expect(booked.detail).not.toBe(alone.detail);
    expect(booked.label).not.toBe(alone.label);

    const cheap = verdict(verdictsFor({ spotId: "back-lane" }), "booth");
    const dear = verdict(verdictsFor({ spotId: "bridge-gate" }), "booth");
    expect(dear.detail).not.toBe(cheap.detail);

    const thin = verdict(verdictsFor({ trays: { first: 1, middle: 1, last: 1 } }), "stock");
    const heavy = verdict(verdictsFor({ trays: { first: 6, middle: 6, last: 6 } }), "stock");
    expect(heavy.detail).not.toBe(thin.detail);
  });

  it("mentions the friend who worked a night with nothing to sell", () => {
    // The critique's own bad run: Marisol booked for $70, the stock line stripped to pay the
    // generator, and the last Saturday opened with nothing on the truck. The old ending never
    // mentioned her at all.
    const verdicts = verdictsFor({ bookHelper: true, trays: { first: 3, middle: 4, last: 0 } });
    const helper = verdict(verdicts, "helper");
    expect(helper.outcome).toBe("cost_you");
    expect(helper.detail).toContain("$70");
  });

  it("sorts the call that changed the run to the top", () => {
    const weight = { cost_you: 0, paid_off: 1, fell_short: 2, no_effect: 3 };
    for (const options of [{}, { bookHelper: true }, { countCatering: true }, { spotId: "bridge-gate" as SpotId }]) {
      const order = verdictsFor(options).map((entry) => weight[entry.outcome]);
      expect([...order].sort((a, b) => a - b), JSON.stringify(options)).toEqual(order);
    }
  });

  it("says the same thing about the same run, every time it is asked", () => {
    for (const options of [{}, { bookHelper: true, countRebate: true }, { spotId: "back-lane" as SpotId }]) {
      const once = resolveMarket(ledgerInputFor(runPopUp(options)));
      const again = resolveMarket(ledgerInputFor(runPopUp(options)));
      expect(again).toEqual(once);
    }
  });

  it("prices every counterfactual out of the same ledger the run was priced by", () => {
    // The booth verdict compares the student's own orders at the other two booths. The figures
    // it names are the ones the ledger produces there, not an estimate of them.
    const state = runPopUp({ spotId: "middle-row" });
    const ledger = ledgerOf(state);
    const booth = verdict(resolveMarket(ledgerInputFor(state)).verdicts, "booth");
    expect(booth.label).toContain(POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row")!.title);
    expect(booth.detail).toContain(formatDollars(N.spots["middle-row"].booth));
    const stock = verdict(resolveMarket(ledgerInputFor(state)).verdicts, "stock");
    expect(stock.detail).toContain(String(ledger.plates.sold));
  });
});

/**
 * The three sentences a student red team caught the ending saying about a run that went badly.
 *
 * All three were reproduced on the build they played, by hand, in a browser: a market at the
 * bridge gate whose stock line was down to $50 when the generator died, the whole $270 taken
 * off the cushion, and Saturday 4 — a crowd of 78, the biggest night of the run — cooked with
 * nothing. The ending called it **Paid off** twice and told the student no other standing
 * order beat theirs.
 *
 * Each `it` below fails on the reading that shipped. The first two are the headings; the third
 * is the claim underneath one of them, and it is the one worth stating plainly: a sentence
 * that says "nothing does better" has to have looked at everything, or it is a guess with a
 * child's name on it.
 */
describe("the ending does not congratulate a run for a market it never ran", () => {
  const BILL = N.generator.replacement - N.generator.deposit;

  /** One run, built straight out of decisions rather than out of the test harness's defaults. */
  function runOf(over: {
    spotId: SpotId;
    helper: boolean;
    stock: number;
    trays: { first: number; middle: number; last: number };
    /** Which line the whole generator bill comes off. */
    repairFrom: "cushion" | "stock";
  }): LedgerInput {
    const available = N.startCash - N.permit - N.spots[over.spotId].booth;
    const base: LedgerInput = {
      spotId: over.spotId,
      counted: { catering: false, rebate: false },
      opening: { stock: dollars(over.stock), cushion: dollars(available - over.stock), cut: dollars(0) },
      openingSaved: true,
      coverLine: "cushion",
      foodLine: null,
      trays: over.trays,
      helper: over.helper,
      repair: null,
    };
    const held = popUpLedger(base, N).held;
    const from = over.repairFrom;
    return { ...base, repair: { ...held, [from]: dollars(Math.max(0, held[from] - BILL)) } };
  }

  /** Takings minus what the food cost — the same measure the ending compares orders on. */
  function net(input: LedgerInput): number {
    const ledger = popUpLedger(input, N);
    return ledger.takings - ledger.saturdays.reduce((total, day) => total + day.trays, 0) * N.trayCost;
  }

  /**
   * The same run with a different standing order, with the repair carried across as what the
   * student *gave* rather than as three absolute figures.
   *
   * Restated here rather than imported so the test is a second opinion about the rule instead
   * of a second call to it. A counterfactual that keeps the absolute figures has the student
   * freeing whatever the arithmetic happens to leave, which in one direction buys no generator
   * at all and in the other strands money on a line nothing spends.
   */
  function withMiddle(input: LedgerInput, middle: number): LedgerInput {
    const repair = input.repair;
    if (!repair) return { ...input, trays: { ...input.trays, middle } };
    const gave = popUpLedger(input, N).held;
    const next = { ...input, trays: { ...input.trays, middle } };
    const there = popUpLedger({ ...next, repair: null }, N).held;
    const after = { ...there };
    for (const line of ["stock", "cushion", "cut"] as const) {
      after[line] = dollars(Math.max(0, there[line] - Math.max(0, gave[line] - repair[line])));
    }
    return { ...next, repair: after };
  }

  it("stops calling a swap that bought an empty night 'paid off'", () => {
    // Clever Cam's run, reconstructed from the numbers on his screenshot: $770 of stock at the
    // bridge gate, four trays a night for the first three Saturdays, $270 off the cushion. The
    // bill was cleared, so the old reading printed PAID OFF over the sentence "the last
    // Saturday ran and took $0" — a heading and its own detail contradicting each other on the
    // biggest crowd of the market.
    const cam = runOf({ spotId: "bridge-gate", helper: true, stock: 770, trays: { first: 4, middle: 4, last: 6 }, repairFrom: "cushion" });
    const ledger = popUpLedger(cam, N);
    expect(ledger.saturdays.find((day) => day.saturday === 4)?.cooked, "the run under test cooked on the last night").toBe(0);
    expect(ledger.residual, "the bill was cleared, so this is not the shortfall branch").toBe(0);

    const repair = verdict(resolveMarket(cam, N).verdicts, "repair");
    expect(repair.outcome).toBe("cost_you");
    expect(repair.detail).toContain(formatDollars(dollars(0)));
    expect(repair.detail).not.toContain("The last Saturday ran and took");
  });

  it("never heads the swap 'paid off' on any run whose last Saturday cooked nothing", () => {
    // Not an edge case: swept across three booths and every stock line the board can hold,
    // thousands of reachable runs clear the bill and then open the truck with nothing on it.
    let checked = 0;
    for (const spotId of SPOTS) {
      for (let stock = 0; stock <= 1200; stock += 50) {
        const input = runOf({ spotId, helper: false, stock, trays: { first: 3, middle: 4, last: 6 }, repairFrom: "cushion" });
        const ledger = popUpLedger(input, N);
        if (ledger.residual > 0) continue;
        if ((ledger.saturdays.find((day) => day.saturday === 4)?.cooked ?? 0) > 0) continue;
        checked += 1;
        const repair = resolveMarket(input, N).verdicts.find((entry) => entry.id === "repair");
        expect(repair?.outcome, `${spotId} stock=$${stock}: ${repair?.detail}`).not.toBe("paid_off");
      }
    }
    expect(checked, "the sweep found no run with an empty last Saturday to check").toBeGreaterThan(3);
  });

  it("stops calling a run 'paid off' on what it cooked when a night opened empty", () => {
    // The other heading over the same run. "What you cooked — Paid off — 120 plates cooked,
    // 115 sold" is true of three Saturdays and silent about the fourth, and the fourth is the
    // one the student needed to hear about.
    const cam = runOf({ spotId: "bridge-gate", helper: true, stock: 770, trays: { first: 4, middle: 4, last: 6 }, repairFrom: "cushion" });
    const stock = verdict(resolveMarket(cam, N).verdicts, "stock");
    expect(stock.outcome).toBe("fell_short");
    expect(stock.detail).toContain("Saturday 4");
    expect(stock.detail).toContain(String(sellCap(N, "bridge-gate", 4, true)));
  });

  it("makes the claim that no other standing order does better true wherever it is printed", () => {
    // The strongest kind of false sentence the product could produce: a claim of optimality,
    // made to a child, about a run they cannot check. It was computed from one tray more and
    // one tray fewer and stated over every standing order there is.
    //
    // This sweeps the same space by hand and fails if the claim is ever printed over a run
    // some other standing order beats. It found 48 of them on the reading that shipped.
    const claim = "no other order for Saturdays 2 and 3";
    let printed = 0;
    for (const spotId of SPOTS) {
      for (const helper of [false, true]) {
        for (let stock = 0; stock <= 1200; stock += 50) {
          for (let middle = 0; middle <= 6; middle += 1) {
            const input = runOf({ spotId, helper, stock, trays: { first: 2, middle, last: 6 }, repairFrom: "cushion" });
            if (popUpLedger(input, N).residual > 0) continue;
            const stockVerdict = resolveMarket(input, N).verdicts.find((entry) => entry.id === "stock");
            if (!stockVerdict?.detail.includes(claim)) continue;
            printed += 1;
            const mine = net(input);
            for (let alt = 0; alt <= 16; alt += 1) {
              const other = net(withMiddle(input, alt));
              expect(other, `${spotId} helper=${helper} stock=$${stock} ${middle} trays: ${alt} trays takes $${other - mine} more`)
                .toBeLessThanOrEqual(mine);
            }
          }
        }
      }
    }
    expect(printed, "the claim is never printed, so this test proves nothing").toBeGreaterThan(20);
  }, 60_000);

  it("names the best other order there was, not the one next door to it", () => {
    // The other half of reading one tray either side. Where a neighbour *did* beat the
    // student's order, the ending printed that neighbour as the improvement — so a student who
    // cooked four trays a night at the back lane was told "3 trays, not 4, leaves you $120
    // better off" when two trays a night leaves them $168 better off. Understated advice is a
    // quieter failure than a false compliment and it is the same failure: a sentence that
    // sounds like it looked at everything and looked at two things.
    const input = runOf({ spotId: "back-lane", helper: false, stock: 600, trays: { first: 1, middle: 4, last: 2 }, repairFrom: "cushion" });
    const mine = net(input);
    const bestOf = (options: readonly number[]) => options.reduce((top, alt) => {
      const value = net(withMiddle(input, alt));
      return value > top.value ? { trays: alt, value } : top;
    }, { trays: 4, value: mine });
    const neighbour = bestOf([3, 5]);
    const whole = bestOf([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(whole.value, "this run no longer has a better order outside its neighbourhood").toBeGreaterThan(neighbour.value);

    const stock = verdict(resolveMarket(input, N).verdicts, "stock");
    expect(stock.detail).toContain(`${whole.trays} trays a night`);
    expect(stock.detail).toContain(formatDollars(dollars(whole.value - mine)));
    expect(stock.detail).not.toContain(`${neighbour.trays} trays a night`);
  });

  it("keeps the counterfactual honest about the repair it carries across", () => {
    // A saved repair board is three absolute figures. Copying them into a run that spent its
    // stock line differently made the counterfactual free a different amount than the student
    // actually freed — sometimes not enough to buy the generator at all, so the alternative
    // silently lost its whole last Saturday and the student's own order looked untouchable.
    // What travels is what they gave, line by line, so both runs buy the generator.
    const input = runOf({ spotId: "middle-row", helper: false, stock: 700, trays: { first: 3, middle: 3, last: 4 }, repairFrom: "stock" });
    const heavier = { ...input, trays: { ...input.trays, middle: 5 } };
    const naive = popUpLedger(heavier, N);
    expect(naive.residual, "the naive counterfactual loses the generator, which is the bug").toBeGreaterThan(0);
    // The ending's own comparison does not: it re-derives the repair from what was given.
    const stock = verdict(resolveMarket(input, N).verdicts, "stock");
    expect(stock.detail).not.toMatch(/[{}]/);
  });
});
