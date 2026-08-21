import { describe, expect, it } from "vitest";
import { observeCompetencies } from "../competency/observe";
import type { EvidenceRequirementObservation, EvidenceRequirementId, RubricLevel } from "../competency/types";
import { runChallenge, type RunOptions } from "../../test/runChallenge";
import { runPopUp, type PopUpRunOptions } from "../../test/runPopUp";
import { observeBasketballFromLog } from "../scenario/worlds/basketball/observer";
import { observePopUpFromLog } from "../scenario/worlds/food-truck/observer";
import { ledgerOf } from "../scenario/worlds/food-truck/machine";

/**
 * The headline promise, guarded: **BOW reads the reasoning, not the ending.**
 *
 * Every page of this product tells a teacher that what it measured is how a student thought,
 * and that a season that went badly is not a student who planned badly. That claim was true
 * — an adversarial audit drove four whole runs through the real reducers and proved it — and
 * it was guarded by nothing. No test in the repository would have failed if a refactor had
 * let the money reach the rubric.
 *
 * That is the defect this file exists to prevent, and it is worth being precise about what it
 * would look like, because it does not look like a crash. It looks like a scorer that quietly
 * starts reading `finalPoints`, or a `week5Change` that leaks into a level, or somebody
 * "improving" the savings route by asking how much is on the course line rather than where the
 * figure came from. Every one of those ships green, and what a teacher then reads is a child
 * marked down for an ending the product itself chose for them — which is the single claim BOW
 * cannot survive being caught in front of a district.
 *
 * The design is a 2×2 and it has to stay a 2×2. One axis is the reasoning; the other is the
 * money it ended on. The written explanation is byte-identical in all four runs and is left
 * unmarked in all four, so the only thing that varies between any two cells is what the
 * machine read off the decisions:
 *
 * |                     | good ending                       | bad ending                        |
 * | ---                 | ---                               | ---                               |
 * | **good reasoning**  | (a) course funded, bonus counted  | (b) course $1,200 short, bonus out |
 * | **poor reasoning**  | (c) same good ending as (a)       | (d) same bad ending as (b)        |
 *
 * (a) = (b) and (c) = (d) is the invariant. (a) ≠ (c) is what stops that invariant from being
 * satisfied by a scorer that has stopped saying anything at all.
 */

/** The reading a teacher gets, as the flat map they would compare two students on. */
function levelsOf(observations: readonly EvidenceRequirementObservation[]): Partial<Record<EvidenceRequirementId, RubricLevel | null>> {
  return Object.fromEntries(observations.map((observation) => [observation.evidenceRequirementId, observation.level]));
}

/** The same reading rolled up the way the spine rolls it: one state per competency. */
function statesOf(observations: readonly EvidenceRequirementObservation[]): Record<string, string> {
  return Object.fromEntries(observeCompetencies(observations).map((result) => [result.competencyId, result.state]));
}

/**
 * One sentence, in all four runs of both worlds.
 *
 * Held constant on purpose. The written explanation is the half of the evidence a person
 * scores, and if it moved between cells then a difference in the maps would have two possible
 * causes and this file could not tell them apart.
 */
const DEFENCE = "My plan still works because every dollar has a job after Week 5. I protected the course money and gave up part of the reserve.";
const WRITE_UP = "I kept the cushion at $350 because the generator is rented and rented things break. That meant a smaller cut for me, and I would do it again.";

// ── Plan Under Pressure ────────────────────────────────────────────────────────────────

/**
 * Savings named rather than left over, and Week 3's cash spent as far as it reaches with a
 * reason that is true of what it did not cover.
 */
const REASONED: RunOptions = {
  closeOpeningInto: "flexibleCash",
  week3Funded: ["away-travel", "sister-present"],
  week3Reason: "can-wait",
  countCompletion: false,
  countOutcome: false,
  defenseText: DEFENCE,
};

/**
 * The same run with the reasoning taken out of it: the course line takes whatever the other
 * two rows left, and none of Week 3's three claims is funded at all.
 *
 * Counting both conditional payments is in here because the audit's poor run counted them, and
 * it is worth recording that it is **not** what makes this run read as weaker: this world lets
 * a student count a bonus as long as they build the fallback the board then demands, and this
 * run builds it. Only the leftover savings and the unfunded week move a level. That is the
 * point of the file restated from the other side — the reading follows the reasoning.
 */
const UNREASONED: RunOptions = {
  closeOpeningInto: "goal",
  week3Funded: [],
  week3Reason: "can-wait",
  countCompletion: true,
  countOutcome: true,
  defenseText: DEFENCE,
};

/** Every dollar the course line can take, and the attendance bonus counted in the final plan. */
const GOOD_SEASON: RunOptions = { split: { goal: 1, reserve: 0 }, countCompletionFinal: true };

/** Nothing on the course line — $1,200 short of the seat — and the attendance bonus lost. */
const BAD_SEASON: RunOptions = { split: { goal: 0, reserve: 0.5 }, countCompletionFinal: false };

const basketball = (options: RunOptions) => runChallenge(options);
const basketballLevels = (options: RunOptions) => levelsOf(observeBasketballFromLog(basketball(options).log));

// ── Run the Pop-Up ─────────────────────────────────────────────────────────────────────

/** The cut set by the student, the last of the money sent to stock, and the tips jar settled. */
const P_REASONED: PopUpRunOptions = {
  closeOpeningInto: "stock",
  tipClaims: ["cool-box"],
  tipReason: "only-wanted",
  countCatering: false,
  countRebate: false,
  writeUpText: WRITE_UP,
};

/**
 * The same three faults the other world's poor run has, in this world's vocabulary: both
 * conditional payments counted with no line named to give them back, the student's own cut
 * left to be whatever the arithmetic said, and the tips jar walked away from unfunded.
 */
const P_UNREASONED: PopUpRunOptions = {
  closeOpeningInto: "cut",
  tipClaims: [],
  tipReason: "only-wanted",
  countCatering: true,
  countRebate: true,
  coverLine: null,
  writeUpText: WRITE_UP,
};

/** The busiest pitch with a helper on it: 145 plates sold, 5 binned. */
const P_GOOD_SEASON: PopUpRunOptions = { spotId: "bridge-gate", bookHelper: true };

/** The quietest pitch, alone: 94 plates sold and 56 cooked for nobody. */
const P_BAD_SEASON: PopUpRunOptions = { spotId: "back-lane", bookHelper: false };

const popUpLevels = (options: PopUpRunOptions) => levelsOf(observePopUpFromLog(runPopUp(options).log));

describe("a bad ending does not lower a good plan's reading", () => {
  it("reads Plan Under Pressure identically whether the season paid out or did not", () => {
    const good = basketballLevels({ seatCode: "11", ...REASONED, ...GOOD_SEASON });
    const bad = basketballLevels({ seatCode: "12", ...REASONED, ...BAD_SEASON });
    expect(bad, "the economic ending moved a level in Plan Under Pressure").toEqual(good);
  });

  it("reads Run the Pop-Up identically whether the market was kind or was not", () => {
    const good = popUpLevels({ seatCode: "11", ...P_REASONED, ...P_GOOD_SEASON });
    const bad = popUpLevels({ seatCode: "12", ...P_REASONED, ...P_BAD_SEASON });
    expect(bad, "the season's takings moved a level in Run the Pop-Up").toEqual(good);
  });

  it("does not let the ending rescue a poor plan either", () => {
    // The other half of neutrality, and the half a scorer that had started reading the money
    // would fail first: if the ending could raise a level, the run that ends well would read
    // better than the identical run that ends badly.
    expect(basketballLevels({ seatCode: "13", ...UNREASONED, ...GOOD_SEASON }))
      .toEqual(basketballLevels({ seatCode: "14", ...UNREASONED, ...BAD_SEASON }));
    expect(popUpLevels({ seatCode: "13", ...P_UNREASONED, ...P_GOOD_SEASON }))
      .toEqual(popUpLevels({ seatCode: "14", ...P_UNREASONED, ...P_BAD_SEASON }));
  });

  it("rolls up to the same competency states, not merely to the same levels", () => {
    // A level map that survives the ending is worth nothing if the roll-up above it does not.
    // This is the sentence a teacher actually reads, so it is asserted rather than assumed.
    const good = observeBasketballFromLog(basketball({ seatCode: "15", ...REASONED, ...GOOD_SEASON }).log);
    const bad = observeBasketballFromLog(basketball({ seatCode: "16", ...REASONED, ...BAD_SEASON }).log);
    expect(statesOf(bad)).toEqual(statesOf(good));
    expect(Object.values(statesOf(good)), "every competency landed somewhere").not.toContain(undefined);
  });
});

describe("the two endings really were different endings", () => {
  /**
   * The load-bearing half of the file, and the reason it cannot pass by accident.
   *
   * "Identical maps" is trivially true of two identical runs. If `split` or `countCompletionFinal`
   * ever stopped reaching the board — a renamed option, a default that swallows it — the four
   * assertions above would go on passing while measuring nothing at all. So the endings are
   * asserted to differ, in the same figures a student would see on their own screen.
   */
  it("ends Plan Under Pressure $1,200 short of the course in one run and fully paid in the other", () => {
    const finalPlan = (options: RunOptions) =>
      basketball(options).snapshots.filter((snapshot) => snapshot.inputs.mode === "final").at(-1)?.inputs;
    const good = finalPlan({ seatCode: "11", ...REASONED, ...GOOD_SEASON });
    const bad = finalPlan({ seatCode: "12", ...REASONED, ...BAD_SEASON });
    expect(good?.amounts.goal, "the course line took the full price").toBe(1200);
    expect(bad?.amounts.goal, "the course line took nothing at all").toBe(0);
    expect(good?.includeCompletion, "the attendance bonus was counted").toBe(true);
    expect(bad?.includeCompletion, "the attendance bonus was lost").toBe(false);
  });

  it("ends Run the Pop-Up with a full stall in one run and 56 plates in the bin in the other", () => {
    const good = ledgerOf(runPopUp({ seatCode: "11", ...P_REASONED, ...P_GOOD_SEASON }));
    const bad = ledgerOf(runPopUp({ seatCode: "12", ...P_REASONED, ...P_BAD_SEASON }));
    expect(good.takings).toBe(1740);
    expect(bad.takings).toBe(1128);
    expect(good.plates.spoiled).toBe(5);
    expect(bad.plates.spoiled).toBe(56);
    expect(bad.takings, "the bad season was genuinely worse").toBeLessThan(good.takings);
  });
});

describe("the reading is not empty, and it does move on the reasoning", () => {
  /**
   * Anti-vacuity. A change that made every run produce an empty map, or a map of nothing but
   * `null`, would satisfy every equality above. Both are refused here.
   */
  it("says something about every requirement of every competency the world claims", () => {
    for (const [world, levels] of [
      ["Plan Under Pressure", basketballLevels({ seatCode: "11", ...REASONED, ...GOOD_SEASON })],
      ["Run the Pop-Up", popUpLevels({ seatCode: "11", ...P_REASONED, ...P_GOOD_SEASON })],
    ] as const) {
      const entries = Object.entries(levels);
      expect(entries.length, `${world} observed nothing at all`).toBeGreaterThanOrEqual(14);
      expect(entries.filter(([, level]) => level !== null).length, `${world} observed only absences`).toBeGreaterThanOrEqual(11);
      // The three that are `null` in every run of both worlds are the written explanations, and
      // they are `null` because nobody has read them — which is the correct amount to say and
      // is `null` rather than a zero on purpose. §10.6.
      expect(Object.keys(levels).filter((id) => levels[id as EvidenceRequirementId] === null).sort())
        .toEqual(["adapt-a-plan.er5", "plan-within-income.er5", "sort-by-need-want-goal.er4"]);
    }
  });

  it("reads the poor plan differently from the good one, in both worlds", () => {
    const good = basketballLevels({ seatCode: "11", ...REASONED, ...GOOD_SEASON });
    const poor = basketballLevels({ seatCode: "13", ...UNREASONED, ...GOOD_SEASON });
    expect(poor, "the reasoning stopped reaching the reading").not.toEqual(good);
    // Named rather than merely different, so that "differs" cannot be satisfied by drift on
    // some unrelated row. Savings taken as leftovers, and a week where nothing was funded.
    expect(good["plan-within-income.er3"]).toBe(5);
    expect(poor["plan-within-income.er3"]).toBe(0);
    expect(good["sort-by-need-want-goal.er1"]).toBe(5);
    expect(poor["sort-by-need-want-goal.er1"]).toBe(0);

    const pGood = popUpLevels({ seatCode: "11", ...P_REASONED, ...P_GOOD_SEASON });
    const pPoor = popUpLevels({ seatCode: "13", ...P_UNREASONED, ...P_GOOD_SEASON });
    expect(pPoor).not.toEqual(pGood);
    // Conditional money counted with nothing named to give it back, and the cut left over.
    expect(pPoor["plan-within-income.er1"]).toBe(0);
    expect(pPoor["plan-within-income.er3"]).toBe(0);
    expect(pPoor["sort-by-need-want-goal.er1"]).toBe(0);
  });

  it("keeps the two accounts apart: the good plan that ended badly still reads better than the poor plan that ended well", () => {
    // The sentence in the product's own words, as one assertion. This is the comparison a
    // teacher makes without knowing they are making it, and it is the one that has to survive.
    const goodPlanBadEnding = basketballLevels({ seatCode: "12", ...REASONED, ...BAD_SEASON });
    const poorPlanGoodEnding = basketballLevels({ seatCode: "13", ...UNREASONED, ...GOOD_SEASON });
    expect(goodPlanBadEnding["plan-within-income.er3"]).toBe(5);
    expect(poorPlanGoodEnding["plan-within-income.er3"]).toBe(0);
    expect(goodPlanBadEnding["sort-by-need-want-goal.er1"]).toBe(5);
    expect(poorPlanGoodEnding["sort-by-need-want-goal.er1"]).toBe(0);
  });
});
