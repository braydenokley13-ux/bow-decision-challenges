import { expect, test, type Page } from "@playwright/test";
import {
  chooseSeasonIfOffered,
  startIfConfirmAsked,
  completeSetupStage,
  completeWorkingCalcs,
  createClass,
  createClassKeyFor,
  decideOpportunity,
  gotoFreshChallenge,
  passWeek5Calculation,
  playSeasonWeeks,
  readWeek8Resolution,
  scoreWriting,
  seatOnRoster,
  seedRuns,
  signIn,
  stepPastTheDeal,
  submitDefense,
  waitForDelivery,
  type JoinCard,
  API,
} from "./flow";
import { savePlan, week5TotalFor, type PlanContext } from "./plan";
import { parseDollars } from "../src/domain/core/money";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as MARKET } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront, swapBill } from "../src/domain/scenario/worlds/food-truck/economy";
import { buildSubmission } from "../src/test/runChallenge";
import { buildPopUpSubmission } from "../src/test/runPopUp";
import type { SubmissionRecord } from "../src/platform/classes/types";
import { CLASS_STATE_LABELS, LEVEL_LABELS, SKILL_STATE_ORDER, skillStateInSentence } from "../src/educator/labels";
import { REASONING_CRITERIA } from "../src/domain/blueprint/reasoning";

/**
 * The nine golden journeys.
 *
 * The rest of the suite is a regression net: many small assertions, each about one screen, and
 * a good one — it is how a heading that moved gets caught. What it cannot do is tell you the
 * product stopped working, because no single test in it walks a promise from one end to the
 * other. These nine do, one per promise, and each is written so that when it fails it fails
 * for the right reason: a student's work did not reach their teacher, or two students turned
 * into one, or a note a teacher wrote never arrived.
 *
 * They live in their own file so the set is legible and can be run alone:
 *
 *     npx playwright test e2e/golden.spec.ts --project=chromium-1366
 *
 * Where a step has no interface yet, the journey says so in place rather than reaching past
 * the product into the API. Two exceptions are marked where they occur: `seedRuns` posts
 * finished runs the way a student's device posts them, signed in as that seat, and it is used
 * only to reach a class-sized denominator that would otherwise be twenty minutes of clicking.
 */

// The origin comes from `flow.ts` so the page and the direct request reach one service.

/**
 * Full marks on every criterion, read off the rubric rather than restated.
 *
 * This was four `["Workability", 2]` pairs typed out here, and it broke the day `C6.3` was
 * renamed from *Tradeoff / opportunity cost* to **Trade-off** — a deliberate one-word edit in
 * `reasoning.ts` that two journeys reported as "the product stopped working". The rubric is
 * one table with one maximum per criterion, so the journeys read that table: the labels, the
 * count of them and each one's own maximum all come from the product, and a rename or a fifth
 * criterion arrives here with nothing to edit.
 */
const RUBRIC_MARKS = REASONING_CRITERIA.map((criterion) => [criterion.label, criterion.max] as const);
const MARKET_COPY = POP_UP_SCENARIO.screens;
const BOOTH = POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];

test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => { throw new Error(`Uncaught page error: ${error.message}`); });
});

/**
 * A promise takes longer to walk than a screen does.
 *
 * Every journey here plays at least one whole run — eight weeks or four Saturdays — and most of
 * them then read it back on an educator surface, and two of them do it on a second machine.
 * That is minutes of real product, not the seconds Playwright's default budget assumes, and a
 * journey that runs out of time three assertions from the end reports a timeout where what it
 * actually found was the product working. Reported as a timeout, that is a false red; the whole
 * value of this set is that a red here means a promise broke.
 *
 * This is a budget, not a tolerance: nothing here waits on a specific thing for two minutes.
 * Every individual `expect` keeps its own short timeout, so a screen that never arrives still
 * fails in five seconds, with the locator that was waiting named.
 */
test.setTimeout(180_000);

/* ---------------------------------------------------------------------------
   The two runs, played the way a student plays them. Everything below composes
   the shared helpers, so when a screen is rebuilt these journeys follow the
   suite's own drivers rather than growing a second copy of them.
   --------------------------------------------------------------------------- */

/** A class with a roster, and one card off it. */
async function cardFor(page: Page, classCode: string, seat: string): Promise<JoinCard & { classCode: string }> {
  const card = await seatOnRoster(page, classCode, seat);
  return { ...card, classCode };
}

/** From the student's own page into the run. */
async function openTheRun(page: Page) {
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  // The confirm screen is gone for a signed-in student, so this button is not on the page and
  // `click()` has no action timeout to end the wait. Both golden journeys hung here until the
  // test timeout. `startIfConfirmAsked` presses it on the builds that still draw one.
  await startIfConfirmAsked(page);
}

/** Answers the world choice where the class offers one, and does nothing where it does not. */
async function pickWorld(page: Page, worldId: "basketball" | "food-truck") {
  const card = page.locator(`.worldcard[data-world="${worldId}"]`);
  const basketball = page.getByRole("button", { name: "Find Avery a place" });
  const market = page.getByRole("heading", { name: MARKET_COPY.spot.title });
  await expect(card.or(basketball).or(market).first()).toBeVisible();
  if (await card.count()) await card.getByRole("button").click();
}

/** Eight weeks, start to turned in, on the cheapest housing and no bonuses counted. */
async function playBasketball(page: Page, defence: string) {
  const plan: PlanContext = { setupId: "cousin-room" };
  await stepPastTheDeal(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", plan);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(plan)));
  await savePlan(page, "week5-first-response", plan);
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...plan, clinics: false, countCompletionFinal: false });
  await readWeek8Resolution(page);
  await submitDefense(page, defence);
  await waitForDelivery(page);
}

/**
 * What a money field currently holds, read the way the product writes it.
 *
 * These were `Number(await field.inputValue())`, which was right while the box held a bare
 * `550` and silently became `NaN` the day it started holding `$550` — the field and the amount
 * printed 40px to its left were two notations for one number, and the bare one was the one a
 * child was asked to read a decision off, so the field now says what the row says. `NaN` is the
 * worst possible failure here: it is arithmetic, so it propagates into the next `fill()`, the
 * control rejects the unparseable value and keeps what it had, and the test fails three steps
 * later on a button that never appeared. `parseDollars` is the product's own reader.
 */
async function heldInLine(page: Page, label: string): Promise<number> {
  const shown = await page.getByRole("spinbutton", { name: label }).inputValue();
  const parsed = parseDollars(shown);
  expect(parsed, `could not read a money field: ${JSON.stringify(shown)}`).not.toBeNull();
  return parsed!;
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

async function orderTrays(page: Page, trays: number) {
  const shown = page.locator(".tray-order output");
  for (let guard = 0; guard < 12; guard += 1) {
    const current = Number(await shown.innerText());
    if (current === trays) break;
    await page.getByRole("button", { name: current < trays ? "One tray more" : "One tray fewer" }).click();
  }
}

/** Four Saturdays, start to turned in. */
async function playMarket(page: Page, answer: string) {
  // The market opens on the booths: the screen that used to sell the story ahead of them was
  // taken out in the world's rebuild, so this journey starts where a student now starts.
  await page.getByRole("button", { name: `${MARKET_COPY.spot.take}: ${BOOTH.title}` }).click();
  await checkSum(page, MARKET_COPY.spot.owed.label, owedUpFront(MARKET, BOOTH.id));
  await page.getByRole("button", { name: MARKET_COPY.spot.action }).click();
  for (const source of ["catering", "rebate"] as const) {
    await page.getByRole("button", { name: `${MARKET_COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).click();
  }
  await checkSum(page, MARKET_COPY.money.toPlan.label, cashToPlan(MARKET, BOOTH.id));
  await page.getByRole("button", { name: MARKET_COPY.money.action }).click();

  await setLine(page, POP_UP_SCENARIO.lines.stock.label, 600);
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, 400);
  await page.locator('.popup-closer__choice button[data-line="cut"]').click();
  await page.getByRole("button", { name: MARKET_COPY.plan.commit }).click();

  await orderTrays(page, 3);
  await checkSum(page, MARKET_COPY.saturday.order.label, orderCost(MARKET, 3));
  await page.getByRole("button", { name: MARKET_COPY.saturday.open }).click();

  // The tips jar: money that is not the truck's, three things that want it, and a reason for
  // the one left out. The night does not end until both halves are answered, which is the beat
  // and not an obstacle to it.
  await page.locator(".maybe-grid button").first().click();
  await page.locator(".helper-card__ask .binary-choice button").first().click();
  await page.getByRole("button", { name: MARKET_COPY.tips.title }).click();

  await page.getByRole("button", { name: MARKET_COPY.standing.alone }).click();
  await orderTrays(page, 3);
  await page.getByRole("button", { name: MARKET_COPY.standing.action }).click();

  await checkSum(page, MARKET_COPY.generator.gap.label, swapBill(MARKET));
  await page.getByRole("button", { name: MARKET_COPY.generator.action }).click();
  const held = await heldInLine(page, POP_UP_SCENARIO.lines.cushion.label);
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, held - swapBill(MARKET));
  await page.getByRole("button", { name: MARKET_COPY.repair.commit }).click();

  await page.getByRole("button", { name: MARKET_COPY.saturday.open }).click();
  await page.getByRole("button", { name: MARKET_COPY.settle.action }).click();
  await page.locator(".writeup__tiles button").nth(0).click();
  await page.locator(".writeup__tiles button").nth(1).click();
  // The market turns in against the same gate the season does, which asks for the figures the
  // student tapped, in digits. The caller's sentence carries the reasoning; the two numbers
  // are read off the tiles so a re-pricing of the world cannot make this answer untrue.
  const figures = await page.locator('.writeup__tiles button[aria-pressed="true"]').allInnerTexts();
  const [first, second] = figures.map((text) => (text.match(/[\d,]+/g) ?? []).at(-1) ?? "");
  await page.getByLabel(MARKET_COPY.writeUp.field).fill(`${answer} We took ${first} in all. ${second} is the other figure I would talk about.`);
  await page.getByRole("button", { name: MARKET_COPY.writeUp.submit }).click();
  await expect(page.getByRole("heading", { name: MARKET_COPY.submitted.sent })).toBeVisible({ timeout: 15_000 });
}

/**
 * A seat with its card, signed in, holding the session the service now requires.
 *
 * Every submission needs one — in every class, not only a rostered one — so a test that posted
 * without it would be proving the educator surface against evidence a real room could never
 * have produced.
 */
async function signedInSeat(page: Page, classCode: string, seat: string): Promise<{ card: JoinCard; token: string }> {
  const card = await seatOnRoster(page, classCode, seat);
  const joined = await page.request.post(`${API}/classes/${classCode}/join`, {
    data: { classCode, seatCode: card.seatCode, joinCode: card.joinCode, device: "shared" },
  });
  expect(joined.status(), await joined.text()).toBe(200);
  return { card, token: ((await joined.json()) as { token: string }).token };
}

/** One finished run, posted the way that seat's own device posts it. */
async function post(page: Page, classCode: string, token: string, built: SubmissionRecord) {
  const response = await page.request.post(`${API}/classes/${classCode}/submissions`, {
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

/** A class whose assignment offers both worlds and lets the student choose. */
async function classOfferingBothWorlds(page: Page, label: string): Promise<string> {
  const created = await createClass(page.request, label);
  const response = await page.request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
    data: { objectiveRef: null, allowedWorldIds: ["basketball", "food-truck"], studentChoosesWorld: true },
  });
  expect(response.status(), await response.text()).toBe(201);
  return created.code;
}

/* ---------------------------------------------------------------------------
   1 — the spine. A student's work reaches their teacher.
   --------------------------------------------------------------------------- */

test("golden 1: a student's work reaches their teacher", async ({ page }) => {
  // The promise the whole product rests on: a child does the work on a school laptop and the
  // person who teaches them can read it, attributed to them, without anybody typing anything
  // twice. Every other journey here assumes this one.
  const created = await createClass(page.request, "Golden 1");
  const card = await cardFor(page, created.code, "1");
  const defence = "I kept the course money where I set it and gave up part of the reserve after Week 5, because the seat is the thing Avery is playing for.";

  await gotoFreshChallenge(page);
  await signIn(page, card);
  await openTheRun(page);
  await chooseSeasonIfOffered(page);
  await playBasketball(page, defence);

  // The teacher's own room, opened with the key the class gave them.
  await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
  // The room's own count, read off the page's headline rather than off a class name. This was
  // pinned to `.class-header`, a wrapper that has since gone; the count moved into the `h1` and
  // the journey reported "the work never arrived" about a page that was showing it. What the
  // promise needs is that the class says one run came in and whose it was — the exact sentence
  // around the figure is `classLead`'s to word and to change.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/1( of \d+)? turned in/);
  await expect(page.locator("body")).toContainText(card.displayName);

  // And the student's own words, on the student's own page.
  await page.goto(`/educator/class/${created.code}/students/${card.seatCode}?key=${created.teacherKey}`);
  await expect(page.getByRole("heading", { name: card.displayName, exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "The explanation" }).click();
  await expect(page.locator(".student-response")).toContainText("I kept the course money where I set it");
});

/* ---------------------------------------------------------------------------
   2 — the two-world thesis. A different story, the same shape of evidence.
   --------------------------------------------------------------------------- */

test("golden 2: the other world produces the same shape of evidence", async ({ page }) => {
  // §7.1's whole claim: the interior belongs to the world and the envelope does not. If the
  // market produced its own competencies, or its own rubric, or fewer rows, then a class where
  // half the room chose it would be a class a teacher cannot read as one thing.
  const classCode = await classOfferingBothWorlds(page, "Golden 2");
  const marketCard = await cardFor(page, classCode, "1");

  await gotoFreshChallenge(page);
  await signIn(page, marketCard);
  await openTheRun(page);
  await pickWorld(page, "food-truck");
  await playMarket(page, "I kept four hundred in the box because the generator is rented, and rented things break. That is where the swap money came from.");

  // A Basketball run beside it. Posted rather than played, because what this journey is about
  // is the shape of the evidence and not a second twenty-minute click-through; `seedRuns`
  // signs in as that seat exactly as a student's device does.
  await seedRuns(page.request, classCode, [{ seat: "2" }]);

  const rowsFor = async (seat: string) => {
    await page.goto(`/educator/class/${classCode}/students/${seat}?key=${createClassKeyFor(classCode)}`);
    await expect(page.locator(".judgement").first()).toBeVisible();
    return page.locator(".judgement__say b").allInnerTexts();
  };
  const market = await rowsFor("1");
  const basketball = await rowsFor("2");
  expect(market.length).toBeGreaterThan(0);
  expect([...market].sort()).toEqual([...basketball].sort());
});

/* ---------------------------------------------------------------------------
   3 — a run survives the day.
   --------------------------------------------------------------------------- */

test("golden 3: a run survives the day and finishes on another machine", async ({ page, browser }) => {
  // The claim this product makes about homework: start it in the lesson, finish it at home, on
  // a different machine, with nothing but the card. It rests on two things that are easy to
  // half-build — the run being checkpointed to the service as it goes, and the next machine
  // asking for it before it opens a fresh one — and a test that only reloaded the same browser
  // would pass with neither of them, because the attempt is in that browser's own storage.
  // Nothing here shares anything between the two contexts except what is printed on the card.
  const created = await createClass(page.request, "Golden 3");
  const card = await cardFor(page, created.code, "1");

  await gotoFreshChallenge(page);
  await signIn(page, card);
  await openTheRun(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await completeSetupStage(page, 2);
  // Anchored on the planning scene rather than on its headline: this journey is about the run
  // being where the student left it, and a heading being rewritten is not that.
  await expect(page.locator(".plan-scene")).toBeVisible();

  // Another machine: another browser context, nothing shared but the card.
  const elsewhere = await browser.newContext();
  const second = await elsewhere.newPage();
  try {
    await second.goto("/");
    await signIn(second, card);
    await second.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
    // Where they were, not the beginning: the housing is chosen and the plan is the next thing.
    await expect(second.locator(".plan-scene")).toBeVisible();
    await completeWorkingCalcs(second);
    await savePlan(second, "working", { setupId: "cousin-room" });
    await expect(second.locator(".challenge-shell")).toBeVisible();
  } finally {
    await elsewhere.close();
  }
});

/* ---------------------------------------------------------------------------
   4 — two students on one Chromebook stay two students.
   --------------------------------------------------------------------------- */

test("golden 4: two students on one machine stay two students", async ({ page }) => {
  // The failure that got the first accounts round rejected, and the one with a child's name on
  // it: a shared laptop handing the next student the last student's run, so their work is filed
  // under somebody else's seat. Nothing here may leak in either direction.
  const created = await createClass(page.request, "Golden 4");
  const first = await cardFor(page, created.code, "1");
  const second = await cardFor(page, created.code, "2");

  await gotoFreshChallenge(page);
  await signIn(page, first);
  await openTheRun(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await completeSetupStage(page, 0); // the expensive housing, so B inheriting it would show
  await expect(page.locator(".run-menu summary")).toContainText(first.seatCode);

  // Student B sits down at the same machine and says so.
  await page.locator(".run-menu summary").click();
  await page.getByRole("button", { name: "Leave this run" }).click();
  await page.getByRole("button", { name: "Yes — clear it and start again" }).click();
  await signIn(page, second);
  await openTheRun(page);
  await chooseSeasonIfOffered(page);

  // B's run is B's: their own seat, and not one decision carried over from A.
  await expect(page.locator(".run-menu summary")).toContainText(second.seatCode);
  const stored = await page.evaluate(() => localStorage.getItem("bow.attempt.v2.plan-under-pressure.basketball"));
  const attempt = stored === null ? null : (JSON.parse(stored) as { setupId: string | null; meta: { seatCode: string } });
  expect(attempt?.setupId ?? null).toBeNull();
  expect(attempt?.meta.seatCode).toBe(second.seatCode);

  // And A, signing in again, is A: their own seat and their own class, with nothing of B's.
  await gotoFreshChallenge(page);
  await signIn(page, first);
  await expect(page.locator("body")).toContainText(first.displayName);
  await expect(page.locator("body")).not.toContainText(second.displayName);
});

/* ---------------------------------------------------------------------------
   5 — a teacher sets a class up from nothing.
   --------------------------------------------------------------------------- */

test("golden 5: a teacher sets up a class, hands out cards, and reissues a lost one", async ({ page }) => {
  // The real setup path, which every other test in this suite stands in for by calling the API
  // directly. Four minutes on a Monday: make the class, paste the list, print the cards. And
  // the part that matters on the Tuesday, when a card has gone through the wash — reissuing one
  // has to work, and the lost card has to stop working the moment it does.
  await page.goto("/educator/classes/new");
  await page.getByLabel("Name this class").fill("Golden 5 · Period 2");
  await page.getByRole("button", { name: "Create the class" }).click();
  const code = (await page.locator(".class-created__code strong").innerText()).trim();
  const privateLink = await page.locator(".class-created__key code").innerText();
  const teacherKey = new URL(privateLink).searchParams.get("key") ?? "";
  expect(teacherKey.length).toBeGreaterThan(16);

  await page.goto(`/educator/class/${code}/roster?key=${teacherKey}`);
  await page.getByLabel("One name per line").fill(["Ana R.", "Devon P.", "Leila H.", "Sam O."].join("\n"));
  await page.getByRole("button", { name: "Add them and make the cards" }).click();
  await expect(page.locator(".join-card")).toHaveCount(4);

  const firstCard = page.locator(".join-card").first();
  const displayName = (await firstCard.locator(".join-card__name").innerText()).trim();
  const joinCode = (await firstCard.locator("dd").nth(1).innerText()).trim();

  // The card works.
  await gotoFreshChallenge(page);
  await signIn(page, { classCode: code, seatCode: "1", displayName, joinCode });
  await expect(page.locator("body")).toContainText(displayName);

  // The card is lost, so the teacher prints another one.
  await page.goto(`/educator/class/${code}/roster?key=${teacherKey}`);
  await page.locator(".roster-list li").first().getByRole("button", { name: "Print a new card" }).click();
  await expect(page.locator(".join-card")).toHaveCount(1);
  const reissued = (await page.locator(".join-card dd").nth(1).innerText()).trim();
  expect(reissued).not.toBe(joinCode);

  // The lost one stops working, which is the whole point of reissuing it.
  await gotoFreshChallenge(page);
  await page.goto("/join");
  await page.getByLabel("Class code").fill(code);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Your code").fill(joinCode);
  await page.getByRole("button", { name: "Go in" }).click();
  await expect(page.getByRole("alert")).toContainText("That did not match.");
  await expect(page.getByRole("link", { name: /^(Start|Carry on)$/ })).toHaveCount(0);

  // The new one does.
  await page.getByLabel("Your code").fill(reissued);
  await page.getByRole("button", { name: "Go in" }).click();
  await expect(page.getByRole("link", { name: /^(Start|Carry on)$/ })).toBeVisible();
});

/* ---------------------------------------------------------------------------
   6 — the loop closes.
   --------------------------------------------------------------------------- */

test("golden 6: a student turns in, a teacher reads it, and the student hears back twice", async ({ page }) => {
  // The half of this product that did not exist until this round: work going one way and a
  // person's answer coming back the other. The second note is in the journey on purpose — the
  // first version of this feature overwrote note one with note two, so a student who had been
  // written to twice could only ever see the last thing said to them.
  const created = await createClass(page.request, "Golden 6");
  const card = await cardFor(page, created.code, "1");

  await gotoFreshChallenge(page);
  await signIn(page, card);
  await openTheRun(page);
  await chooseSeasonIfOffered(page);
  await playBasketball(page, "I protected the course money and paid for the brace out of the reserve, because the course is the thing that outlasts the season.");

  // The teacher reads the writing in the queue and scores it criterion by criterion.
  await page.goto(`/educator/class/${created.code}/reading?key=${created.teacherKey}`);
  await expect(page.locator(".reading-queue__bar p")).toContainText(card.displayName);
  for (const [label, mark] of RUBRIC_MARKS) {
    await page.getByRole("button", { name: `${label}: ${mark} of ${mark}` }).click();
  }
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // And writes back, twice.
  const notes = [
    "You said what you protected and why, which is the hard half. Next time say what it cost you.",
    "One more thing — the reserve you kept is what paid for Week 5. Say that out loud next time.",
  ];
  for (const note of notes) {
    await page.goto(`/educator/class/${created.code}/students/${card.seatCode}?key=${created.teacherKey}`);
    await page.locator(".feedback textarea").fill(note);
    await page.getByRole("button", { name: "Send it" }).click();
    await expect(page.locator(".feedback")).toContainText(/Sent/);
  }

  // The student opens BOW on their own screen and finds both, in the order they were written.
  await gotoFreshChallenge(page);
  await signIn(page, card);
  for (const note of notes) await expect(page.locator("body")).toContainText(note);
});

/* ---------------------------------------------------------------------------
   7 — a teacher's judgement wins, everywhere.
   --------------------------------------------------------------------------- */

test("golden 7: a teacher's judgement travels to every surface that reports it", async ({ page, context }) => {
  // An override that changes only the screen it was typed on is worse than no override at all:
  // the teacher believes they have corrected the record and the export still carries BOW's
  // number into the gradebook. So this walks every surface that reports a level.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const created = await createClass(page.request, "Golden 7");
  const key = created.teacherKey;
  // The objective page is one of the surfaces this journey walks, and it reports a class only
  // if the class was set that objective — so the class is set it here, before anybody turns
  // anything in, which is the order a teacher does it in.
  const assigned = await page.request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": key },
    data: { objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" } },
  });
  expect(assigned.status(), await assigned.text()).toBe(201);
  await seedRuns(page.request, created.code, [{ seat: "1" }]);

  await page.goto(`/educator/class/${created.code}/students/1?key=${key}`);
  // Driven the way a teacher drives it, tab included: the trail opens selected today, and a
  // journey that assumed it always would be would look for a judgement inside a hidden panel
  // the day it stops being the default and report the wrong thing about why it could not.
  await page.getByRole("tab", { name: "Evidence trail" }).click();
  const judgement = page.locator(".judgement").first();
  const requirement = (await judgement.locator(".judgement__say b").innerText()).trim();
  const before = (await judgement.locator(".judgement__machine strong").innerText()).trim();

  await judgement.getByRole("button", { name: /I read this differently|Record a different judgement/ }).click();
  // Read off the vocabulary rather than written down here: these six words are the product's
  // own distinctions and they have been renamed twice, and a suite that keeps its own copy of
  // them is a second place they are defined.
  await judgement.getByRole("button", { name: LEVEL_LABELS[2], exact: true }).click();
  await judgement.locator("textarea").fill("I watched them do this on paper first and they had it before the board did.");
  const recorded = page.waitForResponse((response) => response.url().includes("/overrides"));
  await judgement.getByRole("button", { name: "Record it" }).click();
  expect((await recorded).status(), "the service took the teacher's reading").toBe(201);

  // Which half of the seam broke, said by the journey rather than left to whoever reads the
  // failure. The service's own answer first — a teacher's judgement that never reached it is a
  // different defect from one it kept and no screen shows — and only then the screens.
  const listed = await page.request.get(`${API}/classes/${created.code}/submissions`, { headers: { "X-BOW-Teacher-Key": key } });
  expect(listed.status(), await listed.text()).toBe(200);
  const kept = ((await listed.json()) as { submissions: { seatCode: string; overrides?: { evidenceRequirementId: string }[] }[] }).submissions;
  expect(kept.find((entry) => entry.seatCode === "1")?.overrides ?? [], "the service kept it on the attempt it belongs to").toHaveLength(1);

  // Both readings, side by side, which is the whole of what an override is for: the teacher's
  // word stands, and BOW's original is still there for the next person to check it against.
  // Read back after a reload, so this is about what the service kept rather than about what one
  // component happened to be holding.
  await page.reload();
  await page.getByRole("tab", { name: "Evidence trail" }).click();
  // Found by the requirement it was recorded against rather than by where it sits in the list:
  // a judgement that moves position when a teacher disagrees with it is a real possibility, and
  // a journey pinned to "the first row" would report the wrong thing about why it is missing.
  const overridden = page.locator(".judgement").filter({ hasText: requirement });
  await expect(overridden.locator(".judgement__override strong")).toContainText(LEVEL_LABELS[2]);
  await expect(overridden.locator(".judgement__machine strong")).toContainText(before);

  // The class page reports the teacher's reading, not BOW's.
  await page.goto(`/educator/class/${created.code}?key=${key}&t=${Date.now()}`);
  await expect(page.locator("body")).toContainText(requirement.slice(0, 12));

  // The objective page a teacher reports against, which is the surface this step never reached.
  //
  // It asserted that the whole `body` did not contain the literal "Not yet assessed" — and it
  // was untrue three times over. Those are the words Ladder 4 used before it was rewritten, so
  // the product cannot produce that string anywhere; the class was never set an objective, so
  // it was not on this page at all; and nobody had read the student's writing, so the only
  // thing this page could honestly have said about the class *was* that nobody was assessed.
  // Three reasons to pass and none of them the journey's. So the class is set the objective
  // above, a person reads the writing here — which is what turns a count into an assessment —
  // and the page then has to report a result and name the state in Ladder 4's own words.
  await scoreWriting(page.request, created.code, key, "1");
  await page.goto(`/educator/objectives/nysed-pf-2026/1.3?t=${Date.now()}`);
  const reported = page.locator(".objective-class").filter({ hasText: created.code });
  await expect(reported.locator(".objective-result")).not.toContainText(CLASS_STATE_LABELS["not-assessed"]);
  await expect(reported.locator(".objective-result strong")).toContainText(/\d+ of \d+ assessed/);
  // And the requirement the teacher re-read is one of the ones this page counts, so the skill
  // it belongs to is broken down rather than the objective reporting a class it cannot explain.
  // The words are Ladder 3's, in the tail of a sentence, read from the table that owns them —
  // writing them here would be a second place the product's vocabulary is defined.
  const skillWords = SKILL_STATE_ORDER.map((state) => skillStateInSentence(state)).join("|");
  // The skill breakdown, not the What-next gaps table beside it: both are `.micro-table`.
  await expect(reported.locator(".micro-table:not(.next-lesson__gaps)")).toContainText(new RegExp(`\\d+ (${skillWords})`));

  // And the line that leaves for a gradebook.
  await page.goto(`/educator/class/${created.code}?key=${key}&t=${Date.now()}`);
  await page.getByRole("button", { name: /Copy .* for a gradebook/ }).click();
  const exported = await page.evaluate(() => navigator.clipboard.readText());
  expect(exported).toContain("1");
  expect(exported.split("\n").length).toBeGreaterThan(1);
});

/* ---------------------------------------------------------------------------
   8 — a mixed class is one class.
   --------------------------------------------------------------------------- */

test("golden 8: a mixed class counts as one class", async ({ page, context }) => {
  // A real room: some students chose one world and some the other, somebody was away, somebody
  // had two goes, and somebody left the school. Every count on the class page has to agree with
  // every other, and the export has to be the shape of the teacher's own list rather than the
  // shape of what happened to arrive.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const classCode = await classOfferingBothWorlds(page, "Golden 8");
  const key = createClassKeyFor(classCode);

  const basketball = await signedInSeat(page, classCode, "1");
  const market = await signedInSeat(page, classCode, "2");
  const twice = await signedInSeat(page, classCode, "3");

  // Runs posted the way each seat's own device posts them, signed in as that seat. There is no
  // interface for a second attempt yet — a student who wanted another go would leave the run
  // and play it again — so the second one is posted under the same session, said here rather
  // than hidden in a helper.
  await post(page, classCode, basketball.token, buildSubmission({ seatCode: "1", defenseText: "Seat 1: I kept the course money and gave up the reserve." }));
  await post(page, classCode, market.token, buildPopUpSubmission({ seatCode: "2", writeUpText: "Seat 2: I cooked less on the quiet night and kept the cushion for the generator." }));
  const first = buildSubmission({ seatCode: "3", defenseText: "Seat 3: first go — I put the leftovers into the course." });
  await post(page, classCode, twice.token, first);
  await post(page, classCode, twice.token, { ...buildSubmission({ seatCode: "3", closeOpeningInto: "flexibleCash", defenseText: "Seat 3: second go — I set the course first and let the week take the rest." }), sessionId: `${first.sessionId}-again` });

  // Seat 4 is in the room and turned nothing in. Seat 5 leaves the school.
  const away = await seatOnRoster(page, classCode, "4");
  const leaving = await seatOnRoster(page, classCode, "5");
  await page.goto(`/educator/class/${classCode}/roster?key=${key}`);
  await page.locator(".roster-list li").filter({ hasText: `Seat ${leaving.seatCode}` }).getByRole("button", { name: "Take off the list" }).click();
  await expect(page.locator(".roster-list li").filter({ hasText: `Seat ${leaving.seatCode}` })).toHaveCount(0);

  // The class page is one class: everyone still in the room, nobody who is not.
  await page.goto(`/educator/class/${classCode}?key=${key}&t=${Date.now()}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("turned in");
  for (const student of [basketball.card, market.card, twice.card, away]) {
    await expect(page.locator("body")).toContainText(student.displayName);
  }
  await expect(page.locator("body")).not.toContainText(leaving.displayName);

  // The export is roster-shaped: a row per seat still in the room including the one who turned
  // nothing in, a row for the extra attempt, and nothing at all from the seat that left.
  await page.getByRole("button", { name: /Copy .* for a gradebook/ }).click();
  const exported = await page.evaluate(() => navigator.clipboard.readText());
  const lines = exported.trim().split("\n").filter((line) => line.length > 0);
  expect(lines.length).toBeGreaterThanOrEqual(5);
  expect(exported).toContain(away.displayName);
  expect(exported).not.toContain(leaving.displayName);

  // And the share-out offers the room its own work, from both worlds rather than from whichever
  // one the software knows best.
  await page.goto(`/educator/class/${classCode}/share-out?key=${key}`);
  await expect(page.locator("body")).toContainText(basketball.card.displayName);
  await expect(page.locator("body")).toContainText(market.card.displayName);
});

/* ---------------------------------------------------------------------------
   9 — a teacher's classes survive their laptop.
   --------------------------------------------------------------------------- */

test("golden 9: a teacher's classes survive their laptop", async ({ page, browser }) => {
  // The teacher critic's single blocker, and the worst failure in the product before accounts
  // existed: a class lived in one browser's storage, so a reimaged laptop permanently destroyed
  // twenty-eight children's assessed work with nothing to recover it from. What this journey
  // asserts is not that a code appears in a list on another machine — it is that the work and
  // the mark a person gave it are still there.
  const password = "a-long-enough-password";
  const email = `golden9.${Date.now()}@example.org`;
  const defence = "I kept the course money where I set it and gave up part of the reserve after Week 5.";

  // A class made the way a teacher makes one on the first Monday: no account, no sign-in.
  await page.goto("/educator/classes/new");
  await page.getByLabel("Name this class").fill("Golden 9 · Period 5");
  await page.getByRole("button", { name: "Create the class" }).click();
  const code = (await page.locator(".class-created__code strong").innerText()).trim();
  const teacherKey = new URL(await page.locator(".class-created__key code").innerText()).searchParams.get("key") ?? "";

  await page.goto(`/educator/class/${code}/roster?key=${teacherKey}`);
  await page.getByLabel("One name per line").fill("Ana R.");
  await page.getByRole("button", { name: "Add them and make the cards" }).click();
  const card = page.locator(".join-card").first();
  const displayName = (await card.locator(".join-card__name").innerText()).trim();
  const joinCode = (await card.locator("dd").nth(1).innerText()).trim();

  // The student, on their own device, does the work.
  const theirs = await browser.newContext();
  const student = await theirs.newPage();
  try {
    await student.goto("/");
    await signIn(student, { classCode: code, seatCode: "1", displayName, joinCode });
    await openTheRun(student);
    await chooseSeasonIfOffered(student);
    await playBasketball(student, defence);
  } finally {
    await theirs.close();
  }

  // The teacher reads it and marks it, still with no account.
  await page.goto(`/educator/class/${code}/reading?key=${teacherKey}`);
  for (const [label, mark] of RUBRIC_MARKS) {
    await page.getByRole("button", { name: `${label}: ${mark} of ${mark}` }).click();
  }
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Then makes an account from the same browser, which is the only moment the recovery code
  // exists: it is shown once and never again, so the screen has to say so where it is shown.
  await page.goto("/educator/sign-in");
  await page.getByRole("button", { name: "Make an account" }).click();
  await page.getByLabel("Your work email").fill(email);
  await page.getByLabel(/A new password/).fill(password);
  await page.getByRole("button", { name: "Make the account" }).click();
  await expect(page.getByRole("heading", { name: /recovery code/i })).toBeVisible();
  await expect(page.locator(".recovery-code")).not.toBeEmpty();
  await page.getByRole("button", { name: "I have written it down" }).click();

  // The laptop is wiped. A different machine, nothing carried over but what the teacher knows.
  const reimaged = await browser.newContext();
  const after = await reimaged.newPage();
  try {
    await after.goto("/educator/sign-in");
    await after.getByLabel("Your work email").fill(email);
    await after.getByLabel("Password", { exact: true }).fill(password);
    await after.getByRole("button", { name: "Sign in", exact: true }).click();
    // Waited on rather than navigated past: signing in is a round trip, and a test that walked
    // to the class list while it was still in flight would report "the classes did not come
    // back" about a request that had not finished being asked.
    await expect(after.getByRole("heading", { name: /Your class|Your \d+ classes/ })).toBeVisible();
    await expect(after.locator(".row-list")).toContainText(code);
    await after.locator(".row-list a").filter({ hasText: code }).click();
    await expect(after.locator("body")).toContainText(displayName);

    // The promise, and the whole reason the journey is written: the child's work and the mark a
    // person gave it, both still there on a machine that has never seen either.
    const key = new URL(after.url()).searchParams.get("key") ?? "";
    expect(key.length).toBeGreaterThan(16);
    await after.goto(`/educator/class/${code}/students/1?key=${key}`);
    await after.getByRole("tab", { name: "The explanation" }).click();
    await expect(after.locator(".student-response")).toContainText("I kept the course money where I set it");
    await expect(after.locator(".rubric-panel footer strong")).toContainText("10/10");
  } finally {
    await reimaged.close();
  }
});

/* ---------------------------------------------------------------------------
   The 400% sweep. Measurement, not repair.
   --------------------------------------------------------------------------- */

/**
 * How far one element's content reaches past the box it is drawn in, in CSS pixels.
 *
 * The whole-document measurement the rest of the suite uses (`scrollWidth - clientWidth` on
 * the documentElement) says only that *something* on the screen spills. It cannot say what,
 * and on a screen with a sticky bar it usually is the bar: a row of controls set to `nowrap`
 * keeps its full width no matter how narrow the window gets, and at 400% zoom the window is a
 * quarter as wide as the one it was designed on. So this asks the element itself, which turns
 * "the world picker scrolls sideways" into a number against a selector somebody can fix.
 *
 * Returns -1 when the element is not on screen, so a sweep that walked to the wrong place
 * reports that rather than quietly recording a clean zero.
 */
async function contentPastItsBox(page: Page, selector: string): Promise<number> {
  return page.evaluate((css) => {
    const element = document.querySelector(css);
    if (!element) return -1;
    return Math.round(element.scrollWidth - element.clientWidth);
  }, selector);
}

/**
 * 400% zoom over the two bars that carry a run's controls, measured and reported.
 *
 * WCAG 1.4.10 asks that content reflow at 320 CSS pixels of width without a second scrollbar,
 * and a teacher or student who needs large text meets exactly that: a browser's own zoom at
 * 400% on a 1280-wide window leaves 320 usable pixels. `.worldpick__bar` and `.popup-topbar`
 * are the two sticky rows a student cannot get past — one to choose a world, one to move
 * between Saturdays — so if either of them refuses to reflow, the run is unreachable rather
 * than merely untidy.
 *
 * **This journey measures and does not repair.** Both selectors are styled in files owned by
 * the accessibility work, and a fix landed from here would collide with it. A red result here
 * is a number to hand over, not a defect in this file.
 */
test("@zoom golden sweep: the bars a run cannot be played without hold at 400%", async ({ page }) => {
  const classCode = await classOfferingBothWorlds(page, "Golden zoom");
  const card = await cardFor(page, classCode, "1");
  await gotoFreshChallenge(page);
  await signIn(page, card);
  await openTheRun(page);

  // The world picker, which is the first screen a student in a two-world class ever sees.
  await expect(page.locator(".worldpick__bar")).toBeVisible();
  const worldPickBar = await contentPastItsBox(page, ".worldpick__bar");
  const worldPickPage = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  await pickWorld(page, "food-truck");
  await expect(page.getByRole("heading", { name: MARKET_COPY.spot.title })).toBeVisible();
  await expect(page.locator(".popup-topbar")).toBeVisible();
  const marketBar = await contentPastItsBox(page, ".popup-topbar");
  const marketPage = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // Reported together, so one run names every bar that spills rather than the first one.
  const spilling = [
    { where: ".worldpick__bar", px: worldPickBar },
    { where: "the world picker page", px: worldPickPage },
    { where: ".popup-topbar", px: marketBar },
    { where: "the booths page", px: marketPage },
  ].filter((entry) => entry.px > 1);
  expect(spilling.map((entry) => `${entry.where}: ${entry.px}px`), "what reaches past 320px at 400% zoom").toEqual([]);
});
