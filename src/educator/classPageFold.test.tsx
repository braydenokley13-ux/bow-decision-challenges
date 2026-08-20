// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview } from "./RealClassPages";
import { classSpineFrom } from "./classSpine";
import { rememberKey } from "./classMemory";
import { demoClassBundle } from "../fixtures/demoClass";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";

/**
 * The fold a teacher reads in ten seconds, checked as a whole rather than a sentence at a time.
 *
 * ## What was wrong, and why the existing guard could not see it
 *
 * `denominatorsAgree.test.tsx` is a good test and it is about **numbers**: a page may count more
 * than one set of children, and every number it prints belongs to a named set. A
 * teacher-experience review found four strings on one fold that pass that rule and still cannot
 * all be believed:
 *
 * - `21 of 28 turned in. 21 of 21 still to read.`
 * - `0% of the 9 read so far showed it — 0 of 9.`
 * - `Nobody's writing has been read yet, so there is nothing to quote.`
 * - `9 of them have a usable result — one whose written explanation somebody has read.`
 *
 * Every one is true of its own set. The denominators agree; the **sentences** contradict. Nine
 * children had a usable result and nobody's writing had been read, because a usable result is a
 * run that produced a result for everything the work asks for and several of those requirements
 * are read off decisions rather than off writing — and three of the four sentences said, in
 * different words, that it means somebody read the writing.
 *
 * ## What is asserted
 *
 * Pairs, not counts. The page is rendered in the three states a class passes through and each
 * rule below is a thing two sentences may not both say. That is a different guard from the one
 * next door, and it is the one that would have caught this — a fix that only corrects the four
 * strings leaves the next one to be found by a person.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const ASSIGNMENT = `assignment-${CODE}`;
const CREATED_AT = 1_776_000_000_000;

/**
 * Eighteen real runs, and a teacher part-way through marking them.
 *
 * The runs come from the sample class's own builder, which drives the actual reducer — so the
 * state this test renders is a state a real class reaches rather than a shape somebody typed.
 * That matters here more than usual: the fold's contradiction only appears when a class has
 * usable results *and* unread writing at the same time, and a hand-built fixture that made
 * `assessed` a function of `marked` would have made the case unreachable. This bundle produces
 * twelve usable results with five explanations still in the pile.
 */
const SAMPLE = demoClassBundle();

const NAMES = [
  "Aiden R", "Bianca T", "Caleb M", "Dinah O", "Elias P", "Farrah Q", "Gita S", "Hal W", "Ivy N",
  "Jonah P", "Kira L", "Luca M", "Mina O", "Noor A", "Omar T", "Pia R", "Quinn D", "Rosa V",
];

const RECORD: ClassRecord = {
  code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10,
};

function assignment(): Assignment {
  return { ...SAMPLE.assignments[0]!, id: ASSIGNMENT, classId: CODE };
}

type Marking = "as-marked" | "none" | "all";

function classOf(turnedIn: number, marking: Marking): { submissions: AttributedSubmission[]; roster: { seatCode: string; displayName: string; claimed: boolean; claimedAt: number; removedAt: null }[] } {
  const submissions = SAMPLE.submissions.slice(0, turnedIn).map((submission, index) => ({
    ...submission,
    classCode: CODE,
    assignmentId: ASSIGNMENT,
    displayName: NAMES[index] ?? `Student ${index + 1}`,
    ...(marking === "none" ? { reasoningPoints: null, reasoningCriteria: undefined } : {}),
    ...(marking === "all" ? { reasoningPoints: 6, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 } } : {}),
  })) as unknown as AttributedSubmission[];
  const roster = NAMES.map((displayName, index) => ({
    seatCode: submissions[index]?.seatCode ?? String(index + 1),
    displayName, claimed: index < turnedIn, claimedAt: CREATED_AT, removedAt: null,
  }));
  return { submissions, roster };
}

let calls = 0;

function service(bundle: ReturnType<typeof classOf>) {
  const body = {
    class: RECORD,
    assignments: [assignment()],
    submissions: bundle.submissions,
    roster: bundle.roster,
    progress: [],
    feedback: [],
  };
  return vi.fn(() => {
    calls += 1;
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);
  });
}

function openClass() {
  return render(
    <MemoryRouter initialEntries={[`/educator/class/${CODE}`]}>
      <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
    </MemoryRouter>,
  );
}

const pageText = () => (document.querySelector("main")?.textContent ?? "").replace(/\s+/g, " ");

/** The three states a class passes through in one lesson. */
const STATES = [
  { name: "nothing turned in", turnedIn: 0, marking: "none" as const },
  { name: "turned in, nothing read", turnedIn: 18, marking: "none" as const },
  { name: "part-marked", turnedIn: 18, marking: "as-marked" as const },
  { name: "everything read", turnedIn: 18, marking: "all" as const },
];

beforeEach(() => {
  window.localStorage.clear();
  rememberKey(CODE, KEY);
  calls = 0;
});

describe("no two sentences on the fold that a teacher could not both believe", () => {
  for (const state of STATES) {
    it(`reads as one page with ${state.name}`, async () => {
      const bundle = classOf(state.turnedIn, state.marking);
      vi.stubGlobal("fetch", service(bundle));
      openClass();
      await waitFor(() => expect(pageText()).toMatch(/turned in|have not started|are working/i));

      // The same derivation the page reads, so the assertions are about the sentences rather
      // than about a number this test guessed.
      const spine = classSpineFrom({ record: RECORD, assignments: [assignment()], submissions: bundle.submissions });
      const text = pageText();

      // 1. Nothing may claim no writing has been read while a page's own counts say some has.
      //    This is the pair the review found: "Nobody's writing has been read yet" printed on a
      //    fold where nine children had been read and marked.
      if (spine.submitted > spine.awaitingReading) {
        expect(text, "some writing has been read").not.toMatch(/Nobody'?s writing has been read/i);
      }
      if (spine.assessed > 0) {
        expect(text, "some students have a usable result").not.toMatch(/Nothing is assessed yet/i);
      }

      // 2. `assessed` is never labelled as a count of writing somebody has read. The two sets
      //    are genuinely different and the page has to stop saying they are the same one.
      expect(text).not.toMatch(/read so far/i);
      expect(text).not.toMatch(/usable result — one whose written explanation somebody has read/i);

      // 3. A noun and its verb agree. "1 student were never asked this in their run" is not
      //    English, and a teacher could not read it to a parent.
      expect(text).not.toMatch(/\b1 students\b/);
      expect(text).not.toMatch(/\b1 student (?:were|have|are)\b/);
      expect(text).not.toMatch(/\b(?:[02-9]|\d\d+) students (?:was|has|is)\b/);

      // 4. Every share says what was shown. "26% of the 19 students with a usable result showed
      //    it." was the largest sentence on the page with no subject in it.
      for (const [sentence] of text.matchAll(/[^.]*%[^.]*\./g)) {
        if (!/showed/.test(sentence)) continue;
        expect(sentence, sentence).toMatch(/showed (?!it\b)\S+/);
      }

      // 5. The reading pile the headline names is the pile the spine counts.
      //    The noun moved into the middle of the phrase when the pile became the headline's
      //    subject — "5 of 18 explanations still to read." — and the rule is about the two
      //    numbers rather than about the words between them.
      const stillToRead = /(\d+) of (\d+)(?: explanations?)? still to read/.exec(text);
      if (spine.awaitingReading > 0 && spine.submitted > 0) {
        expect(stillToRead?.[1]).toBe(String(spine.awaitingReading));
        expect(stillToRead?.[2]).toBe(String(spine.submitted));
      }
    });
  }

  /**
   * The state the review actually found and the old generator could not produce: a usable
   * result and an unread explanation at the same time. If this precondition ever stops holding,
   * rule 1 above is passing over a case that does not arise and somebody should know.
   */
  it("reaches a class with usable results and unread writing at once", () => {
    const bundle = classOf(18, "as-marked");
    const spine = classSpineFrom({ record: RECORD, assignments: [assignment()], submissions: bundle.submissions });
    expect(spine.awaitingReading).toBeGreaterThan(0);
    expect(spine.assessed).toBeGreaterThan(0);
  });
});

describe("every student list on a class with a roster is in names", () => {
  it("names them in the pull-out group and in their own words", async () => {
    const bundle = classOf(18, "all");
    vi.stubGlobal("fetch", service(bundle));
    openClass();
    await waitFor(() => expect(pageText()).toMatch(/turned in|have not started/i));

    // The two blocks the review named have to actually be on screen, or this assertion passes
    // by rendering neither of them — which is how it passed for a while with the fix removed.
    expect(pageText(), "the misconception spotlight did not render").toMatch(/What appears misunderstood/i);
    expect(pageText(), "the pull-out group did not render").toMatch(/Who needs it/i);
    // A roster is the whole point of the rule: BOW is holding these names, and the two blocks
    // that printed seat numbers sat directly above a list of them.
    expect(pageText()).not.toMatch(/Seat \d+/);
    expect(pageText()).toContain("Aiden R");
  });
});

/**
 * The reading is a reading, not a live feed — and the page says which.
 *
 * "Right now" used to be a section with its own heading, its own tile row and its own
 * timestamp. The counts are the instrument's foot now and the timestamp is on the class
 * identity line, because they are context for the triage rather than a question of their
 * own — but the two things this test is actually about are unchanged and are what it still
 * asserts: the page says when the reading was taken, and offers a control that takes
 * another. Auto-polling is still deliberately not it.
 */
describe("the page says when its reading was taken, and can take another", () => {
  it("carries a timestamp and a control that asks the service again", async () => {
    const bundle = classOf(3, "none");
    // Two seats mid-run, which is what makes the panel render at all.
    vi.stubGlobal("fetch", vi.fn(() => {
      calls += 1;
      const body = {
        class: RECORD,
        assignments: [assignment()],
        submissions: bundle.submissions,
        roster: bundle.roster,
        progress: [
          { seatCode: "7", worldId: "basketball", stage: "setup", updatedAt: Date.now() - 60_000, startedAt: CREATED_AT },
          { seatCode: "8", worldId: "basketball", stage: "setup", updatedAt: Date.now() - 30_000, startedAt: CREATED_AT },
        ],
        feedback: [],
      };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) } as Response);
    }));
    openClass();

    await screen.findByRole("heading", { level: 1 });
    const panel = document.querySelector<HTMLElement>(".class-identity")!;
    // "Right now" was a snapshot: two API calls, both at load, and a teacher who waited sixty
    // seconds watched nothing change on the one part of the page that tells her who is stuck.
    expect(within(panel).getByText(/^As at /)).toBeInTheDocument();

    const before = calls;
    await userEvent.click(within(panel).getByRole("button", { name: /check again/i }));
    await waitFor(() => expect(calls).toBeGreaterThan(before));
  });
});
