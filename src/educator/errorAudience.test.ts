import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLASS_ERROR_MESSAGES, educatorClassError, type ClassErrorCode } from "../platform/classes/types";

/**
 * A teacher does not have a teacher.
 *
 * `CLASS_ERROR_MESSAGES` is written for a student at the join screen, and that is the right
 * default — it is what almost every one of these sentences renders to. But the educator
 * surfaces imported the same map, so a teacher whose class would not open was told to
 * "check the letters with your teacher", and a teacher whose class had aged out was told to
 * "ask your teacher for a new code". That is the product losing track of who is reading at
 * the one moment the reader has lost a room full of student work.
 *
 * Two of these tests are ordinary assertions about wording. The third is a source scan,
 * because the defect was never that a sentence was wrong — every one of those sentences is
 * right in front of a student. The defect was an *import*. Only a test that reads the
 * imports can catch it coming back.
 */

const EDUCATOR_DIR = join(__dirname);

function educatorSources(): { path: string; text: string }[] {
  return readdirSync(EDUCATOR_DIR)
    .filter((name) => (name.endsWith(".ts") || name.endsWith(".tsx")) && !name.includes(".test."))
    .map((name) => ({ path: `src/educator/${name}`, text: readFileSync(join(EDUCATOR_DIR, name), "utf8") }));
}

const CODES = Object.keys(CLASS_ERROR_MESSAGES) as ClassErrorCode[];

describe("errors know which adult is reading them", () => {
  /**
   * The literal defect. Four of the eight student sentences hand the reader off to a
   * teacher; none of the four may survive into the adult's copy of that same failure.
   */
  it("never tells a teacher to ask their teacher", () => {
    const misaddressed = CODES
      .map((code) => ({ code, message: educatorClassError(code) }))
      .filter(({ message }) => /your teacher|ask your teacher|with your teacher/i.test(message));

    expect(misaddressed).toEqual([]);
  });

  /**
   * The student wording is not deleted, only overridden. If a future edit "fixes" the
   * audience by rewriting the student map, the child at the join screen loses the sentence
   * that tells them what to do, and this fails instead.
   */
  it("leaves the student wording alone", () => {
    expect(CLASS_ERROR_MESSAGES.class_not_found).toMatch(/with your teacher/);
    expect(CLASS_ERROR_MESSAGES.class_expired).toMatch(/ask your teacher/i);
  });

  /**
   * Every code still says something. An override that is added and then emptied, or a new
   * code added to the union with no sentence at all, would render an educator a blank.
   */
  it("says something for every code, to both audiences", () => {
    for (const code of CODES) {
      expect(CLASS_ERROR_MESSAGES[code].length, `student text for ${code}`).toBeGreaterThan(10);
      expect(educatorClassError(code).length, `educator text for ${code}`).toBeGreaterThan(10);
    }
  });

  /**
   * The one that would have caught it. `educatorClassError` only helps if the educator
   * surfaces call it, and the original bug was that they did not — they indexed the student
   * map directly, which type-checks perfectly and reads fine in review.
   */
  it("keeps educator surfaces off the student map", () => {
    const offenders = educatorSources()
      .filter(({ text }) => /\bCLASS_ERROR_MESSAGES\b/.test(text))
      .map(({ path }) => path);

    expect(offenders, "these render student copy to a teacher; call educatorClassError instead").toEqual([]);
  });
});
