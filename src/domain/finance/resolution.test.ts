import { describe, expect, it } from "vitest";
import { dollars, formatDollars } from "../core/money";
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
/**
 * Every verdict on the ending panel, swept for the two ways a heading can lie.
 *
 * The panel is four to six cards, each a coloured badge over a sentence, and it is the last
 * thing a student reads about their own season. A badge that disagrees with the sentence
 * under it is worse than no badge: it teaches a reader that the labels are decoration.
 */
describe("no verdict contradicts its own card", () => {
  const seasons = () => {
    const plans: SnapshotInputs[] = [];
    for (const setupId of ["gym-sublet", "teammate-share", "cousin-room"] as const) {
      for (const includeCompletion of [false, true]) {
        for (const includeOptionalWork of [false, true]) {
          for (const depositTaken of [false, true]) {
            for (const flexibleCash of [0, 600, 2100]) {
              plans.push(plan({ setupId, includeCompletion, includeOptionalWork, depositTaken, amounts: { goal: dollars(600), reserve: dollars(400), flexibleCash: dollars(flexibleCash) } }));
            }
          }
        }
      }
    }
    return plans;
  };

  it("never labels a decision as taken on a season where it was not", () => {
    // "Building the plan around the attendance bonus — NO EFFECT — Your plan was already
    // built without it." A heading and its own sentence disagreeing about what the student
    // did. Every label on this panel now names the call that was actually made, so no label
    // can appear on both sides of a decision.
    const bySide = new Map<string, Set<boolean>>();
    for (const final of seasons()) {
      for (const risk of resolveSeason(final, N).risks) {
        const seen = bySide.get(risk.label) ?? new Set<boolean>();
        seen.add(risk.taken);
        bySide.set(risk.label, seen);
      }
    }
    const ambiguous = [...bySide.entries()].filter(([, sides]) => sides.size > 1).map(([label]) => label);
    expect(ambiguous).toEqual([]);
  });

  it("never heads a verdict that went well with a sentence about what it cost", () => {
    for (const final of seasons()) {
      for (const risk of resolveSeason(final, N).risks) {
        if (risk.outcome !== "paid_off" && risk.outcome !== "no_effect") continue;
        const opening = risk.detail.split(". ")[0] ?? "";
        expect(opening, `${risk.id} on ${final.setupId}`).not.toMatch(/paid .*more|cost .*more|never came|did not have enough/);
      }
    }
  });
});

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
    // "1 hours back" is what this said, and this test pinned it. The count is one because
    // the plan bought exactly one hour, which is the case a hard-coded plural gets wrong, so
    // the assertion is now the sentence a student would actually read.
    expect(verdict(partial, "buying-time").detail).toContain("1 hour back");
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

  /**
   * "The bonus never came" is an outcome. "The bonus never came, and this much more in
   * Avery's week would have kept it" is something a student can argue about with the person
   * next to them, and something they can act on the second time through. The amount has to
   * be exact, or the sentence is a figure of speech dressed as a model.
   */
  it("says what it would have taken to keep the bonus, and the amount actually keeps it", () => {
    const missed = plan({
      setupId: "cousin-room",
      includeCompletion: true,
      amounts: { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) },
    });
    const resolution = resolveSeason(missed, N);
    expect(resolution.attendanceHeld).toBe(false);
    expect(verdict(resolution, "attendance-bonus").outcome).toBe("cost_you");
    expect(verdict(resolution, "attendance-bonus").detail).toContain(formatDollars(resolution.load.costToClear));

    // Spend exactly that and the season resolves the other way, so the counterfactual is
    // the model's own answer rather than a sentence written beside it.
    const cleared = resolveSeason({ ...missed, amounts: { ...missed.amounts, flexibleCash: resolution.load.costToClear } }, N);
    expect(cleared.attendanceHeld).toBe(true);

    // And the sentence is not offered on a season the bonus survived.
    expect(verdict(cleared, "attendance-bonus").detail).not.toContain("would have kept it");
  });

  it("writes every amount in a verdict as money rather than as a bare number", () => {
    for (const setupId of ["gym-sublet", "teammate-share", "cousin-room"] as const) {
      for (const includeCompletion of [false, true]) {
        for (const includeOptionalWork of [false, true]) {
          const resolution = resolveSeason(plan({ setupId, includeCompletion, includeOptionalWork }), N);
          for (const risk of resolution.risks) {
            // Every run of digits in a verdict is either an hour count or a price. Take the
            // properly written prices out and anything three digits long that is left is a
            // price that lost its dollar sign — which is how `$800` used to render as `800`.
            const bare = risk.detail.replace(/\$\d{1,3}(,\d{3})*/g, "").match(/\d{3,}/g) ?? [];
            expect(bare, `${setupId}/${includeCompletion}/${includeOptionalWork}: ${risk.id} — ${risk.detail}`).toEqual([]);
          }
        }
      }
    }
  });

  /**
   * The defect this pins is the one a publication gate exists to catch: the deposit verdict
   * used to be `depositTaken ? "paid_off" : "no_effect"`, so reserving won on every season
   * ever played and waiting registered as nothing on every season ever played. A trade-off
   * whose verdict cannot change is a right answer wearing a choice's clothes.
   */
  describe("the course seat is judged by what the season did with the money it tied up", () => {
    const pressure = (shortfall: number, movable: number, courseLineCut = false) => ({
      shortfall: dollars(shortfall),
      movable: dollars(movable),
      courseLineCut,
    });
    const deposit = (over: Parameters<typeof plan>[0], week5: ReturnType<typeof pressure>) =>
      verdict(resolveSeason(plan(over), N, undefined, "attendance bonus", week5), "course-deposit");

    it("reads the same reserved seat two ways on two seasons", () => {
      // Same call, same everything else: the movable lines held Week 5 on one season and did
      // not on the other, and that is the whole difference.
      const absorbed = deposit({ depositTaken: true }, pressure(500, 1900));
      const squeezed = deposit({ depositTaken: true }, pressure(500, 400));
      expect(absorbed.outcome).toBe("paid_off");
      expect(squeezed.outcome).toBe("cost_you");
      expect(absorbed.outcome).not.toBe(squeezed.outcome);
    });

    it("calls a reserved seat costly when the course line had to come down to cover Week 5", () => {
      // Movable money was enough, but the plan paid for Week 5 by cutting what it was saving.
      const cut = deposit({ depositTaken: true }, pressure(500, 1900, true));
      expect(cut.outcome).toBe("cost_you");
      expect(cut.detail).toContain("stopped being money Avery could move");
    });

    it("reads waiting three ways, depending on what the movable money was asked for", () => {
      const covered = deposit({}, pressure(1000, 3100));
      const notEnough = deposit({}, pressure(1000, 400));
      const untested = deposit({}, pressure(0, 3100));
      expect(covered.outcome).toBe("paid_off");
      expect(notEnough.outcome).toBe("fell_short");
      // This used to expect "no effect", and the screen printed that heading directly above a
      // sentence saying Avery had paid the full price rather than the deposit. Waiting is never
      // free: the season that never tests the plan is the one where the extra bought room
      // nobody needed, which is a cost with nothing back — not an absence of one.
      expect(untested.outcome).toBe("cost_you");
      expect(new Set([covered.outcome, notEnough.outcome, untested.outcome]).size).toBe(3);
    });

    /**
     * The invariant behind the fix above, applied to every verdict this world can produce.
     *
     * A student reads the heading before the sentence. A heading that contradicts the money in
     * its own detail line teaches the wrong thing more effectively than no heading at all.
     */
    it("never heads a verdict 'no effect' over a detail that names money changing hands", () => {
      for (const depositTaken of [false, true]) {
        for (const week5 of [pressure(0, 3100), pressure(500, 1900), pressure(1200, 400), pressure(500, 1900, true)]) {
          const read = deposit({ depositTaken }, week5);
          if (read.outcome !== "no_effect") continue;
          expect(read.detail, `${String(depositTaken)} / ${week5.shortfall} of ${week5.movable}`)
            .not.toMatch(/paid .*more|cost .*less|instead of/);
        }
      }
    });

    /**
     * The same rule, one level out: it is not only "no effect" that can contradict its body.
     *
     * A green **Paid off** shipped over *"The course cost the full price rather than the
     * deposit, so Avery paid more"* — the badge and the first thing under it disagreeing about
     * whether the decision went well, on a season where the course also ended unpaid. The
     * premium is real and it is still printed; a verdict that leads with it may not be headed
     * with a win.
     */
    it("never opens a verdict that went well with what the decision cost", () => {
      for (const depositTaken of [false, true]) {
        for (const week5 of [pressure(0, 3100), pressure(500, 1900), pressure(1200, 400), pressure(500, 1900, true)]) {
          const read = deposit({ depositTaken }, week5);
          if (read.outcome !== "paid_off" && read.outcome !== "no_effect") continue;
          const opening = read.detail.split(". ")[0] ?? "";
          expect(opening, `${String(depositTaken)} / ${week5.shortfall} of ${week5.movable}`).not.toMatch(/paid .*more|cost .*more/);
        }
      }
    });

    it("names the price difference on every season, whichever way the call went", () => {
      const premium = formatDollars(N.course.fullPrice - N.course.depositPrice);
      for (const depositTaken of [false, true]) {
        for (const week5 of [pressure(0, 3100), pressure(500, 1900), pressure(1200, 400), pressure(500, 1900, true)]) {
          const read = deposit({ depositTaken }, week5);
          expect(read.detail, `${String(depositTaken)} / ${week5.shortfall} of ${week5.movable}`).toContain(premium);
          expect(read.detail).toContain(formatDollars(N.course.depositPrice));
          expect(read.detail).toContain(formatDollars(N.course.fullPrice));
        }
      }
    });

    it("leaves no verdict on this decision constant across seasons", () => {
      // Read the way the publication gate reads the rest of the model: sweep the space and
      // check that neither answer owns one outcome.
      const seasons = [pressure(0, 3100), pressure(500, 1900), pressure(1200, 400), pressure(500, 1900, true)];
      for (const depositTaken of [false, true]) {
        const outcomes = new Set(seasons.map((week5) => deposit({ depositTaken }, week5).outcome));
        expect(outcomes.size, `depositTaken=${String(depositTaken)}`).toBeGreaterThan(1);
      }
    });
  });

  /**
   * The clinics cost hours whatever else happened. The "cost Avery nothing extra" line this
   * replaces un-said the tiredness the Week 5 screen had just insisted on.
   */
  it("states both the money and the hours on every season the clinics were taken", () => {
    for (const setupId of ["gym-sublet", "teammate-share", "cousin-room"] as const) {
      const resolution = resolveSeason(plan({ setupId, includeCompletion: true, includeOptionalWork: true }), N);
      const clinics = verdict(resolution, "clinics");
      expect(clinics.detail, setupId).toContain(formatDollars(N.optionalWorkIncome));
      expect(clinics.detail, setupId).toContain(`${N.load.clinicBlocks} hours a week`);
      expect(clinics.detail, setupId).not.toContain("nothing extra");
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
