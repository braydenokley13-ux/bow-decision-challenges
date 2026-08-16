import type { Competency, CompetencyGroupId, CompetencyId, EvidenceRequirement } from "./types";

/**
 * The 21 BOW financial-literacy competencies for Grades 5–8.
 *
 * These 21 cover all 23 NYSED Grades 5–8 Personal Finance objectives, and the cover is
 * deliberately not one-to-one in either direction: NYSED 2.1 is three skills wearing one
 * number, while 5.2 and 5.5 are one skill described from two angles. A model that assumed
 * one objective = one skill would misreport in both directions. The mapping that records
 * which is which lives in `src/domain/standards/mappings/`, not here.
 *
 * Nothing in this file names a state, a framework or an objective code. That is the whole
 * point of the file existing.
 */

export interface CompetencyGroup {
  id: CompetencyGroupId;
  name: string;
  covers: string;
}

/**
 * BOW's five groups. They happen to line up closely with NYSED's five topics because both
 * describe the same subject, and they are still BOW's own — a state whose topics are
 * organised differently maps into them without a change here.
 */
export const COMPETENCY_GROUPS: readonly CompetencyGroup[] = [
  { id: "B", name: "Planning and managing money", covers: "Budgeting, spending decisions, influence, payment methods" },
  { id: "C", name: "Credit and debt", covers: "Borrowing decisions, cost of credit, missed payments" },
  { id: "E", name: "Earning income", covers: "Careers, gross vs net pay, taxes" },
  { id: "R", name: "Risk", covers: "Advance planning, insurance, add-on coverage, identity protection" },
  { id: "S", name: "Saving and investing", covers: "Savings goals, growth over time, rates, asset risk, diversification" },
] as const;

/**
 * Builds one evidence requirement, with the competency id supplied once rather than
 * restated on every row.
 *
 * `misconceptionIfNot` is `null` where the product definition names no misconception for
 * that particular failure. A null is honest; a made-up misconception would end up on a
 * teacher's reteach card as though a person had decided it.
 */
function requirement(
  competencyId: CompetencyId,
  index: 1 | 2 | 3 | 4 | 5 | 6,
  row: Omit<EvidenceRequirement, "id" | "competencyId">,
): EvidenceRequirement {
  // The template literal is already `EvidenceRequirementId` — no assertion, so a competency
  // id that stops matching the pattern is a compile error rather than a cast that hides it.
  return { id: `${competencyId}.er${index}`, competencyId, ...row };
}

/**
 * `plan-within-income` — the evidence requirements the whole multiple-world model is meant
 * to be proven on.
 *
 * **ER3 is the one that matters.** "Savings = whatever is left" is the dominant Grade 5–8
 * budgeting misconception, and it is the reason multiple worlds are worth building: a
 * student who fills housing, food and fun and then types the remainder into savings has
 * produced a balanced budget and has not demonstrated the skill. A quiz cannot see the
 * difference between that student and one who set savings first. A world can, in four
 * different stories.
 */
const PLAN_WITHIN_INCOME_EVIDENCE: readonly EvidenceRequirement[] = [
  requirement("plan-within-income", 1, {
    label: "Knows what money is actually available",
    kind: "decision",
    required: true,
    observableRule: "Totals available money correctly before allocating, and does not include money that has a condition attached without marking it as conditional",
    misconceptionIfNot: "Counting money that has a condition attached as if it were guaranteed",
  }),
  requirement("plan-within-income", 2, {
    label: "Covers what is required first",
    kind: "decision",
    required: true,
    observableRule: "Every required cost is included in the plan exactly once, at the right amount",
    misconceptionIfNot: null,
  }),
  requirement("plan-within-income", 3, {
    label: "Savings is a planned amount",
    kind: "decision",
    required: true,
    observableRule: "Savings is set to a deliberate figure before discretionary categories are filled, not as the remainder after them",
    misconceptionIfNot: "Savings is leftover money",
  }),
  requirement("plan-within-income", 4, {
    label: "The plan actually balances",
    kind: "decision",
    required: true,
    observableRule: "The saved plan does not exceed available money and leaves nothing unassigned",
    misconceptionIfNot: "I'll balance it later",
  }),
  requirement("plan-within-income", 5, {
    label: "Explains the trade-off made",
    kind: "explanation",
    required: true,
    observableRule: "Names something given up, says what it was given up for, and refers to at least one of their own numbers",
    misconceptionIfNot: null,
  }),
] as const;

const ADAPT_A_PLAN_EVIDENCE: readonly EvidenceRequirement[] = [
  requirement("adapt-a-plan", 1, {
    label: "Works out the size of the change",
    kind: "decision",
    required: true,
    observableRule: "Correctly totals what was lost and what is newly required",
    misconceptionIfNot: null,
  }),
  requirement("adapt-a-plan", 2, {
    label: "Uses only money that can still move",
    kind: "decision",
    required: true,
    observableRule: "Repairs from categories that are still adjustable; does not try to reclaim committed money",
    misconceptionIfNot: "Committed money can be un-spent",
  }),
  requirement("adapt-a-plan", 3, {
    label: "Frees enough to cover it",
    kind: "decision",
    required: true,
    observableRule: "Frees at least the shortfall, or as much as was actually available if full repair was impossible",
    misconceptionIfNot: null,
  }),
  requirement("adapt-a-plan", 4, {
    label: "Ends with a plan that works, or says what is still short",
    kind: "decision",
    required: true,
    observableRule: "Final plan balances, or the remaining uncovered amount is explicitly acknowledged",
    misconceptionIfNot: "The plan is fixed while a shortfall remains",
  }),
  requirement("adapt-a-plan", 5, {
    label: "Explains what they protected and why",
    kind: "explanation",
    required: false,
    observableRule: "Names what they refused to cut and why",
    misconceptionIfNot: "Cut the savings line first, every time, without considering the goal",
  }),
] as const;

const SAVE_TOWARD_A_GOAL_EVIDENCE: readonly EvidenceRequirement[] = [
  requirement("save-toward-a-goal", 1, {
    label: "Sets a target and a date",
    kind: "decision",
    required: true,
    observableRule: "Names an amount and a deadline inside a year",
    misconceptionIfNot: null,
  }),
  requirement("save-toward-a-goal", 2, {
    label: "Works out the per-period amount",
    kind: "decision",
    required: true,
    observableRule: "Computes what must be set aside each week or month to hit the target",
    misconceptionIfNot: "A goal is a wish, not a per-period number",
  }),
  requirement("save-toward-a-goal", 3, {
    label: "Protects it against competition",
    kind: "decision",
    required: true,
    observableRule: "When something else wants the money, either protects the savings line or explicitly re-sets the target/date rather than silently missing it",
    misconceptionIfNot: "I'll save what's left",
  }),
  requirement("save-toward-a-goal", 4, {
    label: "Reaches the goal or states the shortfall",
    kind: "decision",
    required: true,
    observableRule: "Ends on target, or states how far short and why",
    misconceptionIfNot: null,
  }),
  requirement("save-toward-a-goal", 5, {
    label: "Says what the saving was for",
    kind: "explanation",
    required: false,
    observableRule: "Connects the amount to the reason",
    misconceptionIfNot: null,
  }),
] as const;

/**
 * The 21 competencies, in group order.
 *
 * **On the empty `evidenceRequirements` arrays.** Three competencies carry their evidence
 * requirements today, because those three are the ones the product definition works out in
 * full (§10.2). Writing the other eighteen is named there — and again in §A9 — as content
 * work owned by a person, not an implementation detail, and it is listed among the
 * decisions "none of which should be settled by an implementer." An invented evidence
 * requirement is not a placeholder: it becomes a rubric row, a reteach card and a claim
 * about a student. So the remaining eighteen are declared, grouped, shaped and mapped, and
 * their evidence requirements are empty until a person writes them.
 *
 * The empty array is not inert. A competency with no evidence requirements can never be
 * satisfied by any world, so it is never available and nothing mapped to it is ever
 * reported assessable — see `availability.ts`.
 */
export const COMPETENCIES: readonly Competency[] = [
  // ── Group B — Planning and managing money ──────────────────────────────────────────
  {
    id: "sort-by-need-want-goal",
    displayCode: "BOW-B1",
    group: "B",
    statement: "Separate what a person needs, wants, values and is saving toward, and use that separation to make a spending decision when there is not enough money for everything.",
    whatTheStudentMustDo: [
      "Rank competing claims on limited money.",
      "Give up something they wanted to protect something they needed or had committed to.",
      "Say which value drove it.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "A need is anything I feel strongly about",
      "A goal is a wish, not a line in the budget",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "choose-under-pressure",
  },
  {
    id: "plan-within-income",
    displayCode: "BOW-B2",
    group: "B",
    statement: "Build a plan that fits the money actually available, covers required costs, and gives savings a planned amount rather than whatever is left over.",
    whatTheStudentMustDo: [
      "Total the money available, and total what is required.",
      "Assign every remaining dollar a job.",
      "Set savings as a deliberate number before discretionary spending.",
      "Finish with nothing unassigned and nothing overspent.",
    ],
    evidenceRequirements: PLAN_WITHIN_INCOME_EVIDENCE,
    misconceptions: [
      "Savings is leftover money",
      "I'll balance it later",
      "Counting money that has a condition attached as if it were guaranteed",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "plan-and-repair",
  },
  {
    id: "adapt-a-plan",
    displayCode: "BOW-B3",
    group: "B",
    statement: "Repair a plan after income or costs change, using only the money that can still move, and protect what was already committed.",
    whatTheStudentMustDo: [
      "Work out the size of the change.",
      "Identify which money is already spent and which is still available.",
      "Free enough from what is still available.",
      "Finish with a plan that works, or state exactly what is still uncovered.",
    ],
    evidenceRequirements: ADAPT_A_PLAN_EVIDENCE,
    misconceptions: [
      "Committed money can be un-spent",
      "Cut the savings line first, every time, without considering the goal",
      "The plan is fixed while a shortfall remains",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "plan-and-repair",
  },
  {
    id: "explain-different-outcomes",
    displayCode: "BOW-B4",
    group: "B",
    statement: "Explain why two people earning the same amount can end up in very different financial situations.",
    whatTheStudentMustDo: [
      "Compare two situations with the same income and different results.",
      "Name the specific factors that produced the difference — priorities, obligations, an unexpected cost, what they could get access to, the decisions they made.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "They must have been careless",
      "Income is the only thing that matters",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "compare-two-lives",
  },
  {
    id: "judge-a-claim",
    displayCode: "BOW-B5",
    group: "B",
    statement: "Decide whether information about a product or service can be trusted, and say what makes it credible or not.",
    whatTheStudentMustDo: [
      "Compare sources that disagree.",
      "Identify who benefits from the claim.",
      "Act on the more credible one.",
    ],
    evidenceRequirements: [],
    misconceptions: ["A review is evidence", "More detail means more true"],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "read-and-judge",
  },
  {
    id: "notice-influence",
    displayCode: "BOW-B6",
    group: "B",
    statement: "Identify what is pushing a spending decision — friends, an ad, an app, a deadline, the way the price is shown — and decide anyway.",
    whatTheStudentMustDo: [
      "Encounter pressure to spend.",
      "Name it.",
      "Make a decision that accounts for it.",
    ],
    evidenceRequirements: [],
    misconceptions: ["Ads don't work on me", "Urgency is information"],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "choose-under-pressure",
  },
  {
    id: "choose-how-to-pay",
    displayCode: "BOW-B7",
    group: "B",
    statement: "Choose a way to pay for a specific purchase and state what that method risks and what it protects.",
    whatTheStudentMustDo: [
      "Pick among cash, debit, credit and a payment app for a real situation.",
      "Name a risk and a protection for the one chosen.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "They're all the same money",
      "A payment app is as protected as a card",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "choose-under-pressure",
  },

  // ── Group C — Credit and debt ──────────────────────────────────────────────────────
  {
    id: "decide-to-borrow",
    displayCode: "BOW-C1",
    group: "C",
    statement: "Decide whether borrowing is worth it for a specific purchase, using what it costs, what it is for, and whether it can be repaid on the terms offered.",
    whatTheStudentMustDo: [
      "Compare buying now on credit against waiting.",
      "Compute what the credit version actually costs.",
      "Make and justify the call.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "The monthly payment is the price",
      "Credit is free if I pay it back",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "choose-under-pressure",
  },
  {
    id: "keep-credit-costs-down",
    displayCode: "BOW-C2",
    group: "C",
    statement: "Keep the cost of a credit balance down over several months, and handle what happens when a payment is missed.",
    whatTheStudentMustDo: [
      "Choose payment amounts across a repayment period.",
      "Show what paying in full versus paying the minimum does to the total.",
      "Respond to a missed payment and its consequences — fee, rate change, longer payoff.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "The minimum payment is the expected payment",
      "One late payment is one late fee",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "run-it-forward",
  },

  // ── Group E — Earning income ───────────────────────────────────────────────────────
  {
    id: "compare-earning-paths",
    displayCode: "BOW-E1",
    group: "E",
    statement: "Compare what different kinds of work require in education, training and skill, and what each is likely to pay.",
    whatTheStudentMustDo: [
      "Compare several paths on training time, training cost and likely pay.",
      "Pick one for a stated goal.",
      "Account for what getting there costs, not only what the work pays.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "More school always means more money",
      "The cost of the training does not matter",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "read-and-judge",
  },
  {
    id: "gross-to-net",
    displayCode: "BOW-E2",
    group: "E",
    statement: "Work out take-home pay from a gross amount, including taxes and common payroll deductions, and build a plan from the take-home number.",
    whatTheStudentMustDo: [
      "Compute net from gross.",
      "Then plan against net, not gross.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "Plan from the number on the offer letter",
      "Deductions are optional",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "plan-and-repair",
  },
  {
    id: "what-taxes-fund",
    displayCode: "BOW-E3",
    group: "E",
    statement: "Explain how taxes reduce take-home pay and what public services they pay for.",
    whatTheStudentMustDo: [
      "Show how a deduction on their own pay reduces what they take home.",
      "Connect that deduction to a specific public service it funds.",
    ],
    evidenceRequirements: [],
    misconceptions: ["Taxes are money that disappears"],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "compare-two-lives",
  },

  // ── Group R — Risk ─────────────────────────────────────────────────────────────────
  {
    id: "plan-for-the-unexpected",
    displayCode: "BOW-R1",
    group: "R",
    statement: "Reduce the financial damage of an unexpected event by planning for it before it happens.",
    whatTheStudentMustDo: [
      "Set aside protection before knowing what will go wrong.",
      "Then face something that goes wrong.",
      "Show whether the protection held.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "An emergency fund is savings I can spend",
      "It probably won't happen to me",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "plan-and-repair",
  },
  {
    id: "use-insurance",
    displayCode: "BOW-R2",
    group: "R",
    statement: "Explain what insurance is for and how premiums, coverage and shared risk work, and pick coverage for a specific situation.",
    whatTheStudentMustDo: [
      "Choose among coverage levels at different premiums.",
      "See the pool's outcomes across several participants, not only their own.",
      "Explain the result using shared risk rather than luck.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "Insurance is a scam if you don't claim",
      "A lower premium is always better",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "compare-two-lives",
  },
  {
    id: "is-the-add-on-worth-it",
    displayCode: "BOW-R3",
    group: "R",
    statement: "Decide whether extended coverage on a specific item is worth what it costs.",
    whatTheStudentMustDo: [
      "Face a coverage offer at a stated price against a stated failure likelihood.",
      "Decide, and live with whether the item fails.",
      "Weigh the price against the item's replacement cost.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "Warranties always pay off",
      "The item's replacement cost does not matter",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "choose-under-pressure",
  },
  {
    id: "protect-your-information",
    displayCode: "BOW-R4",
    group: "R",
    statement: "Recognise an attempt to steal personal information and take the right protective action.",
    whatTheStudentMustDo: [
      "Handle inbound messages where most are legitimate and some are not.",
      "Act on each one.",
      "Deal with the financial consequence of a wrong action later in the run.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "It looked official so it was",
      "A strong password on one account is enough",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "read-and-judge",
  },

  // ── Group S — Saving and investing ─────────────────────────────────────────────────
  {
    id: "save-toward-a-goal",
    displayCode: "BOW-S1",
    group: "S",
    statement: "Name a reason to save, and build a savings plan that reaches a short-term goal inside a year.",
    whatTheStudentMustDo: [
      "Set a target and a date.",
      "Work out the required per-period amount.",
      "Protect it when something competes for the money.",
    ],
    evidenceRequirements: SAVE_TOWARD_A_GOAL_EVIDENCE,
    misconceptions: [
      "I'll save what's left",
      "A goal is a wish, not a per-period number",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "plan-and-repair",
  },
  {
    id: "how-savings-grow",
    displayCode: "BOW-S2",
    group: "S",
    statement: "Show how principal, interest and time make money grow, including why starting earlier ends up with more.",
    whatTheStudentMustDo: [
      "Separate principal from interest.",
      "Project growth across periods.",
      "Compare two start dates and show the difference.",
    ],
    evidenceRequirements: [],
    misconceptions: ["Interest is a fixed bonus", "Growth is linear"],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "run-it-forward",
  },
  {
    id: "compare-rates",
    displayCode: "BOW-S3",
    group: "S",
    statement: "Compare interest rates across options and show what the better rate is actually worth.",
    whatTheStudentMustDo: [
      "Compare accounts whose rates differ and whose conditions differ.",
      "Pick one.",
      "Show how much sooner the goal arrives on the better rate.",
    ],
    evidenceRequirements: [],
    misconceptions: ["A rate difference that small doesn't matter"],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "run-it-forward",
  },
  {
    id: "weigh-investment-risk",
    displayCode: "BOW-S4",
    group: "S",
    statement: "Compare types of investments by what they might return and what they might lose.",
    whatTheStudentMustDo: [
      "Allocate across asset types with stated ranges.",
      "Live with how the outcomes resolve.",
      "Distinguish the range from the average.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "Higher return with no more risk exists",
      "A familiar brand is safer",
    ],
    gradeBand: "5-8",
    explanationRequired: true,
    assessmentShape: "read-and-judge",
  },
  {
    id: "spread-the-risk",
    displayCode: "BOW-S5",
    group: "S",
    statement: "Show how spreading money across different investments lowers the damage when one of them falls.",
    whatTheStudentMustDo: [
      "Allocate across assets.",
      "Experience an outcome where one asset falls.",
      "Compare against a concentrated allocation.",
    ],
    evidenceRequirements: [],
    misconceptions: [
      "Diversification means owning more of the same thing",
      "Spreading money means giving up all the gain",
    ],
    gradeBand: "5-8",
    explanationRequired: false,
    assessmentShape: "run-it-forward",
  },
] as const;

/** Derived, not restated — a second hand-written index is a second thing to keep in step. */
const COMPETENCY_BY_ID: Record<CompetencyId, Competency> = Object.fromEntries(
  COMPETENCIES.map((competency) => [competency.id, competency]),
) as Record<CompetencyId, Competency>;

export function competencyById(id: CompetencyId): Competency {
  return COMPETENCY_BY_ID[id];
}

/** `undefined` rather than a throw, for the boundaries where the id arrived as a string. */
export function findCompetency(id: string): Competency | undefined {
  return COMPETENCIES.find((competency) => competency.id === id);
}

export function evidenceRequirementsFor(id: CompetencyId): readonly EvidenceRequirement[] {
  return COMPETENCY_BY_ID[id].evidenceRequirements;
}

/**
 * The requirements a world must produce to claim this competency. Optional ones are real
 * evidence and are still scored; they are simply not the bar for claiming coverage.
 */
export function requiredEvidenceRequirementsFor(id: CompetencyId): readonly EvidenceRequirement[] {
  return COMPETENCY_BY_ID[id].evidenceRequirements.filter((requirementRow) => requirementRow.required);
}

export function competenciesInGroup(group: CompetencyGroupId): readonly Competency[] {
  return COMPETENCIES.filter((competency) => competency.group === group);
}
