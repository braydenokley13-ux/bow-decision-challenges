import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  chooseSeasonIfOffered, completeSetupStage, completeWorkingCalcs, createClass,
  seatOnRoster, signIn, startIfConfirmAsked, stepPastTheDeal,
} from "./flow";

/**
 * The reading help is not allowed to hide the run it is helping with.
 *
 * Two measurements, both from an accessibility audit that drove the product with no mouse,
 * and neither of them visible to axe or to the overflow check next door — the page does not
 * scroll sideways on either, and every rule passes.
 *
 * **WCAG 2.2 · 2.4.11 Focus Not Obscured (Minimum).** With the tools open at 320×640, walking
 * the tab ring found `button "Check this plan"` — the control that commits the run's biggest
 * decision — under `aside.plan-rail` at 0 of 25 sample points. Turning the accommodation on is
 * what did it: below 980px the money rail is stuck to the bottom edge, `reading.css` lifts it
 * clear of the opened panel, and it lands on whatever was underneath.
 *
 * **And the closed pill, which is not a focus problem at all.** `.reading-tools` is a fixed box
 * up to 340px wide holding a 146px pill, and the empty part of it was swallowing taps: at 320
 * and at 360, `document.elementFromPoint` at the centre of *See where the money goes* answered
 * `aside.reading-tools`. A finger on the money breakdown opened the reading tools instead.
 * Keyboard users never saw this, which is why it survived a keyboard-only audit as a separate
 * finding, and it lands on exactly the two populations the narrow width is about — a student
 * holding a phone, and a student at 400% zoom.
 *
 * Both are geometry, so both have to be measured in a browser; jsdom has no layout to ask.
 * Tagged `@reflow` so this runs in the narrow project rather than three times over.
 */

/** The tab ring, and how much of each focused control is actually painted where it is. */
async function entirelyHiddenStops(page: Page, steps = 40): Promise<string[]> {
  const hidden: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      // Twenty-five points inside the control, asking what is painted at each. A control that
      // is merely near something fixed is fine; one that returns something else everywhere is
      // the thing 2.4.11 forbids.
      let visible = 0, sampled = 0;
      for (let x = 0.1; x < 1; x += 0.2) {
        for (let y = 0.1; y < 1; y += 0.2) {
          const px = rect.left + rect.width * x, py = rect.top + rect.height * y;
          if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) continue;
          sampled += 1;
          const hit = document.elementFromPoint(px, py);
          if (hit === el || el.contains(hit) || (hit && hit.contains(el))) visible += 1;
        }
      }
      if (sampled === 0 || visible > 0) return null;
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
      const over = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return `"${name}" is entirely hidden under ${over?.tagName.toLowerCase() ?? "?"}.${(over?.className ?? "").toString().split(/\s+/)[0] ?? ""} (0 of ${sampled} points)`;
    });
    if (stop && !hidden.includes(stop)) hidden.push(stop);
  }
  return hidden;
}

/** Every control something else is painted over, at its own centre — what a finger finds. */
async function controlsUnderSomethingElse(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll("button, a[href], summary, input").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return;
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      out.push(`"${name}" is under ${hit.tagName.toLowerCase()}.${(hit.className ?? "").toString().split(/\s+/)[0] ?? ""}`);
    });
    return out;
  });
}

/** A run standing on the opening plan board, which is where both rails are on screen at once. */
async function reachThePlanBoard(page: Page, classCode: string, joinCode: string, seatCode: string, displayName: string) {
  await signIn(page, { classCode, joinCode, seatCode, displayName });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await expect(page.getByRole("button", { name: "Check this plan" })).toBeVisible();
}

/**
 * 320 x 640 whatever width this project runs at: 320 CSS pixels is a school phone, and it is
 * also what a 1280px laptop gives at 400% browser zoom — the condition WCAG 1.4.10 is written
 * against and the one a student who needs large text actually meets. The rail only reaches the
 * commit button in a window short enough to hold both.
 */
async function onThePlanBoardAt320(page: Page, request: APIRequestContext, label: string) {
  await page.setViewportSize({ width: 320, height: 640 });
  const created = await createClass(request, label);
  const card = await seatOnRoster(page, created.code, "1");
  await reachThePlanBoard(page, created.code, card.joinCode, card.seatCode, card.displayName);
}

test("@reflow a tap on the money rail's own control does not open the reading tools", async ({ page, request }) => {
  test.setTimeout(240_000);
  await onThePlanBoardAt320(page, request, "Reading pill tap");

  // Tools closed, which is every student who has not asked for help. The money rail's control
  // is the one that meets the pill, because below 980px the two are pinned to the same corner.
  const stolen = (await controlsUnderSomethingElse(page)).filter((row) => row.includes("reading-tools"));
  expect(stolen, "controls whose own centre opens the reading tools instead").toEqual([]);
});

test("@reflow opening the reading tools hides no control the student can focus", async ({ page, request }) => {
  test.setTimeout(240_000);
  await onThePlanBoardAt320(page, request, "Focus not obscured");

  await page.getByRole("button", { name: "Reading help" }).click();
  await expect(page.locator(".reading-tools[data-open='true']")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  expect(await entirelyHiddenStops(page), "focused controls entirely hidden with the reading tools open").toEqual([]);
});
