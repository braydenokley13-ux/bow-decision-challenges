import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { fillPlanToBalance, week5TotalFor, type PlanContext } from "./plan";
import {
  completeSetupStage,
  completeWorkingCalcs,
  decideOpportunity,
  gotoFreshChallenge,
  submitDefense,
} from "./flow";

/**
 * The rendered product, at the sizes schools actually use.
 *
 * This drives the same helpers the assertion suite uses, so the two cannot drift apart,
 * and captures every stage so the visuals can be reviewed rather than assumed. Run it with
 * `npm run walkthrough`; it is skipped otherwise, because its job is to produce artefacts
 * for a person to look at, not to pass.
 */
const OUT = process.env.WALKTHROUGH_OUT;

const SIZES = [
  { name: "1366", width: 1366, height: 768 },
  { name: "1024", width: 1024, height: 600 },
  { name: "narrow", width: 640, height: 720 },
];

for (const size of SIZES) {
  test(`walkthrough at ${size.name}`, async ({ page }) => {
    test.skip(!OUT, "set WALKTHROUGH_OUT to capture the walkthrough");
    test.setTimeout(180_000);
    await mkdir(OUT!, { recursive: true });
    await page.setViewportSize({ width: size.width, height: size.height });

    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console error — ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`page error — ${error.message}`));

    const shoot = async (name: string) => {
      await page.waitForTimeout(650); // let stage entrance animations settle
      await page.screenshot({ path: `${OUT}/${size.name}-${name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) problems.push(`${name}: horizontal overflow ${overflow}px`);
    };

    await page.goto("/");
    await shoot("01-home");

    await gotoFreshChallenge(page);
    await shoot("02-opening");
    await page.getByRole("button", { name: "Start the eight weeks" }).click();
    await shoot("03-deal");
    await page.getByRole("button", { name: "Find Avery a place" }).click();
    await completeSetupStage(page, 2);
    await shoot("05-setup");

    const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
    await completeWorkingCalcs(page, { attendance: true, showcase: true });
    await fillPlanToBalance(page, "working", context);
    await shoot("06-working-plan");
    await page.getByRole("button", { name: "Save this version" }).click();

    await fillPlanToBalance(page, "fallback", context);
    await shoot("07-fallback");
    await page.getByRole("button", { name: "Save this version" }).click();
    await shoot("08-week5-transition");

    await page.getByRole("button", { name: "Play Week 5" }).click();
    await shoot("09-week5-reveal");
    const tiles = page.locator(".gap-tiles button");
    for (let index = 0; index < (await tiles.count()); index += 1) await tiles.nth(index).click();
    await page.getByLabel("Total change to Avery’s money").fill(String(week5TotalFor(context)));
    await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
    await shoot("10-first-response");

    await fillPlanToBalance(page, "week5-first-response", context);
    await page.getByRole("button", { name: "Save this version" }).click();
    await shoot("11-opportunity");

    await decideOpportunity(page, { clinics: true, countBonus: true });
    const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
    await fillPlanToBalance(page, "final", landed);
    await shoot("12-final-plan");
    await page.getByRole("button", { name: "Save final plan" }).click();

    await fillPlanToBalance(page, "remaining-risk", landed);
    await shoot("13-remaining-risk");
    await page.getByRole("button", { name: "Save preview" }).click();

    await shoot("14-defense");
    await submitDefense(page, "My plan still works because it balances after Week 5. I protected the course money and gave up the open Saturdays to take the clinics.");
    await shoot("15-submitted");

    for (const [name, path] of [
      ["16-educator-guide", "/educator/guide"],
      ["17-educator-class", "/educator/class"],
      ["18-concept-drilldown", "/educator/class/concepts/contingency"],
      ["19-seat-14", "/educator/class/students/14"],
      ["20-reasoning", "/educator/class/students/14/reasoning"],
      ["21-standards", "/educator/class/standards"],
      ["22-companion", "/educator/teaching-companion"],
    ] as const) {
      await page.goto(path);
      await shoot(name);
    }

    expect(problems, `${size.name}: ${problems.join("; ")}`).toEqual([]);
  });
}
