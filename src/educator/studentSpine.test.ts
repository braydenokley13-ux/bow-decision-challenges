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
 *
 * The words in that sentence are historical now — `STRUCTURED` was retired with the points
 * model, and *Not demonstrated* is Ladder 2's `Did not do it`. The defect is kept in its own
 * vocabulary here because a comment describing what was on a screen in 2026 should say what
 * was on that screen.
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
    // `COMPETENCY_STATE_HEADLINES` used to be the constant named here. It was one of two
    // tables holding the same six states — a Title Case copy for headings and a lowercase
    // copy for the tail of a sentence — and the two had already drifted: *not observed*
    // against *Not observed in this run*, *still incomplete* against *Not assessed yet*. The
    // need was casing, so casing is what solves it now (`skillStateInSentence`), and there is
    // one table. The claim this test makes is unchanged: **a class row leads with what the
    // student showed, not with a number**, and it names the surviving table so a row that
    // went back to spelling a state fails here.
    const rows = source.slice(source.indexOf("function StudentRows"), source.indexOf("function shortfallLine"));
    expect(rows).toContain("SKILL_STATE_LABELS");
    expect(rows).not.toMatch(/structuredPoints|finalPoints|\/100/);
  });

  it("shows one gradebook line, and no composite total anywhere", () => {
    expect(source.match(/function Gradebook/g)).toHaveLength(1);
    expect(source.match(/<Gradebook /g)).toHaveLength(1);
    // The hundred-point total is gone and must not come back. It added ninety points of
    // support-capped machine observation to ten points a person typed after reading a
    // paragraph, summed absences as zeros, and existed in one of the two worlds — so a class
    // that let students choose put a number beside half the room and an explanation beside
    // the other half. A single figure over that sum cannot be traced to either half of it.
    // Code, not prose: a comment may still explain what was removed and why.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/finalPoints|structuredPoints|structuredMaximum/);
    expect(code).not.toContain("of 100");
    expect(code).not.toContain("of 90");
  });

  it("counts what was never asked separately from what fell short", () => {
    // The two words moved. "Never asked" and "Fell short" were two of the eleven level
    // phrasings improvised in JSX, and this block was the only place either appeared; they
    // are now `LEVEL_BUCKET_LABELS.neverAsked` and `.short`, which the exported gradebook
    // column reads from the same table so the screen and the spreadsheet cannot disagree.
    //
    // What is being pinned is not the words. It is that **the two counts never merge**: a
    // question nobody asked is not a question failed, and this is the one artefact of the
    // product that gets copied somewhere nothing can explain it.
    const gradebook = source.slice(source.indexOf("function Gradebook"), source.indexOf("function summarise"));
    expect(gradebook).toContain("LEVEL_BUCKET_LABELS.neverAsked");
    expect(gradebook).toContain("LEVEL_BUCKET_LABELS.short");
    expect(gradebook).toContain("line.requirements.neverAsked");
    expect(gradebook).toContain("line.requirements.short");
  });

  it("says the same thing in both worlds", () => {
    // The line is derived from the shared competency spine and the person's own reasoning
    // marks, so there is no branch on the world in it at all. A student is not penalised for
    // choosing the story the product offered them.
    const gradebook = source.slice(source.indexOf("function Gradebook"), source.indexOf("function summarise"));
    expect(gradebook).not.toMatch(/basketball|food-truck|worldId/);
  });

  it("names the reasoning number as a person's own, and leaves it blank until it is one", () => {
    const gradebook = source.slice(source.indexOf("function Gradebook"), source.indexOf("function summarise"));
    expect(gradebook).toContain("Reasoning not read yet");
    expect(gradebook).toContain("BOW adds nothing to it.");
  });
});
