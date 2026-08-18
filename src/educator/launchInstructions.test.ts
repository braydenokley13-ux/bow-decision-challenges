import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * What a teacher is told to do has to be a thing a student can actually do.
 *
 * Four teacher surfaces told a teacher to give every student **a class code and a seat
 * number**. There is no seat number anywhere in the student flow and has not been since the
 * sign-in moved to `/join`: a student types the class code, and then either the code on the
 * card their teacher printed or the name they want their teacher to see. A teacher who read
 * the printed instruction out loud handed thirty students a number to type into a box that
 * does not exist, in the first two minutes of the lesson, in front of the room.
 *
 * The invariant is not "the words *seat number* are banned". It is that **the teacher's
 * instructions and the student's screens describe the same act**. So this scans the surfaces
 * a teacher reads for an instruction naming a step the join flow does not have, and pins what
 * the join flow actually collects, so a change to either side has to be a change to both.
 */

/** Files a teacher reads sentences out of. */
function teacherSources(): string[] {
  const educator = readdirSync("src/educator", { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/educator/${entry}`);
  return [...educator, "src/App.tsx"].sort();
}

/** Comments are not read by anybody in a classroom. The `[^:]` guard protects `https://`. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** An instruction that names a seat number as something a person is given or types. */
const SEAT_INSTRUCTION = /\bseat (?:number|code)s?\b|\bpicks? a seat\b/gi;

/**
 * The offences that are still on the page, each owned by a file this change could not touch.
 *
 * This list is a quarantine, not a permission. The assertion below is an equality, so adding
 * a new instruction fails — and so does **fixing** one of these without deleting its line
 * from here, which is the only way a list like this stays honest. If a test failure brought
 * you here saying an entry no longer matches: good, that surface has been fixed. Delete the
 * entry.
 */
/**
 * Empty, and it took three surfaces to get there.
 *
 * This list existed so the check could ship before the sentences were fixed, without either
 * lying about the state of the product or blocking on somebody else's file. Every entry has now
 * been rewritten around the sign-in that exists: paste the class list, print the cards, and a
 * student types the class code and the code on their own card.
 *
 * It stays as an empty array rather than being deleted along with the machinery. A future
 * surface that reintroduces the instruction fails this test with a message telling whoever
 * wrote it what the student flow actually asks for — and if that surface is genuinely ahead of
 * the flow rather than behind it, quarantining it here is the honest way to say so.
 */
const PENDING: readonly string[] = [];

function offencesIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  const lines = source.split("\n");
  return [...source.matchAll(SEAT_INSTRUCTION)].map((match) => {
    const line = source.slice(0, match.index).split("\n").length;
    // The sentence, as a teacher would read it: the tags around it are not the offence.
    const sentence = (lines[line - 1] ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return `${path} — ${sentence}`;
  });
}

describe("teacher instructions describe the sign-in students actually meet", () => {
  it("tells no teacher to hand out a seat number", () => {
    const offences = teacherSources().flatMap(offencesIn);
    expect(
      offences,
      "a teacher surface names a step the student flow does not have. If the extra line is one "
      + "you just fixed, delete its entry from PENDING above; if it is one you just wrote, the "
      + "student has no seat number to type",
    ).toEqual(PENDING);
  });

  it("pins the fact those instructions are wrong about: the join screen has no seat", () => {
    // The other half of the agreement. The day a seat field comes back, this fails and the
    // sentences above stop being wrong — which is the moment to reread them, not to delete
    // this. It checks for the absence of a seat rather than for an exact set of fields,
    // because the fields a student is asked for are allowed to change and this claim is not.
    const join = withoutComments(readFileSync("src/student/Join.tsx", "utf8"));
    const asked = [...join.matchAll(/<input\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1] ?? "");
    expect(asked, "the class code is the one thing every student types").toContain("class-code");
    expect(asked.filter((id) => /seat/i.test(id))).toEqual([]);
    expect(join).not.toMatch(SEAT_INSTRUCTION);
  });
});
