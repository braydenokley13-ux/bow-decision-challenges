import type { CompetencyId } from "../../competency/types";
import type { Coverage, Mapping, StandardCompletionRule } from "../types";

/**
 * Every claim BOW makes about what its competencies cover in NYSED's Grades 5–8 framework.
 *
 * **This is the only file that changes when a state is added.** If adding New Jersey ever
 * requires touching a world, a rubric, a scorer or a teacher screen, the standards layer
 * was built wrong.
 *
 * What the 37 rows below prove about the model: eleven of the 23 objectives are not
 * one-to-one. One competency fully covers two objectives — `how-savings-grow` covers 5.2
 * and 5.5 — so a teacher who assigns 5.5 gets evidence for 5.2 as well. That is a gift
 * rather than a bug, and it has to be labelled on screen or it looks like a mistake. In the
 * other direction, NYSED 2.1 is three skills wearing one number and 4.1 is two, which is
 * what the completion rules at the bottom of this file exist for.
 *
 * **Two rows are deliberately `partial` where the objective's own verb asks for more than
 * a decision competency provides.** 1.6 asks for a comparison across four payment methods
 * and `choose-how-to-pay` reaches one; 4.4's second clause asks the student to recommend an
 * action and `protect-your-information` has `explanationRequired: false`. Both are real
 * evidence toward their objective and neither is the whole of it, and neither has a
 * completion rule — no other competency covers what is missing, so writing one would invent
 * a "yes" the model cannot back. `mappingIntegrity.test.ts` names them so a new all-partial
 * objective still fails the build until a person makes the same call.
 *
 * **There were four.** 2.3 and 2.4 were on that list for the same reason, and they left it
 * the way a capped row is supposed to: not by re-reading the mapping, but by the competency
 * behind it gaining the evidence the objectives were asking for. That is the only honest
 * route off this list, and the note beside those two rows says what it cost.
 *
 * No row here is inferred. Each was written by a person and carries a `verifiedOn` date.
 */

const ASSERTED_BY = "BOW";
const VERIFIED_ON = "2026-08-16";

function row(
  competencyId: CompetencyId,
  standardCode: string,
  coverage: Coverage,
  rationale: string,
): Mapping {
  return { competencyId, frameworkId: "nysed-pf-2026", standardCode, coverage, rationale, assertedBy: ASSERTED_BY, verifiedOn: VERIFIED_ON };
}

export const NYSED_2026_MAPPINGS: readonly Mapping[] = [
  // ── Topic 1 — Budgeting and Money Management ───────────────────────────────────────
  // Was `full`, and a fresh verifier who read NYSED's own text before reading anything in this
  // repository showed it was not. 1.1 names four categories — needs, wants, values **and
  // goals** — and two kinds of decision, "spending **and savings** decisions". BOW's competing
  // claims are a need, an obligation and a want in both stories; no claim is money the student
  // was saving toward something, neither world offers "I was saving for something else" as a
  // reason, and the money in that moment cannot be banked by explicit design. The observer
  // separately refuses `save-toward-a-goal.er3` on purpose — which is exactly the evidence a
  // `full` claim here would have to rest on. The competency's own statement only ever claimed a
  // spending decision, so the over-claim was in this row and nowhere else.
  //
  // Correcting it returns the honestly assessable count to one. That is a smaller number than
  // the product printed yesterday and it is the true one, which is the trade this whole
  // framework exists to make.
  row("sort-by-need-want-goal", "1.1", "partial", "Covers needs, wants and values — as an obligation to another person — inside a spending decision under competition. It does not reach the goals category or the savings decisions the objective also names: no claim in either story is money set aside toward a goal, and the money in that moment cannot be banked."),

  row("explain-different-outcomes", "1.2", "full", "Naming the specific factors that made two same-income outcomes differ is exactly what this competency asks for."),
  row("adapt-a-plan", "1.2", "partial", "Covers the 'unexpected expenses' factor by making the student repair a plan after one, but not the comparison the objective is built on."),
  row("plan-for-the-unexpected", "1.2", "partial", "Covers the 'unexpected expenses' factor from the planning side; the objective also asks about priorities, obligations and access to resources."),

  row("plan-within-income", "1.3", "full", "Building a plan that fits available income, covers required costs and gives savings a planned amount is the objective, in BOW's words."),
  row("save-toward-a-goal", "1.3", "partial", "Covers the 'and savings' half of the objective in more depth than a balanced budget alone requires."),

  row("judge-a-claim", "1.4", "full", "Assessing credibility, accuracy and bias across sources that disagree, and acting on the more credible one, is the objective."),

  row("notice-influence", "1.5", "full", "Naming what is pushing a spending decision — peers, advertising, technology, a deadline — and deciding anyway is the objective."),
  row("judge-a-claim", "1.5", "partial", "Covers the advertising and online-content part of 'external influences' by testing whether a claim is trusted."),

  // NYSED 1.6 asks for all four methods compared on four attributes. `choose-how-to-pay`
  // reaches one chosen method (with debit standing in for NYSED's check, not a fifth option)
  // and one risk plus one protection for it — one of four methods, two of four attributes,
  // not the comparison the objective is built on. `partial` until BOW builds the comparison.
  row("choose-how-to-pay", "1.6", "partial", "Picks one payment method for one purchase and names one risk and one protection for it — a slice of the four-method, four-attribute comparison 1.6 asks for, not the whole of it."),

  // ── Topic 2 — Credit and Debt Management ───────────────────────────────────────────
  // 2.1 is three skills under one number. See the completion rule below.
  row("decide-to-borrow", "2.1", "partial", "Covers the cost and repayment-terms parts of the decision to use credit, not the whole bundled objective."),
  row("keep-credit-costs-down", "2.1", "partial", "Covers the simple-interest and fees parts by running a balance forward across a repayment period."),
  row("sort-by-need-want-goal", "2.1", "partial", "Covers the 'needs versus wants' part the objective names first."),

  row("decide-to-borrow", "2.2", "full", "Deciding whether borrowing is worth it for a specific purchase, and saying when it helps and when it hurts, is the objective."),
  // 2.3 and 2.4 were `partial` for one reason: their verbs are "Explain" and "Describe," and
  // `keep-credit-costs-down` asked the student to run the strategies forward without ever
  // asking them to say anything. That was an accurate reading of the competency as it stood.
  //
  // The competency changed — er5 and er6, both required, both explanations — and the reason
  // it changed is in `competencies.ts` beside them. It is worth repeating here because this
  // is the file where the promotion cashes out: the rows were not added to move these two
  // cells. They were added because a student can pass er1–er4 by paying the larger number
  // whenever it is offered and reading the balance after a miss, and that student has a
  // procedure rather than a strategy. The objectives' verbs and the competency's own claim
  // wanted the same thing, which is the only condition under which a written row is worth
  // what it costs — and it costs plenty: this competency is all-or-none, so a Module 2 world
  // now produces six rows for it rather than four, on 2.1 as well as on these two.
  row("keep-credit-costs-down", "2.3", "full", "The student runs the strategies — paying more than was asked, clearing the balance, not letting it run — and then explains which one kept their own total down, pointing at a figure from their own months. That is 2.3's verb over 2.3's content."),
  row("keep-credit-costs-down", "2.4", "full", "The student lives through the missed payment's fee, changed rate and longer payoff, and then says what it went on costing after the fee — which is the described effect on the agreement 2.4 asks for, against the misconception that a late payment is a late fee."),

  // ── Topic 3 — Earning Income ───────────────────────────────────────────────────────
  row("compare-earning-paths", "3.1", "full", "Comparing the education, training and skills several careers require against what each pays is the objective."),
  row("gross-to-net", "3.2", "full", "Computing net from gross including taxes and common payroll deductions is the objective, and this competency then plans from the net number."),

  row("what-taxes-fund", "3.3", "full", "Explaining how taxes reduce take-home pay and what public services they fund is the objective."),
  row("gross-to-net", "3.3", "partial", "Covers the 'reduce take-home pay' half by making the deduction visible on the student's own pay; it says nothing about what the money funds."),

  // ── Topic 4 — Risk Management ──────────────────────────────────────────────────────
  // 4.1 asks about advance planning AND insurance. See the completion rule below.
  row("plan-for-the-unexpected", "4.1", "partial", "Covers the advance-planning half of the objective and produces no insurance evidence at all."),
  row("use-insurance", "4.1", "partial", "Covers the insurance half of the objective and does not cover advance planning."),
  row("adapt-a-plan", "4.1", "supporting", "Repairing a plan after an unexpected event uses the objective's idea without assessing whether the student planned ahead of it."),

  row("use-insurance", "4.2", "full", "Premiums, coverage and shared risk, plus picking coverage for a specific situation, is this competency's statement."),

  row("is-the-add-on-worth-it", "4.3", "full", "Weighing an extended warranty's price against the item's replacement cost and its failure likelihood is the objective."),
  row("use-insurance", "4.3", "partial", "Covers the shared-risk reasoning an extended-warranty decision rests on."),

  // 4.4 is two clauses: identify the method, and recommend actions a person can take.
  // `protect-your-information` reaches the first by having the student act correctly in the
  // moment — and `explanationRequired: false` means nothing in it requires them to say what
  // they would recommend, only to do the right thing this once.
  row("protect-your-information", "4.4", "partial", "Covers the 'identify' half of 4.4 by having the student act correctly on a real attempt; the objective's second half asks the student to recommend actions, and this competency does not require that explanation."),

  // ── Topic 5 — Saving and Investing ─────────────────────────────────────────────────
  row("save-toward-a-goal", "5.1", "full", "Naming a reason to save and building a plan that reaches a short-term goal inside a year is the objective."),
  row("plan-within-income", "5.1", "partial", "Covers the part where the savings plan has to fit inside the money actually available."),

  row("how-savings-grow", "5.2", "full", "Separating investment principal from interest and showing how interest grows a balance over time is the objective."),

  row("compare-rates", "5.3", "full", "Comparing rates across institutions and showing how much sooner the better one reaches the goal is the objective."),
  row("how-savings-grow", "5.3", "partial", "Covers the growth projection the rate comparison has to be measured with."),

  row("weigh-investment-risk", "5.4", "full", "Comparing asset types by what they might return and what they might lose is the objective."),
  row("spread-the-risk", "5.4", "partial", "Covers the risk half by making the student allocate across asset types rather than judge one in isolation."),

  row("how-savings-grow", "5.5", "full", "Showing that an earlier start ends with more, and saying why, sits inside this competency — one skill, two NYSED numbers."),

  row("spread-the-risk", "5.6", "full", "Showing that spreading money across different assets lowers the damage when one falls is the objective."),
  row("weigh-investment-risk", "5.6", "partial", "Covers the 'different types of assets' judgement that diversification depends on."),
] as const;

/**
 * The two NYSED objectives that bundle more than one skill under one number.
 *
 * Without these, a teacher who assigned one competency would see the objective reported as
 * demonstrated on a third of its actual demand, and a district would make a purchasing
 * decision on that number. With them, the objective reads *partially assessed* and names
 * what is missing.
 */
export const NYSED_2026_COMPLETION_RULES: readonly StandardCompletionRule[] = [
  {
    frameworkId: "nysed-pf-2026",
    standardCode: "2.1",
    requires: ["decide-to-borrow", "keep-credit-costs-down", "sort-by-need-want-goal"],
    note: "2.1 bundles three skills. All three are needed to call it demonstrated.",
  },
  {
    frameworkId: "nysed-pf-2026",
    standardCode: "4.1",
    requires: ["plan-for-the-unexpected", "use-insurance"],
    note: "4.1 asks about advance planning and insurance. Basketball produces good advance-planning evidence and no insurance evidence at all, so 4.1 stays capped at partial until a world carries insurance.",
  },
] as const;
