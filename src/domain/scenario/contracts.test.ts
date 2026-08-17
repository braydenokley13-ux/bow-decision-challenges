import { describe, expect, it } from "vitest";
import { CONTRACTED_WORLDS, contractFor, demandProfiles } from "./contracts";
import { parityBreaches, type DemandProfile } from "./demand";
import type { WorldId } from "../core/ids";
import { PLAYABLE_WORLDS, numbersFor, scenarioFor } from "./registry";
import { requiredEvidenceRequirementsFor } from "../competency/competencies";
import { buildSubmission } from "../../test/runChallenge";
import { REASONING_CRITERIA, type ReasoningScores } from "../blueprint/reasoning";

/**
 * §7.2 and §9.2 — what a world owes the product, checked rather than trusted.
 *
 * These are the tests that have to hold for every world that is ever added, which is why
 * they are written over `CONTRACTED_WORLDS` rather than over Basketball. A world added
 * without a coverage claim it can actually honour, or with a demand profile outside the
 * bands, fails here rather than in a classroom.
 */

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

describe("the world contract", () => {
  it("gives every playable world one, and nothing a contract without a story", () => {
    for (const world of PLAYABLE_WORLDS) {
      expect(contractFor(world.id), `${world.id} is playable with no contract`).toBeDefined();
    }
    for (const contract of CONTRACTED_WORLDS) {
      expect(scenarioFor(contract.id).id, `${contract.id} has a contract and no scenario`).toBe(contract.id);
    }
  });

  it("prices every world from its own numbers", () => {
    for (const world of PLAYABLE_WORLDS) {
      expect(numbersFor(world.id)).toBe(world.scenario.numbers);
    }
  });

  it("holds nothing for a world nobody has built", () => {
    expect(contractFor("food-truck")).toBeUndefined();
  });

  it("produces every requirement of every competency it claims", () => {
    // The claim a world makes about itself, checked against what its observer actually
    // emits from a complete run. A world that claims a competency it cannot fully observe
    // would put an objective on a teacher's screen that no evidence can ever satisfy.
    for (const contract of CONTRACTED_WORLDS) {
      const built = buildSubmission({});
      const observations = contract.observe(built.log, { reasoningCriteria: READ_AND_STRONG });
      const produced = new Set(observations.filter((entry) => entry.level !== null).map((entry) => entry.evidenceRequirementId));
      for (const claim of contract.coverage) {
        for (const requirement of requiredEvidenceRequirementsFor(claim.competencyId)) {
          expect(
            claim.producedEvidenceRequirementIds.includes(requirement.id),
            `${contract.id} claims ${claim.competencyId} without listing ${requirement.id}`,
          ).toBe(true);
          expect(produced.has(requirement.id), `${contract.id} lists ${requirement.id} but produced no level for it`).toBe(true);
        }
      }
    }
  });

  it("produces no level for a written explanation nobody has read", () => {
    for (const contract of CONTRACTED_WORLDS) {
      const built = buildSubmission({});
      const observations = contract.observe(built.log);
      const explanations = observations.filter((entry) => entry.kind === "explanation");
      expect(explanations.length, `${contract.id} presents no explanation at all`).toBeGreaterThan(0);
      for (const entry of explanations) expect(entry.level, `${contract.id} graded writing`).toBeNull();
    }
  });

  it("cites the student's own events for everything it observed", () => {
    for (const contract of CONTRACTED_WORLDS) {
      const built = buildSubmission({});
      const ids = new Set(built.log.map((event) => event.id));
      for (const entry of contract.observe(built.log, { reasoningCriteria: READ_AND_STRONG })) {
        if (entry.level === null) continue;
        expect(entry.evidenceRefs.some((ref) => ids.has(ref)), `${contract.id}:${entry.evidenceRequirementId}`).toBe(true);
      }
    }
  });
});

describe("§9.2 parity", () => {
  it("keeps every contracted world inside the bands", () => {
    expect(parityBreaches(demandProfiles())).toEqual([]);
  });

  it("declares a complete profile for every world", () => {
    for (const contract of CONTRACTED_WORLDS) {
      const profile = contract.demandProfile;
      expect(profile.readingGradeLevel, contract.id).toBeGreaterThan(0);
      expect(profile.totalWordsStudentReads, contract.id).toBeGreaterThan(0);
      expect(profile.arithmeticOperations, contract.id).toBeGreaterThan(0);
      expect(profile.decisionsRequired, contract.id).toBeGreaterThan(0);
      expect(profile.simultaneousConstraints, contract.id).toBeGreaterThan(0);
      expect(profile.designMinutes, contract.id).toBeGreaterThan(0);
    }
  });

  it("catches a world that is quietly harder than its neighbour", () => {
    const basketball = CONTRACTED_WORLDS[0]!.demandProfile;
    const breaches = parityBreaches(new Map([
      ["basketball", basketball],
      ["food-truck", { ...basketball, arithmeticOperations: basketball.arithmeticOperations + 2, readingGradeLevel: basketball.readingGradeLevel + 3 }],
    ]));
    expect(breaches.map((breach) => breach.field).sort()).toEqual(["arithmeticOperations", "readingGradeLevel"]);
  });

  it("catches a world that reads three times as long as its neighbour", () => {
    const basketball = CONTRACTED_WORLDS[0]!.demandProfile;
    const breaches = parityBreaches(new Map([
      ["basketball", basketball],
      ["food-truck", { ...basketball, totalWordsStudentReads: basketball.totalWordsStudentReads * 3 }],
    ]));
    expect(breaches.map((breach) => breach.field)).toContain("totalWordsStudentReads");
  });

  it("tolerates exactly what §9.2 says it tolerates, and no more", () => {
    // With two worlds the median sits between them, so "within 35% of the median" is a
    // ratio of about 2.08 rather than 1.35. That is what the band says; it is written down
    // here so nobody reads the constant and expects it to be tighter than it is.
    const basketball = CONTRACTED_WORLDS[0]!.demandProfile;
    const pair = (factor: number) => parityBreaches(new Map([
      ["basketball", basketball],
      ["food-truck", { ...basketball, totalWordsStudentReads: Math.round(basketball.totalWordsStudentReads * factor) }],
    ]));
    expect(pair(2).map((breach) => breach.field)).not.toContain("totalWordsStudentReads");
    expect(pair(2.2).map((breach) => breach.field)).toContain("totalWordsStudentReads");
  });

  it("says nothing about a single world, because parity is a claim about a pair", () => {
    const only = new Map<WorldId, DemandProfile>([["basketball", CONTRACTED_WORLDS[0]!.demandProfile]]);
    expect(parityBreaches(only)).toEqual([]);
  });
});
