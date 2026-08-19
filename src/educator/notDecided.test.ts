import { describe, expect, it } from "vitest";
import { analyseClass, choiceDistributions } from "./analysis";
import type { StudentRow } from "./analysis";

/**
 * A student who was never asked is not a student who answered.
 *
 * Four fields on `StudentRow` carried a Basketball decision, and all four were built with
 * `?? false`. That reads "we do not know" as "no", and the shares beneath them asked
 * `!row.reservedSeat` and `!row.tookClinics` — so a run with no final board was printed under
 * **"Waited and paid the full price"** and **"Kept the Saturdays"**, by seat number, on the
 * page whose entire job is to be checkable. `Debrief.tsx` did the same with a ternary on
 * truthiness, on the sheet a teacher carries to the front of the room.
 *
 * `choiceDistributions` already argues this exact case one function above, about market runs:
 * counting a student under a choice they were never offered "is not a rounding error — it is
 * BOW telling a teacher, by seat number, that a child made a choice they were never offered".
 * The same sentence covers a child who reached the question and left it open, and these tests
 * are that sentence made mechanical.
 *
 * Not reachable through the UI today — the final board waits on both calls — which is exactly
 * why it needs a test. It was one screen change away from being true, and it would have been
 * true silently.
 */

function rowWith(overrides: Partial<StudentRow>): StudentRow {
  return {
    seatCode: "1", worldId: "basketball",
    countedBonusInPlan: null, countedShowcase: null, tookClinics: null, reservedSeat: null,
    ...overrides,
  } as StudentRow;
}

/** Every seat named anywhere in the distributions for one question. */
const namedIn = (rows: StudentRow[], id: string): string[] =>
  choiceDistributions(rows).flatMap((question) =>
    question.shares.filter((entry) => entry.id === id).flatMap((entry) => entry.seats));

describe("an undecided student is counted under neither answer", () => {
  it("does not file a student who never decided under the opposite choice", () => {
    const rows = [rowWith({ seatCode: "1", reservedSeat: null }), rowWith({ seatCode: "2", reservedSeat: false })];

    expect(namedIn(rows, "waited"), "seat 1 never decided and was named as having waited").toEqual(["2"]);
    expect(namedIn(rows, "reserved")).toEqual([]);
  });

  it("does the same for the Saturday clinics", () => {
    const rows = [rowWith({ seatCode: "1", tookClinics: null }), rowWith({ seatCode: "2", tookClinics: false })];

    expect(namedIn(rows, "kept"), "seat 1 never decided and was named as having kept the Saturdays").toEqual(["2"]);
    expect(namedIn(rows, "took")).toEqual([]);
  });

  /** A decision that was made is still reported. The fix must not silence real answers. */
  it("still names the students who did decide, both ways", () => {
    const rows = [
      rowWith({ seatCode: "1", reservedSeat: true, tookClinics: true }),
      rowWith({ seatCode: "2", reservedSeat: false, tookClinics: false }),
      rowWith({ seatCode: "3", reservedSeat: null, tookClinics: null }),
    ];

    expect(namedIn(rows, "reserved")).toEqual(["1"]);
    expect(namedIn(rows, "waited")).toEqual(["2"]);
    expect(namedIn(rows, "took")).toEqual(["1"]);
    expect(namedIn(rows, "kept")).toEqual(["2"]);
  });

  /**
   * The type is the fix. `?? false` type-checks perfectly and reads fine in review, which is
   * how it survived — so this asserts the shape rather than the arithmetic.
   */
  it("keeps the four decisions nullable, so absence cannot become an answer", () => {
    const row = rowWith({});
    for (const field of ["countedBonusInPlan", "countedShowcase", "tookClinics", "reservedSeat"] as const) {
      expect(row[field], `${field} must be able to say "not decided"`).toBeNull();
    }
  });

  /** A real class still reports normally — the fixture above is not the only thing that works. */
  it("leaves an ordinary class unchanged", () => {
    const analysis = analyseClass([]);
    expect(analysis.rows).toEqual([]);
  });
});
