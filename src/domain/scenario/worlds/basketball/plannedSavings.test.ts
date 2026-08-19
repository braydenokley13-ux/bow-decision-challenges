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
 * This is the requirement the whole multiple-world thesis is meant to be proven on. It is
 * read off one fact: where the figure on the course line came from when the opening plan was
 * closed.
 *
 * **This file used to say something else, and it was wrong.** Its title was "only a statement
 * can say so", and the statement it meant was the board's *"One of these takes what is left
 * over. Which one?"* — three cards, one press, always shown, and the requirement read from
 * that press alone. Two of the claims it pinned were not pedagogy but a limitation of the
 * board wearing pedagogy's clothes:
 *
 * - *"says nothing at all about a plan closed without the statement"* — asserted that a
 *   student who typed $1,200 into the course line, then filled the other two rows and saved a
 *   balanced plan, had told this world **nothing** about their savings. The observable rule is
 *   "savings is set to a deliberate figure … not as the remainder after them", and typing a
 *   figure is setting one. The board could not see it; that was never a fact about the child.
 *
 * - *"does not read hitting the course cap on the way past as savings taking the leftovers"* —
 *   pinned a card reading **"Sports-media course $1,200 — all it can hold"** as *demonstrating*
 *   the requirement. That card was BOW printing the exact savings figure on the screen whose
 *   entire job is to find out whether the student can produce it, and one press of it scored 5.
 *   The card is gone; the steppers still reach $1,200, and reaching it is now something the
 *   student did.
 *
 * What replaced them is the thing the requirement always asked for and the board could not
 * previously record: the difference between a figure a student set, a figure the arithmetic
 * set, a figure BOW set, and a row nobody opened. The fourth is the one that did real damage —
 * a red team found three students reported to their teachers as having *"set a figure"* on a
 * line none of them had touched.
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

  it("hears a figure the student typed, with no closing press anywhere in the run", () => {
    // The case the old rule refused to read, because the board had no record of it. Three
    // deliberate figures that balance exactly is a plan, and the course line in it is a
    // planned amount however the other two rows were filled.
    const log = opening({ set: { goal: 1200, reserve: 400, flexibleCash: spendable() - 1600 }, closes: [] });
    expect(deriveFacts(log).remainderChoices).toEqual([]);
    expect(er3(log)?.level).toBe(5);
    expect(standingEr3(log)).toBe(5);
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

  it("withholds it when BOW filled the plan in and the student left it alone", () => {
    // What "Fill in one plan that balances" produces. The student chose to press it and chose
    // nothing else; there is no amount here that came from them.
    const log = opening({
      set: { goal: 1200, reserve: 400, flexibleCash: spendable() - 1600 },
      closes: [],
      supplied: true,
    });
    expect(er3(log)?.level).toBe(0);
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
    expect(er3(corrected)?.reason).toMatch(/moved it themselves/i);
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

  it("reads Seat 14 as the planned-savings run it always was", () => {
    // Seat 14 is a run, not a frozen log — it is replayed through the shipping reducer every
    // time it is asked for. Its student typed $1,200 into the course line and then filled the
    // other two rows, and used to score `null` here for the single reason that the board of
    // the day recorded no closing press. The plan is unchanged and so is every micro-skill in
    // it; what changed is that the world can now see the figure was theirs.
    //
    // A *frozen* log from before the record exists too, and it must not move:
    // `oldLogs.regression.test.ts` holds three of them to exactly the levels they were scored
    // at, through the fallback path this rule keeps for them.
    const log = seat14Log();
    expect(deriveFacts(log).remainderChoices).toEqual([]);
    expect(deriveFacts(log).opening?.snapshot.inputs.amounts.goal).toBe(1200);
    const result = observeCompetencies(observeBasketballFromLog(log), { submitted: true })
      .find((entry) => entry.competencyId === "plan-within-income");
    expect(result?.levels.find((level) => level.evidenceRequirementId === "plan-within-income.er3")?.level).toBe(5);
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
