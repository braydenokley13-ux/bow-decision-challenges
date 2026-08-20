import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readCoverage, renderCoverage } from "../scripts/module-coverage";
import { availableCompetencyIds } from "./domain/competency/availability";
import { NYSED_2026_TOPICS } from "./domain/standards/frameworks/nysed-2026";

/**
 * `MODULE_COVERAGE.md` is regenerated here and compared to the committed copy.
 *
 * The document answers the question a district asks before any other — *can I use this for
 * my credit unit?* — and it is the one question the product could not answer, because the
 * objectives page counts objectives and a topic is what a scheme of work is built out of.
 *
 * A hand-written coverage table is the most reliable lie in education software: it is
 * written once, when it is true, and nothing about building a world opens it again. So it is
 * generated, and this fails the build when it drifts. **Regenerate it, do not edit it:**
 *
 *     npx tsx scripts/module-coverage.ts
 *
 * The second test is the one that matters. It is not about the document at all — it fails if
 * any topic's count goes up without a world that earns it, by re-deriving the count from
 * `availability.ts` rather than from anything the generator computed.
 */
describe("MODULE_COVERAGE.md", () => {
  it("says what the code says", () => {
    expect(readFileSync("MODULE_COVERAGE.md", "utf8"), "run: npx tsx scripts/module-coverage.ts").toBe(
      renderCoverage(readCoverage()),
    );
  });

  it("counts a topic as covered only where a built competency covers a whole objective", () => {
    const available = availableCompetencyIds();
    for (const topic of readCoverage()) {
      const named = NYSED_2026_TOPICS.find((entry) => entry.code === topic.code);
      expect(named, `topic ${topic.code} is not in the framework`).toBeDefined();
      for (const objective of topic.objectives) {
        if (objective.verdict !== "demonstrable") continue;
        const earned = objective.requires
          ? objective.requires.every((entry) => available.has(entry.competencyId))
          : objective.fullMappings.some((entry) => available.has(entry.competencyId));
        expect(
          earned,
          `${objective.code} reads demonstrable and no built competency covers the whole of it`,
        ).toBe(true);
      }
    }
  });

  it("never reports a partial mapping as a demonstration", () => {
    // The three coverage words are the most load-bearing definitions in the product, and the
    // failure they exist to stop is a summary that adds `partial` rows up into a "yes".
    for (const topic of readCoverage()) {
      for (const objective of topic.objectives) {
        if (objective.verdict !== "demonstrable" || objective.requires) continue;
        expect(
          objective.fullMappings.length,
          `${objective.code} is demonstrable with no \`full\` mapping behind it`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
