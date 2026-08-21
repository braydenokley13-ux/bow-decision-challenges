import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sourceWithoutComments } from "../test/source";

/**
 * D4 and D8 — two elements on the evaluator's path that had no CSS rule at all.
 *
 * `DEFECTS.md` D7 found twenty-five elements in this product whose every class name matched
 * no selector in any stylesheet. Three of them were confirmed broken by rendered evidence,
 * and all three are on the two screens a district evaluator meets first:
 *
 * - `.home__foot`, the front door's footer, printed its three items in the browser's default
 *   inline flow with nothing between them — `BOW Decision ChallengesData protectionTeacher's
 *   guide`, measured as three boxes running 0–206, 206–331, 331–456 at 1366.
 * - `.sample-run` / `.sample-run__bar`, the *"Try it as a student"* banner, rendered as raw
 *   text jammed above the app bar at `padding: 0px` on a transparent ground.
 *
 * Both are now written in `app.css`. This is the cheap half of the guard that would have
 * caught them: the *element exists in the markup* and *a rule exists for it* are two facts
 * that drifted apart silently, and nothing was comparing them. It does not assert what the
 * rules say — the screenshots in `gauntlet/v6/teacher/d4-after-*.png` and `d8-after-*.png`
 * do that — only that an element the product renders is not left to the user agent.
 *
 * It lives here rather than beside the other `src/design` tests because the same workstream
 * owns `app.css` and `SampleRun.tsx`, and because a rule this file protects is only ever
 * deleted by somebody editing one of those two.
 */

const tsx = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/**
 * Every selector in `app.css`, with comments stripped so a rule that is only *described* in a
 * comment — or commented out — does not count as a rule. The stripper is the repository's one
 * stripper: `src/test/source.ts`, which `source.test.ts` exists to keep single.
 */
const selectors = sourceWithoutComments(fileURLToPath(new URL("../design/app.css", import.meta.url)));

const hasRuleFor = (className: string) =>
  new RegExp(`\\.${className.replace(/[-_]/g, (c) => `\\${c}`)}(?![\\w-])`).test(selectors);

describe("the elements on the evaluator's first two screens are styled", () => {
  it.each([
    ["home__foot", "../App.tsx"],
    ["sample-run", "./SampleRun.tsx"],
    ["sample-run__bar", "./SampleRun.tsx"],
  ])("%s, rendered by %s", (className, source) => {
    // The element is still rendered. If it is not, the rule is dead weight rather than a defect.
    expect(tsx(source)).toContain(`"${className}`);
    expect(hasRuleFor(className)).toBe(true);
  });
});
