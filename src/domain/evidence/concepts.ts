import { CONCEPTS } from "../blueprint/concepts";
import type { ConceptResult, MasteryStatus, MicroSkillObservation, Trajectory, AssessmentFacts } from "./types";

function laterIndependentC4(facts: AssessmentFacts): boolean {
  return [facts.firstResponse, facts.preview].some((evidence) => evidence?.saved === true && evidence.residual === 0 && evidence.unassigned === 0 && evidence.changedOnlyAdjustable && evidence.support !== "direct_scaffold" && evidence.support !== "answer_supplied");
}

/**
 * Whether one observation shows the skill.
 *
 * A scaffolded observation is capped at 3 by `supportCap`, so a flat "4 or better" bar made
 * `demonstrated_with_support` mathematically unreachable while the educator surface showed
 * it as a first-class band. A student who worked it out after a hint has demonstrated the
 * skill — with support — and the bar has to say so.
 */
function shows(observation: MicroSkillObservation): boolean {
  const points = observation.points ?? 0;
  return observation.supportLevel === "direct_scaffold" ? points >= 3 : points >= 4;
}

function statusFor(observations: MicroSkillObservation[], laterIndependent: boolean): MasteryStatus {
  if (observations.every((observation) => observation.points === null)) return "not_observed";
  const complete = laterIndependent || observations.every(shows);
  if (!complete) return observations.some((observation) => observation.points === 0) ? "not_demonstrated" : "developing";
  const scaffolded = observations.some((observation) => observation.supportLevel === "direct_scaffold");
  return scaffolded && !laterIndependent ? "demonstrated_with_support" : "demonstrated_independently";
}

function trajectoryFor(observations: MicroSkillObservation[], status: MasteryStatus, laterIndependent: boolean): Trajectory {
  if (status === "not_observed") return "insufficient_evidence";
  if (observations.some((observation) => observation.supportLevel === "direct_scaffold")) return "corrected_after_scaffold";
  if (laterIndependent || observations.some((observation) => observation.points === 4)) return "corrected_after_consequence";
  if (status === "developing" || status === "not_demonstrated") return "persistent_gap";
  return "independent_first_opportunity";
}

export function summarizeConcepts(observations: MicroSkillObservation[], facts: AssessmentFacts): ConceptResult[] {
  return CONCEPTS.filter((concept) => concept.id !== "financial-defense").map((concept) => {
    const conceptObservations = observations.filter((observation) => observation.conceptId === concept.id);
    const laterIndependent = concept.id === "contingency" && laterIndependentC4(facts);
    const status = statusFor(conceptObservations, laterIndependent);
    const points = conceptObservations.some((observation) => observation.points === null)
      ? null
      : conceptObservations.reduce((sum, observation) => sum + (observation.points ?? 0), 0);
    const misconceptionTags = concept.id === "contingency" && facts.fallback?.saved && facts.fallback.residual > 0 ? ["partial-fallback"] : [];
    return {
      conceptId: concept.id,
      points,
      maxPoints: concept.weight,
      status,
      trajectory: trajectoryFor(conceptObservations, status, laterIndependent),
      observations: conceptObservations,
      misconceptionTags,
    };
  });
}
