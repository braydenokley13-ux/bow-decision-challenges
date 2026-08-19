import { describe, expect, it } from "vitest";
import { competencyContract } from "../../domain/competency/contract";
import type { WorldEvidenceCoverage } from "../../domain/competency/availability";
import { requiredEvidenceRequirementsFor } from "../../domain/competency/competencies";
import { demandFor } from "../../domain/standards";
import { worldProducesEvidenceFor, worldsProducingEvidenceFor } from "./worldCompatibility";
import { compatibleWorldsFor } from "./assignments";
import type { WorldId } from "../../domain/core/ids";

/**
 * Which worlds a teacher may be offered for an objective — the join that did not exist.
 *
 * The product's central sentence is that a teacher picks a learning goal and BOW finds
 * experiences capable of generating the required evidence. Until this function, what a
 * teacher was shown came from `PLAYABLE_WORLDS`: the story registry, which knows a world's
 * title and its running time and nothing at all about evidence.
 *
 * These tests hold two claims apart, because they are different and the difference is the
 * whole design:
 *
 *   - **Can BOW assess this objective at all?** — `isAssessable`, which asks whether each
 *     competency is available *somewhere*.
 *   - **Can this one world evidence it?** — this file. A student plays one world, so a world
 *     offered against an objective must carry that objective on its own.
 */

/** A coverage table built by hand, so a claim can be made that no world actually honours. */
function rowFor(worldId: string, competencyId: string): WorldEvidenceCoverage {
  const id = competencyId as WorldEvidenceCoverage["competencyId"];
  return {
    worldId: worldId as WorldId,
    competencyId: id,
    producedEvidenceRequirementIds: requiredEvidenceRequirementsFor(id).map((row) => row.id),
    contract: competencyContract(id),
  };
}

describe("which worlds can evidence an objective", () => {
  it("names both shipped worlds for the one objective BOW can assess today", () => {
    // 1.3 "Create a budget" is `full`-mapped to `plan-within-income`, which both worlds
    // fully produce. This is the row the demo's world choice actually rests on.
    expect(worldsProducingEvidenceFor({ frameworkId: "nysed-pf-2026", code: "1.3" }))
      .toEqual(["basketball", "food-truck"]);
  });

  it("names nobody for an objective no world reaches", () => {
    // 3.2 is `full`-mapped to `gross-to-net`, which has requirements written and no world.
    expect(worldsProducingEvidenceFor({ frameworkId: "nysed-pf-2026", code: "3.2" })).toEqual([]);
  });

  it("names nobody for an objective that does not exist", () => {
    expect(worldsProducingEvidenceFor({ frameworkId: "nysed-pf-2026", code: "9.9" })).toEqual([]);
  });

  it("requires ONE world to carry every part of a completion rule, not the class between them", () => {
    // The decision this function makes, pinned. 2.1 needs three competencies; suppose two
    // worlds each produce a different subset and a third produces all three. Only the third
    // may be offered — a student picking either of the others produces partial evidence, and
    // reporting the objective as covered off that is coverage inflation one child at a time.
    const ref = { frameworkId: "nysed-pf-2026", code: "2.1" } as const;
    const rule = demandFor(ref).allOf;
    expect(rule.length, "2.1 is expected to carry a completion rule").toBeGreaterThan(1);

    const [first, second, ...others] = rule;
    const table: WorldEvidenceCoverage[] = [
      rowFor("basketball", first!),
      rowFor("food-truck", second!),
      ...rule.map((id) => rowFor("credit", id)),
    ];
    void others;

    expect(worldsProducingEvidenceFor(ref, table)).toEqual(["credit"]);
  });

  it("accepts any one full-mapped competency where there is no completion rule", () => {
    const ref = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;
    const anyOf = demandFor(ref).anyOf;
    expect(anyOf.length).toBeGreaterThan(0);
    expect(worldsProducingEvidenceFor(ref, [rowFor("credit", anyOf[0]!)])).toEqual(["credit"]);
  });

  it("answers the single-world question the write path asks", () => {
    const ref = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;
    expect(worldProducesEvidenceFor(ref, "basketball")).toBe(true);
    expect(worldProducesEvidenceFor(ref, "credit" as WorldId)).toBe(false);
  });
});

describe("what a teacher may actually be offered", () => {
  it("offers only worlds a student can get into", () => {
    // The second half of the join. A world can produce every requirement of an objective and
    // have no scenario registered; offering it publishes work nobody can open.
    const ref = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;
    expect(worldsProducingEvidenceFor(ref, [rowFor("credit", "plan-within-income")])).toEqual(["credit"]);
    expect(compatibleWorldsFor(ref)).toEqual(["basketball", "food-truck"]);
    expect(compatibleWorldsFor(ref)).not.toContain("credit");
  });

  it("offers every playable world for a class that was never given an objective", () => {
    // §17.3: nobody chose an objective, so there is nothing to be compatible with.
    expect([...compatibleWorldsFor(null)].sort()).toEqual(["basketball", "food-truck"]);
  });

  it("offers nothing for an objective no world can evidence", () => {
    expect(compatibleWorldsFor({ frameworkId: "nysed-pf-2026", code: "3.2" })).toEqual([]);
  });
});
