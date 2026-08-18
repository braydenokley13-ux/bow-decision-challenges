import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gradeBandLabel } from "./index";
import { COMPETENCIES } from "../competency/competencies";
import { PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";

/**
 * One product, one grade band.
 *
 * The front door and the head of the educator guide said **Grades 6–8** while the objectives
 * page, the framework footer and every competency in the spine said **Grades 5–8**. Both
 * sentences are addressed to the same person — a teacher deciding whether this fits the class
 * in front of them — and one of them was wrong, so a Grade 5 teacher was told by the same
 * product both that this was for them and that it was not.
 *
 * The band is not a matter of taste: the objectives this challenge reports against are NYSED's
 * Grades 5–8 Personal Finance band, every competency carries `gradeBand: "5-8"`, and the
 * student copy is written to a Grade 5 reading floor. So the data decides, and everything a
 * person can read has to agree with the data.
 *
 * This is a source scan for the reason `studentLanguage.test.ts` is one: the drift it catches
 * is invisible to a behavioural test. A surface gains a hand-typed band, nobody rereads the
 * other four, and two answers ship. It asserts the invariant — *no two user-visible grade
 * bands disagree* — rather than the mechanism, so it still fails if a future band is composed,
 * imported or hard-coded somewhere nobody has thought of yet.
 */

/** "Grades 5–8", from the objectives themselves rather than from a second hand-typed string. */
const CANONICAL = gradeBandLabel("nysed-pf-2026");

/** Every band-shaped phrase a reader could meet: "Grade 5-8", "Grades 5–8", "grades 5 - 8". */
const BAND_PATTERN = /\bgrades?\s+(\d{1,2})\s*[–—-]\s*(\d{1,2})\b/gi;

/** Comments are not user-visible. The `[^:]` guard keeps `https://` out of the line-comment rule. */
function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Every file that can put words on a screen: the app's own source, and the page that hosts it. */
function readableSources(): string[] {
  const source = readdirSync("src", { recursive: true, encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/${entry}`);
  return ["index.html", ...source].sort();
}

function bandsIn(path: string): { text: string; line: number }[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  return [...source.matchAll(BAND_PATTERN)].map((match) => ({
    text: match[0],
    line: source.slice(0, match.index).split("\n").length,
  }));
}

describe("every grade band a person can read says the same thing", () => {
  it("names the band the objectives themselves carry", () => {
    expect(CANONICAL).toBe("Grades 5–8");
    expect(new Set(COMPETENCIES.map((competency) => competency.gradeBand))).toEqual(new Set(["5-8"]));
  });

  it("puts the same band on the challenge as on the framework", () => {
    // The front door and the educator guide print this one; the objectives page and the
    // framework footer print `gradeBandLabel`. They are two strings about one product.
    expect(PLAN_UNDER_PRESSURE.grades).toBe(CANONICAL);
  });

  it("finds no second band anywhere a reader can reach", () => {
    const offences = readableSources().flatMap((path) =>
      bandsIn(path)
        .filter(({ text }) => text.replace(/\s+/g, " ").replace(/[—-]/g, "–") !== CANONICAL)
        .map(({ text, line }) => `${path}:${line} — "${text}" is not "${CANONICAL}"`),
    );
    expect(offences, "one product, one grade band").toEqual([]);
  });

  it("would catch a surface that disagreed", () => {
    // The scan is worth having only if it fails on the string the product actually shipped.
    const drifted = withoutComments(`export const grades = "Grades 6–8"; // the old front door`);
    expect([...drifted.matchAll(BAND_PATTERN)].map((match) => match[0])).toEqual(["Grades 6–8"]);
  });
});
