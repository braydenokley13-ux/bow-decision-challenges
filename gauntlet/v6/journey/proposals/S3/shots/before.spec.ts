import { test, expect } from "@playwright/test";
import {
  createClass, createClassKeyFor, seatOnRoster, signIn,
  startIfConfirmAsked, chooseSeasonIfOffered, stepPastTheDeal, API,
} from "../../../../../../e2e/flow";
import { buildSubmission } from "../../../../../../src/test/runChallenge";

/**
 * S3 "before" walkthrough: the student home as it is today, in the four states the brief
 * names. Screenshots only — no assertions beyond the ones the shared helpers already make.
 */

const OUT = "gauntlet/v6/journey/proposals/S3";

test("student home, four states, as-is", async ({ page, request }) => {
  const created = await createClass(request, "Ms. Alvarez — Period 3");
  const code = created.code;

  // (a) one assignment, not started -------------------------------------------------------
  const card1 = await seatOnRoster(page, code, "1");
  await signIn(page, { ...card1, classCode: code });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/before-a-not-started.png`, fullPage: true });

  // (b) in progress: start a run, abandon it mid-way --------------------------------------
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  // We are somewhere inside the setup stage now; give the checkpoint a beat to land.
  await page.waitForTimeout(1500);
  await page.goto("/home");
  await expect(page.locator(".student-home__bar")).toContainText(card1.displayName);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/before-b-in-progress.png`, fullPage: true });

  // (c) completed run with teacher feedback, as a second student --------------------------
  // Card captured at creation — the roster listing never repeats a join code — and the run
  // seeded inline the way `seedRuns` does it, so this test can keep the card to sign in with.
  const card2 = await seatOnRoster(page, code, "2");
  const key = createClassKeyFor(code);
  const joined = await request.post(`${API}/classes/${code}/join`, {
    data: { classCode: code, seatCode: card2.seatCode, joinCode: card2.joinCode, device: "shared" },
  });
  expect(joined.status(), await joined.text()).toBe(200);
  const token = ((await joined.json()) as { token: string }).token;
  const built = buildSubmission({
    seatCode: "2",
    defenseText: "I kept the course money where it was and gave up part of the reserve after Week 5.",
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
  const done = { seatCode: "2", sessionId: built.sessionId };
  const fb = await request.post(`${API}/classes/${code}/feedback`, {
    headers: { "X-BOW-Teacher-Key": key },
    data: {
      seatCode: "2",
      sessionId: done.sessionId,
      body: "You kept the course deposit safe even when Week 5 hit — that was the decision that mattered. Next run, look at what counting the attendance bonus would have done to your cushion.",
    },
  });
  expect(fb.status(), await fb.text()).toBe(201);

  // Hand the device over: sign out, sign in as student 2 through the real door.
  await page.getByRole("button", { name: "Not you?" }).click();
  await page.getByLabel("Class code").fill(code);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Your code").fill(card2.joinCode);
  await page.getByRole("button", { name: "Go in" }).click();
  await expect(page.locator(".student-home__bar")).toContainText("Test Student 2");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/before-c-completed-feedback.png`, fullPage: true });

  // (d) no assignments --------------------------------------------------------------------
  // Not reachable through the real door (signing in requires a class), so render the empty
  // state the component actually has by answering /me/classes with nothing.
  await page.route("**/api/me/classes", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ classes: [] }) }),
  );
  await page.goto("/home");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/before-d-no-assignments.png`, fullPage: true });
});
