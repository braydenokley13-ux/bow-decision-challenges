import { describe, expect, it } from "vitest";
import { gradebookRows, gradebookTsv, type GradebookSeat } from "./gradebook";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { AttributedSubmission, SubmissionRecord } from "../platform/classes/types";

/**
 * The shape the export has to have, because of what a teacher does with it.
 *
 * They paste it beside a column of their own — their roster, in their order — and nothing in
 * a spreadsheet will tell them if the rows do not line up. So the properties below are about
 * shape rather than about content, and every one of them was reproduced as a real clipboard
 * on a running class: a student who was on the roster and did not turn in had **no row at
 * all** (a silent off-by-one from that student down), a seat the teacher had **removed** had
 * one, and one seat appeared **twice with contradictory numbers** and nothing in the row to
 * say which attempt was which.
 */

const attributed = (submission: SubmissionRecord): AttributedSubmission =>
  ({ ...submission, assignmentId: "assignment-TEST-legacy" });

function seatsOfAClass(): GradebookSeat[] {
  return [
    {
      seatCode: "1",
      displayName: "Ana R.",
      attempts: [attributed(buildSubmission({ seatCode: "1", defenseText: "I kept the reserve." }))],
    },
    {
      // Two goes at it. One student, two rows, and the export has to say which is which.
      seatCode: "3",
      displayName: "Priya S.",
      attempts: [
        attributed({ ...buildSubmission({ seatCode: "3", defenseText: "First go." }), sessionId: "session-first", submittedAt: 10 }),
        attributed({ ...buildSubmission({ seatCode: "3", setupId: "gym-sublet", defenseText: "Second go." }), sessionId: "session-second", submittedAt: 20 }),
      ],
    },
    { seatCode: "4", displayName: "Dev K.", attempts: [attributed(buildPopUpSubmission({ seatCode: "4" }))] },
    // On the roster, turned nothing in. The whole point of the shape.
    { seatCode: "5", displayName: "Leila H.", attempts: [] },
  ];
}

const cellsOf = (tsv: string) => tsv.split("\n").map((line) => line.split("\t"));

describe("every live roster seat appears in the export, exactly once per attempt", () => {
  it("gives a seat that turned nothing in a row with their name and nothing after it", () => {
    const rows = gradebookRows(seatsOfAClass());
    const absent = rows.filter((row) => row.line === null);
    expect(absent).toHaveLength(1);
    expect(absent[0]?.seatCode).toBe("5");

    const [header, ...body] = cellsOf(gradebookTsv(rows));
    const line = body.find((cells) => cells[0] === "5")!;
    expect(line[1]).toBe("Leila H.");
    // An absence, not a zero: every other cell is empty rather than filled in with a number
    // nobody measured.
    expect(line.slice(2).every((cell) => cell === "")).toBe(true);
    expect(line).toHaveLength(header!.length);
  });

  it("has one row per seat plus one per extra attempt, in seat order", () => {
    const seats = seatsOfAClass();
    const rows = gradebookRows(seats);
    const expected = seats.reduce((total, seat) => total + Math.max(1, seat.attempts.length), 0);
    expect(rows).toHaveLength(expected);
    expect(rows.map((row) => row.seatCode)).toEqual(["1", "3", "3", "4", "5"]);
  });

  it("tells two attempts of one seat apart, in the row itself", () => {
    const rows = gradebookRows(seatsOfAClass());
    const [header, ...body] = cellsOf(gradebookTsv(rows));
    const attemptColumn = header!.indexOf("Attempt");
    const sessionColumn = header!.indexOf("Session");
    expect(attemptColumn).toBeGreaterThan(-1);
    expect(sessionColumn).toBeGreaterThan(-1);
    const priya = body.filter((cells) => cells[0] === "3");
    expect(priya.map((cells) => cells[attemptColumn])).toEqual(["1", "2"]);
    expect(priya.map((cells) => cells[sessionColumn])).toEqual(["session-first", "session-second"]);
    // Two rows that disagree about a student are only readable if they say which run each
    // one is. Nothing else in the row does that.
    expect(new Set(priya.map((cells) => cells[sessionColumn])).size).toBe(2);
  });

  it("carries nothing from a seat the caller left out of the class", () => {
    // Removal is expressed by not being in the roll, so the export cannot re-admit a seat:
    // there is no path from a submission to a row that does not go through a seat.
    const rows = gradebookRows(seatsOfAClass().filter((seat) => seat.seatCode !== "3"));
    expect(rows.map((row) => row.seatCode)).not.toContain("3");
    expect(gradebookTsv(rows)).not.toContain("session-first");
  });
});

describe("every row is the same width as the header", () => {
  it("keeps the columns aligned when runs speak to different competencies", () => {
    // A run that stopped early answers fewer competencies than a full one. Reading the
    // headings off the first row put the short run's answers under the long run's headings.
    const seats: GradebookSeat[] = [
      { seatCode: "1", displayName: "Short", attempts: [attributed(buildPopUpSubmission({ seatCode: "1", stopAfterSaturdayThree: true }))] },
      { seatCode: "2", displayName: "Full", attempts: [attributed(buildPopUpSubmission({ seatCode: "2" }))] },
      { seatCode: "3", displayName: "Absent", attempts: [] },
    ];
    for (const order of [seats, [...seats].reverse()]) {
      const [header, ...body] = cellsOf(gradebookTsv(gradebookRows(order)));
      for (const line of body) expect(line).toHaveLength(header!.length);
    }
  });

  /**
   * The skill columns are headed `Skill: <the skill's own sentence>` rather than by the
   * sentence alone.
   *
   * A tab-separated file is the one artefact of this product that leaves it, and it is read
   * months later by somebody who has never seen a BOW screen. Everywhere else the rule is
   * that the first time a BOW word appears on a page its sentence appears with it; a TSV has
   * no page to put that on — a legend row above the data shifts every column, and a legend
   * block below it lands on whichever students a teacher pastes underneath. So the header row
   * *is* the glossary, and the prefix is what makes a cell reading "Not yet" legible under a
   * twenty-word sentence.
   */
  it("puts each skill's answer under that skill's own heading, named as a skill", () => {
    const seats: GradebookSeat[] = [
      { seatCode: "1", displayName: "Short", attempts: [attributed(buildPopUpSubmission({ seatCode: "1", stopAfterSaturdayThree: true }))] },
      { seatCode: "2", displayName: "Full", attempts: [attributed(buildPopUpSubmission({ seatCode: "2" }))] },
    ];
    const rows = gradebookRows(seats);
    const [header, ...body] = cellsOf(gradebookTsv(rows));
    for (const [index, row] of rows.entries()) {
      for (const competency of row.line?.competencies ?? []) {
        const column = header!.indexOf(`Skill: ${competency.statement}`);
        expect(column, `no column headed “Skill: ${competency.statement}”`).toBeGreaterThan(-1);
        expect(body[index]![column]).not.toBe("");
      }
    }
  });
});
