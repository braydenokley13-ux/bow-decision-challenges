import { test } from "@playwright/test";
import {
  API, createClass, createClassKeyFor, seatOnRoster, signIn,
} from "./flow";
import { buildSubmission } from "../src/test/runChallenge";

/**
 * S2 proposal reconnaissance — captures /home in the four states the brief asks for, using
 * the real API and the real UI, before any redesign work happens. Screenshots land in
 * gauntlet/v6/journey/proposals/S2/before-*.png. Fictional names only.
 */
test("S2 before-state screenshots", async ({ page, request }) => {
  test.setTimeout(120_000);
  const created = await createClass(request, "Ms. Alvarez — Period 3");
  const classCode = created.code;
  const teacherKey = createClassKeyFor(classCode);

  const marisol = await seatOnRoster(page, classCode, "1");
  const devon = await seatOnRoster(page, classCode, "2");

  // ---- (a) one assignment, not started ----
  await page.goto("/");
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await signIn(page, { classCode, ...marisol });
  await page.waitForSelector("h1");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "gauntlet/v6/journey/proposals/S2/before-a-not-started.png", fullPage: true });

  // ---- (b) one assignment, in progress: start a run, abandon mid-way ----
  await page.getByRole("link", { name: "Start" }).click();
  await page.waitForTimeout(800);
  await clickIfPresent(page, "Go in");
  await clickIfPresent(page, "Start this one");
  // Now on the first real decision screen of the run (setup comparison). Leaving it here,
  // without submitting anything, is the abandon-mid-way state the checkpoint records.
  await page.waitForTimeout(600);
  await page.goto("/home");
  await page.waitForSelector("h1");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "gauntlet/v6/journey/proposals/S2/before-b-in-progress.png", fullPage: true });

  // ---- (c) completed run with teacher feedback ----
  const built = buildSubmission({
    seatCode: devon.seatCode,
    closeOpeningInto: "goal",
    defenseText: "Seat 2: I kept the course money separate and covered the trip from what was left after Week 5.",
  });
  const devonToken = await signInHeadless(request, classCode, devon);
  const submitResp = await request.post(`${API}/classes/${classCode}/submissions`, {
    headers: { Authorization: `Bearer ${devonToken}` },
    data: {
      classCode,
      seatCode: built.seatCode,
      sessionId: built.sessionId,
      challengeId: built.challengeId,
      challengeVersion: built.challengeVersion,
      log: built.log,
    },
  });
  if (submitResp.status() !== 202) throw new Error(`submission failed: ${submitResp.status()} ${await submitResp.text()}`);

  const feedbackResp = await request.post(`${API}/classes/${classCode}/feedback`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
    data: {
      seatCode: devon.seatCode,
      sessionId: built.sessionId,
      body: "You covered the trip and the present without touching the course money — nice use of the reserve. Say a bit more next time about what you'd do differently if Week 3 hit before Week 5's paycheck.",
    },
  });
  if (feedbackResp.status() !== 201) throw new Error(`feedback failed: ${feedbackResp.status()} ${await feedbackResp.text()}`);

  await page.goto("/");
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await signIn(page, { classCode, ...devon });
  await page.waitForSelector("h1");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "gauntlet/v6/journey/proposals/S2/before-c-completed-feedback.png", fullPage: true });

  // ---- (d) no assignments ----
  // There is no reachable live path in this build that leaves a signed-in student with zero
  // classes (no DELETE /classes/:code endpoint, and joining always yields at least one class
  // entry). The render branch is real code (`classes.length === 0` in Home.tsx), so it is
  // reached here by mocking the one response that decides it, on a real signed-in session.
  await page.route("**/api/me/classes", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ classes: [] }) }));
  await page.goto("/home");
  await page.waitForSelector("h1");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "gauntlet/v6/journey/proposals/S2/before-d-no-assignments.png", fullPage: true });
});

async function clickIfPresent(page: import("@playwright/test").Page, name: string): Promise<boolean> {
  const loc = page.getByRole("button", { name }).first();
  if (await loc.count()) { await loc.click(); await page.waitForTimeout(600); return true; }
  return false;
}

async function signInHeadless(request: import("@playwright/test").APIRequestContext, classCode: string, card: { seatCode: string; joinCode: string }): Promise<string> {
  const joined = await request.post(`${API}/classes/${classCode}/join`, {
    data: { classCode, seatCode: card.seatCode, joinCode: card.joinCode, device: "shared" },
  });
  if (joined.status() !== 200) throw new Error(`join failed: ${joined.status()} ${await joined.text()}`);
  return ((await joined.json()) as { token: string }).token;
}
