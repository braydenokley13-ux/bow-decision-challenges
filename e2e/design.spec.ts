import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_CLASS_CODE, demoClassBundle } from "../src/fixtures/demoClass";
import { FRAMEWORKS, standardsIn } from "../src/domain/standards";
import { CONCEPTS } from "../src/domain/blueprint/concepts";
import { createClass, gotoFreshChallenge, seatOnRoster, signIn } from "./flow";

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

/**
 * The mark as it computes on whatever page is open: the colours it paints for itself, and
 * the ground it is painted on.
 *
 * There is no monogram any more and this helper used to require one. `AppMark.tsx` was
 * redesigned into a wordmark — a heavy `<b>BOW</b>` with a four-point star lifted off its
 * top right, and a subtitle under it — with no letter-on-a-plate at all, so the assertion
 * that guarded the mark had been waiting on `.app-mark__monogram` and failing on the first
 * surface it looked at since the day the redesign landed. What is read now is what the
 * lockup is actually made of: the three colours it paints, and the ground under them.
 */
async function markOn(page: Page): Promise<{ word: string; star: string; note: string | null; letters: string; ground: string }> {
  return page.locator(".app-mark").first().evaluate((mark) => {
    const word = mark.querySelector("b");
    const star = mark.querySelector(".app-mark__star");
    if (!word || !star) throw new Error(`The mark has no ${word ? "star" : "wordmark"}: ${mark.outerHTML.slice(0, 200)}`);
    const note = mark.querySelector("small");
    const opaqueGroundOf = (start: Element | null): string => {
      for (let node = start; node; node = node.parentElement) {
        const paint = getComputedStyle(node).backgroundColor;
        if (paint !== "rgba(0, 0, 0, 0)" && paint !== "transparent") return paint;
      }
      return "rgb(255, 255, 255)";
    };
    return {
      word: getComputedStyle(word).color,
      // The star is painted with `fill`, not `color`, and it is the one part of the lockup
      // that is the same colour on every ground — so it is the part a stray bar rule shows
      // up on most plainly.
      star: getComputedStyle(star).fill,
      note: note ? getComputedStyle(note).color : null,
      letters: (word.textContent ?? "").trim(),
      ground: opaqueGroundOf(mark.parentElement),
    };
  });
}

/**
 * Light ground or dark ground, off the ground's own luminance rather than off a list of
 * page names.
 *
 * This is the one thing the mark is allowed to answer to. Everything else about a surface —
 * which bar wraps it, which stylesheet the bar lives in, what that bar does to its own
 * spans — it must ignore.
 */
function toneOf(ground: string): "light" | "dark" {
  return relativeLuminance(rgb(ground)) >= 0.5 ? "light" : "dark";
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
 *
 * `/home` is on this list and for a long time was not testing what it says. Without a student
 * session it redirects to `/join`, so the sweep loaded the class-code door twice and never
 * once looked at the student's own screen — one of the two student bars the comment above
 * claims to cover. The test seats a student before it walks, so the entry is the page it
 * names. That is the honest fix rather than dropping the row: the student's own screen has
 * its own bar, that bar carries the mark, and nothing else on this list would notice if it
 * started painting it differently.
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
  /**
   * One rule paints the mark, and the only thing that rule reads is the ground.
   *
   * The finding this test was written for is still the finding it is for: the mark rendered
   * three ways, one of them at 1.05:1, because its colours came from custom properties it
   * inherited from whatever bar happened to wrap it, and two bar rules of the form
   * `.some-bar span` out-specified the mark's own. A source scan can prove there is one rule
   * for the mark; only a computed value proves that rule wins on every page.
   *
   * What has changed is the mark, so what has changed here is the fingerprint. The lockup is
   * a wordmark, a star and a subtitle, and it paints itself out of `--ink-1` and the violet
   * ramp — which means it renders **once per ground**, deliberately: near-black on the
   * teacher's white and white on the student's near-black. That is not the old defect wearing
   * new clothes, it is the fix for it. A navy wordmark on the near-black front door would be
   * the 1.05:1 rendering again, and asserting one identical rendering across all nine surfaces
   * would be asserting exactly that.
   *
   * So the rule the assertions state is the one that is actually true of a coherent mark:
   *
   * - the mark's rendering is a **function of its ground** — every surface standing on the
   *   same tone computes byte-identically, so eight light chromes cannot be seven and a
   *   repaint;
   * - the **star is invariant**, on every ground, because it is the one part of the lockup
   *   that never reads an ink token and so the one part no ground can excuse;
   * - and the **wordmark clears AA against the ground it is standing on**, everywhere, which
   *   is what the 1.05:1 rendering failed and what a child on a school Chromebook needs.
   *
   * A logotype is exempt from SC 1.4.3, so none of this is a conformance gate. It is the
   * requirement that the product's own name is legible on its own pages.
   */
  test("renders one way per ground on every surface that carries it, and the wordmark is legible on it", async ({ page, request }) => {
    // Nine full page loads in one test, against Playwright's thirty-second default. These
    // sweeps are the one shape in the suite that pays a navigation per assertion rather than
    // asserting several times on one screen, and they run beside another browser on four
    // cores — which is measuring the machine, exactly what the raised `expect` timeout in
    // `playwright.config.ts` exists to stop doing.
    test.setTimeout(120_000);

    // `/home` is a real surface only for a student who is signed in; without a session it is
    // a redirect to `/join`. So one is seated, through the door a student actually uses.
    const created = await createClass(request, "One mark");
    const card = await seatOnRoster(page, created.code, "1");
    await gotoFreshChallenge(page);
    await signIn(page, { ...card, classCode: created.code });

    const seen: { name: string; path: string; mark: Awaited<ReturnType<typeof markOn>> }[] = [];

    for (const surface of SURFACES_WITH_THE_MARK) {
      await page.goto(surface.path);
      await expect(page.locator(".app-mark__word")).toBeVisible();
      await expect(page.locator(".app-mark__star")).toBeVisible();
      const mark = await markOn(page);

      // The surface is the one the row names, rather than wherever a redirect landed. This
      // is the assertion that would have caught `/home` quietly testing `/join` for a second
      // time — nine rows, eight surfaces, and nobody the wiser.
      expect(
        new URL(page.url()).pathname,
        `${surface.name} (${surface.path}): the sweep ended up somewhere else, so this row is not testing the surface it names`,
      ).toBe(surface.path);

      // The name is on the screen, in the mark. A lockup that renders its star and loses its
      // word is a mark nobody can read, and every colour assertion below would still pass.
      expect(mark.letters, `${surface.name} (${surface.path}): the wordmark reads "${mark.letters}"`).toBe("BOW");

      // The word, on the ground it is standing on. This is the assertion that fails when a
      // bar rule repaints it — the exact shape of the bug, and one that changes nothing else.
      expect(
        contrast(mark.word, mark.ground),
        `${surface.name} (${surface.path}): "BOW" is ${mark.word} on a ${mark.ground} ground`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

      seen.push({ name: surface.name, path: surface.path, mark });
    }

    const fingerprint = (mark: Awaited<ReturnType<typeof markOn>>) =>
      JSON.stringify({ word: mark.word, star: mark.star, note: mark.note });
    const said = (entry: typeof seen[number]) =>
      `${entry.name} (${entry.path}) → ${entry.mark.word} + ${entry.mark.star} + ${entry.mark.note} on ${entry.mark.ground}`;

    // One rendering per ground. Not "similar" — the same three computed colours on every
    // surface that stands on the same tone. Two marks on the same cream ground, one painted
    // in body ink by a bar rule and the other in the mark's own, is the finding this test
    // exists to keep closed, and no contrast threshold catches it: both of them cleared 4.5:1.
    for (const tone of ["light", "dark"] as const) {
      const onThisGround = seen.filter((entry) => toneOf(entry.mark.ground) === tone);
      if (onThisGround.length === 0) continue;
      const renderings = new Set(onThisGround.map((entry) => fingerprint(entry.mark)));
      expect(
        [...renderings],
        `the mark computes ${renderings.size} ways across the ${onThisGround.length} ${tone} surfaces: `
          + onThisGround.map(said).join("; "),
      ).toHaveLength(1);
    }

    // The star reads no ink token, so no ground excuses a second one. It is the part of the
    // lockup that has to be identical on all nine.
    const stars = new Set(seen.map((entry) => entry.mark.star));
    expect(
      [...stars],
      `the star computes ${stars.size} ways across ${seen.length} surfaces: ` + seen.map(said).join("; "),
    ).toHaveLength(1);

    // And it is worth having covered more than one ground, or the loop above is vacuous: it
    // would pass on nine copies of one page, and it would pass on a product whose light
    // surfaces were never compared with each other.
    const tones = new Set(seen.map((entry) => toneOf(entry.mark.ground)));
    expect(tones.size, `every surface in the sweep stands on ${[...tones][0]} ground: ` + seen.map(said).join("; ")).toBe(2);
    expect(
      new Set(seen.map((entry) => entry.mark.ground)).size,
      "the sweep never compared two surfaces standing on the same ground: " + seen.map(said).join("; "),
    ).toBeLessThan(seen.length);
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
