import { describe, expect, it } from "vitest";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import { analyseClass, choiceDistributions, decisionsByWorld, popUpDistributions, readSubmission } from "./analysis";

/**
 * The seam between a second world and the teacher.
 *
 * Every defect pinned here was the same defect wearing a different surface: the educator
 * layer knew one world and asserted its facts about every student. A market run was told it
 * had "waited on the course", counted under a housing decision it was never offered, and
 * reported as having turned in no writing while its paragraph sat in the log. None of those
 * are display bugs — they are BOW telling a teacher something untrue about a child on the
 * one surface whose whole purpose is being checkable.
 */

const basketball = { ...buildSubmission({ seatCode: "3" }), assignmentId: "a1" };
const popUp = { ...buildPopUpSubmission({ seatCode: "9" }), assignmentId: "a1" };

describe("a market run, read by the educator layer", () => {
  it("is known to have been played in its own world", () => {
    expect(readSubmission(popUp).worldId).toBe("food-truck");
    expect(readSubmission(basketball).worldId).toBe("basketball");
  });

  it("has its written answer found, so a person can read what the student wrote", () => {
    // The promise the student is given in their own words. It was false for this world.
    const row = readSubmission(popUp);
    expect(row.defense).not.toBeNull();
    expect(row.defense!.text.length).toBeGreaterThan(0);
  });

  it("is never counted under a decision its world did not offer", () => {
    const rows = [readSubmission(basketball), readSubmission(popUp)];
    const seatsNamed = choiceDistributions(rows).flatMap((distribution) =>
      distribution.shares.flatMap((share) => share.seats));
    expect(seatsNamed).not.toContain("9");
    expect(seatsNamed).toContain("3");
  });

  it("is counted under the decisions its own world did offer", () => {
    const rows = [readSubmission(basketball), readSubmission(popUp)];
    const seatsNamed = popUpDistributions(rows).flatMap((distribution) =>
      distribution.shares.flatMap((share) => share.seats));
    expect(seatsNamed).toContain("9");
    expect(seatsNamed).not.toContain("3");
  });

  it("puts each world's questions in its own group, with its own denominator", () => {
    const groups = decisionsByWorld([readSubmission(basketball), readSubmission(popUp)]);
    expect(groups.map((group) => group.worldId).sort()).toEqual(["basketball", "food-truck"]);
    for (const group of groups) expect(group.seats).toBe(1);
  });

  it("leaves a single-world class describing exactly one world", () => {
    const groups = decisionsByWorld([readSubmission(basketball)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.worldId).toBe("basketball");
  });

  it("kept a plan a teacher can read, rather than a blank tab", () => {
    // The one view of what the student actually built. It rendered nothing at all for this
    // world, silently — a teacher would read it as "this student did nothing".
    const saved = popUp.log.filter((event) => event.type === "POPUP_PLAN_SAVED");
    expect(saved.length).toBeGreaterThan(0);
    const plan = (saved.at(-1)!.payload as { snapshot?: { plan?: Record<string, number> } }).snapshot?.plan;
    expect(plan).toBeDefined();
    for (const line of ["stock", "cushion", "cut"]) expect(plan![line]).toBeTypeOf("number");
  });

  it("still analyses a mixed class without inventing a row", () => {
    const analysis = analyseClass([basketball, popUp]);
    expect(analysis.rows).toHaveLength(2);
    expect(analysis.rows.map((row) => row.seatCode).sort()).toEqual(["3", "9"]);
  });
});
