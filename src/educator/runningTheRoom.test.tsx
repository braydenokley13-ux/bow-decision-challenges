// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Roster } from "./Roster";
import { ReadingQueue } from "./ReadingQueue";
import { RealStudentEvidence } from "./RealClassPages";
import { rememberKey } from "./classMemory";
import { buildSubmission } from "../test/runChallenge";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { AttributedSubmission } from "../platform/classes/types";

/**
 * Three things a teacher does with a room, and what the product said back.
 *
 * A teacher-experience review taught a full period and found each of these. None of them is a
 * wrong number; each is the product doing something and not saying so, or the product printing
 * an instruction a child cannot follow.
 *
 * - **"Sign the whole class out" said nothing.** It works — a student signed in on another
 *   device landed on `/join` after the press — and the teacher's screen was byte-identical
 *   before and after, checked every 400ms for 4.8 seconds. *"At 3:05pm with the trolley waiting
 *   I would press it three times."*
 * - **A second attempt could not be marked from the queue.** The surfaces handle two attempts
 *   well; the queue reads one card per student, deliberately, and there was no way from it to
 *   the earlier writing. *"If the better writing was in the first run, I cannot mark it."*
 * - **The printed card said "Go to BOW" and no web address.** The URL is on the class page and
 *   on the board, and the card is the artefact that exists for the case where the teacher is
 *   not in the room.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const SEAT = "7";

/**
 * Two attempts from one seat, both with writing on them, oldest first.
 *
 * `sessionId` is set explicitly because the headless builder derives one from the seat, and two
 * runs from one seat with the same id are one attempt as far as every surface here is concerned
 * — which would make this test pass without ever proving what it is about.
 */
const FIRST = { ...buildSubmission({
  seatCode: SEAT,
  defenseText: "The first time I wrote a long careful answer about protecting the reserve and what it cost me.",
  startedAt: 1_776_000_000_000,
}), sessionId: "s-first" };
const SECOND = { ...buildSubmission({
  seatCode: SEAT,
  defenseText: "Second go, much shorter.",
  startedAt: 1_776_000_600_000,
}), sessionId: "s-second" };

let calls: { url: string; method: string; body: unknown }[] = [];

function service(options: { signedOut?: number } = {}) {
  const roster = [{ seatCode: SEAT, displayName: "Sofia Nguyen", claimed: true, claimedAt: 1, removedAt: null }];
  const submissions = [FIRST, SECOND].map((submission) => ({
    ...submission, classCode: CODE, assignmentId: "a", displayName: "Sofia Nguyen",
  })) as unknown as AttributedSubmission[];
  const evidence = {
    class: { code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: 1, expiresAt: 2 },
    assignments: [], submissions, roster, progress: [], feedback: [],
  };
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ url, method, body });
    const payload = url.endsWith("/signout") ? { signedOut: options.signedOut ?? 26 }
      : url.endsWith("/roster") && method === "POST"
        ? { cards: ((body as { names: string[] } | null)?.names ?? []).map((displayName, index) => ({ seatCode: String(index + 9), displayName, joinCode: `JC${index}Q` })) }
        : url.includes("/roster") ? { roster, joinMode: "roster" }
          : url.includes("/submissions") ? evidence
            : {};
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(payload),
      text: () => Promise.resolve(JSON.stringify(payload)),
    } as Response);
  });
}

function open(path: string, route: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route} element={element} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  rememberKey(CODE, KEY);
  calls = [];
});

describe("signing the whole class out says what it did", () => {
  it("names the number of sessions it ended", async () => {
    vi.stubGlobal("fetch", service({ signedOut: 26 }));
    open(`/educator/class/${CODE}/roster`, "/educator/class/:code/roster", <Roster />);
    await screen.findByRole("heading", { name: /Who is in this class/i });

    const section = screen.getByRole("heading", { name: /Sign everybody out/i }).closest("section")!;
    await userEvent.click(within(section).getByRole("button", { name: /sign the whole class out/i }));

    await waitFor(() => expect(within(section).getByText(/26 students are signed out/i)).toBeInTheDocument());
    // Announced rather than just drawn, because a teacher pressing it is looking at the room.
    expect(within(section).getByText(/26 students are signed out/i)).toHaveAttribute("role", "status");
  });

  /** Nothing to end is a different fact from twenty-six sessions ended, and it is worth saying. */
  it("says so when nobody was signed in", async () => {
    vi.stubGlobal("fetch", service({ signedOut: 0 }));
    open(`/educator/class/${CODE}/roster`, "/educator/class/:code/roster", <Roster />);
    await screen.findByRole("heading", { name: /Who is in this class/i });

    const section = screen.getByRole("heading", { name: /Sign everybody out/i }).closest("section")!;
    await userEvent.click(within(section).getByRole("button", { name: /sign the whole class out/i }));

    await waitFor(() => expect(within(section).getByText(/nothing to end/i)).toBeInTheDocument());
  });
});

describe("a second attempt can be read and scored", () => {
  it("offers the earlier attempt from the queue, which reads the latest", async () => {
    vi.stubGlobal("fetch", service());
    open(`/educator/class/${CODE}/reading`, "/educator/class/:code/reading", <ReadingQueue />);
    await screen.findByRole("heading", { name: /Read and score the explanations/i });

    // The card is their latest, deliberately: one student is one card, or a teacher marks the
    // same child twice and cannot tell which mark counts.
    expect(screen.getByText(/attempt 2 of 2/i)).toBeInTheDocument();
    // And the earlier writing is one press away rather than unreachable.
    expect(screen.getByRole("link", { name: /Read and score attempt 1/i }))
      .toHaveAttribute("href", `/educator/class/${CODE}/students/${SEAT}?attempt=1`);
  });

  it("scores the attempt on screen, not whichever one is latest", async () => {
    vi.stubGlobal("fetch", service());
    open(`/educator/class/${CODE}/students/${SEAT}?attempt=1`, "/educator/class/:code/students/:seatCode", <RealStudentEvidence />);
    await screen.findByRole("link", { name: /Class evidence/i });

    // The page is showing the first attempt, and says so.
    expect(screen.getByText(/Attempt 1 of 2/i)).toBeInTheDocument();

    // The writing and the marks a teacher makes on it are on screen, not behind a tab. The
    // four tabs are gone: the child's own sentences were rendered `display: none` by default
    // inside an unselected panel, on the page whose whole reason to exist is that a person
    // reads them.
    expect(screen.getByText(/first time I wrote a long careful answer/i)).toBeInTheDocument();

    // Score every criterion — the top of each segmented control — and save.
    for (const row of document.querySelectorAll(".rubric-row")) {
      const buttons = [...row.querySelectorAll(".segmented button")];
      await userEvent.click(buttons.at(-1)!);
    }
    await userEvent.click(screen.getByRole("button", { name: /Save review/i }));

    // The mark goes to the attempt the teacher was reading. Marking the first run and having it
    // land on the second would be the worst shape this defect could take.
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const patch = calls.find((call) => call.method === "PATCH")!;
    expect((patch.body as { sessionId: string }).sessionId).toBe(FIRST.sessionId);
    expect((patch.body as { sessionId: string }).sessionId).not.toBe(SECOND.sessionId);
  });
});

describe("the card a child takes home", () => {
  it("carries an address a child could type", async () => {
    vi.stubGlobal("fetch", service());
    open(`/educator/class/${CODE}/roster`, "/educator/class/:code/roster", <Roster />);
    await screen.findByRole("heading", { name: /Who is in this class/i });

    await userEvent.type(screen.getByLabelText(/One name per line/i), "Ana R.");
    await userEvent.click(screen.getByRole("button", { name: /Add them/i }));

    await waitFor(() => expect(document.querySelector(".join-card")).toBeTruthy());
    const card = document.querySelector(".join-card")!;
    // "Go to BOW" was the whole instruction on the artefact that exists for homework.
    expect(card.textContent).toContain(`${window.location.host}/join`);
    expect(card.textContent).toContain(CODE);
  });
});
