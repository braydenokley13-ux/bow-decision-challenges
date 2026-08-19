import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { d26Matrix, matrixRows } from "../scripts/d26-matrix";
import { compatibleWorldsFor } from "./platform/classes/worldCompatibility";
import { BUILT_WORLD_IDS } from "./platform/classes/assignments";
import { assessableStandards } from "./domain/standards";

/**
 * `gauntlet/v5/D26_MATRIX.md` is regenerated here and compared to the committed copy.
 *
 * A district answer sheet is the second most reliable lie in education software, after a
 * hand-written coverage table: it is written once, when it is true, and nothing about
 * shipping a change opens it again. So the statuses are computed where they can be, and this
 * fails the build when the document drifts. **Regenerate it, do not edit it:**
 *
 *     npx tsx scripts/d26-matrix.ts
 *
 * The tests after the first are the ones that matter. They do not check the document — they
 * check that the two claims a district would most reasonably act on cannot be overstated,
 * by re-deriving each from the product rather than from anything the generator computed.
 */
describe("D26_MATRIX.md", () => {
  it("says what the code says", () => {
    expect(readFileSync("gauntlet/v5/D26_MATRIX.md", "utf8"), "run: npx tsx scripts/d26-matrix.ts").toBe(d26Matrix());
  });

  it("marks every row that a person decided rather than a function", () => {
    // The charter's rule: a `manual` row is a promise until the build can check it. The
    // failure this stops is the quiet one — a promise being re-filed as a measurement by
    // somebody tidying the table.
    const rows = matrixRows();
    expect(rows.length).toBeGreaterThan(8);
    for (const row of rows) {
      expect(["derived", "manual"], `${row.need} has no basis`).toContain(row.basis);
      expect(row.evidence.length, `${row.need} cites nothing`).toBeGreaterThan(8);
    }
    expect(rows.some((row) => row.basis === "derived"), "no row is checked by anything").toBe(true);
  });

  it("never claims a world choice the compatibility contract does not support", () => {
    // The demo's central promise. It may only read "Answered" while more than one world can
    // be *proven* to raise every required evidence row of the objective it is offered for.
    const rows = matrixRows();
    const choice = rows.find((row) => row.need === "Comparable learning through different motifs");
    expect(choice, "the world-choice row is gone; it is the demo's central promise").toBeDefined();
    const proven = compatibleWorldsFor({ frameworkId: "nysed-pf-2026", code: "1.3" }, BUILT_WORLD_IDS);
    if (choice!.status.includes("Answered")) {
      expect(proven.length, "the matrix claims a real choice and the contract proves fewer than two worlds")
        .toBeGreaterThan(1);
    }
  });

  it("never claims more standards alignment than the product can demonstrate", () => {
    const rows = matrixRows();
    const alignment = rows.find((row) => row.need.startsWith("Alignment to NYSED"));
    expect(alignment).toBeDefined();
    const demonstrable = assessableStandards("nysed-pf-2026").length;
    expect(
      alignment!.behaviour.startsWith(`${demonstrable} of `),
      `the matrix says "${alignment!.behaviour}" and the product demonstrates ${demonstrable}`,
    ).toBe(true);
  });
});
