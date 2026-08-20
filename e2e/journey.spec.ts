import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import {
  API,
  createClass,
  gotoFreshChallenge,
  serveTheNight,
  signIn,
  startIfConfirmAsked,
  type JoinCard,
} from "./flow";
import { parseDollars } from "../src/domain/core/money";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as MARKET } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront, swapBill } from "../src/domain/scenario/worlds/food-truck/economy";
import { WORLD_REGISTRY } from "../src/domain/scenario/registry";
import { stepPosition, stoppedAt } from "../src/student/chapters";
import { LEVEL_LABELS } from "../src/educator/labels";
import { STUDENT_COPY } from "../src/content/studentCopy";
import type { Assignment } from "../src/platform/classes/types";

/**
 * THE GOLDEN JOURNEY, walked once, end to end, in a real browser against the real service.
 *
 * Written independently of the implementer who rebuilt `/home`. Nothing here is asserted from
 * their notes: every claim is driven through the product and checked against what the class
 * service actually holds, read back through the teacher's own API with the teacher's own key.
 *
 * The fifteen steps are fifteen named tests inside one serial describe so that the run output
 * says which promise broke rather than "the journey failed". State is shared through
 * module-level variables because a journey is, definitionally, one continuous thing.
 *
 * Every person in it is invented. Two students, one class, one teacher key.
 */

const COPY = POP_UP_SCENARIO.screens;
const BOOTH = POP_UP_SCENARIO.spots.find((spot) => spot.id === "middle-row") ?? POP_UP_SCENARIO.spots[0];
const POP_UP_TITLE = WORLD_REGISTRY["food-truck"]?.title ?? "Run the Pop-Up";
const BASKETBALL_TITLE = WORLD_REGISTRY.basketball?.title ?? "";

/** Fictional. Nobody in any school is called any of this. */
const STUDENT_A = "Marisol Quillfeather";
const STUDENT_B = "Devon Ashgrove";

/** The words student A writes, so the teacher's screen can be checked for them verbatim. */
const A_WRITES =
  "I kept four hundred in the cushion because the generator is rented and rented things break, "
  + "and that is exactly where the swap money came from on the fourth Saturday.";

/** The teacher's note, written to A only. */
const NOTE_TO_A = "Marisol, you named the risk before it happened and paid for it out of the money you had set aside. Say that out loud on Friday.";

/* -------------------------------------------------------------------------- */
/* Shared journey state.                                                       */
/* -------------------------------------------------------------------------- */

let classCode = "";
let teacherKey = "";
const assignments: Assignment[] = [];
let cardA: JoinCard & { classCode: string };
let cardB: JoinCard & { classCode: string };

/** Machine one: the school laptop the run starts on. Closed at the interruption. */
let machineOne: BrowserContext;
/** Machine two: a genuinely separate browser context with its own storage. */
let machineTwo: BrowserContext;
let pageTwo: Page;

/** What the service said about the run at the moment it was interrupted. */
let stoppedStage = "";
/** The attempt id the finished run was filed under. */
let sessionId = "";

/* -------------------------------------------------------------------------- */
/* Reading the service back, as the teacher.                                   */
/* -------------------------------------------------------------------------- */

interface Room {
  assignments: Assignment[];
  submissions: {
    seatCode: string;
    sessionId: string;
    classCode: string;
    assignmentId: string;
    log: { type: string; worldId: string; payload: unknown }[];
    overrides?: { evidenceRequirementId: string; level: string; note: string }[];
  }[];
  roster: { seatCode: string; displayName: string; claimed: boolean }[];
  progress: { seatCode: string; worldId: string; stage: string; updatedAt: number }[];
  feedback: { id: string; seatCode: string; sessionId: string; body: string; deletedAt?: number }[];
}

async function room(request: APIRequestContext): Promise<Room> {
  const response = await request.get(`${API}/classes/${classCode}/submissions`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as Room;
}

/* -------------------------------------------------------------------------- */
/* Driving the market. Every amount is computed from the world's own numbers.  */
/* -------------------------------------------------------------------------- */

async function checkSum(page: Page, label: string, value: number) {
  await page.getByLabel(label).fill(String(value));
  await page.locator(".calculation").filter({ has: page.getByLabel(label) }).getByRole("button", { name: "Check" }).click();
}

async function setLine(page: Page, label: string, value: number) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(String(value));
  await field.press("Tab");
}

async function heldInLine(page: Page, label: string): Promise<number> {
  const shown = await page.getByRole("spinbutton", { name: label }).inputValue();
  const parsed = parseDollars(shown);
  expect(parsed, `could not read a money field: ${JSON.stringify(shown)}`).not.toBeNull();
  return parsed!;
}

async function orderTrays(page: Page, trays: number) {
  const shown = page.locator('.tray-order [role="spinbutton"]');
  for (let guard = 0; guard < 12; guard += 1) {
    const current = Number(await shown.getAttribute("aria-valuenow"));
    if (current === trays) break;
    await page.getByRole("button", { name: current < trays ? "One tray more" : "One tray fewer" }).click();
  }
}

/* -------------------------------------------------------------------------- */

test.describe.configure({ mode: "serial" });

/**
 * A journey is minutes of real product, not seconds. Every individual `expect` keeps the
 * suite's own 20s ceiling, so a screen that never arrives still fails on the locator that was
 * waiting rather than on this budget.
 */
test.setTimeout(300_000);

test.describe("The golden journey", () => {
  test.afterAll(async () => {
    await machineOne?.close().catch(() => {});
    await machineTwo?.close().catch(() => {});
  });

  /* ---------------------------------------------------------------------- */

  test("1 — a teacher creates a class and a roster through the real service", async ({ browser }) => {
    machineOne = await browser.newContext();
    const page = await machineOne.newPage();

    const created = await createClass(page.request, "Journey · Period 4");
    classCode = created.code;
    teacherKey = created.teacherKey;
    expect(classCode, "the service minted a class code").toMatch(/^[A-Z0-9]{5}$/);
    expect(teacherKey.length, "and a private key long enough to be one").toBeGreaterThan(16);

    // Two pieces of work, in the order the teacher set them. The market first, because the
    // run binds itself to `assignments[0]` — see the standalone defect test at the foot of
    // this file — and a journey that quietly relied on that without saying so would be
    // reporting the product as better than it is.
    for (const body of [
      { objectiveRef: null, allowedWorldIds: ["food-truck"], studentChoosesWorld: false },
      { objectiveRef: null, allowedWorldIds: ["basketball"], studentChoosesWorld: false, dueAt: Date.now() + 7 * 86_400_000 },
    ]) {
      const set = await page.request.post(`${API}/classes/${classCode}/assignments`, {
        headers: { "X-BOW-Teacher-Key": teacherKey },
        data: body,
      });
      expect(set.status(), await set.text()).toBe(201);
      assignments.push((await set.json()) as Assignment);
    }

    // The roster, pasted the way a teacher pastes a class list.
    const seated = await page.request.post(`${API}/classes/${classCode}/roster`, {
      headers: { "X-BOW-Teacher-Key": teacherKey },
      data: { names: [STUDENT_A, STUDENT_B] },
    });
    expect(seated.status(), await seated.text()).toBe(201);
    const cards = ((await seated.json()) as { cards: JoinCard[] }).cards;
    expect(cards).toHaveLength(2);
    cardA = { ...cards[0], classCode };
    cardB = { ...cards[1], classCode };

    // Read back through the teacher's own key: the roster the service is holding is the one
    // the teacher pasted, in order, unclaimed.
    const listed = await page.request.get(`${API}/classes/${classCode}/roster`, {
      headers: { "X-BOW-Teacher-Key": teacherKey },
    });
    expect(listed.status()).toBe(200);
    const roster = ((await listed.json()) as { roster: { seatCode: string; displayName: string; claimed: boolean }[] }).roster;
    expect(roster.map((entry) => entry.displayName)).toEqual([STUDENT_A, STUDENT_B]);
    expect(roster.map((entry) => entry.seatCode)).toEqual(["1", "2"]);
    expect(roster.every((entry) => !entry.claimed), "nobody has signed in yet").toBe(true);

    // The same request without the key does not publish the roster.
    const anonymous = await page.request.get(`${API}/classes/${classCode}/roster`);
    const door = await anonymous.json() as Record<string, unknown>;
    expect(JSON.stringify(door), "the door does not enumerate the roster").not.toContain(STUDENT_A);
  });

  /* ---------------------------------------------------------------------- */

  test("2 — the student's credential is a class code and a card code, and nothing else", async () => {
    expect(cardA.seatCode).toBe("1");
    expect(cardA.displayName).toBe(STUDENT_A);
    expect(cardA.joinCode, "there is a code on the card").toMatch(/^[A-Z0-9]{4,8}$/);
    expect(cardB.joinCode).not.toBe(cardA.joinCode);
    // A card is the whole credential: nothing on it is an email, a password or a date.
    expect(Object.keys(cardA).sort()).toEqual(["classCode", "displayName", "joinCode", "seatCode"]);
    // And it resolves to exactly one student: A's code in A's class is A, not B.
    const joined = await machineOne.request.post(`${API}/classes/${classCode}/join`, {
      data: { classCode, seatCode: cardA.seatCode, joinCode: cardA.joinCode, device: "shared" },
    });
    expect(joined.status(), await joined.text()).toBe(200);
    const who = (await joined.json()) as { displayName: string; seatCode: string };
    expect(who.displayName).toBe(STUDENT_A);
    expect(who.seatCode).toBe("1");
  });

  /* ---------------------------------------------------------------------- */

  test("3 — the student signs in with no email, no password, no birthday", async () => {
    const page = machineOne.pages()[0];
    await gotoFreshChallenge(page);
    await page.goto("/join");

    /**
     * What this screen is *asking for*, rather than what it happens to say.
     *
     * The door prints the sentence "BOW never asks for your email, your birthday, or anything
     * about your real money", so a grep of the page text for those words is a test that fails
     * on the product keeping its promise. What has to be true is that no control on the way in
     * collects one — so this reads every form control on the screen, its type, and the label a
     * person would read next to it.
     */
    const asksFor = async () => page.evaluate(() => {
      const controls = [...document.querySelectorAll("main input, main select, main textarea")];
      return controls.map((control) => {
        const element = control as HTMLInputElement;
        const label = element.labels?.[0]?.textContent ?? element.getAttribute("aria-label") ?? "";
        return { type: (element.getAttribute("type") ?? "text").toLowerCase(), label: label.trim(), name: element.name ?? "" };
      });
    });

    const forbidden = /e-?mail|passcode|password|birth|d\.?o\.?b\.?|how old|age|parent|guardian|address|phone/i;
    const check = (fields: { type: string; label: string; name: string }[], where: string) => {
      for (const field of fields) {
        expect(["email", "password", "date", "tel", "month", "week"], `${where} asks for a ${field.type}`).not.toContain(field.type);
        expect(field.label, `${where} has a field labelled "${field.label}"`).not.toMatch(forbidden);
        expect(field.name, `${where} has a field named "${field.name}"`).not.toMatch(forbidden);
      }
    };

    check(await asksFor(), "the class-code screen");
    await expect(page.getByLabel("Class code")).toBeVisible();
    await page.getByLabel("Class code").fill(classCode);
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByLabel("Your code")).toBeVisible();
    check(await asksFor(), "the card screen");
    // Two typed codes, and the only other control is which computer this is.
    const fields = await asksFor();
    expect(fields.filter((field) => field.type !== "radio").map((field) => field.label))
      .toEqual(["Your code"]);

    await page.getByLabel("Your code").fill(cardA.joinCode);
    await page.getByRole("button", { name: "Go in" }).click();

    // In, as themselves, with nothing typed but two codes off a card.
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator(".student-home__bar")).toContainText(STUDENT_A);
  });

  /* ---------------------------------------------------------------------- */

  test("4 — the student sees the correct class and their assignments", async () => {
    const page = machineOne.pages()[0];

    // Whose screen this is, said as the page's own first heading.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STUDENT_A);
    await expect(page.locator("body")).toContainText("Journey · Period 4");
    await expect(page.locator("body")).toContainText("Seat 1");
    // Not the other child on the roster, on any screen this student can see.
    await expect(page.locator("body")).not.toContainText(STUDENT_B);

    // Two assignments set, two cards drawn, named for the work rather than numbered.
    await expect(page.locator(".work-card")).toHaveCount(2);
    await expect(page.locator(".work-head__count")).toHaveText("2 assignments");
    const titles = (await page.locator(".work-card__title").allInnerTexts()).map((title) => title.trim());
    expect([...titles].sort()).toEqual([BASKETBALL_TITLE, POP_UP_TITLE].sort());
    // And in the order the screen's own rule ranks them: the one with a date on it is above the
    // one without. Neither has been started, so nothing else can be deciding this.
    expect(titles[0], "the piece of work with a due date is offered first").toBe(BASKETBALL_TITLE);

    // Both are "not started", and the one with a date on it says the date rather than a
    // countdown or a colour.
    await expect(page.locator(".work-chip")).toHaveCount(2);
    await expect(page.locator(".work-chip").first()).toContainText("Not started");
    await expect(page.locator(".work-card__due")).toHaveCount(1);
    await expect(page.locator(".work-card__due")).toContainText("Your teacher would like this by");
    await expect(page.locator("body"), "no countdown, no OVERDUE, no red word").not.toContainText(/overdue|days left|late/i);

    // And it is this class's work: the service says the same two assignment ids.
    const held = await room(page.request);
    expect(held.assignments.map((entry) => entry.id).sort()).toEqual(assignments.map((entry) => entry.id).sort());
  });

  /* ---------------------------------------------------------------------- */

  test("5 — the student begins Run the Pop-Up and the progress is on the server", async () => {
    const page = machineOne.pages()[0];

    await page.getByRole("link", { name: `Start — ${POP_UP_TITLE}` }).click();
    // One screen stands between the card and the run — see the standalone test at the foot of
    // this file for what it says while it is standing there. `startIfConfirmAsked` presses it
    // where it is drawn and does nothing where it is not.
    await startIfConfirmAsked(page);

    // The market, and not the picker: the class was set one world for this card.
    await expect(page.getByRole("heading", { name: COPY.spot.title })).toBeVisible();
    await expect(page.locator(".worldcard")).toHaveCount(0);

    // Three real decisions, each one a thing a student chose rather than a page turn: which
    // booth, what the two conditional amounts are worth, and how the opening money is split.
    await page.getByRole("button", { name: `${COPY.spot.take}: ${BOOTH.title}` }).click();
    await checkSum(page, COPY.spot.owed.label, owedUpFront(MARKET, BOOTH.id));
    await page.getByRole("button", { name: COPY.spot.action }).click();

    for (const source of ["catering", "rebate"] as const) {
      await page.getByRole("button", { name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}` }).click();
    }
    await checkSum(page, COPY.money.toPlan.label, cashToPlan(MARKET, BOOTH.id));
    await page.getByRole("button", { name: COPY.money.action }).click();

    await expect(page.getByRole("heading", { name: COPY.plan.title })).toBeVisible();
    await setLine(page, POP_UP_SCENARIO.lines.stock.label, 600);
    await setLine(page, POP_UP_SCENARIO.lines.cushion.label, 400);
    await page.locator('.popup-closer__choice button[data-line="cut"]').click();

    // The stage change on commit is what makes the browser check in with the class service.
    // Waited on rather than slept through, so the interruption below cannot be a race.
    const checkpointed = page.waitForResponse(
      (response) => response.url().includes("/me/attempt") && response.request().method() === "PUT" && response.status() === 200,
    );
    await page.getByRole("button", { name: COPY.plan.commit }).click();
    await checkpointed;
    await expect(page.getByRole("heading", { name: COPY.first.title })).toBeVisible();

    // Server-side, read as the teacher: this seat is mid-run, in this world, at a real stage.
    await expect.poll(async () => (await room(page.request)).progress.length, { timeout: 20_000 }).toBe(1);
    const held = await room(page.request);
    const mine = held.progress[0];
    expect(mine.seatCode).toBe("1");
    expect(mine.worldId).toBe("food-truck");
    expect(stepPosition("food-truck", mine.stage), "the stage is a real step in this world's story").not.toBeNull();
    stoppedStage = mine.stage;

    // Nothing has been turned in — a checkpoint is not a submission.
    expect(held.submissions).toHaveLength(0);
  });

  /* ---------------------------------------------------------------------- */

  test("6 — the session is interrupted: the page closes mid-run", async () => {
    const page = machineOne.pages()[0];
    await page.close();
    expect(machineOne.pages(), "machine one has no page left").toHaveLength(0);

    // The run is still where the student left it, held by the service and not by that tab.
    const held = await room(machineOne.request);
    expect(held.progress.map((entry) => entry.stage)).toEqual([stoppedStage]);
    expect(held.submissions, "and it is still not turned in").toHaveLength(0);
  });

  /* ---------------------------------------------------------------------- */

  test("7 — the student resumes on a genuinely separate browser context, state intact", async ({ browser }) => {
    // A second machine: its own context, its own storage, its own cookies. Nothing crosses
    // from machine one except the two codes printed on the card.
    machineTwo = await browser.newContext();
    pageTwo = await machineTwo.newPage();

    // Proof the storage really is separate before anything is claimed off it.
    await pageTwo.goto("/");
    const emptyHere = await pageTwo.evaluate(() => ({ keys: Object.keys(localStorage).length }));
    expect(emptyHere.keys, "the second browser starts with nothing in it").toBe(0);

    await signIn(pageTwo, cardA);

    // The home reads as resuming rather than as starting, and names the stage the *service*
    // says they stopped at — computed here from the world's own vocabulary, not copied from
    // the screen.
    const card = pageTwo.locator(".work-card").filter({ hasText: POP_UP_TITLE });
    await expect(card.locator(".work-chip")).toContainText("In progress");
    await expect(card.locator(".work-card__state")).toHaveText(`You stopped at ${stoppedAt("food-truck", stoppedStage)}.`);
    const position = stepPosition("food-truck", stoppedStage)!;
    await expect(card.locator(".progress__step")).toHaveText(`Step ${position.step} of ${position.of}`);
    await expect(card.getByRole("link", { name: /Carry on/ })).toBeVisible();

    // And the second machine is told, in as many words, that the run is not on one computer.
    await expect(card.locator(".work-card__anywhere")).toContainText(/any computer/i);

    await card.getByRole("link", { name: /Carry on/ }).click();

    // Back where they stopped: the first Saturday, not the booths. A run that had restarted
    // would be asking which booth to take.
    await expect(pageTwo.getByRole("heading", { name: COPY.first.title })).toBeVisible();
    await expect(pageTwo.getByRole("heading", { name: COPY.spot.title })).toHaveCount(0);

    // The decisions themselves survived, not just the position. The run's own figures — which
    // this machine has never been told and could not compute — carry the $600 machine one put
    // on the stock line, and the run says whose seat and whose class it is.
    const figures = pageTwo.getByRole("list", { name: /This run.s own numbers/i });
    await expect(figures).toContainText("$600");
    await expect(figures).toContainText("Saturday 1 of 4");
    await expect(pageTwo.locator(".run-menu summary")).toContainText(`${classCode} · seat 1`);
  });

  /* ---------------------------------------------------------------------- */

  test("8 — the student finishes the run and turns it in", async () => {
    const page = pageTwo;

    await orderTrays(page, 3);
    await checkSum(page, COPY.saturday.order.label, orderCost(MARKET, 3));
    await page.getByRole("button", { name: COPY.saturday.open }).click();
    await serveTheNight(page);

    // The tips jar: three claims on money that is not the truck's, and a reason for the one
    // left out. This is a decision, not a page turn.
    await page.locator(".maybe-grid button").first().click();
    await page.locator(".helper-card__ask .binary-choice button").first().click();
    await page.getByRole("button", { name: COPY.tips.title }).click();

    await page.getByRole("button", { name: COPY.standing.alone }).click();
    await orderTrays(page, 3);
    await page.getByRole("button", { name: COPY.standing.action }).click();
    await serveTheNight(page, 2);

    // The generator dies. The bill, and where the money for it comes from.
    await checkSum(page, COPY.generator.gap.label, swapBill(MARKET));
    await page.getByRole("button", { name: COPY.generator.action }).click();
    const cushion = await heldInLine(page, POP_UP_SCENARIO.lines.cushion.label);
    expect(cushion, "the cushion machine one planned is what pays for this").toBeGreaterThanOrEqual(400);
    await setLine(page, POP_UP_SCENARIO.lines.cushion.label, cushion - swapBill(MARKET));
    await page.getByRole("button", { name: COPY.repair.commit }).click();

    await page.getByRole("button", { name: COPY.saturday.open }).click();
    await serveTheNight(page);
    await page.getByRole("button", { name: COPY.settle.action }).click();

    // The write-up, in the student's own words, with the two figures they picked.
    await page.locator(".writeup__tiles button").nth(0).click();
    await page.locator(".writeup__tiles button").nth(1).click();
    const figures = await page.locator('.writeup__tiles button[aria-pressed="true"]').allInnerTexts();
    const [first, second] = figures.map((text) => (text.match(/[\d,]+/g) ?? []).at(-1) ?? "");
    await page.getByLabel(COPY.writeUp.field).fill(`${A_WRITES} We took ${first} across the four nights, and ${second} is the other figure I would talk about.`);
    await page.getByRole("button", { name: COPY.writeUp.submit }).click();

    await expect(page.getByRole("heading", { name: COPY.submitted.sent })).toBeVisible({ timeout: 20_000 });
  });

  /* ---------------------------------------------------------------------- */

  test("9 — the evidence is filed under the right student, class, assignment and attempt", async () => {
    const held = await room(pageTwo.request);
    expect(held.submissions, "one run, from one seat").toHaveLength(1);
    const mine = held.submissions[0];
    sessionId = mine.sessionId;

    // The student: seat 1, which the roster says is Marisol.
    expect(mine.seatCode).toBe("1");
    expect(held.roster.find((entry) => entry.seatCode === "1")?.displayName).toBe(STUDENT_A);
    // The class.
    expect(mine.classCode).toBe(classCode);
    // The assignment: the Pop-Up one, which is the card they pressed.
    expect(mine.assignmentId).toBe(assignments[0].id);
    expect(mine.assignmentId).not.toBe(assignments[1].id);
    // The attempt: one session id, and it is the one both machines were writing to.
    expect(sessionId).toMatch(/[0-9a-f-]{16,}/);
    expect(new Set(mine.log.map((event) => event.worldId))).toEqual(new Set(["food-truck"]));

    // And the log carries a decision made on **machine one**, before the interruption — which
    // is what makes this one attempt across two computers rather than two attempts.
    const booth = mine.log.find((event) => event.type === "POPUP_SPOT_SELECTED");
    expect(booth, "the booth chosen on machine one is in the run that was turned in").toBeTruthy();
    expect(JSON.stringify(booth?.payload)).toContain(BOOTH.id);
    // …and a decision made on machine two.
    expect(mine.log.some((event) => event.type === "POPUP_WRITEUP_SUBMITTED")).toBe(true);

    // The checkpoint stopped counting as "still working" the moment the run arrived.
    expect(held.progress, "a turned-in run is not also in progress").toHaveLength(0);
  });

  /* ---------------------------------------------------------------------- */

  test("10 — the student signs out and the back button does not restore their work", async () => {
    const page = pageTwo;
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STUDENT_A);
    // Something of theirs is on the screen before they leave, so its absence afterwards means
    // something.
    await expect(page.locator(".work-card").filter({ hasText: POP_UP_TITLE }).locator(".work-chip")).toContainText(/Turned in/);
    // Read before, so "it is gone afterwards" is a change rather than a key that never existed.
    expect(await page.evaluate(() => localStorage.getItem("bow.student.v1.token")), "there is a session to lose").not.toBeNull();

    await page.getByRole("button", { name: "Not you? Sign out" }).click();
    await expect(page).toHaveURL(/\/join$/);
    expect(await page.evaluate(() => localStorage.getItem("bow.student.v1.token")), "the session is gone from this browser").toBeNull();

    // Back.
    await page.goBack();
    await expect(page.locator("body"), "the back button did not bring their work back").not.toContainText(STUDENT_A);
    await expect(page.locator(".work-card")).toHaveCount(0);

    // And the address bar is not a way back in either.
    await page.goto("/home");
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.locator("body")).not.toContainText(STUDENT_A);

    // Nor is the run they were half-way through, nor the recap of the run they turned in.
    await page.goto(`/run/${classCode}/${sessionId}`);
    await expect(page.locator("body")).not.toContainText(A_WRITES.slice(0, 40));
  });

  /* ---------------------------------------------------------------------- */

  test("11 — a second student on the same browser cannot see the first student's work", async () => {
    const page = pageTwo;
    await signIn(page, cardB);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STUDENT_B);
    await expect(page.locator("body")).toContainText("Seat 2");
    await expect(page.locator("body"), "not one word of the last student's").not.toContainText(STUDENT_A);
    await expect(page.locator("body")).not.toContainText(A_WRITES.slice(0, 40));

    // Devon has been set the same two things and has done neither.
    await expect(page.locator(".work-card")).toHaveCount(2);
    await expect(page.locator(".work-chip").filter({ hasText: "Not started" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: /Carry on/ })).toHaveCount(0);
    await expect(page.locator(".work-card__recap"), "no link to anybody's finished run").toHaveCount(0);

    // And the service refuses to hand Marisol's attempt to Devon's session, whatever the URL.
    await page.goto(`/run/${classCode}/${sessionId}`);
    await expect(page.locator("body")).not.toContainText(A_WRITES.slice(0, 40));
    const denied = await page.evaluate(async (id) => {
      const token = localStorage.getItem("bow.student.v1.token");
      const response = await fetch(`/api/me/runs/${id}`, { headers: { Authorization: `Bearer ${token ?? ""}` } });
      return response.status;
    }, sessionId);
    expect(denied, "another student's run is a 404, not a body").toBe(404);
  });

  /* ---------------------------------------------------------------------- */

  test("12 — the teacher opens the class and the status is coherent", async () => {
    const page = pageTwo;
    await page.goto(`/educator/class/${classCode}?key=${teacherKey}`);

    // The room, counted once: two students on the roster, one attempt in.
    await expect(page.locator(".class-identity__facts")).toContainText("2 students");
    await expect(page.locator(".class-identity__facts")).toContainText("1 attempt");
    await expect(page.locator("body")).toContainText(STUDENT_A);
    await expect(page.locator("body")).toContainText(STUDENT_B);

    // The headline and its detail are about the same room, and neither invents a grade.
    const headline = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
    const detail = (await page.locator(".instrument__detail").innerText()).trim();
    expect(`${headline} ${detail}`, "the class page says one turned in").toMatch(/\b1\b/);
    await expect(page.locator("body"), "no letter grade on a teacher's screen either").not.toContainText(/\b[A-F][+-]\b/);

    // Coherence with the service, not with itself: what the page reports is what the class
    // service is holding.
    const held = await room(page.request);
    expect(held.submissions).toHaveLength(1);
    expect(held.roster).toHaveLength(2);
    // The seat that has not started is not being reported as having turned anything in.
    expect(held.submissions.some((entry) => entry.seatCode === "2")).toBe(false);
  });

  /* ---------------------------------------------------------------------- */

  test("13 — the teacher opens the correct student and reads their real decisions and writing", async () => {
    const page = pageTwo;
    await page.goto(`/educator/class/${classCode}/students/1?key=${teacherKey}`);

    await expect(page.getByRole("heading", { name: STUDENT_A, exact: true })).toBeVisible();
    await expect(page.locator("body"), "the other student is not on this page").not.toContainText(STUDENT_B);

    // Their writing, verbatim, as they typed it on machine two — on the page rather than
    // behind a tab. (The teacher instrument was rebuilt this round into one scrolling
    // record; the tabs this test used to press no longer exist and are not being mourned.)
    await expect(page.locator("section.written blockquote").first())
      .toContainText("the generator is rented and rented things break");

    // Their decisions, as the run recorded them: the booth taken on machine one and the
    // stock line typed on machine one, both read back out of their own event log.
    const decided = page.locator(".decision-steps");
    await expect(decided).toContainText(BOOTH.title);
    await expect(decided).toContainText("$600");

    // And every judgement on the attempt is on the page, each one arguable.
    const judgements = page.locator(".judgement-rows > li");
    expect(await judgements.count(), "the record has judgements in it to read").toBeGreaterThan(0);
    await expect(page.locator(".judgement-rows > li[data-short=\"true\"]").first(), "and the shortfall is one of them").toBeVisible();
  });

  /* ---------------------------------------------------------------------- */

  test("14 — the teacher records a different judgement and it propagates", async () => {
    const page = pageTwo;
    await page.goto(`/educator/class/${classCode}/students/1?key=${teacherKey}`);

    // The row a teacher would argue with: the one thing this attempt fell short on.
    const row = page.locator('.judgement-rows > li[data-short="true"]').first();
    await expect(row).toBeVisible();
    const requirement = (await row.locator(".judgement-line b").innerText()).trim();
    const machineSaid = (await row.locator(".judgement-line > span").first().innerText()).trim();
    expect(requirement.length, "the row names what the work had to show").toBeGreaterThan(4);

    // Before: this is what the page's own instrument is leading with, two regions above.
    await expect(page.locator(".verdict__flags"), "the shortfall is on the verdict").toContainText(requirement);
    const flagsBefore = await page.locator(".verdict__flags li").count();

    // The teacher reads the writing and records their own marks for it, which is the one
    // number in this product that only a person can produce. Until they do, the class page
    // ranks this seat as *Evidence not all in* and never names the gap — so this is also
    // what makes the second view below able to show the judgement at all.
    const rubric = page.locator(".rubric-row");
    const criteria = await rubric.count();
    expect(criteria, "there are marks to record").toBeGreaterThan(0);
    for (let index = 0; index < criteria; index += 1) {
      await rubric.nth(index).locator(".segmented button").last().click();
    }
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.locator(".written__own")).toContainText("Saved.");

    // …and now what the class overview is ranking this seat by, which is a different page
    // reading the same evidence. Captured before, so its absence afterwards is a change.
    await page.goto(`/educator/class/${classCode}?key=${teacherKey}`);
    await expect(page.locator(".triage"), "the class page ranks this seat by this gap").toContainText(requirement);
    await page.goto(`/educator/class/${classCode}/students/1?key=${teacherKey}`);

    // The teacher disagrees, in writing, because a judgement with no reason cannot be checked.
    const disclosure = row.locator("details");
    if (!(await disclosure.evaluate((element: HTMLDetailsElement) => element.open))) {
      await disclosure.locator("summary").click();
    }
    await row.getByRole("button", { name: LEVEL_LABELS[5], exact: true }).click();
    await row.locator("textarea").fill("I watched Marisol set the cushion first and work the rest around it, before the board caught up with her.");
    const recorded = page.waitForResponse((response) => response.url().includes("/overrides"));
    await row.getByRole("button", { name: "Record it" }).click();
    expect((await recorded).status(), "the service took the teacher's reading").toBe(201);

    // 1 — the service kept it, on the right attempt, with the reason attached.
    const held = await room(page.request);
    const mine = held.submissions.find((entry) => entry.seatCode === "1");
    expect(mine?.sessionId).toBe(sessionId);
    expect(mine?.overrides ?? [], "one override, on this attempt").toHaveLength(1);
    expect(mine?.overrides?.[0]?.evidenceRequirementId).toBeTruthy();
    expect(mine?.overrides?.[0]?.note, "the reason travels with it").toContain("cushion first");

    // 2 — after a reload, so this is about what was stored rather than what one component
    //     was holding: the teacher's reading stands, and BOW's original is still beside it.
    //     Both, always — an override that hid the machine's reading would remove the only
    //     thing a second teacher could check the first one against.
    await page.reload();
    const overridden = page.locator(".judgement-rows > li").filter({ hasText: requirement }).first();
    await expect(overridden.locator(".judgement__override strong")).toHaveText(LEVEL_LABELS[5]);
    await expect(overridden.locator(".judgement-line > span").first()).toHaveText(machineSaid);
    await expect(overridden.locator(".judgement__history q"), "and the reason is kept with it")
      .toContainText("cushion first");

    // 3 — the verdict, which is a different reading of the same evidence on the same page,
    //     agrees: the thing the teacher says they did is no longer listed as a shortfall.
    //     (`.verdict__flags` is not rendered at all when the list empties, so this is asked
    //     of the region that would hold it rather than of the list.)
    await expect(page.locator(".verdict__lead")).not.toContainText(requirement);
    expect(await page.locator(".verdict__flags li").count(), "one fewer shortfall on the verdict")
      .toBe(flagsBefore - 1);

    // 4 — and the class overview, which is a different page, stops ranking this seat by a
    //     gap the teacher has said is not one. This is the propagation the judgement record
    //     promises in as many words: "an override stands everywhere this judgement appears".
    await page.goto(`/educator/class/${classCode}?key=${teacherKey}&t=${Date.now()}`);
    await expect(page.locator(".triage")).not.toContainText(requirement);
  });

  /* ---------------------------------------------------------------------- */

  test("15 — the teacher writes back and only the correct student receives it", async ({ browser }) => {
    const page = pageTwo;
    await page.goto(`/educator/class/${classCode}/students/1?key=${teacherKey}`);
    await expect(page.locator(".feedback__none"), "nothing has been written back yet").toBeVisible();
    await page.locator(".feedback textarea").fill(NOTE_TO_A);
    await page.getByRole("button", { name: "Send it" }).click();

    // The panel says it went, and stops saying nothing has been written — D13, which was the
    // panel contradicting itself in two adjacent lines until somebody reloaded.
    await expect(page.locator(".feedback")).toContainText(/Sent\./);
    await expect(page.locator(".feedback__sent")).toContainText(NOTE_TO_A);
    await expect(page.locator(".feedback__none"), "and does not still say nothing was written").toHaveCount(0);

    // The service filed it against Marisol's seat and Marisol's attempt.
    const held = await room(page.request);
    const notes = held.feedback.filter((entry) => !entry.deletedAt);
    expect(notes).toHaveLength(1);
    expect(notes[0].seatCode).toBe("1");
    expect(notes[0].sessionId).toBe(sessionId);

    // Marisol, signing in on a third clean browser, reads it — attached to the run it is about
    // and not floating above the work.
    const hers = await browser.newContext();
    try {
      const mine = await hers.newPage();
      await mine.goto("/");
      await signIn(mine, cardA);
      const popUp = mine.locator(".work-card").filter({ hasText: POP_UP_TITLE });
      await expect(popUp.locator(".teacher-note")).toContainText(NOTE_TO_A);
      await expect(popUp.locator(".work-chip")).toContainText("Your teacher wrote back");
      // The other card did not receive somebody else's words.
      await expect(mine.locator(".work-card").filter({ hasText: BASKETBALL_TITLE }).locator(".teacher-note")).toHaveCount(0);
    } finally {
      await hers.close();
    }

    // Devon does not see it, anywhere.
    await signIn(page, cardB);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STUDENT_B);
    await expect(page.locator("body")).not.toContainText(NOTE_TO_A);
    await expect(page.locator(".teacher-note")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Your teacher wrote back");
  });
});

/* ==========================================================================
   The two defects the journey above walks past, each stated on its own so a
   red here names the thing that is wrong rather than stopping the journey.
   ========================================================================== */

test("the screen between the card and the run does not offer a choice the class has not", async ({ page }) => {
  /**
   * **Reproduced, still open.** `test.fail()` rather than a skip: the assertion below runs
   * every time and the suite stays green while it keeps failing, and it turns *red* the day
   * somebody fixes the product — which is the only moment a recorded defect needs to shout.
   *
   * A class set exactly one world still meets the entry screen, and that screen decides what
   * to say from `WORLD_CHOICE_UI_READY && PLAYABLE_WORLDS.length > 1`
   * (`src/stages/StudentChallenge.tsx:139`) rather than from the assignment in front of it. So
   * a student whose teacher pinned them to the market presses *Run the Pop-Up* on their own
   * home page and is answered by
   *
   *     Eight Weeks to the Showcase · Run the Pop-Up
   *     Two ways in. You pick one.
   *
   * with a button reading *Go in* — and then gets no choice at all, because the offer the
   * button actually carries is the pinned one. It is a promise made and withdrawn inside one
   * click, on the screen that budgets 55 seconds for a child to read it.
   */
  test.fail();
  const created = await createClass(page.request, "One world");
  const set = await page.request.post(`${API}/classes/${created.code}/assignments`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
    data: { objectiveRef: null, allowedWorldIds: ["food-truck"], studentChoosesWorld: false },
  });
  expect(set.status(), await set.text()).toBe(201);
  const seated = await page.request.post(`${API}/classes/${created.code}/roster`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
    data: { names: ["Rosalind Featherby"] },
  });
  expect(seated.status(), await seated.text()).toBe(201);
  const card = ((await seated.json()) as { cards: JoinCard[] }).cards[0];

  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode: created.code });
  await page.getByRole("link", { name: "Start" }).click();

  // Wait for whichever screen actually arrives before reading it. `not.toContainText` against
  // a body that has not rendered yet passes instantly and says nothing, which is how this
  // assertion managed to be green and red in the same hour on the same commit.
  await expect(
    page.getByRole("button", { name: /^(Start the eight weeks|Go in)$/ })
      .or(page.getByRole("heading", { name: COPY.spot.title }))
      .first(),
  ).toBeVisible();

  // Whatever screen this is, it may not say the student is about to choose between two
  // stories when their teacher has already chosen for them.
  await expect(page.locator("body")).not.toContainText(STUDENT_COPY.join.chooseHeadline);
  await expect(page.locator("body"), "the pinned class was offered the other world by name").not.toContainText(BASKETBALL_TITLE);
});

test("a second assignment's card opens the second assignment", async ({ page }) => {
  /**
   * **Reproduced, still open.** Marked `test.fail()` for the reason given above.
   *
   * Both cards on the student's home link to the same route with nothing on it but the class
   * code, and the run resolves what to open from `picked.assignments[0]`
   * (`src/stages/StudentChallenge.tsx`) and files evidence under `assignments[0].id`
   * (`src/stages/popup/seat.ts`). So a class holding two assignments has exactly one openable
   * piece of work: pressing the second card opens the first one's world, and any run made
   * from it is filed under the first one's id.
   *
   * The class here is set Basketball first and the market second, which is the same class as
   * the journey with the two assignments swapped — so a green here and a green there together
   * would mean the button does what it says whichever way round the teacher set them.
   */
  test.fail();
  const created = await createClass(page.request, "Second card");
  for (const worlds of [["basketball"], ["food-truck"]]) {
    const set = await page.request.post(`${API}/classes/${created.code}/assignments`, {
      headers: { "X-BOW-Teacher-Key": created.teacherKey },
      data: { objectiveRef: null, allowedWorldIds: worlds, studentChoosesWorld: false },
    });
    expect(set.status(), await set.text()).toBe(201);
  }
  const seated = await page.request.post(`${API}/classes/${created.code}/roster`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
    data: { names: ["Ines Bramblecourt"] },
  });
  expect(seated.status(), await seated.text()).toBe(201);
  const card = ((await seated.json()) as { cards: JoinCard[] }).cards[0];

  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode: created.code });

  await expect(page.locator(".work-card__title").nth(1)).toHaveText(POP_UP_TITLE);
  await page.getByRole("link", { name: `Start — ${POP_UP_TITLE}` }).click();

  // The market's first screen is the booths. Basketball's is the housing ranking.
  await expect(
    page.getByRole("heading", { name: COPY.spot.title }),
    "pressing the Run the Pop-Up card opened the other assignment's world",
  ).toBeVisible();
});
