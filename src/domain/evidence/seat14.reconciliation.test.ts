import { describe, expect, it } from "vitest";
import { SEAT_14_REASONING_POINTS, seat14Log } from "./seat14.golden";
import { deriveResult } from "./result";

describe("Seat 14 golden case", () => {
  it("reconciles to 85/90 structured, 94/100 final, with split C4 status and trajectory", () => {
    const result = deriveResult(seat14Log(), SEAT_14_REASONING_POINTS);
    expect(Object.fromEntries(result.concepts.map((concept) => [concept.conceptId, concept.points]))).toEqual({
      "income-reliability": 15,
      "full-cost": 9,
      "viable-budget": 15,
      contingency: 17,
      adaptation: 29,
    });
    expect(result.grade.structuredPoints).toBe(85);
    expect(result.grade.finalPoints).toBe(94);
    const c4 = result.concepts.find((concept) => concept.conceptId === "contingency");
    expect(c4?.status).toBe("demonstrated_independently");
    expect(c4?.trajectory).toBe("corrected_after_consequence");
  });
});
