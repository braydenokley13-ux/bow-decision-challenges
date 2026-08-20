import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readClosure, renderClosure } from "../scripts/objective-closure";
import { availableCompetencyIds } from "./domain/competency/availability";
import { competencyById } from "./domain/competency/competencies";
import { NYSED_2026_STANDARDS } from "./domain/standards/frameworks/nysed-2026";

/**
 * `OBJECTIVE_CLOSURE.md` is regenerated here and compared to the committed copy.
 *
 * `MODULE_COVERAGE.md` says what BOW can assess. This says what stands in front of everything
 * else, and the reason it is generated rather than written is that a plan drifts faster than a
 * coverage table does: a competency gains its rows, an objective moves from *needs rows, then a
 * world* to *needs a world*, and nobody edits the plan. **Regenerate it, do not edit it:**
 *
 *     npx tsx scripts/objective-closure.ts
 *
 * The tests below the first are the ones that matter, and each pins a claim the document makes
 * that would be a lie if the code changed under it.
 */
describe("OBJECTIVE_CLOSURE.md", () => {
  it("says what the code says", () => {
    expect(readFileSync("OBJECTIVE_CLOSURE.md", "utf8"), "run: npx tsx scripts/objective-closure.ts").toBe(
      renderClosure(readClosure()),
    );
  });

  it("accounts for every objective exactly once", () => {
    const rows = readClosure().flatMap((topic) => topic.rows);
    expect(rows).toHaveLength(NYSED_2026_STANDARDS.length);
    expect(new Set(rows.map((row) => row.code)).size).toBe(NYSED_2026_STANDARDS.length);
  });

  it("never calls an objective done unless every competency it names is available", () => {
    const available = availableCompetencyIds();
    for (const row of readClosure().flatMap((topic) => topic.rows)) {
      if (row.blocker !== "done") continue;
      expect(row.needs.length, `${row.code} is done and rests on nothing`).toBeGreaterThan(0);
      for (const need of row.needs) {
        expect(available.has(need.competencyId), `${row.code} claims done on ${need.competencyId}`).toBe(true);
      }
    }
  });

  it("never says an objective only needs a world while a competency it rests on has no rows", () => {
    // The distinction the whole document is for. A competency with an empty requirements array
    // can never be available, so an objective resting on one needs the writing *and* the build —
    // and the first draft of the generator had a category that hid the second half.
    for (const row of readClosure().flatMap((topic) => topic.rows)) {
      if (row.blocker !== "needs-a-world") continue;
      for (const need of row.needs) {
        expect(
          competencyById(need.competencyId).evidenceRequirements.length,
          `${row.code} is filed as a build and ${need.competencyId} has no rows written`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("calls an objective out of reach only when nothing at all covers the whole of it", () => {
    // `out-of-reach` is the one state no build and no rubric clears, so it has to mean exactly
    // what it says: no `full` mapping and no completion rule. An objective landing here because
    // somebody deleted a mapping row would read as a product limit rather than as a mistake.
    for (const row of readClosure().flatMap((topic) => topic.rows)) {
      if (row.blocker !== "out-of-reach") continue;
      expect(row.needs, `${row.code} is out of reach and names competencies`).toEqual([]);
    }
  });

  it("agrees with the coverage report about what is done", () => {
    // Two generated documents, two independent derivations, one product. They have disagreed
    // before — by two objectives — and the disagreement was invisible because nothing compared
    // them.
    const done = readClosure()
      .flatMap((topic) => topic.rows)
      .filter((row) => row.blocker === "done")
      .map((row) => row.code)
      .sort();
    const demonstrable = readFileSync("MODULE_COVERAGE.md", "utf8")
      .split("\n")
      .filter((line) => line.includes("**demonstrable**"))
      .map((line) => line.split("|")[1]?.trim().split(" ")[0] ?? "")
      .sort();
    expect(done).toEqual(demonstrable);
  });
});
