import { expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { COUNT_BONUS_BUTTON, NUMBERS as N } from "./plan";
import { PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import { weeksBeforeDisruption } from "../src/domain/scenario/season";
import type { ClassCreation } from "../src/platform/classes/types";

/**
 * One driver for both the assertion suite and the screenshot walkthrough.
 *
 * These used to be two copies of the same click sequence with slightly different
 * selectors — `scripts/walkthrough.mjs` and `e2e/bow.spec.ts` — which meant a change to
 * the student flow had to be made twice and could silently be made only once.
 */

// ---------------------------------------------------------------------------
// Shared a11y + copy assertions
// ---------------------------------------------------------------------------

export async function noSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

export async function noStaleCopy(page: Page) {
  const body = page.locator("body");
  await expect(body).not.toContainText(/fashion/i);
  await expect(body).not.toContainText(/coming soon/i);
}

export async function noHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
}

// ---------------------------------------------------------------------------
// Student-flow helpers. Every helper composes the exact accessible names the
// app renders today so tests read like the steps a student actually takes.
// ---------------------------------------------------------------------------

/**
 * A real class, created through the real API. Every student path in this suite joins one,
 * because a suite that started the challenge without a class would not be exercising the
 * thing a pilot depends on.
 */
export async function createClass(request: APIRequestContext, label = "Browser suite"): Promise<ClassCreation> {
  const response = await request.post("http://127.0.0.1:4180/api/classes", {
    data: { label, challengeId: PLAN_UNDER_PRESSURE.id },
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = (await response.json()) as ClassCreation;
  CREATED_KEYS.set(created.code, created.teacherKey);
  return created;
}

/**
 * The key for a class the suite created. The fixture keeps only the code, and reading a
 * class back is the educator's job — so the test asks the API for its own class the same
 * way the setup page did.
 */
const CREATED_KEYS = new Map<string, string>();

export function createClassKeyFor(code: string): string {
  const known = CREATED_KEYS.get(code);
  if (!known) throw new Error(`No teacher key recorded for class ${code}.`);
  return known;
}

export async function gotoFreshChallenge(page: Page) {
  await page.goto(PLAN_UNDER_PRESSURE.route);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Joins the class and steps past the contract. Seats differ so runs never collide. */
export async function enterChallenge(page: Page, options: { classCode: string; seatCode?: string }) {
  await page.getByLabel("Class code").fill(options.classCode);
  await page.getByLabel("Seat", { exact: true }).fill(options.seatCode ?? "7");
  await page.getByRole("button", { name: "Start the eight weeks" }).click();
  await page.getByRole("button", { name: "Find Avery a place" }).click();
}

export const SETUP_ORDER = ["gym-sublet", "teammate-share", "cousin-room"] as const;

/** Titles as the cards render them, so the ranking helper can find each row. */
export const SETUP_TITLES: Record<(typeof SETUP_ORDER)[number], string> = {
  "gym-sublet": "Gym District Sublet",
  "teammate-share": "Teammate Share",
  "cousin-room": "Cousin\u2019s Spare Room",
};

/**
 * Order the three places cheapest-first over eight weeks, pick one, and total it. The
 * ranking is done with the move buttons so the path is the keyboard-operable one.
 */
/** Puts the three places in true cheapest-first order using the move buttons. */
export async function rankPlacesCorrectly(page: Page) {
  const cheapestFirst = [...SETUP_ORDER].sort((a, b) => N.setupCosts[a] - N.setupCosts[b]);
  for (let target = 0; target < cheapestFirst.length; target += 1) {
    const wanted = cheapestFirst[target];
    const title = SETUP_TITLES[wanted];
    for (let guard = 0; guard < 4; guard += 1) {
      const rows = page.locator(".rank-list li");
      const positions = await rows.allInnerTexts();
      const current = positions.findIndex((text) => text.includes(title));
      if (current === target) break;
      await rows.nth(current).getByRole("button", { name: `Move ${title} earlier` }).click();
    }
  }
  await page.getByRole("button", { name: "Check the order" }).click();
}

export async function completeSetupStage(page: Page, chosenIndex: 0 | 1 | 2, onCards?: () => Promise<void>) {
  await rankPlacesCorrectly(page);
  await page.locator(".place-card").nth(chosenIndex).getByRole("button", { name: "Choose this setup" }).click();
  const chosen = SETUP_ORDER[chosenIndex];
  await page.getByLabel(`What the ${SETUP_TITLES[chosen]} costs Avery`).fill(String(N.setupCosts[chosen]));
  await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
  await onCards?.();
  await page.getByRole("button", { name: "Build the plan" }).click();
}

/** What the planning screen calls each of its first three steps. */
export const PLAN_STEP = {
  countOn: "What Avery can count on",
  bonuses: "Bonuses that might happen",
  committed: "Money already spoken for",
  countBonus: "Yes — count on it",
  leaveBonus: "No — leave it out",
} as const;

/**
 * Steps 1 to 3 of the plan. They are revealed in order — step 3 does not exist until
 * step 1 is right — so this walks them rather than filling a form.
 */
export async function completeWorkingCalcs(page: Page, opts: { attendance?: boolean; showcase?: boolean } = {}) {
  await page.getByLabel(PLAN_STEP.countOn).fill(String(N.savings + N.basePay));
  await page.locator(".calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel(PLAN_STEP.committed).fill(String(N.essentialsTotal));
  await page.locator(".calculation").last().getByRole("button", { name: "Check" }).click();
  if (opts.attendance) await page.locator(".bet").first().getByRole("button", { name: PLAN_STEP.countBonus }).click();
  if (opts.showcase) await page.locator(".bet").nth(1).getByRole("button", { name: PLAN_STEP.countBonus }).click();
}

/**
 * Plays Weeks 1–4 one at a time and answers the course-deposit deadline that closes them.
 * The weeks are stepped rather than skipped because stepping is what a student does.
 */
export async function playSeasonWeeks(page: Page, opts: { deposit?: boolean } = {}) {
  for (const week of weeksBeforeDisruption(N).slice(1)) {
    await page.getByRole("button", { name: `Play Week ${week}` }).click();
  }
  await page.getByRole("button", { name: opts.deposit ? "Reserve it now" : "Wait and decide later" }).click();
  await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();
}

export async function setAmount(page: Page, label: string, value: string) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(value);
  await field.press("Tab");
}



/** Selects every gap tile shown (they are exactly the components of the expected total) and checks the sum. */
export async function passWeek5Calculation(page: Page, total: string) {
  const tiles = page.locator(".gap-tiles button");
  const count = await tiles.count();
  for (let i = 0; i < count; i += 1) await tiles.nth(i).click();
  await page.getByLabel("Total change to Avery’s money").fill(total);
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
}

export async function decideOpportunity(page: Page, opts: { clinics: boolean; countBonus: boolean }) {
  await page.getByRole("button", { name: opts.clinics ? "Take the clinics" : "Keep the Saturdays" }).click();
  await page.getByRole("button", { name: opts.countBonus ? COUNT_BONUS_BUTTON : "Plan without it" }).click();
}

/** Week 8 resolves the season before the student explains it. */
export async function readWeek8Resolution(page: Page) {
  await expect(page.getByRole("heading", { name: "The season ends." })).toBeVisible();
  await page.getByRole("button", { name: "Explain my plan" }).click();
}

export async function submitDefense(page: Page, text: string, tileIndices: number[] = [0, 2]) {
  for (const index of tileIndices) await page.locator(".interview__stats button").nth(index).click();
  await page.getByLabel("Two to four sentences").fill(text);
  await page.getByRole("button", { name: "Turn in my plan" }).click();
}

/** Reaches the unlocked working-plan board (cousin-room setup, no bonuses) and stops there. */
export async function reachWorkingBoard(page: Page, classCode: string) {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
}

/** Waits for the finished attempt to actually reach the class before reading it back. */
export async function waitForDelivery(page: Page) {
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible({ timeout: 15_000 });
}

