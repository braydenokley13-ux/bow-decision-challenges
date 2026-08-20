import { describe, expect, it } from "vitest";
import { crowdOn, playSaturday, serveCap } from "./economy";
import { POP_UP_NUMBERS } from "./numbers";
import { foldService, marketClock, serviceRun } from "./service";
import type { SaturdayNumber, SpotId } from "./types";

/**
 * The played night is the computed night.
 *
 * `serviceRun` exists to let a student watch a Saturday happen instead of reading its result,
 * and the single thing that could go wrong is the one that would matter most: an evening that
 * adds up to something kinder than `playSaturday`. Then the world would hold two accounts of
 * the same night — the one the student watched and the one the settle screen, the verdicts,
 * the evidence and the 174,339-state balance sweep are all worked out from.
 *
 * So this sweeps every booth, every Saturday, both helper states and every tray count a
 * student could reach, and requires the fold of the orders to reproduce the model exactly.
 */

const N = POP_UP_NUMBERS;
const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const SATURDAYS: readonly SaturdayNumber[] = [1, 2, 3, 4];

/** Every tray count reachable at any booth, plus a little past it. */
const TRAYS = Array.from({ length: 13 }, (_, index) => index);

describe("the night a student watches is the night the model computed", () => {
  it("sweeps something, so an empty loop cannot pass", () => {
    expect(SPOTS.length * SATURDAYS.length * TRAYS.length * 2).toBeGreaterThan(300);
  });

  for (const spot of SPOTS) {
    for (const saturday of SATURDAYS) {
      for (const helper of [false, true]) {
        it(`${spot} · Saturday ${saturday} · ${helper ? "with Marisol" : "alone"}`, () => {
          for (const trays of TRAYS) {
            const run = serviceRun(N, spot, saturday, trays, helper);
            const model = playSaturday(N, spot, saturday, trays, helper);
            const folded = foldService(run);
            const where = `${spot}/sat${saturday}/${trays} trays/${helper ? "helper" : "solo"}`;

            expect(folded.sold, `${where}: plates sold`).toBe(model.sold);
            expect(folded.takings, `${where}: takings`).toBe(model.takings);
            expect(run.cooked, `${where}: cooked`).toBe(model.cooked);

            // Everybody `crowdOn` says walked past is dealt with exactly once — nobody is
            // invented to pad the queue and nobody is quietly dropped to make it shorter.
            const dealtWith = run.orders.reduce((total, order) => total + order.wanted, 0);
            expect(dealtWith, `${where}: everyone accounted for`).toBe(crowdOn(N, spot, saturday));

            // The two ways to lose a sale, separated and summing to the whole loss.
            expect(
              folded.turnedAwayNoStock + folded.turnedAwayNoHands,
              `${where}: turned away`,
            ).toBe(crowdOn(N, spot, saturday) - model.sold);

            // A serve-cap loss can only exist where the crowd is over the cap, and it is
            // exactly the overflow. This is what makes hiring Marisol legible.
            const overflow = Math.max(0, crowdOn(N, spot, saturday) - serveCap(N, saturday, helper));
            expect(folded.turnedAwayNoHands, `${where}: beyond the window's reach`).toBe(overflow);

            // Plates left on the counter at close is what goes in the bin.
            const last = run.orders[run.orders.length - 1];
            if (last) expect(last.platesLeft, `${where}: plates left`).toBe(model.spoiled);
          }
        });
      }
    }
  }
});

describe("the run is honest about its own shape", () => {
  const run = serviceRun(N, "middle-row", 1, 4, false);

  it("never lets the till or the counter go backwards", () => {
    let till = 0;
    let plates = run.cooked;
    for (const order of run.orders) {
      expect(order.tillAfter).toBeGreaterThanOrEqual(till);
      expect(order.platesLeft).toBeLessThanOrEqual(plates);
      expect(order.platesLeft).toBeGreaterThanOrEqual(0);
      till = order.tillAfter;
      plates = order.platesLeft;
    }
  });

  it("numbers its tickets from one, in order, with no gaps", () => {
    expect(run.orders.map((order) => order.ticket)).toEqual(run.orders.map((_, index) => index + 1));
  });

  it("moves the clock forward across the evening and never past closing", () => {
    let minute = -1;
    for (const order of run.orders) {
      expect(order.minute).toBeGreaterThanOrEqual(minute);
      expect(order.minute).toBeLessThanOrEqual(run.minutes);
      minute = order.minute;
    }
  });

  it("replays identically, because a teacher reads this back", () => {
    expect(serviceRun(N, "middle-row", 1, 4, false)).toEqual(run);
  });

  it("opens at five and closes at ten", () => {
    expect(marketClock(0)).toBe("17:00");
    expect(marketClock(300)).toBe("22:00");
    expect(marketClock(150)).toBe("19:30");
  });
});

describe("the two ways to lose a sale are told apart", () => {
  it("blames the counter when the trays ran short", () => {
    // Middle row, Saturday 1: 38 walk past, one pair of hands can pass 45, so nothing is
    // beyond reach. Cook two trays and 18 people find a bare counter.
    const run = serviceRun(N, "middle-row", 1, 2, false);
    const folded = foldService(run);
    expect(folded.turnedAwayNoHands).toBe(0);
    expect(folded.turnedAwayNoStock).toBe(38 - 20);
    expect(run.orders.some((order) => order.outcome === "no-stock")).toBe(true);
  });

  it("blames the window when one pair of hands was the ceiling", () => {
    // Bridge gate, Saturday 2: 65 walk past and 45 is all one person can pass. Cook plenty —
    // twenty people were always going to leave, and the world never showed a student that.
    const run = serviceRun(N, "bridge-gate", 2, 10, false);
    const folded = foldService(run);
    expect(folded.turnedAwayNoHands).toBe(65 - 45);
    expect(folded.turnedAwayNoStock).toBe(0);
    expect(run.orders.some((order) => order.outcome === "no-hands")).toBe(true);
  });

  it("splits one order across both ceilings without mis-blaming either", () => {
    for (const spot of SPOTS) {
      for (const saturday of SATURDAYS) {
        for (const trays of TRAYS) {
          const run = serviceRun(N, spot, saturday, trays, false);
          for (const order of run.orders) {
            expect(order.reachable).toBeLessThanOrEqual(order.wanted);
            expect(order.served).toBeLessThanOrEqual(order.reachable);
          }
        }
      }
    }
  });
});
