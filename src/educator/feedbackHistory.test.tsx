// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealStudentEvidence } from "./RealClassPages";
import { rememberKey } from "./classMemory";
import { buildSubmission } from "../test/runChallenge";
import type { TeacherFeedback } from "../platform/identity/types";

/**
 * "What they hear from you" has to be what they hear from you.
 *
 * ## What a teacher did, and what the two screens then said
 *
 * A teacher-experience review wrote a note to a student, thought better of it, and wrote a
 * correction. The teacher's panel then showed **one** note under the heading *"What they hear
 * from you"* — the correction. Signed in as the student, the child's home page showed **both**,
 * stacked, under *FROM YOUR TEACHER*. `GET /api/classes/:code/submissions` confirmed two
 * records, and enumerating every control on the teacher's panel found nothing matching
 * `/send|delete|remove|undo|edit|take/` except **"Send it"**.
 *
 * So the teacher believed she had replaced a sentence about a child, and the child had read
 * both. The service was never the problem: `POST /classes/:code/feedback` has appended since the
 * day a second note silently destroyed the first, `PATCH` rewrites one in place and `DELETE`
 * tombstones it (`server/identity.ts`), and the teacher's own payload carries every note
 * including the tombstoned ones. The client showed `[0]` of a list sorted newest-first.
 *
 * ## What is asserted
 *
 * The two halves of the heading's promise, and they are asserted against **the student's own
 * filter** rather than against a number: `GET /me/classes` gives a student every note for their
 * seat with `!entry.deletedAt` (`server/identity.ts`, the `feedback` block in the `me/classes`
 * route). So the rule this file pins is that the set of notes the teacher's panel presents as
 * heard is exactly the set that filter would return — which is a statement about two screens
 * agreeing, and stays true when the number of notes changes.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const SEAT = "7";

const SUBMISSION = buildSubmission({ seatCode: SEAT });

const FIRST: TeacherFeedback = {
  id: "f_first", classCode: CODE, seatCode: SEAT, sessionId: SUBMISSION.sessionId,
  body: "Sofia — the second run is much stronger, and the reserve is the reason.",
  at: 1_776_000_000_000, flagged: false,
};
const SECOND: TeacherFeedback = {
  id: "f_second", classCode: CODE, seatCode: SEAT, sessionId: SUBMISSION.sessionId,
  body: "Correction, Sofia: I mixed you up with another plan. Ignore what I said about the reserve.",
  at: 1_776_000_060_000, flagged: false,
};

/** What a student would be shown, by the service's own rule. */
const heardByTheStudent = (notes: readonly TeacherFeedback[]) =>
  notes.filter((note) => !note.deletedAt).map((note) => note.body);

let calls: { url: string; method: string }[] = [];

function service(notes: TeacherFeedback[]) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (method === "DELETE") {
      const id = url.split("/").at(-1)!;
      const note = notes.find((entry) => entry.id === id);
      if (note) note.deletedAt = 1_776_000_120_000;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id, deletedAt: 1 }), text: () => Promise.resolve("{}") } as Response);
    }
    if (method === "PATCH" && url.includes("/feedback/")) {
      const id = url.split("/").at(-1)!;
      const sent = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { body: string };
      const note = notes.find((entry) => entry.id === id);
      if (note) { note.body = sent.body; note.editedAt = 1_776_000_180_000; }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id }), text: () => Promise.resolve("{}") } as Response);
    }
    const body = {
      class: { code: CODE, label: "Period 3", challengeId: SUBMISSION.challengeId, createdAt: 1, expiresAt: 2 },
      assignments: [],
      submissions: [{ ...SUBMISSION, displayName: "Sofia Nguyen" }],
      roster: [{ seatCode: SEAT, displayName: "Sofia Nguyen", claimed: true, claimedAt: 1, removedAt: null }],
      progress: [],
      feedback: notes.map((note) => ({ ...note })),
    };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) } as Response);
  });
}

function openEvidence() {
  return render(
    <MemoryRouter initialEntries={[`/educator/class/${CODE}/students/${SEAT}`]}>
      <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
    </MemoryRouter>,
  );
}

/** The panel, found by the heading that makes the promise. */
const panel = () => screen.getByRole("heading", { name: /What they hear from you/i }).closest("section")!;

/**
 * The notes the panel presents as heard — the sequence, not the taken-back block underneath it.
 * The distinction is the whole subject of this file, so the query has to make it.
 */
const presentedAsHeard = () => [...panel().querySelectorAll(".feedback__sequence blockquote")].map((node) => node.textContent ?? "");

beforeEach(() => {
  window.localStorage.clear();
  rememberKey(CODE, KEY);
  calls = [];
});

describe("the write-back panel shows every note the student can see", () => {
  it("lists both notes when the teacher wrote twice", async () => {
    vi.stubGlobal("fetch", service([{ ...FIRST }, { ...SECOND }]));
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });

    const shown = presentedAsHeard();
    for (const body of heardByTheStudent([FIRST, SECOND])) {
      expect(shown.some((text) => text.includes(body))).toBe(true);
    }
    expect(shown).toHaveLength(2);
  });

  /**
   * Oldest first, which is the order the student reads them in — a correction printed above the
   * sentence it corrects is unreadable, and the student's home page already sorts this way.
   */
  it("puts them in the order the student reads them", async () => {
    vi.stubGlobal("fetch", service([{ ...SECOND }, { ...FIRST }]));
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });

    const shown = presentedAsHeard();
    expect(shown[0]).toContain(FIRST.body);
    expect(shown[1]).toContain(SECOND.body);
  });

  it("gives the teacher a way to take one back", async () => {
    const notes = [{ ...FIRST }, { ...SECOND }];
    vi.stubGlobal("fetch", service(notes));
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });

    const takeBack = within(panel()).getAllByRole("button", { name: /take it back/i });
    expect(takeBack).toHaveLength(2);
    await userEvent.click(takeBack[0]!);
    // The same inline confirmation the roster uses before it erases a child: nothing a student
    // has already read disappears on one press.
    await userEvent.click(within(panel()).getByRole("button", { name: /take it back from them/i }));

    await waitFor(() => expect(calls.some((call) => call.method === "DELETE" && call.url.endsWith(`/feedback/${FIRST.id}`))).toBe(true));
  });

  /**
   * The cross-screen assertion, and the one that would have caught the original defect: after a
   * withdrawal, what the panel presents as heard is what the student's own filter returns.
   */
  it("stops presenting a withdrawn note as something they hear", async () => {
    const notes = [{ ...FIRST }, { ...SECOND }];
    vi.stubGlobal("fetch", service(notes));
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });

    await userEvent.click(within(panel()).getAllByRole("button", { name: /take it back/i })[0]!);
    await userEvent.click(within(panel()).getByRole("button", { name: /take it back from them/i }));

    await waitFor(() => {
      const shown = presentedAsHeard();
      expect(shown).toHaveLength(1);
      expect(shown[0]).toContain(SECOND.body);
    });
    expect(heardByTheStudent(notes)).toEqual([SECOND.body]);
    // Kept for the teacher, said plainly, because a teacher who takes back the wrong sentence
    // has to be able to see what they took back.
    const withdrawn = panel().querySelector(".feedback__withdrawn")!;
    expect(withdrawn).toBeTruthy();
    expect(withdrawn.textContent).toContain("they no longer see");
    expect(withdrawn.textContent).toContain(FIRST.body);
  });

  /**
   * The service's own 409 tells a teacher who has filled the note limit to "Edit one instead of
   * adding another". There was no edit control anywhere, so that sentence named something that
   * did not exist.
   */
  it("lets the teacher change what a note says, in place", async () => {
    const notes = [{ ...FIRST }];
    vi.stubGlobal("fetch", service(notes));
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });

    await userEvent.click(within(panel()).getByRole("button", { name: /change it/i }));
    const box = within(panel()).getByRole("textbox");
    await userEvent.clear(box);
    await userEvent.type(box, "Sofia — the reserve is the reason this run is stronger.");
    await userEvent.click(within(panel()).getByRole("button", { name: /save the change/i }));

    await waitFor(() => expect(calls.some((call) => call.method === "PATCH" && call.url.endsWith(`/feedback/${FIRST.id}`))).toBe(true));
    await waitFor(() => expect(panel().textContent).toContain("the reserve is the reason this run is stronger"));
  });

  it("says nothing has been sent when nothing has", async () => {
    vi.stubGlobal("fetch", service([]));
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });

    expect(presentedAsHeard()).toEqual([]);
    expect(within(panel()).getByText(/Nothing has been written back/i)).toBeInTheDocument();
  });
});

/**
 * D13 — the panel that said the note had not been sent, directly above "Sent."
 *
 * Walking the demonstration runbook found the write-back panel rendering *"Nothing has been
 * written back about this run yet."* above *"Sent. They will see it next time they open BOW."*
 * The note had reached the child — her own screen carried it — and the teacher's screen said it
 * had not. Measured on the seeded class before the fix: the two lines were on screen together
 * for 215 ms beside the service, and 2.7 s with the class read throttled to a school network.
 *
 * The cause was ordering, not data. `sendFeedback` posted the note, asked for a fresh reading of
 * the class and returned **without waiting for it**, so the panel's confirmation was drawn
 * against the reading from before the note existed. The fix is that the mutation resolves only
 * once the class has been read back, which is asserted here by holding the re-read open: while it
 * is open there is no confirmation on screen, and by the time there is one the note is in the
 * sequence. No optimistic second copy of a teacher's sentence is kept anywhere.
 */
describe("a note that has been sent is never described as unsent", () => {
  /** The service, with the re-read after a write held open until the test lets it through. */
  function deferredService(notes: TeacherFeedback[]) {
    let release: (() => void) | null = null;
    let held = 0;
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? "GET";
      if (method === "POST" && url.endsWith("/feedback")) {
        const sent = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { body: string };
        notes.push({ id: `f_${notes.length}`, classCode: CODE, seatCode: SEAT, sessionId: SUBMISSION.sessionId, body: sent.body, at: 1_776_000_240_000, flagged: false });
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: `f_${notes.length}` }), text: () => Promise.resolve("{}") } as Response);
      }
      const body = {
        class: { code: CODE, label: "Period 3", challengeId: SUBMISSION.challengeId, createdAt: 1, expiresAt: 2 },
        assignments: [],
        submissions: [{ ...SUBMISSION, displayName: "Sofia Nguyen" }],
        roster: [{ seatCode: SEAT, displayName: "Sofia Nguyen", claimed: true, claimedAt: 1, removedAt: null }],
        progress: [],
        feedback: notes.map((note) => ({ ...note })),
      };
      const response = { ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) } as Response;
      // Only the reading that follows a write is held; the first one has to land or there is
      // no page to press a button on.
      if (notes.length === 0) return Promise.resolve(response);
      held += 1;
      return new Promise<Response>((resolve) => { release = () => resolve(response); });
    });
    return { fetcher, letTheReadThrough: () => { release?.(); }, heldReads: () => held };
  }

  it("holds the confirmation until the class has been read back", async () => {
    const notes: TeacherFeedback[] = [];
    const { fetcher, letTheReadThrough } = deferredService(notes);
    vi.stubGlobal("fetch", fetcher);
    openEvidence();
    await screen.findByRole("heading", { name: /What they hear from you/i });
    expect(within(panel()).getByText(/Nothing has been written back/i)).toBeInTheDocument();

    await userEvent.type(within(panel()).getByRole("textbox"), "You caught the shortfall late, and you caught it. Say which number you checked first.");
    void userEvent.click(within(panel()).getByRole("button", { name: /send it/i }));

    // The re-read is open. There is no confirmation yet, so the refusal above the box is not
    // standing next to one — which is the whole of D13.
    await waitFor(() => expect(within(panel()).getByRole("button", { name: /sending/i })).toBeInTheDocument());
    expect(panel().textContent).not.toContain("Sent. They will see it");

    letTheReadThrough();

    await waitFor(() => expect(panel().textContent).toContain("Sent. They will see it"));
    expect(within(panel()).queryByText(/Nothing has been written back/i)).not.toBeInTheDocument();
    expect(presentedAsHeard().join(" ")).toContain("You caught the shortfall late");
  });
});
