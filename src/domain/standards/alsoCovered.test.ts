import { describe, expect, it } from "vitest";
import { alsoFullyCovered } from "./index";
import { NYSED_2026_MAPPINGS } from "./mappings/nysed-2026";
import { NYSED_2026_STANDARDS } from "./frameworks/nysed-2026";

const ref = (code: string) => ({ frameworkId: "nysed-pf-2026" as const, code });
const codes = (list: readonly { code: string }[]) => list.map((entry) => entry.code).sort();

/**
 * What a teacher gets without asking, and why they have to be told.
 *
 * Two competencies cover two state objectives each, in full. A teacher who assigns one of the
 * pair gets a settled result on the other from the same student work — and until this function
 * had a caller, nothing on any screen said so. An objective moving that a teacher did not assign
 * reads as a product that has lost track of itself, which is a worse outcome than the gift is a
 * good one.
 */
describe("the objectives a teacher gets without asking for them", () => {
  it("names 2.4 for a teacher who assigned 2.3, and the other way round", () => {
    expect(codes(alsoFullyCovered(ref("2.3")))).toEqual(["2.4"]);
    expect(codes(alsoFullyCovered(ref("2.4")))).toEqual(["2.3"]);
  });

  it("names 5.5 for a teacher who assigned 5.2, and the other way round", () => {
    expect(codes(alsoFullyCovered(ref("5.2")))).toEqual(["5.5"]);
    expect(codes(alsoFullyCovered(ref("5.5")))).toEqual(["5.2"]);
  });

  it("says nothing for an objective whose skill covers only it", () => {
    expect(alsoFullyCovered(ref("1.3"))).toEqual([]);
  });

  it("never names the objective the teacher actually assigned", () => {
    for (const standard of NYSED_2026_STANDARDS) {
      expect(codes(alsoFullyCovered(ref(standard.code)))).not.toContain(standard.code);
    }
  });

  it("never reaches a second objective through a partial mapping", () => {
    // The over-claim this whole layer exists to stop, in its most tempting form: a competency
    // that fully covers 2.3 is `partial` on 2.1, and reporting 2.1 as a free companion would
    // settle an objective off the back of a different one.
    const partialCodes = new Set(
      NYSED_2026_MAPPINGS.filter((mapping) => mapping.coverage !== "full").map((mapping) => mapping.standardCode),
    );
    for (const standard of NYSED_2026_STANDARDS) {
      for (const companion of alsoFullyCovered(ref(standard.code))) {
        const bothFull = NYSED_2026_MAPPINGS.some(
          (mapping) =>
            mapping.coverage === "full" &&
            mapping.standardCode === companion.code &&
            NYSED_2026_MAPPINGS.some(
              (other) =>
                other.coverage === "full" &&
                other.standardCode === standard.code &&
                other.competencyId === mapping.competencyId,
            ),
        );
        expect(bothFull, `${standard.code} → ${companion.code} is not a full-to-full pair`).toBe(true);
      }
    }
    expect(partialCodes.size).toBeGreaterThan(0);
  });

  it("finds exactly the pairs the mapping table contains, so a third arrives on purpose", () => {
    const pairs = NYSED_2026_STANDARDS.flatMap((standard) =>
      alsoFullyCovered(ref(standard.code)).map((companion) => `${standard.code}→${companion.code}`),
    ).sort();
    expect(pairs).toEqual(["2.3→2.4", "2.4→2.3", "5.2→5.5", "5.5→5.2"]);
  });
});
