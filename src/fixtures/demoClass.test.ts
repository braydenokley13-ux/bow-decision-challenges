import { describe, expect, it } from "vitest";
import { STRUCTURED_MICRO_SKILLS } from "../domain/blueprint/microSkills";
import { aggregateConcepts, aggregateMicroSkills, classSummary, contingencyRoutes, DEMO_STUDENTS, reviewQueue, teachNext } from "./demoClass";

describe("Basketball demo class", () => {
  it("contains 28 hypothetical Basketball records", () => {
    expect(DEMO_STUDENTS).toHaveLength(28);
    expect(DEMO_STUDENTS.every((student) => student.worldId === "basketball")).toBe(true);
    expect(new Set(DEMO_STUDENTS.map((student) => student.seatCode)).size).toBe(28);
  });

  // The educator dashboard is only defensible if a teacher can add the ledger up
  // themselves and get the header total back. This is the invariant that guarantees it.
  it("reconciles every student's ledger with their reported totals", () => {
    for (const student of DEMO_STUDENTS) {
      const essentials = student.concepts.filter((concept) => concept.conceptId !== "financial-defense");
      const defense = student.concepts.find((concept) => concept.conceptId === "financial-defense")!;
      expect(essentials.reduce((sum, concept) => sum + (concept.points ?? 0), 0)).toBe(student.structuredPoints);
      expect(essentials.reduce((sum, concept) => sum + concept.maxPoints, 0)).toBe(90);
      expect(defense.maxPoints).toBe(10);
      expect(defense.points).toBe(student.reasoningPoints);
      expect(student.finalPoints).toBe(student.reasoningPoints === null ? null : student.structuredPoints + student.reasoningPoints);
    }
  });

  it("keeps every student's headline, need, and timeline consistent with their own ledger", () => {
    for (const student of DEMO_STUDENTS) {
      const essentials = student.concepts.filter((concept) => concept.conceptId !== "financial-defense");
      const allIndependent = essentials.every((concept) => concept.status === "demonstrated_independently");
      if (student.seatCode !== "14") {
        expect(student.primaryNeed === "No current essential gap").toBe(allIndependent && student.reasoningPoints !== null);
      }
      expect(student.timeline.length).toBeGreaterThanOrEqual(6);
      expect(student.savedStates.length).toBeGreaterThanOrEqual(4);
      expect(student.timeline.every((entry) => entry.body.length > 20)).toBe(true);
    }
  });

  it("derives concept and micro-skill rows that account for the whole class", () => {
    for (const row of aggregateConcepts(DEMO_STUDENTS)) {
      expect(Object.values(row.counts).reduce((sum, count) => sum + count, 0)).toBe(28);
    }
    for (const skill of STRUCTURED_MICRO_SKILLS) {
      const row = aggregateMicroSkills(DEMO_STUDENTS, skill.conceptId).find((entry) => entry.id === skill.id)!;
      expect(row.independent + row.support + row.partial).toBe(28);
    }
  });

  it("derives contingency as the instructional priority", () => {
    expect(teachNext(DEMO_STUDENTS)?.conceptId).toBe("contingency");
    expect(teachNext(DEMO_STUDENTS)?.gap).toBe(9);
  });

  // The dashboard invites a teacher to move from a count to names, so the four
  // routes have to be a partition — no student in two groups, none missing.
  it("splits the class into four contingency routes that add up", () => {
    const groups = contingencyRoutes(DEMO_STUDENTS);
    expect(groups.reduce((sum, group) => sum + group.students.length, 0)).toBe(28);
    expect(new Set(groups.flatMap((group) => group.students.map((student) => student.seatCode))).size).toBe(28);
    const summary = classSummary(DEMO_STUDENTS);
    expect(summary.independentFirst + summary.laterCorrected + summary.completedWithSupport + summary.persistentFallbackGap).toBe(28);
    expect(summary.persistentFallbackGap).toBe(teachNext(DEMO_STUDENTS)?.gap);
  });

  it("opens the review queue on evidence rather than on grade order", () => {
    const queue = reviewQueue(DEMO_STUDENTS);
    expect(queue.length).toBeGreaterThanOrEqual(4);
    expect(queue.some((student) => student.reasoningPoints === null)).toBe(true);
    expect(queue.some((student) => student.seatCode === "14")).toBe(true);
  });

  it("reconciles Seat 14 exactly", () => {
    const seat14 = DEMO_STUDENTS.find((student) => student.seatCode === "14");
    expect(seat14?.concepts.map((concept) => concept.points)).toEqual([15, 9, 15, 17, 29, 9]);
    expect(seat14?.structuredPoints).toBe(85);
    expect(seat14?.reasoningPoints).toBe(9);
    expect(seat14?.finalPoints).toBe(94);
  });

  it("leaves the four unreviewed records without a reasoning score or a final grade", () => {
    const pending = DEMO_STUDENTS.filter((student) => student.reasoningPoints === null);
    expect(pending.map((student) => student.seatCode)).toEqual(["18", "25", "26", "27"]);
    expect(pending.every((student) => student.finalPoints === null)).toBe(true);
    expect(classSummary(DEMO_STUDENTS)).toMatchObject({ total: 28, reviewed: 24, pending: 4, basketball: 28 });
  });
});
