import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { SAVE_LABEL, fillPlanToBalance, savePlan, week5TotalFor, type PlanContext } from "./plan";
import {
  completeSetupStage,
  createClass,
  enterChallenge,
  passWeek5Calculation,
  playSeasonWeeks,
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
  test(`walkthrough at ${size.name}`, async ({ page, request }) => {
    test.skip(!OUT, "set WALKTHROUGH_OUT to capture the walkthrough");
    test.setTimeout(180_000);
    await mkdir(OUT!, { recursive: true });
    await page.setViewportSize({ width: size.width, height: size.height });

    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console error — ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`page error — ${error.message}`));

    // A full-page screenshot pins sticky elements to the top of the *image*, so the
    // challenge topbar was covering the heading of every stage it was meant to sit above —
    // which made the captures unreadable for exactly the review they exist for. Sticky is
    // released for the shot and restored straight after, so the artefact shows the page
    // and the running product still behaves as designed.
    const shoot = async (name: string) => {
      await page.waitForTimeout(650); // let stage entrance animations settle
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) problems.push(`${name}: horizontal overflow ${overflow}px`);
      await page.addStyleTag({ content: "[class*='topbar'], .season-ledger { position: static !important; }" });
      await page.screenshot({ path: `${OUT}/${size.name}-${name}.png`, fullPage: true });
      await page.evaluate(() => document.querySelectorAll("style").forEach((tag) => {
        if (tag.textContent?.includes("position: static !important")) tag.remove();
      }));
    };

    await page.goto("/");
    await shoot("01-home");

    const created = await createClass(request, `Walkthrough ${size.name}`);
    await gotoFreshChallenge(page);
    await shoot("02-opening");
    await enterChallenge(page, { classCode: created.code });
    await shoot("03-deal-and-places");
    await shoot("04-rank-the-places");
    await completeSetupStage(page, 2, () => shoot("05-setup"));

    const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
    await completeWorkingCalcs(page, { attendance: true, showcase: true });
    await shoot("05b-count-the-bonuses");
    await fillPlanToBalance(page, "working", context);
    await shoot("06-working-plan");
    await page.getByRole("button", { name: SAVE_LABEL.working }).click();

    await shoot("07a-bonus-pulled");
    await fillPlanToBalance(page, "fallback", context);
    await shoot("07-fallback");
    await page.getByRole("button", { name: SAVE_LABEL.fallback }).click();
    await shoot("08-season-week-1");

    for (const week of [2, 3, 4]) {
      await page.getByRole("button", { name: `Play Week ${week}` }).click();
      if (week === 4) await shoot("08b-season-week-4");
    }
    await page.getByRole("button", { name: "Wait and decide later" }).click();
    await shoot("08c-deposit-deadline");
    await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();
    await shoot("09-week5-reveal");
    const tiles = page.locator(".gap-tiles button");
    for (let index = 0; index < (await tiles.count()); index += 1) await tiles.nth(index).click();
    await page.getByLabel("Total change to Avery’s money").fill(String(week5TotalFor(context)));
    await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
    await shoot("10-first-response");

    await savePlan(page, "week5-first-response", context);
    await shoot("11-opportunity");

    await decideOpportunity(page, { clinics: true, countBonus: true });
    const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
    await fillPlanToBalance(page, "final", landed);
    await shoot("12-final-plan");
    await page.getByRole("button", { name: SAVE_LABEL.final }).click();

    await fillPlanToBalance(page, "remaining-risk", landed);
    await shoot("13-remaining-risk");
    await page.getByRole("button", { name: SAVE_LABEL["remaining-risk"] }).click();
    await shoot("13b-week8-resolution");

    await page.getByRole("button", { name: "Explain my plan" }).click();
    await shoot("14-defense");
    await submitDefense(page, "My plan still works because it balances after Week 5. I protected the course money and gave up the open Saturdays to take the clinics.");
    await shoot("15-submitted");

    // A second student, so the class views have a class in them.
    for (const [seat, index] of [["21", 0], ["22", 1]] as const) {
      const other: PlanContext = { setupId: index === 0 ? "gym-sublet" : "teammate-share" };
      await gotoFreshChallenge(page);
      await enterChallenge(page, { classCode: created.code, seatCode: seat });
      await completeSetupStage(page, index);
      await completeWorkingCalcs(page);
      await savePlan(page, "working", other);
      await playSeasonWeeks(page, { deposit: index === 1 });
      await passWeek5Calculation(page, String(week5TotalFor(other)));
      await savePlan(page, "week5-first-response", { ...other, deposit: index === 1 });
      await decideOpportunity(page, { clinics: index === 0, countBonus: false });
      await savePlan(page, "final", { ...other, deposit: index === 1, clinics: index === 0, countCompletionFinal: false });
      await page.getByRole("button", { name: "Explain my plan" }).click();
      await submitDefense(page, `Seat ${seat}: my plan still works because every dollar has a job after Week 5. I protected the course money and gave up part of the reserve.`);
      await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible({ timeout: 15_000 });
    }

    const evidence = `/educator/class/${created.code}?key=${created.teacherKey}`;
    for (const [name, path] of [
      ["15b-class-setup", "/educator/classes/new"],
      ["15c-real-class", evidence],
      ["15d-real-student", `/educator/class/${created.code}/students/21?key=${created.teacherKey}`],
      ["15e-debrief", `/educator/class/${created.code}/debrief?key=${created.teacherKey}`],
      ["16-educator-guide", "/educator/guide"],
      ["17-demo-evidence", "/educator/demo"],
      ["18-concept-drilldown", "/educator/demo/concepts/contingency"],
      ["19-seat-14", "/educator/demo/students/14"],
      ["20-reasoning", "/educator/demo/students/14/reasoning"],
      ["21-standards", "/educator/demo/standards"],
      ["22-companion", "/educator/teaching-companion"],
    ] as const) {
      await page.goto(path);
      await shoot(name);
    }

    expect(problems, `${size.name}: ${problems.join("; ")}`).toEqual([]);
  });
}
