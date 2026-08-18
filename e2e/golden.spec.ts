import { expect, test, type Page } from "@playwright/test";
import {
  chooseSeasonIfOffered,
  completeSetupStage,
  completeWorkingCalcs,
  createClass,
  createClassKeyFor,
  decideOpportunity,
  gotoFreshChallenge,
  passWeek5Calculation,
  playSeasonWeeks,
  readWeek8Resolution,
  seatOnRoster,
  seedRuns,
  signIn,
  submitDefense,
  waitForDelivery,
  type JoinCard,
} from "./flow";
import { savePlan, week5TotalFor, type PlanContext } from "./plan";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as MARKET } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront, swapBill } from "../src/domain/scenario/worlds/food-truck/economy";
import { buildSubmission } from "../src/test/runChallenge";
import { buildPopUpSubmission } from "../src/test/runPopUp";
import type { SubmissionRecord } from "../src/platform/classes/types";
import { LEVEL_LABELS } from "../src/educator/labels";

/**
 * The eight golden journeys.
 *
 * The rest of the suite is a regression net: many small assertions, each about one screen, and
 * a good one — it is how a heading that moved gets caught. What it cannot do is tell you the
 * product stopped working, because no single test in it walks a promise from one end to the
 * other. These eight do, one per promise, and each is written so that when it fails it fails
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

const API = "http://127.0.0.1:4180/api";
const MARKET_COPY = POP_UP_SCENARIO.screens;
const BOOTH = POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];

test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => { throw new Error(`Uncaught page error: ${error.message}`); });
});

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

/**
 * The contract screen, where the build still has one.
 *
 * The Basketball beats are being rebuilt underneath these journeys, and a journey that pinned
 * one screen would report "the product stopped working" every time a screen moved. What this
 * set is about is the promise, so it steps past the deal if the deal is there and says nothing
 * if it is not.
 */
async function stepPastTheDeal(page: Page) {
  const deal = page.getByRole("button", { name: "Find Avery a place" });
  const ranking = page.getByRole("heading", { name: /Which place costs the least/i });
  await expect(deal.or(ranking).first()).toBeVisible();
  if (await deal.count()) await deal.click();
}

/** From the student's own page into the run. */
async function openTheRun(page: Page) {
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await page.getByRole("button", { name: /Start the eight weeks|Go in/ }).click();
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

  await page.getByRole("button", { name: MARKET_COPY.standing.alone }).click();
  await orderTrays(page, 3);
  await page.getByRole("button", { name: MARKET_COPY.standing.action }).click();

  await checkSum(page, MARKET_COPY.generator.gap.label, swapBill(MARKET));
  await page.getByRole("button", { name: MARKET_COPY.generator.action }).click();
  const held = Number(await page.getByRole("spinbutton", { name: POP_UP_SCENARIO.lines.cushion.label }).inputValue());
  await setLine(page, POP_UP_SCENARIO.lines.cushion.label, held - swapBill(MARKET));
  await page.getByRole("button", { name: MARKET_COPY.repair.commit }).click();

  await page.getByRole("button", { name: MARKET_COPY.saturday.open }).click();
  await page.getByRole("button", { name: MARKET_COPY.settle.action }).click();
  await page.locator(".writeup__tiles button").nth(0).click();
  await page.locator(".writeup__tiles button").nth(1).click();
  await page.getByLabel(MARKET_COPY.writeUp.field).fill(answer);
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
  await expect(page.locator(".class-header")).toContainText("1 turned in");
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
  for (const [label, mark] of [["Workability", 2], ["Protected priority", 2], ["Tradeoff / opportunity cost", 2], ["Numerical evidence", 4]] as const) {
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
  await page.goto("/home");
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
  await seedRuns(page.request, created.code, [{ seat: "1" }]);
  const key = created.teacherKey;

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

  // The objective page a teacher reports against.
  await page.goto(`/educator/objectives/nysed-pf-2026/1.3?t=${Date.now()}`);
  await expect(page.locator("body")).not.toContainText("Not yet assessed");

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
  await expect(page.locator(".class-header")).toContainText("turned in");
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
