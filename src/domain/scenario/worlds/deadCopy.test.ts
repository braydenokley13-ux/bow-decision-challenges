import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withoutComments } from "../../../test/source";

/**
 * Every sentence in a world's copy table is on a screen somewhere.
 *
 * **What this found the day it was written.** The market's write-up screen carried five
 * strings that nothing had rendered since the gate was rebuilt — `pickMore`, `pickMoreOne`,
 * `ready`, `write` and `longEnough` — and the scan then found a sixth nobody had noticed at
 * all, `crowdUnit`, on the booth screen. One of the five was *"Long enough to turn in."*, which
 * `evidence/writingGate.ts` records as a defect the product removed on purpose: the product
 * telling a twelve-year-old their paragraph was long enough, which is the one thing a writing
 * gate must never say. It was deleted from the screen and left in the table, where the next
 * person to wire up a write-up screen would have found it looking exactly like current copy.
 *
 * **And dead copy is not free.** `popUpStudentCopy` is what `worldParity.test.ts` measures
 * the world's reading grade level from, and what its declared demand profile is checked
 * against. Six strings no student ever meets — five of them fragments like *"more numbers to
 * pick."* and *"plates"* — were being averaged into a readability figure that is supposed to
 * describe what a Grade 5–8 reader is actually asked to get through. Short dead strings pull
 * that figure down, so the error ran in the flattering direction, which is why nobody noticed.
 * (The reading-load *timing* ruler in `stages/readingLoad.test.tsx` renders the screens
 * instead, so it was never affected — checked rather than assumed: the market's measured word
 * count is the same before and after this deletion.)
 *
 * The scan is deliberately about *keys*, not sentences: a copy table is a contract between a
 * scenario and the screens that draw it, and a key nothing reads is a clause nobody honours.
 */

/**
 * The worlds that keep their copy in a table, which is the only place it can go dead.
 *
 * Basketball does not: its sentences are written inline in the screens that draw them, and a
 * string inside JSX cannot be orphaned — deleting the element deletes the words. So this scan
 * covers the market and any world built the same way, and the coverage assertion below names
 * that rather than letting an empty list pass for a clean one.
 */
function worldCopyFiles(): string[] {
  return readdirSync("src/domain/scenario/worlds", { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith("scenario.ts"))
    .map((entry) => `src/domain/scenario/worlds/${entry}`)
    .filter((path) => /^(?:export )?interface \w*ScreenCopy \{$/m.test(readFileSync(path, "utf8")));
}

function everySourceFile(): string[] {
  const under = (dir: string): string[] =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .map((entry) => `${dir}/${entry}`)
      .filter((path) => /\.tsx?$/.test(path));
  return under("src");
}

/**
 * The keys declared inside the `screens` interface of a world's scenario module.
 *
 * Read off the type rather than the value, because the type is where a screen's contract is
 * written and it is flat enough to parse without a compiler: one `name: type;` per line inside
 * the world's `…ScreenCopy` interface. Nested groups (`tileLabels`, `verdicts`) contribute
 * their own leaves and are covered by the same rule.
 */
function copyKeysIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  const keys = new Set<string>();
  // Each `interface …ScreenCopy` in the file, to its closing brace at column 0.
  for (const header of source.matchAll(/^(?:export )?interface (\w*ScreenCopy) \{$/gm)) {
    const start = header.index ?? 0;
    const end = source.indexOf("\n}", start);
    const block = source.slice(start, end === -1 ? undefined : end);
    for (const match of block.matchAll(/^\s{2,}([a-zA-Z][a-zA-Z0-9]*)\??:\s*(?:string|readonly string\[\]|number|boolean)\s*;/gm)) {
      keys.add(match[1]!);
    }
  }
  return [...keys].sort();
}

/**
 * Anything that could be reading the key: a property access, a destructure, or a string index.
 *
 * Loose on purpose. This exists to catch a key nothing anywhere mentions, and a scan that
 * demanded the exact call site would fail on every screen that destructures its copy.
 */
function readAnywhere(key: string, sources: readonly { path: string; text: string }[], own: string): boolean {
  const patterns = [
    new RegExp(`\\.${key}\\b`),
    new RegExp(`\\b${key}\\s*[,}]`),
    new RegExp(`\\["${key}"\\]`),
  ];
  return sources.some(({ path, text }) => path !== own && patterns.some((pattern) => pattern.test(text)));
}

describe("no world carries copy that no screen draws", () => {
  const sources = everySourceFile().map((path) => ({ path, text: withoutComments(readFileSync(path, "utf8")) }));
  const worlds = worldCopyFiles();

  it("finds the copy tables it exists for, and their keys", () => {
    expect(worlds, "no world keeps its copy in a table any more, or the block moved").not.toEqual([]);
    for (const world of worlds) expect(copyKeysIn(world).length, world).toBeGreaterThan(20);
    // Named, so that a world built the table way and left off this list is a failure rather
    // than a silence. Basketball is deliberately absent: its copy is inline in its screens.
    expect(worlds).toContain("src/domain/scenario/worlds/food-truck/scenario.ts");
  });

  it.each(worlds)("every screen string in %s is read by something", (world) => {
    const dead = copyKeysIn(world).filter((key) => !readAnywhere(key, sources, world));
    expect(dead, `${world} declares copy nothing reads`).toEqual([]);
  });

  it("would catch a key that nothing reads", () => {
    // The test has to be able to fail. `longEnough` was one of the five, and no file in this
    // tree mentions it any more, so asking about it is asking the question this scan asks.
    expect(readAnywhere("longEnough", sources, "")).toBe(false);
    // And a key every screen uses has to come back true, or the scan passes by reading nothing.
    expect(readAnywhere("submit", sources, "")).toBe(true);
  });
});
