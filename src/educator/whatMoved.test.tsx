// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { planMovements } from "../domain/finance/formulas";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { analyseClass } from "./analysis";
import { RealStudentEvidence } from "./RealClassPages";
import { buildSubmission } from "../test/runChallenge";
import type { SubmissionRecord } from "../platform/classes/types";

/**
 * "What this student moved", held to what the student moved.
 *
 * The product edits these rows itself. Pressing *Reserve it now* at the Week 4 deadline
 * commits the course money and `courseRowCapFor` then holds that row's ceiling at zero, so
 * the reducer empties it in every draft the student is holding. This table printed the
 * opening and final figures side by side and nothing else, under a heading calling the
 * difference between them the student's — so a student who paid to protect the course seat
 * read **$1,200 → $0** under *What this student moved*, on the page their teacher opens to
 * check what they actually did.
 *
 * It is the same defect that put "5 of 11 cut sports-media course first" four inches beneath
 * the same five names listed as the students who reserved it, and it is fixed the same way:
 * `planMovements` splits every dollar off a row into the student's `chosenReduction` and the
 * product's `forcedReduction`, and this page reads that split rather than a subtraction.
 *
 * Both halves are asserted, because a page that stopped attributing anything to anybody would
 * satisfy the first on its own: the forced row is not reported as a cut, and a cut the student
 * did make still is.
 */

afterEach(cleanup);

const NOW = 1_780_000_000_000;

/** Seat 1 reserved the seat at Week 4. Seat 2 did not, and cut a row of their own. */
function theClass(): SubmissionRecord[] {
  return [
    { ...buildSubmission({ seatCode: "1", setupId: "cousin-room", reserveSeat: true, defenseText: "The course seat was paid at Week 4 so nobody could take it back." }), classCode: "H4KVW", sessionId: "s-1", submittedAt: NOW },
    { ...buildSubmission({ seatCode: "2", setupId: "cousin-room", defenseText: "I took it out of the rides instead." }), classCode: "H4KVW", sessionId: "s-2", submittedAt: NOW },
  ];
}

function openStudent() {
  const submissions = theClass();
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      class: { code: "H4KVW", label: "Period 3", challengeId: "plan-under-pressure", createdAt: NOW, expiresAt: NOW + 1 },
      assignments: [{
        id: "assignment-H4KVW-1", classId: "H4KVW", objectiveRef: null,
        competencyIds: ["plan-within-income", "adapt-a-plan"],
        allowedWorldIds: ["basketball"], studentChoosesWorld: false,
        format: "decision-challenge", assignedStudentIds: null, createdAt: NOW,
      }],
      submissions: submissions.map((entry) => ({ ...entry, assignmentId: "assignment-H4KVW-1" })),
      roster: [
        { seatCode: "1", displayName: "Ana R.", claimed: true, removedAt: null },
        { seatCode: "2", displayName: "Devon P.", claimed: true, removedAt: null },
      ],
      progress: [], feedback: [],
    }),
  })) as unknown as typeof fetch;
  return { restore: () => { globalThis.fetch = original; } };
}

async function openThePlanTab(seatCode: string) {
  const { restore } = openStudent();
  const view = render(
    <MemoryRouter initialEntries={[`/educator/class/H4KVW/students/${seatCode}?key=abcdefghijklmnop`]}>
      <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(view.container.querySelector(".resolve-changes-table")).not.toBeNull());
  return { view, restore };
}

/** The row of the table whose heading names this line of the plan. */
function tableRow(container: HTMLElement, heading: string): string[] {
  const found = [...container.querySelectorAll(".resolve-changes-table tbody tr")]
    .filter((node) => (node.querySelector("th")?.textContent ?? "").trim() === heading);
  if (found.length !== 1) throw new Error(`"What this student moved" has ${found.length} rows headed "${heading}".`);
  return [...found[0]!.querySelectorAll("th, td")].map((cell) => cell.textContent ?? "");
}

/** What the domain says this student chose to take off each row. The page may not exceed it. */
function movementsOf(seatCode: string) {
  const row = analyseClass(theClass()).rows.find((entry) => entry.seatCode === seatCode)!;
  return planMovements(row.opening!, row.final!, { depositTaken: row.reservedSeat === true }, SCENARIO_NUMBERS);
}

describe("the student's plan table separates what they moved from what BOW moved", () => {
  it("does not report the row a reserved seat emptied as money the student gave up", async () => {
    const movements = movementsOf("1");
    const course = movements.find((movement) => movement.category === "goal")!;
    // The fixture is the shape this is about: BOW took the whole row, the student took none.
    expect(course.forcedReduction).toBeGreaterThan(0);
    expect(course.chosenReduction).toBe(0);

    const { view, restore } = await openThePlanTab("1");
    try {
      const cells = tableRow(view.container, "Sports-media course");
      // The real figures stay. A teacher reading a plan wants the numbers that were on it.
      expect(cells[1]).toBe("$1,200");
      expect(cells[2]).toBe("$0");
      // What may not be said is that the student did it.
      expect(cells.slice(3).join(" "), "the course row is reported as a cut this student made").not.toMatch(/cut/i);
      // And the page says who emptied it, rather than leaving a teacher to work it out.
      const section = view.container.querySelector(".resolve-changes-table")!.closest("section")!;
      expect(section.textContent).toMatch(/reserved the course seat/i);
    } finally { restore(); }
  });

  it("still reports a cut the student did make", async () => {
    const movements = movementsOf("2");
    const cut = movements.find((movement) => movement.chosenReduction > 0)!;
    expect(cut, "the second run has to have cut something for this to mean anything").toBeDefined();

    const { view, restore } = await openThePlanTab("2");
    try {
      const cells = tableRow(view.container, cut.category === "goal" ? "Sports-media course" : cut.category === "reserve" ? "Backup money" : "Rides and rest");
      expect(cells.slice(3).join(" ")).toMatch(/Cut \$/);
      // Nothing was forced on this student's board, so nothing is excused on it either.
      const section = view.container.querySelector(".resolve-changes-table")!.closest("section")!;
      expect(section.textContent).not.toMatch(/reserved the course seat/i);
    } finally { restore(); }
  });
});
