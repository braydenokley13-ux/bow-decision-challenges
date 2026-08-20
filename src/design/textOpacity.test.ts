import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceWithoutComments } from "../test/source";

/**
 * Text is never faded with opacity.
 *
 * A contrast token is checked against a ground once, when it is chosen. `opacity` composites
 * *after* that choice, so a token measuring 7.77:1 arrives on the screen at 4.8:1 at 62%, and
 * at 3.37:1 at 55% — a real WCAG 1.4.3 failure produced by a perfectly good colour, invisible
 * to every check that reads the palette.
 *
 * Three rules shipped that way and a design court found them by measuring the rendered pixels
 * rather than the tokens: a claim the money would not stretch to, the world hub's not-yet
 * locations, and money the plan had not counted on. All three wanted "quieter", and all three
 * are cases where the student still has to *read* the thing — an unaffordable claim is not a
 * disabled control, it is a priced option they need in order to understand why it is out of
 * reach.
 *
 * So: pick the muted colour deliberately, and check it against the ground it will actually sit
 * on. `--ink-3` and `--ink-4` exist for exactly this and are already checked against every
 * surface token.
 *
 * Opacity on genuinely decorative layers is fine and stays — a backdrop, an icon, a drawn
 * mark. Those carry no text, so nothing composites into an unreadable sentence.
 */

const DESIGN = new URL("./", import.meta.url).pathname;

/** `opacity: 0.62`, but not `opacity: 1` or `opacity: 0`, which cannot degrade contrast. */
const FADED = /opacity:\s*(0?\.\d+)\s*;/g;

/**
 * Selectors allowed to fade, because nothing inside them is read.
 *
 * Each is a drawn layer: a full-bleed SVG behind a scene, an icon beside a label, a mark on a
 * counter. Adding to this list is a claim that the element contains no text, and it is worth
 * being made deliberately rather than by a regex that guesses.
 */
const DECORATIVE = [
  "backdrop", "svg", "::before", "::after", "__glow", "__aurora", "-grid i", "__plates i",
  "tray-stack i", "star-rule", "perf-rule", "__scene", "__art", "world-art", "-mark",
  // The segmented competency bar. It is `aria-hidden` in the markup and carries no words of its
  // own — the state it shows is printed as text in the row beside it — so fading one segment
  // fades a swatch rather than a sentence. `app.css`'s own comment above `.skill-bar` says the
  // same thing, and this entry is here so the two cannot disagree silently.
  "skill-bar",
];

function decorative(selector: string): boolean {
  return DECORATIVE.some((allowed) => selector.includes(allowed));
}

/** The selector a declaration belongs to: the text between the previous `}` and the `{`. */
function selectorFor(css: string, at: number): string {
  const open = css.lastIndexOf("{", at);
  const previous = Math.max(css.lastIndexOf("}", open), css.lastIndexOf(";", open));
  return css.slice(previous + 1, open).replace(/\s+/g, " ").trim();
}

describe("text is never faded with opacity", () => {
  const sheets = readdirSync(DESIGN).filter((name) => name.endsWith(".css"));

  it("finds the stylesheets, so an empty sweep cannot pass", () => {
    expect(sheets.length).toBeGreaterThan(4);
  });

  it.each(sheets)("%s", (name) => {
    const css = sourceWithoutComments(join(DESIGN, name), { lines: true });
    const offences: string[] = [];
    for (const match of css.matchAll(FADED)) {
      const selector = selectorFor(css, match.index ?? 0);
      if (!selector || decorative(selector)) continue;
      const line = css.slice(0, match.index).split("\n").length;
      offences.push(`${name}:${line} — ${selector} { opacity: ${match[1]} }`);
    }
    expect(
      offences,
      "\nFading text composites a checked colour into an unchecked one. Use --ink-3 or --ink-4,"
        + "\nor add the selector to DECORATIVE if it genuinely carries no text.\n",
    ).toEqual([]);
  });
});
