import { describe, expect, it } from "vitest";
import { STRUCTURED_MICRO_SKILLS } from "./microSkills";
import { NYSED_OBJECTIVES, STANDARDS_ROWS } from "./standards";

describe("NYSED mapping", () => {
  it("covers every structured micro-skill", () => {
    for (const skill of STRUCTURED_MICRO_SKILLS) {
      expect(STANDARDS_ROWS.some((row) => row.microSkillId === skill.id), skill.id).toBe(true);
    }
  });

  it("never maps 4.1 above partial", () => {
    expect(STANDARDS_ROWS.filter((row) => row.objectiveId === "4.1").every((row) => row.strength === "partial")).toBe(true);
  });

  it("stores the five verified objective records", () => {
    expect(NYSED_OBJECTIVES.map((objective) => objective.objectiveId)).toEqual(["1.1", "1.2", "1.3", "4.1", "5.1"]);
    expect(NYSED_OBJECTIVES.every((objective) => objective.verifiedOn === "2026-08-11")).toBe(true);
  });

  it("never displays an objective the evidence does not actually reach", () => {
    // An objective shown in the educator views with no micro-skill behind it would be an
    // alignment claim with nothing supporting it.
    for (const objective of NYSED_OBJECTIVES) {
      const rows = STANDARDS_ROWS.filter((row) => row.objectiveId === objective.objectiveId);
      expect(rows.length, `${objective.objectiveId} has no supporting micro-skill`).toBeGreaterThan(0);
    }
  });

  it("only maps micro-skills that exist", () => {
    const ids = new Set(STRUCTURED_MICRO_SKILLS.map((skill) => skill.id));
    for (const row of STANDARDS_ROWS) expect(ids.has(row.microSkillId), row.microSkillId).toBe(true);
  });

  it("reserves primary alignment for the two budgeting objectives", () => {
    const primary = new Set(STANDARDS_ROWS.filter((row) => row.strength === "primary").map((row) => row.objectiveId));
    expect([...primary].sort()).toEqual(["1.2", "1.3"]);
  });
});
