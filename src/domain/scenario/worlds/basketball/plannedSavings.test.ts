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
 * one carrying the "and savings" half of the only NYSED objective this product claims. It is
 * read off two facts about the saved plan: which row the student said takes the last of the
 * money, and what that row was already holding when it took it. The rule is
 * `evidence/plannedSavings.ts` and the market obeys the same one.
 *
 * **This file has argued for two different rules before this one, and an assessment-validity
 * review showed both of them inverting the judgement on real children.**
 *
 * The first read the closing statement alone and claimed nothing about a plan closed without
 * one. The second — the one these tests were rewritten for — read the *provenance* of the
 * savings row: which control put the figure there, `typed` → 5 and `remainder` → 0. Its
 * argument was that "typing a figure is setting one". That is where it came apart, in both
 * directions and on rendered pages in one class:
 *
 * - **Bea** filled the two discretionary rows to the figures she wanted and then typed the
 *   arithmetic leftover, $100, into the course line — the misconception, in the exact order
 *   the rule names — and read **Right first time**, under a sentence saying another row took
 *   the last of the money on a run where no row did.
 * - **Fay** typed $1,000 into the course line first, set the other two, and then chose to send
 *   the last $100 there as well. She read **Did not do it**, was named in the class reteach
 *   under *"Savings is leftover money"*, and left in the export as **Not yet**.
 *
 * The mistake both share is that which control a twelve-year-old reaches for is a fact about
 * touch targets and keyboard confidence, not about budgeting. Typing does not distinguish "I
 * decided $100 for the course" from "3,100 − 1,500 − 1,500": on a board where every dollar
 * must be placed, one of the three rows is always the residual of the other two, and nothing
 * in the log says which row the student filled last. So a plan typed to balance now reads
 * `null` and says so — not a zero, and a sentence a teacher can act on — and the pair of
 * amounts on a row that took the leftovers is what separates savings-as-remainder from a
 * savings figure the student set and then chose to add to.
 *
 * What is unchanged is what this may never read: how much is in any row, the order the
 * steppers were touched in, and whether the plan is a good one.
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
  /**
   * What the student put into each row themselves, including the rows they gave nothing to
   * on purpose — `0` is an answer here and it is written as one, because on this board
   * pressing *"Nothing this season"* and never opening the row are different facts.
   */
  set: Partial<Record<CategoryId, number>>;
  /** The rows they sent the unassigned money to, in order, with the one-press shortcut. */
  closes: readonly CategoryId[];
  /** What they did after that, if anything — the steppers are still there. */
  then?: readonly ChallengeAction[];
  scaffold?: boolean;
  /** BOW filled the whole plan in, which is what the third-attempt scaffold does. */
  supplied?: boolean;
}

/**
 * One opening plan, played through the shipping reducer.
 *
 * The amounts are computed rather than written down, so these runs stay correct if the
 * scenario is re-priced — the same rule `scenarioDriven.test.ts` holds the grader to. A close
 * offers exactly what the board offers: the whole of what is unassigned, onto a row that can
 * hold all of it.
 */
function opening({ set, closes, then = [], scaffold, supplied }: OpeningPlan) {
  const amounts: Record<CategoryId, number> = { goal: 0, reserve: 0, flexibleCash: 0 };
  const actions: ChallengeAction[] = [...UP_TO_THE_BOARD];
  if (scaffold) actions.push({ type: "SCAFFOLD_OPENED", interactionId: "working" });
  for (const [category, amount] of Object.entries(set)) {
    amounts[category as CategoryId] = amount;
    actions.push({
      type: "PLAN_AMOUNT_CHANGED",
      mode: "working",
      category: category as CategoryId,
      amount: dollars(amount),
      ...(supplied ? { via: "suggested" as const } : {}),
    });
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

describe("savings is a planned amount, and only the student can set one", () => {
  it("claims nothing about a course line nobody opened", () => {
    // The defect this rule exists for. Two rows placed, the last of the money sent to one of
    // them, the course row left at the $0 it started on. This read "the course line held a
    // figure the student set — Right first time", and it was not true of anybody.
    const log = opening({ set: { reserve: 400 }, closes: ["flexibleCash"] });
    expect(deriveFacts(log).opening?.snapshot.inputs.amounts.goal).toBe(0);
    expect(er3(log)?.level).toBeNull();
    expect(er3(log)?.reason).toMatch(/this run cannot tell/i);
    expect(er3(log)?.reason).not.toMatch(/chose|decided|failed/i);
  });

  it("claims nothing about a plan typed to balance, because one row is always the residual", () => {
    // The case the rule before this one answered **5**, on the argument that typing a figure
    // is setting one. It is not enough: every dollar has to be placed, so whichever row the
    // student fills last necessarily holds what the other two left, and no event in the log
    // says which row that was. The same three amounts are consistent with a course figure
    // chosen first and with one worked out at the end, and BOW cannot tell them apart.
    const log = opening({ set: { goal: 1200, reserve: 400, flexibleCash: spendable() - 1600 }, closes: [] });
    expect(deriveFacts(log).remainderChoices).toEqual([]);
    expect(er3(log)?.level).toBeNull();
    expect(standingEr3(log)).toBeNull();
    expect(er3(log)?.reason).toMatch(/cannot tell/i);
    // Silence, not an accusation: nothing here may read as the student having failed.
    expect(er3(log)?.reason).not.toMatch(/chose|decided|failed/i);
  });

  it("says the same thing about the student who typed the leftovers into savings", () => {
    // Bea, reproduced. She set the two discretionary rows to the figures she wanted and typed
    // what was left into the course line — the misconception performed with the keyboard —
    // and read **Right first time** under a sentence saying another row took the last of the
    // money. No row did. Her run and the careful one above are the same three events, and
    // this is the whole reason the level is `null` rather than either verdict.
    const bea = opening({ set: { reserve: 1500, flexibleCash: 1500, goal: spendable() - 3000 }, closes: [] });
    const careful = opening({ set: { goal: 1200, reserve: 400, flexibleCash: spendable() - 1600 }, closes: [] });
    expect(er3(bea)?.level).toBeNull();
    expect(er3(bea)?.reason).toBe(er3(careful)?.reason);
    expect(er3(bea)?.reason).not.toMatch(/took the last of the money\./);
  });

  it("reads a savings row that was already holding a figure when the leftovers went to it", () => {
    // Fay, reproduced. She typed $1,000 into the course line, set the other two rows, and
    // then chose to send the last of the money there as well — savings planned, and then
    // added to. The old rule scored this **0** and named her in the reteach for "savings is
    // leftover money", because one press overwrote the record of the figure she had set.
    // What separates her from the student below is not a control; it is that her row was
    // already holding something.
    const rest = 100;
    const other = spendable() - 1000 - rest;
    const toppedUp = opening({ set: { goal: 1000, reserve: other - 600, flexibleCash: 600 }, closes: ["goal"] });
    expect(er3(toppedUp)?.level).toBe(5);
    expect(standingEr3(toppedUp)).toBe(5);
    expect(er3(toppedUp)?.reason).toMatch(/already holding \$1,000/);
    // The same closing press, the same final amounts, and the opposite verdict — because this
    // student's savings row was empty when it took them.
    const leftovers = opening({ set: { reserve: other - 600, flexibleCash: 600 }, closes: ["goal"] });
    expect(er3(leftovers)?.level).toBe(0);
  });

  it("awards it when the student set the course line and let another row take the rest", () => {
    const log = opening({ set: { goal: 1200, reserve: 300 }, closes: ["flexibleCash"] });
    expect(er3(log)?.level).toBe(5);
    expect(standingEr3(log)).toBe(5);
  });

  it("awards it the same way when the backup money takes the rest", () => {
    // The requirement is that the *savings* line was set, not that a particular other row
    // absorbed the leftovers. Sending them to the buffer is a different plan, not a
    // different level.
    expect(er3(opening({ set: { goal: 900, flexibleCash: 400 }, closes: ["reserve"] }))?.level).toBe(5);
  });

  it("withholds it when the course line is what was left over", () => {
    // The misconception, exactly: the other rows were decided and the savings figure is the
    // arithmetic. The plan balances and it is not evidence of the skill.
    const log = opening({ set: { reserve: 400, flexibleCash: spendable() - 1600 }, closes: ["goal"] });
    expect(er3(log)?.level).toBe(0);
    expect(standingEr3(log)).toBe(0);
    expect(er3(log)?.reason).toContain("what the arithmetic came to");
  });

  it("says nothing when BOW filled the plan in and the student left it alone", () => {
    // What "Fill in one plan that balances" produces. The student chose to press it and chose
    // nothing else; there is no amount here that came from them. That is a silence and not a
    // zero — §10.4's answer to a question that never came up — and it is what the market has
    // always said about its own fill-in. A zero would be BOW reporting the misconception on
    // the strength of a scaffold the product itself offered.
    const log = opening({
      set: { goal: 1200, reserve: 400, flexibleCash: spendable() - 1600 },
      closes: [],
      supplied: true,
    });
    expect(er3(log)?.level).toBeNull();
    expect(er3(log)?.reason).toMatch(/one BOW put there/i);
  });

  it("reads a student who took the leftovers back off the course line as self-corrected", () => {
    // §10.3's level 4: got it wrong, saw the raw state, fixed it with nothing on screen but
    // the board. The close lands the last of the money on the course; the student then pulls
    // it back with the steppers and closes somewhere else.
    const rest = spendable() - 300 - 1000;
    expect(rest).toBeLessThanOrEqual(SCENARIO_NUMBERS.course.fullPrice);
    const corrected = opening({
      set: { reserve: 300, flexibleCash: 1000 },
      closes: ["goal"],
      then: [
        { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(0) },
        { type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category: "flexibleCash", amount: dollars(rest) },
      ],
    });
    expect(er3(corrected)?.level).toBe(4);
    expect(er3(corrected)?.reason).toMatch(/took them back off it/i);
  });

  it("holds the same level whatever the figure is, including nothing", () => {
    // The neutrality that made this producible at all. A student planning the full course and
    // a student deliberately planning none of it both set a figure, and this requirement
    // cannot tell them apart — because it is not about how much anybody saved. The second one
    // is the reason "Nothing this season" is a control on the board rather than an absence.
    const everything = opening({ set: { goal: 1200 }, closes: ["flexibleCash"] });
    const nothing = opening({ set: { goal: 0, reserve: 200 }, closes: ["flexibleCash"] });
    expect(er3(nothing)?.level).toBe(er3(everything)?.level);
    expect(er3(everything)?.level).toBe(5);
  });

  it("gives two identical plans different levels only when the figure arrived differently", () => {
    // The pair that proves this is process evidence and not a re-reading of the result. Both
    // students save the same three amounts; one decided the course line, the other let it
    // catch what was left.
    const decided = opening({ set: { goal: 1000, reserve: 500 }, closes: ["flexibleCash"] });
    const leftOver = opening({ set: { reserve: 500, flexibleCash: spendable() - 1500 }, closes: ["goal"] });
    const amountsOf = (log: ReturnType<typeof opening>) => deriveFacts(log).opening?.snapshot.inputs.amounts;
    expect(amountsOf(decided)).toEqual(amountsOf(leftOver));
    expect(er3(decided)?.level).toBe(5);
    expect(er3(leftOver)?.level).toBe(0);
  });

  it("caps it at the help that was on screen", () => {
    // The engine applies §10.3's caps, not this world. A student who opened the step-by-step
    // help before closing their plan cannot reach 5 from it.
    const helped = opening({ set: { goal: 1200 }, closes: ["flexibleCash"], scaffold: true });
    expect(er3(helped)?.level).toBe(5);
    expect(er3(helped)?.supportLevel).toBe("direct_scaffold");
    expect(standingEr3(helped)).toBe(3);
  });

  it("says nothing about a plan that was never saved", () => {
    // The requirement is about how an opening plan was closed, so an opening plan that was
    // never closed produces no reading. An abandoned run is not a low score.
    const abandoned = [...UP_TO_THE_BOARD, { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) } as ChallengeAction]
      .reduce(challengeReducer, createInitialState(START)).log;
    expect(er3(abandoned)?.level).toBeNull();
    expect(er3(abandoned)?.reason).toMatch(/never saved/i);
  });
});

describe("the record changes nothing that was already true", () => {
  it("leaves every micro-skill score exactly where it was", () => {
    // The provenance record moves no money, so the plans reachable with it are the plans that
    // were reachable without it. If the eighteen micro-skills scored two of them differently,
    // the board would have gained a right answer.
    const byHand = opening({ set: { goal: 1200, reserve: 500, flexibleCash: spendable() - 1700 }, closes: [] });
    const byShortcut = opening({ set: { goal: 1200, reserve: 500 }, closes: ["flexibleCash"] });
    const points = (log: ReturnType<typeof opening>) =>
      deriveResult(log, null).observations.map((observation) => [observation.microSkillId, observation.points]);
    expect(points(byShortcut)).toEqual(points(byHand));
  });

  it("reaches the same balanced plan the steppers reach", () => {
    const log = opening({ set: { goal: 1200, reserve: 500 }, closes: ["flexibleCash"] });
    const saved = deriveFacts(log).opening;
    expect(saved?.balance).toBe(0);
    expect(assigned(saved!.snapshot.inputs.amounts)).toBe(spendable());
  });

  it("will not say what Seat 14 did about savings, and Seat 14 is the golden run", () => {
    // Seat 14 is a run, not a frozen log — it is replayed through the shipping reducer every
    // time it is asked for. Its student typed $1,200 into the course line and then filled the
    // other two rows, and never named a row as taking the last of the money.
    //
    // This is the cost of the honest rule, stated where it will be noticed rather than left
    // for somebody to discover on a class page: the product's own best-case run does not
    // produce evidence for the requirement the product is built around, because the board it
    // was played on lets a plan close without ever asking the question. That is a finding
    // about the board and not about the child, and the fix for it is on the board — an
    // opening plan that asked which row is the one being protected would make this run
    // readable. Until then, silence is the true answer and a 5 was not.
    //
    // A *frozen* log from before the provenance record exists too, and it must not move:
    // `oldLogs.regression.test.ts` holds three of them to exactly the levels they were scored
    // at, through the fallback path this rule keeps for them.
    const log = seat14Log();
    expect(deriveFacts(log).remainderChoices).toEqual([]);
    expect(deriveFacts(log).opening?.snapshot.inputs.amounts.goal).toBe(1200);
    const result = observeCompetencies(observeBasketballFromLog(log), { submitted: true })
      .find((entry) => entry.competencyId === "plan-within-income");
    expect(result?.levels.find((level) => level.evidenceRequirementId === "plan-within-income.er3")?.level).toBeNull();
  });
});

describe("what this adds up to", () => {
  it("routes every requirement of plan-within-income, and says how", () => {
    const routes = BASKETBALL_EVIDENCE_ROUTES.filter((route) => route.evidenceRequirementId.startsWith("plan-within-income."));
    expect(routes.map((route) => route.via)).toEqual(["micro-skills", "micro-skills", "savings-figure", "micro-skills", "written-defense"]);
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
    // Re-checked requirement by requirement when the record was added. Where a figure came
    // from is not a target, not a date, not a per-week figure, and not a choice made while
    // something else wanted the money.
    const routes = BASKETBALL_EVIDENCE_ROUTES.filter((route) => route.evidenceRequirementId.startsWith("save-toward-a-goal."));
    expect(routes).toHaveLength(5);
    expect(routes.every((route) => route.via === "not-produced")).toBe(true);
    expect(isCompetencyAvailable("save-toward-a-goal")).toBe(false);
    const log = opening({ set: { goal: 1200 }, closes: ["flexibleCash"] });
    const spokenTo = new Set(observeBasketballFromLog(log).map((observation) => observation.evidenceRequirementId.split(".")[0]));
    expect(spokenTo.has("save-toward-a-goal")).toBe(false);
  });
});
