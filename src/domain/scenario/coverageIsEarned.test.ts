import { describe, expect, it } from "vitest";
import { BUILT_WORLD_COVERAGE } from "../competency/availability";
import { requiredEvidenceRequirementsFor } from "../competency/competencies";
import { REASONING_CRITERIA, type ReasoningScores } from "../blueprint/reasoning";
import { WORLD_RUNS } from "../../test/worldRuns";
import { contractFor } from "./contracts";
import { isPlayableWorld } from "./registry";
import type { WorldId } from "../core/ids";

/**
 * Every coverage claim is earned, checked from the claim rather than from the contract.
 *
 * `BUILT_WORLD_COVERAGE` is the sentence a district eventually reads as **BOW can assess
 * this**. It is hand-written, and until this file nothing generic held it to the code. The
 * nearest guard — `contracts.test.ts` · *produces every requirement of every competency it
 * claims* — iterates `CONTRACTED_WORLDS`, so it can only check a world that remembered to
 * register a contract. A world that declared coverage and stopped there was not failed; it
 * was **skipped**, which is the worst of the three possible outcomes.
 *
 * That gap was not theoretical. Executed against the real functions, one well-formed false
 * row — a world claiming all four required rows of `gross-to-net`, correctly stamped with
 * `competencyContract("gross-to-net")` — produced this:
 *
 * ```
 * availableCompetencyIds → [... "gross-to-net" ...]   ← the lie is now a fact
 * worldsAssessing("gross-to-net") → ["credit"]        ← and it names the world
 * isAssessable(3.2) → true                            ← and an objective opens
 * assessableStandards → ["1.3", "3.2"]                ← and the count goes up
 * contractDrift(...) → null                           ← the freshness guard is content
 * comparableWorldSets → unchanged                     ← parity has nothing to say
 * ```
 *
 * Six mechanisms, all passing, all correct about their own question. None of them asks the
 * one question that matters: *did a student's run actually raise this evidence?*
 *
 * This file asks it, once, over every row. The direction is what makes it a guarantee — it
 * starts at the claim, so there is no way to make a claim this test does not see.
 */

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(
  REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]),
);

const CLAIMING_WORLDS: readonly WorldId[] = [
  ...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.worldId)),
].sort();

describe("every coverage claim is earned", () => {
  it("has claims to check, so an empty sweep cannot pass", () => {
    expect(BUILT_WORLD_COVERAGE.length).toBeGreaterThan(0);
    expect(CLAIMING_WORLDS.length).toBeGreaterThan(0);
  });

  it.each(CLAIMING_WORLDS)("%s can be checked at all", (worldId) => {
    // Both of these are the "skipped in silence" failure, caught. A world may not enter the
    // coverage table without the two things that make its claim checkable.
    expect(
      contractFor(worldId),
      `${worldId} claims coverage with no WorldContract. Register one in scenario/contracts.ts — `
        + `a claim nothing can observe is a claim nothing can check.`,
    ).toBeDefined();
    expect(
      WORLD_RUNS[worldId],
      `${worldId} claims coverage with no harness in src/test/worldRuns.ts.`,
    ).toBeTypeOf("function");
  });

  it.each(CLAIMING_WORLDS)("%s raises every requirement it claims, in a real run", (worldId) => {
    const contract = contractFor(worldId);
    if (!contract) throw new Error(`${worldId} has no contract; the previous test says so more usefully`);

    const built = WORLD_RUNS[worldId]();
    const observed = contract.observe(built.log, { reasoningCriteria: READ_AND_STRONG });
    const produced = new Set(
      observed.filter((entry) => entry.level !== null).map((entry) => entry.evidenceRequirementId),
    );

    for (const claim of BUILT_WORLD_COVERAGE.filter((row) => row.worldId === worldId)) {
      const required = requiredEvidenceRequirementsFor(claim.competencyId);
      expect(
        required.length,
        `${worldId} claims ${claim.competencyId}, which has no required evidence requirements written. `
          + `A competency with nothing to produce cannot be produced.`,
      ).toBeGreaterThan(0);

      for (const requirement of required) {
        expect(
          claim.producedEvidenceRequirementIds.includes(requirement.id),
          `${worldId} claims ${claim.competencyId} without listing ${requirement.id}`,
        ).toBe(true);
        expect(
          produced.has(requirement.id),
          `${worldId} lists ${requirement.id} but a complete run of it produced no level for that row. `
            + `Either the observer does not route it, or the harness does not reach the screen that raises it. `
            + `Both are the claim being untrue of a student.`,
        ).toBe(true);
      }
    }
  });

  it.each(CLAIMING_WORLDS)("%s claims nothing it cannot cite a student's own event for", (worldId) => {
    const contract = contractFor(worldId);
    if (!contract) return;
    const built = WORLD_RUNS[worldId]();
    const ids = new Set(built.log.map((event) => event.id));
    for (const entry of contract.observe(built.log, { reasoningCriteria: READ_AND_STRONG })) {
      if (entry.level === null) continue;
      expect(
        entry.evidenceRefs.some((ref) => ids.has(ref)),
        `${worldId}:${entry.evidenceRequirementId} published a level citing no event in the run it read`,
      ).toBe(true);
    }
  });

  it("offers no world a student cannot get into", () => {
    // A world can be evidentially perfect and unreachable. `compatibleWorldsFor` filters on
    // this, but a coverage table full of worlds nobody can play is a coverage figure that
    // overstates the product rather than the assessment.
    for (const worldId of CLAIMING_WORLDS) {
      expect(
        isPlayableWorld(worldId),
        `${worldId} claims coverage and is not playable — the claim cannot be met by any student`,
      ).toBe(true);
    }
  });
});
