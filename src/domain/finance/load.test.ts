import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { blocksBoughtBy, loadDemand, loadFor } from "./load";

const week = (setupId: Parameters<typeof loadDemand>[0]["setupId"], over: Partial<{ rehabActive: boolean; clinicsAccepted: boolean; timeMoney: number }> = {}) =>
  loadFor(
    {
      setupId,
      rehabActive: over.rehabActive ?? true,
      clinicsAccepted: over.clinicsAccepted ?? false,
      timeMoney: dollars(over.timeMoney ?? 0),
    },
    N,
  );

describe("Avery's week", () => {
  it("costs nothing extra before rehab starts", () => {
    expect(loadDemand({ setupId: "cousin-room", rehabActive: false, clinicsAccepted: false }, N)).toBe(
      N.load.commuteBlocks["cousin-room"],
    );
  });

  it("stacks the commute, rehab, rehab travel and the clinics", () => {
    const withClinics = loadDemand({ setupId: "teammate-share", rehabActive: true, clinicsAccepted: true }, N);
    expect(withClinics).toBe(
      N.load.commuteBlocks["teammate-share"] + N.load.rehabBlocks + N.load.rehabTravelBlocks["teammate-share"] + N.load.clinicBlocks,
    );
  });

  it("separates the three places by how much of Avery's week they take", () => {
    const [sublet, share, cousin] = [week("gym-sublet"), week("teammate-share"), week("cousin-room")];
    expect(sublet.demand).toBeLessThan(share.demand);
    expect(share.demand).toBeLessThan(cousin.demand);
  });

  it("buys blocks back with money, but never more blocks than exist", () => {
    expect(blocksBoughtBy(dollars(N.load.blockBuybackCost * 3), N)).toBe(3);
    // Partial dollars do not buy a partial hour.
    expect(blocksBoughtBy(dollars(N.load.blockBuybackCost * 2 - 1), N)).toBe(1);
    const overspent = week("gym-sublet", { timeMoney: N.load.blockBuybackCost * 50 });
    expect(overspent.bought).toBe(overspent.demand);
    expect(overspent.net).toBe(0);
  });

  it("prices what it would take to keep the attendance bonus, and says when nothing is needed", () => {
    const safe = week("gym-sublet");
    expect(safe.attendanceHolds).toBe(true);
    expect(safe.costToProtect).toBeNull();

    const stretched = week("cousin-room");
    expect(stretched.attendanceHolds).toBe(false);
    expect(stretched.costToProtect).toBe((stretched.demand - N.load.attendanceLimit) * N.load.blockBuybackCost);

    const protectedWeek = week("cousin-room", { timeMoney: stretched.costToProtect! });
    expect(protectedWeek.attendanceHolds).toBe(true);
    expect(protectedWeek.overBy).toBe(0);
  });

  it("makes the clinics cost more of Avery's week wherever they live", () => {
    for (const setupId of ["gym-sublet", "teammate-share", "cousin-room"] as const) {
      expect(week(setupId, { clinicsAccepted: true }).demand - week(setupId).demand).toBe(N.load.clinicBlocks);
    }
  });
});
