import { describe, expect, it } from "vitest";
import { selectedAssignment } from "./assignmentSelection";
import type { Assignment } from "../platform/classes/types";

const one = (id: string): Assignment => ({
  id, classId: "CLASS", objectiveRef: null, competencyIds: [], allowedWorldIds: ["food-truck"],
  studentChoosesWorld: false, format: "decision-challenge", assignedStudentIds: null, createdAt: 1,
});

describe("selected assignment", () => {
  it("uses the explicitly selected assignment", () => {
    const second = one("second");
    expect(selectedAssignment([one("first"), second], "second")).toBe(second);
  });
  it("does not guess when a class has multiple assignments", () => {
    expect(selectedAssignment([one("first"), one("second")])).toBeNull();
  });
  it("refuses an assignment id that is not on the class", () => {
    expect(selectedAssignment([one("first"), one("second")], "not-set")).toBeNull();
  });
  it("keeps a legacy one-assignment class working", () => {
    const only = one("only");
    expect(selectedAssignment([only])).toBe(only);
  });
});
