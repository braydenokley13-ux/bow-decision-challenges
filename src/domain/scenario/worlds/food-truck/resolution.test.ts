import { describe, expect, it } from "vitest";
import { formatDollars } from "../../../core/money";
import { runPopUp, type PopUpRunOptions } from "../../../../test/runPopUp";
import { analyseBalance } from "./balance";
import { crowdOn, playSaturday, sellCap } from "./economy";
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
