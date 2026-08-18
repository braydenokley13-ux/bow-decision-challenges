// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { analyseClass, classRoll } from "./analysis";
import { RealClassOverview } from "./RealClassPages";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { SubmissionRecord } from "../platform/classes/types";

/**
 * One class, counted once.
 *
 * A teacher's class page carried three answers to "how many turned in", two of them inside
 * one viewport: a headline over submission **records**, a live panel over distinct **seats**
 * that was never checked against the roster, and a student list with a row per record. On a
 * class whose teacher had removed one student and one of whose students had had a second go,
 * that read *5 turned in* above *turned in 4 · still working 0 · not started 1* on a roll of
 * four, listed one child twice, and put a removed seat among named classmates.
 *
 * The test below is not "these numbers are 6" — that would pin the arithmetic of one fixture
 * and pass again the moment somebody re-derives one of them from a different list. It reads
 * every count the page renders and asserts they cannot disagree: the tiles add up to the
 * roll, the headline and the table's denominator are the same number as the tile, the list
 * has one row per student in it, and the export has one row per seat plus one per extra
 * attempt. A class is built underneath it with every shape that broke this — a removed seat
 * that turned work in, a seat with two attempts, a seat mid-run, a seat that never started,
 * and a live progress row for the removed student.
 */

afterEach(cleanup);

const NOW = 1_780_000_000_000;

const record = (submission: SubmissionRecord, over: Partial<SubmissionRecord> = {}): SubmissionRecord =>
  ({ ...submission, classCode: "H4KVW", submittedAt: NOW, ...over });

/** Every shape that has broken a count on this page, in one class. */
function theClass() {
  const submissions: SubmissionRecord[] = [
    record(buildSubmission({ seatCode: "1", setupId: "cousin-room", reserveSeat: true, defenseText: "I reserved the seat early." }),
      { sessionId: "s-1", reasoningPoints: 8, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 1, "C6.4": 3 } }),
    // A seat the teacher removed from the roster, with work in the class and a live
    // checkpoint. Neither may reach a count.
    record(buildSubmission({ seatCode: "2", setupId: "gym-sublet", defenseText: "Removed from the roster." }), { sessionId: "s-2" }),
    record(buildSubmission({ seatCode: "3", setupId: "teammate-share", takeClinics: true, defenseText: "I took the clinics." }),
      { sessionId: "s-3", reasoningPoints: 7, reasoningCriteria: { "C6.1": 2, "C6.2": 1, "C6.3": 1, "C6.4": 3 } }),
    record(buildPopUpSubmission({ seatCode: "4", writeUpText: "I kept the cushion big enough for the generator." }),
      { sessionId: "s-4", reasoningPoints: 9, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 3 } }),
    record(buildSubmission({ seatCode: "5", setupId: "cousin-room", split: { goal: 0.3, reserve: 0.5 }, defenseText: "I kept a big reserve." }),
      { sessionId: "s-5", reasoningPoints: 8, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 1, "C6.4": 3 } }),
    record(buildPopUpSubmission({ seatCode: "6", stopAfterSaturdayThree: true }), { sessionId: "s-6" }),
    // One student, two goes. One student in every count, two rows in the export.
    record(buildSubmission({ seatCode: "7", setupId: "gym-sublet", defenseText: "First go." }), { sessionId: "s-7a", submittedAt: NOW - 60_000 }),
    record(buildSubmission({ seatCode: "7", setupId: "cousin-room", takeClinics: true, defenseText: "Second go, and I moved the reserve." }),
      { sessionId: "s-7b", reasoningPoints: 6, reasoningCriteria: { "C6.1": 1, "C6.2": 1, "C6.3": 1, "C6.4": 3 } }),
  ];
  const roster = [
    { seatCode: "1", displayName: "Ana R.", claimed: true, removedAt: null },
    { seatCode: "2", displayName: "Marcus O.", claimed: false, removedAt: NOW - 3_600_000 },
    { seatCode: "3", displayName: "Leila H.", claimed: true, removedAt: null },
    { seatCode: "4", displayName: "Dev K.", claimed: true, removedAt: null },
    { seatCode: "5", displayName: "Priya S.", claimed: true, removedAt: null },
    { seatCode: "6", displayName: "Sam T.", claimed: true, removedAt: null },
    { seatCode: "7", displayName: "Noor A.", claimed: true, removedAt: null },
    { seatCode: "8", displayName: "Jonah B.", claimed: true, removedAt: null },
    { seatCode: "9", displayName: "Rae M.", claimed: true, removedAt: null },
  ];
  const progress = [
    { seatCode: "8", worldId: "basketball", stage: "working-plan", startedAt: NOW - 600_000, updatedAt: NOW - 300_000 },
    // The removed student's browser is still open. It is not a student in this class.
    { seatCode: "2", worldId: "basketball", stage: "defense", startedAt: NOW - 900_000, updatedAt: NOW - 120_000 },
  ];
  return { submissions, roster, progress };
}

/** The one class every count on the page has to agree with. */
function rollOfTheClass() {
  const { submissions, roster, progress } = theClass();
  return classRoll({ rows: analyseClass(submissions).rows, roster, progress });
}

async function openTheClassPage() {
  const { submissions, roster, progress } = theClass();
  const original = globalThis.fetch;
  let copied = "";
  Object.defineProperty(globalThis.navigator, "clipboard", {
    configurable: true,
    value: { writeText: (text: string) => { copied = text; return Promise.resolve(); } },
  });
  globalThis.fetch = (() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      class: { code: "H4KVW", label: "Period 3", challengeId: "plan-under-pressure", createdAt: NOW, expiresAt: NOW + 1 },
      assignments: [{
        id: "assignment-H4KVW-1",
        classId: "H4KVW",
        objectiveRef: null,
        competencyIds: ["plan-within-income", "adapt-a-plan"],
        allowedWorldIds: ["basketball", "food-truck"],
        studentChoosesWorld: true,
        format: "decision-challenge",
        assignedStudentIds: null,
        createdAt: NOW,
      }],
      submissions: submissions.map((submission) => ({ ...submission, assignmentId: "assignment-H4KVW-1" })),
      roster,
      progress,
      feedback: [],
    }),
  })) as unknown as typeof fetch;
  const view = render(
    <MemoryRouter initialEntries={["/educator/class/H4KVW?key=abcdefghijklmnop"]}>
      <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(view.container.querySelector(".live-state")).not.toBeNull());
  return { view, restore: () => { globalThis.fetch = original; }, copy: () => copied };
}

/** Every number on the page that is a count of this class, read off the rendered DOM. */
function countsOnScreen(container: HTMLElement) {
  const text = container.textContent ?? "";
  const tiles = [...container.querySelectorAll(".live-state__counts dd")].map((node) => node.textContent ?? "");
  const caption = container.querySelector(".micro-table caption")?.textContent ?? "";
  return {
    /** "6 turned in" in the header. */
    header: Number(/(\d+) turned in/.exec(container.querySelector(".class-header")?.textContent ?? "")?.[1]),
    /** The same claim in the sentence under the headline. */
    lead: Number(/(\d+) turned in/.exec(text)?.[1]),
    turnedIn: Number(tiles[0]),
    stillWorking: Number(tiles[1]),
    notStarted: Number(tiles[2]),
    /**
     * "Counts across the 5 of 6 with a usable result — one whose written explanation
     * somebody has read." The trailing clause is new: "usable result" was precise,
     * load-bearing and defined two sections further up the page, which is the wrong place
     * for the definition of the denominator every number under it is divided by.
     */
    captionOf: Number(/of (\d+) with a usable result/.exec(caption)?.[1]),
    captionAssessed: Number(/across the (\d+) of/.exec(caption)?.[1]),
    students: container.querySelectorAll(".row-list > a").length,
  };
}

describe("no two counts of one class can disagree", () => {
  it("adds the live tiles up to the class and nothing else", async () => {
    const { view, restore } = await openTheClassPage();
    try {
      const roll = rollOfTheClass();
      const counts = countsOnScreen(view.container);
      expect(counts.turnedIn + counts.stillWorking + counts.notStarted).toBe(roll.seats.length);
      // The removed seat turned work in and has a live checkpoint. It is in neither tile.
      expect(counts.turnedIn).toBe(roll.turnedIn);
      expect(counts.stillWorking).toBe(roll.stillWorking);
      expect(counts.notStarted).toBe(roll.notStarted);
    } finally { restore(); }
  });

  it("says the same number in the header, the headline sentence and the table's denominator", async () => {
    const { view, restore } = await openTheClassPage();
    try {
      const counts = countsOnScreen(view.container);
      expect(counts.header).toBe(counts.turnedIn);
      expect(counts.lead).toBe(counts.turnedIn);
      expect(counts.captionOf).toBe(counts.turnedIn);
      // A denominator can never be smaller than what it is dividing.
      expect(counts.captionAssessed).toBeLessThanOrEqual(counts.captionOf);
    } finally { restore(); }
  });

  it("lists one row per student who turned in, and never a seat twice", async () => {
    const { view, restore } = await openTheClassPage();
    try {
      const counts = countsOnScreen(view.container);
      expect(counts.students).toBe(counts.turnedIn);
      const names = [...view.container.querySelectorAll(".row-list > a small:first-child")].map((node) => node.textContent);
      expect(new Set(names).size).toBe(names.length);
      // A seat the teacher removed is not a student in this class, named or unnamed.
      expect(names).not.toContain("Seat 2");
      expect(names).not.toContain("Marcus O.");
    } finally { restore(); }
  });

  it("copies a gradebook shaped like the roll: every seat, plus a row per extra attempt", async () => {
    const { view, restore, copy } = await openTheClassPage();
    try {
      const roll = rollOfTheClass();
      screen.getByRole("button", { name: /copy .* for a gradebook/i }).click();
      await waitFor(() => expect(copy()).not.toBe(""));
      const [header, ...rows] = copy().split("\n").map((line) => line.split("\t"));
      expect(rows).toHaveLength(roll.seats.reduce((total, seat) => total + Math.max(1, seat.attempts.length), 0));
      for (const row of rows) expect(row).toHaveLength(header!.length);
      const seatColumn = rows.map((row) => row[0]);
      for (const seat of roll.seats) expect(seatColumn).toContain(seat.seatCode);
      expect(seatColumn).not.toContain("2");
      // The student who was there and turned nothing in is a row, because a missing row is a
      // silent off-by-one for every name below it.
      const absent = rows.find((row) => row[0] === "9")!;
      expect(absent[1]).toBe("Rae M.");
      expect(absent.slice(2).every((cell) => cell === "")).toBe(true);
      // And the message says what was copied, in the same terms.
      expect(view.container.querySelector(".class-export p")?.textContent).toContain(`${rows.length} rows copied`);
    } finally { restore(); }
  });
});

describe("the roll itself", () => {
  it("is exhaustive: every seat is in exactly one state", () => {
    const roll = rollOfTheClass();
    expect(roll.turnedIn + roll.stillWorking + (roll.notStarted ?? 0)).toBe(roll.seats.length);
    expect(roll.rows).toHaveLength(roll.turnedIn);
    expect(new Set(roll.seats.map((seat) => seat.seatCode)).size).toBe(roll.seats.length);
  });

  it("counts a seat with two attempts as one student and keeps both attempts", () => {
    const roll = rollOfTheClass();
    const twice = roll.seats.find((seat) => seat.seatCode === "7")!;
    expect(twice.attempts).toHaveLength(2);
    expect(twice.latest?.sessionId).toBe("s-7b");
    expect(roll.rows.filter((row) => row.seatCode === "7")).toHaveLength(1);
  });

  it("keeps a removed seat out of the class and out of the attempt list", () => {
    const roll = rollOfTheClass();
    expect(roll.seats.map((seat) => seat.seatCode)).not.toContain("2");
    expect(roll.attempts.map((row) => row.sessionId)).not.toContain("s-2");
    expect(roll.excluded.map((row) => row.sessionId)).toEqual(["s-2"]);
  });

  it("says it cannot know who has not started when the class has no roster", () => {
    const { submissions } = theClass();
    const roll = classRoll({ rows: analyseClass(submissions).rows, roster: [], progress: [] });
    expect(roll.hasRoster).toBe(false);
    expect(roll.notStarted).toBeNull();
    // Everyone who turned in is still a student, so the counts it can make still add up.
    expect(roll.turnedIn + roll.stillWorking).toBe(roll.seats.length);
  });
});
