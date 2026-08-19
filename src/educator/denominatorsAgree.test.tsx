// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview } from "./RealClassPages";
import { ObjectiveDetail } from "./ObjectivePages";
import { classSpineFrom } from "./classSpine";
import { countedSubmissions } from "./useObjectiveEvidence";
import { rememberClass } from "./classMemory";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { Assignment, AttributedSubmission, SubmissionRecord } from "../platform/classes/types";

/**
 * One class, one set of children, one denominator per set — on every surface that counts them.
 *
 * This is the third time tonight that two numbers on one screen have described the same class
 * and disagreed, in three different files: the class page counted submission records in its
 * headline and distinct seats in its tiles; the objective page counted every record where the
 * class page counted one attempt per student, and reported "12 of 13 assessed" against the
 * class page's "11 of 12" inside the same minute; and a reviewer opened the sample class and
 * read a banner about **12 assessed students** directly above a table of skills whose rows
 * added up to **18**, with nothing on the page saying those were two different sets of
 * children. Both numbers were true. Nothing said which was which.
 *
 * A test shaped around any one of those three would have caught one of them. So this one is
 * shaped around the rule they all break:
 *
 * **A page may count more than one set of children, and every number it prints belongs to
 * exactly one of them — so any two numbers about the same set must be equal, and a table
 * counting a set nobody else on the page counts must name the set it counted.**
 *
 * It is deliberately written against the rendered DOM of *both* surfaces rather than against
 * either page's props, and its probes are shaped around the numbers rather than around the
 * sentences carrying them: a caption may be rewritten, but it may not stop naming the
 * denominator of the rows underneath it.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => { window.localStorage.clear(); });

const CODE = "H4KVW";
const KEY = "JVX7NYHEX4A36UWAVPWQQFR9";
const NOW = 1_780_000_000_000;
const OBJECTIVE = { frameworkId: "nysed-pf-2026" as const, code: "1.3" };

const record = (submission: SubmissionRecord, over: Partial<SubmissionRecord> = {}): SubmissionRecord =>
  ({ ...submission, classCode: CODE, submittedAt: NOW, ...over });

const READ = { "C6.1": 2, "C6.2": 2, "C6.3": 1, "C6.4": 3 };

/**
 * A class with every shape that has ever made two counts disagree: both stories in one room,
 * writing somebody has read and writing nobody has, a run that stopped part way, a student
 * who had a second go, and a seat the teacher removed who had already turned work in.
 */
function theClass() {
  const submissions: SubmissionRecord[] = [
    record(buildSubmission({ seatCode: "1", setupId: "cousin-room", reserveSeat: true, defenseText: "I reserved the seat early." }),
      { sessionId: "s-1", reasoningPoints: 8, reasoningCriteria: READ }),
    record(buildSubmission({ seatCode: "2", setupId: "gym-sublet", defenseText: "The sublet costs more, so I protected the reserve." }),
      { sessionId: "s-2", reasoningPoints: 8, reasoningCriteria: READ }),
    record(buildSubmission({ seatCode: "3", setupId: "teammate-share", takeClinics: true, defenseText: "I took the clinics." }),
      { sessionId: "s-3", reasoningPoints: 7, reasoningCriteria: READ }),
    // Writing nobody has read yet. Turned in, and not assessed: the difference between the
    // two denominators on these pages is usually a teacher's marking pile.
    record(buildSubmission({ seatCode: "4", setupId: "cousin-room", defenseText: "Nobody has read this yet." }), { sessionId: "s-4" }),
    record(buildPopUpSubmission({ seatCode: "5", writeUpText: "The cushion covered the generator." }),
      { sessionId: "s-5", reasoningPoints: 9, reasoningCriteria: READ }),
    record(buildPopUpSubmission({ seatCode: "6", writeUpText: "I ordered for the crowd I was told about." }),
      { sessionId: "s-6", reasoningPoints: 8, reasoningCriteria: READ }),
    // A market run that stopped part way through. An absence, not a low score.
    record(buildPopUpSubmission({ seatCode: "7", stopAfterSaturdayThree: true }), { sessionId: "s-7" }),
    // One student, two goes. One student in every count.
    record(buildSubmission({ seatCode: "8", setupId: "gym-sublet", defenseText: "First go." }), { sessionId: "s-8a", submittedAt: NOW - 60_000 }),
    record(buildSubmission({ seatCode: "8", setupId: "cousin-room", takeClinics: true, defenseText: "Second go, and I moved the reserve." }),
      { sessionId: "s-8b", reasoningPoints: 6, reasoningCriteria: READ }),
    // Removed from the roster with work already in the class. In no count on either page.
    record(buildSubmission({ seatCode: "9", setupId: "gym-sublet", defenseText: "Removed from the roster." }),
      { sessionId: "s-9", reasoningPoints: 8, reasoningCriteria: READ }),
  ];
  const roster = [
    ...["1", "2", "3", "4", "5", "6", "7", "8"].map((seatCode) => ({ seatCode, displayName: `Student ${seatCode}`, claimed: true, removedAt: null })),
    { seatCode: "9", displayName: "Removed R.", claimed: true, removedAt: NOW - 3_600_000 },
  ];
  const assignment: Assignment = {
    id: `assignment-${CODE}-1`,
    classId: CODE,
    objectiveRef: OBJECTIVE,
    competencyIds: ["plan-within-income", "adapt-a-plan"],
    allowedWorldIds: ["basketball", "food-truck"],
    studentChoosesWorld: true,
    format: "decision-challenge",
    assignedStudentIds: null,
    createdAt: NOW,
  };
  return { submissions, roster, assignment };
}

/** What the one derivation both pages read says about this class. */
function theTruth() {
  const { submissions, roster, assignment } = theClass();
  const attributed: AttributedSubmission[] = submissions.map((submission) => ({ ...submission, assignmentId: assignment.id }));
  return classSpineFrom({
    record: { code: CODE, label: "Period 3", challengeId: "plan-under-pressure", createdAt: NOW, expiresAt: NOW + 1 },
    assignments: [assignment],
    submissions: countedSubmissions(attributed, roster),
  });
}

/** The class as the service hands it over, or the same class before anybody has played it. */
function serviceHoldingTheClass(over: { submissions?: SubmissionRecord[] } = {}) {
  const built = theClass();
  const { roster, assignment } = built;
  const submissions = over.submissions ?? built.submissions;
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      class: { code: CODE, label: "Period 3", challengeId: "plan-under-pressure", createdAt: NOW, expiresAt: NOW + 1 },
      assignments: [assignment],
      submissions: submissions.map((submission) => ({ ...submission, assignmentId: assignment.id })),
      roster,
      progress: [],
      feedback: [],
    }),
  } as unknown as Response)));
}

async function openTheClassPage(): Promise<HTMLElement> {
  serviceHoldingTheClass();
  const view = render(
    <MemoryRouter initialEntries={[`/educator/class/${CODE}?key=${KEY}`]}>
      <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(view.container.querySelector(".next-lesson")).not.toBeNull());
  return view.container;
}

async function openTheObjectivePage(over: { submissions?: SubmissionRecord[] } = {}): Promise<HTMLElement> {
  serviceHoldingTheClass(over);
  rememberClass({ code: CODE, label: "Period 3", teacherKey: KEY, createdAt: NOW });
  const view = render(
    <MemoryRouter initialEntries={[`/educator/objectives/${OBJECTIVE.frameworkId}/${OBJECTIVE.code}`]}>
      <Routes><Route path="/educator/objectives/:frameworkId/:code" element={<ObjectiveDetail />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(view.container.querySelector(".objective-class")).not.toBeNull());
  return view.container;
}

/**
 * One student, one unread explanation, and a usable result all the same.
 *
 * A run that closes its opening plan by naming the row which takes the remainder supplies a
 * level for everything this objective asks for, so the teacher's reading is not what is
 * missing. The test below checks that rather than trusting this comment.
 */
function theQuietMarkingPile(): SubmissionRecord[] {
  return [record(
    buildSubmission({ seatCode: "1", setupId: "cousin-room", closeOpeningInto: "goal", defenseText: "Nobody has read this yet." }),
    { sessionId: "s-quiet" },
  )];
}

/**
 * The same rule, at the denominator every class starts on.
 *
 * A count of nothing is still a count, and the sentence beside it is still a claim: the
 * objective page read "0 turned in · every written explanation read." over a class created
 * four minutes earlier, directly under a headline saying nobody had turned anything in. The
 * marking pile it reported as finished did not exist.
 */
describe("a class nobody has started is described as one", () => {
  it("does not report a finished marking pile over an empty class", async () => {
    const container = await openTheObjectivePage({ submissions: [] });
    const text = container.textContent ?? "";
    expect(text).toContain("0 turned in");
    expect(text, "a class with no writing in it has no read writing either").not.toMatch(/every written explanation read/);
    expect(text, "and the reason there is nothing to read is the thing to say").toContain("Nobody has turned work in for this yet.");
  });
});

/**
 * The reading queue and the denominator, which are related and are not the same thing.
 *
 * This page carried the rule *"A student whose writing nobody has read yet is not counted as
 * assessed"* beside the two counts, and it is not a rule — a usable result needs a level for
 * everything the objective asks for, and a run can supply them all on its own. Measured on a
 * real class through the real service: seven turned in, two explanations unread, **seven
 * assessed**, with that sentence printed between the two numbers that contradict it.
 *
 * The premise is checked here rather than assumed, so if the derivation ever does make unread
 * writing disqualifying, this test says so instead of quietly pinning the wrong copy.
 */
describe("unread writing is a reason, not a rule", () => {
  it("never tells a teacher an unread explanation keeps a student out of a denominator it does not", async () => {
    const submissions = theQuietMarkingPile();
    const { roster, assignment } = theClass();
    const spine = classSpineFrom({
      record: { code: CODE, label: "Period 3", challengeId: "plan-under-pressure", createdAt: NOW, expiresAt: NOW + 1 },
      assignments: [assignment],
      submissions: countedSubmissions(submissions.map((entry) => ({ ...entry, assignmentId: assignment.id })), roster),
    });
    expect(spine.awaitingReading, "the premise: nobody has read this student's explanation").toBe(1);
    expect(spine.assessed, "and the derivation counts them assessed anyway").toBe(1);

    const container = await openTheObjectivePage({ submissions });
    const text = container.textContent ?? "";
    expect(text, "a page may not state as a rule the thing its own numbers disprove")
      .not.toMatch(/not counted as assessed/i);
    // Reading can add a level and can never remove one, so it can only move this count up.
    expect(text).toMatch(/can only add to the assessed count/);
  });
});

const numbersIn = (text: string): number[] => [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));

/**
 * Every table on the page that puts each student into one state per skill.
 *
 * Found by its own column header rather than by a class name, because what makes it this
 * table is what it counts: both surfaces render it, from the same derivation, and both used
 * to render it with no denominator on it at all.
 */
function skillTables(container: HTMLElement): HTMLTableElement[] {
  return [...container.querySelectorAll("table")].filter((table) =>
    [...table.querySelectorAll("thead th")].some((cell) => /where the class is/i.test(cell.textContent ?? "")));
}

/** The students counted in one row of it — "15 showed it · 1 not yet · 2 evidence not all in". */
function studentsInRow(row: Element): number {
  const cell = row.querySelector("td")?.textContent ?? "";
  return [...cell.matchAll(/(\d+)\s+[a-z]/g)].reduce((total, match) => total + Number(match[1]), 0);
}

/** Every number the page prints immediately before the word "assessed". */
function assessedClaims(container: HTMLElement): number[] {
  return [...(container.textContent ?? "").matchAll(/(\d+) assessed/g)].map((match) => Number(match[1]));
}

const surfaces = [
  { name: "the class page", open: openTheClassPage },
  { name: "the objective page", open: openTheObjectivePage },
] as const;

describe("no two counts of one class disagree, on any surface that counts it", () => {
  for (const surface of surfaces) {
    it(`states the denominator of the skill table on ${surface.name}`, async () => {
      const container = await surface.open();
      const truth = theTruth();
      const tables = skillTables(container);
      expect(tables.length, `${surface.name} renders no skill table to check`).toBeGreaterThan(0);
      for (const table of tables) {
        const rows = [...table.querySelectorAll("tbody tr")];
        expect(rows.length).toBeGreaterThan(0);
        const caption = table.querySelector("caption");
        // A table of counts with no caption is a table whose denominator is somewhere else on
        // the page, and this is the page where two of them are.
        expect(caption, `the skill table on ${surface.name} does not say what it counted`).not.toBeNull();
        const said = numbersIn(caption?.textContent ?? "");
        for (const row of rows) {
          const counted = studentsInRow(row);
          expect(
            counted,
            `a row of the skill table on ${surface.name} counts ${counted} students; the page says ${truth.submitted} turned in`,
          ).toBe(truth.submitted);
        }
        expect(said, `the caption on ${surface.name} never names the ${truth.submitted} students its rows count`)
          .toContain(truth.submitted);
        // And no third number: a caption that introduces a population nothing else on the
        // page states is the defect wearing a caption.
        for (const number of said) {
          expect([truth.submitted, truth.assessed], `the caption on ${surface.name} states ${number}, which is neither denominator`)
            .toContain(number);
        }
      }
    });

    it(`counts every "assessed" on ${surface.name} against the same students`, async () => {
      const container = await surface.open();
      const truth = theTruth();
      const claims = assessedClaims(container);
      expect(claims.length, `${surface.name} never states the assessed denominator`).toBeGreaterThan(0);
      for (const claim of claims) {
        expect(claim, `${surface.name} calls ${claim} students assessed; the derivation says ${truth.assessed}`).toBe(truth.assessed);
      }
      // The teach-next table carries the same denominator on every row, per §18.2.
      const gaps = [...container.querySelectorAll(".next-lesson__gaps tbody tr td:first-of-type")];
      expect(gaps.length).toBeGreaterThan(0);
      for (const cell of gaps) {
        // The count, without the share printed under it: `textContent` runs "0 of 6" straight
        // into "0%" and a pattern reading the pair off that finds a denominator of 60.
        const counted = [...cell.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join("");
        const pair = /(\d+) of (\d+)/.exec(counted);
        expect(pair, `a teach-next row on ${surface.name} prints a count with no denominator`).not.toBeNull();
        expect(Number(pair?.[2])).toBe(truth.assessed);
      }
    });
  }

  /**
   * The pair that actually got shipped: each page internally consistent, and the two of them
   * one number apart about the same room. A teacher reads them four minutes apart.
   */
  it("says the same two numbers about the same class on both surfaces", async () => {
    const classPage = await openTheClassPage();
    const onTheClassPage = {
      rows: skillTables(classPage).flatMap((table) => [...table.querySelectorAll("tbody tr")].map(studentsInRow)),
      assessed: assessedClaims(classPage),
    };
    cleanup();
    vi.unstubAllGlobals();

    const objectivePage = await openTheObjectivePage();
    const onTheObjectivePage = {
      rows: skillTables(objectivePage).flatMap((table) => [...table.querySelectorAll("tbody tr")].map(studentsInRow)),
      assessed: assessedClaims(objectivePage),
    };

    expect(new Set([...onTheClassPage.rows, ...onTheObjectivePage.rows]).size,
      "the two surfaces count different numbers of students into the same skills").toBe(1);
    expect(new Set([...onTheClassPage.assessed, ...onTheObjectivePage.assessed]).size,
      "the two surfaces disagree about how many students have a usable result").toBe(1);
  });
});
