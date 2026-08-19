// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { analyseClass, classRoll } from "./analysis";
import { countedSubmissions } from "./useObjectiveEvidence";
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
    // A run that reached its last screen and never arrived: a refused submission, or a
    // Chromebook that lost the network on the way. The stage a browser is sitting on is called
    // "Turned in" by both stories, and this seat has turned nothing in.
    { seatCode: "9", worldId: "basketball", stage: "submitted", startedAt: NOW - 800_000, updatedAt: NOW - 60_000 },
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

/**
 * Every number on the page that is a count of this class, read off the rendered DOM.
 *
 * The tiles read `6 of 9` rather than `6` since the lead was rewritten, and that is the point
 * of the rewrite rather than an accident of it: a tile a teacher has to hold the class size in
 * their head to read is the same defect as a headline whose denominator is in a caption. So
 * this parses the pair, and the assertions below check both halves — the count, and that every
 * tile is counted against the same class.
 */
function tileCounts(container: HTMLElement): { label: string; count: number; of: number | null }[] {
  return [...container.querySelectorAll(".live-state__counts > div")].map((node) => {
    const label = node.querySelector("dt")?.textContent ?? "";
    const value = node.querySelector("dd")?.textContent ?? "";
    const pair = /(\d+) of (\d+)/.exec(value);
    return pair
      ? { label, count: Number(pair[1]), of: Number(pair[2]) }
      : { label, count: Number(value), of: null };
  });
}

function countsOnScreen(container: HTMLElement) {
  const text = container.textContent ?? "";
  const tiles = tileCounts(container);
  const tile = (name: string) => tiles.find((entry) => entry.label === name);
  const caption = container.querySelector(".micro-table caption")?.textContent ?? "";
  return {
    tiles,
    /** "6 of 9 turned in" in the headline. */
    header: Number(/(\d+) of \d+ turned in/.exec(container.querySelector(".class-header")?.textContent ?? "")?.[1]),
    /** The same claim in the sentence under the headline, or in the headline itself. */
    lead: Number(/(\d+) of \d+ turned in/.exec(text)?.[1]),
    turnedIn: tile("Turned in")?.count ?? NaN,
    stillWorking: tile("Working right now")?.count ?? NaN,
    startedQuiet: tile("Started, not turned in")?.count ?? 0,
    notStarted: tile("Not started")?.count ?? NaN,
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
      expect(counts.turnedIn + counts.stillWorking + counts.startedQuiet + counts.notStarted).toBe(roll.seats.length);
      // The removed seat turned work in and has a live checkpoint. It is in neither tile.
      expect(counts.turnedIn).toBe(roll.turnedIn);
      expect(counts.stillWorking).toBe(roll.stillWorking);
      expect(counts.notStarted).toBe(roll.notStarted);
    } finally { restore(); }
  });

  it("counts every tile against the same class, on the face of the tile", async () => {
    const { view, restore } = await openTheClassPage();
    try {
      const roll = rollOfTheClass();
      const tiles = tileCounts(view.container);
      expect(tiles.length).toBeGreaterThanOrEqual(3);
      for (const tile of tiles) {
        // No tile is a bare number. Each says what it is a count of, in the tile itself.
        expect(tile.of, `"${tile.label}" reads "${tile.count}" with no denominator`).toBe(roll.seats.length);
        expect(tile.count).toBeLessThanOrEqual(roll.seats.length);
      }
    } finally { restore(); }
  });

  it("says the same number in the headline, the sentence under it and the table's denominator", async () => {
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

  /**
   * The panel a teacher walks the room from, and the two facts it may not conflate.
   *
   * A student red team found this screen reporting *"Clever Cam — Turned in — 6 min ago"* about
   * a child who had never played a screen, directly above a list of who had turned in that did
   * not contain him. The row was a checkpoint sitting on the run's last stage, and both stories
   * name that stage "Turned in" — the right words for a run that arrived and the worst possible
   * words for one that did not. She read the row and left him alone.
   */
  it("never says a student turned in on the panel that says who is still working", async () => {
    const { view, restore } = await openTheClassPage();
    try {
      const working = [...view.container.querySelectorAll(".live-state__list li")].map((node) => node.textContent ?? "");
      expect(working.length).toBeGreaterThan(0);
      for (const row of working) expect(row.toLowerCase()).not.toContain("turned in");
      // And the two panels on this screen describe two disjoint sets of children, because the
      // seat is in exactly one state.
      const turnedIn = [...view.container.querySelectorAll(".row-list > a small:first-child")].map((node) => node.textContent ?? "");
      const stillGoing = [...view.container.querySelectorAll(".live-state__list li a")].map((node) => node.textContent ?? "");
      for (const name of stillGoing) expect(turnedIn.some((entry) => entry.startsWith(name))).toBe(false);
      // The one row that needs a teacher to walk over says so in words rather than in a stage
      // name a teacher has to decode.
      expect(view.container.textContent).toContain("Reached the last screen — nothing arrived");
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
    expect(roll.turnedIn + roll.stillWorking + roll.startedQuiet + (roll.notStarted ?? 0)).toBe(roll.seats.length);
    expect(roll.rows).toHaveLength(roll.turnedIn);
    expect(new Set(roll.seats.map((seat) => seat.seatCode)).size).toBe(roll.seats.length);
  });

  /**
   * "Still working" is a claim in the present tense, and it was being made about Tuesday.
   *
   * The tile sits under a heading that reads **RIGHT NOW**, and a checkpoint never aged out of
   * it — so fourteen minutes after a browser closed it still said three children were working,
   * and so did Wednesday morning. The counts are the same seats either way; what changes is
   * which of two true sentences is said about them.
   */
  it("stops calling a child at a keyboard one whose browser went quiet before the lesson ended", () => {
    const { submissions, roster, progress } = theClass();
    const rows = analyseClass(submissions).rows;
    const duringTheLesson = classRoll({ rows, roster, progress, at: NOW });
    expect(duringTheLesson.stillWorking).toBe(2);
    expect(duringTheLesson.startedQuiet).toBe(0);
    const theNextMorning = classRoll({ rows, roster, progress, at: NOW + 16 * 60 * 60 * 1000 });
    expect(theNextMorning.stillWorking).toBe(0);
    expect(theNextMorning.startedQuiet).toBe(2);
    // The child does not vanish and is not reclassified as absent: they started, and they did
    // not turn in, and both halves of that are still on the page.
    expect(theNextMorning.turnedIn + theNextMorning.stillWorking + theNextMorning.startedQuiet + (theNextMorning.notStarted ?? 0))
      .toBe(theNextMorning.seats.length);
    expect(theNextMorning.notStarted).toBe(duringTheLesson.notStarted);
  });

  /**
   * A checkpoint is not a submission, on any surface, ever.
   *
   * The student red team found a teacher's live panel reporting *"Clever Cam — Turned in"*
   * about a child who had never played a screen, three inches above a list of who had turned in
   * that did not contain him. Two facts were being conflated: a seat with a run in progress on
   * some device, and a seat whose work arrived here.
   */
  it("never reads a seat with a checkpoint and no submission as turned in", () => {
    const { submissions, roster } = theClass();
    const rows = analyseClass(submissions).rows;
    // Seat 9 turned nothing in. Their browser is sitting on the last screen of the run, which
    // is what a rejected submission or a lost network leaves behind.
    const roll = classRoll({
      rows,
      roster,
      progress: [{ seatCode: "9", updatedAt: NOW - 60_000 }],
      at: NOW,
    });
    const seat = roll.seats.find((entry) => entry.seatCode === "9")!;
    expect(seat.state).not.toBe("turned-in");
    expect(seat.latest).toBeNull();
    expect(seat.attempts).toHaveLength(0);
    expect(roll.rows.map((row) => row.seatCode)).not.toContain("9");
    expect(roll.awaitingReading).not.toContain("9");
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

/**
 * The third surface, which was counting a different class from the other two.
 *
 * The class page counted **students** and the objective page counted **submission records**,
 * so one class reported *11 of 12 assessed* on one screen and *12 of 13 assessed* on the
 * other, inside the same minute, with the difference being one child's second go and one
 * seat the teacher had taken off the roll. A teacher reading a number aloud has to be able to
 * have it checked against the next screen.
 */
describe("the objective page counts the class the class page counts", () => {
  it("reads one attempt per student, and none from a seat that was removed", () => {
    const { submissions, roster } = theClass();
    const attributed = submissions.map((submission) => ({ ...submission, assignmentId: "assignment-H4KVW-1" }));
    const counted = countedSubmissions(attributed, roster);
    const roll = classRoll({ rows: analyseClass(submissions).rows, roster });
    expect(counted).toHaveLength(roll.turnedIn);
    expect(new Set(counted.map((entry) => entry.seatCode)).size).toBe(counted.length);
    // Seat 7 had two goes: their later one, once.
    expect(counted.filter((entry) => entry.seatCode === "7").map((entry) => entry.sessionId)).toEqual(["s-7b"]);
    // Seat 2 is off the roll and their work is counted nowhere.
    expect(counted.map((entry) => entry.seatCode)).not.toContain("2");
  });
});
