import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyseClass } from "./analysis";
import { DEMO_STUDENTS } from "../fixtures/demoClass";
import type { SubmissionRecord } from "../platform/classes/types";
import { buildSubmission } from "../test/runChallenge";

/**
 * The no-fixture invariant.
 *
 * Once a real class is being viewed, no student row, explanation, score, observation,
 * concept result, class count, distribution, debrief insight or recommendation may come
 * from `demoClass` or any other synthetic source. Missing data renders as missing.
 *
 * This matters more than it sounds. A distribution that quietly fell back to fixture data
 * would be indistinguishable from a real one on screen, and a teacher would plan a lesson
 * on twenty-eight students who do not exist. So it is checked two ways: structurally, that
 * the real-class modules cannot even reach a fixture, and behaviourally, that an empty and
 * a partial class report emptiness rather than borrowing a shape.
 */

/** Everything that renders or computes a real class. */
const REAL_CLASS_MODULES = [
  "src/educator/analysis.ts",
  "src/educator/useClassEvidence.ts",
  "src/educator/RealClassPages.tsx",
  "src/educator/Debrief.tsx",
  "src/educator/classMemory.ts",
  "src/educator/labels.ts",
  // Where a real class is created, and now where its objective is picked. A demo objective
  // list here would put a code on a whiteboard that no world can assess.
  "src/educator/ClassSetup.tsx",
  // The objective surfaces. Everything they render comes from the framework, the mappings
  // and classes this browser can actually open — a fixture reaching any of them would put
  // invented students under a real teacher's objective.
  "src/educator/ObjectivePages.tsx",
  "src/educator/objectiveResults.ts",
  "src/educator/useObjectiveEvidence.ts",
  // Teach-next and the misconception spotlight. A fixture reaching either would put an
  // invented wrong idea, and invented children showing it, on a real teacher's screen.
  "src/educator/TeachNext.tsx",
  "src/educator/misconceptions.ts",
  // One student's evidence, and the place a teacher disagrees with it. A fixture reaching
  // either would put a conclusion under a real child's seat that no child produced.
  "src/educator/EvidenceTrailPanel.tsx",
  // The Objective Map and everything it reads. A fixture here would put invented
  // coverage against a real framework, which is the one claim a district checks.
  "src/educator/ObjectiveMap.tsx",
  "src/educator/objectiveMap.ts",
  "src/educator/useTeacherClasses.ts",
];

describe("a real class cannot reach a fixture", () => {
  for (const path of REAL_CLASS_MODULES) {
    it(`${path} imports no fixture`, () => {
      const source = readFileSync(path, "utf8");
      const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]!);
      const offenders = imports.filter((specifier) => /fixtures|demo/i.test(specifier));
      expect(offenders, `${path} imports a fixture module`).toEqual([]);
      // A hand-rolled constant is the same defect wearing a different hat.
      expect(source).not.toMatch(/DEMO_STUDENTS|DEMO_LABEL/);
    });
  }

  it("keeps the fixture reachable only from the demo route", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    // Every route that renders a fixture page is namespaced /educator/demo, so no real
    // class URL can ever land on one.
    for (const line of app.split("\n")) {
      if (!line.includes("<Route")) continue;
      if (/ClassOverview|ConceptDrilldown|StudentEvidence|ReasoningReview|StandardsView/.test(line)) {
        const isReal = /RealClassOverview|RealStudentEvidence/.test(line);
        if (isReal) continue;
        expect(line, `a fixture page is mounted outside /educator/demo: ${line.trim()}`).toContain("/educator/demo");
      }
    }
  });
});

describe("a real class with no submissions reports nothing", () => {
  const empty = analyseClass([]);

  it("has no students, no counts and no contrast", () => {
    expect(empty.rows).toEqual([]);
    expect(empty.contrast).toBeNull();
    expect(empty.reviewFirst).toBeNull();
    expect(empty.awaitingReview).toEqual([]);
    expect(empty.totalMoneyCommittedToCourse).toBe(0);
  });

  it("reports every distribution as empty rather than as a shape", () => {
    for (const distribution of empty.distributions) {
      for (const share of distribution.shares) expect(share.seats).toEqual([]);
      expect(distribution.note).toBe("No submissions yet.");
    }
  });

  it("counts every concept as zero across every status", () => {
    for (const concept of empty.concepts) {
      expect(Object.values(concept.counts).reduce((sum, value) => sum + value, 0)).toBe(0);
      expect(concept.needsFollowUp).toEqual([]);
    }
  });

  it("offers no discussion prompts it has not earned", () => {
    expect(empty.prompts).toEqual([]);
  });

  it("never reports a count the fixture would have produced", () => {
    // The fixture class is 28 students; a real empty class must look nothing like it.
    expect(DEMO_STUDENTS.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(empty);
    for (const student of DEMO_STUDENTS) expect(serialised).not.toContain(`"${student.seatCode}"`);
  });
});

describe("a real class reports exactly what it was given", () => {
  function classOf(...seats: string[]): SubmissionRecord[] {
    return seats.map((seatCode) => buildSubmission({ seatCode }));
  }

  it("counts one student when one student submitted", () => {
    const analysis = analyseClass(classOf("3"));
    expect(analysis.rows.map((row) => row.seatCode)).toEqual(["3"]);
    const total = analysis.distributions[0]!.shares.reduce((sum, share) => sum + share.seats.length, 0);
    expect(total).toBe(1);
  });

  it("draws no contrast from a single student", () => {
    expect(analyseClass(classOf("3")).contrast).toBeNull();
  });

  it("attributes every count to seats that actually submitted", () => {
    const analysis = analyseClass(classOf("4", "9", "11"));
    const seats = new Set(analysis.rows.map((row) => row.seatCode));
    for (const distribution of analysis.distributions) {
      for (const share of distribution.shares) {
        for (const seat of share.seats) expect(seats).toContain(seat);
      }
    }
    for (const concept of analysis.concepts) {
      const counted = Object.values(concept.counts).reduce((sum, value) => sum + value, 0);
      expect(counted).toBe(3);
    }
  });

  it("leaves reasoning unscored until a person scores it", () => {
    const analysis = analyseClass(classOf("4", "9"));
    expect(analysis.awaitingReview).toEqual(["4", "9"]);
    for (const row of analysis.rows) expect(row.result.grade.finalPoints).toBeNull();
  });
});
