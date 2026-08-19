import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "../test/source";
import { CLASS_STATE_LABELS, LEVEL_LABELS } from "./labels";

/**
 * A browser test that hard-codes a label the product owns is a test with an expiry date.
 *
 * `e2e/bow.spec.ts` asserted the literal `"Not yet assessed"`. The product has said **"Nobody
 * assessed yet"** since `1bdd8e6` — 214 commits before this was found. The spec died at its
 * first educator assertion, so everything after that point in the file had not run since: all
 * the educator browser coverage was silently absent for most of this branch's life, while the
 * file went on looking like coverage.
 *
 * The sharpest part is that the file **already imported `CLASS_STATE_LABELS`** and then typed
 * the label out by hand a few hundred lines further down. So this is not a missing import, it
 * is a restated fact — the same shape as `REASONING_MAXIMUM`'s `?? 10`, the two glossary world
 * unions, and thirteen copies of one comment stripper. A restated fact is a fact that will
 * eventually be wrong, and the only question is how long it takes somebody to notice.
 *
 * A unit test can hold this even though it is about the browser suite: the labels are data, and
 * whether a spec quotes them or reads them is a fact about the source.
 */

const E2E = join(__dirname, "..", "..", "e2e");

function specs(): { path: string; text: string }[] {
  return readdirSync(E2E)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({ path: `e2e/${name}`, text: withoutComments(readFileSync(join(E2E, name), "utf8")) }));
}

/** Every word the shipped product can put on a screen, comments stripped. */
function productText(): string {
  const parts: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
      parts.push(readFileSync(path, "utf8"));
    }
  };
  walk(join(__dirname, ".."));
  return parts.join("\n");
}

/** Every label the educator surfaces render from a table, as the literal a spec might type. */
const OWNED = [...Object.values(CLASS_STATE_LABELS), ...Object.values(LEVEL_LABELS)];

describe("the browser suite asserts text the product still says", () => {
  /**
   * The rule that would have caught it, and the one my first attempt did not.
   *
   * Forbidding a spec from quoting a *current* label prevents the next rename from going stale.
   * It does nothing about this bug, because `"Not yet assessed"` had already stopped being a
   * label — it is a string the product no longer contains anywhere. I wrote that weaker test
   * first, watched it pass with the stale literal put back, and it was worth more as a failure
   * than it would have been as a pass.
   *
   * So the check is the one `docsTruth.test.ts` makes about backticked names, pointed at
   * browser assertions: **every literal a spec asserts is visible must exist somewhere in the
   * product's source.** A string that appears in no product file cannot be on a screen, so an
   * assertion for it can only ever fail — and a failing assertion in Playwright takes every
   * later assertion in the file with it.
   */
  /**
   * Four assertions are already dead, and they are quarantined rather than deleted.
   *
   * Each is text the product no longer contains, so each can only fail — and in Playwright a
   * failing assertion takes every later assertion in the file with it. `"Not yet assessed"` was
   * the first, 214 commits stale, and fixing it only moves the wall to the next one. They are
   * listed here so this test can land and start guarding, and **an entry must be deleted when
   * its assertion is fixed**: the list is compared by equality, so a repair that leaves its
   * entry behind fails just as loudly as a new stale literal.
   */
  const QUARANTINED = [
    'e2e/bow.spec.ts — "everything it asks for"',
    'e2e/bow.spec.ts — "BOW cannot assess this objective yet."',
    'e2e/bow.spec.ts — "3 turned in · 3 written explanations still to read."',
    'e2e/bow.spec.ts — "3 of 3 assessed"',
  ];

  it("has no spec asserting text that appears nowhere in the product", () => {
    const product = productText();
    const stale: string[] = [];

    for (const { path, text } of specs()) {
      for (const [, quoted] of text.matchAll(/getByText\(\s*"([^"\n]{6,})"/g)) {
        if (!quoted) continue;
        // Only whole sentences and labels — a fragment may legitimately be composed at runtime.
        if (/[{}$`]/.test(quoted)) continue;
        if (!product.includes(quoted)) stale.push(`${path} — "${quoted}"`);
      }
    }

    expect(stale, "this text is on no screen, so the assertion can only fail — and it takes the rest of the file with it").toEqual(QUARANTINED);
  });

  /**
   * The forward-looking half, kept from the first attempt. It does not catch a label that has
   * already gone stale, but it stops a spec pinning one that is about to.
   */
  it("has no spec hard-coding a label the product owns", () => {
    const quoted: string[] = [];
    for (const { path, text } of specs()) {
      for (const label of OWNED) {
        if (text.includes(`"${label}"`) || text.includes(`'${label}'`)) quoted.push(`${path} — "${label}"`);
      }
    }

    expect(quoted, "import the label instead; a quoted one goes stale and takes the rest of the file with it").toEqual([]);
  });

  it("still checks the labels somewhere", () => {
    const reading = specs().filter(({ text }) => /CLASS_STATE_LABELS|LEVEL_LABELS/.test(text));

    expect(reading.length, "no spec reads the label tables at all").toBeGreaterThan(0);
  });

  /** The label that broke it, named, so its absence is loud rather than quiet. */
  it("keeps the label that went stale under a name a spec can import", () => {
    expect(CLASS_STATE_LABELS["not-assessed"]).toBe("Nobody assessed yet");
  });
});
