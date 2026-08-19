import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_CLASS_CODE, demoClassBundle } from "../src/fixtures/demoClass";
import { FRAMEWORKS, standardsIn } from "../src/domain/standards";
import { CONCEPTS } from "../src/domain/blueprint/concepts";

/**
 * The two things that make this one product rather than several sharing a palette.
 *
 * A product coherence critic walked every surface and found that "there is one palette and one
 * type family, and at the level of tokens the answer is genuinely yes. At the level of *pages*
 * it is no, and the evidence is measurable." Both halves of that evidence were computed values,
 * and neither is reachable without a browser:
 *
 * - **The mark rendered three ways**, one of them at 1.05:1 on `/join` — a navy letter on its
 *   own navy plate, on the one screen a twelve-year-old lands on with a code in their hand.
 *   Not one of the three was a decision: the plate took its colour from four inherited custom
 *   properties, and two bar rules of the form `.some-bar span` (0,1,1) out-specified
 *   `.app-mark__monogram` (0,1,0) and painted the letter in body ink. **A source scan can
 *   prove there is one rule for the mark. Only a computed value proves that rule wins.**
 * - **Four H1 left edges and four H1 treatments** across six sibling educator pages, because
 *   three of them brought their own header and one narrowed the page measure and moved the
 *   page with it. `getBoundingClientRect()` is the only thing that sees that.
 *
 * Neither test names a page or a colour it could be edited to agree with. The mark's colours
 * are read off the mark; the educator pages are read out of the route table, so a page added
 * next month is covered by a test written today rather than by somebody remembering.
 */

/**
 * WCAG 2.2 SC 1.4.3 Contrast (Minimum), normal text.
 *
 * A logotype is exempt from 1.4.3, so none of the three renderings was ever a conformance
 * failure and the axe sweep reported them as incomplete rather than as violations. The
 * requirement here is not conformance. It is that a child on a school Chromebook can see the
 * letter, and 4.5:1 is the number the standard uses for text a person has to read.
 */
const AA_NORMAL_TEXT = 4.5;

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([red, green, blue]: readonly [number, number, number]): number {
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function rgb(colour: string): readonly [number, number, number] {
  const parts = /rgba?\(([^)]+)\)/.exec(colour);
  if (!parts) throw new Error(`Not a computed colour: ${colour}`);
  const [red, green, blue] = parts[1].split(",").map((entry) => Number(entry.trim()));
  return [red, green, blue];
}

function contrast(front: string, behind: string): number {
  const [high, low] = [relativeLuminance(rgb(front)), relativeLuminance(rgb(behind))].sort((a, b) => b - a);
  return Number(((high + 0.05) / (low + 0.05)).toFixed(2));
}

/** The mark as it computes on whatever page is open: its own colours, and the ground under it. */
async function markOn(page: Page): Promise<{ glyph: string; plate: string; ground: string; wordmark: string; note: string }> {
  return page.locator(".app-mark").first().evaluate((mark) => {
    const monogram = mark.querySelector(".app-mark__monogram");
    if (!monogram) throw new Error("The mark has no monogram.");
    const opaqueGroundOf = (start: Element | null): string => {
      for (let node = start; node; node = node.parentElement) {
        const paint = getComputedStyle(node).backgroundColor;
        if (paint !== "rgba(0, 0, 0, 0)" && paint !== "transparent") return paint;
      }
      return "rgb(255, 255, 255)";
    };
    return {
      glyph: getComputedStyle(monogram).color,
      plate: getComputedStyle(monogram).backgroundColor,
      ground: opaqueGroundOf(mark.parentElement),
      wordmark: getComputedStyle(mark.querySelector("b")!).color,
      note: getComputedStyle(mark.querySelector("small")!).color,
    };
  });
}

/**
 * One page per distinct chrome that carries the mark: the front door, the two student bars,
 * the educator top bar, and the sample run's shell.
 *
 * Written out rather than derived, because `<AppMark />` sits in components and the mapping
 * from a component to a URL a browser can open is not something a regex can do honestly. What
 * keeps the list from going stale is that the assertion is about *sameness* — a sixth chrome
 * that repaints the mark and is not on this list still breaks every page that is, the moment
 * it does it through a shared rule. The one thing this list cannot catch is a new bar with a
 * `.new-bar span` rule of its own, which is why the mark's colours are now declared at a
 * specificity a bar cannot reach.
 */
const SURFACES_WITH_THE_MARK: readonly { name: string; path: string }[] = [
  { name: "the front door", path: "/" },
  { name: "the class-code door", path: "/join" },
  { name: "a student's own screen", path: "/home" },
  { name: "the educator guide", path: "/educator/guide" },
  { name: "my classes", path: "/educator/classes" },
  { name: "a class overview", path: `/educator/class/${DEMO_CLASS_CODE}` },
  { name: "a student's evidence", path: `/educator/class/${DEMO_CLASS_CODE}/students/1` },
  { name: "the debrief", path: `/educator/class/${DEMO_CLASS_CODE}/debrief` },
  { name: "try it as a student", path: "/educator/try" },
];

test.describe("one mark", () => {
  test("renders one way on every surface that carries it, and the letter is there", async ({ page }) => {
    // Nine full page loads in one test, against Playwright's thirty-second default. These
    // sweeps are the one shape in the suite that pays a navigation per assertion rather than
    // asserting several times on one screen, and they run beside another browser on four
    // cores — which is measuring the machine, exactly what the raised `expect` timeout in
    // `playwright.config.ts` exists to stop doing.
    test.setTimeout(120_000);
    const seen: { name: string; ground: string; mark: Awaited<ReturnType<typeof markOn>> }[] = [];

    for (const surface of SURFACES_WITH_THE_MARK) {
      await page.goto(surface.path);
      await expect(page.locator(".app-mark__monogram")).toBeVisible();
      const mark = await markOn(page);

      // The letter, on its own plate. This is the assertion that fails when a bar rule
      // repaints it — the exact shape of the bug, and one that changes nothing else.
      expect(
        contrast(mark.glyph, mark.plate),
        `${surface.name} (${surface.path}): the "B" is ${mark.glyph} on a ${mark.plate} plate`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

      seen.push({ name: surface.name, ground: mark.ground, mark });
    }

    // One rendering. Not "similar" — the same four computed colours, everywhere. Two marks on
    // the same cream ground, one an outlined cream plate with a navy letter and the other a
    // solid navy plate with a white one, is the finding this test exists to keep closed, and
    // no contrast threshold catches it: both of them cleared 4.5:1.
    // The four colours the mark paints for itself, and deliberately not `ground`. `ground` is
    // the page showing through behind the mark; it is *meant* to differ from surface to
    // surface, and the assertion at the foot of this test requires that it does. Comparing it
    // here made the two mutually exclusive, so the test could not pass on any product: it read
    // three renderings across nine surfaces whose glyph, plate, wordmark and note were byte
    // for byte identical, and reported a mark that computes three ways because the front door,
    // the educator pages and the student screens have three different backgrounds.
    const renderings = new Set(seen.map(({ mark }) => JSON.stringify({
      glyph: mark.glyph, plate: mark.plate, wordmark: mark.wordmark, note: mark.note,
    })));
    expect(
      [...renderings],
      `the mark computes ${renderings.size} ways across ${seen.length} surfaces: ` +
        seen.map((entry) => `${entry.name} → ${entry.mark.glyph} on ${entry.mark.plate}`).join("; "),
    ).toHaveLength(1);

    // And it is worth having covered more than one ground, or the test above is vacuous.
    expect(new Set(seen.map((entry) => entry.ground)).size).toBeGreaterThan(1);
  });
});

/**
 * Routes under `/educator` that are not educator pages, and so are not on the educator spine.
 *
 * One entry, and it has to be written down rather than detected: `/educator/try` is not a page
 * about a class, it is `StudentChallenge` itself with the transport swapped for the local-only
 * one — "a real run of the real screens, with nothing behind it", so a teacher can answer *what
 * do the children see* without making a class and printing a card. It has a student's chrome
 * and a student's typography because it is the student's run, and it carries no `EducatorShell`,
 * no `.educator-main` and no `.page-header` at all. Holding it to the educator page spine would
 * be asking the sample run to stop looking like the thing it is a sample of.
 *
 * It stays in the mark sweep above, which is the right scope for it: the mark is shared chrome
 * and must be identical there too, and it is.
 */
const NOT_AN_EDUCATOR_PAGE: readonly string[] = ["/educator/try"];

/**
 * Every educator page, addressed, out of the route table in `App.tsx`.
 *
 * The parameters are filled from the fixtures the routes are really about, and an unknown
 * parameter throws rather than being skipped — a route this test cannot address is a page it
 * is not covering, and that should be a failure rather than a silence.
 *
 * The exclusion above is held to the same standard, which is why it is checked against the
 * route table rather than merely subtracted from it: a named route that stops existing fails
 * here instead of quietly narrowing the sweep to nothing. That is the difference between a
 * test that covers twenty-three pages and a test that has been switched off one route at a
 * time.
 */
function educatorPages(): readonly string[] {
  const routes = [...readFileSync("src/App.tsx", "utf8").matchAll(/<Route\s+path="(\/educator[^"]*)"/g)]
    .map((match) => match[1]);
  expect(routes.length, "no educator routes found in src/App.tsx").toBeGreaterThan(5);
  for (const path of NOT_AN_EDUCATOR_PAGE) {
    expect(routes, `${path} is held out of the educator-page sweep but is not in App.tsx's route table`).toContain(path);
  }

  const seat = demoClassBundle().submissions[0].seatCode;
  const framework = Object.values(FRAMEWORKS)[0];
  const objective = standardsIn(framework.id)[0].code;
  const fill: Record<string, string> = {
    ":code": DEMO_CLASS_CODE,
    ":seatCode": seat,
    ":frameworkId": framework.id,
    // `/educator/demo/concepts/:conceptId` is a redirect kept for old bookmarks and never
    // reads the parameter, but a real concept id is what a bookmark would carry — and taking
    // it from the blueprint rather than typing one keeps this addressable through a rename.
    ":conceptId": CONCEPTS[0].id,
  };
  return [...new Set(routes.filter((route) => !NOT_AN_EDUCATOR_PAGE.includes(route)).map((route) => route.split("/").map((segment) => {
    if (!segment.startsWith(":")) return segment;
    // `/educator/objectives/:frameworkId/:code` reuses `:code` for an objective, not a class.
    if (segment === ":code" && route.includes(":frameworkId")) return objective;
    const filled = fill[segment];
    if (filled === undefined) throw new Error(`design.spec cannot address ${route}: no fixture for "${segment}".`);
    return filled;
  }).join("/")))];
}

test.describe("one educator page", () => {
  test("every page puts its title in the same place, in the same type", async ({ page }) => {
    // Twenty-three page loads. See the note on the mark sweep above.
    test.setTimeout(120_000);
    const headings: { path: string; size: string; weight: string; left: number }[] = [];

    for (const path of educatorPages()) {
      await page.goto(path);
      const heading = page.locator("h1").first();
      await expect(heading, `${path} has no h1`).toBeVisible();
      headings.push({
        path,
        ...(await heading.evaluate((node) => {
          const style = getComputedStyle(node);
          return { size: style.fontSize, weight: style.fontWeight, left: Math.round(node.getBoundingClientRect().left) };
        })),
      });
    }

    const shape = (entry: { size: string; weight: string; left: number }) => `${entry.size}/${entry.weight} at x=${entry.left}`;
    const shapes = new Set(headings.map(shape));
    expect(
      [...shapes],
      `educator H1s: ${headings.map((entry) => `${entry.path} → ${shape(entry)}`).join("; ")}`,
    ).toHaveLength(1);
  });

  test("every block on every page starts on the same spine as the title above it", async ({ page }) => {
    // The same twenty-three page loads again. See the note on the mark sweep above.
    test.setTimeout(120_000);
    for (const path of educatorPages()) {
      await page.goto(path);
      await expect(page.locator(".educator-main")).toBeVisible();
      const edges = await page.locator(".educator-main").evaluate((main) => {
        const left = (node: Element) => Math.round(node.getBoundingClientRect().left);
        return [...main.children]
          .filter((node) => node.getBoundingClientRect().width > 0)
          .map((node) => ({ what: `${node.tagName.toLowerCase()}.${String(node.className).split(/\s+/)[0] ?? ""}`, left: left(node) }));
      });
      expect(edges.length, `${path} rendered nothing`).toBeGreaterThan(0);

      // The page header is the spine, because it is the one block every page has.
      const spine = await page.locator(".educator-main > .page-header").first()
        .evaluate((node) => Math.round(node.getBoundingClientRect().left));
      for (const block of edges) {
        expect(block.left, `${path}: ${block.what} starts at x=${block.left}, the page header at x=${spine}`).toBe(spine);
      }
    }
  });

  test("a card grid renders no cell where there is no card", async ({ page }) => {
    await page.goto(`/educator/class/${DEMO_CLASS_CODE}`);
    const grids = page.locator(".card-grid");
    await expect(grids.first()).toBeVisible();

    for (let index = 0; index < await grids.count(); index += 1) {
      const grid = grids.nth(index);
      // The hairline between cards is the container's own colour showing through a 1px gap,
      // which is why an empty track is not empty: it paints the whole of it. Two cards in a
      // three-track grid put a 392px tan rectangle at the foot of the class overview. Tracks
      // that hold nothing must not exist.
      const { tracks, cards } = await grid.evaluate((node) => ({
        tracks: getComputedStyle(node).gridTemplateColumns.split(" ").filter((track) => parseFloat(track) > 0).length,
        cards: [...node.children].filter((child) => child.getBoundingClientRect().width > 0).length,
      }));
      expect(tracks, "a card grid has more columns with width than it has cards").toBeLessThanOrEqual(cards);
    }
  });
});
