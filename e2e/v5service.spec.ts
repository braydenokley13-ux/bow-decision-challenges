import { test } from "@playwright/test";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as N } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront } from "../src/domain/scenario/worlds/food-truck/economy";
import { createClass, gotoFreshChallenge, seatOnRoster, signIn, startIfConfirmAsked } from "./flow";

/**
 * The window, used rather than rendered.
 *
 * Walks a real class to the first Saturday, orders deliberately too few trays, then serves —
 * because the screen's whole job is what a short counter feels like at 20:40 with people still
 * in the lane, and that cannot be judged from a screenshot of it at rest.
 */
const COPY = POP_UP_SCENARIO.screens;
const SPOT = POP_UP_SCENARIO.spots[1]; // Middle Row: 38 walk past, one pair of hands can pass 45.

test("running Saturday 1, short of plates", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const made = await createClass(request, "Service look");
  const card = await seatOnRoster(page, made.code, "4");
  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode: made.code });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await page.getByRole("button", { name: `Start this one: ${POP_UP_SCENARIO.title}` }).click();

  const checkSum = async (label: string, value: number) => {
    await page.getByLabel(label).fill(String(value));
    await page.locator(".calculation").filter({ has: page.getByLabel(label) }).getByRole("button", { name: "Check" }).click();
  };
  const setLine = async (label: string, value: number) => {
    const field = page.getByRole("spinbutton", { name: label });
    await field.fill(String(value));
    await field.press("Tab");
  };

  await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();
  await checkSum(COPY.spot.owed.label, owedUpFront(N, SPOT.id));
  await page.getByRole("button", { name: COPY.spot.action }).click();
  for (const source of ["catering", "rebate"] as const) {
    await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).click();
  }
  await checkSum(COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
  await page.getByRole("button", { name: COPY.money.action }).click();

  // Two trays' worth on the stock line and the rest banked, so the counter runs bare early.
  // The steppers move in $50 and $1,510 is not a multiple of 50, which is exactly why the
  // board offers a closer: name the line that takes whatever is left over.
  await setLine(POP_UP_SCENARIO.lines.stock.label, 200);
  await setLine(POP_UP_SCENARIO.lines.cushion.label, 200);
  await page.locator('.popup-closer__choice button[data-line="cut"]').click();
  await page.getByRole("button", { name: COPY.plan.commit }).click();

  // Order every tray the stock line pays for — three — against a crowd of 38.
  await page.waitForTimeout(400);
  const trays = 3;
  for (let guard = 0; guard < 12; guard += 1) {
    const shown = Number(await page.locator(".tray-order output").innerText());
    if (shown === trays) break;
    await page.getByRole("button", { name: shown < trays ? "One tray more" : "One tray fewer" }).click();
  }
  await checkSum(COPY.saturday.order.label, orderCost(N, trays));
  await page.screenshot({ path: "gauntlet/v5/shots/30-tray-order.png", fullPage: true });

  await page.getByRole("button", { name: COPY.saturday.open }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "gauntlet/v5/shots/31-service-open.png", fullPage: true });

  for (let i = 0; i < 8; i += 1) {
    const serve = page.getByRole("button", { name: /serve the next order/i }).first();
    if (!(await serve.isVisible().catch(() => false))) break;
    await serve.click();
    await page.waitForTimeout(90);
  }
  await page.screenshot({ path: "gauntlet/v5/shots/32-service-midway.png", fullPage: true });

  const run = page.getByRole("button", { name: /^Serve automatically$/ }).first();
  if (await run.isVisible().catch(() => false)) {
    await run.click();
    await page.getByRole("button", { name: /Close up and see how the night went/ }).waitFor({ state: "visible", timeout: 60_000 });
  }
  await page.screenshot({ path: "gauntlet/v5/shots/33-service-close.png", fullPage: true });
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "gauntlet/v5/shots/34-service-1024.png", fullPage: true });
  console.log(errors.length ? `CONSOLE: ${errors.join(" | ")}` : "CONSOLE: clean");
});
