import { describe, expect, it } from "vitest";
import { exportClassSnapshot, importClassSnapshot } from "../../../server/store-export";
import { memoryStore, type StoredClass, type StoredRosterEntry } from "../../../server/store";

const classRecord: StoredClass = {
  code: "PERSIST1", label: "Period 1", challengeId: "plan-under-pressure", teacherKey: "key",
  teacherId: "teacher-1", createdAt: 1, expiresAt: Date.now() + 86_400_000,
};

describe("store persistence boundary", () => {
  it("keeps owner and seat indexes with their owning records", async () => {
    const store = memoryStore();
    await store.putClass(classRecord);
    const entry: StoredRosterEntry = {
      id: "seat-1", classCode: classRecord.code, seatCode: "1", displayName: "A", studentId: "student-1", addedAt: 1,
      joinCodeHash: "hash",
    };
    await store.putRosterEntry(entry);
    expect(await store.listClassesForTeacher("teacher-1")).toEqual([classRecord.code]);
    expect(await store.listSeatsForStudent("student-1")).toEqual([{ classCode: classRecord.code, seatCode: "1" }]);
  });

  it("exports and imports a versioned logical class without naming a driver", async () => {
    const source = memoryStore();
    await source.putClass(classRecord);
    const snapshot = await exportClassSnapshot(source, classRecord.code);
    expect(snapshot.version).toBe(1);
    const destination = memoryStore();
    await importClassSnapshot(destination, snapshot);
    expect(await destination.getClass(classRecord.code)).toEqual(classRecord);
    expect(await destination.listAssignments(classRecord.code)).toEqual([]);
  });
});
