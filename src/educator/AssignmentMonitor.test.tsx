// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import type { ProgressRow } from "../platform/identity/types";
import { buildSubmission } from "../test/runChallenge";
import { AssignmentMonitor } from "./AssignmentMonitor";
import { RealClassOverview } from "./RealClassPages";

const CODE = "H4KVW";
const KEY = "JVX7NYHEX4A36UWAVPWQQFR9";
const NOW = 1_780_000_000_000;

const record: ClassRecord = {
  code: CODE,
  label: "Period 3",
  challengeId: "plan-under-pressure",
  createdAt: NOW - 10_000,
  expiresAt: NOW + 10_000,
};

type NamedAssignment = Assignment & { title?: string };

const FIRST: NamedAssignment = {
  id: `assignment-${CODE}-FIRST`,
  classId: CODE,
  title: "Price pressure lab",
  objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" },
  competencyIds: ["plan-within-income"],
  allowedWorldIds: ["basketball"],
  studentChoosesWorld: false,
  format: "decision-challenge",
  assignedStudentIds: ["1", "2"],
  closingQuestion: { text: "What would you protect first?", required: true },
  dueAt: NOW + 86_400_000,
  createdAt: NOW,
};

const { closingQuestion: _firstQuestion, ...FIRST_WITHOUT_QUESTION } = FIRST;

const SECOND: NamedAssignment = {
  ...FIRST_WITHOUT_QUESTION,
  id: `assignment-${CODE}-SECOND`,
  title: "Market follow-up",
  allowedWorldIds: ["food-truck"],
  assignedStudentIds: ["3"],
  createdAt: NOW + 1,
};

function submission(seatCode: string, sessionId: string, assignmentId: string): AttributedSubmission {
  return {
    ...buildSubmission({ seatCode, defenseText: `${sessionId} explanation` }),
    classCode: CODE,
    sessionId,
    assignmentId,
    submittedAt: NOW,
  };
}

const FIRST_SUBMISSION = submission("1", "session-first", FIRST.id);
const SECOND_SUBMISSION = submission("3", "session-second", SECOND.id);

const roster = [
  { seatCode: "1", displayName: "Ana R.", claimed: true, removedAt: null },
  { seatCode: "2", displayName: "Marcus O.", claimed: true, removedAt: null },
  { seatCode: "3", displayName: "Jo S.", claimed: true, removedAt: null },
];

const progress = [
  { seatCode: "2", assignmentId: FIRST.id, worldId: "basketball", stage: "working-plan", startedAt: NOW - 30_000, updatedAt: NOW - 10_000 },
  { seatCode: "3", assignmentId: SECOND.id, worldId: "food-truck", stage: "popup-plan", startedAt: NOW - 30_000, updatedAt: NOW - 5_000 },
] as unknown as ProgressRow[];

function service() {
  const body = {
    class: record,
    assignments: [FIRST, SECOND],
    submissions: [FIRST_SUBMISSION, SECOND_SUBMISSION],
    roster,
    progress,
    feedback: [{
      id: "note-1",
      classCode: CODE,
      seatCode: "1",
      sessionId: FIRST_SUBMISSION.sessionId,
      body: "Good trade-off.",
      at: NOW,
      flagged: false,
    }],
  };
  return vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response));
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => { window.localStorage.clear(); });

describe("one assignment monitor", () => {
  it("shows its own brief, live room, submissions and exact feedback links without borrowing another assignment", async () => {
    vi.stubGlobal("fetch", service());
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}/assignments/${FIRST.id}?key=${KEY}`]}>
        <Routes><Route path="/educator/class/:code/assignments/:assignmentId" element={<AssignmentMonitor />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Price pressure lab" })).toBeInTheDocument();
    expect(screen.getByText(/1\.3 · Create a budget/)).toBeInTheDocument();
    expect(screen.getByText(/2 students: Ana R\. and Marcus O\./)).toBeInTheDocument();
    expect(screen.getByText("Marcus O.")).toBeInTheDocument();
    expect(screen.queryByText("Jo S.")).not.toBeInTheDocument();
    expect(screen.queryByText("Market follow-up")).not.toBeInTheDocument();

    const question = document.querySelector<HTMLElement>(".assignment-monitor__question")!;
    expect(within(question).getByText("What would you protect first?")).toBeInTheDocument();
    expect(within(question).getByText(/not scored/i)).toBeInTheDocument();
    expect(within(question).queryByRole("button")).not.toBeInTheDocument();

    const session = screen.getByRole("link", { name: "Open this session" });
    const feedback = screen.getByRole("link", { name: "Write feedback" });
    expect(session).toHaveAttribute("href", expect.stringContaining("session=session-first"));
    expect(feedback).toHaveAttribute("href", expect.stringContaining("session=session-first"));
    expect(document.body.textContent).not.toContain("session-second explanation");
  });
});

describe("the class center assignment loop", () => {
  it("has contextual actions and keeps both assignments in visible history", async () => {
    vi.stubGlobal("fetch", service());
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}?key=${KEY}`]}>
        <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Assignments" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Assign a challenge" }))
      .toHaveAttribute("href", `/educator/assignments/new?classCode=${CODE}`);
    expect(screen.getByRole("link", { name: "Assignments" })).toHaveAttribute("href", "#class-assignments");
    expect(screen.getByRole("link", { name: "Students" })).toHaveAttribute("href", `/educator/class/${CODE}/roster`);
    expect(screen.getByText("Price pressure lab")).toBeInTheDocument();
    expect(screen.getByText("Market follow-up")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open monitor" })).toHaveLength(2);
  });
});
