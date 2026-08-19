import { expect, test, type Browser, type Page } from "@playwright/test";
import { BACKUP_HEADING, NUMBERS, savePlan, week5TotalFor, type PlanContext } from "./plan";
import {
  completeSetupStage,
  completeWorkingCalcs,
  createClass,
  decideOpportunity,
  enterChallenge,
  gotoFreshChallenge,
  passWeek5Calculation,
  playSeasonWeeks,
  readWeek8Resolution,
  seedRuns,
  submitDefense,
  waitForDelivery,
  API_ORIGIN,
} from "./flow";
import { DEMO_CLASS_LABEL } from "../src/fixtures/demoClass";

/**
 * The pilot rehearsal.
 *
 * One class, three students on three separate browser contexts — separate storage, separate
 * cookies, the closest thing to three Chromebooks this suite can produce. One of them
 * refreshes mid-run, one loses the network at the moment they turn in. Then the educator
 * opens the class and everything they see has to have come out of exactly those three runs.
 *
 * This is deliberately one long test rather than several. The thing being verified is that
 * the whole path holds together end to end, and a suite that checked each leg separately
 * would pass while the path was broken.
 */

interface Student {
  seat: string;
  index: 0 | 1 | 2;
  setupId: PlanContext["setupId"];
  clinics: boolean;
  deposit: boolean;
  countBonus: boolean;
  quirk?: "refresh" | "network-drop";
}

const STUDENTS: Student[] = [
  { seat: "4", index: 0, setupId: "gym-sublet", clinics: false, deposit: false, countBonus: true, quirk: "refresh" },
  { seat: "11", index: 2, setupId: "cousin-room", clinics: true, deposit: false, countBonus: false, quirk: "network-drop" },
  { seat: "19", index: 1, setupId: "teammate-share", clinics: false, deposit: true, countBonus: false },
];

/**
 * What the teacher's list calls the student in a seat.
 *
 * `seatOnRoster` fills a class up to the seat it is asked for, naming each row in order, so the
 * student in seat N is "Test Student N". The educator surface shows that name rather than the
 * seat number, which is the right way round — a teacher reads a room by who is in it.
 */
function nameFor(seat: string): string {
  return `Test Student ${seat}`;
}

async function runStudent(page: Page, classCode: string, student: Student): Promise<number> {
  const started = Date.now();
  const opening: PlanContext = { setupId: student.setupId, countCompletion: student.countBonus };

  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: student.seat });
  await completeSetupStage(page, student.index);
  await completeWorkingCalcs(page, { attendance: student.countBonus });
  await savePlan(page, "working", opening);

  if (student.countBonus) {
    // Counting a bonus means building the version that works without it.
    await expect(page.getByRole("heading", { name: BACKUP_HEADING })).toBeVisible();
    await savePlan(page, "fallback", opening);
  }

  if (student.quirk === "refresh") {
    // A Chromebook lid closing mid-season. The attempt has to come back where it was.
    await expect(page.getByRole("heading", { name: `Week ${NUMBERS.week3.week} pays Avery in cash.` })).toBeVisible();
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.getByRole("heading", { name: `Week ${NUMBERS.week3.week} pays Avery in cash.` })).toBeVisible();
  }

  await playSeasonWeeks(page, { deposit: student.deposit });
  const afterWeek5: PlanContext = { ...opening, deposit: student.deposit };
  await passWeek5Calculation(page, String(week5TotalFor(opening)));
  await savePlan(page, "week5-first-response", afterWeek5);

  await decideOpportunity(page, { clinics: student.clinics, countBonus: false });
  await savePlan(page, "final", { ...afterWeek5, clinics: student.clinics, countCompletionFinal: false });
  await readWeek8Resolution(page);

  if (student.quirk === "network-drop") {
    await page.route("**/api/classes/*/submissions", (route) => route.abort());
  }
  await submitDefense(page, `Seat ${student.seat}: my plan still works because every dollar has a job after Week 5. I protected what mattered most and gave up the rest.`);

  if (student.quirk === "network-drop") {
    await expect(page.getByRole("heading", { name: "Your plan is saved, but not sent yet." })).toBeVisible({ timeout: 20_000 });
    await page.unroute("**/api/classes/*/submissions");
    await page.getByRole("button", { name: "Try sending again" }).click();
  }
  await waitForDelivery(page);
  return Date.now() - started;
}

async function inOwnContext(browser: Browser, run: (page: Page) => Promise<number>): Promise<number> {
  // A fresh context is a fresh device: its own storage, its own session.
  const context = await browser.newContext();
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  try {
    const elapsed = await run(page);
    expect(problems, `console problems: ${problems.join("; ")}`).toEqual([]);
    return elapsed;
  } finally {
    await context.close();
  }
}

test("a whole class runs end to end across separate devices and the educator reads only those runs", async ({ browser, request }) => {
  test.setTimeout(240_000);
  const created = await createClass(request, "Pilot rehearsal");

  const timings: number[] = [];
  for (const student of STUDENTS) {
    timings.push(await inOwnContext(browser, (page) => runStudent(page, created.code, student)));
  }
  // Not a duration estimate — a bot does not read. It is a floor, and a regression signal
  // if the path ever becomes slow enough that a machine takes minutes to walk it.
  test.info().annotations.push({ type: "machine-run-seconds", description: timings.map((ms) => Math.round(ms / 1000)).join(", ") });

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
    // The lead carries its denominator, which this did not: it asserted "3 turned in" from
    // before every count on this page was rendered against the class it is a count of. The
    // class list is as long as the highest seat any of these students took, because
    // `seatOnRoster` fills the roster up to the seat it is asked for.
    const inClass = Math.max(...STUDENTS.map((student) => Number(student.seat)));
    // `.page-header`, not `.class-header`: the class page used to bring its own header wrapper
    // and it was `.page-header` with a bigger H1 and its own padding, so it was folded into the
    // shared one (`app.css`: "`.class-header` is gone"). A selector naming a wrapper that no
    // longer exists finds nothing and reports it as the page not loading.
    //
    await expect(page.locator(".page-header h1")).toContainText(`${STUDENTS.length} of ${inClass} turned in`);
    // Three runs is not a class: counts and individual work, and nothing about the room.
    await expect(page.locator(".class-guard")).toContainText("individual work below");
    await expect(page.locator(".choice-dist")).toHaveCount(0);

    // Every student who ran, named the way their teacher's own list names them. This asserted
    // the page contained each seat *number* — "4", "11", "19" — which any page with a price on
    // it satisfies by accident; "4" alone is in half the money figures in this product.
    const body = page.locator("body");
    for (const student of STUDENTS) await expect(body).toContainText(nameFor(student.seat));

    // Two more runs, posted the way a student's device posts them, and the same page
    // describes the class: the decisions, with the seats behind every count.
    await seedRuns(request, created.code, [{ seat: "22" }, { seat: "27" }]);
    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}&t=${Date.now()}`);
    await expect(page.locator(".class-guard")).toHaveCount(0);
    const housing = page.locator(".choice-dist").first();
    await expect(housing).toContainText("Where did they put Avery?");
    await expect(housing.locator("li b").first()).not.toBeEmpty();

    // The one who reserved the seat is still the only one who did. The class page names a
    // student the way their teacher's own list names them now, so the seat is read back as the
    // person sitting in it rather than as a number.
    const deposit = page.locator(".choice-dist").filter({ hasText: "When did they commit to the course?" });
    await expect(deposit).toContainText(nameFor("19"));

    // No fixture anywhere: not its label, not the badge that marks its screens.
    //
    // This named three literals — "Hypothetical demo data", "94/100" and "28 students" — and
    // the product contains none of them any more. The sample class was rebuilt as eighteen real
    // runs driven through the reducer, relabelled, and moved onto the real class screens; the
    // per-seat mark out of a hundred went with it. So all three were absences of nothing: green
    // on this page, green on a page that was leaking the fixture, and green on a blank page.
    // The label is read from the fixture itself now, and the badge is the one thing every
    // sample-class screen shares — so both fail if a fixture ever reaches a real class again.
    await expect(body).not.toContainText(DEMO_CLASS_LABEL);
    await expect(page.locator(".demo-pill")).toHaveCount(0);

    // The debrief is built from the same three runs.
    await page.goto(`/educator/class/${created.code}/debrief?key=${created.teacherKey}`);
    await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
    await expect(page.getByText("5 students finished")).toBeVisible();
    await expect(page.locator(".debrief__plan")).toHaveCount(2);
    const quotes = page.locator(".debrief__quotes blockquote");
    await expect(quotes).toHaveCount(4);
    for (const student of STUDENTS) {
      await expect(page.locator(".debrief__quotes")).toContainText(`Seat ${student.seat}:`);
    }
    await expect(page.locator("body")).not.toContainText(DEMO_CLASS_LABEL);
    await expect(page.locator(".demo-pill")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

/**
 * The same path against the production build rather than the dev server, because a build
 * that only works under Vite's transform is not a build. Runs only when a preview server
 * is pointed at with PILOT_BASE_URL.
 */
test("the production build serves the same class path", async ({ browser, request }) => {
  const base = process.env.PILOT_BASE_URL;
  test.skip(!base, "set PILOT_BASE_URL to smoke-test a built server");
  test.setTimeout(120_000);

  const created = await createClass(request, "Production smoke");
  const context = await browser.newContext({ baseURL: base });
  const page = await context.newPage();
  try {
    const health = await request.get(`${process.env.PILOT_API_URL ?? API_ORIGIN}/api/health`);
    expect(health.status()).toBe(200);
    expect((await health.json()).ok).toBe(true);
    // The one field to read before letting a room of students in. A deployment writing to
    // a disk its platform does not keep answers false here and refuses to open a class.
    expect(await health.json()).toMatchObject({ store: expect.any(String), durable: expect.any(Boolean), classroomReady: expect.any(Boolean) });

    await runStudent(page, created.code, { seat: "31", index: 1, setupId: "teammate-share", clinics: false, deposit: false, countBonus: false });

    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
    // Same two staleness fixes as the rehearsal above, in the test that only runs against a
    // built server: the lead carries its denominator, and the list names the student rather
    // than their seat number.
    await expect(page.locator(".page-header h1")).toContainText("1 of 31 turned in");
    await expect(page.locator(".row-list")).toContainText(nameFor("31"));
  } finally {
    await context.close();
  }
});
