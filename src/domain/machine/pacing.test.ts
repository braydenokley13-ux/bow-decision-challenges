import { describe, expect, it } from "vitest";
import { budgetFor, LONGEST_PATH, SHORTEST_PATH, STAGE_BUDGET } from "./pacing";
import { PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";
import { STAGE_ORDER } from "./stages";

const MINUTE = 60;

/**
 * What this file does and does not claim.
 *
 * It checks the **design budget** — what the interactions on each stage add up to. It is
 * not evidence about how long a real student takes, and no test in this repository can be:
 * that takes middle-schoolers, a classroom and a clock. The pilot-readiness gate that
 * depends on them stays open until they exist.
 *
 * What it does buy is that the budget cannot drift without somebody noticing. Duration
 * decays a paragraph at a time — one screen gains an explanation, another gains a
 * confirmation, and between them the challenge stops fitting a lesson. Adding that minute
 * now means writing it into `STAGE_BUDGET`, and writing down more than the band allows
 * fails the build.
 */
describe("the challenge is designed to fit the lesson it claims to fit", () => {
  it("budgets every stage a student actually passes through", () => {
    for (const stage of LONGEST_PATH) {
      expect(STAGE_BUDGET[stage], stage).toBeDefined();
      expect(STAGE_BUDGET[stage]!.seconds, stage).toBeGreaterThan(0);
      expect(STAGE_BUDGET[stage]!.basis.length, stage).toBeGreaterThan(20);
    }
  });

  it("budgets nothing a student never sees", () => {
    // Stages the reducer routes past — the world picker, the retired income check — must
    // not carry a budget, or the total quietly counts screens nobody opens.
    const budgeted = Object.keys(STAGE_BUDGET);
    for (const stage of budgeted) expect(STAGE_ORDER, stage).toContain(stage);
    expect(budgeted.filter((stage) => !LONGEST_PATH.includes(stage as never))).toEqual([]);
  });

  /**
   * The budget aims below the middle of the advertised band, because a real student is slower
   * than a budget: they hesitate, re-read, change their mind and talk to the person next to
   * them.
   *
   * The band was 20–25 and this ceiling was 21 minutes, and both numbers were wrong in the
   * same direction for the same reason: nothing in the repository counted the words on a
   * screen, so a stage could declare 165 seconds while rendering 491 words and no test could
   * tell. `stages/readingLoad.test.tsx` counts them now, `working-plan`, `week8-resolution`
   * and `submitted` have been re-declared against what they actually render, and the picker —
   * a screen every student passes through — has a budget for the first time. The longest route
   * costs 23m20s, the advertised band moved to 22–30 to match, and this ceiling is the middle
   * of that band rather than a number the table used to fit under.
   */
  it("lands the longest route inside the band with room for a real student to hesitate", () => {
    const longest = budgetFor(LONGEST_PATH);
    expect(longest).toBeGreaterThanOrEqual(15 * MINUTE);
    expect(longest).toBeLessThanOrEqual(26 * MINUTE);
  });

  it("keeps the shortest route meaningfully shorter, without making it a different lesson", () => {
    const [longest, shortest] = [budgetFor(LONGEST_PATH), budgetFor(SHORTEST_PATH)];
    expect(longest - shortest).toBeGreaterThanOrEqual(60);
    expect(shortest).toBeGreaterThanOrEqual(13 * MINUTE);
  });

  /**
   * No single stage may own a quarter of the run. The two that come closest are the first
   * plan and the written explanation, and both are the point of the exercise — but a third
   * screen growing to that size is the shape the repetition problem took last time.
   */
  it("lets no single stage eat a quarter of the run", () => {
    const longest = budgetFor(LONGEST_PATH);
    for (const stage of LONGEST_PATH) {
      expect(STAGE_BUDGET[stage]!.seconds / longest, stage).toBeLessThan(0.25);
    }
  });

  /**
   * The registry tells educators how long to allow. If the budget and the advertised
   * duration disagree, one of them is lying to somebody planning a lesson around it.
   */
  it("agrees with the duration the challenge advertises to educators", () => {
    const { min, max } = PLAN_UNDER_PRESSURE.duration;
    const longest = budgetFor(LONGEST_PATH) / MINUTE;
    const shortest = budgetFor(SHORTEST_PATH) / MINUTE;
    // Both routes have to sit under the top of the advertised band, and the longest has to
    // be close enough to it that the band is not advertising a challenge twice this size.
    expect(longest).toBeLessThanOrEqual(max);
    expect(shortest).toBeLessThanOrEqual(max);
    expect(longest).toBeGreaterThanOrEqual(min - 5);
  });
});
