// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { withoutComments } from "../test/source";
import { screenTextOf } from "../domain/scenario/readability";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { BUILT_WORLD_COVERAGE } from "../domain/competency/availability";
import type { CompetencyId } from "../domain/competency/types";
import type { WorldId } from "../domain/core/ids";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import { analyseClass, worldSections } from "./analysis";
import { classSpineFrom } from "./classSpine";
import { EducatorGuide } from "./EducatorPages";

/**
 * What a mixed class actually gives a teacher back, and which half of it pools.
 *
 * The guide told a teacher that a class where students chose differently *"still produces one
 * answer about the class"*, and the class-creation form still tells them *"the results pool
 * either way"*. Half of that is what the product does and half of it is the opposite of what
 * the product does, and nobody had written down which half.
 *
 * **The rubric pools, and it is structural.** Both worlds declare the *same* evidence
 * requirements in `BUILT_WORLD_COVERAGE`, both are observed through the one `WorldContract`
 * shape, and `classResultFor` counts every submission on the assignment into a single
 * denominator without ever asking which world it is holding. The skills table on the class page
 * really does read across a room that split, and so does the objective state.
 *
 * **The decisions do not pool, deliberately.** `worldSections` splits the room by story and
 * gives each section its own count, because a question one story never asked cannot be divided
 * by the whole class — a class of fifteen where eight played Basketball was once told *"6 of 15
 * cut sports-media course first"*. That is the right engineering and `worldParity.test.ts`
 * holds it. What was missing is anybody telling the teacher, at the moment they choose, that
 * the discussion comes back in two pieces.
 *
 * So both halves are pinned here, from the analysis layer rather than from the guide, and the
 * scan below fails if any teacher surface promises a teacher one undivided answer again.
 */

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1. The half that pools: the same named parts of the work, one denominator
// ---------------------------------------------------------------------------

describe("both stories are judged against the same named parts of the work", () => {
  it("declares one identical evidence list per competency, whichever world produced it", () => {
    const byCompetency = new Map<CompetencyId, Map<WorldId, string[]>>();
    for (const claim of BUILT_WORLD_COVERAGE) {
      const row = byCompetency.get(claim.competencyId) ?? new Map<WorldId, string[]>();
      row.set(claim.worldId, [...claim.producedEvidenceRequirementIds].sort());
      byCompetency.set(claim.competencyId, row);
    }
    const worlds = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.worldId))].sort();
    expect(worlds, "two built worlds, or this claim is about nothing").toEqual(["basketball", "food-truck"]);

    const disagreements: string[] = [];
    for (const [competencyId, byWorld] of byCompetency) {
      if (byWorld.size !== worlds.length) {
        disagreements.push(`${competencyId}: only ${[...byWorld.keys()].sort().join(", ")} produce it`);
        continue;
      }
      const lists = [...byWorld.values()].map((ids) => ids.join(","));
      if (new Set(lists).size !== 1) disagreements.push(`${competencyId}: ${[...byWorld].map(([world, ids]) => `${world}=${ids.join("|")}`).join(" vs ")}`);
    }
    expect(
      disagreements,
      "the two stories no longer collect the same evidence. The guide tells a teacher they are "
      + "judged against the same named parts of the work — which is what lets one skills table "
      + "count a room that split — so that sentence has to change with this list",
    ).toEqual([]);
  });
});

const NOW = 1_780_000_000_000;

const CLASS: ClassRecord = {
  code: "H4KVW",
  label: "Period 3 · Grade 7 Math",
  challengeId: "plan-under-pressure",
  createdAt: NOW,
  expiresAt: NOW + 1000,
};

/** A class that was set the challenge and let students choose their story. */
const ASSIGNMENT: Assignment = {
  id: "assignment-H4KVW-mixed",
  classId: "H4KVW",
  objectiveRef: null,
  competencyIds: ["plan-within-income", "adapt-a-plan"],
  allowedWorldIds: ["basketball", "food-truck"],
  studentChoosesWorld: true,
  format: "decision-challenge",
  assignedStudentIds: null,
  createdAt: NOW,
};

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

/** Five seats on the season, four on the market: the split a teacher is planning for. */
function mixedClass(): AttributedSubmission[] {
  const season = [1, 2, 3, 4, 5].map((seat) => buildSubmission({
    seatCode: String(seat),
    setupId: (["cousin-room", "teammate-share", "gym-sublet"] as const)[seat % 3] ?? "cousin-room",
    closeOpeningInto: seat === 1 ? "goal" : "flexibleCash",
  }));
  // Four seats that did not all do the same thing, because a section with nothing to compare
  // has nothing to discuss — which is a fact about that room, not about the split.
  const market = [20, 21, 22, 23].map((seat, index) => buildPopUpSubmission({
    seatCode: String(seat),
    spotId: (["back-lane", "middle-row", "bridge-gate"] as const)[index % 3] ?? "back-lane",
    bookHelper: index % 2 === 0,
  }));
  return [...season, ...market].map((submission) => ({
    ...submission,
    assignmentId: ASSIGNMENT.id,
    reasoningPoints: 10,
    reasoningCriteria: READ_AND_STRONG,
  }));
}

const spineOf = () => classSpineFrom({ record: CLASS, assignments: [ASSIGNMENT], submissions: mixedClass() });

describe("a mixed class gets one set of skill results", () => {
  it("counts every student into one denominator, whichever story they took", () => {
    const spine = spineOf();
    expect(spine.submitted).toBe(9);
    expect(spine.assessed, "students with a usable result — the denominator for what they showed").toBe(9);
    expect(spine.reading, "the one derivation every class-level surface reads").not.toBeNull();
    expect(spine.reading!.competencies.length).toBeGreaterThan(0);
    for (const row of spine.reading!.competencies) {
      const counted = Object.values(row.counts).reduce((total, count) => total + count, 0);
      expect(
        counted,
        `${row.competencyId} counts ${counted} of a room of 9. The guide tells a teacher a class `
        + "that chose differently still gets one set of skill results; a row that counts only "
        + "half the room means it does not",
      ).toBe(9);
    }
  });

  it("reaches one state about the class rather than one per story", () => {
    expect(spineOf().reading!.result.assessed).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// 2. The half that does not pool: what the room decided
// ---------------------------------------------------------------------------

describe("what the room decided comes back one story at a time", () => {
  it("splits into a section per story, each carrying its own count", () => {
    const sections = worldSections(analyseClass(mixedClass()).rows);
    expect(sections.map((section) => `${section.worldId}:${section.seats}`).sort())
      .toEqual(["basketball:5", "food-truck:4"]);
  });

  it("gives each section its own denominator rather than the size of the class", () => {
    for (const section of worldSections(analyseClass(mixedClass()).rows)) {
      expect(section.seats, "a section counting the whole room is the defect worldParity closed").toBeLessThan(9);
      for (const distribution of section.distributions) {
        const counted = distribution.shares.reduce((total, share) => total + share.seats.length, 0);
        expect(counted, `${section.worldId} · ${distribution.id}`).toBe(section.seats);
      }
    }
  });

  it("gives each section its own discussion, which is why the debrief is two groups", () => {
    const sections = worldSections(analyseClass(mixedClass()).rows);
    expect(sections.length, "one discussion per story, not one for the class").toBe(2);
    for (const section of sections) {
      expect(section.prompts.length, `${section.worldId} has something of its own to ask`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. No teacher surface may promise one undivided answer
// ---------------------------------------------------------------------------

/** Files a teacher reads sentences out of — every educator source, and any added since. */
function teacherSources(): string[] {
  const educator = readdirSync("src/educator", { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/educator/${entry}`);
  return [...educator, "src/App.tsx"].sort();
}

/**
 * Ways of promising a teacher that a room which split still comes back whole.
 *
 * Claims, not the word *pool*: "one set of skill results" is true and must not fail this, and
 * so must any future sentence that says which half pools. What is banned is the unqualified
 * promise — the sentence a teacher reads at the moment they choose "students pick", and then
 * plans a single discussion from.
 */
const POOLING_CLAIMS: readonly RegExp[] = [
  /\bresults?\s+pool\b/i,
  /\bpools?\s+either way\b/i,
  /\bone answer about the (?:class|room)\b/i,
  /\bone (?:set of )?results? about the (?:class|room)\b/i,
  /\bsame (?:answer|picture|result) about the (?:class|room)\b/i,
];

/**
 * Nothing. Every teacher surface says which half pools.
 *
 * `MyClasses.tsx` was the last entry: the class-creation form said *"Both stories collect the
 * same evidence, so the results pool either way."* at the exact moment a teacher decides, and
 * the first clause was true while the second was the unqualified promise. It now says that
 * both are judged against the same named parts of the work, so a class that chose differently
 * still gets one set of skill results, and that what the room decided comes back one story at
 * a time.
 *
 * This list is a quarantine, not a permission. The assertion is an equality, so adding a new
 * claim fails, and so does **fixing** one without deleting its line from here, which is the
 * only way a list like this stays honest. If a test failure brought you here saying an entry
 * no longer matches: good, that surface has been fixed. Delete the entry.
 */
const PENDING: readonly string[] = [];

/**
 * One entry per file, named by the first claim that fires.
 *
 * Several of these patterns match the same sentence on purpose — "the results pool either way"
 * is caught twice — and a quarantine list that had to enumerate every pattern a sentence
 * happens to trip would be a list about this file rather than about the product.
 */
function poolingClaimsIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  const hit = POOLING_CLAIMS.map((claim) => claim.exec(source)).find((match) => match !== null);
  return hit ? [`${path} — ${hit[0]}`] : [];
}

describe("no teacher surface promises one undivided answer about a mixed class", () => {
  it("catches the two sentences that shipped, rather than passing because it reads nothing", () => {
    const form = "Both {TERMS.stories} collect the same evidence, so the results pool either way.";
    const guide = "so a class where students chose differently still produces one answer about the class.";
    for (const shipped of [form, guide]) {
      expect(POOLING_CLAIMS.some((claim) => claim.test(shipped)), shipped).toBe(true);
    }
    const replacement = "Yes, on the skills. Both stories are judged against the same named parts of the work, "
      + "so a class that chose differently still gets one set of skill results. What the room decided comes "
      + "back one story at a time, each with its own count — plan the debrief as two groups.";
    expect(POOLING_CLAIMS.filter((claim) => claim.test(replacement))).toEqual([]);
  });

  it("finds no such claim on any surface a teacher plans from", () => {
    expect(
      teacherSources().flatMap(poolingClaimsIn),
      "a teacher surface promises a mixed class comes back as one answer. The rubric pools; "
      + "what the room decided does not, and a teacher who plans one discussion off this "
      + "sentence finds two half-classes. If the extra line is one you just fixed, delete its "
      + "entry from PENDING above",
    ).toEqual(PENDING);
  });
});

// ---------------------------------------------------------------------------
// 4. What the guide actually says
// ---------------------------------------------------------------------------

function guideText(): string {
  const { container } = render(<MemoryRouter><EducatorGuide /></MemoryRouter>);
  return screenTextOf(container).chunks.join(" ").replace(/\s+/g, " ");
}

describe("the educator guide says which half pools", () => {
  it("tells a teacher the skills read across the room", () => {
    const text = guideText();
    expect(text, "the half that pools, and why").toMatch(/judged against the same named parts of the work/);
    expect(text).toMatch(/one set of skill results/);
  });

  it("tells a teacher the decisions do not, before they plan the discussion", () => {
    const text = guideText();
    expect(text).toMatch(/one story at a time, each with its own count/);
    expect(text, "the thing a teacher has to do differently because of it").toMatch(/plan the debrief as two groups/);
  });
});
