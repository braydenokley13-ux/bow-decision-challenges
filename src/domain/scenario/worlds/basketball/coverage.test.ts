import { describe, expect, it } from "vitest";
import { STRUCTURED_MICRO_SKILLS } from "../../../blueprint/microSkills";
import { BUILT_WORLD_COVERAGE } from "../../../competency/availability";
import { competencyById, evidenceRequirementById } from "../../../competency/competencies";
import { observeCompetencies } from "../../../competency/observe";
import type { CompetencyId, EvidenceRequirementId } from "../../../competency/types";
import { seat14Log } from "../../../evidence/seat14.golden";
import {
  AWAITING_EVIDENCE_REQUIREMENTS,
  BASKETBALL_EVIDENCE_ROUTES,
  CONTINGENCY_MICRO_SKILLS,
  observeBasketballFromLog,
} from "./observer";

/**
 * What Basketball is allowed to claim.
 *
 * `BUILT_WORLD_COVERAGE` is the sentence a district eventually reads as "BOW can assess
 * this." It is written by hand, one file away, in a layer that cannot see this world — so
 * nothing but this test connects the claim to the thing that would have to produce it. A
 * coverage row nothing observes is the exact failure the availability layer exists to
 * prevent, and it is invisible from either side alone.
 */

const routed = new Set(
  BASKETBALL_EVIDENCE_ROUTES
    .filter((route) => route.via !== "not-produced")
    .map((route) => route.evidenceRequirementId),
);

const competenciesExamined = [...new Set(
  BASKETBALL_EVIDENCE_ROUTES.flatMap((route) => {
    const requirement = evidenceRequirementById(route.evidenceRequirementId);
    return requirement ? [requirement.competencyId] : [];
  }),
)];

const basketballClaims = BUILT_WORLD_COVERAGE.filter((claim) => claim.worldId === "basketball");

describe("Basketball's coverage claim is backed by its observer", () => {
  it("claims nothing it has no route for", () => {
    expect(basketballClaims.length).toBeGreaterThan(0);
    for (const claim of basketballClaims) {
      for (const id of claim.producedEvidenceRequirementIds) {
        expect(routed.has(id), `coverage claims ${id} and no route produces it`).toBe(true);
      }
    }
  });

  it("claims everything it does have a route for", () => {
    // The other direction. A route that produces evidence nobody recorded as coverage
    // understates the product — an objective reads "coming" when it is not.
    const claimed = new Set(basketballClaims.flatMap((claim) => claim.producedEvidenceRequirementIds));
    for (const id of routed) {
      expect(claimed.has(id), `${id} is observed and is missing from the coverage table`).toBe(true);
    }
  });

  it("accounts for every requirement of every competency it names", () => {
    // A missing row is an oversight; a `not-produced` row is a decision. This is what keeps
    // the difference visible when somebody adds a requirement to a competency later.
    for (const competencyId of competenciesExamined) {
      for (const requirement of competencyById(competencyId).evidenceRequirements) {
        const route = BASKETBALL_EVIDENCE_ROUTES.find((entry) => entry.evidenceRequirementId === requirement.id);
        expect(route, `${requirement.id} has no row in the route table`).toBeDefined();
        expect(route?.note.length, requirement.id).toBeGreaterThan(40);
      }
    }
  });

  it("routes only through micro-skills that exist", () => {
    const known = new Set(STRUCTURED_MICRO_SKILLS.map((skill) => skill.id));
    for (const route of BASKETBALL_EVIDENCE_ROUTES) {
      if (route.via !== "micro-skills") continue;
      expect(route.microSkillIds.length, route.evidenceRequirementId).toBeGreaterThan(0);
      for (const id of route.microSkillIds) expect(known, route.evidenceRequirementId).toContain(id);
    }
  });

  it("never machine-scores a written requirement, and never asks a person to score a decision", () => {
    // §10.1: every requirement is decision evidence or explanation evidence, never both.
    // §10.6: BOW must never infer a level for student writing.
    for (const route of BASKETBALL_EVIDENCE_ROUTES) {
      const requirement = evidenceRequirementById(route.evidenceRequirementId);
      if (!requirement || route.via === "not-produced") continue;
      expect(route.via === "written-defense" ? "explanation" : "decision", route.evidenceRequirementId)
        .toBe(requirement.kind);
    }
  });

  it("emits an observation for every route and nothing for the rest", () => {
    const observations = observeBasketballFromLog(seat14Log());
    expect(new Set(observations.map((observation) => observation.evidenceRequirementId))).toEqual(routed);
  });

  it("keeps the competency the coverage table leaves out out of the observations too", () => {
    // `plan-within-income` is four fifths produced, so it is recorded as a partial route and
    // is not available. The observations still carry those four — the evidence trail shows
    // what the student did even where the competency cannot be claimed.
    const claimed = basketballClaims.map((claim) => claim.competencyId).sort();
    expect(claimed).toEqual(["adapt-a-plan", "plan-within-income", "sort-by-need-want-goal"]);
    const results = observeCompetencies(observeBasketballFromLog(seat14Log()));
    expect(results.map((result) => result.competencyId).sort()).toEqual(claimed);
  });
});

describe("the competencies Basketball cannot record yet", () => {
  it("names them rather than leaving them out", () => {
    expect(AWAITING_EVIDENCE_REQUIREMENTS).toContain("plan-for-the-unexpected");
    expect(CONTINGENCY_MICRO_SKILLS).toEqual(["C4.1", "C4.2", "C4.3", "C4.4"]);
  });

  it.each(AWAITING_EVIDENCE_REQUIREMENTS)("fails the moment somebody writes %s's requirements", (competencyId: CompetencyId) => {
    // Deliberately a tripwire, and its instructions have been corrected once. They used to say
    // "route them in observer.ts, add the coverage row, and delete the entry," on the strength
    // of a claim that C4.1–C4.4 are exactly this competency. They are not, for the students who
    // planned on safe cash only: `reducer.ts` sends a working plan to `fallback-version` only
    // when conditional income was counted, so `primaryC4` scores everyone else from the Week 5
    // repair instead. Following the old instruction would have published advance protection
    // measured from a repair — the class of over-claim `availability.ts` exists to prevent.
    //
    // When this fails, the requirements exist. Before routing anything: check that whatever
    // carries them is reached by **every** student in this world, and that the same is true of
    // the market, because §9.1 says the story a student picks does not change what is measured
    // and this world's sibling produces its cushion unconditionally. `observer.ts` names the
    // candidate — the reserve line and the Week 5 cost — and names what a rubric over it may
    // not do.
    const competency = competencyById(competencyId);
    expect(
      competency.evidenceRequirements,
      `${competencyId} now has evidence requirements — route it in observer.ts`,
    ).toEqual([]);
  });

  it("never routes a requirement that does not exist", () => {
    // The route table is typed against a template literal, so an id for a competency whose
    // requirements are unwritten compiles perfectly and names nothing.
    for (const route of BASKETBALL_EVIDENCE_ROUTES) {
      const id: EvidenceRequirementId = route.evidenceRequirementId;
      expect(evidenceRequirementById(id), `${id} names no requirement`).toBeDefined();
    }
  });
});
