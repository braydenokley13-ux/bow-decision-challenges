import type { Page } from "@playwright/test";
import { SCENARIO_NUMBERS as N } from "../src/domain/scenario/numbers";
import { formatDollars } from "../src/domain/core/money";
import { BASKETBALL_SCENARIO } from "../src/domain/scenario/worlds/basketball";
import type { CategoryId, SetupId } from "../src/domain/core/ids";
import type { PlanMode } from "../src/domain/finance/types";
import { CHOICE_LABELS } from "../src/components/financial/choices";

/**
 * Strings the app builds from the scenario, rebuilt the same way here. Writing "$800" into
 * a selector makes the suite a second place the model is priced, which is exactly the
 * drift `src/domain/scenario/pricing.test.ts` exists to stop.
 */
export const money = formatDollars;
export const COMPLETION_LABEL = BASKETBALL_SCENARIO.incomeCopy.completion.label;
export const NO_BONUS_HEADING = `Now show it works without the ${money(N.completionIncome)}.`;
export const COUNT_BONUS_BUTTON = "Yes — count on it";
export const BACKUP_HEADING = "That money never arrives.";
export const TRIAGE_HEADING = "Something has to give.";

/**
 * What each money moment calls the button that commits it. They differ on purpose — five
 * identically-labelled "Save this version" buttons were the surface reading of five
 * identical screens — so the suite keeps them in one place rather than in sixteen.
 */
export const SAVE_LABEL: Record<PlanMode, string> = {
  working: "Save this version",
  fallback: "Save the backup plan",
  "week5-first-response": "Lock in what Avery gives up",
  final: "Save final plan",
  "remaining-risk": "Save this check",
};

/**
 * The browser suite reads its dollar amounts from the scenario, exactly as the grader does.
 * Hardcoding them here meant every re-pricing of the model broke sixteen tests for reasons
 * that had nothing to do with the behaviour they were checking.
 */

export interface PlanContext {
  setupId: SetupId;
  countCompletion?: boolean;
  countOutcome?: boolean;
  countCompletionFinal?: boolean;
  clinics?: boolean;
  deposit?: boolean;
}

export function availableFor(mode: PlanMode, context: PlanContext): number {
  const reliable = N.savings + N.basePay;
  switch (mode) {
    case "working":
      return reliable + (context.countCompletion ? N.completionIncome : 0) + (context.countOutcome ? N.outcomeIncome : 0);
    case "fallback":
      return reliable;
    case "week5-first-response":
      return reliable + (context.countCompletion ? N.completionIncome : 0);
    case "final":
      return reliable + (context.countCompletionFinal ? N.completionIncome : 0) + (context.clinics ? N.optionalWorkIncome : 0);
    case "remaining-risk":
      return reliable + (context.clinics ? N.optionalWorkIncome : 0);
  }
}

export function lockedFor(mode: PlanMode, context: PlanContext): number {
  // The seat is reserved at the Week 4 deadline, which is after the opening plan and its
  // backup are saved, so those two boards never carry the deposit as a locked cost.
  const week5 = mode === "week5-first-response" || mode === "final" || mode === "remaining-risk";
  const clinicsCounted = (mode === "final" || mode === "remaining-risk") && context.clinics;
  return (
    N.setupCosts[context.setupId]
    + N.essentialsTotal
    + (week5 ? N.requiredWeek5Cost + N.setupEventCosts[context.setupId] : 0)
    + (clinicsCounted ? N.optionalWorkCost : 0)
    + (week5 && context.deposit ? N.course.depositPrice : 0)
  );
}

export function spendableFor(mode: PlanMode, context: PlanContext): number {
  return availableFor(mode, context) - lockedFor(mode, context);
}

/** The total change Week 5 makes to the plan the student built. */
export function week5TotalFor(context: PlanContext): number {
  return (context.countOutcome ? N.outcomeIncome : 0) + N.requiredWeek5Cost + N.setupEventCosts[context.setupId];
}

async function setAmount(page: Page, label: string, value: number) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(String(value));
  await field.press("Tab");
}

/** Splits whatever is spendable across the three rows, course first up to its cap. */
export function splitFor(spendable: number, step: number, courseCap: number = N.course.fullPrice): { goal: number; reserve: number; flexible: number } {
  const usable = Math.max(0, spendable);
  const goal = Math.min(courseCap, Math.floor(usable / step) * step);
  const rest = usable - goal;
  const reserve = Math.floor(rest / 2 / step) * step;
  return { goal, reserve, flexible: rest - reserve };
}

/**
 * The card that sends what is left to one row, found by the row it feeds.
 *
 * Not by its wording: the wording carries the amount and, on the capped course row, what that
 * row can hold — both of which move with the plan and neither of which a test should be
 * restating.
 */
export function restCard(page: Page, category: CategoryId) {
  return page.locator(`.closer-choice button[data-category="${category}"]`);
}

/**
 * Closes the opening plan the way every student now closes it: name the row that takes what
 * is left, then save.
 *
 * The naming used to be optional — the cards only appeared while money was unassigned — so a
 * student who typed three figures that balanced exactly committed the board without ever being
 * asked, and the one evidence requirement this challenge produces from a statement rather than
 * from arithmetic was never observed for them at all. The cards are now the way the opening
 * board closes, at any amount, so this helper presses both.
 */
export async function saveOpeningPlan(page: Page, into: CategoryId = "flexibleCash") {
  await restCard(page, into).click();
  await page.getByRole("button", { name: SAVE_LABEL.working }).click();
}

/** Fills the plan to zero and commits it, whatever this moment calls committing. */
export async function savePlan(page: Page, mode: PlanMode, context: PlanContext) {
  await fillPlanToBalance(page, mode, context);
  if (mode === "working") {
    await saveOpeningPlan(page);
    return;
  }
  await page.getByRole("button", { name: SAVE_LABEL[mode] }).click();
}

/** Fills the board so the plan lands on exactly zero for the mode being shown. */
export async function fillPlanToBalance(page: Page, mode: PlanMode, context: PlanContext) {
  const step = mode === "working" || mode === "fallback" ? N.openingIncrement : N.repairIncrement;
  // A reserved seat is already paid, so the course row is locked at zero on later boards.
  const reservedAlready = context.deposit && mode !== "working" && mode !== "fallback";
  const { goal, reserve, flexible } = splitFor(spendableFor(mode, context), step, reservedAlready ? 0 : Number(N.course.fullPrice));
  if (!reservedAlready) await setAmount(page, CHOICE_LABELS.goal, goal);
  await setAmount(page, CHOICE_LABELS.reserve, reserve);
  await setAmount(page, CHOICE_LABELS.flexibleCash, flexible);
  return { goal, reserve, flexible };
}

/**
 * Closes the opening plan the way the board asks for it: two rows set by hand, and the
 * third named as the one that takes what is left.
 *
 * That press is the one statement this world records about savings, so a suite that only
 * ever typed three exact numbers produced runs whose savings requirement was never observed
 * — which is a true reading of those runs and a useless one for anything downstream.
 * `leftoversInto` is which row is named: the goal row is the "savings is whatever is left"
 * behaviour, and the time row is a deliberate figure set before it.
 */
export async function closeOpeningByNamingTheRest(page: Page, context: PlanContext, leftoversInto: "goal" | "flexibleCash") {
  const spendable = spendableFor("working", context);
  const step = N.openingIncrement;
  const cap = Number(N.course.fullPrice);
  const down = (value: number) => Math.max(0, Math.floor(value / step) * step);
  // What the named row is left holding. The course row is capped at what the course costs,
  // so the amount it can be handed has to fit inside that or the one press cannot close the
  // plan at all.
  const rest = leftoversInto === "goal" ? Math.min(cap, down(spendable / 3)) : down(spendable / 3);
  const others = spendable - rest;
  if (leftoversInto === "goal") {
    const reserve = down(others / 2);
    await setAmount(page, CHOICE_LABELS.reserve, reserve);
    await setAmount(page, CHOICE_LABELS.flexibleCash, others - reserve);
  } else {
    const goal = Math.min(cap, down(others / 2));
    await setAmount(page, CHOICE_LABELS.goal, goal);
    await setAmount(page, CHOICE_LABELS.reserve, others - goal);
  }
  await saveOpeningPlan(page, leftoversInto);
}

/**
 * Fills the fallback board so a known amount is still missing, which is what the "save it
 * anyway and say so" path is for.
 */
export async function fillPlanLeavingShortfall(page: Page, mode: PlanMode, context: PlanContext, shortfall: number) {
  const step = mode === "working" || mode === "fallback" ? N.openingIncrement : N.repairIncrement;
  const { goal, reserve, flexible } = splitFor(spendableFor(mode, context) + shortfall, step);
  await setAmount(page, CHOICE_LABELS.goal, goal);
  await setAmount(page, CHOICE_LABELS.reserve, reserve);
  await setAmount(page, CHOICE_LABELS.flexibleCash, flexible);
}

export { N as NUMBERS };
