import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { SetupId } from "../core/ids";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { loadFor } from "./load";
import { resolveSeason } from "./resolution";
import type { SnapshotInputs } from "./types";

const plan = (over: Partial<SnapshotInputs> & { setupId?: SetupId } = {}): SnapshotInputs => ({
  mode: "final",
  amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
  includeCompletion: false,
  includeOutcome: false,
  includeOptionalWork: false,
  setupId: "gym-sublet",
  week5Applied: true,
  depositTaken: false,
  numbersVersion: N.version,
  ...over,
});

/** What it would cost this plan to keep Avery in every session. */
const protectionCost = (setupId: SetupId, clinics: boolean) =>
  loadFor({ setupId, rehabActive: true, clinicsAccepted: clinics, timeMoney: dollars(0) }, N).costToProtect ?? 0;

describe("the season resolves from the student's own decisions", () => {
  it("pays the attendance bonus when Avery's week stayed under the line", () => {
    const resolution = resolveSeason(plan({ setupId: "gym-sublet" }), N);
    expect(resolution.attendanceHeld).toBe(true);
    expect(resolution.shortfall).toBe(0);
  });

  it("hands an unplanned gain to a student who never counted on the bonus", () => {
    const resolution = resolveSeason(plan({ setupId: "gym-sublet", includeCompletion: false }), N);
    expect(resolution.unplannedGain).toBe(N.completionIncome);
    expect(resolution.uncovered).toBe(0);
  });

  it("costs the bonus when the week was too full, and the buffer is what decides the damage", () => {
    const overloaded = { setupId: "cousin-room" as const, includeCompletion: true };

    const unprotected = resolveSeason(plan({ ...overloaded, amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) } }), N);
    expect(unprotected.attendanceHeld).toBe(false);
    expect(unprotected.shortfall).toBe(N.completionIncome);
    expect(unprotected.uncovered).toBe(N.completionIncome);

    const cushioned = resolveSeason(plan({ ...overloaded, amounts: { goal: dollars(0), reserve: N.completionIncome, flexibleCash: dollars(0) } }), N);
    expect(cushioned.absorbed).toBe(N.completionIncome);
    expect(cushioned.uncovered).toBe(0);

    const partial = resolveSeason(plan({ ...overloaded, amounts: { goal: dollars(0), reserve: dollars(300), flexibleCash: dollars(0) } }), N);
    expect(partial.absorbed).toBe(300);
    expect(partial.uncovered).toBe(N.completionIncome - 300);
  });

  it("lets money spent on Avery's week buy the bonus back", () => {
    const cost = protectionCost("cousin-room", false);
    expect(cost).toBeGreaterThan(0);
    const resolution = resolveSeason(
      plan({ setupId: "cousin-room", includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(cost) } }),
      N,
    );
    expect(resolution.attendanceHeld).toBe(true);
    expect(resolution.uncovered).toBe(0);
  });

  it("makes the clinics cost more of Avery's week than they otherwise would", () => {
    expect(protectionCost("teammate-share", true)).toBeGreaterThan(protectionCost("teammate-share", false));
  });

  it("treats a reserved seat as already paid, at the cheaper price", () => {
    const reserved = resolveSeason(plan({ depositTaken: true }), N);
    expect(reserved.coursePrice).toBe(N.course.depositPrice);
    expect(reserved.courseSaved).toBe(N.course.depositPrice);
    expect(reserved.courseFunded).toBe(true);

    const later = resolveSeason(plan({ amounts: { goal: dollars(N.course.fullPrice), reserve: dollars(0), flexibleCash: dollars(0) } }), N);
    expect(later.coursePrice).toBe(N.course.fullPrice);
    expect(later.courseFunded).toBe(true);

    const short = resolveSeason(plan({ amounts: { goal: dollars(400), reserve: dollars(0), flexibleCash: dollars(0) } }), N);
    expect(short.courseFunded).toBe(false);
    expect(short.courseShort).toBe(N.course.fullPrice - 400);
  });
});
