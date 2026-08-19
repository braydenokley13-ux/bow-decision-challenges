import { expect, test } from "@playwright/test";
import {
  completeSetupStage,
  completeWorkingCalcs,
  createClass,
  enterChallenge,
  gotoFreshChallenge,
  noHorizontalOverflow,
  passWeek5Calculation,
  playSeasonWeeks,
} from "./flow";
import { savePlan, week5TotalFor, type PlanContext } from "./plan";

/**
 * The Week 5 board at the width WCAG 1.4.10 is actually written against.
 *
 * The suite's narrow project is 360, and this defect lived in the forty pixels between that
 * and 320. Measured on a 320-wide window with `getBoundingClientRect`, on the one screen of
 * the run a student cannot skip:
 *
 *   button.choice-row__action   left 43   width 297   right 340   — 20px past the window
 *   footer.plan-commit          left 12               right 308
 *     p.plan-commit__read       left 296              right 540   — 220px past
 *     div.plan-commit__actions  left 296              right 540   — with "Save it, $1,000
 *                                                                   still missing" in it
 *
 * Two separate causes on one bar. The shortcut's label is a whole sentence and was `nowrap`
 * at every width; and `.plan-commit` is a *wrapping* flex container that `app.css` turns into
 * a column below 760px, so `.plan-commit__refusal`'s `flex-basis: 100%` — full width in a row,
 * full **height** in a column — took the whole bar and pushed everything else into a second
 * column off the side of the screen.
 *
 * Both are invisible to every other check in the suite: the document scrolls sideways, which
 * no assertion made at 360 or wider can see, and the refusal line only exists while a plan
 * does not balance, which is the state the Week 5 board opens in and the state the other
 * walkthroughs pass through without stopping.
 */
test.use({ viewport: { width: 320, height: 740 } });

test("@reflow the Week 5 board fits a 320px window while it is still short", async ({ page, request }) => {
  const { code } = await createClass(request, "Week 5 at 320");
  const plan: PlanContext = { setupId: "cousin-room" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode: code });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", plan);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(plan)));

  // The board as it opens is already short by the whole of Week 5, and one press of the
  // commit button is what puts the refusal line into the bar — which is the state that
  // overflowed, and the state a student meets by trying to save before they have cut
  // anything. Nothing is edited here on purpose.
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: /check this plan|lock in what Avery gives up/i }).click();
  await expect(page.locator(".plan-commit__refusal")).toBeVisible();
  await noHorizontalOverflow(page);

  // And the bar's own children inside the window, because a page that does not scroll can
  // still be hiding a button under the right-hand edge of a container that does.
  const room = await page.evaluate(() => document.documentElement.clientWidth);
  const spilling = await page.evaluate(() => {
    const out: { part: string; right: number }[] = [];
    document.querySelectorAll<HTMLElement>(".plan-commit > *, .choice-row__action").forEach((part) => {
      const box = part.getBoundingClientRect();
      out.push({ part: part.className || part.tagName.toLowerCase(), right: Math.round(box.right) });
    });
    return out;
  });
  expect(spilling.length, "the commit bar and the row shortcuts were not on screen").toBeGreaterThan(0);
  for (const part of spilling) {
    expect(part.right, `${part.part} reaches ${part.right - room}px past a ${room}px window`).toBeLessThanOrEqual(room);
  }
});
