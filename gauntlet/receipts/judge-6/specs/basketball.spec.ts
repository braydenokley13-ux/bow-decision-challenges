import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { CHOICE_LABELS } from "../src/components/financial/choices";
import { NUMBERS, SAVE_LABEL, fillPlanToBalance, savePlan, saveOpeningPlan, week5TotalFor, type PlanContext } from "../e2e/plan";
import {
  completeSetupStage, createClass, enterChallenge, setAmount, PLAN_STEP,
  decideOpportunity, gotoFreshChallenge, submitDefense, MOVED_TILES, TO_DEPOSIT,
} from "../e2e/flow";

const OUT = "/tmp/judge-6-shots/bb";

test("basketball, viewport shots, 1366x768", async ({ page, request }) => {
  await mkdir(OUT, { recursive: true });
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console error — ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`page error — ${e.message}`));

  const metrics: any[] = [];
  const shoot = async (name: string) => {
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    // viewport shot: what a student actually sees on arrival
    await page.screenshot({ path: `${OUT}/${name}--viewport.png` });
    await page.screenshot({ path: `${OUT}/${name}--full.png`, fullPage: true });
    metrics.push({ name, overflow, scrollH, viewportH: 768, scrolls: +(scrollH / 768).toFixed(2) });
    console.log("SHOT", JSON.stringify(metrics.at(-1)));
  };

  await page.goto("/");
  await shoot("01-home");
  const created = await createClass(request, "Judge 6");
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode: created.code });
  await shoot("02-rank-places");
  await completeSetupStage(page, 2, () => shoot("03-setup-cards"));
  const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
  await shoot("04-q1-count-on");
  await page.getByLabel(PLAN_STEP.countOn).fill(String(NUMBERS.savings + NUMBERS.basePay));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await shoot("05-q1-answered");
  await page.getByRole("button", { name: PLAN_STEP.toBonuses }).click();
  await page.locator(".bet").first().getByRole("button", { name: PLAN_STEP.countBonus }).click();
  await page.locator(".bet").nth(1).getByRole("button", { name: PLAN_STEP.countBonus }).click();
  await shoot("06-q2-bonuses");
  await page.getByRole("button", { name: PLAN_STEP.toCommitted }).click();
  await shoot("07-q3-owed");
  await page.getByLabel(PLAN_STEP.committed).fill(String(NUMBERS.essentialsTotal));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: PLAN_STEP.toPlan }).click();
  await shoot("08-q4-board-empty");
  await fillPlanToBalance(page, "working", context);
  await shoot("09-q4-board-balanced");
  await setAmount(page, CHOICE_LABELS.flexibleCash, "0");
  await saveOpeningPlan(page);
  await shoot("10-fallback-arrive");
  await fillPlanToBalance(page, "fallback", context);
  await shoot("11-fallback-balanced");
  await page.getByRole("button", { name: SAVE_LABEL.fallback }).click();
  await shoot("12-season-weeks");
  // Press the forward button before the week is answered — the refusal state.
  await page.getByRole("button", { name: TO_DEPOSIT }).click();
  await shoot("12b-refused-forward");
  await page.locator(".claims__list button").nth(0).click();
  await shoot("12c-claim-funded");
  await page.locator(".claims__why button").nth(0).click();
  await page.getByRole("button", { name: TO_DEPOSIT }).click();
  await shoot("13-deposit-deadline");
  await page.getByRole("button", { name: "Wait and decide later" }).click();
  await shoot("14-deposit-chosen");
  await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();
  await shoot("15-week5-reveal");
  const tiles = page.locator(MOVED_TILES);
  for (let i = 0; i < (await tiles.count()); i += 1) await tiles.nth(i).click();
  await shoot("16-week5-tiles-picked");
  await page.getByLabel("Total change to Avery’s money").fill(String(week5TotalFor(context)));
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
  await shoot("17-week5-triage");
  await savePlan(page, "week5-first-response", context);
  await shoot("18-opportunity");
  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await shoot("19-final-plan-empty");
  await fillPlanToBalance(page, "final", landed);
  await shoot("20-final-plan");
  await page.getByRole("button", { name: SAVE_LABEL.final }).click();
  await shoot("21-remaining-risk");
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: SAVE_LABEL["remaining-risk"] }).click();
  await shoot("22-week8-resolution");
  await page.getByRole("button", { name: "Explain my plan" }).click();
  await shoot("23-defense-empty");
  await submitDefense(page, "My plan still balances after Week 5. I kept the full $1,200 for the course and gave up my Saturdays to coach the clinics, which brought in $500.");
  await shoot("24-submitted");
  await page.goto("/home");
  await shoot("25-student-home-after");

  console.log("CLASSCODE", created.code, created.teacherKey);
  console.log("PROBLEMS", JSON.stringify(problems, null, 1));
  console.log("METRICS", JSON.stringify(metrics, null, 1));
});
