import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { API, createClass, createClassKeyFor, gotoFreshChallenge, seatOnRoster, signIn, startIfConfirmAsked } from "../e2e/flow";
import { POP_UP_NUMBERS as N } from "../src/domain/scenario/worlds/food-truck/numbers";
import { parseDollars } from "../src/domain/core/money";
import { cashToPlan, orderCost, owedUpFront, swapBill } from "../src/domain/scenario/worlds/food-truck/economy";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";

const COPY = POP_UP_SCENARIO.screens;
const SPOT = POP_UP_SCENARIO.spots.find((s) => s.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];
const OUT = "/tmp/judge-6-shots/pu";

async function classWithChoice(request: APIRequestContext): Promise<string> {
  const created = await createClass(request, "Judge 6 popup");
  const r = await request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": createClassKeyFor(created.code) },
    data: { objectiveRef: null, allowedWorldIds: ["basketball", "food-truck"], studentChoosesWorld: true },
  });
  expect(r.status(), await r.text()).toBe(201);
  return created.code;
}
async function checkSum(page: Page, label: string, value: number) {
  await page.getByLabel(label).fill(String(value));
  await page.locator(".calculation").filter({ has: page.getByLabel(label) }).getByRole("button", { name: "Check" }).click();
}
async function setLine(page: Page, label: string, value: number) {
  const f = page.getByRole("spinbutton", { name: label });
  await f.fill(String(value)); await f.press("Tab");
}
function restLine(page: Page, line: "stock" | "cushion" | "cut") {
  return page.locator(`.popup-closer__choice button[data-line="${line}"]`);
}
async function heldInLine(page: Page, label: string): Promise<number> {
  const shown = await page.getByRole("spinbutton", { name: label }).inputValue();
  return parseDollars(shown)!;
}
async function orderTrays(page: Page, trays: number) {
  const shown = page.locator(".tray-order output");
  for (let g = 0; g < 12; g += 1) {
    const cur = Number(await shown.innerText());
    if (cur === trays) break;
    await page.getByRole("button", { name: cur < trays ? "One tray more" : "One tray fewer" }).click();
  }
}

test("pop-up, viewport shots, 1366x768", async ({ page, request }) => {
  await mkdir(OUT, { recursive: true });
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console error — ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`page error — ${e.message}`));
  const metrics: any[] = [];
  const shoot = async (name: string) => {
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: `${OUT}/${name}--viewport.png` });
    await page.screenshot({ path: `${OUT}/${name}--full.png`, fullPage: true });
    metrics.push({ name, overflow, scrollH, scrolls: +(scrollH / 768).toFixed(2) });
    console.log("SHOT", JSON.stringify(metrics.at(-1)));
  };

  const classCode = await classWithChoice(request);
  await gotoFreshChallenge(page);
  const card = await seatOnRoster(page, classCode, "12");
  await page.goto("/join"); await shoot("00-join-classcode");
  await page.getByLabel("Class code").fill(classCode);
  await page.getByRole("button", { name: "Next" }).click();
  await shoot("00b-join-yourcode");
  await page.getByLabel("Your code").fill(card.joinCode);
  await page.getByRole("button", { name: "Go in" }).click();
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
  await shoot("00c-student-home");
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await shoot("01-world-pick");
  await page.getByRole("button", { name: `Start this one: ${POP_UP_SCENARIO.title}` }).click();
  await shoot("02-booth");
  await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();
  await shoot("03-booth-taken");
  await checkSum(page, COPY.spot.owed.label, owedUpFront(N, SPOT.id));
  await page.getByRole("button", { name: COPY.spot.action }).click();
  await shoot("04-conditional-money");
  for (const s of ["catering", "rebate"] as const) {
    await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[s].label}` }).click();
  }
  await checkSum(page, COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
  await page.getByRole("button", { name: COPY.money.action }).click();
  await shoot("05-opening-board");
  // deliberately try to save an unbalanced board — the refusal state
  await setLine(page, POP_UP_SCENARIO.lines.stock.label, 600);
  await page.getByRole("button", { name: COPY.plan.check }).click();
  await shoot("06-board-refused");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: COPY.plan.check }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: COPY.plan.check }).click();
  await shoot("07-board-help-offered");
  await page.getByRole("button", { name: COPY.plan.help.open }).click();
  await shoot("08-board-help-open");
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, 400);
  await restLine(page, "cut").click();
  await shoot("09-board-balanced");
  await page.getByRole("button", { name: COPY.plan.commit }).click();
  await shoot("10-first-saturday");
  await orderTrays(page, 3);
  await shoot("11-tray-order");
  await checkSum(page, COPY.saturday.order.label, orderCost(N, 3));
  await page.getByRole("button", { name: COPY.saturday.open }).click();
  await shoot("12-night-one-result");
  await page.locator(".maybe-grid button").first().click();
  await shoot("13-tips");
  await page.locator(".helper-card__ask .binary-choice button").first().click();
  await page.getByRole("button", { name: COPY.tips.title }).click();
  await shoot("14-after-tips");
  await page.getByRole("button", { name: COPY.standing.alone }).click();
  await shoot("15-sat23-order");
  await orderTrays(page, 3);
  await page.getByRole("button", { name: COPY.standing.action }).click();
  await shoot("16-generator-dead");
  await checkSum(page, COPY.generator.gap.label, swapBill(N));
  await page.getByRole("button", { name: COPY.generator.action }).click();
  await shoot("17-repair");
  await page.locator(".popup-locked button").first().click();
  await shoot("18-repair-locked-reason");
  const held = await heldInLine(page, POP_UP_SCENARIO.lines.cushion.label);
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, held - swapBill(N));
  await shoot("19-repair-balanced");
  await page.getByRole("button", { name: COPY.repair.commit }).click();
  await shoot("20-last-saturday");
  await page.getByRole("button", { name: COPY.saturday.open }).click();
  await shoot("21-settle-up");
  await page.getByRole("button", { name: COPY.settle.action }).click();
  await shoot("22-write-up");
  await page.locator(".writeup__tiles button").nth(0).click();
  await page.locator(".writeup__tiles button").nth(1).click();
  const figures = await page.locator('.writeup__tiles button[aria-pressed="true"]').allInnerTexts();
  const [first, second] = figures.map((t) => (t.match(/[\d,]+/g) ?? []).at(-1) ?? "");
  await page.getByLabel(COPY.writeUp.field).fill(`We took ${first} across the four nights and I would rather have kept the cushion. ${second} is what that decision cost, and the generator is rented so rented things break.`);
  await shoot("23-write-up-filled");
  await page.getByRole("button", { name: COPY.writeUp.submit }).click();
  await expect(page.getByRole("heading", { name: COPY.submitted.sent })).toBeVisible({ timeout: 20_000 });
  await shoot("24-submitted");

  console.log("POPUP_CLASS", classCode, createClassKeyFor(classCode));
  console.log("PROBLEMS", JSON.stringify(problems, null, 1));
  console.log("METRICS", JSON.stringify(metrics, null, 1));
});
