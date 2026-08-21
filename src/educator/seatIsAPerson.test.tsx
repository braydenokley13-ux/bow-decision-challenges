// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { rememberKey } from "./classMemory";
import { demoClassBundle } from "../fixtures/demoClass";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { AttributedSubmission, ClassRecord } from "../platform/classes/types";

/**
 * A seat on the roster is a person, whether or not they have turned anything in.
 *
 * The class page names a mid-run child twice on its first screen — in the triage chip and in
 * *Who is mid-run right now* — and both were links. Following either landed on:
 *
 *     SEAT 11
 *     Nothing from this seat.
 *     No student has turned work in from seat 11 in this class.
 *
 * No name, no state, no screen they were on, no way to the next child: the page contradicting
 * the page that linked to it, one click earlier, on a class where the teacher had pasted the
 * name herself. The four children who had not started at all were named on the class page and
 * rendered as plain text with no link at all, so they had no per-seat surface in either
 * direction (`DEFECTS.md` D19).
 *
 * The refusal is kept for the one case where it is true — a seat with no roster row — and it
 * says that in those words.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const ASSIGNMENT = `assignment-${CODE}`;
const CREATED_AT = 1_776_000_000_000;
// The page measures "right now" from the reading it was fetched at, so a checkpoint written
// in 2026 fixture time would read as a child who stopped four months ago.
const NOW = Date.now();
const SAMPLE = demoClassBundle();
const WORKING = "90";
const IDLE = "91";

const RECORD: ClassRecord = {
  code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10,
};

function service() {
  const submissions = SAMPLE.submissions.slice(0, 6).map((entry) => ({
    ...entry, classCode: CODE, assignmentId: ASSIGNMENT,
  })) as unknown as AttributedSubmission[];
  const body = {
    class: RECORD,
    assignments: [{ ...SAMPLE.assignments[0]!, id: ASSIGNMENT, classId: CODE }],
    submissions,
    roster: [
      ...submissions.map((entry) => ({
        seatCode: entry.seatCode, displayName: `Seat ${entry.seatCode}`, claimed: true, claimedAt: CREATED_AT, removedAt: null,
      })),
      { seatCode: WORKING, displayName: "Linnea Thornbury", claimed: true, claimedAt: CREATED_AT, removedAt: null },
      { seatCode: IDLE, displayName: "Orrin Vasquene", claimed: true, claimedAt: CREATED_AT, removedAt: null },
    ],
    progress: [{ seatCode: WORKING, worldId: "basketball", stage: "working-plan", startedAt: CREATED_AT, updatedAt: NOW }],
    feedback: [],
  };
  return vi.fn(() => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response));
}

beforeEach(() => { window.localStorage.clear(); rememberKey(CODE, KEY); });

function seatPage(seatCode: string) {
  return render(
    <MemoryRouter initialEntries={[`/educator/class/${CODE}/students/${seatCode}`]}>
      <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
    </MemoryRouter>,
  );
}

describe("a seat that has turned nothing in still has a name on its own page", () => {
  it("names the mid-run child, their state and the screen they are on", async () => {
    vi.stubGlobal("fetch", service());
    seatPage(WORKING);
    await waitFor(() => expect(document.querySelector("h1")?.textContent).toBe("Linnea Thornbury"));
    const said = document.body.textContent ?? "";
    expect(said, "the page that linked here said she is working").toMatch(/Still working/i);
    expect(said, "and which screen she is on").toMatch(/plan/i);
    expect(said, "no state is guessed from a run nobody has finished").toMatch(/Nothing turned in yet/i);
    expect(said, "and the sentence that contradicted the class page is gone").not.toMatch(/Nothing from this seat/i);
    expect(document.querySelector(".queue-bar"), "and the pile travels with her").toBeInTheDocument();
  });

  it("names a child who has not started, and calls the absence an absence", async () => {
    vi.stubGlobal("fetch", service());
    seatPage(IDLE);
    await waitFor(() => expect(document.querySelector("h1")?.textContent).toBe("Orrin Vasquene"));
    const said = document.body.textContent ?? "";
    expect(said).toMatch(/Not started/i);
    expect(said, "an absence, and never a zero").toMatch(/An absence, not a zero/i);
  });

  it("keeps the refusal for a seat this class has never heard of, and says why", async () => {
    vi.stubGlobal("fetch", service());
    seatPage("404");
    await waitFor(() => expect(document.body.textContent).toMatch(/Nothing from this seat/i));
    expect(document.body.textContent).toMatch(/no seat 404 on this class list/i);
  });
});

describe("the class page links to every child it names", () => {
  it("gives a seat with nothing turned in the same way in as a seat with work", async () => {
    vi.stubGlobal("fetch", service());
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}`]}>
        <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.querySelector(".triage")).toBeInTheDocument());
    for (const seat of [WORKING, IDLE]) {
      const chip = document.querySelector(`[data-seat-waiting="${seat}"]`);
      expect(chip, `seat ${seat} is in the triage`).toBeInTheDocument();
      expect(
        chip?.getAttribute("href"),
        `a child named on this page and not linked from it has no surface in either direction`,
      ).toBe(`/educator/class/${CODE}/students/${seat}`);
    }
  });
});
