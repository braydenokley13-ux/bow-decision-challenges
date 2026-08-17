import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { isCountable } from "../domain/competency/observe";
import { buildSubmission } from "../test/runChallenge";
import { studentSpineFor } from "./studentSpine";

/**
 * What leads a student's page.
 *
 * The defect this replaced: a header reading `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER
 * 100/100` two hundred pixels above a red *Savings is a planned amount — Not demonstrated*,
 * with nothing on the page reconciling them. The states are the assessment. The points are a
 * gradebook line at the bottom, and they are still computed exactly as they were.
 */

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

describe("one student's spine", () => {
  it("flags the required requirement a savings-as-leftovers run did not show", () => {
    const submission = { ...buildSubmission({ seatCode: "9", closeOpeningInto: "goal" }), reasoningCriteria: READ_AND_STRONG };
    const spine = studentSpineFor(submission);
    const flagged = spine.shortfalls.map((flag) => flag.evidenceRequirementId);
    expect(flagged).toContain("plan-within-income.er3");
    // Every flag carries the words a teacher reads and the rule that raised it.
    for (const flag of spine.shortfalls) {
      expect(flag.label.length).toBeGreaterThan(0);
      expect(flag.observableRule.length).toBeGreaterThan(0);
      expect([0, 2]).toContain(flag.level);
    }
  });

  it("leads with the weakest state, because the reason to open a student is what they need", () => {
    const submission = { ...buildSubmission({ seatCode: "9", closeOpeningInto: "goal" }), reasoningCriteria: READ_AND_STRONG };
    const spine = studentSpineFor(submission);
    expect(spine.lead).toBe("not-yet-demonstrated");
    expect(spine.competencies.some((line) => line.state === "not-yet-demonstrated")).toBe(true);
    for (const line of spine.competencies) expect(line.statement.length).toBeGreaterThan(20);
  });

  it("says the evidence is not all in when nobody has read the writing", () => {
    // No reasoning criteria: the explanation requirement has no judgement, which is an
    // absence rather than a zero, and the state says so.
    const spine = studentSpineFor(buildSubmission({ seatCode: "4", closeOpeningInto: "flexibleCash" }));
    expect(spine.lead).toBe("incomplete");
    expect(spine.shortfalls).toEqual([]);
    expect(isCountable(spine.lead)).toBe(false);
  });

  it("carries a requirement the run never asked as an absence, never as a shortfall", () => {
    const spine = studentSpineFor(buildSubmission({ seatCode: "4", closeOpeningInto: "flexibleCash" }));
    for (const absence of spine.notObserved) expect(absence.level).toBeNull();
    const flagged = new Set(spine.shortfalls.map((flag) => flag.evidenceRequirementId));
    for (const absence of spine.notObserved) expect(flagged.has(absence.evidenceRequirementId)).toBe(false);
  });
});

describe("the points model stays out of the lead", () => {
  const source = readFileSync("src/educator/RealClassPages.tsx", "utf8");

  it("keeps the grade out of the student header and the class rows", () => {
    const header = source.slice(source.indexOf("<header className=\"student-evidence-header\">"), source.indexOf("student-tabs"));
    expect(header).toContain("StudentLead");
    expect(header).not.toMatch(/structuredPoints|finalPoints|REASONING_MAXIMUM/);
    const rows = source.slice(source.indexOf("function StudentRows"), source.indexOf("function shortfallLine"));
    expect(rows).toContain("COMPETENCY_STATE_HEADLINES");
    expect(rows).not.toMatch(/structuredPoints|finalPoints|\/100/);
  });

  it("shows the gradebook line once, and says what it counts", () => {
    expect(source.match(/function Gradebook/g)).toHaveLength(1);
    expect(source.match(/<Gradebook /g)).toHaveLength(1);
    expect(source).toContain("It counts marks.");
  });
});
