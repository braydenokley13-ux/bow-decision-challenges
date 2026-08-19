import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, SETUP_TITLES, SETUP_ORDER, PLAN_STEP } from "../e2e/flow";
import { NUMBERS as N } from "../e2e/plan";
import { active, liveRegions, log, OUT, startAnnouncementRecorder, announcements, axTree, startMutationRecorder, mutations } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = process.env.BOW_PROBE_LABEL ? `${process.env.BOW_PROBE_LABEL}.log` : "before.log";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function reachPlanQ1(page: any, request: any, label: string) {
  const created = await createClass(request, label);
  const card = await seatOnRoster(page, created.code, "1");
  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await startMutationRecorder(page);
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
  await kbActivate(page, /"Choose this setup: /, { cap: 200, nth: 2 });
  await page.waitForTimeout(400);
  await kbType(page, new RegExp(`What the ${esc(SETUP_TITLES[SETUP_ORDER[2]])} costs Avery`), String(N.setupCosts[SETUP_ORDER[2]]));
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(600);
  return { created, card };
}

test("B1 — Check with the right answer", async ({ page, request }) => {
  test.setTimeout(240_000);
  log(REL, `\n\n######## B1 — the setup total, then plan Q1, both answered correctly ########`);
  const before0 = 0;
  await reachPlanQ1(page, request, "pg1522 B1");
  log(REL, `[setup-total, correct] focus = ${await active(page)}`);
  log(REL, `[setup-total, correct] announced so far: ${JSON.stringify((await announcements(page)).slice(before0).slice(-4))}`);
  log(REL, `[setup-total, correct] live regions:\n${await liveRegions(page)}`);
  await kbActivate(page, /"Build the plan"/, { cap: 200 });
  await page.waitForTimeout(900);

  const before = (await announcements(page)).length;
  await kbType(page, new RegExp(PLAN_STEP.countOn), String(N.savings + N.basePay));
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(1200);
  log(REL, `\n[plan Q1, correct] focus = ${await active(page)}`);
  log(REL, `[plan Q1, correct] announced by the press: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `[plan Q1, correct] live regions:\n${await liveRegions(page)}`);
  await page.screenshot({ path: `${OUT}/${REL.replace(".log", "")}-B1-after-correct.png`, fullPage: true });
});

test("B1b — a repeated wrong answer", async ({ page, request }) => {
  test.setTimeout(240_000);
  await reachPlanQ1(page, request, "pg1522 B1b");
  await kbActivate(page, /"Build the plan"/, { cap: 200 });
  await page.waitForTimeout(900);
  log(REL, `\n\n######## B1b — two different wrong answers in a row ########`);
  for (const [i, wrong] of ["100", "200", "200"].entries()) {
    const before = (await announcements(page)).length;
    const beforeM = (await mutations(page)).length;
    await kbType(page, new RegExp(PLAN_STEP.countOn), wrong);
    await kbActivate(page, /"Check"/);
    await page.waitForTimeout(800);
    log(REL, `attempt ${i + 1} ($${wrong}, wrong): focus = ${await active(page)}`);
    log(REL, `  announced (deduped, the critic's recorder): ${JSON.stringify((await announcements(page)).slice(before))}`);
    log(REL, `  live-region mutations from the press:\n${(await mutations(page)).slice(beforeM).map((m) => "    " + m).join("\n") || "    (none)"}`);
  }
});

test("B2 — the hint ladder", async ({ page, request }) => {
  test.setTimeout(240_000);
  await reachPlanQ1(page, request, "pg1522 B2");
  await kbActivate(page, /"Build the plan"/, { cap: 200 });
  await page.waitForTimeout(900);
  log(REL, `\n\n######## B2 — the hint ladder ########`);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await kbType(page, new RegExp(PLAN_STEP.countOn), String(100 * attempt));
    await kbActivate(page, /"Check"/);
    await page.waitForTimeout(600);
  }
  let before = (await announcements(page)).length;
  await kbActivate(page, /"Show me one step"/, { cap: 200 });
  await page.waitForTimeout(700);
  log(REL, `after "Show me one step": focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  A11Y TREE around the hint:\n${(await axTree(page)).split("\n").filter((l) => /note|Try it this way|Show|status/.test(l)).join("\n")}`);

  await kbType(page, new RegExp(PLAN_STEP.countOn), "12");
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(600);
  before = (await announcements(page)).length;
  await kbActivate(page, /"Show the answer and keep going"/, { cap: 200 });
  await page.waitForTimeout(900);
  log(REL, `after "Show the answer and keep going": focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  what the screen now says (MAJOR 4 check):\n${(await page.locator(".question__settled, .popup-settled").first().innerText().catch(() => "(no settled line)")).replace(/\s+/g, " ")}`);
  await page.screenshot({ path: `${OUT}/${REL.replace(".log", "")}-B2-supplied.png`, fullPage: true });
});

test("B3 — Leave this run", async ({ page, request }) => {
  test.setTimeout(240_000);
  await reachPlanQ1(page, request, "pg1522 B3");
  log(REL, `\n\n######## B3 — the run menu ########`);
  const before = (await announcements(page)).length;
  await kbActivate(page, /"This run:/, { cap: 200 });
  await page.waitForTimeout(300);
  log(REL, `after opening the run menu: focus = ${await active(page)}`);
  await kbActivate(page, /"Leave this run"/, { cap: 40 });
  await page.waitForTimeout(600);
  log(REL, `after "Leave this run": focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  buttons now: ${JSON.stringify(await page.locator(".run-menu button").allInnerTexts())}`);
  const trail: string[] = [];
  for (let i = 0; i < 4; i += 1) { await page.keyboard.press("Tab"); trail.push(await active(page)); }
  log(REL, `  the next four Tab stops:\n${trail.map((t, i) => `    ${i + 1}: ${t}`).join("\n")}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  log(REL, `  after Escape: run-menu[open] count = ${await page.locator(".run-menu[open]").count()}, focus = ${await active(page)}`);
});
