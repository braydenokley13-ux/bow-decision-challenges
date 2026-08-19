import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POP_UP_NUMBERS } from "./numbers";
import {
  analyseBalance, analyseLastSaturdayRange, formatBalanceReport, formatRangeReport,
  PRIORITY_IDS, weightSimplex,
} from "./balance";
import { crowdOn, crowdTold } from "./economy";
import type { PopUpNumbers, SaturdayNumber, SpotId } from "./types";

/**
 * The publication gate on Run the Pop-Up's numbers.
 *
 * A challenge with a right answer is not a decision challenge, and the way a right answer gets
 * in is never by decision — it gets in when somebody re-prices one number and nothing notices.
 * These assertions fail the build if a change to `numbers.ts` ever produces a booth nobody
 * would rent, a stocking plan everybody should use, or a hire that is right whatever the
 * student is trying to do.
 *
 * Run `BALANCE_REPORT=popup-balance.txt npx vitest run` on this file to read the whole sweep
 * while tuning.
 */
describe("the market contains real decisions", () => {
  const report = analyseBalance(POP_UP_NUMBERS);

  it("sweeps a meaningful space of reachable end states", () => {
    expect(report.totalStates).toBeGreaterThan(500);
    expect(report.viableStates).toBeGreaterThan(0);
  });

  it("has no option that is rational for nobody", () => {
    expect(report.deadOptions.map((verdict) => `${verdict.dimension}/${verdict.option}`)).toEqual([]);
  });

  it("has no option that is right no matter what the student is trying to do", () => {
    expect(report.alwaysRight.map((verdict) => `${verdict.dimension}/${verdict.option}`)).toEqual([]);
  });

  it("sends students with different priorities to materially different runs", () => {
    expect(report.distinctWinners).toBeGreaterThan(1);
  });

  it("makes every booth spot the right call for somebody", () => {
    const spots = report.verdicts.filter((verdict) => verdict.dimension === "booth spot");
    expect(spots).toHaveLength(3);
    for (const option of spots) {
      expect(option.competitiveUnder.length, `${option.option} is a live choice for nobody`).toBeGreaterThan(0);
    }
  });

  it("leaves no spot beaten on money, on the cut and on plates at the same time", () => {
    // Every booth has to be the best in this world at something. A spot that is not is a decoy,
    // and a decoy on the first real screen teaches a student that reading carefully was a waste
    // of their time.
    expect(report.dominatedSpots).toEqual([]);
  });

  it("gives every option a real share of the whole space of priorities", () => {
    // The four named profiles are a coarse sample and linear preferences only ever pick
    // vertices, so the real gate sweeps every weighting of the three things a student could
    // care about. Nothing may be unwinnable, and nothing may sweep the board.
    for (const entry of report.sweep) {
      expect(entry.share, `${entry.dimension}: nobody would ever ${entry.option}`).toBeGreaterThan(0.02);
      expect(entry.share, `${entry.dimension}: ${entry.option} is close to a right answer`).toBeLessThan(0.95);
    }
  });

  it("leaves both sides of every either-or call live", () => {
    for (const dimension of ["the last Saturday", "the sell-out rebate", "the extra tray", "your cut"]) {
      const options = report.verdicts.filter((verdict) => verdict.dimension === dimension);
      expect(options, dimension).toHaveLength(2);
      for (const option of options) {
        expect(option.competitiveUnder.length, `${dimension}: nobody would ${option.option}`).toBeGreaterThan(0);
      }
      expect(
        report.alwaysRight.some((verdict) => verdict.dimension === dimension),
        `${dimension} has a right answer in it`,
      ).toBe(false);
    }
  });

  it("knows the one call that genuinely costs nothing, and says so rather than hiding it", () => {
    // Writing the organiser's rebate into the plan and leaving it out reach exactly the same
    // ceiling under every priority for a run whose stock was never limited by cash — the money
    // arrives either way, and all that differs is which line it was sitting on. It is a real
    // indifference, not a right answer, and the distinction is why `alwaysRight` is a claim
    // about strict dominance rather than about who wins the tie-break.
    //
    // It is not indifferent everywhere: counting it puts the money to work from the first
    // Saturday, and the sweep gives that a real share of the simplex. This test pins the
    // reading so nobody later "fixes" a tie by tilting the world to break it.
    const [counted, without] = report.verdicts.filter((verdict) => verdict.dimension === "the sell-out rebate");
    expect(counted && without).toBeTruthy();
    const tied = PRIORITY_IDS.filter((priority) => counted!.ceiling[priority] === without!.ceiling[priority]);
    expect(tied.length, "the two rebate answers no longer tie anywhere").toBeGreaterThan(0);
    const countedShare = report.sweep.find((entry) => entry.option === "count it into the plan")!.share;
    expect(countedShare, "counting the rebate never pays off anywhere").toBeGreaterThan(0.02);
  });

  it("leaves every line the generator money could come out of live", () => {
    // The repair is the moment the world is about, and which line pays for it is the decision.
    // A world where the answer is always "the cushion" has no repair in it, only a formality.
    const lines = report.verdicts.filter((verdict) => verdict.dimension === "the generator money");
    expect(lines).toHaveLength(3);
    for (const option of lines) {
      expect(option.competitiveUnder.length, `nobody would take it ${option.option}`).toBeGreaterThan(0);
    }
  });

  it("makes spoilage a real trade-off rather than a mistake or a strategy", () => {
    // Trays do not divide evenly into a crowd, so the tray that carries you past what the spot
    // will take sells a few more plates and bins the rest. It has to be worth it sometimes and
    // not others: never worth it makes waste a mistake nobody would make, and always worth it
    // makes the world's own constraint decorative.
    const winners = weightSimplex().length;
    expect(report.bestPlansThatSpoil).toBeGreaterThan(winners * 0.05);
    expect(report.bestPlansThatSpoil).toBeLessThan(winners * 0.95);
  });

  it("writes the sweep out when asked", () => {
    const text = `${formatBalanceReport(report)}\n\n${formatRangeReport(analyseLastSaturdayRange(POP_UP_NUMBERS))}`;
    expect(text).toContain("Best run under each set of priorities");
    expect(text).toContain("What the band asks, booth by booth");
    if (process.env.BALANCE_REPORT) writeFileSync(process.env.BALANCE_REPORT, `${text}\n`);
  });
});

/**
 * The second gate, and the one the stated range made necessary.
 *
 * The sweep above asks whether any *option* is right whatever a student is trying to do. It
 * cannot see the range at all, and that is the point: it is worked out entirely from the night
 * the market actually plays, so a night the student was told about as a band is swept exactly
 * as it was when it was printed as a figure. The first test below is that claim, checked
 * rather than asserted.
 *
 * What the sweep cannot answer is whether the band is a question. A range with one best answer
 * across its whole width is a number wearing a costume — worse than the number it replaced,
 * because it looks like a judgement and marks like an answer key, and a rubric row reading
 * "did you give something up before you knew?" would be reading a child's arithmetic again.
 * These are the assertions that fail the build if that ever happens.
 */
describe("the night the market will not price still asks something", () => {
  const range = analyseLastSaturdayRange(POP_UP_NUMBERS);
  const swept = analyseBalance(POP_UP_NUMBERS);

  it("changes what the student is told and nothing about what replays", () => {
    // The same numbers with every band struck out. If a single figure in the whole sweep moves,
    // the range has leaked into the world instead of staying in what the student was told.
    const withoutBands: PopUpNumbers = {
      ...POP_UP_NUMBERS,
      nights: Object.fromEntries(
        Object.entries(POP_UP_NUMBERS.nights).map(([night, numbers]) => [night, { pull: numbers.pull }]),
      ) as PopUpNumbers["nights"],
    };
    expect(analyseBalance(withoutBands)).toEqual(swept);
    // And the realised crowd is untouched at every booth on every night, which is the same
    // claim one layer down and the one `determinism.test.ts` builds its replay on.
    for (const spotId of Object.keys(POP_UP_NUMBERS.spots) as SpotId[]) {
      for (const night of [1, 2, 3, 4] as SaturdayNumber[]) {
        expect(crowdOn(POP_UP_NUMBERS, spotId, night)).toBe(crowdOn(withoutBands, spotId, night));
      }
    }
  });

  it("states exactly one night as a band, and it is the last one", () => {
    // Three stated nights are what make the fourth readable as a range rather than as a market
    // that has stopped explaining itself, and they are what keep the planning-inside-known-money
    // competency this world exists to assess intact. If a later pass wants a second band it can
    // have one, but not by accident.
    expect(range.ranged).toEqual([POP_UP_NUMBERS.saturdays]);
  });

  it("lands inside the band it stated, away from both edges", () => {
    // A night that resolves outside what the student was told is a lie; a night that resolves
    // on an edge tells them where to aim without saying so, which is the printed number back
    // again with extra steps.
    for (const spotId of Object.keys(POP_UP_NUMBERS.spots) as SpotId[]) {
      const told = crowdTold(POP_UP_NUMBERS, spotId, POP_UP_NUMBERS.saturdays);
      const lands = crowdOn(POP_UP_NUMBERS, spotId, POP_UP_NUMBERS.saturdays);
      expect(told.range, spotId).toBe(true);
      expect(lands, `${spotId}: ${told.low}-${told.high} lands ${lands}`).toBeGreaterThan(told.low);
      expect(lands, `${spotId}: ${told.low}-${told.high} lands ${lands}`).toBeLessThan(told.high);
    }
    expect(range.edged.map((verdict) => `${verdict.spotId}/helper=${verdict.helper}`)).toEqual([]);
  });

  it("gives some student a band wide enough to have to decide inside", () => {
    // A world where every band is closed by somebody's window has stated a range and asked
    // nothing, which is the whole finding wearing a different hat.
    expect(range.facingARange.length).toBeGreaterThan(0);
  });

  it("has no band with one right answer across its whole width", () => {
    // The gate. Enumerate every order the truck could cook against every crowd the organiser
    // said was possible: if one order wins at all of them, a student who reasoned and a student
    // who always cooks the same thing land in the same place.
    expect(range.collapsed.map((verdict) => `${verdict.spotId}/helper=${verdict.helper}`)).toEqual([]);
    for (const verdict of range.facingARange) {
      expect(verdict.liveOrders.length, `${verdict.spotId}/helper=${verdict.helper}`).toBeGreaterThan(1);
    }
  });

  it("rewards no single reading of the band everywhere", () => {
    // "Always cook for the middle" being right every time would be a rule to be taught rather
    // than a call to make, and it would be worth more marks than the reasoning.
    expect(range.alwaysRightReadings).toEqual([]);
  });

  it("makes both mistakes cost something real", () => {
    // A band whose two ends differ by pennies is a decision nobody needs to think about. Both
    // ways of being wrong have to be worth at least a tray of food.
    for (const verdict of range.facingARange) {
      const where = `${verdict.spotId}/helper=${verdict.helper}`;
      expect(verdict.costOfCookingHigh, `${where}: cooking for the top costs nothing`).toBeGreaterThanOrEqual(POP_UP_NUMBERS.trayCost);
      expect(verdict.costOfCookingLow, `${where}: cooking for the bottom costs nothing`).toBeGreaterThanOrEqual(POP_UP_NUMBERS.trayCost);
    }
  });
});
