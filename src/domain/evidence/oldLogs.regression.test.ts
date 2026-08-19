import { describe, expect, it } from "vitest";
import preRework from "./fixtures/preReworkBasketballRuns.json";
import { observeBasketballFromLog } from "../scenario/worlds/basketball/observer";
import { deriveFacts } from "./facts";
import { observeStructured } from "./observe";
import { runChallenge, type RunOptions } from "../../test/runChallenge";
import type { EvidenceEvent } from "./types";
import { PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";

/**
 * Attempts finished before the Week 5 rework must still mean exactly what they meant.
 *
 * The fixture beside this file is three complete runs captured from the real reducer *before*
 * the rework: three logs, and every micro-skill and every evidence-requirement observation
 * those logs produced. Nothing in it was typed by hand, and nothing in it can be regenerated
 * from the current code — which is the whole point. If a change to the world, the facts or
 * either observer would re-read a finished attempt differently, this fails, and a student's
 * permanent record is what would otherwise have moved.
 *
 * It matters most for the Week 5 card set. That screen now offers cards Week 5 does not move
 * — rent, the weekly basics, a seat already reserved, a bonus the student left out — so a
 * student who taps one has selected a component that is not part of the change. The rule that
 * reads it is the rule that was always there: the selected set has to match the applicable set
 * exactly, in both directions. A log written when no such card existed contains none of them,
 * and scores as it always did. A decoy is a stricter read of a *new* run, never a re-reading
 * of an old one.
 */
describe("logs written before the Week 5 rework observe exactly as they did", () => {
  it("captured runs from a version of the world that no longer exists", () => {
    // A fixture that quietly became a fresh capture would pass this file every time while
    // testing nothing. It is old if it says it is older than what ships now.
    expect(preRework.length).toBeGreaterThanOrEqual(3);
    for (const run of preRework) {
      expect(run.log.length).toBeGreaterThan(20);
      expect(run.log[0]!.challengeVersion).not.toBe(PLAN_UNDER_PRESSURE.version);
    }
  });

  it.each(preRework.map((run) => [run.name, run] as const))(
    "scores every micro-skill of the %s run exactly as it was scored then",
    (_name, run) => {
      const log = run.log as unknown as EvidenceEvent[];
      const observed = observeStructured(deriveFacts([...log])).map((observation) => ({
        id: observation.microSkillId,
        points: observation.points,
        outcome: observation.outcome,
        support: observation.supportLevel,
      }));
      expect(observed).toEqual(run.microSkills);
    },
  );

  it.each(preRework.map((run) => [run.name, run] as const))(
    "reads every evidence requirement of the %s run exactly as it read then",
    (_name, run) => {
      const log = run.log as unknown as EvidenceEvent[];
      const observed = observeBasketballFromLog(log).map((observation) => ({
        id: observation.evidenceRequirementId,
        level: observation.level,
        support: observation.supportLevel,
      }));
      expect(observed).toEqual(run.requirements);
    },
  );

  /**
   * The other half of the same claim: a run driven through today's reducer with the same
   * options produces the same observations as the captured one. The screens changed; the
   * events, the facts and what they mean did not.
   */
  it.each(preRework.map((run) => [run.name, run] as const))(
    "produces the same observations for the %s run when it is driven again today",
    (_name, run) => {
      const state = runChallenge(run.options as RunOptions);
      const observed = observeStructured(deriveFacts([...state.log])).map((observation) => ({
        id: observation.microSkillId,
        points: observation.points,
        outcome: observation.outcome,
        support: observation.supportLevel,
      }));
      expect(observed).toEqual(run.microSkills);
    },
  );
});

/**
 * And the stricter read the decoys make possible, on a run that could only have been produced
 * after them. Nothing new is recorded to get it: a card that is not part of the change is a
 * `GAP_TILE_TOGGLED` like any other, and component selection has always been scored as the
 * selected set against the applicable one.
 */
describe("a card Week 5 did not move counts as an incomplete selection", () => {
  const facts = (extraTiles: readonly string[]) => {
    const state = runChallenge({ seatCode: "11", setupId: "cousin-room" });
    const log = [...state.log];
    // The same event the screen writes, appended the way the reducer would.
    for (const tileId of extraTiles) {
      const last = log.at(-1)!;
      log.push({ ...last, id: `event-${log.length + 1}`, sequence: log.length + 1, type: "GAP_TILE_TOGGLED", payload: { tileId, selected: true } });
    }
    return deriveFacts(log);
  };

  it("scores the same run as complete without a decoy and partial with one", () => {
    const clean = observeStructured(facts([])).find((observation) => observation.microSkillId === "C5.3")!;
    const withDecoy = observeStructured(facts(["decoy-rent"])).find((observation) => observation.microSkillId === "C5.3")!;
    expect(clean.outcome).toBe("demonstrated");
    expect(withDecoy.outcome).toBe("partial");
    expect(withDecoy.points).toBeLessThan(clean.points!);
  });

  it("leaves the applicable set alone, so the total the student types is unchanged", () => {
    // The decoy is a selection, never a component of the change. The calculation the world
    // expects is the one it always expected.
    expect(facts(["decoy-rent", "decoy-essentials"]).applicableGapTiles).toEqual(facts([]).applicableGapTiles);
  });
});
