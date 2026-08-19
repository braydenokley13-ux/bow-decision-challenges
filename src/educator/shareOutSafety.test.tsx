// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareOut } from "./ShareOut";
import { analyseClass } from "./analysis";
import { shareOutReading } from "./shareOut";
import { rememberKey } from "./classMemory";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { AttributedSubmission } from "../platform/classes/types";

/**
 * What BOW recommends for the wall, and what it will not.
 *
 * ## What a teacher was offered
 *
 * A teacher-experience review opened `/educator/class/:code/share-out` and found a section headed
 * **WORTH SHOWING**, each card carrying a child's full name, their whole explanation, and a
 * `Show this` button. Among the eight it recommended:
 *
 * > **Isabella Rossi** — *"My mom lost her job last year so I know what it is like when money
 * > goes away. I left $400 spare and it saved me."*
 *
 * > **Mei-Ling Chen** — *Their writing is a good way into "says what made one claim matter
 * > more"* — *"i dont know. i just guessed"*
 *
 * Two clicks turn the names on and the projector reads the first of those with a child's name
 * over it. Names default off and the teacher chooses, which is why the review did not refuse —
 * but the recommendation is a judgement the product was making on her behalf, and the second one
 * is a pedagogical claim about writing nobody had read.
 *
 * ## What is asserted
 *
 * The review's own test, in their words: seed a class containing both sentences; neither appears
 * in the picker as a recommendation, and turning the names toggle on shows a warning.
 *
 * Both students still turn work in, still have every other reason a candidate can earn, and are
 * still read and marked exactly like everybody else. The only thing that changes is whether BOW
 * puts their sentence on a list headed "worth showing" with a button that projects it.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";

const DISCLOSING = "My mom lost her job last year so I know what it is like when money goes away. I left $400 spare and it saved me.";
const NON_ANSWER = "i dont know. i just guessed";

/**
 * A class of six with the two sentences in it, and four ordinary explanations around them.
 *
 * Real runs through the real reducer, varied so the share-out has something to offer at all — a
 * picker with nothing on it would pass this test for the wrong reason.
 */
function seeded(): { submissions: AttributedSubmission[]; roster: { seatCode: string; displayName: string; claimed: boolean; claimedAt: number; removedAt: null }[] } {
  const names = ["Isabella Rossi", "Mei-Ling Chen", "Caleb M", "Dinah O", "Elias P", "Farrah Q"];
  const written = [
    DISCLOSING,
    NON_ANSWER,
    "I kept the reserve high because the showcase was the thing that could still go wrong, and the course seat was already paid.",
    "I put most of it on the goal line because the seat mattered more to Avery than the clinics did, and the bus share was already promised.",
    "The cushion stayed at $350 because the generator is rented and rented things break, which meant a smaller cut for me.",
    "I cooked fewer trays on the cold Saturday so nothing went in the bin, and that paid for the seal in the end.",
  ];
  const basketball = [0, 1, 2, 3].map((index) => ({
    ...buildSubmission({
      seatCode: String(index + 1),
      defenseText: written[index]!,
      ...(index % 2 === 0 ? { setupId: "cousin-room" as const } : { setupId: "gym-sublet" as const }),
      week3Funded: index % 2 === 0 ? ["away-travel", "sister-present"] : ["team-shoes"],
      startedAt: 1_776_000_000_000 + index * 60_000,
    }),
    classCode: CODE,
    assignmentId: "a",
  }));
  const popUp = [4, 5].map((index) => ({
    ...buildPopUpSubmission({
      seatCode: String(index + 1),
      writeUpText: written[index]!,
      spotId: index === 4 ? "middle-row" : "bridge-gate",
      startedAt: 1_776_000_000_000 + index * 60_000,
    }),
    classCode: CODE,
    assignmentId: "a",
  }));
  const submissions = [...basketball, ...popUp].map((submission, index) => ({
    ...submission,
    displayName: names[index]!,
    // Every explanation read and marked, so the one card whose reason is a claim about the
    // writing is available to be earned — otherwise this test would pass because nothing was
    // marked rather than because of the rule it is about.
    reasoningPoints: 6,
    reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 },
  })) as unknown as AttributedSubmission[];
  const roster = submissions.map((submission, index) => ({
    seatCode: submission.seatCode, displayName: names[index]!, claimed: true, claimedAt: 1, removedAt: null,
  }));
  return { submissions, roster };
}

const SEEDED = seeded();

function service() {
  const body = {
    class: { code: CODE, label: "Period 3", challengeId: SEEDED.submissions[0]!.challengeId, createdAt: 1, expiresAt: 2 },
    assignments: [],
    submissions: SEEDED.submissions,
    roster: SEEDED.roster,
    progress: [],
    feedback: [],
  };
  // The share-out selection, kept the way the service keeps it: a PUT echoes back what it
  // stored, which is what makes the names toggle a round trip rather than local state.
  let stored: unknown = null;
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/shareout")) {
      if ((init?.method ?? "GET") === "PUT") {
        const sent = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { items: unknown[]; named: boolean };
        stored = { items: sent.items, named: sent.named, updatedAt: 1 };
      }
      const payload = { selection: stored };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload), text: () => Promise.resolve(JSON.stringify(payload)) } as Response);
    }
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);
  });
}

function openPicker() {
  return render(
    <MemoryRouter initialEntries={[`/educator/class/${CODE}/share-out`]}>
      <Routes><Route path="/educator/class/:code/share-out" element={<ShareOut />} /></Routes>
    </MemoryRouter>,
  );
}

const picker = () => screen.getByRole("heading", { name: /Worth showing/i }).closest("section")!;

beforeEach(() => {
  window.localStorage.clear();
  rememberKey(CODE, KEY);
  vi.stubGlobal("fetch", service());
});

describe("what BOW will not recommend for the room", () => {
  /** The precondition. A picker with nothing on it would pass every test below for free. */
  it("still has candidates to offer", () => {
    const reading = shareOutReading(analyseClass(SEEDED.submissions).rows, SEEDED.submissions);
    expect(reading.candidates.length).toBeGreaterThan(0);
  });

  it("does not offer a sentence about the student's own home", () => {
    const reading = shareOutReading(analyseClass(SEEDED.submissions).rows, SEEDED.submissions);
    expect(reading.candidates.map((candidate) => candidate.quote ?? "")).not.toContain(DISCLOSING);
    expect(reading.withheld.some((entry) => entry.why === "names-somebody-at-home")).toBe(true);
  });

  it("does not offer an answer with nothing in it to discuss", () => {
    const reading = shareOutReading(analyseClass(SEEDED.submissions).rows, SEEDED.submissions);
    expect(reading.candidates.map((candidate) => candidate.quote ?? "")).not.toContain(NON_ANSWER);
    expect(reading.withheld.some((entry) => entry.why === "too-little-to-discuss")).toBe(true);
  });

  /**
   * The claim the product was making about writing nobody had opened. It says on three other
   * screens that it does not score student writing; this card said one piece of it was "a good
   * way into" a skill gap.
   */
  it("never says a piece of writing is a good way into anything", () => {
    const reading = shareOutReading(analyseClass(SEEDED.submissions).rows, SEEDED.submissions);
    for (const candidate of reading.candidates) {
      expect(candidate.reason).not.toMatch(/good way into/i);
    }
  });

  it("keeps both sentences off the picker on screen", async () => {
    openPicker();
    await screen.findByRole("heading", { name: /Worth showing/i });

    expect(picker().textContent).not.toContain(DISCLOSING);
    expect(picker().textContent).not.toContain(NON_ANSWER);
    // Withheld, not hidden: the page says the rule and where the writing actually lives.
    expect(picker().textContent).toMatch(/own page and in the reading queue/i);
  });

  /**
   * The moment a decision about a plan becomes a decision about a child. The review turned this
   * on and the projector read a full name over a sentence about that child's household, with
   * nothing on screen having asked her to read it first.
   */
  it("warns the teacher when she turns names on", async () => {
    openPicker();
    await screen.findByRole("heading", { name: /Worth showing/i });

    expect(screen.queryByText(/read each one again/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Show names on the screen/i }));

    await waitFor(() => expect(screen.getByText(/read each one again/i)).toBeInTheDocument());
  });
});
