import { expect, test, type Page } from "@playwright/test";
import { CODE_ALPHABET, CODE_LENGTH } from "../src/platform/classes/codes";
import {
  API,
  completeWorkingCalcs,
  createClass,
  enterChallenge,
  gotoFreshChallenge,
  playSeasonWeeks,
  passWeek5Calculation,
  rankPlacesCorrectly,
  seatOnRoster,
  signIn,
  SETUP_ORDER,
  SETUP_TITLES,
} from "./flow";
import { NUMBERS as N, fillPlanToBalance, saveOpeningPlan, savePlan, week5TotalFor, type PlanContext } from "./plan";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS } from "../src/domain/scenario/worlds/food-truck/numbers";
import { owedUpFront } from "../src/domain/scenario/worlds/food-truck/economy";

/**
 * What is actually on the screen, in pixels, at the size this product is used at.
 *
 * A world-class review played the whole product at 1366×768 and returned NO-GO, with this as
 * the finding: *"every one of the decisive faults is something you find by looking at the
 * screen, and none of them has been found — this product has been written and tested with
 * great care and never actually watched."* It was not exaggerating about the tests. The suite
 * it ran against had 1423 passing unit tests and zero axe violations across sixty-seven
 * screens, and none of them saw:
 *
 * - a **class code 442px wide inside a 300px card**, `overflow: visible`, so the last one and a
 *   half characters were painted in white on a cream page and `U3C6N` read as `U3C`. Every
 *   assertion about that screen asked the DOM whether the code was *there*. It was there. It
 *   was 190px outside the navy.
 * - **the question scrolling behind the header at the moment it is asked**: answering *Which
 *   place costs the least?* put the new headline at `top: -11px` under a 72px pinned bar.
 * - **the primary control below the fold with nothing saying so**: *Build the plan* at
 *   `top: 838` in a 768px window; *Check this plan* at `top: 1459` on the safety check.
 * - **an arrival focus ring on a plain page load**, on every route, with no keyboard anywhere
 *   near it.
 *
 * Every one of those is a number `getBoundingClientRect()` will hand you and no query of the
 * DOM will. So the assertions here are geometric, and they are the ones the defects would have
 * failed: does the text fit the box drawn for it, is the question above the fold when it is
 * asked, is the way on inside the window, and is the ring drawn only when a person used a
 * keyboard to get here.
 *
 * The project viewport is the size the product is used at — 1366×768 on a school Chromebook,
 * and 1024×600 on the older one — which is where the review measured every one of its findings.
 * Two of these set a viewport of their own and say why: the class code is checked at three
 * widths including 360, and the teacher's pages are checked at 320, which is what a 1280px
 * laptop gives a teacher at 400% zoom.
 */

/** Chrome rounds sub-pixel geometry, and a glyph may sit a hair inside its own advance. */
const HAIR = 1;

/**
 * Where the pinned bar ends, in viewport coordinates. Both shells pin one, both are 72px at
 * this width, and it is read rather than written down because it is the number the whole
 * "is the question visible" question turns on.
 */
async function pinnedBarBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    const bar = document.querySelector(".challenge-topbar, .popup-topbar, .educator-topbar");
    return bar ? Math.round(bar.getBoundingClientRect().bottom) : 0;
  });
}

/**
 * The screen as a person meets it: where the question is, and where the way on is.
 *
 * `action` is whichever bar the stage is offering — the neutral instruction bar, or the plan
 * board's own verdict-and-commit footer. A stage has one or the other and never both.
 */
async function screenGeometry(page: Page) {
  return page.evaluate(() => {
    const round = (value: number) => Math.round(value);
    const heading = document.querySelector("main h1");
    const action = document.querySelector(".stage-action, .plan-commit, .popup-action, .popup-commit");
    const box = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { top: round(rect.top), bottom: round(rect.bottom), height: round(rect.height) };
    };
    return {
      title: heading?.textContent?.trim() ?? "",
      heading: box(heading),
      action: box(action),
      viewport: window.innerHeight,
      documentHeight: round(document.documentElement.scrollHeight),
      scrollY: round(window.scrollY),
    };
  });
}

/**
 * The two promises a screen makes to the person in front of it, watched across a whole run.
 *
 * **A question the student has not been asked before is on the screen when it is asked.** The
 * headline is checked on the change, which is the moment the defect happens and the only
 * moment the rule means anything: a student who scrolls down to work inside a screen they have
 * already read is not owed its headline, and a screen that pushed its own new question behind
 * the header is the thing that was found five times.
 *
 * **The way on is in the window, always.** Whatever bar the stage is offering — the neutral
 * instruction bar, the plan board's verdict-and-commit footer — is inside the viewport at
 * every step, not only on arrival.
 */
function watchTheScreen(page: Page) {
  let asked = "";
  return async (where: string) => {
    // The scroll a screen performs on arrival is animated, so this waits for it to settle
    // rather than measuring the middle of it.
    await page.waitForTimeout(600);
    const bar = await pinnedBarBottom(page);
    const seen = await screenGeometry(page);
    if (seen.title !== asked) {
      expect(
        seen.heading?.top ?? -1,
        `${where}: the question "${seen.title}" arrives at top ${seen.heading?.top} with a ${bar}px pinned bar over `
        + "it — a student cannot read the question they are being asked",
      ).toBeGreaterThanOrEqual(bar);
      asked = seen.title;
    }
    if (seen.action) {
      expect(
        seen.action.bottom,
        `${where}: the way on sits at ${seen.action.top}-${seen.action.bottom} in a ${seen.viewport}px window `
        + `on a ${seen.documentHeight}px page — the student is looking at a screen with no next step on it`,
      ).toBeLessThanOrEqual(seen.viewport + HAIR);
    }
    return seen;
  };
}

test.describe("what is actually on the screen", () => {
  /**
   * The class code fits the card built to project it.
   *
   * This is the artifact the whole product turns on: the string a teacher reads to a room of
   * thirty and the string every one of them types. It is checked three ways, because the
   * defect passed two weaker checks already — the code was in the DOM, and the page had no
   * horizontal scrollbar, because a `position: static` child overflowing a card with
   * `overflow: visible` produces neither.
   *
   * The third way is the one that sees it: every character, one range at a time, against the
   * navy it is supposed to be printed on.
   */
  test("the class code fits the card a room reads it off", async ({ page, request }) => {
    const created = await createClass(request, "Period 3 · Grade 7");
    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
    await expect(page.locator(".class-created__code strong")).toHaveText(created.code);

    const measure = await page.evaluate(() => {
      const plate = document.querySelector(".class-created__code")!;
      const code = plate.querySelector("strong")!;
      const plateBox = plate.getBoundingClientRect();
      const plateStyle = getComputedStyle(plate);
      const tracking = parseFloat(getComputedStyle(code).letterSpacing) || 0;
      const text = code.firstChild!;
      const characters = [...(code.textContent ?? "")].map((character, index) => {
        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        const rect = range.getBoundingClientRect();
        // The advance of a character includes the letter-space that follows it, which is
        // empty. The glyph ends where the advance ends minus that.
        return { character, left: rect.left, right: rect.right - tracking };
      });
      return {
        characters,
        plate: { left: plateBox.left, right: plateBox.right, width: Math.round(plateBox.width) },
        padding: { left: parseFloat(plateStyle.paddingLeft), right: parseFloat(plateStyle.paddingRight) },
        overflowsItsOwnBox: plate.scrollWidth - plate.clientWidth,
        fontSize: getComputedStyle(code).fontSize,
      };
    });

    // 1. Nothing is painted outside the navy. This is the defect in its own words: the last
    //    characters of the code were rendered white-on-cream, outside the card.
    for (const { character, left, right } of measure.characters) {
      expect(
        right,
        `"${character}" of ${created.code} is painted ${Math.round(right - measure.plate.right)}px past the right edge of `
        + `the ${measure.plate.width}px card, in white, on a cream page`,
      ).toBeLessThanOrEqual(measure.plate.right + HAIR);
      expect(character && left).toBeGreaterThanOrEqual(measure.plate.left - HAIR);
    }

    // 2. And it respects the padding it was given, so the card reads as a card rather than as
    //    a code touching an edge.
    const inner = { left: measure.plate.left + measure.padding.left, right: measure.plate.right - measure.padding.right };
    expect(measure.characters.at(-1)!.right).toBeLessThanOrEqual(inner.right + HAIR);
    expect(measure.characters[0].left).toBeGreaterThanOrEqual(inner.left - HAIR);

    // 3. The box itself says so: a child overflowing its parent shows up as scrollable width
    //    the parent never asked for. One number, and it was 190 when this was written.
    expect(measure.overflowsItsOwnBox, `the code overflows its card by ${measure.overflowsItsOwnBox}px`).toBeLessThanOrEqual(HAIR);
  });

  /**
   * …and it fits for every code the service can allocate, not for the one this run happened
   * to get.
   *
   * `CODE_ALPHABET` contains M and W. A code of five of those is half again as wide as a code
   * of five 4s, so a card sized by eye off one lucky allocation is a card that clips one class
   * in five. The alphabet is read from the module that allocates from it, so a letter added
   * there is covered here without anybody remembering to come back.
   */
  test("the class code fits for every code the alphabet can allocate", async ({ page, request }) => {
    const created = await createClass(request, "Every code");
    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
    await expect(page.locator(".class-created__code strong")).toHaveText(created.code);

    for (const width of [1366, 1024, 360]) {
      await page.setViewportSize({ width, height: 768 });
      const worst = await page.evaluate(({ alphabet, length }) => {
        const plate = document.querySelector<HTMLElement>(".class-created__code")!;
        const code = plate.querySelector("strong")!;
        const original = code.textContent ?? "";
        const results: { code: string; overflow: number; document: number }[] = [];
        for (const character of alphabet) {
          code.textContent = character.repeat(length);
          results.push({
            code: code.textContent,
            overflow: plate.scrollWidth - plate.clientWidth,
            document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          });
        }
        code.textContent = original;
        return results;
      }, { alphabet: CODE_ALPHABET, length: CODE_LENGTH });

      const clipped = worst.filter((entry) => entry.overflow > HAIR);
      expect(
        clipped.map((entry) => `${entry.code} overflows its card by ${entry.overflow}px`),
        `at ${width}px wide`,
      ).toEqual([]);
      const sideways = worst.filter((entry) => entry.document > HAIR);
      expect(sideways.map((entry) => `${entry.code} pushes the page ${entry.document}px sideways`), `at ${width}px wide`).toEqual([]);
    }
  });

  /**
   * The question is on screen at the moment it is asked, and the way on is in the window.
   *
   * Walked rather than jumped to, because both faults are things that happen *between*
   * screens: one is a scroll the arriving screen did not win, and the other is a page that is
   * two windows tall with its only control at the bottom of the second.
   */
  test("every beat of the run asks its question above the fold and keeps the way on in the window", async ({ page, request }) => {
    const created = await createClass(request, "Above the fold");
    const onScreen = watchTheScreen(page);
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode: created.code });
    await onScreen("the ranking");

    // The turn inside one stage: same stage id, new headline. This is where the review
    // measured `top: -11px`.
    await rankPlacesCorrectly(page);
    const housing = await onScreen("after the ranking is accepted");
    expect(housing.title).toBe("Now pick where Avery lives.");

    await page.locator(".place-card").nth(2).getByRole("button", { name: "Choose this setup" }).click();
    await onScreen("after a place is chosen");
    await page.getByLabel(`What the ${SETUP_TITLES[SETUP_ORDER[2]]} costs Avery`).fill(String(N.setupCosts[SETUP_ORDER[2]]));
    await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
    // The eight-week total is right, so "Build the plan" appears. The review found it at 838.
    await page.waitForTimeout(600);
    const built = await screenGeometry(page);
    expect(
      built.action?.bottom ?? 0,
      `"Build the plan" sits at ${built.action?.top} in a ${built.viewport}px window`,
    ).toBeLessThanOrEqual(built.viewport + HAIR);

    await page.getByRole("button", { name: "Build the plan" }).click();
    await onScreen("the plan board");
    await completeWorkingCalcs(page, { attendance: true, showcase: true });
    await onScreen("the allocation");

    const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
    await fillPlanToBalance(page, "working", context);
    await saveOpeningPlan(page);
    await onScreen("the safety check");

    await savePlan(page, "fallback", context);
    await onScreen("the season");
    await playSeasonWeeks(page);
    await onScreen("Week 5");
    await passWeek5Calculation(page, String(week5TotalFor(context)));
    await onScreen("the triage");
    await savePlan(page, "week5-first-response", context);
    await onScreen("the two calls");
  });

  /**
   * The same promise on the market's side, which is where the review stopped: it played the
   * pop-up through its conditional-income screen and said so rather than implying otherwise.
   * Everything after that had never been watched by anybody.
   *
   * Only the question is asserted here, and that is a statement about what is fixed rather
   * than about what matters. The market's own action bars are direct children of
   * `.popup-main`, which is a grid, and a sticky box can only travel inside its containing
   * block — for a grid item that is its own grid area, which is exactly its own height. So
   * *Take a booth to carry on* is still at `top: 1370` in a 768px window, and the fix is one
   * rule and one word in `design/worlds.css`, which this change does not own.
   */
  test("the market asks its questions above the fold too", async ({ page, request }) => {
    const created = await createClass(request, "Market fold");
    const response = await request.post(`${API}/classes/${created.code}/assignments`, {
      headers: { "X-BOW-Teacher-Key": created.teacherKey },
      data: { objectiveRef: null, allowedWorldIds: ["food-truck"], studentChoosesWorld: false },
    });
    expect(response.status(), await response.text()).toBe(201);

    const onScreen = watchTheScreen(page);
    const card = await seatOnRoster(page, created.code, "3");
    await gotoFreshChallenge(page);
    await signIn(page, { ...card, classCode: created.code });
    await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
    await expect(page.getByRole("heading", { name: POP_UP_SCENARIO.screens.spot.title })).toBeVisible();
    await onScreen("the market opening");

    // The booth is taken, the sum it owes appears under it, and the sum is answered. The
    // review measured this screen's CTA at `top: 854` and its input at 732, and stopped four
    // screens later; everything after that had never been watched by anybody.
    const booth = POP_UP_SCENARIO.spots[0];
    await page.getByRole("button", { name: `${POP_UP_SCENARIO.screens.spot.take}: ${booth.title}` }).click();
    await onScreen("after a booth is taken");
    await page.getByLabel(POP_UP_SCENARIO.screens.spot.owed.label).fill(String(owedUpFront(POP_UP_NUMBERS, booth.id)));
    await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
    await onScreen("the sum the booth owes, answered");
    await page.getByRole("button", { name: POP_UP_SCENARIO.screens.spot.action }).click();
    await onScreen("the money with a rule on it");
  });

  /**
   * The teacher's pages at 320px, which is what a 1280px laptop gives a teacher at the 400%
   * zoom WCAG 1.4.10 is written against.
   *
   * Three two-column grids starved their first track instead of stacking, and the cause is
   * worth naming because it is invisible to every other kind of check: the narrow rules for
   * two of them existed and were written *above* the base rules they override. A media query
   * adds no specificity, so the later declaration won and the narrow layout never happened.
   * Measured before: `.page-header--split` resolved to `0px 236px` — the page's own `<h1>` in a
   * zero-width column, rendering as one or two letters per line — `.judgement` to `83px 120px`
   * with 84 runs of text under 90px wide on one page, and `.rubric-row`, which is the rubric a
   * teacher marks writing against, to `0px 206px`.
   *
   * The document never scrolls sideways in any of those states, which is why every overflow
   * check in this suite passed over them. What sees it is the width of the box the text is in.
   */
  test("the teacher's pages reflow at 320px instead of starving a column", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const route of ["/educator/class/DEMO", "/educator/class/DEMO/reading", "/educator/class/DEMO/students/1"]) {
      await page.goto(route);
      // Attached rather than visible: a heading laid out in a zero-width column is not
      // "visible" to Playwright either, and the number is the finding — so let the width
      // assertion below be the one that fails, with the width in the message.
      await expect(page.locator("main h1")).toBeAttached();
      await page.waitForTimeout(400);
      const seen = await page.evaluate(() => {
        // The used value, and only for boxes that are actually laid out: an element with no
        // width — a panel this page is not showing — reports the specified value instead, and
        // `minmax(0px, 1fr)` is one track however many spaces it contains.
        const trackCount = (value: string) => {
          let depth = 0;
          let count = 1;
          for (const character of value) {
            if (character === "(") depth += 1;
            else if (character === ")") depth -= 1;
            else if (character === " " && depth === 0) count += 1;
          }
          return value.trim() === "none" ? 0 : count;
        };
        const tracks = (selector: string) => [...document.querySelectorAll(selector)]
          .filter((element) => getComputedStyle(element).display.includes("grid") && element.getBoundingClientRect().width > 0)
          .map((element) => getComputedStyle(element).gridTemplateColumns);
        const heading = document.querySelector("main h1")!.getBoundingClientRect();
        // Text set in a box narrower than about eleven characters is the symptom a reader
        // meets. The wordmark is exempt — it is two words in a top bar that deliberately wraps
        // at this width — and so are table cells, which live in a container that scrolls.
        const squeezed: string[] = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walk.nextNode())) {
          const text = (node.textContent ?? "").trim();
          const element = node.parentElement;
          if (text.length < 8 || !element) continue;
          if (element.closest(".app-mark, table")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const box = range.getBoundingClientRect();
          if (box.width > 0 && box.width < 90 && box.height > 40) {
            squeezed.push(`${Math.round(box.width)}x${Math.round(box.height)} "${text.slice(0, 40)}"`);
          }
        }
        const columns = (selector: string) => tracks(selector).map((value) => ({ value, count: trackCount(value) }));
        return {
          headingWidth: Math.round(heading.width),
          columns: {
            header: columns(".page-header--split"),
            judgement: columns(".judgement"),
            rubric: columns(".rubric-row"),
            trail: columns(".trail > li"),
          },
          squeezed,
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(seen.headingWidth, `${route}: the page's own heading is ${seen.headingWidth}px wide at 320`).toBeGreaterThan(200);
      for (const [what, found] of Object.entries(seen.columns)) {
        for (const grid of found) {
          expect(grid.count, `${route}: ${what} is still more than one column at 320 (${grid.value})`).toBe(1);
        }
      }
      expect(seen.squeezed, `${route}: text set in a column too narrow to read`).toEqual([]);
      expect(seen.sideways, `${route}: the page scrolls sideways at 320`).toBeLessThanOrEqual(HAIR);
    }
  });

  /**
   * The arrival ring: off when nobody has touched the page, on when a keyboard brought you.
   *
   * Focus itself is not in question — it moves to the heading on every route on purpose, so
   * that a screen reader says which page arrived, and this test asserts that it still does.
   * What is in question is the 3px box Chromium paints around it on a plain load, which is
   * what a reviewer photographed on five separate screens.
   */
  test("the arrival ring is drawn for a keyboard and not for a plain page load", async ({ page }) => {
    const ring = () => page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return null;
      const marked = (element: Element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      };
      const inside = active.querySelector("h1");
      return {
        tag: active.tagName,
        isHeading: active.tagName === "H1" || Boolean(inside),
        drawn: marked(active) || Boolean(inside && marked(inside)),
      };
    });

    // A plain load. Nothing has been clicked, nothing has been typed.
    await page.goto("/educator/classes");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const onLoad = await ring();
    expect(onLoad?.isHeading, "the page still announces itself by moving focus to its heading").toBe(true);
    expect(onLoad?.drawn, "a page nobody has touched is drawing a focus ring around its headline").toBe(false);

    // A route change reached with the keyboard. The ring is the only thing telling this
    // person where they now are, so it has to be there.
    await page.keyboard.press("Tab");
    await page.getByRole("link", { name: "Guide" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/educator\/guide$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const afterKeyboard = await ring();
    expect(afterKeyboard?.isHeading, "the arriving page moves focus to its heading").toBe(true);
    expect(afterKeyboard?.drawn, "a keyboard user was moved to a heading with nothing marking where they are").toBe(true);
  });
});
