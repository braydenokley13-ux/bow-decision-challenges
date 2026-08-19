import { describe, expect, it } from "vitest";
import { BUILT_WORLD_COVERAGE } from "../../../competency/availability";
import { competencyById, evidenceRequirementById, requiredEvidenceRequirementsFor } from "../../../competency/competencies";
import { observeCompetencies } from "../../../competency/observe";
import type { CompetencyId, EvidenceRequirementId } from "../../../competency/types";
import { EVIDENCE_EVENT_TYPES } from "../../../evidence/types";
import { runPopUp, buildPopUpSubmission } from "../../../../test/runPopUp";
import { REASONING_CRITERIA, type ReasoningScores } from "../../../blueprint/reasoning";
import { popUpEvidenceRequirementsForEvent } from "./eventEvidence";
import { POP_UP_COVERAGE, POP_UP_NOT_PRODUCED } from "./coverage";
import { POP_UP_EVIDENCE_ROUTES, observePopUpFromLog } from "./observer";
import { popUpScoredExplanationsFrom } from "./writtenAnswer";

/**
 * What Run the Pop-Up is allowed to claim, checked against what it can actually produce.
 *
 * `BUILT_WORLD_COVERAGE` is the sentence a district eventually reads as "BOW can assess this."
 * It is written by hand, one layer away, in a file that cannot see this world — so nothing but
 * this test connects the claim to the thing that would have to produce it. A coverage row
 * nothing observes is the exact failure the availability layer exists to prevent, and it is
 * invisible from either side alone.
 *
 * The runs below drive the world's own reducer through its own screens. Nothing here reads a
 * hand-written log.
 */

const ROUTED = new Set(
  POP_UP_EVIDENCE_ROUTES.filter((route) => route.via !== "not-produced").map((route) => route.evidenceRequirementId),
);

const EXAMINED = [...new Set(
  POP_UP_EVIDENCE_ROUTES.flatMap((route) => {
    const requirement = evidenceRequirementById(route.evidenceRequirementId);
    return requirement ? [requirement.competencyId] : [];
  }),
)];

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

describe("Run the Pop-Up's coverage claim is backed by its observer", () => {
  it("claims nothing it has no route for", () => {
    expect(POP_UP_COVERAGE.length).toBeGreaterThan(0);
    for (const claim of POP_UP_COVERAGE) {
      for (const id of claim.producedEvidenceRequirementIds) {
        expect(ROUTED.has(id), `coverage claims ${id} and no route produces it`).toBe(true);
      }
    }
  });

  it("claims everything it does have a route for", () => {
    // The other direction. A route that produces evidence nobody recorded as coverage
    // understates the product — an objective reads "coming" when it is not.
    const claimed = new Set(POP_UP_COVERAGE.flatMap((claim) => claim.producedEvidenceRequirementIds));
    for (const id of ROUTED) {
      expect(claimed.has(id), `${id} is observed and is missing from the coverage table`).toBe(true);
    }
  });

  it("accounts for every requirement of every competency it names", () => {
    // A missing row is an oversight; a `not-produced` row is a decision. This keeps the
    // difference visible when somebody adds a requirement to a competency later.
    for (const competencyId of EXAMINED) {
      for (const requirement of competencyById(competencyId).evidenceRequirements) {
        const route = POP_UP_EVIDENCE_ROUTES.find((entry) => entry.evidenceRequirementId === requirement.id);
        expect(route, `${requirement.id} has no row in the route table`).toBeDefined();
        expect(route?.note.length, requirement.id).toBeGreaterThan(40);
      }
    }
  });

  it("never routes a requirement that does not exist", () => {
    for (const route of POP_UP_EVIDENCE_ROUTES) {
      const id: EvidenceRequirementId = route.evidenceRequirementId;
      expect(evidenceRequirementById(id), `${id} names no requirement`).toBeDefined();
    }
  });

  it("never machine-scores a written requirement, and never asks a person to score a decision", () => {
    // §10.1: every requirement is decision evidence or explanation evidence, never both.
    // §10.6: BOW must never infer a level for student writing.
    for (const route of POP_UP_EVIDENCE_ROUTES) {
      const requirement = evidenceRequirementById(route.evidenceRequirementId);
      if (!requirement || route.via === "not-produced") continue;
      expect(route.via === "written-answer" ? "explanation" : "decision", route.evidenceRequirementId).toBe(requirement.kind);
    }
  });

  it("emits an observation for every route and nothing for the rest", () => {
    const observations = observePopUpFromLog(runPopUp().log);
    expect(new Set(observations.map((observation) => observation.evidenceRequirementId))).toEqual(ROUTED);
  });

  it("produces a real level for every required requirement of plan-within-income", () => {
    // CP8 acceptance 1, driven through the machine rather than asserted about the table.
    const log = runPopUp().log;
    const observations = observePopUpFromLog(log, { scoredExplanations: popUpScoredExplanationsFrom(READ_AND_STRONG)! });
    for (const requirement of requiredEvidenceRequirementsFor("plan-within-income")) {
      const observed = observations.find((entry) => entry.evidenceRequirementId === requirement.id);
      expect(observed, requirement.id).toBeDefined();
      expect(observed?.level, `${requirement.id} produced no level from a complete run`).not.toBeNull();
    }
  });

  it("produces a real level for every required requirement of adapt-a-plan", () => {
    const observations = observePopUpFromLog(runPopUp().log);
    for (const requirement of requiredEvidenceRequirementsFor("adapt-a-plan")) {
      const observed = observations.find((entry) => entry.evidenceRequirementId === requirement.id);
      expect(observed?.level, `${requirement.id} produced no level from a complete run`).not.toBeNull();
    }
  });

  it("rolls a complete run up to all three competencies", () => {
    const results = observeCompetencies(
      observePopUpFromLog(runPopUp().log, { scoredExplanations: popUpScoredExplanationsFrom(READ_AND_STRONG)! }));
    expect(results.map((result) => result.competencyId).sort())
      .toEqual(["adapt-a-plan", "plan-within-income", "sort-by-need-want-goal"]);
    expect(results.find((result) => result.competencyId === "plan-within-income")?.state).toBe("demonstrated");
  });

  it("says not-observed, never zero, for the opportunities a run never reached", () => {
    // The sentinel. A student who stopped after the third Saturday never met the generator, so
    // every `adapt-a-plan` requirement is an absence rather than a failure — and the written
    // answer nobody read is an absence too.
    const stopped = runPopUp({ stopAfterSaturdayThree: true });
    const observations = observePopUpFromLog(stopped.log);
    for (const requirement of requiredEvidenceRequirementsFor("adapt-a-plan")) {
      const observed = observations.find((entry) => entry.evidenceRequirementId === requirement.id);
      expect(observed?.level, `${requirement.id} scored a level from a run that never met the generator`).toBeNull();
    }
    const rolled = observeCompetencies(observations);
    expect(rolled.find((result) => result.competencyId === "adapt-a-plan")?.state).toBe("not-observed");
    // And the opening plan it did reach is still real evidence.
    expect(observations.find((entry) => entry.evidenceRequirementId === "plan-within-income.er4")?.level).toBe(5);
  });

  it("cites an event of the student's own for every level it publishes", () => {
    const built = buildPopUpSubmission({});
    const ids = new Set(built.log.map((event) => event.id));
    for (const entry of observePopUpFromLog(built.log, { scoredExplanations: popUpScoredExplanationsFrom(READ_AND_STRONG)! })) {
      if (entry.level === null) continue;
      expect(entry.evidenceRefs.some((ref) => ids.has(ref)), entry.evidenceRequirementId).toBe(true);
    }
  });

  it("tags only moments that have a production route behind them", () => {
    // A tag naming a requirement nothing observes would put a line in the §19.2 evidence
    // timeline with no judgement behind it and no way to reach one.
    for (const event of runPopUp().log) {
      for (const id of event.evidenceRequirementIds) {
        expect(evidenceRequirementById(id), `${event.type} tags ${id}`).toBeDefined();
        expect(ROUTED.has(id), `${event.type} tags ${id}, which nothing observes`).toBe(true);
      }
      const derived = new Set(event.evidenceRequirementIds.map((id) => evidenceRequirementById(id)?.competencyId));
      expect(new Set(event.competencyIds)).toEqual(derived);
    }
  });

  it("keeps preferences out of the evidence entirely", () => {
    // Which booth, how many trays, and whether Marisol works the window are the decisions this
    // world is made of and it judges none of them. A tag on one would be the first step to a
    // level on one.
    for (const type of ["POPUP_SPOT_SELECTED", "POPUP_STOCK_ORDERED", "POPUP_HELPER_DECIDED", "POPUP_SATURDAY_PLAYED"] as const) {
      expect(popUpEvidenceRequirementsForEvent(type, { saturday: 1, spotId: "back-lane" }), type).toEqual([]);
    }
  });

  it("writes only event types the data doctrine allows", () => {
    const allowed = new Set<string>(EVIDENCE_EVENT_TYPES);
    for (const event of runPopUp().log) expect(allowed, event.type).toContain(event.type);
  });

  it("stamps the shared envelope on everything it writes", () => {
    for (const event of runPopUp().log) {
      expect(event.worldId).toBe("food-truck");
      expect(event.challengeId.length).toBeGreaterThan(0);
      expect(event.challengeVersion.length).toBeGreaterThan(0);
      expect(typeof event.timestamp).toBe("number");
      expect(Array.isArray(event.conceptIds)).toBe(true);
    }
    const log = runPopUp().log;
    expect(log.map((event) => event.sequence)).toEqual(log.map((_, index) => index + 1));
  });
});

describe("the competencies Run the Pop-Up does not produce", () => {
  it("names them, and why, rather than leaving them out", () => {
    expect(POP_UP_NOT_PRODUCED.map((entry) => entry.competencyId).sort()).toEqual(["plan-for-the-unexpected", "save-toward-a-goal"]);
    for (const entry of POP_UP_NOT_PRODUCED) expect(entry.because.length, entry.competencyId).toBeGreaterThan(60);
  });

  it("says nothing at all about save-toward-a-goal from a complete run", () => {
    const spokenTo = new Set(observePopUpFromLog(runPopUp().log).map((entry) => entry.evidenceRequirementId.split(".")[0]));
    expect(spokenTo.has("save-toward-a-goal")).toBe(false);
    const routes = POP_UP_EVIDENCE_ROUTES.filter((route) => route.evidenceRequirementId.startsWith("save-toward-a-goal."));
    expect(routes).toHaveLength(5);
    expect(routes.every((route) => route.via === "not-produced")).toBe(true);
  });

  it("leaves the same gap Basketball leaves, which is what keeps the two comparable", () => {
    // §9.1 is the claim that the story a student picks does not change what is measured, and
    // it holds across the whole table again.
    //
    // It briefly did not. Basketball's Week 3 gave `sort-by-need-want-goal` its first beat —
    // three claims on one week's cash, the student saying which ones get it and what made them
    // leave the rest out — and for the length of one branch a choose-your-world class assessed
    // that competency for half the room. The market's answer is the tips jar after the first
    // Saturday: the same `COMPETING_CLAIMS_SETTLED` event, the same four reason ids from
    // `core/ids.ts`, the same three reads, three claims of its own and not one line of shared
    // implementation. Which is exactly what those ids were named for the situation rather than
    // for a season to allow.
    const forWorld = (worldId: string) =>
      BUILT_WORLD_COVERAGE.filter((claim) => claim.worldId === worldId)
        .map((claim) => `${claim.competencyId}:${[...claim.producedEvidenceRequirementIds].sort().join(",")}`)
        .sort();
    expect(forWorld("food-truck")).toEqual(forWorld("basketball"));
  });

  it.each(POP_UP_NOT_PRODUCED.filter((entry) => entry.competencyId === "plan-for-the-unexpected").map((entry) => entry.competencyId))(
    "fails the moment somebody writes %s's requirements",
    (competencyId: CompetencyId) => {
      // Deliberately a tripwire, the same one Basketball carries. This world produces the
      // evidence — the cushion is a plan built before knowing what will go wrong, and the
      // generator is the thing that goes wrong — and nobody has written what would count.
      expect(competencyById(competencyId).evidenceRequirements, `${competencyId} now has requirements — route it in observer.ts`).toEqual([]);
    },
  );
});
