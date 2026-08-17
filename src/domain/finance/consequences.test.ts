import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { planConsequences } from "./consequences";
import { blocksBoughtBy } from "./load";
import type { PlanMode, SnapshotInputs } from "./types";

function inputs(mode: PlanMode, over: Partial<SnapshotInputs> = {}): SnapshotInputs {
  return {
    mode,
    amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
    includeCompletion: false,
    includeOutcome: false,
    includeOptionalWork: false,
    setupId: "cousin-room",
    week5Applied: mode === "week5-first-response" || mode === "final" || mode === "remaining-risk",
    depositTaken: false,
    numbersVersion: N.version,
    ...over,
  };
}

/**
 * These lines sit under the three amounts a student moves, and they are the only thing on
 * the board that answers "so what?" while the money is still moving. They are therefore
 * held to the same rule as everything else on screen: derived from the model that resolves
 * the season, priced by the scenario, and silent about what the student ought to do.
 */
describe("what each row currently buys", () => {
  it("names the exact shortfall against the price this plan is actually facing", () => {
    const short = planConsequences(inputs("working", { amounts: { goal: dollars(400), reserve: dollars(0), flexibleCash: dollars(0) } }), N);
    expect(short.goal).toContain(String(N.course.fullPrice - 400));
    const covered = planConsequences(inputs("working", { amounts: { goal: N.course.fullPrice, reserve: dollars(0), flexibleCash: dollars(0) } }), N);
    expect(covered.goal).toMatch(/Enough to pay/);
  });

  it("stops asking for course money once the seat is paid for", () => {
    const held = planConsequences(inputs("final", { depositTaken: true }), N);
    expect(held.goal).toMatch(/seat is held/i);
  });

  /**
   * The reserve line says what the plan in front of the student is counting on, which is
   * not what they once ticked. The backup version and the no-bonus check are priced with
   * no conditional money in them at all, so a line claiming the reserve "covers the bonus
   * this plan is counting on" would be describing a different plan than the one on screen.
   */
  it("describes the exposure this mode actually carries, not the box the student ticked", () => {
    const counting = planConsequences(inputs("final", { includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(200), flexibleCash: dollars(0) } }), N);
    expect(counting.reserve).toContain(String(N.completionIncome));

    for (const mode of ["fallback", "remaining-risk"] as const) {
      const noBonus = planConsequences(inputs(mode, { includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(200), flexibleCash: dollars(0) } }), N);
      expect(noBonus.reserve, mode).not.toContain(String(N.completionIncome));
      expect(noBonus.reserve, mode).toMatch(/kept aside/);
    }
  });

  it("says nothing is put by when nothing is, in every mode", () => {
    for (const mode of ["working", "fallback", "week5-first-response", "final", "remaining-risk"] as const) {
      expect(planConsequences(inputs(mode), N).reserve, mode).toMatch(/Nothing kept back/);
    }
  });

  it("counts hours bought back with the same function the season resolves against", () => {
    const spend = dollars(N.load.blockBuybackCost * 3);
    const line = planConsequences(inputs("final", { amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: spend } }), N);
    expect(blocksBoughtBy(spend, N)).toBe(3);
    expect(line.flexibleCash).toContain("3 hour");
    expect(planConsequences(inputs("final"), N).flexibleCash).toMatch(/Nothing paid for rides/);
  });

  it("reads one hour as an hour", () => {
    const line = planConsequences(inputs("final", { amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: N.load.blockBuybackCost } }), N);
    expect(line.flexibleCash).toContain("1 hour a week");
  });

  /**
   * The three rows are scored by no micro-skill, and the balance harness proves no split
   * dominates — so nothing here may push a student toward one. A line that said "put more
   * here" would be the product answering its own question.
   */
  it("never tells a student what to do with a row", () => {
    const everyLine = (["working", "fallback", "week5-first-response", "final", "remaining-risk"] as const).flatMap((mode) =>
      [dollars(0), dollars(500), dollars(1200)].flatMap((amount) =>
        Object.values(planConsequences(inputs(mode, { includeCompletion: true, amounts: { goal: amount, reserve: amount, flexibleCash: amount } }), N)),
      ));
    for (const line of everyLine) {
      expect(line).not.toMatch(/\byou should\b|\bbetter\b|\bbest\b|\brecommend|\btry to\b|\bought to\b|\bmake sure\b/i);
    }
  });
});
