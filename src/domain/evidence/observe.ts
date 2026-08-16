import type { ConceptId, StructuredMicroSkillId } from "../blueprint/types";
import { STRUCTURED_MICRO_SKILLS } from "../blueprint/microSkills";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import type { ScenarioNumbers } from "../scenario/types";
import { chosenSetupExpectation, essentialsExpectation, reliableFloorExpectation, week5ChangeExpectation } from "../scenario/expectations";
import { dollars } from "../core/money";
import type { AssessmentFacts, MicroSkillObservation, SupportLevel, C4ObservationContext, AlternateStateEvidence } from "./types";
import { scoreOf, type Quality } from "./support";

/**
 * Derived, not restated. This map used to be a third hand-maintained copy of the
 * micro-skill → concept relation alongside `blueprint/concepts.ts` and
 * `blueprint/microSkills.ts`, and nothing checked it against either — a typo here would
 * have filed evidence under the wrong concept and quietly changed a student's status.
 */
const CONCEPT_BY_SKILL: Record<StructuredMicroSkillId, ConceptId> = Object.fromEntries(
  STRUCTURED_MICRO_SKILLS.map((skill) => [skill.id, skill.conceptId]),
) as Record<StructuredMicroSkillId, ConceptId>;

function observation(id: StructuredMicroSkillId, quality: Quality, support: SupportLevel, refs: string[], reason: string, context?: C4ObservationContext): MicroSkillObservation {
  const points = scoreOf(quality, support);
  return {
    microSkillId: id,
    conceptId: CONCEPT_BY_SKILL[id],
    points,
    outcome: points >= 3 ? "demonstrated" : points === 2 ? "partial" : "not_demonstrated",
    supportLevel: support,
    evidenceRefs: refs.length > 0 ? refs : [`derived:${id}`],
    reason,
    ...(context ? { c4ObservationContext: context } : {}),
  };
}

function notObserved(id: StructuredMicroSkillId, reason: string): MicroSkillObservation {
  return { microSkillId: id, conceptId: CONCEPT_BY_SKILL[id], points: null, outcome: "not_observed", supportLevel: "standard_access", evidenceRefs: [`not-observed:${id}`], reason };
}

function calcObservation(id: StructuredMicroSkillId, facts: AssessmentFacts, calcId: keyof AssessmentFacts["calculations"], expected: number | null): MicroSkillObservation {
  const calc = facts.calculations[calcId];
  if (!calc) return notObserved(id, "The calculation checkpoint was not reached.");
  if (expected === null) return notObserved(id, "The scenario has no expected total for this checkpoint yet.");
  const firstCorrectIndex = calc.attempts.findIndex((attempt) => attempt.correct && attempt.value === expected);
  const quality: Quality = calc.supplied ? "none" : firstCorrectIndex === 0 ? "first_opportunity" : firstCorrectIndex > 0 ? "corrected" : "none";
  return observation(id, quality, calc.support, calc.attempts.map((attempt) => attempt.eventRef), quality === "none" ? "The submitted calculation did not reconcile." : "The submitted calculation reconciled with the scenario terms.");
}

function primaryC4(facts: AssessmentFacts): { evidence?: AlternateStateEvidence; context?: C4ObservationContext } {
  const conditional = (facts.opening?.conditionalExposure ?? 0) > 0;
  return conditional
    ? { ...(facts.fallback ? { evidence: facts.fallback } : {}), context: "opening_income_fallback" }
    : { ...(facts.firstResponse ? { evidence: facts.firstResponse } : {}), context: "week5_cost_response" };
}

export function observeStructured(facts: AssessmentFacts, n: ScenarioNumbers = SCENARIO_NUMBERS): MicroSkillObservation[] {
  const observations: MicroSkillObservation[] = [];
  observations.push(calcObservation("C1.1", facts, "reliable-floor", reliableFloorExpectation(n)));
  if (!facts.opening) observations.push(notObserved("C1.2", "The Working Plan was not saved."));
  else if (facts.opening.conditionalExposure === 0) observations.push(observation("C1.2", "first_opportunity", "standard_access", facts.opening.evidenceRefs, "The saved Working Plan counted no conditional income."));
  else {
    const fallback = facts.fallback;
    const quality: Quality = fallback?.saved ? (fallback.savesBeforeAcceptable > 0 ? "corrected" : "first_opportunity") : "none";
    observations.push(observation("C1.2", quality, fallback?.support ?? "standard_access", fallback?.evidenceRefs ?? facts.opening.evidenceRefs, "The Fallback Version shows how selected conditional income was treated."));
  }
  if (!facts.final) observations.push(notObserved("C1.3", "The post-event final state was not saved."));
  else {
    const completionHandled = !facts.final.snapshot.inputs.includeCompletion || (facts.preview?.saved === true && facts.preview.residual === 0 && facts.preview.unassigned === 0);
    observations.push(observation("C1.3", completionHandled ? "first_opportunity" : "partial", facts.preview?.support ?? "standard_access", [...facts.final.evidenceRefs, ...(facts.preview?.evidenceRefs ?? [])], completionHandled ? "Impossible outcome income is absent and remaining income risk is handled." : "The final state retains unresolved completion-payment exposure."));
  }

  // Comparing full cost across time is a comparison, so it is observed as one: the
  // student orders the three places by what they actually cost over eight weeks. It used
  // to be two multiplication drills that gated the screen.
  const ranking = facts.setupRanking;
  if (!ranking) observations.push(notObserved("C2.1", "The places were never ordered by full cost."));
  else observations.push(observation(
    "C2.1",
    ranking.firstCorrect ? "first_opportunity" : ranking.correct ? "corrected" : "none",
    "standard_access",
    ranking.evidenceRefs,
    ranking.correct
      ? "The three places were ordered by what each costs across the whole eight weeks."
      : "The ordering does not match what the places cost across eight weeks.",
  ));
  observations.push(calcObservation("C2.2", facts, "chosen-setup-total", chosenSetupExpectation(n, facts.selectedSetupId)));

  const essentials = calcObservation("C3.1", facts, "essentials-total", essentialsExpectation(n));
  observations.push(facts.opening && essentials.points !== null ? essentials : !facts.opening ? notObserved("C3.1", "The locked-cost plan was not saved.") : essentials);
  if (!facts.opening) {
    observations.push(notObserved("C3.2", "The Working Plan was not saved."), notObserved("C3.3", "The Working Plan was not saved."));
  } else {
    const c32: Quality = facts.opening.firstSaveBalance >= 0 ? "first_opportunity" : facts.opening.balance >= 0 ? "corrected" : "none";
    const c33: Quality = facts.opening.balance === 0 ? (facts.opening.firstSaveBalance === 0 ? "first_opportunity" : "corrected") : "partial";
    observations.push(observation("C3.2", c32, facts.opening.support, facts.opening.evidenceRefs, "Overcommitment is judged at the first saved attempt."));
    observations.push(observation("C3.3", c33, facts.opening.support, facts.opening.evidenceRefs, "Accounting for every dollar is judged from the final saved Working Plan balance."));
  }

  const c4 = primaryC4(facts);
  if (!c4.evidence?.entered) {
    for (const id of ["C4.1", "C4.2", "C4.3", "C4.4"] as const) observations.push(notObserved(id, "The path's primary contingency checkpoint was not reached."));
  } else {
    const e = c4.evidence;
    const corrected = e.savesBeforeAcceptable > 0;
    const firstOrCorrected = (success: boolean): Quality => success ? (corrected ? "corrected" : "first_opportunity") : "none";
    observations.push(observation("C4.1", firstOrCorrected(e.saved && e.amountFreed > 0), e.support, e.evidenceRefs, "A lower-resource state changed actual future amounts.", c4.context));
    // Keeping committed money separate is only demonstrated by a state that was actually
    // saved. This used to award full credit to a student who reached the screen and left,
    // because its two branches tested the same fact as each other.
    observations.push(observation(
      "C4.2",
      e.saved ? (e.lockedMoveAttempts === 0 ? "first_opportunity" : "corrected") : "none",
      e.support,
      e.evidenceRefs,
      e.lockedMoveAttempts === 0
        ? "Committed money was left alone while the future money moved."
        : `Committed money was reached for ${e.lockedMoveAttempts} time(s), then the repair was made from adjustable money.`,
      c4.context,
    ));
    const recognizes = e.saved && e.unassigned === 0 && (e.residual === 0 || e.residualAcknowledged);
    observations.push(observation("C4.3", recognizes ? (corrected ? "corrected" : "first_opportunity") : e.saved ? "partial" : "none", e.support, e.evidenceRefs, "The exact remaining exposure was resolved or acknowledged.", c4.context));
    const workable = e.saved && e.residual === 0 && e.unassigned === 0;
    observations.push(observation("C4.4", workable ? (corrected ? "corrected" : "first_opportunity") : e.saved ? "partial" : "none", e.support, e.evidenceRefs, "Workability is a separate observation from recognizing a residual.", c4.context));
  }

  const week5Expected = week5ChangeExpectation(n, {
    setupId: facts.selectedSetupId,
    countedOutcome: facts.opening?.snapshot.inputs.includeOutcome === true,
  });
  observations.push(calcObservation("C5.1", facts, "week5-change", week5Expected));
  if (!facts.final) observations.push(notObserved("C5.2", "The final repair was not saved."));
  else observations.push(observation("C5.2", facts.final.lockedMoveAttempts === 0 ? "first_opportunity" : "corrected", facts.final.support, facts.final.evidenceRefs, "Locked-move attempts during final repair are observed separately from contingency attempts."));
  if (facts.applicableGapTiles.length === 0) observations.push(notObserved("C5.3", "The Week 5 component strip was not reached."));
  else {
    const complete = facts.applicableGapTiles.every((tile) => facts.selectedGapTiles.includes(tile)) && facts.selectedGapTiles.every((tile) => facts.applicableGapTiles.includes(tile));
    observations.push(observation("C5.3", complete ? "first_opportunity" : "partial", "standard_access", facts.selectedGapTiles.map((tile) => `gap-tile:${tile}`), "Component selection is scored separately from the numerical total."));
  }
  if (!facts.final) observations.push(notObserved("C5.4", "The final plan was not submitted."));
  else observations.push(observation("C5.4", facts.final.balance === 0 ? "first_opportunity" : facts.final.acknowledgedResidual ? "partial" : "none", facts.final.support, facts.final.evidenceRefs, "Final viability is the financial state at submission."));
  // C5.5 asks what the student did about money that might not arrive. Its two branches must
  // rest on different evidence from each other and from C5.4 — the exclusion branch used to
  // reuse C5.4's own predicate verbatim, so declining the bonus granted a free micro-skill.
  if (!facts.final) observations.push(notObserved("C5.5", "The completion-payment decision was not finalized."));
  else if (!facts.completionDecision) {
    observations.push(notObserved("C5.5", "No decision about the remaining conditional payment was recorded."));
  } else if (!facts.final.snapshot.inputs.includeCompletion) {
    // Excluding it is a real answer, but only when it was a decision taken before the plan
    // was landed rather than a default the student never touched.
    const deliberate = facts.finalPlanSequence !== undefined && facts.completionDecision.sequence < facts.finalPlanSequence;
    observations.push(observation(
      "C5.5",
      deliberate ? "first_opportunity" : "partial",
      "standard_access",
      [facts.completionDecision.evidenceRef, ...facts.final.evidenceRefs],
      deliberate
        ? "The conditional payment was deliberately left out before the final plan was landed."
        : "The plan excludes the conditional payment, but no decision preceded the final save.",
    ));
  } else {
    observations.push(observation(
      "C5.5",
      facts.preview?.saved && facts.preview.residual === 0 && facts.preview.unassigned === 0 ? "first_opportunity" : facts.preview?.saved ? "partial" : "none",
      facts.preview?.support ?? "standard_access",
      facts.preview?.evidenceRefs ?? facts.final.evidenceRefs,
      "The no-bonus preview is independent of the balanced final plan.",
    ));
  }
  // C5.6 is observed at the Week 5 first response — before any new money is offered —
  // so it measures a behaviour the final plan cannot reveal: whether the student put
  // their own resources to work against the shortfall they had just calculated.
  // Scoring compares money actually freed against the most that could have been freed,
  // so a student facing an unfixable shortfall is still credited for a full response.
  const response = facts.firstResponse;
  if (!response?.saved) observations.push(notObserved("C5.6", "No Week 5 first response was saved."));
  else {
    const full = response.amountFreed >= response.absorbTarget;
    const quality: Quality = response.absorbTarget === 0
      ? "first_opportunity"
      : full
        ? (response.savesBeforeAcceptable > 0 ? "corrected" : "first_opportunity")
        : response.amountFreed > 0 ? "partial" : "none";
    observations.push(observation(
      "C5.6",
      quality,
      response.support,
      response.evidenceRefs,
      response.absorbTarget === 0
        ? "There was no shortfall to absorb at the first response."
        : `The first response freed ${response.amountFreed} of the ${response.absorbTarget} that could be freed from existing resources.`,
    ));
  }
  return observations;
}

export const zero = dollars(0);
