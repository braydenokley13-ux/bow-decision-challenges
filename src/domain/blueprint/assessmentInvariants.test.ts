import { describe, expect, it } from "vitest";
import { PLAN_UNDER_PRESSURE_BLUEPRINT } from "./planUnderPressure";
import { CONCEPTS } from "./concepts";
import { STRUCTURED_MICRO_SKILLS } from "./microSkills";
import {
  REASONING_CRITERIA,
  reasoningMaximumFrom,
  reasoningMaximumOf,
  reasoningTotal,
  type ReasoningScores,
} from "./reasoning";
import { REASONING_MAXIMUM, STRUCTURED_MAXIMUM } from "../evidence/grade";

describe("assessment invariants", () => {
  it("preserves six concepts, 18 structured micro-skills, 90 structured points, and four entered totals", () => {
    expect(CONCEPTS).toHaveLength(6);
    expect(STRUCTURED_MICRO_SKILLS).toHaveLength(18);
    expect(STRUCTURED_MICRO_SKILLS.reduce((sum, skill) => sum + skill.maxPoints, 0)).toBe(90);
    expect(PLAN_UNDER_PRESSURE_BLUEPRINT.calculationIds).toHaveLength(4);
    expect(new Set(PLAN_UNDER_PRESSURE_BLUEPRINT.calculationIds).size).toBe(4);
  });

  it("preserves the six concept weights", () => {
    expect(CONCEPTS.map(({ code, weight }) => [code, weight])).toEqual([
      ["C1", 15], ["C2", 10], ["C3", 15], ["C4", 20], ["C5", 30], ["C6", 10],
    ]);
  });
});

/**
 * The two tens, introduced to each other.
 *
 * `REASONING_CRITERIA` adds up to ten because somebody typed 2, 2, 2 and 4. C6's `weight`
 * is ten because somebody typed `weight: 10`. Both had to be typed — a rubric cannot work
 * out its share of a course and a weight cannot work out how the marking is broken up — and
 * until this block existed nothing compared them. A fifth criterion added to the rubric and
 * not to the blueprint left every surface printing `reasoningTotal(scores)` over a maximum
 * that no longer covered it: `12/10`, on a teacher's report of a child, and a green suite,
 * because there was no assertion anywhere that could have been the one to fail.
 *
 * The first test below is the one that would have caught it. It does not edit the shipped
 * rubric — it asks the same function the shipped rubric goes through what it makes of a
 * five-criterion one, which is the only way to test a break that arrives with the next edit
 * rather than with this one.
 */
describe("the written-reasoning rubric and the blueprint weight that pays for it", () => {
  /** A fifth criterion, written the way a real one would be: two more marks, blueprint untouched. */
  const FIFTH = {
    id: "C6.5",
    label: "Revision",
    hint: "Says what they would change if they ran it again",
    max: 2,
  } as const;

  it("refuses a rubric the blueprint does not pay for, rather than printing 12/10", () => {
    const withFifth = [...REASONING_CRITERIA, FIFTH];
    expect(reasoningMaximumOf(withFifth)).toBe(12);
    expect(() => reasoningMaximumFrom(withFifth, CONCEPTS)).toThrow(/adds up to 12 .* weights C6 10/);
  });

  it("refuses a blueprint that stops weighting the rubric at all", () => {
    const withoutC6 = CONCEPTS.filter((concept) => concept.id !== "financial-defense");
    // The old `?? 10` answered this case with a ten of its own, so a rubric with no weight
    // behind it read exactly like one that had ten.
    expect(() => reasoningMaximumFrom(REASONING_CRITERIA, withoutC6)).toThrow(/weights C6 not at all/);
  });

  it("prints a maximum the marks can actually reach, and never one they can exceed", () => {
    const everyMarkFarTooHigh: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, 99]));
    expect(REASONING_MAXIMUM).toBe(reasoningMaximumOf(REASONING_CRITERIA));
    expect(reasoningTotal(everyMarkFarTooHigh)).toBe(REASONING_MAXIMUM);
    expect(STRUCTURED_MAXIMUM + REASONING_MAXIMUM).toBe(100);
  });
});
