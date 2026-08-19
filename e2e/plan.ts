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
/**
 * The heading on the fallback check, in both the forms it now takes.
 *
 * It read `"That money never arrives."` — a sentence the screen deliberately stopped saying.
 * That heading, over *"You counted on it. Take it back out of the plan."*, told a student the
 * season had decided something; it has not, and every board after this one still measures from
 * the plan they saved a screen earlier. The screen is a check now and says so, and its title
 * asks the question rather than announcing an outcome.
 *
 * A pattern rather than a string because the title agrees with the number of bonuses being
 * taken out — *it never arrives* for one, *they never arrive* for two — and the tests that use
 * this count zero, one and two between them.
 */
export const BACKUP_HEADING = /What if (it never arrives|they never arrive)\?/;
export const TRIAGE_HEADING = "Something has to give.";

/**
 * What each money moment calls the button that commits it. They differ on purpose — five
 * identically-labelled "Save this version" buttons were the surface reading of five
 * identical screens — so the suite keeps them in one place rather than in sixteen.
 */
/*
 * Two of these were wrong and neither had been noticed, because the only tests that press them
 * are the ones that were failing earlier for other reasons. The fallback screen's button is
 * *Save this check* (`StudentChallenge.tsx:811`) and the last check's is *Save the last check*
 * (`:1259`) — the fallback stopped being called a backup plan when it stopped claiming the
 * season had taken the money, and the two checks were given different words so a student
 * pressing the second one is not pressing the first one again.
 *
 * These five are inline literals in `StudentChallenge.tsx`, so there is nothing here to import
 * and this table is a second copy by necessity rather than by choice. It is the only place in
 * the suite that is still true of, and every entry is quoted with the line it came from.
 */
export const SAVE_LABEL: Record<PlanMode, string> = {
  working: "Save this version",
  fallback: "Save this check",
  "week5-first-response": "Lock in what Avery gives up",
  final: "Save final plan",
  "remaining-risk": "Save the last check",
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
 * Closes the opening plan the way the board now asks for it, and then saves.
 *
 * Two things have to be true before the opening board will close, and a helper that knew about
 * only one of them left half the suite pressing a card that was not on the screen:
 *
 * 1. **Nothing is left unassigned.** While money is still looking for a job the board offers
 *    the shortcut cards, and `into` names which row takes it. Once the plan balances those
 *    cards are gone — they used to be shown at every balance including zero, captioned
 *    "Nothing is left over", which is a question contradicting its own screen.
 * 2. **Every row has been answered for.** A row still holding its untouched `$0` is not a
 *    decision, and the board refuses to close over one. Typing into a row answers it; so does
 *    the row's own "Nothing this season", which is the answer that is not an amount.
 *
 * The second is why this presses whatever "nothing this season" buttons are left rather than
 * assuming three `fill()` calls answered three rows: filling a field that already reads `0`
 * fires no change at all, so a helper that set a row to zero had not touched it as far as the
 * product is concerned — which is exactly the distinction the board exists to make.
 */
export async function saveOpeningPlan(page: Page, into: CategoryId = "flexibleCash") {
  const card = restCard(page, into);
  if (await card.count() > 0) await card.click();
  const unanswered = page.getByRole("button", { name: /— nothing this season$/ });
  for (let guard = 0; guard < 3 && await unanswered.count() > 0; guard += 1) {
    await unanswered.first().click();
  }
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
