import { describe, expect, it } from "vitest";
import { PLAN_UNDER_PRESSURE_BLUEPRINT } from "./planUnderPressure";
import { CONCEPTS } from "./concepts";
import { STRUCTURED_MICRO_SKILLS } from "./microSkills";

describe("assessment invariants", () => {
  it("preserves six concepts, 18 structured micro-skills, 90 structured points, and five calculations", () => {
    expect(CONCEPTS).toHaveLength(6);
    expect(STRUCTURED_MICRO_SKILLS).toHaveLength(18);
    expect(STRUCTURED_MICRO_SKILLS.reduce((sum, skill) => sum + skill.maxPoints, 0)).toBe(90);
    expect(PLAN_UNDER_PRESSURE_BLUEPRINT.calculationIds).toHaveLength(5);
    expect(new Set(PLAN_UNDER_PRESSURE_BLUEPRINT.calculationIds).size).toBe(5);
  });

  it("preserves the six concept weights", () => {
    expect(CONCEPTS.map(({ code, weight }) => [code, weight])).toEqual([
      ["C1", 15], ["C2", 10], ["C3", 15], ["C4", 20], ["C5", 30], ["C6", 10],
    ]);
  });
});
