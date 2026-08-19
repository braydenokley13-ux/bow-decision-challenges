import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import {
  createClass, enterChallenge, completeSetupStage, completeWorkingCalcs, playSeasonWeeks,
  passWeek5Calculation, decideOpportunity, PLAN_STEP, seedRuns, createClassKeyFor,
} from "../../../../e2e/flow";
import { BACKUP_HEADING, NO_BONUS_HEADING, TRIAGE_HEADING, NUMBERS as N, fillPlanToBalance, fillPlanLeavingShortfall, money, savePlan, saveOpeningPlan, week5TotalFor, type PlanContext } from "../../../../e2e/plan";
import { instrument, timedPress, summarise, readPerf } from "./_perf";

const OUT = process.env.HW_OUT ?? "/tmp/claude-0/-home-user-bow-decision-challenges/154df4db-b27f-5b40-abad-57bf3769b363/scratchpad/critic-school-hardware/out";
const CPU = Number(process.env.HW_CPU ?? 1);
const lines: string[] = [];
function say(s: string) { lines.push(s); console.log(`   ${s}`); }

async function throttleCpu(page: Page, rate: number) {
  if (rate <= 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
}

test.afterAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(`${OUT}/device-latency.txt`, `\n=== CPU ${CPU}x @ ${new Date().toISOString()} ===\n${lines.join("\n")}\n`);
});

test("plan board: a stepper press, on a throttled CPU", async ({ page, request }) => {
  const { code } = await createClass(request, `hw plan cpu${CPU}`);
  await instrument(page);
  await enterChallenge(page, { classCode: code, seatCode: "7" });
  await throttleCpu(page, CPU);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page, {});

  // The opening board: three rows, money moving in increments.
  const up = page.getByRole("button", { name: /^Increase .* by \$/ }).first();
  const down = page.getByRole("button", { name: /^Decrease .* by \$/ }).first();
  await expect(up).toBeVisible();

  const samples = [];
  for (let i = 0; i < 12; i += 1) samples.push(await timedPress(page, () => up.click()));
  const downs = [];
  for (let i = 0; i < 8; i += 1) downs.push(await timedPress(page, () => down.click()));
  say(summarise(`plan board stepper +  (cpu ${CPU}x)`, samples));
  say(summarise(`plan board stepper -  (cpu ${CPU}x)`, downs));

  // A rapid burst, which is what a student who wants $400 more actually does.
  const burst = Date.now();
  for (let i = 0; i < 10; i += 1) await up.click({ delay: 0 });
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  say(`plan board: 10 rapid presses took ${Date.now() - burst}ms wall (cpu ${CPU}x)`);
  const perf = await readPerf(page);
  const worst = perf.longtasks.sort((a, b) => b.dur - a.dur)[0];
  say(`plan board: longest main-thread task seen on this screen ${worst ? Math.round(worst.dur) : 0}ms (cpu ${CPU}x)`);
});

test("resolution: the screen that computes a whole season, on a throttled CPU", async ({ page, request }) => {
  const { code } = await createClass(request, `hw resolve cpu${CPU}`);
  await instrument(page);
  await enterChallenge(page, { classCode: code, seatCode: "7" });
  await throttleCpu(page, CPU);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page, { attendance: true, showcase: true });

  const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
  await fillPlanToBalance(page, "working", context);
  const savedOpening = await timedPress(page, () => saveOpeningPlan(page));
  say(`close the opening plan board: press-to-paint ${savedOpening.eventMs}ms handler ${Math.round(savedOpening.handlerMs ?? 0)}ms wall ${savedOpening.wallMs}ms longest-task ${Math.round(savedOpening.longtaskMs)}ms (cpu ${CPU}x)`);

  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).toBeVisible();
  await fillPlanLeavingShortfall(page, "fallback", context, 900);
  await page.getByRole("button", { name: "Check this plan" }).click();
  const savedFallback = await timedPress(page, () => page.getByRole("button", { name: `Save it, ${money(900)} still missing` }).click());
  say(`close the backup plan: press-to-paint ${savedFallback.eventMs}ms handler ${Math.round(savedFallback.handlerMs ?? 0)}ms (cpu ${CPU}x)`);

  await expect(page.getByRole("heading", { name: `Week ${N.week3.week} pays Avery in cash.` })).toBeVisible();
  await playSeasonWeeks(page);

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  const week5 = await timedPress(page, () => passWeek5Calculation(page, String(week5TotalFor(context))));
  say(`Week 5 gap calculation checked: press-to-paint ${week5.eventMs}ms handler ${Math.round(week5.handlerMs ?? 0)}ms wall ${week5.wallMs}ms (cpu ${CPU}x)`);

  await expect(page.getByRole("heading", { name: TRIAGE_HEADING })).toBeVisible();
  // The triage board is the other full board — steppers again, but now under pressure.
  const triageUp = page.getByRole("button", { name: /^Increase .* by \$/ }).first();
  const triageSamples = [];
  for (let i = 0; i < 8; i += 1) triageSamples.push(await timedPress(page, () => triageUp.click()));
  say(summarise(`Week 5 triage board stepper (cpu ${CPU}x)`, triageSamples));

  await savePlan(page, "week5-first-response", context);
  await expect(page.getByRole("heading", { name: "Two more calls to make." })).toBeVisible();
  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await savePlan(page, "final", landed);
  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();

  // This is the press that resolves eight weeks against the student's own decisions.
  const toResolution = await timedPress(page, () => savePlan(page, "remaining-risk", landed));
  await expect(page.getByRole("heading", { name: "The season ends." })).toBeVisible({ timeout: 60000 });
  say(`SEASON RESOLUTION: press-to-paint ${toResolution.eventMs}ms handler ${Math.round(toResolution.handlerMs ?? 0)}ms wall ${toResolution.wallMs}ms longest-task ${Math.round(toResolution.longtaskMs)}ms (cpu ${CPU}x)`);
  const perfAtEnd = await readPerf(page);
  const big = perfAtEnd.longtasks.map((t) => Math.round(t.dur)).sort((a, b) => b - a);
  say(`resolution screen: long tasks over 50ms = ${big.filter((t) => t >= 50).length}, longest ${big[0] ?? 0}ms (cpu ${CPU}x)`);

  const explain = await timedPress(page, () => page.getByRole("button", { name: "Explain my plan" }).click());
  say(`"Explain my plan": press-to-paint ${explain.eventMs}ms handler ${Math.round(explain.handlerMs ?? 0)}ms (cpu ${CPU}x)`);
  await expect(page.getByRole("heading", { name: "Explain your plan." })).toBeVisible();
});

test("teacher class page: thirty students, on a throttled CPU", async ({ page, request }) => {
  const { code, teacherKey } = await createClass(request, `hw class30 cpu${CPU}`);
  await seedRuns(request, code, Array.from({ length: 30 }, (_, i) => ({ seat: String(i + 1) })));
  await instrument(page);
  await throttleCpu(page, CPU);

  const t0 = Date.now();
  await page.goto(`/educator/class/${code}?key=${teacherKey}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 120000 });
  await expect(page.locator("body")).not.toContainText("Opening the class…", { timeout: 120000 });
  const ready = Date.now() - t0;
  const perf = await readPerf(page);
  const tasks = perf.longtasks.map((t) => Math.round(t.dur)).sort((a, b) => b - a);
  say(`class page (30 submitted): usable at ${ready}ms; long tasks over 50ms: ${tasks.filter((t) => t >= 50).length}; longest ${tasks[0] ?? 0}ms; sum ${tasks.reduce((a, b) => a + b, 0)}ms (cpu ${CPU}x)`);

  // The two things a teacher presses on this page.
  const links = page.getByRole("link");
  const debrief = page.getByRole("link", { name: /debrief/i }).first();
  if (await debrief.count()) {
    const t = await timedPress(page, () => debrief.click());
    await page.waitForLoadState("networkidle").catch(() => {});
    say(`class page -> debrief: press-to-paint ${t.eventMs}ms wall ${t.wallMs}ms (cpu ${CPU}x)`);
    const p2 = await readPerf(page);
    say(`debrief render: longest task ${Math.round(Math.max(0, ...p2.longtasks.map((x) => x.dur)))}ms (cpu ${CPU}x)`);
  } else {
    say(`class page: no debrief link found among ${await links.count()} links (cpu ${CPU}x)`);
  }
});
