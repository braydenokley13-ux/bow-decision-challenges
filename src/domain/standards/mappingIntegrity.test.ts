import { describe, expect, it } from "vitest";
import { COMPETENCIES } from "../competency/competencies";
import type { CompetencyId } from "../competency/types";
import { NYSED_2026_STANDARDS } from "./frameworks/nysed-2026";
import { NYSED_2026_COMPLETION_RULES, NYSED_2026_MAPPINGS } from "./mappings/nysed-2026";
import {
  ALL_MAPPINGS,
  competenciesFor,
  completionRuleFor,
  frameworkById,
  labelsFor,
  mappingsForStandard,
  standardByRef,
  standardsFor,
  standardsIn,
} from "./index";
import type { FrameworkId } from "./types";

/**
 * The mapping table is the only join between what BOW measures and what a state calls it,
 * and it is hand-written by design. Everything a hand-written join can get wrong is
 * checked here, because none of it is visible from a behavioural test: a mapping that
 * points at a competency which no longer exists does not crash, it silently stops covering
 * an objective, and the objective quietly becomes unreachable.
 *
 * The four failures this catches, in the order they are likely:
 *
 * 1. **An orphan mapping** — a row pointing at a competency id or a standard code that
 *    does not exist. Most likely after a rename that this file did not follow.
 * 2. **An orphan standard** — an objective with no mapping at all. It would appear in every
 *    teacher-facing list as a thing BOW knows about, and resolve to nothing.
 * 3. **A duplicate** — the same competency mapped twice to the same standard, quietly
 *    double-counting it in any roll-up that sums coverage.
 * 4. **An incomplete bundled objective** — one whose mappings are all `partial` and which
 *    has no completion rule, so it can never be reported demonstrated and nothing says why.
 */

const COMPETENCY_IDS = new Set<string>(COMPETENCIES.map((competency) => competency.id));
const STANDARD_CODES = new Set(NYSED_2026_STANDARDS.map((standard) => standard.code));

describe("mapping integrity", () => {
  it("maps only competencies that exist", () => {
    for (const mapping of ALL_MAPPINGS) {
      expect(COMPETENCY_IDS.has(mapping.competencyId), `${mapping.competencyId} → ${mapping.standardCode}`).toBe(true);
    }
  });

  it("maps only standard codes that exist in the framework it names", () => {
    for (const mapping of NYSED_2026_MAPPINGS) {
      expect(mapping.frameworkId).toBe("nysed-pf-2026");
      expect(STANDARD_CODES.has(mapping.standardCode), `${mapping.competencyId} → ${mapping.standardCode}`).toBe(true);
    }
  });

  it("leaves no objective without a mapping", () => {
    for (const standard of NYSED_2026_STANDARDS) {
      const mappings = NYSED_2026_MAPPINGS.filter((mapping) => mapping.standardCode === standard.code);
      expect(mappings.length, `NYSED ${standard.code} has no mapping`).toBeGreaterThan(0);
    }
  });

  it("never maps the same competency to the same standard twice", () => {
    const seen = new Set<string>();
    for (const mapping of ALL_MAPPINGS) {
      const key = `${mapping.competencyId}|${mapping.frameworkId}|${mapping.standardCode}`;
      expect(seen.has(key), `duplicate mapping ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("gives every mapping a coverage level, a rationale and a verification date", () => {
    for (const mapping of ALL_MAPPINGS) {
      const where = `${mapping.competencyId} → ${mapping.standardCode}`;
      expect(["full", "partial", "supporting"], where).toContain(mapping.coverage);
      expect(mapping.rationale.trim().length, where).toBeGreaterThan(20);
      expect(mapping.assertedBy, where).toBe("BOW");
      expect(mapping.verifiedOn, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never gives one standard two different full mappings from one competency's duplicates", () => {
    // A standard may legitimately have several full mappings from *different* competencies
    // only if each really covers the whole demand. Today none does, and if that changes it
    // should be a deliberate edit to this expectation rather than a silent one.
    for (const standard of NYSED_2026_STANDARDS) {
      const full = NYSED_2026_MAPPINGS.filter((mapping) => mapping.standardCode === standard.code && mapping.coverage === "full");
      expect(full.length, `NYSED ${standard.code} has ${full.length} full mappings`).toBeLessThanOrEqual(1);
    }
  });

  it("gives every objective with no full mapping a completion rule", () => {
    // Without the rule, a bundled objective can never be reported demonstrated and nothing
    // on screen explains why. That reads as a bug, not as honesty.
    const ruled = new Set(NYSED_2026_COMPLETION_RULES.map((rule) => rule.standardCode));
    for (const standard of NYSED_2026_STANDARDS) {
      const mappings = NYSED_2026_MAPPINGS.filter((mapping) => mapping.standardCode === standard.code);
      const hasFull = mappings.some((mapping) => mapping.coverage === "full");
      if (!hasFull) {
        expect(ruled.has(standard.code), `NYSED ${standard.code} is all-partial with no completion rule`).toBe(true);
      }
    }
  });

  it("never gives an objective both a full mapping and a completion rule", () => {
    // The two say contradictory things: one competency is enough, and one is not.
    for (const rule of NYSED_2026_COMPLETION_RULES) {
      const full = NYSED_2026_MAPPINGS.filter((mapping) => mapping.standardCode === rule.standardCode && mapping.coverage === "full");
      expect(full, `NYSED ${rule.standardCode}`).toHaveLength(0);
    }
  });

  it("writes completion rules only for standards that exist, from competencies that map to them", () => {
    expect(NYSED_2026_COMPLETION_RULES.map((rule) => rule.standardCode).sort()).toEqual(["2.1", "4.1"]);
    for (const rule of NYSED_2026_COMPLETION_RULES) {
      expect(STANDARD_CODES.has(rule.standardCode), rule.standardCode).toBe(true);
      expect(rule.requires.length, rule.standardCode).toBeGreaterThan(1);
      expect(new Set(rule.requires).size, `${rule.standardCode} lists a competency twice`).toBe(rule.requires.length);
      expect(rule.note.trim().length).toBeGreaterThan(20);
      for (const competencyId of rule.requires) {
        expect(COMPETENCY_IDS.has(competencyId), `${rule.standardCode} requires unknown ${competencyId}`).toBe(true);
        const mapping = NYSED_2026_MAPPINGS.find((row) => row.standardCode === rule.standardCode && row.competencyId === competencyId);
        expect(mapping, `${rule.standardCode} requires ${competencyId} with no mapping to it`).toBeDefined();
        // A rule may only be built out of the parts that actually cover something. A
        // `supporting` competency uses the standard's idea without assessing it, so
        // requiring one would make the objective demonstrable on evidence that never
        // touched it.
        expect(mapping?.coverage, `${rule.standardCode} requires ${competencyId}`).toBe("partial");
      }
    }
  });

  it("covers all 23 objectives with 21 competencies, and not one-to-one", () => {
    expect(COMPETENCIES).toHaveLength(21);
    expect(NYSED_2026_STANDARDS).toHaveLength(23);
    const mappedStandards = new Set(NYSED_2026_MAPPINGS.map((mapping) => mapping.standardCode));
    expect(mappedStandards.size).toBe(23);
    // Eleven objectives need more than one competency, or share one with another objective.
    const multi = NYSED_2026_STANDARDS.filter(
      (standard) => NYSED_2026_MAPPINGS.filter((mapping) => mapping.standardCode === standard.code).length > 1,
    );
    expect(multi.map((standard) => standard.code)).toEqual(["1.2", "1.3", "1.5", "2.1", "3.3", "4.1", "4.3", "5.1", "5.3", "5.4", "5.6"]);
  });

  it("lets one competency fully cover two objectives, and says which", () => {
    // A teacher who assigns 2.4 gets evidence for 2.3 as well. That is a gift, and it has
    // to be labelled on screen or it looks like a mistake.
    const fullyCovers = (id: CompetencyId) =>
      standardsFor(id).filter((covered) => covered.coverage === "full").map((covered) => covered.standard.code);
    expect(fullyCovers("keep-credit-costs-down")).toEqual(["2.3", "2.4"]);
    expect(fullyCovers("how-savings-grow")).toEqual(["5.2", "5.5"]);
  });

  it("resolves an objective to the competencies BOW actually measures, full first", () => {
    expect(competenciesFor("nysed-pf-2026", "1.3").map((covering) => [covering.competency.id, covering.coverage])).toEqual([
      ["plan-within-income", "full"],
      ["save-toward-a-goal", "partial"],
    ]);
    expect(competenciesFor("nysed-pf-2026", "4.1").map((covering) => covering.coverage)).toEqual(["partial", "partial", "supporting"]);
  });

  it("answers 'nothing' for a framework it does not carry, rather than throwing", () => {
    // The type says this cannot happen, and it is right about every call written today. It
    // stops being right the first time a `{ frameworkId, code }` arrives from a stored
    // record written by an older version — which is the read path this layer exists for.
    const unknown = "njsls-pf-2020" as FrameworkId;
    expect(standardsIn(unknown)).toEqual([]);
    expect(frameworkById(unknown)).toBeUndefined();
    expect(labelsFor(unknown)).toBeUndefined();
    expect(standardByRef({ frameworkId: unknown, code: "1.3" })).toBeUndefined();
    expect(mappingsForStandard({ frameworkId: unknown, code: "1.3" })).toEqual([]);
    expect(completionRuleFor({ frameworkId: unknown, code: "2.1" })).toBeUndefined();
    expect(competenciesFor(unknown, "1.3")).toEqual([]);
  });

  it("leaves no competency unmapped", () => {
    // A competency mapped to nothing is a skill BOW measures and no teacher can ask for.
    for (const competency of COMPETENCIES) {
      expect(standardsFor(competency.id).length, `${competency.id} maps to no objective`).toBeGreaterThan(0);
    }
  });
});
