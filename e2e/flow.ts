import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { NUMBERS as N } from "./plan";

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
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function enterChallenge(page: Page) {
  await page.getByRole("button", { name: "Start the eight weeks" }).click();
  await page.getByRole("button", { name: "Find Avery a place" }).click();
}

export const SETUP_ORDER = ["gym-sublet", "teammate-share", "cousin-room"] as const;

/** Both comparison calculations must be answered correctly no matter which setup is chosen. */
export async function completeSetupStage(page: Page, chosenIndex: 0 | 1 | 2) {
  await page.getByLabel("Full eight-week cost").first().fill(String(N.setupCosts["teammate-share"]));
  await page.locator(".place-card").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Full eight-week cost").nth(1).fill(String(N.setupCosts["cousin-room"]));
  await page.locator(".place-card").nth(2).getByRole("button", { name: "Check" }).click();
  await page.locator(".place-card").nth(chosenIndex).getByRole("button", { name: "Choose this setup" }).click();
  await page.getByRole("button", { name: "Build the plan" }).click();
}

export async function completeWorkingCalcs(page: Page, opts: { attendance?: boolean; showcase?: boolean } = {}) {
  await page.getByLabel("Safe cash").fill(String(N.savings + N.basePay));
  await page.locator(".working-setup .calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel("8-week essentials").fill(String(N.essentialsTotal));
  await page.locator(".working-setup .calculation").nth(1).getByRole("button", { name: "Check" }).click();
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
  await page.getByRole("button", { name: opts.countBonus ? "Count the $800" : "Plan without it" }).click();
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

