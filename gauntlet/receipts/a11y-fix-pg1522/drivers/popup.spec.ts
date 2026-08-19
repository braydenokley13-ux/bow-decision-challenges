import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster } from "../e2e/flow";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as MARKET } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, owedUpFront } from "../src/domain/scenario/worlds/food-truck/economy";
import { active, log, OUT, startAnnouncementRecorder, announcements, axe, axTree } from "./kit";
import { kbActivate, kbType } from "./kb";

const COPY = POP_UP_SCENARIO.screens;
const BOOTH = POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];
const REL = process.env.BOW_PROBE_LABEL ? `${process.env.BOW_PROBE_LABEL}-popup.log` : "popup.log";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("Pop-Up — two sums answered right, keyboard only", async ({ page, request }) => {
  test.setTimeout(300_000);
  const created = await createClass(request, "pg1522 popup");
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
  await kbActivate(page, /"Start this one: Run the Pop-Up/);
  await page.waitForTimeout(1000);

  log(REL, `\n\n######## Pop-Up — the four sums, right first time ########`);
  await kbActivate(page, new RegExp(esc(`${COPY.spot.take}: ${BOOTH.title}`)), { cap: 200 });
  await page.waitForTimeout(600);

  let before = (await announcements(page)).length;
  await kbType(page, new RegExp(esc(COPY.spot.owed.label)), String(owedUpFront(MARKET, BOOTH.id)));
  await kbActivate(page, /"Check"/, { cap: 80 });
  await page.waitForTimeout(900);
  log(REL, `[what you owe before you open, correct] focus = ${await active(page)}`);
  log(REL, `  announced by the press: ${JSON.stringify((await announcements(page)).slice(before))}`);
  const trail: string[] = [];
  for (let i = 0; i < 3; i += 1) { await page.keyboard.press("Tab"); trail.push(await active(page)); }
  log(REL, `  the next three Tab stops from there:\n${trail.map((t, i) => `    ${i + 1}: ${t}`).join("\n")}`);
  await axe(page, "popup-owed-settled", `${REL.replace(".log", "")}-axe.json`);

  await kbActivate(page, new RegExp(esc(COPY.spot.action)), { cap: 200 });
  await page.waitForTimeout(900);
  for (const source of ["catering", "rebate"] as const) {
    await kbActivate(page, new RegExp(esc(`${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}`)), { cap: 200 });
    await page.waitForTimeout(250);
  }
  before = (await announcements(page)).length;
  await kbType(page, new RegExp(esc(COPY.money.toPlan.label)), String(cashToPlan(MARKET, BOOTH.id)));
  await kbActivate(page, /"Check"/, { cap: 80 });
  await page.waitForTimeout(900);
  log(REL, `[what is left to plan with, correct] focus = ${await active(page)}`);
  log(REL, `  announced by the press: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  A11Y TREE around the settled line:\n${(await axTree(page)).split("\n").filter((l) => /focused|paragraph/.test(l)).slice(0, 8).join("\n")}`);
  await axe(page, "popup-toplan-settled", `${REL.replace(".log", "")}-axe.json`);
  await page.screenshot({ path: `${OUT}/${REL.replace(".log", "")}-settled.png`, fullPage: true });

  // A step back to a screen whose sum is already answered must not pull focus off its heading.
  log(REL, `\n-- back to a settled screen: does anything steal focus? --`);
  await page.goBack();
  await page.waitForTimeout(900);
  log(REL, `after Back: focus = ${await active(page)}`);
});
