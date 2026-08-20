import { expect, test } from "@playwright/test";
import {
  API, chooseSeasonIfOffered, createClass, createClassKeyFor, gotoFreshChallenge, seatOnRoster, signIn, startIfConfirmAsked,
} from "./flow";

/**
 * The identity model, proved in a browser rather than described.
 *
 * The brief's list of behaviours-that-must-be-proven is long, and most of it is already held
 * where it is cheapest to hold: `platform/identity/service.test.ts` drives the real handler
 * through wrong codes, reissued cards, deleted students, expired classes and roster
 * enumeration without paying for a browser, and `student/sharedDevice.test.tsx` holds the rule
 * about whose work survives a sign-in. What is left over — and what is here — is the set of
 * failures that **only exist in a browser**: a session that lives in one machine's storage, a
 * back button, a page that decides on its own whether to end somebody's session, and a screen
 * that has to say whose it is on a cart of thirty identical Chromebooks.
 *
 * Each test is the cheapest thing that would actually catch the failure it names.
 */

test("a cart Chromebook belongs to whoever is signed in now, and the back button does not undo that", async ({ page, request }) => {
  test.setTimeout(180_000);
  const created = await createClass(request, "Period 3");
  const classCode = created.code;
  const first = await seatOnRoster(page, classCode, "1");
  const second = await seatOnRoster(page, classCode, "2");

  // The first student signs in and gets far enough into a run to have something to lose.
  await gotoFreshChallenge(page);
  await signIn(page, { ...first, classCode });
  const checkpointed = page.waitForResponse((response) =>
    response.url().includes("/me/attempt") && response.request().method() === "PUT" && response.status() === 200);
  await page.getByRole("link", { name: "Start" }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await expect(page.locator(".challenge-shell")).toBeVisible();
  await checkpointed;

  // They hand the machine back. The way out says what it does, which is half of why it gets
  // pressed at all — this control used to read "Not you?" and nothing else.
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1, name: first.displayName })).toBeVisible();
  await page.getByRole("button", { name: "Not you? Sign out" }).click();
  await expect(page).toHaveURL(/\/join/);

  // The back button is the part a twelve-year-old actually tries. It must not reopen the last
  // student's screen, and `/home` typed straight into the bar must not either.
  await page.goBack();
  await expect(page.locator("body")).not.toContainText(first.displayName);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/join/);
  await expect(page.locator("body")).not.toContainText(first.displayName);

  // The next student is a different person, and gets their own screen: their name, and none of
  // the last one's work — not a warning about it, not an offer to carry it on.
  await signIn(page, { ...second, classCode });
  await expect(page.getByRole("heading", { level: 1, name: second.displayName })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(first.displayName);
  await expect(page.getByRole("link", { name: "Carry on" })).toHaveCount(0);
  await expect(page.locator(".work-chip__words")).toHaveText("Not started");
});

test("a session the service has ended finishes at the door and never on somebody else's screen", async ({ page, request }) => {
  test.setTimeout(120_000);
  const created = await createClass(request, "Period 3");
  const classCode = created.code;
  const card = await seatOnRoster(page, classCode, "1");
  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode });

  // The trolley control: thirty Chromebooks going back on the cart with thirty sessions open.
  const ended = await page.request.post(`${API}/classes/${classCode}/signout`, {
    headers: { "X-BOW-Teacher-Key": createClassKeyFor(classCode) },
  });
  expect(ended.status(), await ended.text()).toBe(200);

  await page.goto("/home");
  await expect(page).toHaveURL(/\/join/);
  await expect(page.getByLabel("Class code")).toBeVisible();
  // And the browser is not left holding a token it has been told is dead.
  expect(await page.evaluate(() => localStorage.getItem("bow.student.v1.token"))).toBeNull();
});

test("a card that does not match names nobody", async ({ page, request }) => {
  test.setTimeout(120_000);
  const created = await createClass(request, "Period 3");
  const classCode = created.code;
  const real = await seatOnRoster(page, classCode, "1");

  await gotoFreshChallenge(page);
  await page.goto("/join");
  await page.getByLabel("Class code").fill(classCode);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Your code").fill("ZZZZZZZZ");
  await page.getByRole("button", { name: "Go in" }).click();

  // Recoverable, and announced: the field is still there and the student can try again.
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Your code")).toBeVisible();
  // And the door has not published the class list on the way past. Not the name, and not the
  // seat that name sits on — a refusal that says "seat 1 is taken" is a roster with extra steps.
  await expect(page.locator("body")).not.toContainText(real.displayName);
  await expect(page.getByRole("link", { name: /^(Start|Carry on)$/ })).toHaveCount(0);

  // The real card still works, which is what makes the refusal above a refusal rather than a
  // broken door.
  await page.getByLabel("Your code").fill(real.joinCode);
  await page.getByRole("button", { name: "Go in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: real.displayName })).toBeVisible();
});

test("a network that drops is not a student who signed out", async ({ page, request }) => {
  test.setTimeout(120_000);
  const created = await createClass(request, "Period 3");
  const classCode = created.code;
  const card = await seatOnRoster(page, classCode, "1");
  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode });

  // School wifi, mid-lesson. This screen used to forget the student's session on *any* failure,
  // so two seconds of dead network sent a child back to the door to find their card again.
  await page.route("**/api/me/classes", (route) => route.abort());
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1, name: "Your class did not load." })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/almost always the wifi/);
  expect(await page.evaluate(() => localStorage.getItem("bow.student.v1.token"))).not.toBeNull();

  // And when it comes back, so does their work — without typing anything.
  await page.unroute("**/api/me/classes");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: card.displayName })).toBeVisible();
});

test("a run picked up on a genuinely different machine is the same run", async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const created = await createClass(request, "Period 3");
  const classCode = created.code;
  const card = await seatOnRoster(page, classCode, "1");

  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode });
  const checkpointed = page.waitForResponse((response) =>
    response.url().includes("/me/attempt") && response.request().method() === "PUT" && response.status() === 200);
  await page.getByRole("link", { name: "Start" }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await expect(page.locator(".challenge-shell")).toBeVisible();
  await checkpointed;
  await page.goto("/home");
  const said = await page.locator(".work-card__state").innerText();
  expect(said).toMatch(/^You stopped at .+\.$/);

  // Another machine: another browser context, nothing shared but the card in the student's hand.
  const elsewhere = await browser.newContext();
  const second = await elsewhere.newPage();
  try {
    await second.goto("/");
    await signIn(second, { ...card, classCode });
    // The same sentence, in the same words, on a machine that has never seen this run — which
    // is the whole of what "your run is saved with your class, not on this computer" promises.
    await expect(second.locator(".work-card__state")).toHaveText(said);
    await expect(second.getByRole("link", { name: "Carry on" })).toBeVisible();
    await expect(second.locator(".progress__step")).toContainText(/^Step \d+ of \d+$/);
  } finally {
    await elsewhere.close();
  }
});
