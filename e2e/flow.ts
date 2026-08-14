import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { COUNT_BONUS_BUTTON, NUMBERS as N } from "./plan";
import { PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";

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

export async function gotoFreshChallenge(page: Page) {
  await page.goto(PLAN_UNDER_PRESSURE.route);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function enterChallenge(page: Page) {
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

export async function completeWorkingCalcs(page: Page, opts: { attendance?: boolean; showcase?: boolean; deposit?: boolean } = {}) {
  await page.getByLabel("Safe cash").fill(String(N.savings + N.basePay));
  await page.locator(".working-setup .calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel("8-week essentials").fill(String(N.essentialsTotal));
  await page.locator(".working-setup .calculation").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: opts.deposit ? "Reserve it now" : "Decide later" }).click();
  if (opts.attendance) await page.locator(".bet").first().getByRole("button", { name: "Count it" }).click();
  if (opts.showcase) await page.locator(".bet").nth(1).getByRole("button", { name: "Count it" }).click();
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

export async function submitDefense(page: Page, text: string, tileIndices: number[] = [0, 2]) {
  for (const index of tileIndices) await page.locator(".interview__stats button").nth(index).click();
  await page.getByLabel("Two to four sentences").fill(text);
  await page.getByRole("button", { name: "Turn in my plan" }).click();
}

/** Reaches the unlocked working-plan board (cousin-room setup, no bonuses) and stops there. */
export async function reachWorkingBoard(page: Page) {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
}

