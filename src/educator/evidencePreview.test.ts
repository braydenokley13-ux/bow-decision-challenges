import { describe, expect, it } from "vitest";
import { evidencePreviewFor } from "./evidencePreview";
import { requiredEvidenceRequirementsFor } from "../domain/competency/competencies";
import { competenciesAssessedBy, compatibleWorldsFor } from "../platform/classes/assignments";

const REF = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;

/**
 * The evidence preview, read against the real data it is required to be sourced from.
 *
 * Every assertion here checks the preview against `competenciesAssessedBy`,
 * `requiredEvidenceRequirementsFor` and `BUILT_WORLD_COVERAGE` themselves — the same three
 * things `evidencePreview.ts`'s own doc comment names as its only sources — rather than
 * against a hand-typed expected value, because a hand-typed value is exactly the kind of
 * fixture that stops noticing when the module quietly starts inventing a row.
 */
describe("the evidence preview is generated, not authored", () => {
  it("returns nothing before an objective is chosen", () => {
    expect(evidencePreviewFor(null, ["basketball", "food-truck"])).toEqual([]);
  });

  it("covers exactly the skills the write path itself would record for this objective", () => {
    const preview = evidencePreviewFor(REF, compatibleWorldsFor(REF));
    expect(preview.map((skill) => skill.competencyId).sort()).toEqual([...competenciesAssessedBy(REF)].sort());
  });

  it("lists exactly the required parts of each skill, no more and no fewer", () => {
    const preview = evidencePreviewFor(REF, compatibleWorldsFor(REF));
    for (const skill of preview) {
      const required = requiredEvidenceRequirementsFor(skill.competencyId);
      expect(skill.requirements.map((row) => row.requirement.id).sort()).toEqual(required.map((row) => row.id).sort());
    }
  });

  it("only ever names a story as producing a part when a real coverage row says so", () => {
    const worlds = compatibleWorldsFor(REF);
    const preview = evidencePreviewFor(REF, worlds);
    for (const skill of preview) {
      for (const row of skill.requirements) {
        for (const worldId of row.producedBy) {
          expect(worlds).toContain(worldId);
        }
      }
    }
  });

  it("never credits a story that was not offered, even if it really does produce the part", () => {
    // Ask about only one of the two stories that can prove 1.3. Its own required parts must
    // never show the *other* story as a producer, because that story was never in the list
    // the caller passed in.
    const [first] = compatibleWorldsFor(REF);
    expect(first).toBeDefined();
    const preview = evidencePreviewFor(REF, [first!]);
    for (const skill of preview) {
      for (const row of skill.requirements) {
        expect(row.producedBy.every((worldId) => worldId === first)).toBe(true);
      }
    }
  });

  it("names no skill and no story that is not real product data", () => {
    const preview = evidencePreviewFor(REF, compatibleWorldsFor(REF));
    expect(preview.length).toBeGreaterThan(0);
    for (const skill of preview) {
      expect(skill.statement.length).toBeGreaterThan(0);
      for (const row of skill.requirements) {
        expect(row.requirement.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("names no producer for an objective BOW cannot assess, since no offered story is real", () => {
    // 3.2 is mapped to `gross-to-net`, which has required parts written and no story that
    // produces them — `assignmentBuilderCompatibility.test.ts` pins the write-path refusal
    // for this exact code. The preview still names the skill and its required parts (a
    // teacher asking "what is this short of" deserves an answer), but since no story was
    // passed in — the builder never offers one for an objective it will not let a teacher
    // publish — every row's producer list is empty. Nothing here is invented to fill it.
    const ref = { frameworkId: "nysed-pf-2026", code: "3.2" } as const;
    const preview = evidencePreviewFor(ref, []);
    expect(preview.length).toBeGreaterThan(0);
    for (const skill of preview) {
      for (const row of skill.requirements) expect(row.producedBy).toEqual([]);
    }
  });
});
