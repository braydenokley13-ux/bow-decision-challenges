import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCENARIO_NUMBERS } from "./numbers";
import { analyseBalance, formatBalanceReport, PRIORITY_IDS } from "./balance";

/**
 * The publication gate on the scenario's numbers.
 *
 * A challenge with a right answer is not a decision challenge. These assertions fail the
 * build if re-pricing the model ever produces an option nobody would pick or an option
 * everybody would. Run `npm run balance` to read the full sweep.
 */
describe("the challenge contains real decisions", () => {
  const report = analyseBalance(SCENARIO_NUMBERS);

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

  it("sends students with different priorities to materially different plans", () => {
    expect(report.distinctWinners).toBeGreaterThan(1);
  });

  it("makes every housing option the right call for somebody", () => {
    const housing = report.verdicts.filter((verdict) => verdict.dimension === "housing");
    for (const option of housing) {
      expect(option.competitiveUnder.length, `${option.option} is a live choice for nobody`).toBeGreaterThan(0);
    }
  });

  it("leaves no housing option beaten on money and on Avery's week at the same time", () => {
    expect(report.dominatedHousing).toEqual([]);
  });

  it("gives every option a real share of the whole space of priorities", () => {
    // The four named profiles are a coarse sample and linear preferences only ever pick
    // vertices, so the real gate sweeps every weighting of the four things a student
    // could care about. Nothing may be unwinnable, and nothing may sweep the board.
    for (const entry of report.sweep) {
      expect(entry.share, `${entry.dimension}: nobody would ever ${entry.option}`).toBeGreaterThan(0.02);
      expect(entry.share, `${entry.dimension}: ${entry.option} is close to a right answer`).toBeLessThan(0.95);
    }
  });

  it("leaves both sides of every binary call live", () => {
    for (const dimension of ["course deposit", "Saturday clinics", "attendance bonus", "buying time back"]) {
      const options = report.verdicts.filter((verdict) => verdict.dimension === dimension);
      expect(options).toHaveLength(2);
      for (const option of options) {
        expect(option.competitiveUnder.length, `${dimension}: nobody would ${option.option}`).toBeGreaterThan(0);
      }
      // And neither side may sweep every priority.
      for (const option of options) {
        expect(option.bestUnder.length, `${dimension}: ${option.option} is always right`).toBeLessThan(PRIORITY_IDS.length);
      }
    }
  });

  it("writes the sweep out when asked", () => {
    const text = formatBalanceReport(report);
    expect(text).toContain("Best plan under each set of priorities");
    // `npm run balance` sets this, so the whole sweep can be read while tuning.
    if (process.env.BALANCE_REPORT) writeFileSync(process.env.BALANCE_REPORT, `${text}\n`);
  });
});
