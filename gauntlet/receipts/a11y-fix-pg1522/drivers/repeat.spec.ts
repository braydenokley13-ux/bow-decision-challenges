import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, SETUP_TITLES, SETUP_ORDER, PLAN_STEP } from "../e2e/flow";
import { NUMBERS as N } from "../e2e/plan";
import { active, log, startAnnouncementRecorder, announcements, startMutationRecorder, mutations } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = `${process.env.BOW_PROBE_LABEL ?? "repeat"}-repeat.log`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("pressing Check twice on the same wrong answer", async ({ page, request }) => {
  test.setTimeout(240_000);
  const created = await createClass(request, "pg1522 repeat");
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
  await kbActivate(page, /"Choose this setup/, { cap: 200, nth: 2 });
  await page.waitForTimeout(400);
  await kbType(page, new RegExp(`What the ${esc(SETUP_TITLES[SETUP_ORDER[2]])} costs Avery`), String(N.setupCosts[SETUP_ORDER[2]]));
  await kbActivate(page, /"Check"/);
  await page.waitForTimeout(600);
  await kbActivate(page, /"Build the plan"/, { cap: 200 });
  await page.waitForTimeout(900);

  log(REL, `\n\n######## the same wrong answer, checked three times, nothing retyped ########`);
  await kbType(page, new RegExp(PLAN_STEP.countOn), "100");
  for (let press = 1; press <= 3; press += 1) {
    const before = (await announcements(page)).length;
    const beforeM = (await mutations(page)).length;
    await kbActivate(page, /"Check"/, { cap: 60 });
    await page.waitForTimeout(700);
    log(REL, `press ${press} (the box still reads $100): focus = ${await active(page)}`);
    log(REL, `  announced (deduped): ${JSON.stringify((await announcements(page)).slice(before))}`);
    log(REL, `  live-region mutations:\n${(await mutations(page)).slice(beforeM).map((m) => "    " + m).join("\n") || "    (none — nothing was said)"}`);
  }
});
