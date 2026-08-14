import type { Page } from "@playwright/test";
import { SCENARIO_NUMBERS as N } from "../src/domain/scenario/numbers";
import { formatDollars } from "../src/domain/core/money";
import { BASKETBALL_SCENARIO } from "../src/domain/scenario/worlds/basketball";
import type { SetupId } from "../src/domain/core/ids";
import type { PlanMode } from "../src/domain/finance/types";
import { CHOICE_LABELS } from "../src/components/financial/choices";

/**
 * Strings the app builds from the scenario, rebuilt the same way here. Writing "$800" into
 * a selector makes the suite a second place the model is priced, which is exactly the
 * drift `src/domain/scenario/pricing.test.ts` exists to stop.
 */
export const money = formatDollars;
export const COMPLETION_LABEL = BASKETBALL_SCENARIO.incomeCopy.completion.label;
export const NO_BONUS_HEADING = `Test the plan without the ${money(N.completionIncome)}.`;
export const COUNT_BONUS_BUTTON = `Count the ${money(N.completionIncome)}`;

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
  const week5 = mode === "week5-first-response" || mode === "final" || mode === "remaining-risk";
  const clinicsCounted = (mode === "final" || mode === "remaining-risk") && context.clinics;
  return (
    N.setupCosts[context.setupId]
    + N.essentialsTotal
    + (week5 ? N.requiredWeek5Cost + N.setupEventCosts[context.setupId] : 0)
    + (clinicsCounted ? N.optionalWorkCost : 0)
    + (context.deposit ? N.course.depositPrice : 0)
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
export function splitFor(spendable: number, step: number): { goal: number; reserve: number; flexible: number } {
  const usable = Math.max(0, spendable);
  const goal = Math.min(N.course.fullPrice, Math.floor(usable / step) * step);
  const rest = usable - goal;
  const reserve = Math.floor(rest / 2 / step) * step;
  return { goal, reserve, flexible: rest - reserve };
}

/** Fills the board so the plan lands on exactly zero for the mode being shown. */
export async function fillPlanToBalance(page: Page, mode: PlanMode, context: PlanContext) {
  const step = mode === "working" || mode === "fallback" ? N.openingIncrement : N.repairIncrement;
  const { goal, reserve, flexible } = splitFor(spendableFor(mode, context), step);
  await setAmount(page, CHOICE_LABELS.goal, goal);
  await setAmount(page, CHOICE_LABELS.reserve, reserve);
  await setAmount(page, CHOICE_LABELS.flexibleCash, flexible);
  return { goal, reserve, flexible };
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
