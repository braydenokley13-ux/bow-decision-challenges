import { expect, test } from "@playwright/test";
import { createClass, API } from "./flow";

/**
 * The defect `RULING.md` §5 names: an open class (no roster — the default for a class nobody
 * has pasted a list into yet, `joinModeOf` in `server/identity.ts`) mints a join code once and
 * used to throw it away. A shared-device session dies in ten hours with no refresh route, so a
 * student back the next day had no way in but retyping their name — a second seat, a second
 * account, an empty board under the first one's work.
 *
 * This drives the real door in a real browser against the real class service: the code is
 * shown once, at the moment it is issued, and the same browser gets back into the *same*
 * account on it after the token that would otherwise prove that dies.
 */

test("an open-class student is shown their code once and gets back into the same account after their session dies", async ({ page }) => {
  const created = await createClass(page.request, "Open class return");

  await page.goto("/join");
  await page.getByLabel("Class code").fill(created.code);
  await page.getByRole("button", { name: "Next" }).click();

  // No roster on this class — the name box, not a card.
  await page.getByLabel("Name").fill("Priya");
  await page.getByRole("button", { name: "Go in" }).click();

  // Handed back exactly once, and not glossed over.
  await expect(page.getByRole("heading", { name: "Write this code down." })).toBeVisible();
  const code = (await page.locator(".class-created__code strong").innerText()).trim();
  expect(code.length).toBeGreaterThanOrEqual(4);

  await page.getByRole("button", { name: "I’ve written it down" }).click();
  await expect(page.locator(".student-home__bar")).toContainText("Priya");

  // The session dies (ten hours on a shared device; nothing renews it) without the browser
  // being touched otherwise — the same thing `forgetStudent()` does on a dead-session redirect.
  await page.evaluate(() => window.localStorage.removeItem("bow.student.v1.token"));

  await page.goto("/join");
  await page.getByLabel("Class code").fill(created.code);
  await page.getByRole("button", { name: "Next" }).click();

  // Recognised, but asked rather than assumed.
  await expect(page.getByRole("heading", { name: "Have you signed in here before?" })).toBeVisible();
  await expect(page.getByLabel("Your code")).toHaveCount(0);

  await page.getByRole("button", { name: "Yes — that was me" }).click();
  await expect(page.getByLabel("Your code")).toHaveValue(code);
  await page.getByRole("button", { name: "Go in" }).click();

  // Back as Priya — not a second, empty seat.
  await expect(page.locator(".student-home__bar")).toContainText("Priya");

  const roster = await page.request.get(`${API}/classes/${created.code}/roster`, {
    headers: { "X-BOW-Teacher-Key": created.teacherKey },
  });
  const rows = ((await roster.json()) as { roster: { displayName: string }[] }).roster;
  expect(rows.filter((row) => row.displayName === "Priya")).toHaveLength(1);
});
