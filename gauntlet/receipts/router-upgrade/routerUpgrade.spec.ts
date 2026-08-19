import { mkdir } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  API,
  completeSetupStage,
  completeWorkingCalcs,
  createClass,
  decideOpportunity,
  enterChallenge,
  gotoFreshChallenge,
  passWeek5Calculation,
  playSeasonWeeks,
  readWeek8Resolution,
  submitDefense,
  waitForDelivery,
} from "./flow";
import { savePlan, week5TotalFor, type PlanContext } from "./plan";
import { buildSubmission } from "../src/test/runChallenge";
import { DEMO_CLASS_CODE } from "../src/fixtures/demoClass";
import { PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";

/**
 * The receipts for the react-router 6 → 7 upgrade.
 *
 * Not a second copy of the product suite: `bow.spec.ts` already drives every screen. This
 * exists because routing is the one thing the upgrade touched, and routing is the part of a
 * single-page app that unit tests are least able to speak for — `MemoryRouter` under jsdom has
 * no address bar, no history stack and no reload, so all 1390 of them can pass over a router
 * that has stopped intercepting clicks. So this walks the two journeys a district reviewer
 * would walk and, at each step, asserts the four things a router is actually for:
 *
 *   1. a `<Link>` changes the page without fetching a new document,
 *   2. a deep link with a query string renders the same screen the link would have,
 *   3. the browser's own Back and Forward buttons move exactly one step,
 *   4. a reload lands on the screen the person was on, not at the front door.
 *
 * Run against a build of the commit under test:
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   BOW_E2E_APP_PORT=5573 BOW_API_PORT=5580 ROUTER_RECEIPTS=<dir> \
 *   npx playwright test e2e/routerUpgrade.spec.ts --project=chromium-1366
 */
const OUT = process.env.ROUTER_RECEIPTS;

/** Marks the current document, so the next assertion can tell a route change from a page load. */
async function markDocument(page: Page) {
  await page.evaluate(() => { (window as unknown as { __bowDocument?: number }).__bowDocument = Date.now(); });
}

/**
 * Fails if the document was replaced since `markDocument`.
 *
 * A full page load is not a broken screen on its own — it is a slow one that drops everything
 * the run is holding in memory. It is also exactly what a router that has stopped intercepting
 * clicks degrades into, silently, while every screen still looks right in a screenshot.
 */
async function stillSameDocument(page: Page, what: string) {
  const kept = await page.evaluate(() => (window as unknown as { __bowDocument?: number }).__bowDocument);
  expect(kept, `${what} fetched a new document instead of routing`).toBeTruthy();
}

async function shoot(page: Page, name: string) {
  if (!OUT) return;
  await mkdir(OUT, { recursive: true });
  await page.waitForTimeout(400);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.addStyleTag({ content: "[class*='topbar'], .season-ledger, .plan-rail { position: static !important; }" });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.evaluate(() => document.querySelectorAll("style").forEach((tag) => {
    if (tag.textContent?.includes("position: static !important")) tag.remove();
  }));
}

/**
 * Finished runs behind a class this test made through the *screen* rather than the API.
 *
 * `flow.ts` has `seedRuns`, and it reads the teacher key out of a map only `createClass`
 * writes to — right for a suite that always creates its classes over HTTP, and no use to a
 * journey whose whole point is that a teacher typed a name into a form. Same three calls in
 * the same order, with the key this test read off the screen the teacher was just shown.
 */
async function seedInto(request: APIRequestContext, code: string, key: string, seats: readonly string[]) {
  const listed = await request.get(`${API}/classes/${code}/roster`, { headers: { "X-BOW-Teacher-Key": key } });
  const already = ((await listed.json()) as { roster?: readonly { seatCode: string }[] }).roster ?? [];
  const names = Array.from({ length: seats.length - already.length }, (_, index) => `Seeded Student ${already.length + index + 1}`);
  const made = await request.post(`${API}/classes/${code}/roster`, {
    headers: { "X-BOW-Teacher-Key": key },
    data: { names },
  });
  expect(made.status(), await made.text()).toBe(201);
  const cards = ((await made.json()) as { cards: { seatCode: string; joinCode: string }[] }).cards;

  for (const [index, seat] of seats.entries()) {
    const card = cards.find((entry) => entry.seatCode === seat);
    if (!card) throw new Error(`No card for seat ${seat}.`);
    const joined = await request.post(`${API}/classes/${code}/join`, {
      data: { classCode: code, seatCode: card.seatCode, joinCode: card.joinCode, device: "shared" },
    });
    expect(joined.status(), await joined.text()).toBe(200);
    const token = ((await joined.json()) as { token: string }).token;
    const built = buildSubmission({
      seatCode: seat,
      closeOpeningInto: index === 3 ? "flexibleCash" : "goal",
      defenseText: `Seat ${seat}: I kept the course money where it was and gave up part of the reserve after Week 5.`,
    });
    const sent = await request.post(`${API}/classes/${code}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        classCode: code,
        seatCode: built.seatCode,
        sessionId: built.sessionId,
        challengeId: built.challengeId,
        challengeVersion: built.challengeVersion,
        log: built.log,
      },
    });
    expect(sent.status(), await sent.text()).toBe(202);
  }
}

test.describe("react-router 7", () => {
  test.describe.configure({ mode: "serial" });

  test("a student plays a run end to end, and the router carries them through it", async ({ page, request }) => {
    test.setTimeout(420_000);

    const problems: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") problems.push(`console error — ${message.text()}`); });
    page.on("pageerror", (error) => problems.push(`page error — ${error.message}`));

    const created = await createClass(request, "Router upgrade · student");

    // 1. The front door, and a `<Link>` off it.
    await page.goto("/");
    await shoot(page, "01-home");
    await markDocument(page);
    await page.getByRole("link", { name: "I have a class code" }).click();
    await expect(page).toHaveURL(/\/join$/);
    await stillSameDocument(page, "the front door's class-code link");
    await shoot(page, "02-join");

    // Back, once. `/` is where it came from and where it must land.
    await page.goBack();
    await expect(page.getByRole("heading", { name: /Somebody has to decide/ })).toBeVisible();
    await stillSameDocument(page, "the Back button off /join");

    // 2. The whole join → home → run path, driven the way a student drives it.
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode: created.code, seatCode: "21" });
    // `enterChallenge` follows the Start link, which carries the class on the query string —
    // one of the two places this product puts state in a URL a student sees.
    await expect(page).toHaveURL(new RegExp(`${PLAN_UNDER_PRESSURE.route}\\?class=${created.code}`));
    await shoot(page, "03-run-opened");

    const context: PlanContext = { setupId: "cousin-room" };
    await completeSetupStage(page, 2);
    await completeWorkingCalcs(page);
    await savePlan(page, "working", context);
    await shoot(page, "04-opening-plan-saved");

    // 3. A reload in the middle of the run. `ResumeGate` reads `?class=` back out of the URL,
    //    so this is the query string and the persisted attempt having to agree after the
    //    document is thrown away and rebuilt from the address alone.
    const urlMidRun = page.url();
    await page.reload();
    await expect(page).toHaveURL(urlMidRun);
    await expect(page.locator(".challenge, main").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Somebody has to decide/ })).toHaveCount(0);
    await shoot(page, "05-after-reload-mid-run");

    await playSeasonWeeks(page);
    await passWeek5Calculation(page, String(week5TotalFor(context)));
    await savePlan(page, "week5-first-response", context);
    await decideOpportunity(page, { clinics: false, countBonus: false });
    await savePlan(page, "final", { ...context, clinics: false, countCompletionFinal: false });
    await readWeek8Resolution(page);
    await shoot(page, "06-explain");
    await submitDefense(page, "My plan still works because every dollar has a job after Week 5. I protected the course money and gave up some of the reserve.");
    await waitForDelivery(page);
    await shoot(page, "07-turned-in");

    // 4. The student's own deep link to their own run: `/run/:classCode/:sessionId`, two route
    //    params, reached from the finished card on their home screen.
    await page.goto("/home");
    await markDocument(page);
    await page.getByRole("link", { name: "See what your run shows" }).click();
    await expect(page).toHaveURL(new RegExp(`/run/${created.code}/`));
    await stillSameDocument(page, "the finished-run link");
    const runUrl = page.url();
    await shoot(page, "08-run-report");

    // The same address typed cold, into a document that has never routed. Params still resolve.
    await page.goto(runUrl);
    await expect(page).toHaveURL(runUrl);
    await expect(page.locator("main")).toBeVisible();
    await shoot(page, "09-run-report-deep-link");

    expect(problems, problems.join("; ")).toEqual([]);
  });

  test("a teacher goes from creating a class to reading evidence, on deep links carrying keys", async ({ page, request }) => {
    test.setTimeout(420_000);

    const problems: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") problems.push(`console error — ${message.text()}`); });
    page.on("pageerror", (error) => problems.push(`page error — ${error.message}`));

    // The class is made through the screen a teacher uses, not over the API.
    await page.goto("/educator/classes/new");
    await page.getByLabel("Name this class").fill("Router upgrade · Period 3");
    await page.getByRole("button", { name: "Create the class" }).click();
    const codeCell = page.locator(".class-created__code strong");
    await expect(codeCell).toBeVisible();
    const code = (await codeCell.innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{5}$/);
    const keyLine = await page.locator(".class-created__key code").innerText();
    const key = keyLine.split("key=")[1].trim();
    await shoot(page, "10-class-created");

    // Real finished runs behind it, so the evidence screens are in the state a teacher meets
    // rather than in their empty state.
    await seedInto(request, code, key, ["1", "2", "3", "4", "5"]);

    const evidence = `/educator/class/${code}?key=${key}`;

    // 5. The private link, off the page that just printed it — a `<Link>` whose target is a
    //    template literal with the key on the query string. This is the exact shape the
    //    open-redirect advisory is about, and the exact reason it does not reach here: the
    //    target's first characters are `/educator/class/`, written in the source.
    await markDocument(page);
    await page.getByRole("link", { name: "Open this class" }).click();
    await expect(page).toHaveURL(new RegExp(`/educator/class/${code}\\?key=`));
    await stillSameDocument(page, "the private class link");
    await expect(page.locator("main")).toBeVisible();
    await shoot(page, "11-class-evidence");

    // 6. Four deep links with the key on them, each typed cold, each with its own way back.
    for (const [name, path] of [
      ["12-roster", `/educator/class/${code}/roster?key=${key}`],
      ["13-reading-queue", `/educator/class/${code}/reading?key=${key}`],
      ["14-debrief", `/educator/class/${code}/debrief?key=${key}`],
      ["15-share-out", `/educator/class/${code}/share-out?key=${key}`],
    ] as const) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
      await expect(page.locator("main")).toBeVisible();
      await shoot(page, name);
      // Every one of these screens carries a link back to the class built the same way, and it
      // has to keep the key or the teacher is thrown out of their own class by their own nav.
      const back = page.locator(`a[href="${evidence}"]`).first();
      expect(await back.count(), `${path} offers no keyed way back to the class`).toBeGreaterThan(0);
      await markDocument(page);
      await back.click();
      await expect(page).toHaveURL(evidence);
      await stillSameDocument(page, `the back link on ${path}`);
    }

    // 7. A seat, then the browser's own Back and Forward buttons over it.
    await page.goto(evidence);
    const seatLink = page.locator(`a[href^="/educator/class/${code}/students/"]`).first();
    expect(await seatLink.count(), "the class page lists no seat to open").toBeGreaterThan(0);
    await markDocument(page);
    await seatLink.click();
    await expect(page).toHaveURL(new RegExp(`/educator/class/${code}/students/`));
    await stillSameDocument(page, "a seat link off the class page");
    await shoot(page, "16-student-evidence");
    await page.goBack();
    await expect(page).toHaveURL(evidence);
    await stillSameDocument(page, "Back off a seat");
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/educator/class/${code}/students/`));
    await stillSameDocument(page, "Forward back onto a seat");

    // 8. A reload on a keyed deep link. The key is in the URL, so it has to survive one.
    await page.goto(evidence);
    await page.reload();
    await expect(page).toHaveURL(evidence);
    await expect(page.locator("main")).toBeVisible();
    await shoot(page, "17-class-evidence-after-reload");

    // 9. The educator nav, which is `NavLink` and `useLocation` rather than `Link` — and whose
    //    active state is the one piece of routing a teacher can actually see.
    await page.goto("/educator/classes");
    await expect(page.getByRole("link", { name: "My classes" })).toHaveAttribute("aria-current", "page");
    await markDocument(page);
    await page.getByRole("link", { name: "Guide" }).first().click();
    await expect(page).toHaveURL(/\/educator\/guide$/);
    await expect(page.getByRole("link", { name: "Guide" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "My classes" })).not.toHaveAttribute("aria-current", "page");
    await stillSameDocument(page, "the educator nav");
    await shoot(page, "18-guide");

    expect(problems, problems.join("; ")).toEqual([]);
  });

  test("every redirect route still redirects, and an unknown address still lands on the front door", async ({ page }) => {
    test.setTimeout(300_000);

    // Two of these redirect twice, and the second hop is the product rather than the router.
    // `/challenge` lands on the challenge route exactly as `App.tsx` says it does — and that
    // route has no student session to open in a browser this test has just wiped, so it sends
    // them to the door. What is asserted is where the address bar comes to rest, so a chain is
    // written out as the address a person actually ends up looking at.
    for (const [from, to] of [
      ["/challenge", "/join"], // → the challenge route → /join, with no session held
      ["/educator", "/educator/classes"],
      ["/educator/map", "/educator/objectives"],
      ["/educator/teaching-companion", "/educator/guide"],
      ["/educator/demo", `/educator/class/${DEMO_CLASS_CODE}`],
      ["/educator/demo/standards", "/educator/objectives"],
      ["/educator/demo/students/14", `/educator/class/${DEMO_CLASS_CODE}/students/14`],
      ["/educator/demo/concepts/anything", `/educator/class/${DEMO_CLASS_CODE}`],
      ["/educator/class", `/educator/class/${DEMO_CLASS_CODE}`],
      ["/educator/class/standards", "/educator/objectives"],
      // The catch-all. A bookmark that no longer resolves is a front door, not a blank screen.
      ["/nothing/here/at/all", "/"],
    ] as const) {
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.goto(from);
      await expect(page, `${from} should redirect to ${to}`).toHaveURL(new RegExp(`${to.replace(/\//g, "\\/")}$`));
      // And it must not still be sitting on the address it was asked for.
      expect(new URL(page.url()).pathname, `${from} did not redirect at all`).not.toBe(from);
    }
    await shoot(page, "19-catch-all-front-door");

    // A student with no session asking for the run is sent to the door rather than shown one.
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto(PLAN_UNDER_PRESSURE.route);
    await expect(page).toHaveURL(/\/join$/);
    await shoot(page, "20-no-session-sent-to-join");

    // And a request to the API is still a request to the API — the router does not eat it.
    const health = await page.request.get(`${API}/health`);
    expect(health.status()).toBe(200);
  });
});
