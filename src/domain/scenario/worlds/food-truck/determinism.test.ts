import { describe, expect, it } from "vitest";
import { observeCompetencies } from "../../../competency/observe";
import { runPopUp, type PopUpRunOptions } from "../../../../test/runPopUp";
import { analyseBalance } from "./balance";
import { playSaturday, resolveSeason, sellCap } from "./economy";
import { ledgerOf } from "./machine";
import { POP_UP_NUMBERS as N } from "./numbers";
import { observePopUpFromLog } from "./observer";
import type { SpotId } from "./types";

/**
 * The same decisions, the same market, every time.
 *
 * §10.1: decision evidence is derived by deterministic rules from the event log — no AI, no
 * heuristics, no scoring model. That is a claim about the observer, and it is worth nothing if
 * the *world* is not deterministic too: a Saturday that resolved differently on two runs would
 * make the evidence about it incomparable between two students, and there would be no honest
 * way to tell a child why their plan did not work.
 *
 * Nothing in this world reads a clock, a random number, or anything outside the student's own
 * choices. These tests are how that stays true.
 */

const OPTION_SETS: readonly PopUpRunOptions[] = [
  {},
  { spotId: "back-lane", trays: { first: 2, middle: 2, last: 3 }, closeOpeningInto: "cut" },
  { spotId: "bridge-gate", bookHelper: true, countRebate: true, coverLine: "stock", trays: { first: 4, middle: 5, last: 8 } },
  { countCatering: true, coverLine: null, repairOrder: ["cut"], fumbleSums: ["swap-gap"] },
  { trays: { first: 5, middle: 8, last: 0 }, cushionShare: 0, reachForCommitted: 3 },
];

describe("the same actions produce the same market", () => {
  it.each(OPTION_SETS.map((options, index) => [index, options] as const))(
    "writes an identical log twice for run %i",
    (_index, options) => {
      const first = runPopUp(options);
      const second = runPopUp(options);
      expect(second.log).toEqual(first.log);
      expect(second.stage).toBe(first.stage);
      expect(second.snapshots).toEqual(first.snapshots);
    },
  );

  it("is not merely repeating a cached answer — different decisions give different logs", () => {
    // A determinism test that would also pass for a function returning a constant proves
    // nothing. These two runs differ in exactly one decision and the market answers differently.
    const cheap = runPopUp({ spotId: "back-lane" });
    const dear = runPopUp({ spotId: "bridge-gate" });
    expect(dear.log).not.toEqual(cheap.log);
    expect(ledgerOf(dear).plates.sold).not.toBe(ledgerOf(cheap).plates.sold);
  });

  it("observes the same evidence from the same log, however many times it is read", () => {
    for (const options of OPTION_SETS) {
      const log = runPopUp(options).log;
      expect(observePopUpFromLog(log)).toEqual(observePopUpFromLog(log));
      expect(observeCompetencies(observePopUpFromLog(log)))
        .toEqual(observeCompetencies(observePopUpFromLog(log)));
    }
  });

  it("observes the same evidence from two logs of the same run", () => {
    // The stronger version: not the same log read twice, but two runs of the same decisions.
    for (const options of OPTION_SETS) {
      expect(observePopUpFromLog(runPopUp(options).log)).toEqual(observePopUpFromLog(runPopUp(options).log));
    }
  });

  it("does not depend on the clock the actions arrived on", () => {
    // Ordering comes from `sequence`, never from the timestamp. A student who took an hour
    // over the plan and one who took four minutes made the same decisions and are owed the
    // same reading of them.
    const quick = runPopUp({ startedAt: 1_600_000_000_000 });
    const slow = runPopUp({ startedAt: 1_900_000_000_123 });
    const withoutClock = (log: typeof quick.log) => log.map((event) => ({ ...event, timestamp: 0 }));
    expect(withoutClock(slow.log)).toEqual(withoutClock(quick.log));
    expect(observePopUpFromLog(slow.log)).toEqual(observePopUpFromLog(quick.log));
  });

  it("resolves a Saturday from the spot, the trays and the window, and nothing else", () => {
    for (const spotId of Object.keys(N.spots) as SpotId[]) {
      for (const trays of [0, 3, 9]) {
        const once = playSaturday(N, spotId, 4, trays, true);
        const again = playSaturday(N, spotId, 4, trays, true);
        expect(again).toEqual(once);
        expect(once.sold).toBe(Math.min(trays * N.platesPerTray, sellCap(N, spotId, 4, true)));
        expect(once.spoiled).toBe(trays * N.platesPerTray - once.sold);
      }
    }
  });

  it("resolves a whole season the same way twice", () => {
    const choices = {
      spotId: "middle-row" as SpotId,
      countCatering: true,
      countRebate: true,
      plan: { stock: N.startCash, cushion: N.permit, cut: N.permit },
      trays: { first: 3, middle: 4, last: 5 },
      helper: true,
      coverLine: "cushion" as const,
      repairOrder: ["cushion", "stock", "cut"] as const,
    };
    expect(resolveSeason(N, choices)).toEqual(resolveSeason(N, choices));
  });

  it("sweeps the same strategy space twice", () => {
    // The publication gate has to be reproducible too, or "no option wins under every set of
    // priorities" is a claim about one run of a program rather than about the world.
    const first = analyseBalance(N);
    const second = analyseBalance(N);
    expect(second.sweep).toEqual(first.sweep);
    expect(second.totalStates).toBe(first.totalStates);
    expect(second.dominatedSpots).toEqual(first.dominatedSpots);
    // Two full sweeps of ~168,000 states. It clears five seconds on an idle machine and does
    // not when the rest of the suite is running beside it, which was a flake rather than a
    // finding — the assertion is unchanged and only the clock it is given moved.
  }, 30_000);
});
