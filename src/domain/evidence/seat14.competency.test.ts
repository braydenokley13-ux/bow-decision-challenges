import { describe, expect, it } from "vitest";
import { observeCompetencies } from "../competency/observe";
import type { CompetencyResult } from "../competency/types";
import { observeBasketballFromLog } from "../scenario/worlds/basketball/observer";
import { deriveResult } from "./result";
import { SEAT_14_REASONING_POINTS, seat14Log } from "./seat14.golden";

/**
 * The golden case, now asserted at both levels.
 *
 * Seat 14 is the gate on the whole competency layer. The concept result has been checked by
 * a person and has not moved since it was written; the competency result is new, and the
 * point of asserting them side by side is that the two have to describe the same student.
 * If the new spine ever disagrees with the scorer that produced the old one, this is where
 * it is caught — not months later, in a claim about a class.
 */

const levelsOf = (result: CompetencyResult | undefined) =>
  Object.fromEntries((result?.levels ?? []).map((row) => [row.evidenceRequirementId, row.level]));

describe("Seat 14, read as competencies", () => {
  const log = seat14Log();
  const observations = observeBasketballFromLog(log);
  const results = observeCompetencies(observations, { submitted: false });
  const byId = new Map(results.map((result) => [result.competencyId, result]));

  it("leaves the concept-level judgement exactly where it was", () => {
    // The acceptance criterion, restated here rather than only next door, because the
    // competency layer is what would break it. Adding a layer must not move a triple a
    // teacher has already been shown.
    const result = deriveResult(log, SEAT_14_REASONING_POINTS);
    const contingency = result.concepts.find((concept) => concept.conceptId === "contingency");
    expect(contingency?.status).toBe("demonstrated_independently");
    expect(contingency?.trajectory).toBe("corrected_after_consequence");
    expect(`${contingency?.points}/${contingency?.maxPoints}`).toBe("17/20");
  });

  it("says this student adapted the plan, and says it from the same evidence", () => {
    // A person reading the run agrees: they mis-added the Week 5 change once and corrected
    // it, then repaired out of adjustable money only, freed the whole shortfall at the
    // first response, and landed a balanced plan. That is demonstrated, and the one 4 is
    // the arithmetic they fixed themselves.
    expect(byId.get("adapt-a-plan")?.state).toBe("demonstrated");
    expect(levelsOf(byId.get("adapt-a-plan"))).toEqual({
      "adapt-a-plan.er1": 4,
      "adapt-a-plan.er2": 5,
      "adapt-a-plan.er3": 5,
      "adapt-a-plan.er4": 5,
      "adapt-a-plan.er5": null,
    });
  });

  it("agrees with the concept result about where the 4 came from", () => {
    // `adaptation` scored 29 of 30 — five micro-skills at 5 and the Week 5 calculation at 4
    // for the corrected attempt. The competency layer has to find that same 4 in that same
    // place, or the two vocabularies are describing different runs.
    const result = deriveResult(log, SEAT_14_REASONING_POINTS);
    const adaptation = result.concepts.find((concept) => concept.conceptId === "adaptation");
    expect(adaptation?.points).toBe(29);
    const corrected = adaptation?.observations.filter((observation) => observation.points === 4);
    expect(corrected?.map((observation) => observation.microSkillId)).toEqual(["C5.1"]);
  });

  it("refuses to call the budget competency anything, because one requirement was never observed", () => {
    // Four of the five things `plan-within-income` asks for are there and strong. The
    // fifth — savings set on purpose rather than as the remainder — is not something this
    // world can see, so it is `null`, and `null` is not a zero and not a pass. Incomplete
    // is the only honest word: no competency result, no objective state, and nothing said
    // about this student that the evidence does not support.
    expect(byId.get("plan-within-income")?.state).toBe("incomplete");
    expect(levelsOf(byId.get("plan-within-income"))).toEqual({
      "plan-within-income.er1": 5,
      "plan-within-income.er2": 5,
      "plan-within-income.er3": null,
      "plan-within-income.er4": 5,
      "plan-within-income.er5": null,
    });
  });

  it("stays incomplete even once a person scores the writing", () => {
    // The missing requirement is a fact about the world, not about the paperwork. Scoring
    // the defense fills ER5 and changes nothing else, which is the proof that ER3 is what
    // is holding this competency back.
    const scored = observeCompetencies(
      observeBasketballFromLog(log, { scoredExplanations: { "plan-within-income.er5": 5 } }),
      { submitted: true },
    );
    const planning = scored.find((result) => result.competencyId === "plan-within-income");
    expect(planning?.state).toBe("incomplete");
    expect(levelsOf(planning)["plan-within-income.er5"]).toBe(5);
    expect(levelsOf(planning)["plan-within-income.er3"]).toBeNull();
  });

  it("says nothing at all about the competencies this world cannot observe", () => {
    // Not "not observed" against every student — nothing. Basketball structurally cannot
    // produce a savings-goal judgement, and that is a fact about Basketball. Writing it on
    // a page about a child would make it look like a fact about the child.
    expect(byId.has("save-toward-a-goal")).toBe(false);
    expect(byId.has("plan-for-the-unexpected")).toBe(false);
    expect([...byId.keys()].sort()).toEqual(["adapt-a-plan", "plan-within-income"]);
  });

  it("stamps every result with the model and rubric it was computed under", () => {
    // An analysis has to be able to exclude mixed versions rather than pool them, and the
    // stamp cannot be backfilled onto evidence that has already been stored.
    for (const result of results) {
      expect(result.competencyModelVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(result.rubricVersion).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("points every judgement back at the events it came from", () => {
    // §19.1: a teacher who disagrees has to be able to see what BOW saw. A judgement with
    // no trail is an assertion.
    for (const observation of observations) {
      expect(observation.evidenceRefs.length, observation.evidenceRequirementId).toBeGreaterThan(0);
      expect(observation.reason.length, observation.evidenceRequirementId).toBeGreaterThan(20);
    }
  });
});
