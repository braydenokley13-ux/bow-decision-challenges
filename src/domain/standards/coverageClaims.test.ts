import { describe, expect, it } from "vitest";
import type { WorldEvidenceCoverage } from "../competency/availability";
import { BUILT_WORLD_COVERAGE, availableCompetencyIds, worldsAssessing } from "../competency/availability";
import { COMPETENCIES, evidenceRequirementById, requiredEvidenceRequirementsFor } from "../competency/competencies";
import type { CompetencyId } from "../competency/types";
import { NYSED_2026_STANDARDS } from "./frameworks/nysed-2026";
import {
  assessableStandards,
  isAssessable,
  missingCompetenciesFor,
  resolveObjectiveCoverage,
} from "./index";

/**
 * What BOW is allowed to say about a state objective.
 *
 * These are the claims a district reads and makes a purchasing decision on, and each one
 * has a specific way of being wrong that is invisible until someone checks:
 *
 * - **Reporting a bundled objective from one of its parts.** NYSED 2.1 is three skills
 *   under one number. "2.1: 78% demonstrated" derived from one of the three has misled a
 *   district about two-thirds of an objective, and nothing on the screen says so.
 * - **Letting a `supporting` mapping count.** A competency that uses a standard's idea
 *   without assessing it belongs in the evidence trail and nowhere near a state.
 * - **Calling an objective assessable because it has a mapping.** A mapping is a person
 *   writing down which skill sits behind an objective. It says nothing about whether
 *   anything exists that can observe a student doing it.
 *
 * The last one is the load-bearing distinction between *not yet available* and *not yet
 * assessed*. One is a fact about BOW, the other is a fact about a district's students.
 */

const NYSED = "nysed-pf-2026" as const;
const ref = (code: string) => ({ frameworkId: NYSED, code });
const demonstrated = (...ids: CompetencyId[]) => new Set<CompetencyId>(ids);

/** A world that produces everything a competency requires. Synthetic — nothing ships it. */
function worldProducing(competencyId: CompetencyId): WorldEvidenceCoverage {
  return {
    worldId: "basketball",
    competencyId,
    producedEvidenceRequirementIds: requiredEvidenceRequirementsFor(competencyId).map((requirement) => requirement.id),
  };
}

describe("what BOW may claim about an objective", () => {
  describe("bundled objectives are never demonstrated from one part", () => {
    it("holds 2.1 at partially assessed on one of its three skills", () => {
      expect(resolveObjectiveCoverage(ref("2.1"), demonstrated("decide-to-borrow"))).toBe("partially-assessed");
      expect(resolveObjectiveCoverage(ref("2.1"), demonstrated("keep-credit-costs-down"))).toBe("partially-assessed");
      expect(resolveObjectiveCoverage(ref("2.1"), demonstrated("sort-by-need-want-goal"))).toBe("partially-assessed");
    });

    it("still holds 2.1 at partially assessed on two of its three skills", () => {
      expect(resolveObjectiveCoverage(ref("2.1"), demonstrated("decide-to-borrow", "keep-credit-costs-down"))).toBe("partially-assessed");
      expect(missingCompetenciesFor(ref("2.1"), demonstrated("decide-to-borrow", "keep-credit-costs-down"))).toEqual(["sort-by-need-want-goal"]);
    });

    it("reports 2.1 demonstrated only when all three are", () => {
      const all = demonstrated("decide-to-borrow", "keep-credit-costs-down", "sort-by-need-want-goal");
      expect(resolveObjectiveCoverage(ref("2.1"), all)).toBe("demonstrated");
      expect(missingCompetenciesFor(ref("2.1"), all)).toEqual([]);
    });

    it("names what is still missing rather than showing a percentage of a bundle", () => {
      expect(missingCompetenciesFor(ref("2.1"), demonstrated())).toEqual([
        "decide-to-borrow",
        "keep-credit-costs-down",
        "sort-by-need-want-goal",
      ]);
    });
  });

  describe("4.1 never resolves above partial without insurance evidence", () => {
    it("caps 4.1 at partially assessed from advance planning alone", () => {
      // The existing Basketball challenge produces good `plan-for-the-unexpected` evidence
      // and no insurance evidence at all. The current code already caps 4.1, and that cap
      // is correct and survives this refactor.
      expect(resolveObjectiveCoverage(ref("4.1"), demonstrated("plan-for-the-unexpected"))).toBe("partially-assessed");
      expect(missingCompetenciesFor(ref("4.1"), demonstrated("plan-for-the-unexpected"))).toEqual(["use-insurance"]);
    });

    it("caps 4.1 at partially assessed from insurance alone", () => {
      expect(resolveObjectiveCoverage(ref("4.1"), demonstrated("use-insurance"))).toBe("partially-assessed");
    });

    it("reports 4.1 demonstrated only with both halves", () => {
      expect(resolveObjectiveCoverage(ref("4.1"), demonstrated("plan-for-the-unexpected", "use-insurance"))).toBe("demonstrated");
    });

    it("gives 4.1 nothing at all from its supporting competency", () => {
      // `adapt-a-plan` is supporting on 4.1: repairing a plan after an unexpected event
      // uses the objective's idea without assessing whether the student planned ahead.
      expect(resolveObjectiveCoverage(ref("4.1"), demonstrated("adapt-a-plan"))).toBe("not-assessed");
    });
  });

  describe("coverage levels do what they say", () => {
    it("reports an objective demonstrated from a single full mapping", () => {
      expect(resolveObjectiveCoverage(ref("1.3"), demonstrated("plan-within-income"))).toBe("demonstrated");
      expect(resolveObjectiveCoverage(ref("1.1"), demonstrated("sort-by-need-want-goal"))).toBe("demonstrated");
    });

    it("never reports an objective demonstrated from a partial mapping alone", () => {
      expect(resolveObjectiveCoverage(ref("1.3"), demonstrated("save-toward-a-goal"))).toBe("partially-assessed");
      expect(resolveObjectiveCoverage(ref("3.3"), demonstrated("gross-to-net"))).toBe("partially-assessed");
      expect(resolveObjectiveCoverage(ref("5.4"), demonstrated("spread-the-risk"))).toBe("partially-assessed");
    });

    it("reports nothing for an objective whose evidence never reached it", () => {
      expect(resolveObjectiveCoverage(ref("1.3"), demonstrated())).toBe("not-assessed");
      expect(resolveObjectiveCoverage(ref("2.3"), demonstrated("plan-within-income"))).toBe("not-assessed");
    });

    it("reports both objectives when one competency fully covers two", () => {
      const both = demonstrated("how-savings-grow");
      expect(resolveObjectiveCoverage(ref("5.2"), both)).toBe("demonstrated");
      expect(resolveObjectiveCoverage(ref("5.5"), both)).toBe("demonstrated");
      expect(resolveObjectiveCoverage(ref("5.3"), both)).toBe("partially-assessed");
    });
  });

  describe("assessability requires a built world, not a mapping", () => {
    it("counts exactly what Basketball can produce every requirement of", () => {
      // Basketball's observer produces all five of `adapt-a-plan` and, since the opening
      // plan started recording which row takes the leftovers, all five of
      // `plan-within-income`. Both are whole, so both are available. Nothing else is: the
      // other nineteen competencies have a mapping and no world.
      expect(availableCompetencyIds()).toEqual(new Set(["adapt-a-plan", "plan-within-income"]));
      expect(worldsAssessing("adapt-a-plan")).toEqual(["basketball"]);
      expect(worldsAssessing("plan-within-income")).toEqual(["basketball"]);
      expect(worldsAssessing("save-toward-a-goal")).toEqual([]);
    });

    it("reports exactly one objective assessable today, and it is the one with a whole world behind it", () => {
      // 1.3 is `full`-mapped to `plan-within-income` and carries no completion rule, so a
      // world that produces every one of that competency's requirements is the entire bar,
      // and it is now met. Nothing else moves with it. `adapt-a-plan` is `partial` on 1.2
      // and `supporting` on 4.1; `save-toward-a-goal` is `partial` on 1.3 and Basketball
      // produces none of it. A partial and a supporting mapping still make nothing
      // assessable on their own, which is why 1.3 is alone here rather than first.
      expect(assessableStandards(NYSED).map((standard) => standard.code)).toEqual(["1.3"]);
      for (const standard of NYSED_2026_STANDARDS) {
        expect(isAssessable(ref(standard.code)), `NYSED ${standard.code}`).toBe(standard.code === "1.3");
      }
    });

    it("claims nothing in the coverage table that the competency model does not define", () => {
      // The table is the one place a claim about a world is written by hand. Every id in it
      // has to name a requirement that exists and belong to the competency it is filed
      // under — a typo here would credit a world with producing something else entirely.
      expect(BUILT_WORLD_COVERAGE.length).toBeGreaterThan(0);
      for (const claim of BUILT_WORLD_COVERAGE) {
        for (const id of claim.producedEvidenceRequirementIds) {
          const requirement = evidenceRequirementById(id);
          expect(requirement, `${claim.worldId} claims ${id}`).toBeDefined();
          expect(requirement?.competencyId, id).toBe(claim.competencyId);
        }
      }
    });

    it("never calls a competency available on a partial production route", () => {
      const required = requiredEvidenceRequirementsFor("plan-within-income");
      expect(required.length).toBeGreaterThan(1);
      const nearlyThere: WorldEvidenceCoverage = {
        worldId: "basketball",
        competencyId: "plan-within-income",
        producedEvidenceRequirementIds: required.slice(0, -1).map((requirement) => requirement.id),
      };
      expect(availableCompetencyIds([nearlyThere]).has("plan-within-income")).toBe(false);
      expect(isAssessable(ref("1.3"), availableCompetencyIds([nearlyThere]))).toBe(false);
    });

    it("never calls a competency available because its evidence requirements are unwritten", () => {
      // A competency with no evidence requirements would satisfy "produces every one of
      // them" vacuously. Vacuous coverage is the most dangerous kind: it reports an
      // objective as assessable precisely because nobody has said what would count.
      const unwritten = COMPETENCIES.filter((competency) => competency.evidenceRequirements.length === 0);
      expect(unwritten.length).toBeGreaterThan(0);
      for (const competency of unwritten) {
        const claim: WorldEvidenceCoverage = { worldId: "basketball", competencyId: competency.id, producedEvidenceRequirementIds: [] };
        expect(availableCompetencyIds([claim]).has(competency.id), competency.id).toBe(false);
      }
    });

    it("makes an objective assessable once a world produces its full-mapped competency", () => {
      const available = availableCompetencyIds([worldProducing("plan-within-income")]);
      expect(available.has("plan-within-income")).toBe(true);
      expect(isAssessable(ref("1.3"), available)).toBe(true);
      // 5.1 only has `plan-within-income` as a partial. A partial never makes an objective
      // assessable on its own.
      expect(isAssessable(ref("5.1"), available)).toBe(false);
    });

    it("requires every part of a completion rule before the bundled objective is assessable", () => {
      const planningOnly = new Set<CompetencyId>(["plan-for-the-unexpected"]);
      expect(isAssessable(ref("4.1"), planningOnly)).toBe(false);
      const bothHalves = new Set<CompetencyId>(["plan-for-the-unexpected", "use-insurance"]);
      expect(isAssessable(ref("4.1"), bothHalves)).toBe(true);

      const oneOfThree = new Set<CompetencyId>(["decide-to-borrow"]);
      expect(isAssessable(ref("2.1"), oneOfThree)).toBe(false);
      const twoOfThree = new Set<CompetencyId>(["decide-to-borrow", "keep-credit-costs-down"]);
      expect(isAssessable(ref("2.1"), twoOfThree)).toBe(false);
      const allThree = new Set<CompetencyId>(["decide-to-borrow", "keep-credit-costs-down", "sort-by-need-want-goal"]);
      expect(isAssessable(ref("2.1"), allThree)).toBe(true);
    });

    it("refuses an objective code that does not exist rather than guessing", () => {
      const everything = new Set<CompetencyId>(COMPETENCIES.map((competency) => competency.id));
      expect(isAssessable(ref("1.7"), everything)).toBe(false);
      expect(isAssessable(ref("6.1"), everything)).toBe(false);
      expect(resolveObjectiveCoverage(ref("1.7"), everything)).toBe("not-assessed");
    });
  });
});
