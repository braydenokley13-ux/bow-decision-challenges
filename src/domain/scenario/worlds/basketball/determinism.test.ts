import { describe, expect, it } from "vitest";
import { observeCompetencies } from "../../../competency/observe";
import { runChallenge, type RunOptions } from "../../../../test/runChallenge";
import { week5Change } from "../../../finance/formulas";
import { deriveFacts } from "../../../evidence/facts";
import { SCENARIO_NUMBERS as N } from "../../numbers";
import { observeBasketballFromLog } from "./observer";
import type { SetupId } from "../../../core/ids";

/**
 * The same decisions, the same season, every time.
 *
 * §10.1: decision evidence is derived by deterministic rules from the event log — no AI, no
 * heuristics, no scoring model. `worlds/food-truck/determinism.test.ts` has held the market to
 * that since the market existed. Plan Under Pressure, the world every district will actually
 * see on 28 August, had no such file: nothing in the repository would have failed if Avery's
 * season had started depending on the clock, on the order two pure helpers were called in, or
 * on anything else outside the student's own choices.
 *
 * The failure that guards against is not a crash either. It is two children who made the same
 * decisions being told different things about themselves, and no honest way to explain to
 * either of them why. A world whose evidence is not reproducible cannot be marked, cannot be
 * appealed, and cannot be compared with the other world — which is the whole thesis.
 */

/**
 * Runs that between them touch every branch the harness has: each of the three rooms, both
 * conditional payments, the fallback board that counting one opens, the deposit, the clinics,
 * a savings row set by hand and one left to take the leftovers, and a Week 3 settled three
 * different ways.
 */
const OPTION_SETS: readonly RunOptions[] = [
  {},
  { setupId: "gym-sublet", takeClinics: true, reserveSeat: true, closeOpeningInto: "goal" },
  { setupId: "teammate-share", countCompletion: true, countOutcome: true, split: { goal: 0.6, reserve: 0.2 } },
  { countOutcome: true, countCompletionFinal: true, week3Funded: ["new-shoes"], week3Reason: "only-wanted" },
  { setupId: "gym-sublet", split: { goal: 0, reserve: 1 }, week3Funded: [], closeOpeningInto: "reserve" },
];

const label = (options: RunOptions, index: number) => `${index}: ${JSON.stringify(options)}`;

describe("the same actions produce the same season", () => {
  it.each(OPTION_SETS.map((options, index) => [label(options, index), options] as const))(
    "writes an identical log twice for run %s",
    (_label, options) => {
      const first = runChallenge(options);
      const second = runChallenge(options);
      expect(second.log).toEqual(first.log);
      expect(second.stage).toBe(first.stage);
      expect(second.snapshots).toEqual(first.snapshots);
    },
  );

  it("is not merely repeating a cached answer — different decisions give different logs", () => {
    // A determinism test that would also pass for a function returning a constant proves
    // nothing. These two runs differ in one decision and the season answers differently.
    const cheapRoom = runChallenge({ setupId: "gym-sublet" });
    const farRoom = runChallenge({ setupId: "cousin-room" });
    expect(farRoom.log).not.toEqual(cheapRoom.log);
    expect(farRoom.snapshots).not.toEqual(cheapRoom.snapshots);
  });

  it("observes the same evidence from the same log, however many times it is read", () => {
    for (const options of OPTION_SETS) {
      const log = runChallenge(options).log;
      expect(observeBasketballFromLog(log)).toEqual(observeBasketballFromLog(log));
      expect(observeCompetencies(observeBasketballFromLog(log)))
        .toEqual(observeCompetencies(observeBasketballFromLog(log)));
    }
  });

  it("observes the same evidence from two logs of the same run", () => {
    // The stronger version: not the same log read twice, but two runs of the same decisions.
    for (const options of OPTION_SETS) {
      expect(observeBasketballFromLog(runChallenge(options).log))
        .toEqual(observeBasketballFromLog(runChallenge(options).log));
    }
  });

  it("does not depend on the clock the actions arrived on", () => {
    // Ordering comes from `sequence`, never from the timestamp. A student who took an hour
    // over the plan and one who took four minutes made the same decisions and are owed the
    // same reading of them — and this is the assertion that would catch a scorer that started
    // measuring how long a child sat looking at a board.
    //
    // Two clocks are stripped rather than the market's one. This world's reducer stores the
    // dispatched action as the event payload, and the action carries the `at` it was stamped
    // with, so the wall clock appears twice in every basketball event — once as `timestamp`
    // and once as `payload.at`. That is a duplication in the log's shape rather than anything
    // the assessment reads (the observation assertions below are made on the untouched logs),
    // but a test that stripped only `timestamp` would be comparing the clock to itself and
    // failing for a reason that has nothing to do with determinism.
    const withoutClock = (log: readonly { timestamp: number; payload: unknown }[]) =>
      log.map((event) => {
        const payload = { ...((event.payload ?? {}) as Record<string, unknown>) };
        delete payload.at;
        return { ...event, timestamp: 0, payload };
      });
    for (const options of OPTION_SETS) {
      const quick = runChallenge({ ...options, startedAt: 1_600_000_000_000 });
      const slow = runChallenge({ ...options, startedAt: 1_900_000_000_123 });
      expect(withoutClock(slow.log)).toEqual(withoutClock(quick.log));
      expect(observeBasketballFromLog(slow.log)).toEqual(observeBasketballFromLog(quick.log));
      expect(observeCompetencies(observeBasketballFromLog(slow.log)))
        .toEqual(observeCompetencies(observeBasketballFromLog(quick.log)));
    }
  });

  it("derives the same facts from a log whenever it is re-read", () => {
    // The layer between the two: an observer is only reproducible if what it reads is. This is
    // the module a re-scored old attempt goes through, so a drift here would change what a
    // finished season means months after the child stopped being able to say anything about it.
    for (const options of OPTION_SETS) {
      const log = [...runChallenge(options).log];
      expect(deriveFacts([...log], N)).toEqual(deriveFacts([...log], N));
    }
  });

  it("resolves Week 5 from the room and the counted payments, and nothing else", () => {
    for (const setupId of Object.keys(N.setupCosts) as SetupId[]) {
      for (const includeOutcome of [false, true]) {
        const once = week5Change({ includeOutcome, setupId }, N);
        const again = week5Change({ includeOutcome, setupId }, N);
        expect(again).toBe(once);
        expect(Number.isFinite(once), `Week 5 produced ${String(once)} for ${setupId}`).toBe(true);
      }
    }
    // And it genuinely varies with them, so "the same twice" is not the same as "always this".
    expect(week5Change({ includeOutcome: true, setupId: "cousin-room" }, N))
      .not.toBe(week5Change({ includeOutcome: false, setupId: "cousin-room" }, N));
  });
});
