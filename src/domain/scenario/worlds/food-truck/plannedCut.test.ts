import { describe, expect, it } from "vitest";
import { observeCompetencies } from "../../../competency/observe";
import type { EvidenceRequirementId, RubricLevel } from "../../../competency/types";
import { runPopUp, openingPlanFor, type PopUpRunOptions } from "../../../../test/runPopUp";
import { observePopUpFromLog } from "./observer";
import { availableToPlan, swapBill } from "./economy";
import { POP_UP_NUMBERS } from "./numbers";

/**
 * The three judgements this world exists to make, held to what they actually say.
 *
 * `plan-within-income.er3` is the requirement the whole multiple-world thesis is meant to be
 * proven on. Basketball catches "savings is whatever is left" by asking the student to name
 * the row that takes the leftovers; this world asks the same question of a completely
 * different board, where the savings line is the money a person is banking for themselves out
 * of four Saturdays at a night market. If the two agree on what counts, the competency is
 * behaving like a skill rather than like familiarity with one story.
 *
 * `plan-within-income.er1` catches the other half: money with a rule on it, counted as if the
 * rule were already met.
 *
 * `adapt-a-plan.er2` catches the third: reaching for money that has already gone.
 */

function levelOf(log: readonly { id: string }[], id: EvidenceRequirementId): RubricLevel | null | undefined {
  return observePopUpFromLog(log as never).find((entry) => entry.evidenceRequirementId === id)?.level;
}

function reasonOf(log: readonly { id: string }[], id: EvidenceRequirementId): string {
  return observePopUpFromLog(log as never).find((entry) => entry.evidenceRequirementId === id)?.reason ?? "";
}

/** The level after the engine has applied the support caps, which is the level a teacher sees. */
function standing(log: readonly { id: string }[], id: EvidenceRequirementId) {
  const competencyId = id.startsWith("plan-within-income") ? "plan-within-income" : "adapt-a-plan";
  return observeCompetencies(observePopUpFromLog(log as never), { submitted: true })
    .find((result) => result.competencyId === competencyId)
    ?.levels.find((level) => level.evidenceRequirementId === id)?.level;
}

const run = (options: PopUpRunOptions = {}) => runPopUp(options).log;

/**
 * A student who put every dollar into food and kept nothing back.
 *
 * Twenty-one trays across the first three Saturdays, no cushion, and a cut that cannot cover
 * the swap on its own. This is the run the generator actually breaks, and it is reachable
 * entirely from decisions the world offers.
 */
const SPENT_IT_ALL: PopUpRunOptions = { trays: { first: 5, middle: 8, last: 0 }, cushionShare: 0 };

describe("your cut is a planned amount, and only a statement can say so", () => {
  it("awards it when the student set their cut and let another line take the rest", () => {
    const log = run({ closeOpeningInto: "stock" });
    expect(levelOf(log, "plan-within-income.er3")).toBe(5);
    expect(standing(log, "plan-within-income.er3")).toBe(5);
  });

  it("awards it the same way when the cushion takes the rest", () => {
    // The requirement is that the *cut* was set, not that a particular other line absorbed the
    // leftovers. Sending them to the cash box is a different plan, not a different level.
    expect(levelOf(run({ closeOpeningInto: "cushion" }), "plan-within-income.er3")).toBe(5);
  });

  it("withholds it when your cut is what was left over", () => {
    // The misconception, exactly: the food and the cash box were decided and the student's own
    // pay is the arithmetic. The plan balances and it is not evidence of the skill.
    const log = run({ closeOpeningInto: "cut" });
    expect(levelOf(log, "plan-within-income.er3")).toBe(0);
    expect(standing(log, "plan-within-income.er3")).toBe(0);
    expect(reasonOf(log, "plan-within-income.er3")).toContain("what the arithmetic came to");
  });

  it("says nothing about a plan closed without the statement", () => {
    // The steppers still reach every amount. A student who grinds all three lines to zero by
    // hand has told this world nothing about which line the arithmetic decided, and `null` is
    // the honest answer — §10.4 keeps it out of every roll-up rather than scoring it low.
    const log = run({ closeByHand: true });
    expect(levelOf(log, "plan-within-income.er3")).toBeNull();
    expect(reasonOf(log, "plan-within-income.er3")).toContain("without saying which line took the rest");
  });

  it("holds the same level for the same statement whatever the amounts are", () => {
    // The neutrality that made this producible at all. A student who banks a large cut and one
    // who deliberately banks almost none made the same statement about how their plan closed,
    // and this requirement cannot tell them apart — because it is not about how much anybody
    // banked. `balance.ts` is what proves neither amount is the right one.
    const generous = run({ cushionShare: 0.1, closeOpeningInto: "stock" });
    const frugal = run({ cushionShare: 0.95, closeOpeningInto: "stock" });
    const cutOf = (options: PopUpRunOptions) => openingPlanFor(options).cut;
    expect(cutOf({ cushionShare: 0.1 })).not.toBe(cutOf({ cushionShare: 0.95 }));
    expect(levelOf(generous, "plan-within-income.er3")).toBe(levelOf(frugal, "plan-within-income.er3"));
    expect(levelOf(generous, "plan-within-income.er3")).toBe(5);
  });

  it("caps it at the help that was on screen", () => {
    // The engine applies §10.3's caps, not this world. A student who opened the step-by-step
    // help before closing their plan cannot reach 5 from it.
    const log = run({ scaffold: ["opening"], closeOpeningInto: "stock" });
    expect(levelOf(log, "plan-within-income.er3")).toBe(5);
    expect(standing(log, "plan-within-income.er3")).toBe(3);
  });

  it("agrees with Basketball about what the two students did", () => {
    // The comparability claim, stated as the thing it actually rests on: a student who lets
    // the savings line catch the leftovers scores the same in a night market as on a
    // basketball season, and a student who sets it first scores the same too.
    expect(levelOf(run({ closeOpeningInto: "cut" }), "plan-within-income.er3")).toBe(0);
    expect(levelOf(run({ closeOpeningInto: "cushion" }), "plan-within-income.er3")).toBe(5);
  });
});

describe("money with a rule on it", () => {
  it("gives it to a plan built only on cash the truck is holding", () => {
    const log = run({ countCatering: false, countRebate: false });
    expect(levelOf(log, "plan-within-income.er1")).toBe(5);
    expect(reasonOf(log, "plan-within-income.er1")).toContain("only the cash in the account");
  });

  it("withholds it when a catering job that has not confirmed is spent as though it had", () => {
    // The ER1 misconception. Sunrise Yoga has not said yes, the plan divides their money, and
    // nothing in it says what gives when they say no.
    const log = run({ countCatering: true, coverLine: null });
    expect(levelOf(log, "plan-within-income.er1")).toBe(0);
    expect(standing(log, "plan-within-income.er1")).toBe(0);
    expect(reasonOf(log, "plan-within-income.er1")).toContain("as money already in the account");
  });

  it("gives it to a student who counted the job and said what would give it back", () => {
    // Counting conditional money is a defensible call — the sweep shows the rebate is a live
    // strategy either way. What is judged is whether the student planned for it not arriving.
    const log = run({ countCatering: true, coverLine: "cushion" });
    expect(levelOf(log, "plan-within-income.er1")).toBe(5);
  });

  it("does not care which line the student named", () => {
    for (const line of ["stock", "cushion", "cut"] as const) {
      expect(levelOf(run({ countRebate: true, coverLine: line }), "plan-within-income.er1"), line).toBe(5);
    }
  });

  it("still fails the plan when the sum underneath it is wrong", () => {
    // The requirement is a conjunction: knowing what is available means both totalling it and
    // not treating a maybe as a yes. Getting the total wrong fails it however careful the rest
    // of the plan was.
    const log = run({ missSums: ["cash-to-plan"] });
    expect(levelOf(log, "plan-within-income.er1")).toBe(0);
  });

  it("reads a total put right after a wrong first go as self-corrected", () => {
    expect(levelOf(run({ fumbleSums: ["cash-to-plan"] }), "plan-within-income.er1")).toBe(4);
  });

  it("scores nothing at all for an answer the world handed over", () => {
    const log = run({ scaffold: ["cash-to-plan"] });
    expect(standing(log, "plan-within-income.er1")).toBe(3);
  });
});

describe("the money the generator takes", () => {
  it("works out what the shop still wants", () => {
    expect(swapBill(POP_UP_NUMBERS)).toBe(POP_UP_NUMBERS.generator.replacement - POP_UP_NUMBERS.generator.deposit);
    expect(levelOf(run(), "adapt-a-plan.er1")).toBe(5);
    expect(levelOf(run({ missSums: ["swap-gap"] }), "adapt-a-plan.er1")).toBe(0);
  });

  it("gives full credit for a repair made only from lines that can still move", () => {
    expect(levelOf(run({ reachForCommitted: 0 }), "adapt-a-plan.er2")).toBe(5);
  });

  it("reads a student who tried to reclaim committed money as self-corrected", () => {
    // The permit, the booth, the food already cooked and Marisol's shift are gone. Reaching
    // for them and then repairing out of what is left is §10.3's level 4: got it wrong, saw
    // the raw state, put it right with nothing on screen but the board.
    const log = run({ reachForCommitted: 2 });
    expect(levelOf(log, "adapt-a-plan.er2")).toBe(4);
    expect(reasonOf(log, "adapt-a-plan.er2")).toContain("reached for 2 time(s)");
  });

  it("does not care which line the money came out of", () => {
    // Cutting the last Saturday's food, spending the cash box, or taking it out of your own pay
    // are three different plans and the same level. Scoring one of them would make one set of
    // priorities the right answer in a market swept to prove that none of them is.
    for (const first of ["stock", "cushion", "cut"] as const) {
      const log = run({ repairOrder: [first] });
      expect(levelOf(log, "adapt-a-plan.er2"), first).toBe(5);
      expect(levelOf(log, "adapt-a-plan.er3"), first).toBe(5);
      expect(levelOf(log, "adapt-a-plan.er4"), first).toBe(5);
    }
  });

  it("credits a full response against what could actually be freed, not against the bill", () => {
    // A student who spent almost everything into stock cannot cover the swap however willing
    // they are. Freeing everything that was left is a complete response and is scored as one;
    // the shortfall is `er4`'s business, not `er3`'s.
    const broke = run(SPENT_IT_ALL);
    expect(levelOf(broke, "adapt-a-plan.er3")).toBe(5);
  });

  it("takes a named shortfall as a partial answer and an unnamed one as none", () => {
    const broke = run(SPENT_IT_ALL);
    expect(levelOf(broke, "adapt-a-plan.er4")).toBe(2);
    expect(reasonOf(broke, "adapt-a-plan.er4")).toContain("short of the swap, and the student said so");
  });

  it("says nothing about any of it when the student never met the generator", () => {
    const stopped = runPopUp({ stopAfterSaturdayThree: true }).log;
    for (const id of ["adapt-a-plan.er1", "adapt-a-plan.er2", "adapt-a-plan.er3", "adapt-a-plan.er4"] as const) {
      expect(levelOf(stopped, id), id).toBeNull();
    }
  });
});

describe("what the world refuses to read", () => {
  it("scores the same for every booth spot", () => {
    const decisions = (spotId: "back-lane" | "middle-row" | "bridge-gate") =>
      observePopUpFromLog(runPopUp({ spotId, trays: { first: 2, middle: 2, last: 2 } }).log)
        .filter((entry) => entry.kind === "decision")
        .map((entry) => [entry.evidenceRequirementId, entry.level]);
    expect(decisions("back-lane")).toEqual(decisions("middle-row"));
    expect(decisions("back-lane")).toEqual(decisions("bridge-gate"));
  });

  it("scores the same whether or not Marisol worked the window", () => {
    const decisions = (bookHelper: boolean) =>
      observePopUpFromLog(runPopUp({ bookHelper }).log)
        .filter((entry) => entry.kind === "decision")
        .map((entry) => [entry.evidenceRequirementId, entry.level]);
    expect(decisions(true)).toEqual(decisions(false));
  });

  it("scores the same however much food went in the bin", () => {
    // Spoilage is what the world is about and it is not what the world grades. A student who
    // binned three trays and a student who binned none have made different decisions, and the
    // rubric has nothing to say about which was better.
    const wasteful = runPopUp({ trays: { first: 3, middle: 6, last: 6 } });
    const careful = runPopUp({ trays: { first: 3, middle: 4, last: 4 } });
    const decisionsOf = (state: typeof wasteful) =>
      observePopUpFromLog(state.log).filter((entry) => entry.kind === "decision").map((entry) => [entry.evidenceRequirementId, entry.level]);
    expect(decisionsOf(wasteful)).toEqual(decisionsOf(careful));
  });

  it("divides only money the plan is allowed to divide", () => {
    // The permit and the booth are paid before the board opens, so the money the plan splits is
    // what is left — and counting conditional money is the only thing that raises it.
    const n = POP_UP_NUMBERS;
    expect(availableToPlan(n, "middle-row", { catering: false, rebate: false })).toBe(n.startCash - n.permit - n.spots["middle-row"].booth);
    expect(availableToPlan(n, "middle-row", { catering: true, rebate: true })).toBe(
      n.startCash - n.permit - n.spots["middle-row"].booth + n.catering.amount + n.rebate.amount,
    );
  });
});
