import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createClass, createClassKeyFor, gotoFreshChallenge, noHorizontalOverflow, noSeriousAxeViolations, seatOnRoster, signIn } from "./flow";
import { PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import { POP_UP_NUMBERS as N } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront, swapBill } from "../src/domain/scenario/worlds/food-truck/economy";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { WORLD_REGISTRY } from "../src/domain/scenario/registry";

/**
 * Run the Pop-Up, driven the way a student drives it.
 *
 * Every amount typed in here is computed from `numbers.ts` rather than written down, so
 * re-pricing the market leaves this suite correct instead of leaving it subtly wrong. The
 * screens are reached by pressing what a student presses — no direct navigation, no seeded
 * state — because the thing under test is the path, not the components.
 */

const COPY = POP_UP_SCENARIO.screens;
// Middle Row: the booth in the middle of every trade this world offers.
const SPOT = POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];
const API = "http://127.0.0.1:4180/api";
const BASKETBALL_TITLE = WORLD_REGISTRY.basketball?.title ?? "";

/** A class whose assignment offers both worlds and lets the student pick between them. */
async function classWithChoice(request: APIRequestContext): Promise<string> {
  const created = await createClass(request, "Pop-up suite");
  const response = await request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": createClassKeyFor(created.code) },
    data: { objectiveRef: null, allowedWorldIds: ["basketball", "food-truck"], studentChoosesWorld: true },
  });
  expect(response.status(), await response.text()).toBe(201);
  return created.code;
}

/** A class set one world, which is what every class created before choice existed looks like. */
async function classWithOneWorld(request: APIRequestContext, worldId: string): Promise<string> {
  const created = await createClass(request, "Single-world suite");
  const response = await request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": createClassKeyFor(created.code) },
    data: { objectiveRef: null, allowedWorldIds: [worldId], studentChoosesWorld: false },
  });
  expect(response.status(), await response.text()).toBe(201);
  return created.code;
}

/**
 * In through the door a student actually uses: their teacher's class code, their own name off
 * the roster, the code on their card — and then the run.
 *
 * It used to be two boxes on the challenge screen itself. That door is gone, and it is worth
 * saying why the change reaches this file: a rostered class refuses work from somebody who has
 * not signed in, so a suite that took the old shortcut would have been proving the market runs
 * for a student the service would then have turned away at submission.
 */
async function join(page: Page, classCode: string, seatCode: string) {
  const card = await seatOnRoster(page, classCode, seatCode);
  await signIn(page, { ...card, classCode });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await page.getByRole("button", { name: /Start the eight weeks|Go in/ }).click();
}

async function pickPopUp(page: Page) {
  await expect(page.getByRole("heading", { name: "Pick a world. Make it count." })).toBeVisible();
  await page.getByRole("button", { name: `Start this one: ${POP_UP_SCENARIO.title}` }).click();
}

async function checkSum(page: Page, label: string, value: number) {
  await page.getByLabel(label).fill(String(value));
  await page.locator(".calculation").filter({ has: page.getByLabel(label) }).getByRole("button", { name: "Check" }).click();
}

async function setLine(page: Page, label: string, value: number) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(String(value));
  await field.press("Tab");
}

/** The same walk as `buildOpeningPlan`, stopping on the board rather than committing it. */
async function buildOpeningPlanUpToBoard(page: Page) {
  await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();
  await checkSum(page, COPY.spot.owed.label, owedUpFront(N, SPOT.id));
  await page.getByRole("button", { name: COPY.spot.action }).click();
  for (const source of ["catering", "rebate"] as const) {
    await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).click();
  }
  await checkSum(page, COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
  await page.getByRole("button", { name: COPY.money.action }).click();
  await expect(page.getByRole("heading", { name: COPY.plan.title })).toBeVisible();
}

/** Booth → the money with a rule on it → the opening board, committed. */
async function buildOpeningPlan(page: Page, plan: { stock: number; cushion: number }) {
  await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();
  await checkSum(page, COPY.spot.owed.label, owedUpFront(N, SPOT.id));
  await page.getByRole("button", { name: COPY.spot.action }).click();

  for (const source of ["catering", "rebate"] as const) {
    await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).click();
  }
  await checkSum(page, COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
  await page.getByRole("button", { name: COPY.money.action }).click();

  await setLine(page, POP_UP_SCENARIO.lines.stock.label, plan.stock);
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, plan.cushion);
  await restLine(page, "cut").click();
  await page.getByRole("button", { name: COPY.plan.commit }).click();
}

/**
 * The card that sends what is left to one line, found by the line it feeds.
 *
 * Its wording carries the amount and, since the shortcut started saying what it would leave
 * the truck cooking with, a tray count as well — neither of which a test should be restating.
 */
function restLine(page: Page, line: "stock" | "cushion" | "cut") {
  return page.locator(`.popup-closer__choice button[data-line="${line}"]`);
}

async function orderTrays(page: Page, trays: number) {
  const shown = page.locator(".tray-order output");
  for (let guard = 0; guard < 12; guard += 1) {
    const current = Number(await shown.innerText());
    if (current === trays) break;
    await page.getByRole("button", { name: current < trays ? "One tray more" : "One tray fewer" }).click();
  }
}

test.describe("Run the Pop-Up", () => {
  test("a student picks the market and runs all four Saturdays", async ({ page, request }) => {
    const classCode = await classWithChoice(request);
    await gotoFreshChallenge(page);
    await join(page, classCode, "12");

    // 1 — the choice. Two cards, equal, in registry order, nothing ranking them.
    await expect(page.locator(".worldcard")).toHaveCount(2);
    await expect(page.locator(".worldpick__cards")).not.toContainText(/recommended|easier|harder|difficulty/i);
    await pickPopUp(page);

    // 2 — the booth, and the first sum: the permit plus the booth they took. The market opens
    // straight onto a decision now; the screen that used to stand in front of it announced
    // what the game was about to ask instead of asking it.
    await expect(page.getByRole("heading", { name: COPY.spot.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: COPY.spot.boothsTitle })).toBeVisible();
    await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();
    await checkSum(page, COPY.spot.owed.label, owedUpFront(N, SPOT.id));
    await page.getByRole("button", { name: COPY.spot.action }).click();

    // 4 — the two amounts with a rule on them, then what is left to plan with.
    await expect(page.getByRole("heading", { name: COPY.money.title })).toBeVisible();
    for (const source of ["catering", "rebate"] as const) {
      await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).click();
    }
    await checkSum(page, COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
    await page.getByRole("button", { name: COPY.money.action }).click();

    // 5 — the opening board. It refuses a plan that does not add up, and says so.
    await expect(page.getByRole("heading", { name: COPY.plan.title })).toBeVisible();

    // Before a dollar is placed, every card says what the truck would be left cooking with if
    // that line took the lot. Sending it all to a line that is not stock is a legal plan that
    // opens four Saturdays with an empty window, and the card says so before it is pressed
    // rather than four Saturdays later.
    await expect(restLine(page, "cut")).toHaveAccessibleName(new RegExp(`0 ${COPY.plan.lineNotes.stock}`));
    await expect(restLine(page, "cut")).toHaveAttribute("data-warn", "true");
    await expect(restLine(page, "stock")).toHaveAttribute("data-warn", "false");

    await setLine(page, POP_UP_SCENARIO.lines.stock.label, 600);
    await page.getByRole("button", { name: COPY.plan.check }).click();
    await expect(page.getByRole("heading", { name: COPY.plan.title })).toBeVisible();
    await expect(page.locator(".popup-commit")).toContainText(COPY.plan.unassigned);

    // The refusal is said out loud, not left to a figure that has not moved. A student who
    // presses the only button on the screen and is answered by nothing has no way to tell
    // whether the application is broken or they are.
    await expect(page.getByRole("alert")).toContainText(COPY.plan.unassigned);

    // Two more refused saves open the way out of a board a student cannot balance: the
    // step-by-step help, and one split that adds up. This world had the affordance built and
    // never wired, so ten failed attempts produced neither — in the world whose first screen
    // is a division problem. The waits are deliberate: a second identical press inside a
    // double-click is one press, which is how the evidence log stays a record of decisions.
    for (let refused = 0; refused < 2; refused += 1) {
      await page.waitForTimeout(450);
      await page.getByRole("button", { name: COPY.plan.check }).click();
    }
    await expect(page.getByRole("button", { name: COPY.plan.help.open })).toBeVisible();
    await expect(page.getByRole("button", { name: COPY.plan.help.supply })).toBeVisible();

    await setLine(page, POP_UP_SCENARIO.lines.cushion.label, 400);
    const rest = cashToPlan(N, SPOT.id) - 1000;
    // With six hundred already on the stock line the same card is no longer a warning, and it
    // says that too: ten trays, and the amount it would take.
    await expect(restLine(page, "cut")).toHaveAccessibleName(new RegExp(`\\$${rest.toLocaleString("en-US")} 10 ${COPY.plan.lineNotes.stock}`));
    await expect(restLine(page, "cut")).toHaveAttribute("data-warn", "false");
    await restLine(page, "cut").click();
    await expect(page.locator(".popup-commit")).toContainText(COPY.plan.balanced);
    await page.getByRole("button", { name: COPY.plan.commit }).click();

    // 6 — the first Saturday. The order is priced before it is placed.
    await expect(page.getByRole("heading", { name: COPY.first.title })).toBeVisible();
    await orderTrays(page, 3);
    await checkSum(page, COPY.saturday.order.label, orderCost(N, 3));
    await page.getByRole("button", { name: COPY.saturday.open }).click();

    // 7 — the night resolves, and the rebate answers itself from what they cooked.
    await expect(page.getByRole("heading", { name: COPY.standing.title })).toBeVisible();
    await expect(page.locator(".night").first()).toContainText(COPY.night.sold);
    // Three trays into a booth that shifts thirty-eight plates sells out, so the organiser's
    // rebate lands as money this plan never counted on. The student's own stocking decided it.
    await expect(page.locator(".popup-verdict").first()).toContainText(COPY.standing.rebateEarnedWindfall);
    await page.getByRole("button", { name: COPY.standing.alone }).click();
    await orderTrays(page, 3);
    await page.getByRole("button", { name: COPY.standing.action }).click();

    // 8 — the generator dies. The takeover, then the sum it leaves behind.
    await expect(page.getByRole("heading", { name: POP_UP_SCENARIO.breakdown.title })).toBeVisible();
    await expect(page.locator(".breakdown li")).toHaveCount(POP_UP_SCENARIO.breakdown.beats.length);
    await expect(page.locator(".recap .night")).toHaveCount(2);
    await checkSum(page, COPY.generator.gap.label, swapBill(N));
    await page.getByRole("button", { name: COPY.generator.action }).click();

    // 9 — the repair. Money that is already spent says so, and says why.
    await expect(page.getByRole("heading", { name: COPY.repair.title })).toBeVisible();
    await page.locator(".popup-locked button").first().click();
    await expect(page.locator(".popup-locked__reason")).toBeVisible();
    // The cushion is holding the rebate the first Saturday earned as well as the 400 planned
    // into it, so the amount that frees exactly the bill is read off the row rather than
    // assumed.
    const cushionHeld = Number(await page.getByRole("spinbutton", { name: POP_UP_SCENARIO.lines.cushion.label }).inputValue());
    await setLine(page, POP_UP_SCENARIO.lines.cushion.label, cushionHeld - swapBill(N));
    await page.getByRole("button", { name: COPY.repair.commit }).click();

    // 10 — the last Saturday, then the settle-up.
    await expect(page.getByRole("heading", { name: COPY.repair.lastTitle })).toBeVisible();
    await page.getByRole("button", { name: COPY.saturday.open }).click();
    await expect(page.getByRole("heading", { name: POP_UP_SCENARIO.settle.title })).toBeVisible();
    // The ending names decisions rather than restating a table of nights already watched.
    await expect(page.locator(".season-table")).toHaveCount(0);
    await expect(page.locator(".resolve-risks li").first()).toBeVisible();
    await page.getByRole("button", { name: COPY.settle.action }).click();

    // 11 — the organiser's question, and a person at the other end of it.
    await expect(page.getByRole("heading", { name: COPY.writeUp.title })).toBeVisible();
    await expect(page.locator(".writeup__ask")).toContainText(POP_UP_SCENARIO.writeUp.note);
    await page.locator(".writeup__tiles button").nth(0).click();
    await page.locator(".writeup__tiles button").nth(1).click();
    const answer = "I kept the cushion at four hundred because the generator is rented and rented things break. That is where the swap money came from.";
    await page.getByLabel(COPY.writeUp.field).fill(answer);

    // The answer a person reads and marks is the last thing in the run and it used to be the
    // only thing never written down until the submit button: a reload here threw away the
    // whole paragraph and every number picked, and left a submit button that could not be
    // pressed. It is a draft now, and drafts survive the page going away.
    await page.reload();
    await expect(page.getByLabel(COPY.writeUp.field)).toHaveValue(answer);
    await expect(page.locator('.writeup__tiles button[aria-pressed="true"]')).toHaveCount(2);
    await page.getByRole("button", { name: COPY.writeUp.submit }).click();

    await expect(page.getByRole("heading", { name: COPY.submitted.sent })).toBeVisible({ timeout: 15_000 });
    await noSeriousAxeViolations(page);

    // The class holds one submission, and it is this world's.
    const submissions = await request.get(`${API}/classes/${classCode}/submissions`, {
      headers: { "X-BOW-Teacher-Key": createClassKeyFor(classCode) },
    });
    expect(submissions.status()).toBe(200);
    const body = (await submissions.json()) as { submissions: { seatCode: string; log: { worldId: string }[] }[] };
    expect(body.submissions).toHaveLength(1);
    expect(body.submissions[0]?.seatCode).toBe("12");
    expect(new Set(body.submissions[0]?.log.map((event) => event.worldId))).toEqual(new Set(["food-truck"]));
  });

  test("a class set one world opens it with no screen in between", async ({ page, request }) => {
    // The guard on the entry flow: with the picker shipped, a class that was set Basketball —
    // which is every class created before worlds could be chosen — must land exactly where it
    // used to, and never see a card asking a question with one answer.
    const classCode = await classWithOneWorld(request, "basketball");
    await gotoFreshChallenge(page);
    await join(page, classCode, "3");
    await expect(page.getByRole("button", { name: "Find Avery a place" })).toBeVisible();
    await expect(page.locator(".worldcard")).toHaveCount(0);
  });

  test("a class set only the market opens the market with no screen in between", async ({ page, request }) => {
    const classCode = await classWithOneWorld(request, "food-truck");
    await gotoFreshChallenge(page);
    await join(page, classCode, "4");
    await expect(page.getByRole("heading", { name: COPY.spot.title })).toBeVisible();
    await expect(page.locator(".worldcard")).toHaveCount(0);
  });

  test("a reload mid-choice lands back on the same choice, and mid-market on the market", async ({ page, request }) => {
    const classCode = await classWithChoice(request);
    await gotoFreshChallenge(page);
    await join(page, classCode, "5");
    await expect(page.locator(".worldcard")).toHaveCount(2);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Pick a world. Make it count." })).toBeVisible();
    await pickPopUp(page);
    await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();

    // The attempt is written to this browser within a quarter of a second of a decision;
    // arriving at a screen is written down at once. Both are the app's own cadence, and a
    // reload has to be able to happen after either.
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByRole("heading", { name: COPY.spot.title })).toBeVisible();
    await expect(page.getByRole("button", { name: `${COPY.spot.taken}: ${SPOT.title}` })).toBeVisible();
  });

  test("the choice screen and the opening board work with a keyboard only", async ({ page, request }) => {
    const classCode = await classWithChoice(request);
    await gotoFreshChallenge(page);
    // The sign-in has its own keyboard-only test next door, so this one starts where the
    // question this world adds begins: the choice, and the board behind it.
    const card = await seatOnRoster(page, classCode, "6");
    await signIn(page, { ...card, classCode });
    const start = page.getByRole("link", { name: /^(Start|Carry on)$/ });
    await start.focus();
    await page.keyboard.press("Enter");
    const enter = page.getByRole("button", { name: /Start the eight weeks|Go in/ });
    await enter.focus();
    await enter.press("Enter");

    // Both cards are reachable by tabbing forward from the top of the document.
    await expect(page.locator(".worldcard")).toHaveCount(2);
    const reached = new Set<string>();
    for (let press = 0; press < 12; press += 1) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
      if (name.startsWith("Start this one")) reached.add(name);
    }
    expect([...reached].sort()).toEqual([
      `Start this one: ${BASKETBALL_TITLE}`,
      `Start this one: ${POP_UP_SCENARIO.title}`,
    ].sort());
    const popUpCard = page.getByRole("button", { name: `Start this one: ${POP_UP_SCENARIO.title}` });
    await popUpCard.focus();
    await popUpCard.press("Enter");

    const booth = page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` });
    await booth.focus();
    await booth.press("Enter");
    await checkSum(page, COPY.spot.owed.label, owedUpFront(N, SPOT.id));
    await page.getByRole("button", { name: COPY.spot.action }).press("Enter");
    for (const source of ["catering", "rebate"] as const) {
      await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).press("Enter");
    }
    await checkSum(page, COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
    await page.getByRole("button", { name: COPY.money.action }).press("Enter");

    // The board itself: the keys on a row move money, and the row says what it now holds.
    const stock = page.getByRole("spinbutton", { name: POP_UP_SCENARIO.lines.stock.label });
    await stock.focus();
    for (let press = 0; press < 12; press += 1) await stock.press("ArrowUp");
    await expect(stock).toHaveAttribute("aria-valuenow", String(12 * N.planIncrement));
    await stock.press("PageUp");
    await expect(stock).toHaveAttribute("aria-valuenow", String(17 * N.planIncrement));

    // And the one-tap close is a button, so it is reachable and pressable without a mouse.
    const closer = page.locator(".popup-closer__choice button").first();
    await closer.focus();
    await closer.press("Enter");
    await expect(page.locator(".popup-commit")).toContainText(COPY.plan.balanced);
    await page.getByRole("button", { name: COPY.plan.commit }).press("Enter");
    await expect(page.getByRole("heading", { name: COPY.first.title })).toBeVisible();
  });

  test("the market runs with motion turned off", async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const classCode = await classWithChoice(request);
    await gotoFreshChallenge(page);
    await join(page, classCode, "7");
    await pickPopUp(page);
    await buildOpeningPlan(page, { stock: 600, cushion: 400 });
    await orderTrays(page, 3);
    await checkSum(page, COPY.saturday.order.label, orderCost(N, 3));
    await page.getByRole("button", { name: COPY.saturday.open }).click();
    await page.getByRole("button", { name: COPY.standing.alone }).click();
    await orderTrays(page, 3);
    await page.getByRole("button", { name: COPY.standing.action }).click();

    // The takeover is the one animated moment in the world. With motion off the beats are
    // simply there — present, opaque, and not mid-transition.
    const beats = page.locator(".breakdown li");
    await expect(beats).toHaveCount(POP_UP_SCENARIO.breakdown.beats.length);
    for (let index = 0; index < POP_UP_SCENARIO.breakdown.beats.length; index += 1) {
      await expect(beats.nth(index)).toBeVisible();
      expect(await beats.nth(index).evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
    }
    await noSeriousAxeViolations(page);
  });

  test("every screen holds together at 1024 and at 640", async ({ page, request }) => {
    const classCode = await classWithChoice(request);

    for (const viewport of [{ width: 1024, height: 600 }, { width: 640, height: 900 }]) {
      await page.setViewportSize(viewport);
      await gotoFreshChallenge(page);

      // The way in leads at narrow widths: the one thing a student has to do is on screen.
      await expect(page.getByRole("link", { name: /class code/i }).first()).toBeInViewport();
      await noHorizontalOverflow(page);

      // Seats in ascending order: the roster hands them out in order, so asking for a lower
      // number after a higher one asks for a seat that is already there.
      await join(page, classCode, viewport.width === 640 ? "9" : "8");
      await expect(page.locator(".worldcard")).toHaveCount(2);
      // Both cards fit a Chromebook. On a phone they stack, so the first card's action is on
      // screen and the second card's title is under it — a list, not a hidden option.
      await expect(page.locator(".worldcard .button").first()).toBeInViewport();
      await expect(page.locator(".worldcard h2").nth(1)).toBeInViewport();
      await noHorizontalOverflow(page);

      await pickPopUp(page);
      await expect(page.getByRole("heading", { name: COPY.spot.title })).toBeVisible();
      await noHorizontalOverflow(page);

      await buildOpeningPlan(page, { stock: 600, cushion: 400 });
      await expect(page.getByRole("heading", { name: COPY.first.title })).toBeVisible();
      await noHorizontalOverflow(page);

      await orderTrays(page, 3);
      await checkSum(page, COPY.saturday.order.label, orderCost(N, 3));
      await page.getByRole("button", { name: COPY.saturday.open }).click();
      await page.getByRole("button", { name: COPY.standing.alone }).click();
      await orderTrays(page, 3);
      await page.getByRole("button", { name: COPY.standing.action }).click();
      await expect(page.getByRole("heading", { name: POP_UP_SCENARIO.breakdown.title })).toBeVisible();
      await noHorizontalOverflow(page);
    }
  });
});

test.describe("reflow", () => {
  test("@reflow every market screen fits the width it is given", async ({ page, request }) => {
    // The same sweep the other world gets, at whatever width the project is set to. It exists
    // because the pop-up carries its own top bar with four Saturdays in it, and a strip of
    // four cells is exactly the kind of thing that stops fitting before anybody notices.
    const classCode = await classWithChoice(request);
    await gotoFreshChallenge(page);
    await noHorizontalOverflow(page);

    await join(page, classCode, "2");
    await noHorizontalOverflow(page);
    await pickPopUp(page);
    await noHorizontalOverflow(page);

    await buildOpeningPlan(page, { stock: 600, cushion: 400 });
    await noHorizontalOverflow(page);

    await orderTrays(page, 3);
    await checkSum(page, COPY.saturday.order.label, orderCost(N, 3));
    await page.getByRole("button", { name: COPY.saturday.open }).click();
    await noHorizontalOverflow(page);

    await page.getByRole("button", { name: COPY.standing.alone }).click();
    await orderTrays(page, 3);
    await page.getByRole("button", { name: COPY.standing.action }).click();
    await noHorizontalOverflow(page);

    await checkSum(page, COPY.generator.gap.label, swapBill(N));
    await page.getByRole("button", { name: COPY.generator.action }).click();
    await noHorizontalOverflow(page);

    const cushionHeld = Number(await page.getByRole("spinbutton", { name: POP_UP_SCENARIO.lines.cushion.label }).inputValue());
    await setLine(page, POP_UP_SCENARIO.lines.cushion.label, cushionHeld - swapBill(N));
    await page.getByRole("button", { name: COPY.repair.commit }).click();
    await noHorizontalOverflow(page);

    await page.getByRole("button", { name: COPY.saturday.open }).click();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: COPY.settle.action }).click();
    await noHorizontalOverflow(page);
  });
});

test.describe("zoom", () => {
  test("@zoom the choice and the market hold at 400%", async ({ page, request }) => {
    const measured: { screen: string; px: number }[] = [];
    const note = async (screen: string) => {
      const px = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      measured.push({ screen, px });
    };
    const classCode = await classWithChoice(request);
    await gotoFreshChallenge(page);
    await join(page, classCode, "3");
    await note("the world picker");
    await pickPopUp(page);
    await note("the booths");
    await buildOpeningPlanUpToBoard(page);
    await note("the opening board");

    const spilling = measured.filter((entry) => entry.px > 1);
    expect(spilling.map((entry) => `${entry.screen}: ${entry.px}px`), "screens that scroll sideways").toEqual([]);
  });
});

test.describe("the route the pop-up lives on", () => {
  test("is the challenge route both worlds share", async ({ page }) => {
    // No new route ships with the second world: the shell picks the world, so a class code
    // and a bookmark keep working exactly as they did.
    await page.goto(PLAN_UNDER_PRESSURE.route);
    // With no session it hands the student to the one door there is, which is the same
    // behaviour for both worlds — the route itself never names one.
    await expect(page.getByLabel("Class code")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/join");
  });
});
