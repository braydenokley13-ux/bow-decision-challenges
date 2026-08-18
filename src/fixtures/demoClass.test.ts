import { describe, expect, it } from "vitest";
import { analyseClass } from "../educator/analysis";
import { worldOfSubmission } from "../educator/objectiveResults";
import { isWellFormedClassCode } from "../platform/classes/codes";
import { DEMO_CLASS_CODE, DEMO_CLASS_LABEL, demoClassBundle } from "./demoClass";

/**
 * The sample class is real evidence now, not an authored shape, so what this file checks is
 * different from what it used to check. It no longer pins a hand-typed status or a ledger
 * total — there is nothing hand-typed left to pin. It checks that the bundle is what
 * `useClassEvidence` needs to answer for a real class page: both worlds present, every
 * submission attributed to the one assignment, a genuine mix of read and unread writing, and
 * a class code that structurally cannot belong to a real class.
 */
describe("the sample class", () => {
  it("cannot be addressed by a real class code", () => {
    expect(isWellFormedClassCode(DEMO_CLASS_CODE)).toBe(false);
  });

  it("says what it is in the one field every real-class screen prints", () => {
    expect(demoClassBundle().record.label.toLowerCase()).toContain("sample");
  });

  it("includes both worlds, on distinct seats", () => {
    const { submissions } = demoClassBundle();
    const worlds = new Set(submissions.map((submission) => worldOfSubmission(submission)));
    expect(worlds).toEqual(new Set(["basketball", "food-truck"]));
    expect(new Set(submissions.map((submission) => submission.seatCode)).size).toBe(submissions.length);
    expect(submissions.length).toBeGreaterThanOrEqual(15);
  });

  it("attributes every submission to the class's own assignment", () => {
    const { assignments, submissions } = demoClassBundle();
    expect(assignments).toHaveLength(1);
    for (const submission of submissions) {
      expect(submission.classCode).toBe(DEMO_CLASS_CODE);
      expect(submission.assignmentId).toBe(assignments[0]!.id);
    }
  });

  it("leaves some writing unread, so the reading queue has something to show", () => {
    const { submissions } = demoClassBundle();
    const pending = submissions.filter((submission) => submission.reasoningPoints === null);
    const read = submissions.filter((submission) => submission.reasoningPoints !== null);
    expect(pending.length).toBeGreaterThan(0);
    expect(read.length).toBeGreaterThan(pending.length);
    // Every reviewed submission carries the marks its total was computed from, not a bare
    // number — the same requirement the real reading screen holds a teacher's own save to.
    for (const submission of read) {
      expect(submission.reasoningCriteria).toBeDefined();
      expect(submission.reasoningPoints).toBeGreaterThanOrEqual(0);
      expect(submission.reasoningPoints).toBeLessThanOrEqual(10);
    }
  });

  it("is large enough for the real class page to describe it as a class", () => {
    // `analyseClass` is the same function a real class's submissions go through — the
    // bundle is only useful as a demo if what comes out the other side is the full,
    // narratable class page rather than the below-minimum "individual work only" guard.
    const analysis = analyseClass(demoClassBundle().submissions);
    expect(analysis.rows.length).toBe(demoClassBundle().submissions.length);
    expect(analysis.worlds.map((world) => world.worldId).sort()).toEqual(["basketball", "food-truck"]);
  });

  it("builds the same evidence every time it is asked", () => {
    // Nothing about this bundle should depend on the clock or on randomness — a fixture that
    // quietly changed shape between two reads would be its own kind of untrustworthy sample.
    const first = demoClassBundle();
    const second = demoClassBundle();
    expect(second.submissions.map((submission) => submission.seatCode)).toEqual(first.submissions.map((submission) => submission.seatCode));
    expect(second.submissions.map((submission) => submission.reasoningPoints)).toEqual(first.submissions.map((submission) => submission.reasoningPoints));
    expect(second.record).toEqual(first.record);
  });

  it("does not carry the label the real product retired", () => {
    // `finalPoints` and `structuredPoints` were the 100-point composite the real product no
    // longer computes anywhere a teacher reads about a class; a sample still quoting them
    // would be teaching a number the product cannot produce any more.
    const serialised = JSON.stringify(demoClassBundle());
    expect(serialised).not.toContain("finalPoints");
    expect(serialised).not.toContain("structuredPoints");
    expect(DEMO_CLASS_LABEL.toLowerCase()).toContain("sample");
  });
});
