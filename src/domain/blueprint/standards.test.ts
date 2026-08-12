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
});
