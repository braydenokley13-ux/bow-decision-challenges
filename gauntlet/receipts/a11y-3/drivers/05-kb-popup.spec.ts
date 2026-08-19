import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster } from "../e2e/flow";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as MARKET } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront, swapBill } from "../src/domain/scenario/worlds/food-truck/economy";
import { active, outline, liveRegions, axe, log, OUT, startAnnouncementRecorder, announcements, axTree } from "./kit";
import { kbActivate, kbType, arrival } from "./kb";
import { parseDollars } from "../src/domain/core/money";

const MARKET_COPY = POP_UP_SCENARIO.screens;
const BOOTH = POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];

const REL = "keyboard/popup.log";
const AXE = "axe/popup.json";
const TREE = "screenreader/popup-tree.txt";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("keyboard-only complete run — Run the Pop-Up", async ({ page, request }) => {
  test.setTimeout(600_000);
  const created = await createClass(request, "A11y-3 KB popup");
  const card = await seatOnRoster(page, created.code, "1");
  log(REL, `=== class ${created.code} key ${created.teacherKey} seat ${card.seatCode} card ${card.joinCode} ===`);

  const shot = (name: string) => page.screenshot({ path: `${OUT}/keyboard/pu-${name}.png`, fullPage: true });
  const snap = async (name: string) => {
    log(REL, `\n----- SCREEN ${name} -----\nURL ${page.url()}\nACTIVE ${await active(page)}\nOUTLINE\n${await outline(page)}\nLIVE\n${await liveRegions(page)}`);
    log(TREE, `\n===== ${name} =====\n${await axTree(page)}`);
    await axe(page, name, AXE);
  };
  const kbSetLine = async (label: string, value: number) => {
    await kbType(page, new RegExp(`spinbutton\\].*"${esc(label)}"`), String(value), { trail: REL });
    await page.keyboard.press("Enter");
  };
  const kbCheckSum = async (label: string, value: number) => {
    await kbType(page, new RegExp(esc(label)), String(value), { trail: REL });
    await kbActivate(page, /"Check"/, { trail: REL, cap: 80 });
    await page.waitForTimeout(500);
    log(REL, `after Check on "${label}": focus = ${await active(page)}`);
  };

  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await kbType(page, /Class code/i, created.code, { trail: REL });
  await kbActivate(page, /"Next"/, { trail: REL });
  await page.waitForTimeout(300);
  await kbType(page, /Your code/i, card.joinCode, { trail: REL });
  await kbActivate(page, /"Go in"/, { trail: REL });
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
  await kbActivate(page, /"(Start|Carry on)"/, { trail: REL });
  await page.waitForTimeout(800);
  await kbActivate(page, /"Start this one: Run the Pop-Up/, { trail: REL });
  await page.waitForTimeout(1000);

  await arrival(page, "the market opens (booths)", REL);
  await snap("01-booths");
  await shot("01-booths");
  await kbActivate(page, new RegExp(esc(`${MARKET_COPY.spot.take}: ${BOOTH.title}`)), { trail: REL, cap: 200 });
  await page.waitForTimeout(600);
  log(REL, `after taking a booth: focus = ${await active(page)}`);
  await snap("02-booth-taken");
  await shot("02-booth-taken");
  await kbCheckSum(MARKET_COPY.spot.owed.label, owedUpFront(MARKET, BOOTH.id));
  await snap("03-owed-checked");
  await kbActivate(page, new RegExp(esc(MARKET_COPY.spot.action)), { trail: REL, cap: 200 });
  await page.waitForTimeout(800);

  await arrival(page, "the money screen", REL);
  await snap("04-money");
  await shot("04-money");
  for (const source of ["catering", "rebate"] as const) {
    await kbActivate(page, new RegExp(esc(`${MARKET_COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}`)), { trail: REL, cap: 200 });
    await page.waitForTimeout(300);
  }
  await kbCheckSum(MARKET_COPY.money.toPlan.label, cashToPlan(MARKET, BOOTH.id));
  await kbActivate(page, new RegExp(esc(MARKET_COPY.money.action)), { trail: REL, cap: 200 });
  await page.waitForTimeout(900);

  await arrival(page, "the opening pop-up board", REL);
  await snap("05-board");
  await shot("05-board");
  await kbSetLine(POP_UP_SCENARIO.lines.stock.label, 600);
  await kbSetLine(POP_UP_SCENARIO.lines.cushion.label, 400);
  await page.waitForTimeout(300);
  const closers = await page.locator(".popup-closer__choice button").evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));
  log(REL, `closer cards: ${JSON.stringify(closers)}`);
  const cutLabel = await page.locator('.popup-closer__choice button[data-line="cut"]').getAttribute("aria-label").catch(() => null);
  log(REL, `the "takes what is left over" card for the cut line: ${JSON.stringify(cutLabel)}`);
  if (await page.locator('.popup-closer__choice button[data-line="cut"]').count()) {
    await kbActivate(page, /takes what is left over/, { trail: REL, cap: 200, nth: 2 });
  }
  await page.waitForTimeout(400);
  await snap("06-board-closed");
  await shot("06-board-closed");
  await kbActivate(page, new RegExp(esc(MARKET_COPY.plan.commit)), { trail: REL, cap: 220 });
  await page.waitForTimeout(1000);

  await arrival(page, "Saturday 1 — the order", REL);
  await snap("07-saturday-1");
  await shot("07-saturday-1");
  const orderTrays = async (trays: number) => {
    for (let guard = 0; guard < 12; guard += 1) {
      const current = Number(await page.locator(".tray-order output").innerText());
      if (current === trays) break;
      await kbActivate(page, new RegExp(current < trays ? esc("One tray more") : esc("One tray fewer")), { trail: REL, cap: 200 });
      await page.waitForTimeout(150);
    }
    log(REL, `after setting the trays: focus = ${await active(page)}; trays = ${await page.locator(".tray-order output").innerText()}`);
  };
  await orderTrays(3);
  await kbCheckSum(MARKET_COPY.saturday.order.label, orderCost(MARKET, 3));
  await kbActivate(page, new RegExp(esc(MARKET_COPY.saturday.open)), { trail: REL, cap: 200 });
  await page.waitForTimeout(1000);

  await arrival(page, "Saturday 1 — the tips jar", REL);
  await snap("08-tips");
  await shot("08-tips");
  const maybe = await page.locator(".maybe-grid button").first().evaluate((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());
  await kbActivate(page, new RegExp(esc(maybe.slice(0, 28))), { trail: REL, cap: 200 });
  await page.waitForTimeout(300);
  const why = await page.locator(".helper-card__ask .binary-choice button").first().evaluate((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());
  await kbActivate(page, new RegExp(esc(why.slice(0, 28))), { trail: REL, cap: 200 });
  await page.waitForTimeout(300);
  await kbActivate(page, new RegExp(esc(MARKET_COPY.tips.title)), { trail: REL, cap: 200 });
  await page.waitForTimeout(900);

  await arrival(page, "Saturday 2 — the standing order", REL);
  await snap("09-standing");
  await shot("09-standing");
  await kbActivate(page, new RegExp(esc(MARKET_COPY.standing.alone)), { trail: REL, cap: 200 });
  await page.waitForTimeout(400);
  await orderTrays(3);
  await kbActivate(page, new RegExp(esc(MARKET_COPY.standing.action)), { trail: REL, cap: 200 });
  await page.waitForTimeout(1000);

  await arrival(page, "the generator breaks", REL);
  await snap("10-generator");
  await shot("10-generator");
  await kbCheckSum(MARKET_COPY.generator.gap.label, swapBill(MARKET));
  await kbActivate(page, new RegExp(esc(MARKET_COPY.generator.action)), { trail: REL, cap: 200 });
  await page.waitForTimeout(900);

  await arrival(page, "the repair board", REL);
  await snap("11-repair");
  await shot("11-repair");
  const shown = await page.getByRole("spinbutton", { name: POP_UP_SCENARIO.lines.cushion.label }).inputValue();
  const held = parseDollars(shown)!;
  await kbSetLine(POP_UP_SCENARIO.lines.cushion.label, held - swapBill(MARKET));
  await page.waitForTimeout(400);
  await kbActivate(page, new RegExp(esc(MARKET_COPY.repair.commit)), { trail: REL, cap: 220 });
  await page.waitForTimeout(1000);

  await arrival(page, "Saturday 4", REL);
  await snap("12-saturday-4");
  await shot("12-saturday-4");
  await kbActivate(page, new RegExp(esc(MARKET_COPY.saturday.open)), { trail: REL, cap: 200 });
  await page.waitForTimeout(1000);
  await arrival(page, "the settle screen", REL);
  await snap("13-settle");
  await shot("13-settle");
  await kbActivate(page, new RegExp(esc(MARKET_COPY.settle.action)), { trail: REL, cap: 200 });
  await page.waitForTimeout(1000);

  await arrival(page, "the write-up", REL);
  await snap("14-writeup");
  await shot("14-writeup");
  const tiles = page.locator(".writeup__tiles button");
  const figures: string[] = [];
  for (const index of [0, 1]) {
    const label = await tiles.nth(index).evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
    await kbActivate(page, new RegExp(esc(label.slice(0, 24))), { trail: REL, cap: 220 });
    figures.push(label);
    await page.waitForTimeout(200);
  }
  await kbType(page, new RegExp(esc(MARKET_COPY.writeUp.field)), `I kept the cushion and cut the extras when the generator went. The numbers I stood on are ${figures.join(" and ")}.`, { trail: REL });
  await page.waitForTimeout(300);
  await snap("15-writeup-filled");
  await shot("15-writeup-filled");
  await kbActivate(page, new RegExp(esc(MARKET_COPY.writeUp.submit)), { trail: REL, cap: 220 });
  await expect(page.getByRole("heading", { name: MARKET_COPY.submitted.sent })).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await arrival(page, "turned in", REL);
  await snap("16-submitted");
  await shot("16-submitted");
  log(REL, `\n=== FULL ANNOUNCEMENT STREAM ===\n${(await announcements(page)).join("\n")}`);
  log("screenreader/popup-announcements.txt", (await announcements(page)).join("\n"));
});
