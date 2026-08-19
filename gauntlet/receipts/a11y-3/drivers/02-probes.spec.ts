import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, SETUP_TITLES, SETUP_ORDER, PLAN_STEP } from "../e2e/flow";
import { NUMBERS as N } from "../e2e/plan";
import { active, outline, liveRegions, log, OUT, startAnnouncementRecorder, announcements, axTree, axe } from "./kit";
import { kbActivate, kbType, arrival } from "./kb";

const REL = "probes/student-probes.log";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function reachPlanQ1(page: any, request: any, label: string) {
  const created = await createClass(request, label);
  const card = await seatOnRoster(page, created.code, "1");
  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await kbType(page, /Class code/i, created.code);
  await kbActivate(page, /"Next"/);
  await page.waitForTimeout(300);
  await kbType(page, /Your code/i, card.joinCode);
  await kbActivate(page, /"Go in"/);
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
  await kbActivate(page, /"(Start|Carry on)"/);
  await page.waitForTimeout(800);
  await kbActivate(page, /"Start this one: Eight Weeks/);
  await page.waitForTimeout(800);
  const cheapestFirst = [...SETUP_ORDER].sort((a, b) => N.setupCosts[a] - N.setupCosts[b]);
  for (let target = 0; target < cheapestFirst.length; target += 1) {
    const title = SETUP_TITLES[cheapestFirst[target]];
    for (let guard = 0; guard < 4; guard += 1) {
      const positions = await page.locator(".rank-list li").allInnerTexts();
      const current = positions.findIndex((t: string) => t.includes(title));
      if (current === target) break;
      await kbActivate(page, new RegExp(`Move ${esc(title)} earlier`));
      await page.waitForTimeout(150);
    }
  }
  await kbActivate(page, /"Check the order"/);
  await page.waitForTimeout(500);
  await kbActivate(page, /"Choose this setup"/, { cap: 200, nth: 2 });
  await page.waitForTimeout(400);
  await kbType(page, new RegExp(`What the ${esc(SETUP_TITLES[SETUP_ORDER[2]])} costs Avery`), String(N.setupCosts[SETUP_ORDER[2]]));
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(400);
  await kbActivate(page, /"Build the plan"/, { cap: 200 });
  await page.waitForTimeout(700);
  return { created, card };
}

test("probe A — the arithmetic Check: right answer", async ({ page, request }) => {
  test.setTimeout(240_000);
  await reachPlanQ1(page, request, "A11y-3 probe A");
  log(REL, `\n\n######## PROBE A — pressing Check with the RIGHT answer on plan Question 1 ########`);
  log(REL, `before: focus = ${await active(page)}`);
  log(REL, `live regions before:\n${await liveRegions(page)}`);
  const before = (await announcements(page)).length;
  await kbType(page, new RegExp(PLAN_STEP.countOn), String(N.savings + N.basePay));
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(1200);
  log(REL, `AFTER pressing Check (correct): focus = ${await active(page)}`);
  log(REL, `live regions after:\n${await liveRegions(page)}`);
  log(REL, `announcements produced by the press: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `is the Check button still in the DOM? ${await page.locator(".calculation").getByRole("button", { name: "Check" }).count()}`);
  await page.screenshot({ path: `${OUT}/probes/A-after-correct-check.png`, fullPage: true });
  // what a keyboard user has to do to get back to where they were
  const trail: string[] = [];
  for (let i = 0; i < 8; i += 1) { await page.keyboard.press("Tab"); trail.push(await active(page)); }
  log(REL, `the next eight Tab presses after the answer was accepted:\n${trail.map((t, i) => `  ${i + 1}: ${t}`).join("\n")}`);
});

test("probe B — the arithmetic Check: wrong answers and the hint ladder", async ({ page, request }) => {
  test.setTimeout(240_000);
  await reachPlanQ1(page, request, "A11y-3 probe B");
  log(REL, `\n\n######## PROBE B — three WRONG answers on plan Question 1, and the hint ladder ########`);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const before = (await announcements(page)).length;
    await kbType(page, new RegExp(PLAN_STEP.countOn), String(100 * attempt));
    await kbActivate(page, /"Check"/);
    await page.waitForTimeout(700);
    log(REL, `attempt ${attempt} (wrong): focus = ${await active(page)}`);
    log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
    log(REL, `  live now:\n${(await liveRegions(page)).split("\n").map((l) => "    " + l).join("\n")}`);
    const helpers = await page.locator(".calculation-help button").allInnerTexts();
    log(REL, `  hint controls on screen: ${JSON.stringify(helpers)}`);
    await page.screenshot({ path: `${OUT}/probes/B-attempt-${attempt}.png`, fullPage: true });
  }
  // the hint, by keyboard
  const before = (await announcements(page)).length;
  await kbActivate(page, /"Show me one step"/, { cap: 200 });
  await page.waitForTimeout(600);
  log(REL, `after "Show me one step": focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  hint text now on screen: ${JSON.stringify((await page.locator(".calculation-help").innerText()).replace(/\s+/g, " "))}`);
  log(REL, `  A11Y TREE around the hint:\n${(await axTree(page)).split("\n").filter((l) => /note|Try it this way|Show/.test(l)).join("\n")}`);
  await page.screenshot({ path: `${OUT}/probes/B-hint-open.png`, fullPage: true });

  // one more wrong answer to earn "Show the answer and keep going"
  await kbType(page, new RegExp(PLAN_STEP.countOn), "12");
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(600);
  const helpers2 = await page.locator(".calculation-help button").allInnerTexts();
  log(REL, `hint controls after a fourth wrong answer: ${JSON.stringify(helpers2)}`);
  const say = (await announcements(page)).length;
  await kbActivate(page, /"Show the answer and keep going"/, { cap: 200 });
  await page.waitForTimeout(900);
  log(REL, `after "Show the answer and keep going": focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(say))}`);
  log(REL, `  what the screen says about the cost of that:\n${(await page.locator("main").innerText()).replace(/\n{2,}/g, "\n").slice(0, 1200)}`);
  await page.screenshot({ path: `${OUT}/probes/B-answer-supplied.png`, fullPage: true });
});
