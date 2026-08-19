import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster } from "../e2e/flow";
import { active, log, startAnnouncementRecorder, axTree } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = process.env.BOW_PROBE_LABEL ? `${process.env.BOW_PROBE_LABEL}-runmenu.log` : "runmenu.log";

test("the run menu, keyboard only", async ({ page, request }) => {
  test.setTimeout(240_000);
  const created = await createClass(request, "pg1522 run menu");
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
  await page.waitForTimeout(900);

  log(REL, `\n\n######## the run menu ########`);
  await kbActivate(page, /"This run:/, { cap: 200 });
  await page.waitForTimeout(300);
  log(REL, `menu open: focus = ${await active(page)}`);
  await kbActivate(page, /"Leave this run"/, { cap: 40 });
  await page.waitForTimeout(500);
  log(REL, `after "Leave this run": focus = ${await active(page)}`);
  log(REL, `  what the accessibility tree says about the two buttons:\n${(await axTree(page)).split("\n").filter((l) => /clear it and start again|keep working/.test(l)).join("\n")}`);
  const forward: string[] = [];
  for (let i = 0; i < 3; i += 1) { await page.keyboard.press("Tab"); forward.push(await active(page)); }
  log(REL, `  Tab forward from where focus landed:\n${forward.map((t, i) => `    ${i + 1}: ${t}`).join("\n")}`);

  // Back into the confirm, then decline it.
  await kbActivate(page, /"No — keep working"/, { cap: 200 });
  await page.waitForTimeout(400);
  log(REL, `after "No — keep working": focus = ${await active(page)}`);
  log(REL, `  buttons in the menu now: ${JSON.stringify(await page.locator(".run-menu button").allInnerTexts())}`);

  // Escape, from inside the menu, which is where a student who opened it is standing.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  log(REL, `after Escape: run-menu[open] count = ${await page.locator(".run-menu[open]").count()}, focus = ${await active(page)}`);

  // And Escape again from the confirm state.
  await kbActivate(page, /"This run:/, { cap: 200 });
  await page.waitForTimeout(300);
  await kbActivate(page, /"Leave this run"/, { cap: 40 });
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  log(REL, `Escape from the confirm: run-menu[open] = ${await page.locator(".run-menu[open]").count()}, focus = ${await active(page)}`);
  await kbActivate(page, /"This run:/, { cap: 200 });
  await page.waitForTimeout(300);
  log(REL, `re-opened: buttons = ${JSON.stringify(await page.locator(".run-menu button").allInnerTexts())} (the confirm must not be standing open)`);
});
