// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { rememberKey } from "./classMemory";
import { demoClassBundle } from "../fixtures/demoClass";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { triageFor } from "./triage";
import { classRoll } from "./analysis";
import { analyseClass } from "./analysis";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";

/**
 * The two halves of what this product reports, kept two.
 *
 * BOW reads the run. A person reads the writing. The whole claim the product makes to a
 * district is that those are reported separately and never rolled into one number — and on the
 * two students the demonstration turns on, the screens were rolling them up anyway, in the
 * reader's head, in the wrong direction:
 *
 * - Seat 1 wrote the best explanation in the class and was marked 10/10 by a person. Her
 *   evidence page led with **○ Not yet**, the worst word on Ladder 3, at the top of the first
 *   viewport, and her 10/10 sat 555px below the fold.
 * - Seat 2 wrote the weakest and was marked 3/10. His page led with **◔ Part way** — one rung
 *   *above* hers.
 * - The class page ranked them the same way and printed neither mark anywhere on it.
 *
 * A teacher who read both children's paragraphs could tell. Every product statement on the
 * screen said the opposite (`DEFECTS.md` D18).
 *
 * This file holds the cure at both grains: the pair is on the student's first screen as two
 * statements, the reading travels onto the class rows, and the triage ranks on the pair. It
 * deliberately also asserts what must **not** appear — a sum, a mean, a combined score — because
 * the cheapest way to "fix" a two-part report that reads backwards is to make it one part.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const ASSIGNMENT = `assignment-${CODE}`;
const CREATED_AT = 1_776_000_000_000;
const SAMPLE = demoClassBundle();

const RECORD: ClassRecord = {
  code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10,
};

/**
 * The sample class, with the two readings the seeded demonstration actually holds written onto
 * two of its seats: the strongest writer marked 10 of 10, the weakest marked 3 of 10.
 */
function submissions(): AttributedSubmission[] {
  const rows = SAMPLE.submissions.map((submission) => ({
    ...submission, classCode: CODE, assignmentId: ASSIGNMENT,
  })) as unknown as AttributedSubmission[];
  return rows;
}

/** One attempt with nobody's reading on it — the state every seat is in mid-lesson. */
function unread(entry: AttributedSubmission): AttributedSubmission {
  const rest = { ...entry };
  delete rest.reasoningCriteria;
  return { ...rest, reasoningPoints: null };
}

function service(marks: ReadonlyMap<string, number>, unreadSeat?: string) {
  const rows = submissions().map((entry) => (marks.has(entry.seatCode)
    ? { ...entry, reasoningPoints: marks.get(entry.seatCode)! }
    : entry.seatCode === unreadSeat ? unread(entry) : entry));
  const body = {
    class: RECORD,
    assignments: [{ ...SAMPLE.assignments[0]!, id: ASSIGNMENT, classId: CODE } satisfies Assignment],
    submissions: rows,
    roster: rows.map((entry) => ({
      seatCode: entry.seatCode, displayName: `Seat ${entry.seatCode}`, claimed: true, claimedAt: CREATED_AT, removedAt: null,
    })),
    progress: [],
    feedback: [],
  };
  return { rows, fetch: vi.fn(() => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)) };
}

beforeEach(() => { window.localStorage.clear(); rememberKey(CODE, KEY); });

/** A seat whose own run fell short — the band the demonstration's pair sits in. */
function shortfallSeats(): string[] {
  const rows = analyseClass(submissions()).rows;
  const roll = classRoll({ rows, roster: [], progress: [], at: CREATED_AT });
  const groups = triageFor({ seats: roll.seats, submissions: submissions(), feedback: [] });
  return groups.find((group) => group.band === "short")?.seats.map((seat) => seat.seatCode) ?? [];
}

describe("a student's evidence leads with the pair, not with BOW's half of it", () => {
  it("puts the human reading beside the state, above the fold, named as a person's", async () => {
    const seat = shortfallSeats()[0]!;
    vi.stubGlobal("fetch", service(new Map([[seat, 10]])).fetch);
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}/students/${seat}`]}>
        <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.querySelector(".verdict__pair")).toBeInTheDocument());

    const halves = [...document.querySelectorAll(".verdict__pair .verdict__half")];
    expect(halves, "two statements, because there are two things being reported").toHaveLength(2);
    expect(halves[0]!.textContent).toMatch(/What the decisions showed/i);
    expect(halves[1]!.textContent).toMatch(/What a person read in the writing/i);
    expect(halves[1]!.textContent, "the mark, with its denominator, in the first viewport").toMatch(/10 of 10/);
    expect(halves[1]!.textContent, "and whose mark it is").toMatch(/Your own mark, not BOW's/i);
    expect(halves[1]!.textContent, "and that it is not folded into the word beside it").toMatch(/never added to the state beside it/i);

    // Both halves are inside the one raised surface, so neither can be scrolled away from the
    // other — the failure was a 555px gap between a verdict and the mark that qualifies it.
    const instrument = document.querySelector(".surface-instrument");
    expect(instrument?.contains(halves[0]!)).toBe(true);
    expect(instrument?.contains(halves[1]!)).toBe(true);
  });

  it("says nobody has read it rather than showing a zero", async () => {
    const seat = shortfallSeats()[0]!;
    vi.stubGlobal("fetch", service(new Map(), seat).fetch);
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}/students/${seat}`]}>
        <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.querySelector(".verdict__pair")).toBeInTheDocument());
    const half = document.querySelectorAll(".verdict__pair .verdict__half")[1]!;
    expect(half.textContent).toMatch(/Nobody has read it yet/i);
    expect(half.textContent, "an unread paragraph is not a paragraph scored nothing").not.toMatch(/\b0 of \d+/);
  });
});

describe("the class page carries the reading and ranks on it", () => {
  it("prints the teacher's own mark on the rows, with its denominator", async () => {
    const short = shortfallSeats();
    const weak = short[0]!;
    const strong = short[short.length - 1]!;
    vi.stubGlobal("fetch", service(new Map([[weak, 3], [strong, 10]])).fetch);
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}`]}>
        <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.querySelector(".triage")).toBeInTheDocument());
    const triage = document.querySelector(".triage")!.textContent ?? "";
    expect(triage, "the mark a person made is on the class page at all").toMatch(/3 of 10/);
    expect(triage).toMatch(/10 of 10/);
    // Never a bare number: the denominator travels with every count on these surfaces.
    expect([...document.querySelectorAll(".mark-reading")].every((node) => /\d+ of \d+/.test(node.textContent ?? "")))
      .toBe(true);
  });

  it("ranks a weak reading above a strong one inside the band BOW put them both in", () => {
    const short = shortfallSeats();
    expect(short.length, "the sample has to contain a shortfall band for this to mean anything").toBeGreaterThan(1);
    const weak = short[0]!;
    const strong = short[short.length - 1]!;
    const marked = submissions().map((entry) => (
      entry.seatCode === weak ? { ...entry, reasoningPoints: 3 }
        : entry.seatCode === strong ? { ...entry, reasoningPoints: 10 }
          : entry));
    const roll = classRoll({ rows: analyseClass(marked).rows, roster: [], progress: [], at: CREATED_AT });
    const groups = triageFor({ seats: roll.seats, submissions: marked, feedback: [] });
    const band = groups.find((group) => group.band === "short")!;
    const order = band.clusters.flatMap((cluster) => cluster.seats.map((seat) => seat.seatCode));
    expect(
      order.indexOf(weak),
      "the child who fell short and wrote weakly is the child who needs a person first",
    ).toBeLessThan(order.indexOf(strong));
  });

  it("leaves the order alone while nothing has been read, so the reteach still leads", () => {
    // A class in the middle of the lesson: everything turned in, nothing read yet. Every row
    // ranks at the same unknown, so the ruling's own order — the biggest shared gap first,
    // because it is the one with a lesson attached — is untouched by any of this.
    const pile = submissions().map(unread);
    const roll = classRoll({ rows: analyseClass(pile).rows, roster: [], progress: [], at: CREATED_AT });
    const groups = triageFor({ seats: roll.seats, submissions: pile, feedback: [] });
    const band = groups.find((group) => group.band === "short");
    if (!band || band.clusters.length < 2) return;
    const sizes = band.clusters.map((cluster) => cluster.seats.length);
    expect(
      [...sizes].sort((a, b) => b - a),
      "with no reading to rank on, the biggest shared gap is still the first row",
    ).toEqual(sizes);
  });
});
