import { expect, test, type Browser, type Page } from "@playwright/test";
import { BACKUP_HEADING, savePlan, week5TotalFor, type PlanContext } from "./plan";
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
} from "./flow";

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
    await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
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
    await expect(page.locator(".class-header")).toContainText("3 turned in");
    // Three runs is not a class: counts and individual work, and nothing about the room.
    await expect(page.locator(".class-guard")).toContainText("individual work below");
    await expect(page.locator(".choice-dist")).toHaveCount(0);

    // Every seat that ran, and no seat that did not.
    const body = page.locator("body");
    for (const student of STUDENTS) await expect(body).toContainText(student.seat);

    // Two more runs, posted the way a student's device posts them, and the same page
    // describes the class: the decisions, with the seats behind every count.
    await seedRuns(request, created.code, [{ seat: "22" }, { seat: "27" }]);
    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}&t=${Date.now()}`);
    await expect(page.locator(".class-guard")).toHaveCount(0);
    const housing = page.locator(".choice-dist").first();
    await expect(housing).toContainText("Where did they put Avery?");
    await expect(housing.locator("li b").first()).not.toBeEmpty();

    // The one who reserved the seat is still the only one who did.
    const deposit = page.locator(".choice-dist").filter({ hasText: "When did they commit to the course?" });
    await expect(deposit).toContainText("seat 19");

    // No fixture anywhere: not its size, not its label, not its golden case.
    await expect(body).not.toContainText("Hypothetical demo data");
    await expect(body).not.toContainText("94/100");
    await expect(body).not.toContainText("28 students");

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
    await expect(page.locator("body")).not.toContainText("Hypothetical demo data");
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
    const health = await request.get(`${process.env.PILOT_API_URL ?? "http://127.0.0.1:4180"}/api/health`);
    expect(health.status()).toBe(200);
    expect((await health.json()).ok).toBe(true);
    // The one field to read before letting a room of students in. A deployment writing to
    // a disk its platform does not keep answers false here and refuses to open a class.
    expect(await health.json()).toMatchObject({ store: expect.any(String), durable: expect.any(Boolean), classroomReady: expect.any(Boolean) });

    await runStudent(page, created.code, { seat: "31", index: 1, setupId: "teammate-share", clinics: false, deposit: false, countBonus: false });

    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
    await expect(page.locator(".class-header")).toContainText("1 turned in");
    await expect(page.locator(".row-list")).toContainText("Seat 31");
  } finally {
    await context.close();
  }
});
