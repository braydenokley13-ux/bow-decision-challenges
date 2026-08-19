import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withoutComments } from "../test/source";

/**
 * Nothing a student reads tells them their own money cannot be saved.
 *
 * **The defect this exists to stop, found by an economics-and-pedagogy review in both worlds
 * at once.** Week 3 of the season hands Avery $150 in cash and three claims on it; the first
 * Saturday at the market empties a tips jar and does the same. In both, the money is walled
 * off from the plan so that `balance.ts` does not have to sweep a strategy space with a new
 * pot in it — a defensible build decision, recorded in each world's `claims.ts`. What was not
 * defensible is what the walls were described as on screen:
 *
 * - `SeasonWeeks.tsx`, in bold, in an alert: *"The $150 cannot be saved and cannot go into the
 *   plan, so leaving it is not one of the choices."*
 * - the same screen's running total: *"Cash Avery does not spend this week goes nowhere."*
 * - the market's standing deck, read by every student whether they hesitate or not: *"it
 *   cannot go on the three lines and it cannot be banked."*
 *
 * None of those is a fact about money. A person handed cash can always keep it. They are facts
 * about how far this beat was built, written in the voice the product uses for the world — and
 * a financial-literacy assessment that tells a twelve-year-old saving is not one of the
 * choices, and then scores them down for a dollar left in hand, is doing the one thing it
 * cannot afford to be caught doing. The competency list is half about goals.
 *
 * **The true constraint is narrow and the screens now say the narrow thing**: this money does
 * not reach the plan, and the three claims in front of the student are what it can do
 * something about this week. That is also exactly what the rubric reads, so nothing was lost
 * by telling the truth.
 *
 * **Why a source scan and not a behavioural test.** Every one of those sentences was rendered
 * by a screen with passing tests, and one of them was pinned in place by an assertion that
 * quoted it. The drift is invisible to a test that asks what the screen does, because the
 * screen did exactly what it was built to do. It is only visible in the words.
 */

/** Everything a student can read words out of, enumerated from disk rather than by hand. */
function studentFacing(): string[] {
  const under = (dir: string) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .map((entry) => `${dir}/${entry}`)
      .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path));
  // The screens as well as the copy files: the worst offender lived in JSX text, which no
  // scan of quoted strings would ever have seen.
  return [
    ...under("src/content"),
    ...under("src/domain/scenario/worlds"),
    ...under("src/stages"),
    ...under("src/components"),
    ...under("src/student"),
  ].sort();
}

/**
 * Five shapes, each one a sentence that was on screen or is one edit away from being.
 *
 * They are phrases rather than words because the words are all innocent apart: a plan "cannot
 * be saved" is a true and useful sentence about a form, and this scan has to survive being run
 * beside one. What is banned is the pairing of an impossibility with the student's own money.
 */
const DENIALS: readonly { pattern: RegExp; why: string }[] = [
  {
    // "Banked" and "put away" are money's own verbs and need no subject beside them: there is
    // nothing else in this product they could be said of.
    pattern: /\b(?:cannot|can\s?not|can[’']t|could\s?n[o’']?t|could\s+not)\s+be\s+(?:banked|put\s+(?:away|aside))\b/i,
    why: "tells the student an amount of money cannot be banked or put away, which is never true of cash in a person's hand",
  },
  {
    // "Saved" and "kept" are not, and the first draft of this scan proved it by failing on
    // *"Your plan cannot be saved until every row has an answer"* — a true and useful
    // sentence about a form. So these two want a sum or a money noun in front of them, which
    // every offending sentence had and the form message does not.
    pattern: /(?:\$[\d,]+|\b(?:money|cash|tips|dollars?|jar|takings|earnings|wages|pay)\b)[^.!?]{0,60}?\b(?:cannot|can\s?not|can[’']t|could\s?n[o’']?t|could\s+not)\s+be\s+(?:saved|kept)\b/i,
    why: "tells the student a named sum of money cannot be saved or kept, which is never true of cash in a person's hand",
  },
  {
    pattern: /\b(?:saving|keeping|banking)\b[^.!?]{0,60}\bnot\s+(?:one\s+of\s+the\s+choices|an?\s+(?:option|choice))\b/i,
    why: "names saving as something the student is not allowed to choose",
  },
  {
    pattern: /\b(?:leaving|keeping)\s+(?:it|them|the\s+\w+)\s+is\s+not\s+(?:one\s+of\s+the\s+choices|an?\s+(?:option|choice))\b/i,
    why: "the same rule with the noun moved: holding on to the money is named as forbidden rather than as unhelpful here",
  },
  {
    pattern: /\bgoes\s+nowhere\b/i,
    why: "says money the student holds ceases to exist, when what is true is that it does nothing for the claims in front of them",
  },
];

/**
 * The line the honest version has to stay on, and it is a fine one.
 *
 * *"does not reach the plan"*, *"does not go on the three lines"*, *"does nothing for any of
 * them"* are all true, all narrow, and all say the same operational thing to a student
 * deciding what to press. The scan is written to pass every one of them and fail every
 * sentence above, which is the whole of the distinction being enforced.
 */
function denialsIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  return DENIALS.flatMap(({ pattern, why }) => {
    const global = new RegExp(pattern.source, `${pattern.flags}g`);
    return [...source.matchAll(global)].map((match) => {
      const line = source.slice(0, match.index).split("\n").length;
      const around = source.slice(Math.max(0, (match.index ?? 0) - 70), (match.index ?? 0) + 90).replace(/\s+/g, " ");
      return `${path}:${line} — ${why}\n    …${around.trim()}…`;
    });
  });
}

describe("no screen tells a student their own money cannot be saved", () => {
  const files = studentFacing();

  it("reads the screens as well as the copy files, including any added later", () => {
    // Both of the files that carried the defect, named, so a reorganisation that moves the
    // scan off them is a failing test rather than a silent loss of coverage.
    expect(files).toContain("src/stages/SeasonWeeks.tsx");
    expect(files).toContain("src/domain/scenario/worlds/food-truck/scenario.ts");
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)("says nothing false about money the student is holding in %s", (path) => {
    expect(denialsIn(path).join("\n"), path).toEqual("");
  });

  it("fails on all four retired sentences, and on none of the honest ones", () => {
    // The test has to be able to fail, and it has to fail on the exact words that shipped.
    // Three of these were on screen; the fourth is the shape the first would take next.
    const retired = [
      "The $150 cannot be saved and cannot go into the plan, so leaving it is not one of the choices.",
      "Cash Avery does not spend this week goes nowhere.",
      "it cannot go on the three lines and it cannot be banked",
      "Saving it is not an option here.",
    ];
    for (const sentence of retired) {
      expect(DENIALS.some(({ pattern }) => pattern.test(sentence)), sentence).toBe(true);
    }
    // And the sentences that replaced them, which have to keep passing or the scan is just a
    // ban on talking about the beat at all.
    const honest = [
      "This money is Avery’s, not the plan’s, so it does not reach the plan.",
      "What Avery keeps in hand does nothing for any of these three.",
      "This money is yours, not the truck's, so it does not go on the three lines. Three things want it, and what you leave in the jar does nothing for any of them.",
      "Your plan cannot be saved until every row has an answer.",
    ];
    for (const sentence of honest) {
      expect(DENIALS.filter(({ pattern }) => pattern.test(sentence)).map((entry) => entry.why), sentence).toEqual([]);
    }
  });
});
