import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { sourceWithoutComments } from "../test/source";

/**
 * No responsive grid may declare a track floor wider than the narrowest screen it has to work on.
 *
 * **The defect this closes was a launch blocker and it was invisible at every width the suite
 * measured.** `.spot-grid` — the market's booths, the screen a student picks their pitch from —
 * read `repeat(auto-fit, minmax(260px, 1fr))`. At 400% browser zoom the viewport is 320 CSS
 * pixels wide, the page's own padding takes it under 260, and `minmax`'s first argument is a
 * *floor*: the track stays 260px and the grid runs off the side of the screen. Playwright's
 * report is the exact shape of it — *"element is visible, enabled and stable · scrolling into
 * view if needed · done scrolling · element is outside of the viewport"*, 576 times, until the
 * test gave up. A student who needs large text could not take a booth, which is not a layout
 * blemish: it is the world being unplayable.
 *
 * Twenty-six grids in three stylesheets carried the same construction. One of them happened to
 * be on a screen the zoom sweep walks, so one of them was found.
 *
 * `minmax(min(260px, 100%), 1fr)` is the whole fix. Where there is room the floor is 260px and
 * nothing changes; where there is not, the track collapses to the container instead of pushing
 * past it. It costs nothing at any other width, which is why the rule can be absolute rather
 * than case-by-case — and an absolute rule is one a test can hold.
 *
 * This reads the stylesheets from disk on purpose. A snapshot of what the CSS said when
 * somebody last looked is exactly what let twenty-six of these accumulate.
 */
const DESIGN = new URL("./", import.meta.url).pathname;

/** `repeat(auto-fit | auto-fill, minmax(<floor>, …))` — the construction that can overflow. */
const RESPONSIVE_TRACK = /repeat\(\s*auto-(?:fit|fill)\s*,\s*minmax\(([^,]+),/g;

describe("responsive grids never floor a track wider than the screen", () => {
  const sheets = readdirSync(DESIGN).filter((name) => name.endsWith(".css"));

  it("finds the stylesheets to check, so an empty sweep cannot pass", () => {
    expect(sheets.length).toBeGreaterThan(2);
  });

  it.each(sheets)("%s", (name) => {
    const css = sourceWithoutComments(join(DESIGN, name), { lines: true });
    const offences: string[] = [];
    for (const match of css.matchAll(RESPONSIVE_TRACK)) {
      const floor = match[1].trim();
      if (floor.startsWith("min(") || floor === "0") continue;
      const line = css.slice(0, match.index).split("\n").length;
      offences.push(`${name}:${line} — minmax(${floor}, …) cannot collapse below ${floor}`);
    }
    expect(
      offences,
      "\nWrap the floor: minmax(min(<floor>, 100%), 1fr). It is identical wherever there is room.\n",
    ).toEqual([]);
  });
});
