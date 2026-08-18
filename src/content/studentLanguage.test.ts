import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { popUpStudentCopy } from "../domain/scenario/worlds/food-truck";

/**
 * §13.1.2 — no assessment language anywhere a student can read it.
 *
 * > Banned words in student-facing copy, enforced by a source scan test: *objective,
 * > standard, assess, assessment, rubric, mastery, competency, skill, score, grade, points,
 * > learning target, NYSED.*
 *
 * The rule is not squeamishness. A student who is told they are being measured stops making
 * the decision and starts guessing what the measurement wants, and the whole product rests on
 * watching them make a real decision. The same sentence in front of a teacher is fine — this
 * scan covers the student's side of the wall and nothing else.
 *
 * It is a source scan for the same reason `pricing.test.ts` is: the drift it catches is
 * invisible to a behavioural test. A world's copy file gains one sentence, nobody rereads the
 * other four hundred, and the word ships.
 */

/** Files a student reads sentences out of. Comments in them are not student-facing. */
function studentSources(): string[] {
  const worlds = readdirSync("src/domain/scenario/worlds", { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith("scenario.ts"))
    .map((entry) => `src/domain/scenario/worlds/${entry}`);
  const content = readdirSync("src/content", { encoding: "utf8" })
    .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
    .map((entry) => `src/content/${entry}`);
  return [...content, ...worlds].sort();
}

/** Comments are stripped: a comment explaining a rule is not a violation of it. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Only the quoted strings, because only quoted strings reach a screen.
 *
 * An identifier called `scoredExplanations` is a name in the code; the word a student reads is
 * the one inside the quotes. Scanning the whole file would fail on the first and miss nothing
 * about the second.
 */
function literalsIn(source: string): { text: string; line: number }[] {
  const found: { text: string; line: number }[] = [];
  const pattern = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  for (const match of source.matchAll(pattern)) {
    found.push({
      text: match[1] ?? match[2] ?? match[3] ?? "",
      line: source.slice(0, match.index).split("\n").length,
    });
  }
  return found;
}

/** §13.1's list, plus the plurals, because "skills" is the same word wearing an s. */
const BANNED = [
  "objective", "objectives",
  "standard", "standards",
  "assess", "assessed", "assessment", "assessments",
  "rubric", "rubrics",
  "mastery",
  "competency", "competencies",
  "skill", "skills",
  "score", "scores", "scored", "scoring",
  "grade", "grades", "graded", "grading",
  "point", "points",
  "learning target", "learning targets",
  "nysed",
];

/**
 * Words the mission adds on top of §13.1, for a different reason.
 *
 * These are not assessment language, they are the voice of a worksheet. "Let's" and "Now that
 * you've" are a teacher standing behind the student; the market organiser does not talk like
 * that, and neither does a coach.
 */
const BANNED_TONE = ["let's", "lets go", "great job", "well done", "nice work", "it's time to", "now that you've", "get ready to"];

/**
 * The one sentence that keeps a banned word and earns it, written down with its reason.
 *
 * It is in Basketball, it is a noun from the sport rather than a word about measurement, and
 * it tells a student nothing about how their work is read. The list is exact strings rather
 * than patterns, so a sentence that is edited stops being exempt and has to be argued for
 * again — which is the point of an exception list existing at all.
 *
 * It was two. The other was *"Sixteen points against Rivertown"*, a scoreboard line in Week 2
 * of the four-card season feed, and it went when the feed did: Weeks 1–4 are now one decision
 * and a drain, and there is nowhere left for a week's flavour note to be read. An exception
 * that outlives the sentence it protects is a hole in the ban, so it went with it.
 */
const ALLOWED: readonly { path: string; text: string; because: string }[] = [
  {
    path: "src/domain/scenario/worlds/basketball/scenario.ts",
    text: "The team runs skills clinics for younger players and is short a coach. ${CLINIC_SATURDAYS} Saturdays, the last ${CLINIC_SATURDAYS} of the season, and the money lands before the ${SCENARIO_NUMBERS.weeks} weeks end.",
    because: "A skills clinic is what a basketball club calls a coaching session. It says nothing about the student, and renaming it would make the world read as though it were avoiding a word.",
  },
];

function offencesIn(path: string, words: readonly string[]): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  const allowed = new Set(ALLOWED.filter((entry) => entry.path === path).map((entry) => entry.text));
  return literalsIn(source).flatMap(({ text, line }) => {
    if (allowed.has(text)) return [];
    return words
      .filter((word) => new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(text))
      .map((word) => `${path}:${line} — "${word}" in ${JSON.stringify(text.slice(0, 90))}`);
  });
}

describe("nothing a student reads names the thing being measured", () => {
  const sources = studentSources();

  it("scans every file a student reads sentences out of, including any added later", () => {
    // Read from disk rather than listed by hand: the next world's copy file is the one nobody
    // remembers to add to a list, and it would be unscanned from the moment it existed.
    expect(sources).toContain("src/content/studentCopy.ts");
    expect(sources).toContain("src/domain/scenario/worlds/basketball/scenario.ts");
    expect(sources).toContain("src/domain/scenario/worlds/food-truck/scenario.ts");
    expect(sources.length).toBeGreaterThanOrEqual(3);
  });

  it.each(sources)("uses no assessment language in %s", (path) => {
    expect(offencesIn(path, BANNED), path).toEqual([]);
  });

  it.each(sources)("does not talk to the student like a worksheet in %s", (path) => {
    expect(offencesIn(path, BANNED_TONE), path).toEqual([]);
  });

  it("keeps the exception list short, exact and explained", () => {
    // An exception list that grows is a ban that has stopped meaning anything. Every entry is
    // an exact string, so a sentence that is edited stops being exempt and has to be argued
    // for again.
    expect(ALLOWED.length).toBeLessThanOrEqual(2);
    for (const entry of ALLOWED) {
      expect(entry.because.length, entry.text).toBeGreaterThan(60);
      expect(readFileSync(entry.path, "utf8"), `${entry.path} no longer contains its exception`).toContain(entry.text);
    }
  });

  it("would catch the words if they were there", () => {
    // The test has to be able to fail. These are the sentences it exists to stop.
    const trap = 'const copy = { a: "Great job! Your score on this objective was strong.", b: "Now that you\'ve shown mastery of the skill" };';
    const found = literalsIn(withoutComments(trap)).flatMap(({ text }) =>
      [...BANNED, ...BANNED_TONE].filter((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(text)),
    );
    expect(found).toEqual(expect.arrayContaining(["objective", "mastery", "skill", "score", "great job", "now that you've"]));
  });

  it("names no assessment word in the pop-up's copy at all, exception or not", () => {
    // The second world starts clean and stays clean. Its copy is scanned as strings above and
    // as rendered sentences here, so a word arriving through a template literal is caught too.
    const rendered = popUpStudentCopy().join(" ");
    for (const word of [...BANNED, ...BANNED_TONE]) {
      expect(new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(rendered), `the pop-up says "${word}"`).toBe(false);
    }
  });
});
