import { describe, expect, it } from "vitest";
import { POP_UP_SCENARIO } from "./scenario";
import { POP_UP_NUMBERS as N } from "./numbers";
import { enumerateOutcomes } from "./balance";
import { swapBill } from "./economy";

/**
 * Where the money you have taken at the window is, and whether the world says so in time.
 *
 * Takings accumulate outside the three lines and land in one lump when the organiser settles
 * up, so the generator bill can only be met from the plan. That is a defensible rule — it is
 * how a market with a central till actually pays its stalls, it is what makes a cushion mean
 * anything, and `economy.ts` sets out at length why letting the takings through would end the
 * repair beat rather than improve it.
 *
 * What was not defensible was that the rule was nowhere on any screen. An economics review
 * played the market until the generator closed a truck holding **$1,296** of takings it had
 * been shown, night by night, and found **726** reachable end states doing the same thing —
 * **519** of them to a student who had planned trays for the last Saturday. The breakdown
 * screen listed what could move and what was already spent, and the biggest number on the
 * student's own screen appeared on neither list.
 *
 * So this file holds the world to the two things that make the rule a consequence rather than
 * a trap: it has to be **stated before the plan is written**, and it has to be **true** — no
 * truck may close while its own plan lines could have paid.
 */
describe("the takings are the organiser's until the settle-up, and the world says so", () => {
  it("says it on the plan board, where the cushion is being set", () => {
    // Before, not after. The whole finding is that a rule which arrives at the crisis is a
    // trap, and the same rule stated while the money is being divided is a decision.
    const lead = POP_UP_SCENARIO.screens.plan.lead;
    expect(lead).toMatch(/organiser/i);
    expect(lead).toMatch(/four saturdays end/i);
    expect(lead.toLowerCase()).toContain("window");
  });

  it("names the takings on the screen that lists what the repair can reach", () => {
    // The student has just been shown three Saturdays of takings. A list of what is reachable
    // that does not mention them is the omission this test exists for.
    expect(POP_UP_SCENARIO.breakdown.locked).toMatch(/took at the window/i);
    expect(POP_UP_SCENARIO.breakdown.locked).toMatch(/until the market ends/i);
  });

  it("never closes a truck whose own plan lines could have paid the bill", () => {
    // The other half: the rule the copy now states has to be the rule the economy runs. Every
    // closed truck must be a plan that could not cover the swap out of the money it still
    // held — never one where reachable money was ignored.
    const bill = swapBill(N);
    const closed = enumerateOutcomes(N).filter((outcome) => !outcome.season.lastSaturdayRan);
    expect(closed.length, "no run loses the last Saturday at all, so this rule stopped biting").toBeGreaterThan(0);
    const withMoneyOnTheLines = closed.filter((outcome) => outcome.season.freeable >= bill);
    expect(withMoneyOnTheLines.map((outcome) => JSON.stringify(outcome.strategy))).toEqual([]);
  });

  it("still makes the last Saturday something a plan can lose", () => {
    // The consequence has to remain reachable, or the beat the whole world is built around
    // has quietly become decorative. It is a small share of the space and it is not zero.
    const outcomes = enumerateOutcomes(N);
    const closed = outcomes.filter((outcome) => !outcome.season.lastSaturdayRan);
    expect(closed.length / outcomes.length).toBeGreaterThan(0.001);
    expect(closed.length / outcomes.length).toBeLessThan(0.05);
  });
});
