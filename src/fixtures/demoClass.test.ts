import { describe, expect, it } from "vitest";
import { aggregateC4MicroSkills, aggregateConcepts, classSummary, DEMO_STUDENTS, teachNext } from "./demoClass";

describe("Basketball demo class", () => {
  it("contains 28 hypothetical Basketball records and derives exact aggregate rows", () => {
    expect(DEMO_STUDENTS).toHaveLength(28);
    expect(DEMO_STUDENTS.every((student) => student.worldId === "basketball")).toBe(true);
    expect(aggregateConcepts(DEMO_STUDENTS).map((row) => Object.values(row.counts))).toEqual([
      [16, 7, 4, 1, 0], [18, 7, 3, 0, 0], [19, 6, 3, 0, 0], [11, 8, 8, 1, 0], [16, 7, 4, 1, 0], [13, 0, 8, 3, 4],
    ]);
  });

  it("derives contingency as the instructional priority", () => {
    expect(teachNext(DEMO_STUDENTS)?.conceptId).toBe("contingency");
    expect(teachNext(DEMO_STUDENTS)?.gap).toBe(9);
  });

  it("derives the C4 drill-down and headline from individual records", () => {
    expect(aggregateC4MicroSkills(DEMO_STUDENTS).map(({ independent, support, partial }) => [independent, support, partial])).toEqual([[17, 7, 4], [18, 6, 4], [14, 8, 6], [11, 8, 9]]);
    expect(classSummary(DEMO_STUDENTS)).toMatchObject({ total: 28, reviewed: 24, pending: 4, basketball: 28, median: 84, range: [58, 98], openingIncomplete: 14, laterCorrected: 5, persistentFallbackGap: 9, independentFirst: 6, completedWithSupport: 8 });
  });

  it("reconciles Seat 14 exactly", () => {
    const seat14 = DEMO_STUDENTS.find((student) => student.seatCode === "14");
    expect(seat14?.concepts.map((concept) => concept.points)).toEqual([15, 9, 15, 17, 29, 9]);
    expect(seat14?.structuredPoints).toBe(85);
    expect(seat14?.reasoningPoints).toBe(9);
    expect(seat14?.finalPoints).toBe(94);
  });

  it("preserves the reviewed-grade distribution", () => {
    const grades = DEMO_STUDENTS.flatMap((student) => student.finalPoints === null ? [] : [student.finalPoints]).sort((a, b) => a - b);
    expect(grades).toHaveLength(24);
    expect(grades[0]).toBe(58);
    expect(grades.at(-1)).toBe(98);
    expect((grades[11]! + grades[12]!) / 2).toBe(84);
    expect([grades.filter((g) => g >= 90).length, grades.filter((g) => g >= 80 && g < 90).length, grades.filter((g) => g >= 70 && g < 80).length, grades.filter((g) => g < 70).length]).toEqual([7, 10, 5, 2]);
    expect(DEMO_STUDENTS.find((student) => student.seatCode === "18")?.finalPoints).toBeNull();
  });
});
