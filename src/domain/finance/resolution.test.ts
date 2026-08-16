import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { SetupId } from "../core/ids";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { bonusWeeks } from "../scenario/season";
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

  it("counts what Avery still holds once everything has landed", () => {
    const kept = resolveSeason(plan({ setupId: "gym-sublet", includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(900), flexibleCash: dollars(0) } }), N);
    expect(kept.endCash).toBe(dollars(900));

    // The buffer is what the shortfall eats, so what survives is what is left of it.
    const raided = resolveSeason(plan({ setupId: "cousin-room", includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(900), flexibleCash: dollars(0) } }), N);
    expect(raided.absorbed).toBe(dollars(800));
    expect(raided.endCash).toBe(dollars(100));
  });

  it("resolves one week per week that decides the bonus", () => {
    expect(resolveSeason(plan(), N).weeks.map((week) => week.week)).toEqual(bonusWeeks(N));
  });

  /**
   * Avery's week costs the same every week, so a plan over the line is over it in all of
   * them. The resolution used to show one missed week followed by clean ones, which
   * described a model this product does not have; the bonus is decided at the first.
   */
  it("is over the line in every deciding week, and names the week the bonus went", () => {
    const missed = resolveSeason(plan({ setupId: "cousin-room", includeCompletion: true }), N);
    expect(missed.weeks.every((week) => week.madeIt)).toBe(false);
    expect(missed.weeks.some((week) => week.madeIt)).toBe(false);
    expect(missed.bonusLostWeek).toBe(bonusWeeks(N)[0]);

    const held = resolveSeason(plan({ setupId: "gym-sublet", includeCompletion: true }), N);
    expect(held.weeks.every((week) => week.madeIt)).toBe(true);
    expect(held.bonusLostWeek).toBeNull();
  });
});

/**
 * The counterfactuals are what let a student answer "why did mine go differently?" with
 * something other than a shrug, so each one has to re-run the model with exactly one
 * decision changed rather than assert a story about it.
 */
describe("the season says which risk paid off and which one cost", () => {
  const verdict = (resolution: ReturnType<typeof resolveSeason>, id: string) =>
    resolution.risks.find((risk) => risk.id === id)!;

  it("blames the clinics only when the clinics are actually why the bonus was lost", () => {
    // The sublet is the one place that clears the line unaided, so it is the only place
    // where taking the clinics is what pushes Avery over it.
    const decisive = resolveSeason(plan({ setupId: "gym-sublet", includeCompletion: true, includeOptionalWork: true }), N);
    expect(decisive.attendanceHeld).toBe(false);
    expect(verdict(decisive, "clinics").outcome).toBe("cost_you");

    // The other two are over the line with or without them, so they are not the cause and
    // the fee is money the plan would not otherwise have had.
    for (const setupId of ["teammate-share", "cousin-room"] as const) {
      const alreadyOver = resolveSeason(plan({ setupId, includeCompletion: true, includeOptionalWork: true }), N);
      expect(alreadyOver.attendanceHeld).toBe(false);
      expect(verdict(alreadyOver, "clinics").outcome).toBe("paid_off");
    }
  });

  /**
   * Which places can hold the bonus with no money spent on Avery's week is the spine of
   * the whole load model, and it is the kind of fact a re-pricing can silently invert.
   */
  it("leaves exactly one place able to hold the bonus without buying hours back", () => {
    const unaided = (["gym-sublet", "teammate-share", "cousin-room"] as const)
      .filter((setupId) => resolveSeason(plan({ setupId }), N).attendanceHeld);
    expect(unaided).toEqual(["gym-sublet"]);
  });

  it("credits money spent on Avery's week only when it is what kept the bonus", () => {
    const cost = protectionCost("cousin-room", false);
    const decisive = resolveSeason(
      plan({ setupId: "cousin-room", includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(cost) } }),
      N,
    );
    expect(verdict(decisive, "buying-time").outcome).toBe("paid_off");

    // The same money on a setup that was never going to miss a session bought rest.
    const unnecessary = resolveSeason(
      plan({ setupId: "gym-sublet", includeCompletion: true, amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(cost) } }),
      N,
    );
    expect(verdict(unnecessary, "buying-time").outcome).toBe("no_effect");
  });

  /**
   * Spending sensibly and coming up short is not the same as making a mistake. Reporting
   * it as one would be untrue, and would teach that the safe move is never to spend.
   */
  it("says money that bought hours but not enough fell short, rather than that it cost them", () => {
    const partial = resolveSeason(
      plan({
        setupId: "cousin-room",
        includeCompletion: true,
        amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: N.load.blockBuybackCost },
      }),
      N,
    );
    expect(partial.attendanceHeld).toBe(false);
    expect(partial.load.bought).toBe(1);
    expect(verdict(partial, "buying-time").outcome).toBe("fell_short");
    expect(verdict(partial, "buying-time").detail).toContain("1 hours back");
  });

  /**
   * The clinics narrated "Avery still made every session" on a season where Avery had
   * missed one, because the branch only checked whether the clinics were the cause.
   */
  it("never claims Avery made every session on a season where Avery did not", () => {
    for (const setupId of ["gym-sublet", "teammate-share", "cousin-room"] as const) {
      for (const clinics of [false, true]) {
        const resolution = resolveSeason(plan({ setupId, includeCompletion: true, includeOptionalWork: clinics }), N);
        if (resolution.attendanceHeld) continue;
        for (const risk of resolution.risks) {
          expect(risk.detail, `${setupId} clinics=${clinics}: ${risk.id}`).not.toContain("made every session");
        }
      }
    }
  });

  it("marks a risk the student never took as having had no effect", () => {
    const cautious = resolveSeason(plan({ setupId: "gym-sublet" }), N);
    expect(verdict(cautious, "clinics").taken).toBe(false);
    expect(verdict(cautious, "clinics").outcome).toBe("no_effect");
    expect(verdict(cautious, "course-deposit").taken).toBe(false);
  });

  it("reports what the plan changed between the opening version and the last one", () => {
    const opening = { goal: dollars(1200), reserve: dollars(900), flexibleCash: dollars(1000) };
    const resolution = resolveSeason(
      plan({ amounts: { goal: dollars(400), reserve: dollars(900), flexibleCash: dollars(1200) } }),
      N,
      opening,
    );
    expect(resolution.changes).toEqual([
      { category: "goal", before: 1200, after: 400, delta: -800 },
      { category: "reserve", before: 900, after: 900, delta: 0 },
      { category: "flexibleCash", before: 1000, after: 1200, delta: 200 },
    ]);
  });

  it("reports no changes when there is no opening plan to compare against", () => {
    expect(resolveSeason(plan(), N).changes).toEqual([]);
  });
});
