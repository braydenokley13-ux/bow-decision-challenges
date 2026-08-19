// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { ReadingQueue } from "./ReadingQueue";
import { Debrief } from "./Debrief";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import { rememberKey } from "./classMemory";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { PLAN_UNDER_PRESSURE_LAUNCH } from "../domain/scenario/registry";
import { BUILT_WORLD_COVERAGE } from "../domain/competency/availability";
import type { CompetencyId } from "../domain/competency/types";
import type { AttributedSubmission } from "../platform/classes/types";

/**
 * The prose a teacher reads about a child, swept for template seams.
 *
 * ## What this is about
 *
 * A world-class-product review read the rendered educator evidence and found **eleven**
 * sentences across two students with the joins showing. Verbatim, off
 * `/educator/class/CCGMU/students/12`:
 *
 * > "…and the $25 left over could not have covered **Your share of the night cleaner** and **A
 * > painted sign for the truck**."
 *
 * > "A basis that fits both halves of a choice explains neither of them. **you** said it was
 * > the one you only wanted, which is true of **A painted sign for the truck** and of nothing
 * > they paid for."
 *
 * A card heading dropped into the middle of a sentence, a sentence that starts lower case
 * because the fragment after the join does, and a person that drifts from *they* to *you*
 * inside one sentence. This is the page a teacher reads before deciding what a child showed,
 * and may quote to a parent. The bar is that it reads as though a person wrote it.
 *
 * ## Why a sweep rather than three assertions
 *
 * Every one of these came out of one composition rule applied to strings that were written for
 * a different position in a sentence — so the next one will come from the next string somebody
 * adds to the same table. The three rules below are the review's own conditions, and they are
 * run over whatever the pages actually render for a set of seeded runs rather than over a list
 * of sentences somebody remembered to add. A new claim, a new reason, a new world: the sweep
 * reads it without being told.
 *
 * Both worlds, three seeded runs each, and the runs are chosen to make the composition work —
 * each one settles the competing-claims beat differently, because that beat is where the joins
 * are. Basketball keeps a separate `inSentence` for exactly this and reads clean; the market
 * did not have one, which is what the review found.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const ASSIGNMENT = `assignment-${CODE}`;
const CREATED_AT = 1_776_000_000_000;
const MINUTE = 60_000;

/**
 * Three ways of settling the season's Week 3 cash and three of settling the market's tips jar.
 *
 * Between them they reach every branch of the two `holdsRead` functions: a reason true of what
 * was left unpaid and of nothing paid for, a reason true of both halves, and a reason true of
 * nothing that was left — plus a one-claim and a two-claim list, because the joins differ.
 */
const BASKETBALL_RUNS = [
  { week3Funded: ["away-travel", "sister-present"], week3Reason: "can-wait" as const, defenseText: "The shoes can wait a few weeks. The bus money was promised." },
  { week3Funded: ["team-shoes"], week3Reason: "no-one-counting" as const, defenseText: "Nobody else needed the other two, so the shoes came first." },
  { week3Funded: ["away-travel"], week3Reason: "only-wanted" as const, defenseText: "The present was the one I only wanted, so it went." },
];

const POPUP_RUNS = [
  { tipClaims: ["cleaner-share", "truck-sign"] as const, tipReason: "can-wait" as const, writeUpText: "The seal can wait one more week, even though it costs more later." },
  { tipClaims: ["cool-box"] as const, tipReason: "only-wanted" as const, writeUpText: "The sign was the one I only wanted, so it went first." },
  { tipClaims: ["cool-box"] as const, tipReason: "no-one-counting" as const, writeUpText: "Nobody else was counting on the other two, so the box won." },
];

function seededClass(): { submissions: AttributedSubmission[]; roster: { seatCode: string; displayName: string; claimed: boolean; claimedAt: number; removedAt: null }[] } {
  const names = ["Aiden R", "Bianca T", "Caleb M", "Dinah O", "Elias P", "Farrah Q"];
  const basketball = BASKETBALL_RUNS.map((options, index) => ({
    ...buildSubmission({ ...options, seatCode: String(index + 1), startedAt: CREATED_AT + index * 6 * MINUTE }),
    classCode: CODE,
    assignmentId: ASSIGNMENT,
  }));
  const popUp = POPUP_RUNS.map((options, index) => ({
    ...buildPopUpSubmission({ ...options, seatCode: String(BASKETBALL_RUNS.length + index + 1), startedAt: CREATED_AT + (BASKETBALL_RUNS.length + index) * 6 * MINUTE }),
    classCode: CODE,
    assignmentId: ASSIGNMENT,
  }));
  const submissions = [...basketball, ...popUp].map((submission, index) => ({
    ...submission,
    displayName: names[index] ?? `Seat ${submission.seatCode}`,
  })) as AttributedSubmission[];
  const roster = submissions.map((submission, index) => ({
    seatCode: submission.seatCode, displayName: names[index]!, claimed: true, claimedAt: CREATED_AT, removedAt: null,
  }));
  return { submissions, roster };
}

const SEEDED = seededClass();

function service() {
  const competencyIds: CompetencyId[] = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.competencyId))];
  const body = {
    class: { code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10 },
    assignments: [{
      id: ASSIGNMENT, classId: CODE, objectiveRef: null, competencyIds,
      allowedWorldIds: PLAN_UNDER_PRESSURE_LAUNCH.allowedWorlds,
      studentChoosesWorld: PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld,
      format: "decision-challenge", assignedStudentIds: null, createdAt: CREATED_AT,
    }],
    submissions: SEEDED.submissions,
    roster: SEEDED.roster,
    progress: [],
    feedback: [],
  };
  return vi.fn(() => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response));
}

/**
 * Every block of running text this render put on screen.
 *
 * Blocks rather than the whole `innerText`, because the rules below are about a *sentence*, and
 * two unrelated blocks stacked by CSS are not one sentence — sweeping the concatenation would
 * report the join between a heading and the paragraph under it as a defect in the paragraph.
 */
const BLOCK = "p, li, blockquote, cite, td, dd, figcaption";

function blocks(): string[] {
  return [...document.querySelectorAll(BLOCK)]
    // Leaf blocks only. A `<td>` holding three `<p>`s has a `textContent` that runs the three
    // together with no space, which is neither what a person reads nor a sentence — sweeping it
    // would report the join between two paragraphs as a defect inside one of them.
    .filter((node) => node.querySelector(BLOCK) === null)
    .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
}

/**
 * The three rules, in the words of the review that wrote them.
 *
 * Each returns the offending fragment so a failure names the sentence rather than a count.
 */
const RULES = [
  {
    name: "a lower-case letter after a sentence-terminating stop",
    // A stop, a space, and a lower-case letter. `e.g.`-style abbreviations and a decimal point
    // are excluded by requiring whitespace after the stop and a letter before it.
    find: (text: string) => /[a-z0-9”"’'][.!?]\s+[a-z]\w*/.exec(text)?.[0] ?? null,
  },
  {
    name: "a capitalised article or possessive mid-sentence",
    // "went on A painted sign", "covered Your share" — a card heading dropped into a sentence.
    // Anchored on a lower-case word before it, so a genuine sentence start never matches.
    find: (text: string) => /\b[a-z]+\s+(?:A|An|The|Your|My|Their|His|Her)\s+[a-z]/.exec(text)?.[0] ?? null,
  },
  {
    name: "second person in a sentence that also uses third person",
    find: (text: string) => {
      // A block that is entirely inside the product's own quotation marks is a line a teacher is
      // being asked to say out loud — the debrief's discussion prompts are the only ones, and
      // "You took 3 different booths and every one of them could work" is second person because
      // it is addressed to the room. That is a register, not a seam. Anything quoted *within* a
      // longer sentence is still swept, which is where the reason labels live.
      if (/^[“"].*[”"]$/.test(text)) return null;
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        const second = /\b(?:you|your|yours|yourself)\b/i.exec(sentence);
        const third = /\b(?:they|them|their|theirs|themselves)\b/i.exec(sentence);
        if (second && third) return sentence;
      }
      return null;
    },
  },
] as const;

/**
 * The seams in one render, as a list a failure can print.
 *
 * A student's own writing is excluded, and that is the point of the exclusion rather than a
 * convenience: this sweep is about prose *BOW* generated, and a twelve-year-old's paragraph is
 * evidence. Quoting it back with its capitalisation corrected would be the product editing a
 * child's work, and `blockquote`/`.spotlight__work` is where the product already puts it.
 */
function seams(): string[] {
  const found: string[] = [];
  const written = new Set([...document.querySelectorAll("blockquote, .student-writing, .explanation__body")]
    .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim()));
  for (const text of blocks()) {
    if (written.has(text) || [...written].some((quote) => quote.length > 0 && text.includes(quote))) continue;
    for (const rule of RULES) {
      const hit = rule.find(text);
      if (hit) found.push(`${rule.name} :: …${hit}… in "${text.slice(0, 180)}"`);
    }
  }
  return found;
}

function open(path: string, route: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route} element={element} /></Routes>
    </MemoryRouter>,
  );
}

/**
 * The sample class as well, because it is eighteen more runs and a teacher reads it first.
 *
 * `DEMO` needs no key and no service — `useClassEvidence` answers it from the fixture — so it
 * costs nothing to sweep and it exercises branches the six seeded runs above do not: a fumbled
 * sum, a hint opened, a reach for committed money, an unread explanation.
 */
const DEMO_SEATS = ["3", "7", "12", "14", "16"];

const SURFACES = [
  ...DEMO_SEATS.map((seatCode) => ({
    name: `the sample class, seat ${seatCode}`,
    path: `/educator/class/DEMO/students/${seatCode}`,
    route: "/educator/class/:code/students/:seatCode",
    element: <RealStudentEvidence />,
    settled: () => screen.findAllByRole("link", { name: /Class evidence/i }),
  })),
  { name: "the sample class", path: "/educator/class/DEMO", route: "/educator/class/:code", element: <RealClassOverview />, settled: () => screen.findAllByText(/Sample class|turned in/i) },
  { name: "the sample class debrief", path: "/educator/class/DEMO/debrief", route: "/educator/class/:code/debrief", element: <Debrief />, settled: () => screen.findAllByText(/class|debrief/i) },

  { name: "the class evidence room", path: `/educator/class/${CODE}`, route: "/educator/class/:code", element: <RealClassOverview />, settled: () => screen.findAllByText(/Period 3|turned in/i) },
  { name: "the reading queue", path: `/educator/class/${CODE}/reading`, route: "/educator/class/:code/reading", element: <ReadingQueue />, settled: () => screen.findAllByText(/read|queue/i) },
  { name: "the debrief", path: `/educator/class/${CODE}/debrief`, route: "/educator/class/:code/debrief", element: <Debrief />, settled: () => screen.findAllByText(/class|debrief/i) },
  ...SEEDED.submissions.map((submission) => ({
    name: `seat ${submission.seatCode}'s evidence`,
    path: `/educator/class/${CODE}/students/${submission.seatCode}`,
    route: "/educator/class/:code/students/:seatCode",
    element: <RealStudentEvidence />,
    settled: () => screen.findAllByRole("link", { name: /Class evidence/i }),
  })),
];

describe("the prose BOW writes about a child has no template seams", () => {
  beforeEach(() => {
    window.localStorage.clear();
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", service());
  });

  for (const surface of SURFACES) {
    it(`reads as a person wrote it on ${surface.name}`, async () => {
      open(surface.path, surface.route, surface.element);
      await surface.settled();

      expect(seams()).toEqual([]);
    });
  }

  /**
   * The sweep has to be able to see a seam, or an empty result means nothing.
   *
   * Two of the three rules ran green over the eleven sentences the review found for a while,
   * because the regexes were tuned on the fixed text rather than the broken text. These are the
   * review's own examples, verbatim.
   */
  it("finds the seams the review reported, when they are put in front of it", () => {
    document.body.innerHTML = `
      <p>and the $25 left over could not have covered Your share of the night cleaner and A painted sign for the truck.</p>
      <p>A basis that fits both halves of a choice explains neither of them. you said it was the one you only wanted, which is true of A painted sign for the truck and of nothing they paid for.</p>
    `;
    const found = seams();
    expect(found.some((entry) => entry.startsWith("a lower-case letter after"))).toBe(true);
    expect(found.some((entry) => entry.startsWith("a capitalised article"))).toBe(true);
    expect(found.some((entry) => entry.startsWith("second person"))).toBe(true);
  });
});
