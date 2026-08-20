import { describe, expect, it } from "vitest";
import { compatibleWorldsFor, readAssignmentRequest } from "./assignments";

/**
 * The builder's central promise, held at the write path: an objective with no compatible
 * story is refused, whatever a client sends.
 *
 * `worldCompatibility.test.ts` already proves the join itself — the intersection a completion
 * rule demands, the union a single mapping allows — against fabricated coverage tables. What
 * it does not prove is that the *service* actually refuses to store an assignment built on
 * top of a real objective BOW cannot assess, which is the exact shape "an objective with no
 * compatible world must not be publishable" takes once it reaches `readAssignmentRequest`
 * rather than a pure function. These tests use real, unmodified data — `BUILT_WORLD_COVERAGE`
 * as it ships — because the point is that the refusal is not a fixture of the test.
 */

const FRAMEWORK_ID = "nysed-pf-2026" as const;

describe("an objective with no compatible story cannot be turned into an assignment", () => {
  it("offers no story for a real, mapped objective BOW cannot yet assess", () => {
    // 3.2 is `full`-mapped to `gross-to-net`, which has evidence requirements written and no
    // story that produces all of them. `worldCompatibility.test.ts` already pins the pure
    // answer for this code; this is the same fact read through the class service's own
    // binding, which is the one the builder actually calls.
    expect(compatibleWorldsFor({ frameworkId: FRAMEWORK_ID, code: "3.2" })).toEqual([]);
  });

  it("refuses to store an assignment naming that objective at all", () => {
    const request = readAssignmentRequest({ objectiveRef: { frameworkId: FRAMEWORK_ID, code: "3.2" } }, []);
    expect(request, "a client should not be able to publish against an objective with no compatible story").toBeNull();
  });

  it("refuses even when the client also names a real, playable world", () => {
    // The defence in depth: a client cannot route around the empty offer list by asserting a
    // world of its own. `allowedWorldIds` is checked against what the objective allows, not
    // against `BUILT_WORLD_IDS` alone (§0 of the ruling — this is the exact gap it closed).
    const request = readAssignmentRequest(
      { objectiveRef: { frameworkId: FRAMEWORK_ID, code: "3.2" }, allowedWorldIds: ["basketball"] },
      [],
    );
    expect(request).toBeNull();
  });

  it("refuses an objective code that does not exist at all, the same way", () => {
    expect(compatibleWorldsFor({ frameworkId: FRAMEWORK_ID, code: "99.9" })).toEqual([]);
    expect(readAssignmentRequest({ objectiveRef: { frameworkId: FRAMEWORK_ID, code: "99.9" } }, [])).toBeNull();
  });

  it("still accepts the one real objective that does have a compatible story", () => {
    // The control: the refusal above is about 3.2 specifically, not about the request shape.
    const request = readAssignmentRequest({ objectiveRef: { frameworkId: FRAMEWORK_ID, code: "1.3" } }, []);
    expect(request).not.toBeNull();
    expect(request?.allowedWorldIds.length).toBeGreaterThan(0);
  });
});

describe("a due date is honest: real, optional, and never invented", () => {
  it("stores nothing when the teacher left it blank", () => {
    const request = readAssignmentRequest({ objectiveRef: null }, []);
    expect(request).not.toBeNull();
    expect(request).not.toHaveProperty("dueAt");
  });

  it("round-trips the exact millisecond a teacher set", () => {
    const request = readAssignmentRequest({ objectiveRef: null, dueAt: 1_800_000_000_000 }, []);
    expect(request?.dueAt).toBe(1_800_000_000_000);
  });

  it("refuses a due date that is not a real timestamp, rather than silently dropping it", () => {
    expect(readAssignmentRequest({ objectiveRef: null, dueAt: "tomorrow" }, [])).toBeNull();
    expect(readAssignmentRequest({ objectiveRef: null, dueAt: Number.NaN }, [])).toBeNull();
    expect(readAssignmentRequest({ objectiveRef: null, dueAt: -1 }, [])).toBeNull();
    expect(readAssignmentRequest({ objectiveRef: null, dueAt: 0 }, [])).toBeNull();
  });
});
