/**
 * Resilience-2 driver surface. Re-exports the product's own e2e flow helpers so the browser
 * experiments in this directory press the same buttons the shipped suite presses, plus the
 * unit suite's real-reducer run builder for the experiments that need a valid evidence log
 * without a browser. Nothing here is product code and nothing here is imported by product code.
 */
import type { Page } from "@playwright/test";
import {
  completeSetupStage, completeWorkingCalcs, decideOpportunity, passWeek5Calculation,
  playSeasonWeeks, readWeek8Resolution, submitDefense,
} from "../../../e2e/flow";
import { savePlan, week5TotalFor, type PlanContext } from "../../../e2e/plan";

export { buildSubmission } from "../../../src/test/runChallenge";
export {
  completeSetupStage, completeWorkingCalcs, decideOpportunity, passWeek5Calculation,
  playSeasonWeeks, readWeek8Resolution, submitDefense,
} from "../../../e2e/flow";
export { savePlan, week5TotalFor } from "../../../e2e/plan";

/** The whole run, from the world picker to the button that turns it in. */
export async function playThrough(page: Page, opts: { stopBefore?: "turnIn" } = {}): Promise<void> {
  await page.getByRole("button", { name: /Start this one/ }).first().click();
  const deal = page.getByRole("button", { name: "Find Avery a place" });
  await deal.waitFor({ timeout: 15000 });
  await deal.click();
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  const context: PlanContext = { setupId: "cousin-room" };
  await savePlan(page, "working", context);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await savePlan(page, "week5-first-response", context);
  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await savePlan(page, "final", landed);
  await savePlan(page, "remaining-risk", landed);
  await readWeek8Resolution(page);
  if (opts.stopBefore === "turnIn") return;
  await submitDefense(page, "My plan still works because every dollar has a job after Week 5. I protected the course goal and gave up the open rest block.");
}

/** The defence screen, filled in but not turned in. Returns the click that turns it in. */
export async function fillDefence(page: Page, text: string): Promise<void> {
  const figures: string[] = [];
  for (const index of [0, 2]) {
    const tile = page.locator(".interview__stats button").nth(index);
    await tile.click();
    figures.push((await tile.locator(".money").innerText()).trim());
  }
  await page.getByLabel("Two to four sentences").fill(`${text} The numbers I stood on are ${figures.join(" and ")}.`);
}
