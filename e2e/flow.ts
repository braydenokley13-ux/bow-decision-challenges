import { expect, type APIRequestContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { COUNT_BONUS_BUTTON, NUMBERS as N } from "./plan";
import { PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import type { ClassCreation } from "../src/platform/classes/types";
import { buildSubmission } from "../src/test/runChallenge";
import { REASONING_CRITERIA } from "../src/domain/blueprint/reasoning";
import { REASONING_MAXIMUM } from "../src/domain/evidence/grade";
import { STUDENT_COPY } from "../src/content/studentCopy";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck/scenario";

/**
 * One driver for both the assertion suite and the screenshot walkthrough.
 *
 * These used to be two copies of the same click sequence with slightly different
 * selectors — `scripts/walkthrough.mjs` and `e2e/bow.spec.ts` — which meant a change to
 * the student flow had to be made twice and could silently be made only once.
 */

// ---------------------------------------------------------------------------
// Shared a11y + copy assertions
// ---------------------------------------------------------------------------

export async function noSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

export async function noStaleCopy(page: Page) {
  const body = page.locator("body");
  await expect(body).not.toContainText(/fashion/i);
  await expect(body).not.toContainText(/coming soon/i);
}

export async function noHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
}

// ---------------------------------------------------------------------------
// Student-flow helpers. Every helper composes the exact accessible names the
// app renders today so tests read like the steps a student actually takes.
// ---------------------------------------------------------------------------

/**
 * A real class, created through the real API. Every student path in this suite joins one,
 * because a suite that started the challenge without a class would not be exercising the
 * thing a pilot depends on.
 */
export async function createClass(request: APIRequestContext, label = "Browser suite"): Promise<ClassCreation> {
  const response = await request.post(`${API}/classes`, {
    data: { label, challengeId: PLAN_UNDER_PRESSURE.id },
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = (await response.json()) as ClassCreation;
  CREATED_KEYS.set(created.code, created.teacherKey);
  return created;
}

/**
 * The key for a class the suite created. The fixture keeps only the code, and reading a
 * class back is the educator's job — so the test asks the API for its own class the same
 * way the setup page did.
 */
const CREATED_KEYS = new Map<string, string>();

export function createClassKeyFor(code: string): string {
  const known = CREATED_KEYS.get(code);
  if (!known) throw new Error(`No teacher key recorded for class ${code}.`);
  return known;
}

/**
 * Extra finished runs, posted through the real submission endpoint.
 *
 * Every log here is produced by driving the real reducer through a real run — the same
 * module the unit suite uses — so what the service stores and what the educator surface
 * reads is indistinguishable from a browser's. It exists because some educator behaviour
 * only appears at a class-sized denominator: the minimum-n guard opens at five runs, and
 * walking five students through the whole challenge in a browser to assert one heading is
 * ten minutes of test for a rule that does not depend on the clicking.
 */
export async function seedRuns(
  request: APIRequestContext,
  classCode: string,
  seats: readonly { seat: string; savingsAsLeftovers?: boolean }[],
): Promise<void> {
  for (const entry of seats) {
    // Seated and signed in, exactly as a student is. Since a rostered class refuses work that
    // cannot say who sent it, a seeded run that skipped this would be testing the educator
    // surface against evidence the service would have rejected from a real room.
    const token = await seatAndSignIn(request, classCode, entry.seat);
    const built = buildSubmission({
      seatCode: entry.seat,
      closeOpeningInto: entry.savingsAsLeftovers === false ? "flexibleCash" : "goal",
      defenseText: `Seat ${entry.seat}: I kept the course money where it was and gave up part of the reserve after Week 5.`,
    });
    const response = await request.post(`${API}/classes/${classCode}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        classCode,
        seatCode: built.seatCode,
        sessionId: built.sessionId,
        challengeId: built.challengeId,
        challengeVersion: built.challengeVersion,
        log: built.log,
      },
    });
    expect(response.status(), await response.text()).toBe(202);
  }
}

/**
 * What a seeded roster calls the student in seat *n*.
 *
 * There were three of these and two of them disagreed: the server-seeded path wrote
 * "Seeded Student 3" and the browser-driven path wrote "Test Student 3", for no reason either
 * of them recorded, and `pilot.spec.ts` documented the second in prose as though it were the
 * rule. Nothing downstream can tell the two apart — a roster label is a roster label — so the
 * only thing the difference ever did was decide which assertions were wrong, and two tests
 * were asserting a name their own helper does not produce.
 *
 * One function, so a test asserting a name and a helper writing one cannot drift again.
 */
export function rosterName(seat: number): string {
  return `Test Student ${seat}`;
}

/**
 * A seat on the roster and a session holding it, without a browser.
 *
 * The same two calls the join screen makes, in the same order, with the same bodies — so a
 * seeded student is indistinguishable from a real one to everything downstream. Seats are
 * handed out in order, so this asks for as many rows as it takes to reach the one it wants.
 */
async function seatAndSignIn(request: APIRequestContext, classCode: string, seatCode: string): Promise<string> {
  const key = createClassKeyFor(classCode);
  const wanted = Number(seatCode);
  if (!Number.isInteger(wanted) || wanted < 1) throw new Error(`Seat ${seatCode} is not a seat number.`);
  const listed = await request.get(`${API}/classes/${classCode}/roster`, { headers: { "X-BOW-Teacher-Key": key } });
  const already = ((await listed.json()) as { roster?: readonly { seatCode: string }[] }).roster ?? [];
  let card = already.find((row) => row.seatCode === String(wanted)) as JoinCard | undefined;
  if (!card) {
    const names = Array.from({ length: wanted - already.length }, (_, index) => rosterName(already.length + index + 1));
    const created = await request.post(`${API}/classes/${classCode}/roster`, {
      headers: { "X-BOW-Teacher-Key": key },
      data: { names },
    });
    expect(created.status(), await created.text()).toBe(201);
    card = ((await created.json()) as { cards: JoinCard[] }).cards.at(-1);
  }
  if (!card?.joinCode) throw new Error(`Seat ${seatCode} in ${classCode} was already claimed; seed it before anyone signs in.`);
  const joined = await request.post(`${API}/classes/${classCode}/join`, {
    data: { classCode, seatCode: card.seatCode, joinCode: card.joinCode, device: "shared" },
  });
  expect(joined.status(), await joined.text()).toBe(200);
  return ((await joined.json()) as { token: string }).token;
}

/** A person's marks on one seat's writing, through the endpoint the reading queue uses. */
export async function scoreWriting(
  request: APIRequestContext,
  classCode: string,
  teacherKey: string,
  seat: string,
): Promise<void> {
  const scores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));
  const response = await request.patch(`${API}/classes/${classCode}/submissions/${seat}`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
    data: { reasoningPoints: REASONING_MAXIMUM, reasoningCriteria: scores },
  });
  expect(response.status(), await response.text()).toBe(200);
}

/**
 * A browser with nothing in it, parked somewhere that will not bounce.
 *
 * It used to land on the challenge route and reload, which worked while that route *was*
 * the sign-in. It is not one any more: arriving there without a session sends the student to
 * `/join`, so clearing storage there and reloading is a race between the wipe and the
 * redirect. The front door has no session of its own to lose.
 */
export async function gotoFreshChallenge(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

/**
 * Where the class service lives for a test talking to it directly rather than through a page.
 *
 * One constant, exported, because there were nineteen copies of the literal `4180` across
 * five files and they are not decoration. A browser test reaches the service through the app
 * — Vite proxies `/api` at whatever origin `baseURL` names — while `request.post` here goes
 * straight to the service. When those two resolve to different processes the suite seeds a
 * class into one service and then asks the other about it, and every student journey fails
 * on a class that was created successfully a line earlier. That is not a hypothesis: with the
 * app on a private port and the literal still here, the seeding helpers kept writing to a
 * class service somebody else had started an hour before.
 *
 * `playwright.config.ts` reads `BOW_API_PORT` for the same purpose and defaults it the same
 * way, so the page and the request agree by construction rather than by both being edited.
 */
export const API_ORIGIN = `http://127.0.0.1:${process.env.BOW_API_PORT ?? "4180"}`;
export const API = `${API_ORIGIN}/api`;

/**
 * Puts a named seat on a class's roster and hands back the card a student would be given.
 *
 * Seats are handed out in order by the service, which is the right behaviour for a teacher
 * pasting a class list and the wrong shape for a test that wants seat 7 in particular — so
 * this asks for as many rows as it takes to reach the seat it wants and returns the last.
 *
 * Seating the roster is not test scaffolding around the product: a class with a roster is the
 * configuration the product is *for*, and it is the one where a submission has to arrive from
 * somebody who is actually in the room. A suite that only ever ran open-join classes would
 * have covered the path a pilot does not use.
 */
export async function seatOnRoster(page: Page, classCode: string, seatCode: string): Promise<JoinCard> {
  const wanted = Number(seatCode);
  if (!Number.isInteger(wanted) || wanted < 1) throw new Error(`Seat ${seatCode} is not a seat number.`);
  const existing = await page.request.get(`${API}/classes/${classCode}/roster`, {
    headers: { "X-BOW-Teacher-Key": createClassKeyFor(classCode) },
  });
  const already = ((await existing.json()) as { roster?: readonly { seatCode: string }[] }).roster ?? [];
  const seated = already.find((entry) => entry.seatCode === String(wanted));
  if (seated) throw new Error(`Seat ${seatCode} in ${classCode} is already on the roster.`);
  const names = Array.from({ length: wanted - already.length }, (_, index) => rosterName(already.length + index + 1));
  const response = await page.request.post(`${API}/classes/${classCode}/roster`, {
    headers: { "X-BOW-Teacher-Key": createClassKeyFor(classCode) },
    data: { names },
  });
  expect(response.status(), await response.text()).toBe(201);
  const cards = ((await response.json()) as { cards: JoinCard[] }).cards;
  const card = cards.at(-1);
  if (!card || card.seatCode !== String(wanted)) throw new Error(`Asked for seat ${seatCode}, got ${card?.seatCode}.`);
  return card;
}

/** What a student is handed on a card, and the three things they type or tap to get in. */
export interface JoinCard { seatCode: string; displayName: string; joinCode: string }

/**
 * Signs a student in through the door a student actually uses: class code, their own name off
 * their teacher's list, the code on their card.
 *
 * This is the whole of identity in this product now. There is no second route, and there is
 * deliberately no test-only one — a suite that reached the run by setting a token would not be
 * covering the screen every student in the pilot meets first.
 */
export async function signIn(page: Page, card: JoinCard & { classCode: string }) {
  await page.goto("/join");
  await page.getByLabel("Class code").fill(card.classCode);
  await page.getByRole("button", { name: "Next" }).click();
  // Two typed codes and no list of names in between: the card resolves the seat by itself, so
  // the door never has to publish who is in the class.
  await page.getByLabel("Your code").fill(card.joinCode);
  await page.getByRole("button", { name: "Go in" }).click();
  // Arrived, and arrived as this student.
  //
  // This waited for a `Start`/`Carry on` link, which exists in only two of the student page's
  // three states: a student who has already turned in is offered *Run it again?* instead, and
  // deliberately — starting again must not read as the only thing left to do, and it does not
  // take the last run back. So a journey that signed the same student in a second time to read
  // their teacher's reply failed at the door, on a link the screen is right not to be showing.
  //
  // What is true in every state is that the page is theirs and says whose it is. Waiting on the
  // name is also the stronger assertion: two students signing in one after the other on one
  // Chromebook becoming one account is the defect this door was rebuilt to close, and a helper
  // every student journey passes through is the right place to keep watching for it.
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
}

/**
 * Signs in, opens the run, picks the season where the class offers a choice, and steps past
 * the contract. Seats differ so runs never collide.
 *
 * A class set to let students choose opens on the picker, which is the product working: this
 * helper drives the Basketball path, so it answers that question rather than assuming the
 * screen is not there.
 */
export async function enterChallenge(page: Page, options: { classCode: string; seatCode?: string }) {
  const card = await seatOnRoster(page, options.classCode, options.seatCode ?? "7");
  await signIn(page, { ...card, classCode: options.classCode });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
}

/**
 * The confirm screen, on the builds that still draw one.
 *
 * A signed-in student does not meet this any more, and that is a decision rather than a
 * regression: `StudentChallenge.tsx` starts the session in an effect the moment a seat
 * resolves, because the student "came from their own home page, which shows their name,
 * offers 'Not you?' and has a button reading *Start*" — two critics and a student red team
 * counted four screens between the door and the game, two of which only confirmed what the
 * student had just done. So the reducer leaves `entry` before anything is painted and the
 * run opens on the picker.
 *
 * The button is still real and still has to work. A build with no class service resolves a
 * seat during render and draws this screen for real, which is how the guide's "Try it as a
 * student" lets a teacher play the run without a roster — so this presses it where it is
 * offered rather than deleting the step.
 *
 * Waiting on whichever screen actually arrives, rather than on the button alone, is the same
 * lesson `stepPastTheDeal` records: clicking a screen the product has stopped showing hangs
 * every student journey in the suite on one line, for a reason none of them was checking.
 */
export async function startIfConfirmAsked(page: Page) {
  const confirm = page.getByRole("button", { name: /^(Start the eight weeks|Go in)$/ });
  const picker = page.getByRole("heading", { name: STUDENT_COPY.choose.title });
  const contract = page.getByRole("button", { name: "Find Avery a place" });
  const ranking = page.getByRole("heading", { name: /Which place costs the least/i });
  // The market's own first screen. Every alternative above is one of Basketball's, which was
  // true when this was written and stopped being true when a second world shipped: a class set
  // to the market only lands a student here, correctly, and this helper then waited five
  // minutes for a basketball screen that was never coming. Two tests died on that line for a
  // reason neither of them was about, which is the exact failure the note above records
  // happening once already.
  const market = page.getByRole("heading", { name: POP_UP_SCENARIO.screens.spot.title });
  await expect(confirm.or(picker).or(contract).or(ranking).or(market).first()).toBeVisible();
  if (await confirm.count()) await confirm.click();
}

/**
 * The contract screen, where the build still has one.
 *
 * The beats either side of it have been rebuilt more than once and the screen itself has come
 * and gone with them, so pressing through it unconditionally made every student test in the
 * suite fail at the same line for a reason that had nothing to do with what any of them was
 * checking. This waits for whichever screen actually arrives and steps past the deal only if
 * the deal is one of them.
 */
export async function stepPastTheDeal(page: Page) {
  const deal = page.getByRole("button", { name: "Find Avery a place" });
  const ranking = page.getByRole("heading", { name: /Which place costs the least/i });
  await expect(deal.or(ranking).first()).toBeVisible();
  if (await deal.count()) await deal.click();
}

/**
 * Answers the world choice with Basketball, where this class was set to offer one.
 *
 * Which screen comes next depends on the class, so this waits for whichever one actually
 * arrives before deciding. Asking whether the picker is visible the instant after the join
 * button is pressed answers "no" for a class that is about to show it, which is how a
 * whole run ends up stranded on a screen it never meant to skip.
 */
export async function chooseSeasonIfOffered(page: Page) {
  const picker = page.getByRole("heading", { name: STUDENT_COPY.choose.title });
  const contract = page.getByRole("button", { name: "Find Avery a place" });
  await expect(picker.or(contract)).toBeVisible();
  if (await picker.isVisible()) {
    await page.getByRole("button", { name: /Start this one/ }).first().click();
  }
}

/**
 * Serve a Saturday to the end and close up.
 *
 * The window used to open straight onto the next decision. It now opens onto the evening the
 * student ordered for — the counter emptying, the lane still there, the till climbing — and
 * that screen sits between every `saturday.open` and whatever follows it.
 *
 * `golden.spec.ts` was written before that screen existed and nobody added it, so the market's
 * golden path pressed *open the window* and then spent three minutes waiting for a tips jar
 * that was two screens away. The suite reported a timeout; the product was working perfectly.
 * That is the whole reason this lives in `flow.ts` instead of being pasted into a second spec:
 * a click sequence kept in two places is a click sequence that will be updated in one.
 *
 * `nights` is required rather than inferred because the standing order serves **two** Saturdays
 * back to back. A loop that just kept closing whatever it found would pass whether it served
 * two nights or none, which is how a helper starts quietly skipping the thing it is named for.
 */
export async function serveTheNight(page: Page, nights = 1) {
  for (let night = 0; night < nights; night += 1) {
    await expect(
      page.getByRole("button", { name: "Serve automatically" }),
      `night ${night + 1} of ${nights}: the window opened but no evening was there to run`,
    ).toBeVisible();
    await page.getByRole("button", { name: "Serve automatically" }).click();
    const closeUp = page.getByRole("button", { name: /^(Close up|See how)/ });
    await closeUp.waitFor({ state: "visible", timeout: 120_000 });
    await closeUp.click();
  }
}

export const SETUP_ORDER = ["gym-sublet", "teammate-share", "cousin-room"] as const;

/** Titles as the cards render them, so the ranking helper can find each row. */
export const SETUP_TITLES: Record<(typeof SETUP_ORDER)[number], string> = {
  "gym-sublet": "Gym District Sublet",
  "teammate-share": "Teammate Share",
  "cousin-room": "Cousin\u2019s Spare Room",
};

/**
 * Order the three places cheapest-first over eight weeks, pick one, and total it. The
 * ranking is done with the move buttons so the path is the keyboard-operable one.
 */
/** Puts the three places in true cheapest-first order using the move buttons. */
export async function rankPlacesCorrectly(page: Page) {
  const cheapestFirst = [...SETUP_ORDER].sort((a, b) => N.setupCosts[a] - N.setupCosts[b]);
  for (let target = 0; target < cheapestFirst.length; target += 1) {
    const wanted = cheapestFirst[target];
    const title = SETUP_TITLES[wanted];
    for (let guard = 0; guard < 4; guard += 1) {
      const rows = page.locator(".rank-list li");
      const positions = await rows.allInnerTexts();
      const current = positions.findIndex((text) => text.includes(title));
      if (current === target) break;
      await rows.nth(current).getByRole("button", { name: `Move ${title} earlier` }).click();
    }
  }
  await page.getByRole("button", { name: "Check the order" }).click();
}

export async function completeSetupStage(page: Page, chosenIndex: 0 | 1 | 2, onCards?: () => Promise<void>) {
  await rankPlacesCorrectly(page);
  await page.locator(".place-card").nth(chosenIndex).getByRole("button", { name: "Choose this setup" }).click();
  const chosen = SETUP_ORDER[chosenIndex];
  await page.getByLabel(`What the ${SETUP_TITLES[chosen]} costs Avery`).fill(String(N.setupCosts[chosen]));
  await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
  await onCards?.();
  await page.getByRole("button", { name: "Build the plan" }).click();
}

/** What the planning screen calls each of its four questions, and how it moves between them. */
/**
 * The plan's four screens, named by the product rather than by this file.
 *
 * These were eight hard-copied strings, and the copy rewrite that made both worlds readable
 * changed four of them — three em dashes became colons and "Yes — count on it" became
 * "Yes, count on it". Every one of those is a better sentence and not one of them is a
 * behaviour change, but the suite was looking for buttons that no longer existed, so the two
 * golden paths sat waiting three minutes for a click that could never land and then reported
 * a timeout. A student would have been fine. The evidence that a student is fine was gone.
 *
 * A test suite that keeps its own copy of the words is a suite that reports a rewrite as a
 * regression, which is worse than useless: it trains everyone to distrust it precisely when
 * the product is being improved. So the words come from the one place that defines them. If a
 * button is renamed again, this follows it; if a button is *removed*, this fails to compile,
 * which is the failure that was actually wanted.
 */
const PLAN_COPY = STUDENT_COPY.plan.steps;

export const PLAN_STEP = {
  countOn: PLAN_COPY.countOn.name,
  bonuses: PLAN_COPY.bonuses.name,
  committed: PLAN_COPY.committed.name,
  countBonus: PLAN_COPY.bonuses.yes,
  leaveBonus: PLAN_COPY.bonuses.no,
  toBonuses: PLAN_COPY.countOn.next,
  toCommitted: PLAN_COPY.bonuses.next,
  toPlan: PLAN_COPY.committed.next,
} as const;

/**
 * Questions 1 to 3 of the plan, walked one screen at a time.
 *
 * They used to be three stacked sections on one page revealed in order. They are now three
 * screens under one stage, so the suite presses the same buttons a student does rather than
 * filling a form that happens to be taller than the window.
 *
 * **Both bonuses are answered out loud, always, including when the answer is no.** This used to
 * press a button only where the caller wanted a bonus counted and walk past the card otherwise,
 * which worked while both cards opened with *No — leave it out* already pressed. That default
 * was removed on purpose (`StudentChallenge.tsx`: a student who pressed Next without reading
 * scored full marks on the micro-skill that asks whether conditional money was kept out of the
 * total, for a decision they never made), and the step now refuses to advance until a person
 * has answered both. A helper that skips the card is a helper asserting the old default is
 * still there — and it fails not on the bonus screen but one screen later, looking for a button
 * that has not been earned yet.
 */
export async function completeWorkingCalcs(page: Page, opts: { attendance?: boolean; showcase?: boolean } = {}) {
  await page.getByLabel(PLAN_STEP.countOn).fill(String(N.savings + N.basePay));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: PLAN_STEP.toBonuses }).click();
  const answers = [Boolean(opts.attendance), Boolean(opts.showcase)];
  for (const [index, counted] of answers.entries()) {
    await page.locator(".bet").nth(index).getByRole("button", { name: counted ? PLAN_STEP.countBonus : PLAN_STEP.leaveBonus }).click();
  }
  await page.getByRole("button", { name: PLAN_STEP.toCommitted }).click();
  await page.getByLabel(PLAN_STEP.committed).fill(String(N.essentialsTotal));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  // The four questions of this screen live under one stage id and change the headline, so
  // each answer starts the same arrival scroll a stage change does — and this last press is
  // the one that walks off the screen. Caught doing it in `bow.spec.ts:1384`, where Playwright
  // reported *element is not stable* and then *element was detached from the DOM*, which is
  // the same race saying the same thing in Playwright's own words.
  await theScreenHasStoppedMoving(page);
  await page.getByRole("button", { name: PLAN_STEP.toPlan }).click();
}

/** What the season screen calls the button that opens the course-deposit decision. */
export const TO_DEPOSIT = `Week ${N.course.depositDeadlineWeek} · the course office is calling`;

/**
 * Answers Week 3's competing claims, then the course-deposit deadline that follows them.
 *
 * Weeks 1–4 used to be four presses of "Play Week N" charging the same rent every time, then
 * one press that resolved them together. There is a decision in the middle of them now: Avery
 * is handed cash three things want and cannot all have, and the week does not end until the
 * student has funded something and said what made them leave the rest out. So the helper does
 * what a student does — takes one claim, gives a reason — rather than pressing past a beat the
 * product will refuse to let anybody press past.
 *
 * `claim` is which of the three, in the order the screen lists them. The first fits inside the
 * cash on its own and the other two then cannot, which is the shape of the decision.
 */
export async function playSeasonWeeks(page: Page, opts: { deposit?: boolean; claim?: number; reason?: number } = {}) {
  await page.locator(".claims__list button").nth(opts.claim ?? 0).click();
  await page.locator(".claims__why button").nth(opts.reason ?? 0).click();
  await page.getByRole("button", { name: TO_DEPOSIT }).click();
  await page.getByRole("button", { name: opts.deposit ? "Reserve it now" : "Wait and decide later" }).click();
  await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();
}

export async function setAmount(page: Page, label: string, value: string) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(value);
  await field.press("Tab");
}



/**
 * The cards Week 5 actually moved. The strip also carries committed lines the week leaves
 * alone — rent, the weekly basics, a seat already reserved, a bonus the student left out —
 * so selecting every card on screen is now a wrong answer rather than the whole task.
 */
export const MOVED_TILES = ".gap-tiles button[data-line='lost'], .gap-tiles button[data-line='bill']";
export const HELD_TILES = ".gap-tiles button[data-line='committed'], .gap-tiles button[data-line='uncounted']";

/** Selects the gap tiles that belong to this student's plan and checks the sum. */
export async function passWeek5Calculation(page: Page, total: string) {
  const tiles = page.locator(MOVED_TILES);
  const count = await tiles.count();
  for (let i = 0; i < count; i += 1) await tiles.nth(i).click();
  await page.getByLabel("Total change to Avery’s money").fill(total);
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
}

export async function decideOpportunity(page: Page, opts: { clinics: boolean; countBonus: boolean }) {
  await page.getByRole("button", { name: opts.clinics ? "Take the clinics" : "Keep the Saturdays" }).click();
  await page.getByRole("button", { name: opts.countBonus ? COUNT_BONUS_BUTTON : PLAN_STEP.leaveBonus }).click();
}

/**
 * Waits until the screen has stopped moving under its own steam.
 *
 * **A press that begins on a control and ends 40px above it is not a press.** `StageShell`
 * scrolls every new screen — and every new question inside one — back to the top, smoothly,
 * from wherever the last one ended: `app/useStageArrival.ts`, which says of that scroll that
 * it "has to be the last scroll of the transition". A helper that presses the way on the
 * instant the new heading exists is pressing into that scroll, and on a loaded machine the
 * two CDP messages that make up a click land either side of a frame.
 *
 * Caught in the act, twice, with a listener on the button — at 1366×768 and again at
 * 1024×600, in `bow.spec.ts:912` and `bow.spec.ts:1509`:
 *
 * ```
 * 7949 pointerdown  BUTTON "Explain my plan"  scrollY=861  button 659-703, cursor 681
 * 7957 mouseup      MAIN.stage-main           scrollY=818  button 702-746, cursor 681
 * 7957 click        MAIN.stage-main
 * ```
 *
 * One frame of the arrival scroll moved the page 43px, the button moved 43px with it, the
 * cursor was left above its top edge, and the browser did what the spec says: `mousedown` and
 * `mouseup` on different elements means the `click` goes to their common ancestor. `main`
 * has no handler, so the button was left focused and never activated, the stage never
 * changed, and the next helper waited five minutes for a screen nothing had asked for.
 *
 * The button travels *downwards* while the page scrolls up because the way on is
 * `position: sticky; bottom: 0` and the arrival leaves the page at its own bottom, where a
 * sticky box sits at its natural position and moves with the document rather than with the
 * window. Nothing is wrong with the control: a press that starts and ends on it works every
 * time, which is why this is rare and why it is load-dependent — it needs a frame long enough
 * to move the page further than half the button's height.
 *
 * **And it is the one shape Playwright's own stability check cannot see.** That check waits
 * for the element's client rect to agree across two animation frames, and while the bar is
 * pinned its rect *is* constant — the trace above shows it at 539-583 through five frames of
 * a scroll that moved the page 100px. It passes honestly. Playwright then scrolls the
 * document to reveal the element's *layout* box, which for a sticky box is its natural
 * position at the foot of the page; that scroll un-pins the bar, and from that moment it is
 * moving, with no stability check left to run. An ordinary control that moves during the
 * arrival fails the check instead and is merely retried — which is what `bow.spec.ts:1384`
 * was reporting as *element is not stable*, then *element was detached from the DOM*.
 *
 * So the helpers wait for the transition the product owns to finish, rather than racing it.
 * `polling: "raf"` is what makes the wait honest on a slow machine: it samples once per
 * animation frame, so "unchanged" means two consecutive frames agreed, and a smooth scroll
 * that is still running moves on every one of them.
 */
export async function theScreenHasStoppedMoving(page: Page, still = 150) {
  await page.waitForFunction(
    (quiet: number) => {
      const held = window as unknown as { __bowStill?: { y: number; since: number } };
      const now = performance.now();
      const seen = held.__bowStill;
      if (!seen || seen.y !== window.scrollY) {
        held.__bowStill = { y: window.scrollY, since: now };
        return false;
      }
      return now - seen.since >= quiet;
    },
    still,
    { polling: "raf" },
  );
}

/** Week 8 resolves the season before the student explains it. */
export async function readWeek8Resolution(page: Page) {
  await expect(page.getByRole("heading", { name: "The season ends." })).toBeVisible();
  // The heading existing is not the screen having arrived: this is the longest arrival scroll
  // in the run — the final plan board leaves the page nine hundred pixels down — and pressing
  // into it is what hung this helper for five minutes. See `theScreenHasStoppedMoving`.
  await theScreenHasStoppedMoving(page);
  await page.getByRole("button", { name: "Explain my plan" }).click();
}

/**
 * The written explanation, turned in the way the screen now asks for it.
 *
 * This tapped two figures and typed the caller's paragraph, which was the whole of it while the
 * gate behind the button was `text.trim().length >= 40`. That gate is gone (`writingGate.ts`),
 * and deliberately: it refused `idk. idk. idk. idk.` and accepted forty characters of `aaaa`,
 * so the product was teaching padding to whoever noticed. What replaced it asks for three
 * things a machine can honestly check — two or three of the student's own figures tapped, those
 * same figures written into the paragraph, and two sentences with something in each — and none
 * of them reads what the writing says.
 *
 * So the helper writes the figures it tapped, and it reads them off the tiles it tapped rather
 * than restating an amount: `numbers.ts` owns those, the tile prints them, and a suite with its
 * own copy of a price is the thing `pricing.test.ts` exists to stop.
 */
/**
 * The write-up, and anything else that screen is carrying.
 *
 * `onWriteUp` runs after the defence is typed and before it is turned in. It is the one moment
 * the rest of that screen can be inspected — the teacher's own closing question sits under the
 * challenge's own, and a required one holds the turn-in button until it is answered.
 */
export async function submitDefense(
  page: Page,
  text: string,
  onWriteUp?: () => Promise<void>,
  tileIndices: number[] = [0, 2],
) {
  const figures: string[] = [];
  for (const index of tileIndices) {
    const tile = page.locator(".interview__stats button").nth(index);
    await tile.click();
    figures.push((await tile.locator(".money").innerText()).trim());
  }
  await page.getByLabel("Two to four sentences").fill(`${text} The numbers I stood on are ${figures.join(" and ")}.`);
  if (onWriteUp) await onWriteUp();
  await page.getByRole("button", { name: "Turn in my plan" }).click();
}

/** Reaches the unlocked working-plan board (cousin-room setup, no bonuses) and stops there. */
export async function reachWorkingBoard(page: Page, classCode: string) {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
}

/** Waits for the finished attempt to actually reach the class before reading it back. */
export async function waitForDelivery(page: Page) {
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible({ timeout: 15_000 });
}

