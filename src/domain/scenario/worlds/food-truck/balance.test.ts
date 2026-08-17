import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POP_UP_NUMBERS } from "./numbers";
import { analyseBalance, formatBalanceReport, PRIORITY_IDS, weightSimplex } from "./balance";

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
    const text = formatBalanceReport(report);
    expect(text).toContain("Best run under each set of priorities");
    if (process.env.BALANCE_REPORT) writeFileSync(process.env.BALANCE_REPORT, `${text}\n`);
  });
});
