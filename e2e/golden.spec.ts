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
  serveTheNight,
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
import { REASONING_MAXIMUM } from "../src/domain/evidence/grade";

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
/**
 * A whole basketball run, and an optional hook on the write-up screen.
 *
 * `onWriteUp` runs after the defence is typed and before it is turned in, which is the one
 * moment anything else on that screen can be looked at — the teacher's own closing question
 * lives there, under the challenge's own, and a required one holds the turn-in button.
 */
async function playBasketball(page: Page, defence: string, onWriteUp?: () => Promise<void>) {
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
  await submitDefense(page, defence, onWriteUp);
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
  // The order control is a real spinbutton now — `role="spinbutton"` and `aria-valuenow`,
  // not an `<output>` a script had to read the text of.
  const shown = page.locator('.tray-order [role="spinbutton"]');
  for (let guard = 0; guard < 12; guard += 1) {
    const current = Number(await shown.getAttribute("aria-valuenow"));
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
  await serveTheNight(page);

  // The tips jar: money that is not the truck's, three things that want it, and a reason for
  // the one left out. The night does not end until both halves are answered, which is the beat
  // and not an obstacle to it.
  await page.locator(".maybe-grid button").first().click();
  await page.locator(".helper-card__ask .binary-choice button").first().click();
  await page.getByRole("button", { name: MARKET_COPY.tips.title }).click();

  await page.getByRole("button", { name: MARKET_COPY.standing.alone }).click();
  await orderTrays(page, 3);
  await page.getByRole("button", { name: MARKET_COPY.standing.action }).click();
  // The standing order covers Saturdays 2 and 3, so the window opens twice before the market
  // asks anything else.
  await serveTheNight(page, 2);

  await checkSum(page, MARKET_COPY.generator.gap.label, swapBill(MARKET));
  await page.getByRole("button", { name: MARKET_COPY.generator.action }).click();
  const held = await heldInLine(page, POP_UP_SCENARIO.lines.cushion.label);
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, held - swapBill(MARKET));
  await page.getByRole("button", { name: MARKET_COPY.repair.commit }).click();

  await page.getByRole("button", { name: MARKET_COPY.saturday.open }).click();
  await serveTheNight(page);
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
  // The room's own count, read off the lead the class page leads with rather than off a class
  // name. It was pinned to `.class-header`, then — when that wrapper went — to the `h1`. Both
  // pins were to *where a sentence happened to sit*, and both broke: the class page now leads
  // with the reading queue ("1 of 1 explanation still to read.") and carries the turned-in
  // count in the detail line under it, which is `classLead.ts`'s own doctrine applied
  // (`gauntlet/v6/teacher/RULING.md` §4). The promise this journey protects is that the class
  // says one run came in, against the room it came from — so it is asked of the whole lead,
  // which is the region `classLead` renders into, and the clause order inside it stays
  // `classLead`'s to change. `1 of 1` rather than `1( of \d+)?`: the denominator beside the
  // count is the invariant that module exists for, and an optional one asserts nothing.
  await expect(page.locator(".instrument__lead")).toContainText(/1 of 1 turned in/);
  await expect(page.locator("body")).toContainText(card.displayName);

  // And the student's own words, on the student's own page. Not behind a tab: the tab bar is
  // gone (RULING §3 — "a tab bar is a ranking abdicated"), and the child's writing is now a
  // ranked region near the top of the page, which is the thing the tab was hiding.
  await page.goto(`/educator/class/${created.code}/students/${card.seatCode}?key=${created.teacherKey}`);
  await expect(page.getByRole("heading", { name: card.displayName, exact: true })).toBeVisible();
  await expect(page.locator("section.written blockquote").first()).toContainText("I kept the course money where I set it");
});

/* ---------------------------------------------------------------------------
   1b — the teacher's own question, end to end, and the line it may not cross.
   --------------------------------------------------------------------------- */

test("golden 1b: a teacher's own question is answered, read, and changes nothing BOW claims", async ({ page }) => {
  // §37, and the promise made to District 26 in writing: a teacher may attach one question of
  // their own at the end. The whole design is the line it must not cross — a question one
  // teacher wrote may not move what BOW claims about a child, or two classes set the same
  // challenge mean different things and nothing on any screen says so.
  const created = await createClass(page.request, "Golden 1b");
  const QUESTION = "Connect one decision to today's lesson.";
  const ANSWER = "We talked about paying yourself first, and I set the course money before anything else.";
  const defence = "I kept the course money where I set it and gave up part of the reserve after Week 5, because the seat is the thing Avery is playing for.";

  // The teacher sets it with the assignment, where it belongs — never on the challenge version.
  const assigned = await page.request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
    // Pinned to one world so this journey measures the closing question and not the picker.
    data: {
      objectiveRef: null,
      allowedWorldIds: ["basketball"],
      studentChoosesWorld: false,
      closingQuestion: { text: QUESTION, required: true },
    },
  });
  expect(assigned.status(), await assigned.text()).toBe(201);

  const card = await cardFor(page, created.code, "1");
  await gotoFreshChallenge(page);
  await signIn(page, card);
  await openTheRun(page);

  // The run is played as normal. The question arrives on the write-up screen, under the
  // challenge's own, in the teacher's name.
  await playBasketball(page, defence, async () => {
    await expect(page.getByText(QUESTION)).toBeVisible();
    await expect(page.getByText(/From your teacher/)).toBeVisible();
    // Marked required, so the run may not be turned in until it is answered.
    await expect(page.getByRole("button", { name: "Turn in my plan" })).toHaveAttribute("aria-disabled", "true");
    await page.getByLabel("Your answer").fill(ANSWER);
    await expect(page.getByRole("button", { name: "Turn in my plan" })).toHaveAttribute("aria-disabled", "false");
  });

  // The teacher reads it, on the student's own page, under their own writing and outside the
  // rubric — which is the assertion that matters.
  await page.goto(`/educator/class/${created.code}/students/${card.seatCode}?key=${created.teacherKey}`);
  const closing = page.locator(".closing-answer");
  await expect(closing).toContainText(QUESTION);
  await expect(closing).toContainText(ANSWER);
  await expect(closing, "the teacher is not told whose question this was").toContainText(/You asked this, not BOW/);
  // The line the question may not cross, asked of the three regions that could carry it over.
  //
  // This was one assertion against `.rubric-panel`, which is the *reading queue's* scoring
  // panel and is not on the student page at all since the rebuild. A negated matcher does not
  // quietly pass against a locator that matches nothing — `not.toContainText` polls for an
  // element and times out when none arrives — so this was a dead assertion of exactly the kind
  // `e2eReadsLabels.test.ts` was written about: it could only ever fail, and it would have
  // reported "the answer reached the scoring panel" about a panel that was never there.
  //
  // The rebuilt page ranks instead of tabbing, and the three surfaces that state or produce a
  // claim about this child are the verdict (BOW's reading, R2), the judgement record (every one
  // of them, R5) and the teacher's own marks control (R3, which is what `.rubric-panel` was
  // here). The answer belongs to none of them.
  await expect(page.locator(".verdict__grid"), "the answer reached BOW's verdict").not.toContainText(ANSWER);
  await expect(page.locator(".judgements"), "the answer reached the judgement record").not.toContainText(ANSWER);
  await expect(page.locator(".written__own"), "the answer reached the scoring panel").not.toContainText(ANSWER);
  // And each of the three is on the page. A refusal is only worth what the thing refusing it is
  // worth, and this is the line that says which of the two a red above is.
  for (const region of [".verdict__grid", ".judgements", ".written__own"]) {
    await expect(page.locator(region), `${region} is not on this page to refuse anything`).toHaveCount(1);
  }

  // And the canonical evidence is untouched: the student's own write-up still reads as it did,
  // and nothing about the closing answer is in the log the observer sees. `section.written`
  // holds the closing block too, so `.first()` is the child's own writing rather than either
  // half of the question — which is the blockquote this assertion has always been about.
  await expect(page.locator("section.written blockquote").first()).toContainText("I kept the course money where I set it");
  const room = await page.request.get(`${API}/classes/${created.code}/submissions`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
  });
  const body = (await room.json()) as { submissions: { closingAnswer?: { answer: string }; log: unknown[] }[] };
  expect(body.submissions, "the room holds exactly this student's submission").toHaveLength(1);
  const mine = body.submissions[0];
  expect(mine.closingAnswer?.answer, "the answer did not persist").toBe(ANSWER);
  expect(JSON.stringify(mine.log), "the answer is inside the evidence log").not.toContain("paying yourself first");
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

  // Every requirement the attempt was judged against, off the judgement record.
  //
  // `.judgement` / `.judgement__say` were the old panel's classes. The record is the same
  // record — one row per thing the work had to show, each arguable — rebuilt as `<ul
  // class="judgement-rows">` of rows whose `.judgement-line b` is the requirement's own name
  // (RULING §3, R5). The shape this journey is about is untouched by that: what it compares is
  // the *set of requirement names* the two worlds produce, not where the list is drawn.
  const rowsFor = async (seat: string) => {
    await page.goto(`/educator/class/${classCode}/students/${seat}?key=${createClassKeyFor(classCode)}`);
    await expect(page.locator(".judgement-rows > li").first()).toBeVisible();
    return page.locator(".judgement-rows > li .judgement-line b").allInnerTexts();
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
  // Driven the way a teacher drives it. There is no tab to press any more — the four tabs are
  // gone and every region is on the page, ranked (RULING §3) — so the row is reached by being
  // on the page rather than by selecting the panel it used to hide in. The old classes went
  // with the panel: a row is `.judgement-rows > li`, its requirement is `.judgement-line b`,
  // and BOW's own reading is the state span beside it, which carries word + mark together.
  const judgement = page.locator(".judgement-rows > li").first();
  await expect(judgement, "the judgement record is on the page").toBeVisible();
  const requirement = (await judgement.locator(".judgement-line b").innerText()).trim();
  const before = (await judgement.locator(".judgement-line > span").first().innerText()).trim();

  // The way to disagree is a native `<details>` per row now rather than a button: exactly one
  // row — the first shortfall — is open by default, so a row that is not it has to be opened
  // the way a teacher opens it. Pressing `summary` on an already-open row would close it.
  const disclosure = judgement.locator("details");
  if (!(await disclosure.evaluate((element: HTMLDetailsElement) => element.open))) {
    await disclosure.locator("summary").click();
  }
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
  // Found by the requirement it was recorded against rather than by where it sits in the list:
  // a judgement that moves position when a teacher disagrees with it is a real possibility, and
  // a journey pinned to "the first row" would report the wrong thing about why it is missing.
  const overridden = page.locator(".judgement-rows > li").filter({ hasText: requirement }).first();
  await expect(overridden.locator(".judgement__override strong")).toContainText(LEVEL_LABELS[2]);
  await expect(overridden.locator(".judgement-line > span").first()).toHaveText(before);

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

  // The class page reports the teacher's reading, not BOW's — and it now says so in words
  // rather than by the requirement merely appearing somewhere in `body`.
  //
  // This step used to run *before* the writing was read, and asked only that the requirement's
  // first twelve characters were on the page anywhere. Both halves of that are gone. A seat
  // whose writing nobody has read sits in the triage's *Evidence not all in* band, which is
  // deliberately chips and one sentence and never names a gap (RULING §2) — so before the
  // reading there is nothing on this page to find, and the old assertion would fail here for a
  // reason that is the product working. Once a person has read it the seat is ranked by what it
  // fell short on, and that row is where the propagation is legible: it carries the requirement
  // **and the teacher's own word for it**, which is BOW's judgement overruled on a different
  // page from the one it was typed on. BOW read this row as something else entirely; the class
  // page is quoting the teacher.
  await page.goto(`/educator/class/${created.code}?key=${key}&t=${Date.now()}`);
  const ranked = page.locator('.triage__row[data-seat="1"]');
  await expect(ranked, "the class page ranks this seat by the gap the teacher re-read").toContainText(requirement);
  await expect(ranked, "and in the teacher's word for it, not BOW's").toContainText(LEVEL_LABELS[2]);

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
  // The room, counted once, against the room it is a count of. This asked only that the `h1`
  // contained the words "turned in" — which the headline stopped doing when the class page
  // re-cut its lead to open with the reading queue (RULING §4), and which never said anything
  // about *this* class anyway: it would have passed on a headline reporting nine seats or one.
  // Five children were seated, one left the school, one turned nothing in, and one had two
  // goes — so the honest count is three of the four still in the room, and one attempt more
  // than that, which is exactly the arithmetic this journey exists to keep from drifting.
  await expect(page.locator(".instrument__lead"), "the lead counts the seats still in the room")
    .toContainText(/3 of 4 turned in/);
  await expect(page.locator(".class-identity__facts"), "one student with two goes is one student and two attempts")
    .toContainText("4 students · 4 attempts");
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
    //
    // This read the key out of the address bar and put it back into the next URL, and it has
    // been failing since `ae47cf2` took it out of there — on a suite nobody could run, because
    // the tree it ran against did not build. The key opens every child's name and every child's
    // writing, and it used to sit in the address bar of the roster and in the history of
    // whatever machine a teacher was on; it is filed in this browser on arrival now and goes to
    // the service as a header. So the assertion is the opposite one, and it is the stronger of
    // the two: the address bar is clean, and the work is reachable anyway.
    expect(new URL(after.url()).searchParams.get("key"), "the teacher key is back in the address bar").toBeNull();
    await after.goto(`/educator/class/${code}/students/1`);
    // The writing, on the page rather than behind a tab — the tabs are gone (RULING §3).
    await expect(after.locator("section.written blockquote").first()).toContainText("I kept the course money where I set it");
    // And the mark, in the control it was recorded through rather than in a read-only total.
    //
    // This was `.rubric-panel footer strong`, which is the *reading queue's* panel: on the
    // rebuilt student page the teacher's own marks are a live control beside the writing they
    // are marks about, and it opens on whatever a person already recorded. So this is the
    // stronger form of the same promise — the total is right *because* the four criterion
    // marks behind it came back, not merely because a number was stored. `10/10` is composed
    // from the rubric rather than typed: the maximum is the rubric's to change.
    await expect(after.locator(".written__own .feedback__actions strong"))
      .toHaveText(`${REASONING_MAXIMUM}/${REASONING_MAXIMUM}`);
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
