// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentHome } from "./Home";
import type { Assignment } from "../platform/classes/types";

/**
 * The student's own screen, in the states a real class produces.
 *
 * Every case here is one the brief names and the screen could not do: a class set two things,
 * a run that is genuinely part-way through, a teacher who wrote back about *one* of two
 * attempts, a teacher who then corrected what they wrote, and a signed-in student with no
 * roster row at all. The assertions are deliberately about **words on the screen**, because
 * every one of them is a promise to a twelve-year-old rather than a shape in a DOM.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

const CLASS_CODE = "H4KVW";

const BASE: Assignment = {
  id: "a1",
  classId: CLASS_CODE,
  objectiveRef: null,
  competencyIds: [],
  allowedWorldIds: ["basketball"],
  studentChoosesWorld: false,
  format: "decision-challenge",
  assignedStudentIds: null,
  createdAt: 1_000,
};

function assignment(over: Partial<Assignment> & { id: string }): Assignment {
  return { ...BASE, ...over };
}

interface ClassShape {
  assignments?: Assignment[];
  inProgress?: unknown;
  completed?: unknown[];
  feedback?: unknown[];
}

function home(entry: ClassShape = {}, student: { displayName: string | null } | undefined = { displayName: "Marisol T." }, classes = 1) {
  const body = {
    ...(student ? { student } : {}),
    classes: classes === 0 ? [] : [{
      classCode: CLASS_CODE,
      label: "Ms. Alvarez · Period 3",
      seatCode: "4",
      displayName: "Marisol T.",
      assignments: entry.assignments ?? [BASE],
      inProgress: entry.inProgress ?? null,
      completed: entry.completed ?? [],
      feedback: entry.feedback ?? [],
    }],
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response)));
  window.localStorage.setItem("bow.student.v1.token", "a-session");
  return render(<MemoryRouter initialEntries={["/home"]}><StudentHome /></MemoryRouter>);
}

function homeAcross(classes: unknown[]) {
  const body = { student: { displayName: "Marisol T." }, classes };
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)));
  window.localStorage.setItem("bow.student.v1.token", "a-session");
  return render(<MemoryRouter initialEntries={["/home"]}><StudentHome /></MemoryRouter>);
}

describe("whose screen this is", () => {
  it("leads with the student's own name, as the page's heading", async () => {
    home();
    const name = await screen.findByRole("heading", { name: "Marisol T.", level: 1 });
    expect(name).toBeInTheDocument();
    // Whose class, and which seat — the two facts that make a name on a shared cart mean
    // something. Both in the same block as the name rather than in an eyebrow above the work.
    expect(screen.getByText(/Ms\. Alvarez · Period 3 · Seat 4/)).toBeInTheDocument();
  });

  it("offers a way out that says what pressing it does", async () => {
    home();
    // Not a bare "Not you?", which is a question with no verb in it. The door already
    // established the pattern: a kid-voice question and the thing that happens.
    expect(await screen.findByRole("button", { name: "Not you? Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join another class" })).toHaveAttribute("href", "/join?intent=add-class");
  });

  it("still names a student who is signed in and in no class, and still offers sign-out", async () => {
    // The hole this closes: the name used to be read off `classes[0]`, so this student had no
    // name and a sign-out button — a page that could not say whose it was.
    home({}, { displayName: "Devon P." }, 0);
    expect(await screen.findByRole("heading", { name: "Devon P.", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You are not on a class list any more." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not you? Sign out" })).toBeInTheDocument();
  });
});

describe("a class that was set more than one thing", () => {
  const two = [
    assignment({ id: "a1", allowedWorldIds: ["basketball"], createdAt: 1 }),
    assignment({ id: "a2", allowedWorldIds: ["food-truck"], createdAt: 2, dueAt: 1_780_000_000_000 }),
  ];

  it("draws one card per assignment, each with its own title and its own way in", async () => {
    home({ assignments: two });
    expect(await screen.findByRole("heading", { name: "Eight Weeks to the Showcase", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run the Pop-Up", level: 3 })).toBeInTheDocument();
    expect(screen.getByText("2 assignments")).toBeInTheDocument();
    // Two ways in, and neither is called just "Start": three cards offering three links all
    // named "Start" is a list of identical destinations to anybody not looking at the screen.
    expect(screen.getByRole("link", { name: "Start — Eight Weeks to the Showcase" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start — Run the Pop-Up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start — Eight Weeks to the Showcase" })).toHaveAttribute(
      "href", `/challenges/plan-under-pressure?class=${CLASS_CODE}&assignment=a1`,
    );
    expect(screen.getByRole("link", { name: "Start — Run the Pop-Up" })).toHaveAttribute(
      "href", `/challenges/plan-under-pressure?class=${CLASS_CODE}&assignment=a2`,
    );
  });

  it("keeps the verb alone when there is only one thing it could open", async () => {
    home();
    expect(await screen.findByRole("link", { name: "Start" })).toBeInTheDocument();
  });

  it("puts the run in progress first, and the untouched work after it", async () => {
    home({
      assignments: two,
      inProgress: { worldId: "food-truck", stage: "popup-standing-order", updatedAt: 5, assignmentId: "a2" },
    });
    await screen.findByRole("link", { name: /Carry on/ });
    expect(screen.getByRole("link", { name: "Carry on — Run the Pop-Up" })).toHaveAttribute(
      "href", `/challenges/plan-under-pressure?class=${CLASS_CODE}&assignment=a2`,
    );
    expect(screen.queryByRole("link", { name: "Start — Eight Weeks to the Showcase" })).not.toBeInTheDocument();
    expect(screen.getByText(/Finish the run already in progress for this class/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Play it again/ })).not.toBeInTheDocument();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual(["Run the Pop-Up", "Eight Weeks to the Showcase"]);
  });

  it("never puts a teacher's words below something the student has not opened", async () => {
    home({
      assignments: two,
      completed: [{ sessionId: "s-1", submittedAt: 1_770_000_000_000, worldId: "basketball", assignmentId: "a1" }],
      feedback: [{ id: "f1", body: "You protected the backup money and said why.", at: 1_770_000_100_000, sessionId: "s-1" }],
    });
    await screen.findByText(/You protected the backup money/);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual(["Eight Weeks to the Showcase", "Run the Pop-Up"]);
  });

  it("renders a due date as a date and never as an alarm", async () => {
    home({ assignments: two });
    const due = await screen.findByText(/Your teacher would like this by/);
    expect(due).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/overdue|OVERDUE|late|days left/i);
  });

  it("says which world a second attempt is a second attempt of", async () => {
    home({ assignments: [assignment({ id: "a3", attemptOf: "a1" })] });
    expect(await screen.findByRole("heading", { name: "Eight Weeks to the Showcase — second attempt", level: 3 })).toBeInTheDocument();
  });

  it("uses the teacher's trimmed title and keeps the second-attempt suffix", async () => {
    home({ assignments: [assignment({ id: "a3", title: "  Lunch Rush Choices  ", attemptOf: "a1" })] });
    expect(await screen.findByRole("heading", { name: "Lunch Rush Choices — second attempt", level: 3 })).toBeInTheDocument();
  });

  it("does not offer to open a quick check, because nothing in BOW opens one", async () => {
    home({ assignments: [assignment({ id: "q1", format: "quick-check" })] });
    expect(await screen.findByRole("heading", { name: "Quick check", level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Start/ })).not.toBeInTheDocument();
  });
});

describe("a run that is part-way through", () => {
  const live = { worldId: "basketball", stage: "week5-event", updatedAt: 5, assignmentId: "a1" };

  it("says where they stopped in the same words the run itself uses", async () => {
    home({ inProgress: live });
    expect(await screen.findByText(/You stopped at Week 5 · the news\./)).toBeInTheDocument();
  });

  it("names the chapter they are in and counts the steps off the world's real stage list", async () => {
    home({ inProgress: live });
    // Basketball's own five chapters, from `PROGRESS_STEPS` — not a grouping invented here.
    const here = await screen.findByText("Week 5");
    expect(here.closest("li")).toHaveAttribute("aria-current", "step");
    expect(within(here.closest("li")!).getByText(/you are here/)).toBeInTheDocument();
    expect(screen.getByText("The offer").closest("li")).toHaveClass("progress__chapter--done");
    // Fourteen story stages, counted off `stagesFor("basketball")`. The two indicators this
    // screen used to draw — "Week 2 of 4 Saturdays" with five bars, and "Step 3 of 8" — were
    // both made up, and an indicator that disagrees with its own caption is worse than none.
    expect(screen.getByText("Step 9 of 14")).toBeInTheDocument();
  });

  it("promises the run is with the class rather than with this computer", async () => {
    home({ inProgress: live });
    expect(await screen.findByText(/saved with your class, not on this computer/)).toBeInTheDocument();
  });

  it("shows no progress at all on work nobody has started", async () => {
    home();
    await screen.findByRole("link", { name: "Start" });
    // An empty bar implies a start that did not happen.
    expect(screen.queryByText(/^Step \d+ of \d+$/)).not.toBeInTheDocument();
  });
});

describe("what a teacher wrote", () => {
  const turnedIn = [
    { sessionId: "s-1", submittedAt: 1_770_000_000_000, worldId: "basketball", assignmentId: "a1" },
    { sessionId: "s-2", submittedAt: 1_770_000_500_000, worldId: "food-truck", assignmentId: "a2" },
  ];
  const two = [
    assignment({ id: "a1", allowedWorldIds: ["basketball"], createdAt: 1 }),
    assignment({ id: "a2", allowedWorldIds: ["food-truck"], createdAt: 2 }),
  ];

  it("attaches to the attempt it was written about, not to the top of the page", async () => {
    home({
      assignments: two,
      completed: turnedIn,
      feedback: [{ id: "f1", body: "The Saturday 4 order is the call I want to talk about.", at: 1_770_000_600_000, sessionId: "s-2" }],
    });
    await screen.findByText(/Saturday 4 order/);
    const marketCard = screen.getByRole("heading", { name: "Run the Pop-Up", level: 3 }).closest("article");
    const basketballCard = screen.getByRole("heading", { name: "Eight Weeks to the Showcase", level: 3 }).closest("article");
    expect(within(marketCard!).getByText(/Saturday 4 order/)).toBeInTheDocument();
    expect(within(basketballCard!).queryByText(/Saturday 4 order/)).not.toBeInTheDocument();
    // And the card says so in its own status, before any of its colour is read.
    expect(within(marketCard!).getByText("Your teacher wrote back")).toBeInTheDocument();
    expect(within(basketballCard!).getByText(/^Turned in /)).toBeInTheDocument();
  });

  it("says a note was changed, and when", async () => {
    home({
      completed: [{ sessionId: "s-1", submittedAt: 1_770_000_000_000, worldId: "basketball", assignmentId: "a1" }],
      feedback: [{
        id: "f1", body: "I meant Week 5, not Week 4.", at: 1_770_000_100_000, sessionId: "s-1",
        editedAt: 1_770_100_000_000,
      }],
    });
    expect(await screen.findByText(/your teacher changed this note on/)).toBeInTheDocument();
  });

  it("shows nothing at all for a note the teacher took back", async () => {
    // Withdrawn notes never reach the client — the service filters `deletedAt` — so the
    // student-facing state of a withdrawn note is an empty list and no residue.
    home({ completed: [{ sessionId: "s-1", submittedAt: 1_770_000_000_000, worldId: "basketball", assignmentId: "a1" }], feedback: [] });
    await screen.findByText(/You turned this in\. Your teacher has it\./);
    expect(screen.queryByText(/From your teacher/)).not.toBeInTheDocument();
    expect(screen.queryByText(/wrote back/)).not.toBeInTheDocument();
  });
});

describe("nothing on this screen is a score", () => {
  it("carries no streak, badge, point, level or percentage", async () => {
    home({
      assignments: [assignment({ id: "a1", createdAt: 1 }), assignment({ id: "a2", allowedWorldIds: ["food-truck"], createdAt: 2 })],
      inProgress: { worldId: "basketball", stage: "week5-event", updatedAt: 5, assignmentId: "a1" },
      completed: [{ sessionId: "s-2", submittedAt: 1_770_000_500_000, worldId: "food-truck", assignmentId: "a2" }],
      feedback: [],
    });
    await screen.findByRole("link", { name: /Carry on/ });
    expect(document.body.textContent).not.toMatch(/streak|badge|points|level \d|% |\d+ of \d+ done/i);
  });
});

describe("one continue-first home across classes", () => {
  it("chooses one global next move, then responses, up next, past runs, and memberships", async () => {
    const first = {
      classCode: CLASS_CODE,
      label: "Ms. Alvarez · Period 3",
      seatCode: "4",
      displayName: "Marisol T.",
      assignments: [
        assignment({ id: "a-live", allowedWorldIds: ["basketball"], createdAt: 1 }),
        assignment({ id: "a-past", allowedWorldIds: ["food-truck"], attemptOf: "a-live", createdAt: 2 }),
      ],
      inProgress: { worldId: "basketball", stage: "week5-event", updatedAt: 100, assignmentId: "a-live" },
      completed: [{ sessionId: "past-a", submittedAt: 80, worldId: "food-truck", assignmentId: "a-past" }],
      feedback: [],
    };
    const secondCode = "P6MKT";
    const second = {
      classCode: secondCode,
      label: "Mr. Chen · Period 5",
      seatCode: "9",
      displayName: "Marisol T.",
      assignments: [
        assignment({ id: "b-response", classId: secondCode, allowedWorldIds: ["basketball"], attemptOf: "older-b", createdAt: 1 }),
        assignment({ id: "b-next", classId: secondCode, allowedWorldIds: ["food-truck"], createdAt: 2 }),
      ],
      inProgress: null,
      completed: [{ sessionId: "response-b", submittedAt: 70, worldId: "basketball", assignmentId: "b-response" }],
      feedback: [{ id: "f-b", body: "Tell me more about the backup money.", at: 90, sessionId: "response-b" }],
    };
    homeAcross([first, second]);

    const next = (await screen.findByRole("heading", { name: "Your next move", level: 2 })).closest("section")!;
    expect(within(next).getByRole("heading", { name: "Eight Weeks to the Showcase", level: 3 })).toBeInTheDocument();
    expect(within(next).getAllByRole("article")).toHaveLength(1);
    expect(within(next).getByText(/Ms\. Alvarez · Period 3 · Seat 4/)).toBeInTheDocument();

    const responses = screen.getByRole("heading", { name: "Teacher responses", level: 2 }).closest("section")!;
    expect(within(responses).getByText("Tell me more about the backup money.")).toBeInTheDocument();
    expect(within(responses).getByText(/Mr\. Chen · Period 5 · Seat 9/)).toBeInTheDocument();
    expect(within(responses).queryByText(/unread/i)).not.toBeInTheDocument();

    const upNext = screen.getByRole("heading", { name: "Up next", level: 2 }).closest("section")!;
    expect(within(upNext).getByRole("heading", { name: "Run the Pop-Up", level: 3 })).toBeInTheDocument();

    const past = screen.getByRole("heading", { name: "Past runs", level: 2 }).closest("section")!;
    expect(within(past).getByRole("heading", { name: "Run the Pop-Up — second attempt", level: 3 })).toBeInTheDocument();

    const memberships = screen.getByRole("heading", { name: "Classes", level: 2 }).closest("section")!;
    expect(within(memberships).getByText("Ms. Alvarez · Period 3")).toBeInTheDocument();
    expect(within(memberships).getByText("Mr. Chen · Period 5")).toBeInTheDocument();
  });
});
