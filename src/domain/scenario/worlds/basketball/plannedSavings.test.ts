import { describe, expect, it } from "vitest";
import { dollars } from "../../../core/money";
import { availableCompetencyIds, isCompetencyAvailable } from "../../../competency/availability";
import { observeCompetencies } from "../../../competency/observe";
import { requiredEvidenceRequirementsFor } from "../../../competency/competencies";
import type { ChallengeAction } from "../../../machine/actions";
import { challengeReducer } from "../../../machine/reducer";
import { createInitialState } from "../../../machine/state";
import { deriveFacts } from "../../../evidence/facts";
import { deriveResult } from "../../../evidence/result";
import type { CategoryId } from "../../../core/ids";
import { SCENARIO_NUMBERS } from "../../numbers";
import { assigned, availableFor, lockedFor } from "../../../finance/formulas";
import { BASKETBALL_EVIDENCE_ROUTES, observeBasketballFromLog } from "./observer";
import { seat14Log } from "../../../evidence/seat14.golden";

/**
 * `plan-within-income.er3` — savings is a planned amount, not what was left.
 *
 * This is the requirement the whole multiple-world thesis is meant to be proven on, and the
 * one Checkpoint 2 recorded as unproducible here. It is producible now because the board
 * gained a statement it did not have: closing the opening plan by naming the row that takes
 * the money still unassigned.
 *
 * What these tests are for is holding that statement to what it actually says. Three things
 * would each turn it back into a guess, and each has a test below:
 *
 * - awarding it to a student who never made the statement,
 * - reading the *size* of the course line instead of the statement, which would make one
 *   set of priorities the right answer in a scenario swept to prove none is,
 * - changing what an attempt saved before the control existed already means.
 */

const START = 1_760_000_000_000;

/** Everything before the opening board, priced so the three rows have real room. */
const UP_TO_THE_BOARD: readonly ChallengeAction[] = [
  { type: "SETUP_SELECTED", setupId: "teammate-share" },
  { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true },
];

/** What the three rows have to add up to on the opening board, from the numbers in force. */
function spendable(): number {
  const inputs = {
    mode: "working" as const,
    amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
    includeCompletion: false,
    includeOutcome: false,
    includeOptionalWork: false,
    setupId: "teammate-share" as const,
    week5Applied: false,
    depositTaken: false,
    numbersVersion: SCENARIO_NUMBERS.version,
  };
  return availableFor(inputs, SCENARIO_NUMBERS) - lockedFor(inputs, SCENARIO_NUMBERS);
}

interface OpeningPlan {
  /** What the student typed into each row before closing the plan. */
  typed: Partial<Record<CategoryId, number>>;
  /** The rows they sent the unassigned money to, in order. */
  closes: readonly CategoryId[];
  /** What they did after that, if anything — the steppers are still there. */
  then?: readonly ChallengeAction[];
  scaffold?: boolean;
}

/**
 * One opening plan, played through the shipping reducer.
 *
 * The amounts are computed rather than written down, so these runs stay correct if the
 * scenario is re-priced — the same rule `scenarioDriven.test.ts` holds the grader to. Each
 * close offers exactly what the board would offer, cap included, so a close onto the course
 * row can leave money still unassigned exactly as it does on screen.
 */
function opening({ typed, closes, then = [], scaffold }: OpeningPlan) {
  const amounts: Record<CategoryId, number> = { goal: 0, reserve: 0, flexibleCash: 0, ...typed };
  const actions: ChallengeAction[] = [...UP_TO_THE_BOARD];
  if (scaffold) actions.push({ type: "SCAFFOLD_OPENED", interactionId: "working" });
  for (const [category, amount] of Object.entries(amounts)) {
    if (amount > 0) actions.push({ type: "PLAN_AMOUNT_CHANGED", mode: "working", category: category as CategoryId, amount: dollars(amount) });
  }
  let left = spendable() - (amounts.goal + amounts.reserve + amounts.flexibleCash);
  for (const category of closes) {
    const headroom = category === "goal" ? Math.max(0, SCENARIO_NUMBERS.course.fullPrice - amounts[category]) : left;
    const give = Math.min(left, headroom);
    amounts[category] += give;
    left -= give;
    actions.push({ type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category, amount: dollars(give) });
  }
  actions.push(...then, { type: "PLAN_SAVE_REQUESTED", mode: "working" });
  return actions.reduce(challengeReducer, createInitialState(START)).log;
}

function er3(log: ReturnType<typeof opening>) {
  return observeBasketballFromLog(log).find((observation) => observation.evidenceRequirementId === "plan-within-income.er3");
}

/** The level after the engine has applied the support caps, which is the level a teacher sees. */
function standingEr3(log: ReturnType<typeof opening>) {
  return observeCompetencies(observeBasketballFromLog(log), { submitted: true })
    .find((result) => result.competencyId === "plan-within-income")
    ?.levels.find((level) => level.evidenceRequirementId === "plan-within-income.er3")?.level;
}

describe("savings is a planned amount, and only a statement can say so", () => {
  it("says nothing at all about a plan closed without the statement", () => {
    // The steppers still reach every amount, and a student who grinds all three to zero by
    // hand has told this world nothing about which line the arithmetic decided. `null` is
    // the honest answer and it is not a low one — §10.4 keeps it out of every roll-up.
    const log = opening({ typed: { goal: 1200, reserve: 400, flexibleCash: spendable() - 1600 }, closes: [] });
    expect(er3(log)?.level).toBeNull();
    expect(er3(log)?.evidenceRefs).toEqual(["not-observed:plan-remainder"]);
    expect(deriveFacts(log).remainderChoices).toEqual([]);
  });

  it("cannot be awarded from the amounts alone, however the plan is shaped", () => {
    // The three shapes a student could reach with no statement: everything on the course,
    // nothing on it, and an even split. None of them produces a level, because none of them
    // is evidence about how the figure got there.
    const shapes = [
      { goal: 1200, reserve: 0, flexibleCash: spendable() - 1200 },
      { goal: 0, reserve: 600, flexibleCash: spendable() - 600 },
      { goal: 800, reserve: 800, flexibleCash: spendable() - 1600 },
    ];
    for (const typed of shapes) {
      expect(er3(opening({ typed, closes: [] }))?.level, JSON.stringify(typed)).toBeNull();
    }
  });

  it("awards it when the student set the course line and let another row take the rest", () => {
    const log = opening({ typed: { goal: 1200, reserve: 300 }, closes: ["flexibleCash"] });
    expect(er3(log)?.level).toBe(5);
    expect(standingEr3(log)).toBe(5);
    expect(er3(log)?.evidenceRefs.length).toBe(1);
  });

  it("awards it the same way when the backup money takes the rest", () => {
    // The requirement is that the *savings* line was set, not that a particular other row
    // absorbed the leftovers. Sending them to the buffer is a different plan, not a
    // different level.
    expect(er3(opening({ typed: { goal: 900, flexibleCash: 400 }, closes: ["reserve"] }))?.level).toBe(5);
  });

  it("withholds it when the course line is what was left over", () => {
    // The misconception, exactly: the other rows were decided and the savings figure is the
    // arithmetic. The plan balances and it is not evidence of the skill.
    const log = opening({ typed: { reserve: 400, flexibleCash: spendable() - 1400 }, closes: ["goal"] });
    expect(er3(log)?.level).toBe(0);
    expect(standingEr3(log)).toBe(0);
    expect(er3(log)?.reason).toContain("what the arithmetic came to");
  });

  it("reads a student who took the leftovers back off the course line as self-corrected", () => {
    // §10.3's level 4: got it wrong, saw the raw state, fixed it with nothing on screen but
    // the board. The first close lands the last of the money on the course; the student then
    // pulls it back with the steppers and closes somewhere else.
    const rest = spendable() - 300 - 1000;
    const log = opening({
      typed: { reserve: 300, flexibleCash: 1000 },
      closes: ["goal"],
      then: [{ type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(0) }],
    });
    expect(rest).toBeLessThanOrEqual(SCENARIO_NUMBERS.course.fullPrice);
    const corrected = opening({
      typed: { reserve: 300, flexibleCash: 1000 },
      closes: ["goal"],
      then: [{ type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(0) }, { type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category: "flexibleCash", amount: dollars(rest) }],
    });
    // Without the second close the plan does not balance and nothing is claimed either way.
    expect(er3(log)?.level).toBe(0);
    expect(er3(corrected)?.level).toBe(4);
    expect(er3(corrected)?.evidenceRefs.length).toBe(2);
  });

  it("does not read hitting the course cap on the way past as savings taking the leftovers", () => {
    // The goal-first student: fund the course in full with one tap, then send what is
    // actually left to another row. The first move leaves money unassigned, so it is a
    // figure being placed rather than a line absorbing the remainder — scoring it as the
    // misconception would mark down the very behaviour the requirement is looking for.
    const log = opening({ typed: {}, closes: ["goal", "flexibleCash"] });
    const choices = deriveFacts(log).remainderChoices ?? [];
    expect(choices.map((choice) => choice.category)).toEqual(["goal", "flexibleCash"]);
    expect(choices[0]?.amount).toBe(SCENARIO_NUMBERS.course.fullPrice);
    expect(choices[0]?.remaining).toBeGreaterThan(0);
    expect(choices[1]?.remaining).toBe(0);
    expect(er3(log)?.level).toBe(5);
  });

  it("says nothing when the control was used but the plan was closed by hand", () => {
    // Money placed with the control and the last of it typed in. No row was ever named as
    // taking what was left, so there is no answer to record — and a guess would be one.
    const rest = spendable() - SCENARIO_NUMBERS.course.fullPrice;
    const log = opening({
      typed: {},
      closes: ["goal"],
      then: [{ type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(rest) }],
    });
    expect(er3(log)?.level).toBeNull();
    expect(er3(log)?.evidenceRefs).toHaveLength(1);
    expect(er3(log)?.reason).toContain("finished the plan another way");
  });

  it("holds the same level for the same statement whatever the amounts are", () => {
    // The neutrality that made this producible at all. A student planning the full course
    // and a student deliberately planning none of it made the same statement about how their
    // plan closed, and this requirement cannot tell them apart — because it is not about how
    // much anybody saved.
    const everything = opening({ typed: { goal: 1200 }, closes: ["flexibleCash"] });
    const nothing = opening({ typed: { goal: 0, reserve: 200 }, closes: ["flexibleCash"] });
    expect(er3(everything)?.level).toBe(er3(nothing)?.level);
    expect(er3(everything)?.level).toBe(5);
  });

  it("gives two identical plans different levels only when they were closed differently", () => {
    // The pair that proves this is process evidence and not a re-reading of the result. Both
    // students save the same three amounts; one decided the course line, the other let it
    // catch what was left.
    const decided = opening({ typed: { goal: 1000, reserve: 500 }, closes: ["flexibleCash"] });
    const leftOver = opening({ typed: { reserve: 500, flexibleCash: spendable() - 1500 }, closes: ["goal"] });
    const amountsOf = (log: ReturnType<typeof opening>) => deriveFacts(log).opening?.snapshot.inputs.amounts;
    expect(amountsOf(decided)).toEqual(amountsOf(leftOver));
    expect(er3(decided)?.level).toBe(5);
    expect(er3(leftOver)?.level).toBe(0);
  });

  it("caps it at the help that was on screen", () => {
    // The engine applies §10.3's caps, not this world. A student who opened the step-by-step
    // help before closing their plan cannot reach 5 from it.
    const helped = opening({ typed: { goal: 1200 }, closes: ["flexibleCash"], scaffold: true });
    expect(er3(helped)?.level).toBe(5);
    expect(er3(helped)?.supportLevel).toBe("direct_scaffold");
    expect(standingEr3(helped)).toBe(3);
  });
});

describe("the statement changes nothing that was already true", () => {
  it("leaves every micro-skill score exactly where it was", () => {
    // The new action moves money the steppers could already move, so the plan it produces is
    // one the old board could produce. If the eighteen micro-skills scored it differently,
    // the board would have gained a right answer.
    const byHand = opening({ typed: { goal: 1200, reserve: 500, flexibleCash: spendable() - 1700 }, closes: [] });
    const byStatement = opening({ typed: { goal: 1200, reserve: 500 }, closes: ["flexibleCash"] });
    const points = (log: ReturnType<typeof opening>) =>
      deriveResult(log, null).observations.map((observation) => [observation.microSkillId, observation.points]);
    expect(points(byStatement)).toEqual(points(byHand));
  });

  it("reaches the same balanced plan the steppers reach", () => {
    const log = opening({ typed: { goal: 1200, reserve: 500 }, closes: ["flexibleCash"] });
    const saved = deriveFacts(log).opening;
    expect(saved?.balance).toBe(0);
    expect(assigned(saved!.snapshot.inputs.amounts)).toBe(spendable());
  });

  it("leaves Seat 14 saying what Seat 14 always said", () => {
    // The golden run predates the control and contains no statement, so its ER3 is `null`
    // and its `plan-within-income` stays *incomplete* — the same sentence Checkpoint 2 left
    // it on. A change that re-read old logs through the new rule would show up right here.
    const log = seat14Log();
    expect(deriveFacts(log).remainderChoices).toEqual([]);
    const result = observeCompetencies(observeBasketballFromLog(log), { submitted: true })
      .find((entry) => entry.competencyId === "plan-within-income");
    expect(result?.state).toBe("incomplete");
    expect(result?.levels.find((level) => level.evidenceRequirementId === "plan-within-income.er3")?.level).toBeNull();
  });
});

describe("what this adds up to", () => {
  it("routes every requirement of plan-within-income, and says how", () => {
    const routes = BASKETBALL_EVIDENCE_ROUTES.filter((route) => route.evidenceRequirementId.startsWith("plan-within-income."));
    expect(routes.map((route) => route.via)).toEqual(["micro-skills", "micro-skills", "remainder-declaration", "micro-skills", "written-defense"]);
    expect(routes.every((route) => route.via !== "not-produced")).toBe(true);
  });

  it("makes the competency available, from a whole route and not a claim", () => {
    const required = requiredEvidenceRequirementsFor("plan-within-income").map((requirement) => requirement.id);
    const produced = new Set(
      BASKETBALL_EVIDENCE_ROUTES.filter((route) => route.via !== "not-produced").map((route) => route.evidenceRequirementId),
    );
    for (const id of required) expect(produced.has(id), id).toBe(true);
    expect(isCompetencyAvailable("plan-within-income")).toBe(true);
    expect(availableCompetencyIds().has("plan-within-income")).toBe(true);
  });

  it("still produces nothing for save-toward-a-goal", () => {
    // Re-checked requirement by requirement when the control was added. Naming the row that
    // takes the leftovers is not a target, not a date, not a per-week figure, and not a
    // choice made while something else wanted the money.
    const routes = BASKETBALL_EVIDENCE_ROUTES.filter((route) => route.evidenceRequirementId.startsWith("save-toward-a-goal."));
    expect(routes).toHaveLength(5);
    expect(routes.every((route) => route.via === "not-produced")).toBe(true);
    expect(isCompetencyAvailable("save-toward-a-goal")).toBe(false);
    const log = opening({ typed: { goal: 1200 }, closes: ["flexibleCash"] });
    const spokenTo = new Set(observeBasketballFromLog(log).map((observation) => observation.evidenceRequirementId.split(".")[0]));
    expect(spokenTo.has("save-toward-a-goal")).toBe(false);
  });
});
