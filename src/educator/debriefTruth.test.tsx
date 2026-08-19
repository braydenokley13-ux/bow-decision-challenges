// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { writtenAnswerFrom } from "../domain/evidence/writtenAnswer";
import { analyseClass, classRoll } from "./analysis";
import { Debrief } from "./Debrief";
import { RealClassOverview } from "./RealClassPages";
import { buildSubmission } from "../test/runChallenge";
import type { SubmissionRecord } from "../platform/classes/types";
import type { ShareOutSelection } from "../platform/identity/types";

/**
 * The sheet a teacher carries to the front of the room, held to what is on the screen.
 *
 * A teacher red team taught a real Grade 7 class of fourteen through this product and came
 * back with three things wrong with this one artefact. All three are here, and none of them is
 * pinned by asserting the wording that ships today — a page whose sentences are the test is a
 * page nobody can rewrite:
 *
 * **The debrief shared work nobody chose.** §5 was headed *Read these explanations aloud* and
 * held the first four write-ups in seat order with the children's names under them. In the
 * class below that is a thirteen-year-old's *"idk what else to say here."*, handed to a teacher
 * to read to the room, because that child sits in seat 4. `shareOut.ts` had already written
 * both of the rules this breaks — **nothing is shared unless a teacher chose it** and **a seat
 * number is not anonymity** — for the projector, and this page is what a teacher is holding
 * while they use the projector. So the assertions are about the rules: no student's writing is
 * on this page unless it is in the teacher's own selection, and what is on it is labelled the
 * way the room will see it labelled.
 *
 * **A replay corrupted every count on it.** One child pressed *Play it again* — which the
 * product invites, correctly. The debrief then read every submission *record* where the class
 * page reads the roll, so a room of eleven was told "of 12", that child was filed under two
 * mutually exclusive answers to what the class cut first, and the assessed rate on the sheet
 * disagreed with the assessed rate on the screen. A class with one student who went twice is
 * an ordinary Tuesday, so it is the class this file builds.
 *
 * **A count contradicted the rows beneath it.** *"Counts across the 0 of 10 with a usable
 * result"* printed directly above rows totalling ten, one of which read *"10 showed it"*. The
 * rows were right: every student who turned in lands in exactly one state per skill, and the
 * unassessed are named as an absence rather than dropped. The caption was the false one, and
 * what is asserted here is the relation rather than the sentence — the number a caption says
 * its counts are across is the number those counts add up to.
 */

afterEach(cleanup);

const NOW = 1_780_000_000_000;

/** Marks on the writing, which is what turns a submission into a usable result. */
const READ = { reasoningPoints: 8, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 1, "C6.4": 3 } };

const record = (submission: SubmissionRecord, over: Partial<SubmissionRecord> = {}): SubmissionRecord =>
  ({ ...submission, classCode: "XEWFA", submittedAt: NOW, ...over });

const NAMES = [
  "Ana R.", "Devon P.", "Leila H.", "Marcus T.", "Priya S.", "Jaylen W.", "Sofia M.",
  "Ibrahim K.", "Nina D.", "Carlos V.", "Mei L.", "Tyrell B.", "Hannah G.", "Omar F.",
];

/** The weakest sentence in the class, written by the child in the fourth seat. */
const WEAKEST = "idk what else to say here.";

/**
 * Fourteen seats, eleven students who finished, and one of them who had a second go.
 *
 * Carlos in seat 10 turned in twice. The two runs cut different things first, so a page that
 * counts records rather than students files him under both — and only the first was marked, so
 * a page that counts records also reports one more assessed student than there is.
 */
function theClass() {
  const submissions: SubmissionRecord[] = [
    record(buildSubmission({ seatCode: "1", setupId: "cousin-room", reserveSeat: true, defenseText: "I left both bonuses out because Avery cannot spend money that might not arrive." }), { sessionId: "s-1", ...READ }),
    record(buildSubmission({ seatCode: "2", setupId: "gym-sublet", countCompletion: true, defenseText: "I counted both bonuses because the plan would not reach the course without them." }), { sessionId: "s-2", ...READ }),
    record(buildSubmission({ seatCode: "3", setupId: "teammate-share", defenseText: "I put most of the money on the course because that is the thing Avery actually wants." }), { sessionId: "s-3", ...READ }),
    // Seat 4 is the reason §5 was a finding: weak writing, low seat number, first four in.
    record(buildSubmission({ seatCode: "4", setupId: "cousin-room", defenseText: WEAKEST }), { sessionId: "s-4", ...READ }),
    record(buildSubmission({ seatCode: "5", setupId: "cousin-room", reserveSeat: true, defenseText: "Reserve first, and the clinics only after the money was safe." }), { sessionId: "s-5", ...READ }),
    record(buildSubmission({ seatCode: "8", setupId: "gym-sublet", defenseText: "The plan works. It works because it works." }), { sessionId: "s-8", ...READ }),
    record(buildSubmission({ seatCode: "9", setupId: "teammate-share", defenseText: "a b c. d e f." }), { sessionId: "s-9", ...READ }),
    // The replay. Two attempts, two different first cuts, and only the older one marked.
    record(buildSubmission({ seatCode: "10", setupId: "cousin-room", defenseText: "First go: I took it out of the rides." }), { sessionId: "s-10a", submittedAt: NOW - 600_000, ...READ }),
    record(buildSubmission({ seatCode: "10", setupId: "cousin-room", split: { goal: 0.4, reserve: 0.4 }, defenseText: "Second go: I cut the course money instead." }), { sessionId: "s-10b" }),
    record(buildSubmission({ seatCode: "11", setupId: "cousin-room", reserveSeat: true, countCompletion: true, defenseText: "I counted the showcase bonus and lost it, so here is the repair." }), { sessionId: "s-11", ...READ }),
    record(buildSubmission({ seatCode: "12", setupId: "gym-sublet", takeClinics: true, defenseText: "Thin reserve, and I took the clinics to cover the rent rise." }), { sessionId: "s-12", ...READ }),
    record(buildSubmission({ seatCode: "13", setupId: "teammate-share", defenseText: "Started in class and finished it at home the next night." }), { sessionId: "s-13", ...READ }),
  ];
  const roster = NAMES.map((displayName, index) => ({
    seatCode: String(index + 1), displayName, claimed: true, removedAt: null,
  }));
  return { submissions, roster };
}

function rollOfTheClass() {
  const { submissions, roster } = theClass();
  return classRoll({ rows: analyseClass(submissions).rows, roster });
}

/** Every written explanation this class turned in, whoever wrote it, read off the logs. */
function everyExplanation(): string[] {
  return theClass().submissions.flatMap((submission) => {
    const answer = writtenAnswerFrom(submission.log);
    return answer && answer.text.length > 0 ? [answer.text] : [];
  });
}

/**
 * The class as the service would answer for it, plus whatever the teacher chose to share.
 *
 * Two endpoints, because §5 is a second read: the submissions the class is made of, and the
 * selection a teacher made out of them. `unread` drops every mark, which is the state a class
 * is in for the whole of the lesson and the evening after it.
 */
function openPages(input: { selection?: ShareOutSelection | null; unread?: boolean } = {}) {
  const { submissions, roster } = theClass();
  const marked = input.unread
    ? submissions.map((entry) => ({ ...entry, reasoningPoints: null, reasoningCriteria: undefined }))
    : submissions;
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(String(url).includes("/shareout")
      ? { selection: input.selection ?? null }
      : {
        class: { code: "XEWFA", label: "Period 5 · Grade 7", challengeId: "plan-under-pressure", createdAt: NOW, expiresAt: NOW + 1 },
        assignments: [{
          id: "assignment-XEWFA-1", classId: "XEWFA", objectiveRef: null,
          competencyIds: ["plan-within-income", "adapt-a-plan"],
          allowedWorldIds: ["basketball", "food-truck"], studentChoosesWorld: true,
          format: "decision-challenge", assignedStudentIds: null, createdAt: NOW,
        }],
        submissions: marked.map((entry) => ({ ...entry, assignmentId: "assignment-XEWFA-1" })),
        roster, progress: [], feedback: [],
      }),
  })) as unknown as typeof fetch;
  return { restore: () => { globalThis.fetch = original; } };
}

async function openTheDebrief(input: { selection?: ShareOutSelection | null; unread?: boolean } = {}) {
  const { restore } = openPages(input);
  const view = render(
    <MemoryRouter initialEntries={["/educator/class/XEWFA/debrief?key=abcdefghijklmnop"]}>
      <Routes><Route path="/educator/class/:code/debrief" element={<Debrief />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(view.container.querySelector(".debrief")).not.toBeNull());
  // The share-out is a second fetch, so §5 settles a tick after the rest of the page.
  await waitFor(() => expect(view.container.querySelector(".debrief__section:last-child")).not.toBeNull());
  return { view, restore };
}

async function openTheClassPage(input: { unread?: boolean } = {}) {
  const { restore } = openPages(input);
  const view = render(
    <MemoryRouter initialEntries={["/educator/class/XEWFA?key=abcdefghijklmnop"]}>
      <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(view.container.querySelector(".live-state")).not.toBeNull());
  return { view, restore };
}

/** One element, or an error naming what was looked for. A missing section is a failure here. */
function only(container: HTMLElement, selector: string): HTMLElement {
  const found = container.querySelectorAll<HTMLElement>(selector);
  if (found.length !== 1) throw new Error(`the debrief has ${found.length} elements matching "${selector}"; it must have one.`);
  return found[0]!;
}

/** The section whose heading starts with this number, so a re-ordering is a failure not a pass. */
function section(container: HTMLElement, number: number): HTMLElement {
  const found = [...container.querySelectorAll<HTMLElement>(".debrief__section")]
    .filter((node) => (node.querySelector("h2")?.textContent ?? "").trim().startsWith(`${number} ·`));
  if (found.length !== 1) throw new Error(`the debrief has ${found.length} sections numbered ${number}.`);
  return found[0]!;
}

function count(text: string, pattern: RegExp, what: string): number {
  const found = pattern.exec(text);
  if (!found) throw new Error(`no ${what} in ${JSON.stringify(text.slice(0, 160))}.`);
  return Number(found[1]);
}

describe("the printed debrief counts the class the class page counts", () => {
  /**
   * One student who went twice is one student, on the sheet as well as on the screen.
   *
   * Every denominator in §3 is a claim about how many students this class has. They were read
   * off `analysis.worlds`, which is one row per submission record, while the heading four
   * inches above was read off the roll — so the sheet said "11 students finished" and then "of
   * 12" three times underneath it.
   */
  it("says the same size of class in its heading and in every denominator under it", async () => {
    const { view, restore } = await openTheDebrief();
    try {
      const roll = rollOfTheClass();
      expect(roll.attempts.length).toBeGreaterThan(roll.rows.length); // the replay is in this class
      const lede = count(only(view.container, ".page-header .lede").textContent ?? "", /^(\d+) students? finished/, "a class size in the lede");
      expect(lede).toBe(roll.turnedIn);

      const changed = section(view.container, 3).textContent ?? "";
      const denominators = [...changed.matchAll(/\d+ of (\d+)/g)].map((found) => Number(found[1]));
      expect(denominators.length).toBeGreaterThan(0);
      for (const denominator of denominators) expect(denominator).toBe(lede);
    } finally { restore(); }
  });

  /**
   * A student cut one thing first. The buckets are mutually exclusive and the page said so.
   *
   * Carlos's two runs cut different things, and a page counting records printed his seat in
   * both lists — one child doing two contradictory things, on the sheet a teacher reads out.
   */
  it("never files one seat under two answers to what they cut first", async () => {
    const { view, restore } = await openTheDebrief();
    try {
      const lines = [...section(view.container, 3).querySelectorAll("li")]
        .map((node) => node.textContent ?? "")
        .filter((line) => line.includes("cut "));
      expect(lines.length).toBeGreaterThan(1); // this class disagreed about what to cut
      // Read as the names the sheet now prints. This used to parse "seats 7, 13" — the page a
      // teacher reads aloud was the only block in the product still written in seat numbers, on
      // a class whose roster BOW is holding. The rule under test has not changed: one student,
      // one bucket.
      const students = lines.flatMap((line) => (line.split("—")[1] ?? "").split(/,| and /).map((name) => name.trim()).filter(Boolean));
      expect(students.length).toBeGreaterThan(0);
      expect(students.some((name) => /^Seat \d+$/.test(name))).toBe(false);
      expect(new Set(students).size).toBe(students.length);
    } finally { restore(); }
  });

  /**
   * The rate a teacher says out loud, and the rate on the screen they read it from.
   *
   * The debrief counted the replaying student's older, marked attempt and asserted everybody
   * was assessed; the class page dropped him from the rate and said one was still to read.
   */
  it("reports the assessed count the class page reports", async () => {
    const debrief = await openTheDebrief();
    const onSheet = count(only(debrief.view.container, ".page-header .lede").textContent ?? "", /of the (\d+) assessed/, "an assessed count in the debrief lede");
    debrief.restore();
    cleanup();

    const page = await openTheClassPage();
    try {
      const caption = only(page.view.container, ".micro-table caption").textContent ?? "";
      expect(onSheet).toBe(count(caption, /(\d+) of them have a usable result/, "an assessed count in the class page's caption"));
      // And the sheet is not counting a student the class page is still waiting to read.
      const roll = rollOfTheClass();
      expect(onSheet).toBe(roll.turnedIn - roll.awaitingReading.length);
    } finally { page.restore(); }
  });
});

describe("the printed debrief shares only what a teacher chose", () => {
  /**
   * The finding, at its plainest: no selection, no student writing on the page.
   *
   * This is `shareOut.ts`'s first rule, and the debrief is the surface that broke it. The
   * assertion is over *every* explanation this class wrote rather than over the four that used
   * to print, so a page that goes back to picking its own — a different four, a better four,
   * one — fails here too.
   */
  it("prints no student's writing at all until a teacher has chosen some", async () => {
    const { view, restore } = await openTheDebrief({ selection: null });
    try {
      const text = view.container.textContent ?? "";
      for (const explanation of everyExplanation()) expect(text).not.toContain(explanation);
      expect(text).not.toContain(WEAKEST);
      expect(view.container.querySelectorAll(".debrief__quotes blockquote")).toHaveLength(0);
      // And it says why there is nothing there, with the way to change it.
      expect(section(view.container, 5).textContent).toMatch(/only when you pick it/i);
    } finally { restore(); }
  });

  /**
   * What a teacher did choose, labelled the way the room will see it labelled.
   *
   * `shareOut.ts`'s second rule: a seat number is the class's own identifier for a person, so
   * projected work is `Plan A` and `Plan B` unless a teacher deliberately turns names on. The
   * printed page obeys the same rule because it is the page in the teacher's hand while the
   * projector is on — and it takes both the labels and the order from the same function the
   * projector does, so the two cannot come to disagree about which plan is which.
   */
  it("prints the chosen work, in the teacher's order, under the room's own labels", async () => {
    const selection: ShareOutSelection = {
      classCode: "XEWFA",
      named: false,
      updatedAt: NOW,
      items: [
        { sessionId: "s-11", seatCode: "11", note: "opens the repair", order: 0 },
        { sessionId: "s-2", seatCode: "2", note: "the other way round", order: 1 },
      ],
    };
    const { view, restore } = await openTheDebrief({ selection });
    try {
      const quotes = [...section(view.container, 5).querySelectorAll("li")];
      expect(quotes).toHaveLength(2);
      expect(quotes[0]!.querySelector("blockquote")?.textContent).toContain("I counted the showcase bonus");
      expect(quotes[0]!.querySelector("cite")?.textContent).toBe("Plan A");
      expect(quotes[1]!.querySelector("blockquote")?.textContent).toContain("I counted both bonuses");
      expect(quotes[1]!.querySelector("cite")?.textContent).toBe("Plan B");

      // Nobody else's writing came along with them, and neither did the two names.
      //
      // Scoped to §5, which is what this rule was always about and what the comment above says:
      // the *chosen work* is labelled the way the room will see it labelled. §3 names students
      // now, deliberately — it is the pull-out group a teacher forms tomorrow, and it was the
      // last block in the product written in seat numbers on a class that has a roster. The
      // promise being kept here is that a piece of writing a teacher put on the wall does not
      // carry a name unless she asked for it.
      const shared = section(view.container, 5).textContent ?? "";
      const text = view.container.textContent ?? "";
      for (const explanation of everyExplanation()) {
        if (explanation.startsWith("I counted")) continue;
        expect(text).not.toContain(explanation);
      }
      expect(shared).not.toContain("Mei L.");
      expect(shared).not.toContain("Devon P.");
      // The teacher's own note is theirs. It is not on the sheet they hold up.
      expect(text).not.toContain("opens the repair");
    } finally { restore(); }
  });

  it("uses the names only where the teacher turned names on", async () => {
    const selection: ShareOutSelection = {
      classCode: "XEWFA",
      named: true,
      updatedAt: NOW,
      items: [{ sessionId: "s-11", seatCode: "11", note: "", order: 0 }],
    };
    const { view, restore } = await openTheDebrief({ selection });
    try {
      expect(only(view.container, ".debrief__quotes cite").textContent).toBe("Mei L.");
    } finally { restore(); }
  });

  /**
   * The milder half of the same finding.
   *
   * §2 sets two real plans beside each other and headed them `SEAT 4` and `SEAT 5` — the same
   * identifier, on the same sheet, for the same reason. What tells the two plans apart is the
   * plans, so the cards are numbered where they sit. They count where §5 letters, so one sheet
   * can carry both label spaces without `Plan A` meaning two different children on it.
   */
  it("labels the two contrasted plans by position rather than by seat", async () => {
    const { view, restore } = await openTheDebrief();
    try {
      const cards = [...section(view.container, 2).querySelectorAll(".debrief__plan")];
      expect(cards).toHaveLength(2);
      for (const card of cards) {
        const label = card.querySelector(".eyebrow")?.textContent ?? "";
        expect(label).toMatch(/^Plan \d+$/);
        expect(label).not.toMatch(/seat/i);
      }
    } finally { restore(); }
  });
});

describe("the class page's skill table says what it is counting", () => {
  /**
   * A caption is a denominator, and a denominator has to be the one the rows are over.
   *
   * Before a teacher marks anything this read *"Counts across the 0 of 11 with a usable
   * result"* directly above three rows of eleven students each, one of them *"11 showed it"*.
   * Asserted as the relation rather than as the sentence: whatever number the caption says its
   * counts are taken across is the number those counts add up to.
   */
  it("takes its counts across the number of students its caption says it does", async () => {
    for (const unread of [true, false]) {
      const { view, restore } = await openTheClassPage({ unread });
      try {
        const table = only(view.container, ".micro-table:has(caption)");
        const caption = table.querySelector("caption")?.textContent ?? "";
        const across = count(caption, /across\D*(\d+)/, "a denominator the caption says its counts are across");
        const rows = [...table.querySelectorAll("tbody tr")];
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          const cell = row.querySelector("td")?.textContent ?? "";
          const counted = [...cell.matchAll(/(\d+)\s+\D/g)].reduce((total, found) => total + Number(found[1]), 0);
          expect(counted, `"${cell.slice(0, 60)}" counts ${counted} students under a caption reading "${caption.trim()}"`).toBe(across);
        }
      } finally { restore(); }
    }
  });
});
