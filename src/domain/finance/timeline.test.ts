import { describe, expect, it } from "vitest";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { weeksBeforeDisruption } from "../scenario/season";
import { dollars } from "../core/money";
import { depositPreview, seasonLedger } from "./timeline";
import type { SetupId } from "../core/ids";

const SETUPS = Object.keys(N.setupCosts) as SetupId[];

describe("the season ledger", () => {
  it("pays out exactly the contract over the full season", () => {
    for (const setupId of SETUPS) {
      const final = seasonLedger(setupId, N.weeks, N).at(-1)!;
      expect(final.received).toBe(dollars(N.savings + N.basePay));
      expect(final.paid).toBe(dollars(N.setupCosts[setupId] + N.essentialsTotal));
    }
  });

  it("never lets the running total drift from the weekly amounts", () => {
    for (const setupId of SETUPS) {
      const weeks = seasonLedger(setupId, N.weeks, N);
      const setupPaid = weeks.reduce((sum, week) => sum + week.setupThisWeek, 0);
      const essentialsPaid = weeks.reduce((sum, week) => sum + week.essentialsThisWeek, 0);
      expect(setupPaid).toBe(N.setupCosts[setupId]);
      expect(essentialsPaid).toBe(N.essentialsTotal);
    }
  });

  it("drains a costlier place faster than a cheaper one", () => {
    const throughWeek = weeksBeforeDisruption(N).length;
    const byCost = [...SETUPS].sort((a, b) => N.setupCosts[a] - N.setupCosts[b]);
    const inHand = byCost.map((setupId) => seasonLedger(setupId, throughWeek, N).at(-1)!.inHand);
    // Cheapest first, so what is left in hand must fall as the places get dearer.
    for (let index = 1; index < inHand.length; index += 1) {
      expect(inHand[index]!).toBeLessThan(inHand[index - 1]!);
    }
  });

  it("costs the student's own time at the rate their housing charges", () => {
    const throughWeek = weeksBeforeDisruption(N).length;
    for (const setupId of SETUPS) {
      const final = seasonLedger(setupId, throughWeek, N).at(-1)!;
      expect(final.hoursToDate).toBe(N.load.commuteBlocks[setupId] * throughWeek);
    }
  });

  it("leaves Avery solvent through the played weeks whatever the student chose", () => {
    // Money arriving must keep ahead of money leaving before the turn, or the challenge
    // would be over before the student made a single Week 5 decision.
    for (const setupId of SETUPS) {
      for (const week of seasonLedger(setupId, N.weeks, N)) expect(week.inHand).toBeGreaterThan(0);
    }
  });

  it("stops at the season's last week however far it is asked to run", () => {
    expect(seasonLedger("cousin-room", N.weeks + 40, N)).toHaveLength(N.weeks);
    expect(seasonLedger("cousin-room", -3, N)).toHaveLength(0);
  });
});

describe("the course deposit preview", () => {
  it("reports the discount the early price actually buys", () => {
    const preview = depositPreview(dollars(0), N);
    expect(preview.saving).toBe(dollars(N.course.fullPrice - N.course.depositPrice));
    expect(preview.price).toBeLessThan(preview.laterPrice);
  });

  it("says how far under a plan that set nothing aside would be", () => {
    expect(depositPreview(dollars(0), N).shortBy).toBe(N.course.depositPrice);
    expect(depositPreview(dollars(0), N).freed).toBe(dollars(0));
  });

  it("says how much comes back when more was set aside than the seat costs", () => {
    const over = dollars(N.course.depositPrice + 200);
    expect(depositPreview(over, N).shortBy).toBe(dollars(0));
    expect(depositPreview(over, N).freed).toBe(dollars(200));
  });

  it("is neither short nor spare when the course row holds exactly the seat price", () => {
    const exact = depositPreview(N.course.depositPrice, N);
    expect(exact.shortBy).toBe(dollars(0));
    expect(exact.freed).toBe(dollars(0));
  });
});
