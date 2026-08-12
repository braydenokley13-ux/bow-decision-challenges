import type { ConceptId, StructuredMicroSkillId } from "../blueprint/types";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import { dollars } from "../core/money";
import type { AssessmentFacts, MicroSkillObservation, SupportLevel, C4ObservationContext, AlternateStateEvidence } from "./types";
import { scoreOf, type Quality } from "./support";

const CONCEPT_BY_SKILL: Record<StructuredMicroSkillId, ConceptId> = {
  "C1.1": "income-reliability", "C1.2": "income-reliability", "C1.3": "income-reliability",
  "C2.1": "full-cost", "C2.2": "full-cost",
  "C3.1": "viable-budget", "C3.2": "viable-budget", "C3.3": "viable-budget",
  "C4.1": "contingency", "C4.2": "contingency", "C4.3": "contingency", "C4.4": "contingency",
  "C5.1": "adaptation", "C5.2": "adaptation", "C5.3": "adaptation", "C5.4": "adaptation", "C5.5": "adaptation", "C5.6": "adaptation",
};

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

function calcObservation(id: StructuredMicroSkillId, facts: AssessmentFacts, calcId: keyof AssessmentFacts["calculations"], expected: number): MicroSkillObservation {
  const calc = facts.calculations[calcId];
  if (!calc) return notObserved(id, "The calculation checkpoint was not reached.");
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

export function observeStructured(facts: AssessmentFacts): MicroSkillObservation[] {
  const observations: MicroSkillObservation[] = [];
  observations.push(calcObservation("C1.1", facts, "reliable-floor", 5000));
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

  observations.push(calcObservation("C2.1", facts, "setup-middle-total", 1400));
  observations.push(calcObservation("C2.2", facts, "setup-lowest-total", 1000));

  const essentials = calcObservation("C3.1", facts, "essentials-total", 1600);
  observations.push(facts.opening && essentials.points !== null ? essentials : !facts.opening ? notObserved("C3.1", "The locked-cost plan was not saved.") : essentials);
  if (!facts.opening) {
    observations.push(notObserved("C3.2", "The Working Plan was not saved."), notObserved("C3.3", "The Working Plan was not saved."));
  } else {
    const c32: Quality = facts.opening.firstSaveBalance >= 0 ? "first_opportunity" : facts.opening.balance >= 0 ? "corrected" : "none";
    const c33: Quality = facts.opening.balance === 0 ? (facts.opening.firstSaveBalance === 0 ? "first_opportunity" : "corrected") : "partial";
    observations.push(observation("C3.2", c32, "standard_access", facts.opening.evidenceRefs, "Overcommitment is judged at the first saved attempt."));
    observations.push(observation("C3.3", c33, "standard_access", facts.opening.evidenceRefs, "Accounting for every dollar is judged from the final saved Working Plan balance."));
  }

  const c4 = primaryC4(facts);
  if (!c4.evidence?.entered) {
    for (const id of ["C4.1", "C4.2", "C4.3", "C4.4"] as const) observations.push(notObserved(id, "The path's primary contingency checkpoint was not reached."));
  } else {
    const e = c4.evidence;
    const corrected = e.savesBeforeAcceptable > 0;
    const firstOrCorrected = (success: boolean): Quality => success ? (corrected ? "corrected" : "first_opportunity") : "none";
    observations.push(observation("C4.1", firstOrCorrected(e.saved && e.amountFreed > 0), e.support, e.evidenceRefs, "A lower-resource state changed actual future amounts.", c4.context));
    observations.push(observation("C4.2", e.changedOnlyAdjustable ? (e.lockedMoveAttempts === 0 ? "first_opportunity" : "corrected") : "none", e.support, e.evidenceRefs, "Committed money remained separate from future money.", c4.context));
    const recognizes = e.saved && e.unassigned === 0 && (e.residual === 0 || e.residualAcknowledged);
    observations.push(observation("C4.3", recognizes ? (corrected ? "corrected" : "first_opportunity") : e.saved ? "partial" : "none", e.support, e.evidenceRefs, "The exact remaining exposure was resolved or acknowledged.", c4.context));
    const workable = e.saved && e.residual === 0 && e.unassigned === 0;
    observations.push(observation("C4.4", workable ? (corrected ? "corrected" : "first_opportunity") : e.saved ? "partial" : "none", e.support, e.evidenceRefs, "Workability is a separate observation from recognizing a residual.", c4.context));
  }

  const week5Expected = facts.selectedSetupId
    ? SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[facts.selectedSetupId] + (facts.opening?.snapshot.inputs.includeOutcome ? SCENARIO_NUMBERS.outcomeIncome : 0)
    : -1;
  observations.push(calcObservation("C5.1", facts, "week5-change", week5Expected));
  if (!facts.final) observations.push(notObserved("C5.2", "The final repair was not saved."));
  else observations.push(observation("C5.2", facts.final.lockedMoveAttempts === 0 ? "first_opportunity" : "corrected", "standard_access", facts.final.evidenceRefs, "Locked-move attempts during final repair are observed separately from contingency attempts."));
  if (facts.applicableGapTiles.length === 0) observations.push(notObserved("C5.3", "The Week 5 component strip was not reached."));
  else {
    const complete = facts.applicableGapTiles.every((tile) => facts.selectedGapTiles.includes(tile)) && facts.selectedGapTiles.every((tile) => facts.applicableGapTiles.includes(tile));
    observations.push(observation("C5.3", complete ? "first_opportunity" : "partial", "standard_access", facts.selectedGapTiles.map((tile) => `gap-tile:${tile}`), "Component selection is scored separately from the numerical total."));
  }
  if (!facts.final) observations.push(notObserved("C5.4", "The final plan was not submitted."));
  else observations.push(observation("C5.4", facts.final.balance === 0 ? "first_opportunity" : facts.final.acknowledgedResidual ? "partial" : "none", "standard_access", facts.final.evidenceRefs, "Final viability is the financial state at submission."));
  if (!facts.final) observations.push(notObserved("C5.5", "The completion-payment decision was not finalized."));
  else if (!facts.final.snapshot.inputs.includeCompletion) observations.push(observation("C5.5", facts.final.balance === 0 ? "first_opportunity" : "partial", "standard_access", facts.final.evidenceRefs, "The final plan excludes completion pay and reconciles without it."));
  else observations.push(observation("C5.5", facts.preview?.saved && facts.preview.residual === 0 && facts.preview.unassigned === 0 ? "first_opportunity" : facts.preview?.saved ? "partial" : "none", facts.preview?.support ?? "standard_access", facts.preview?.evidenceRefs ?? facts.final.evidenceRefs, "The no-$800 preview is independent of the balanced final plan."));
  if (!facts.optionalDecision || !facts.final || facts.finalPlanSequence === undefined) observations.push(notObserved("C5.6", "No final state followed an explicit opportunity decision."));
  else {
    const reconciledAfterDecision = facts.finalPlanSequence > facts.optionalDecision.sequence;
    observations.push(observation("C5.6", reconciledAfterDecision ? "first_opportunity" : "partial", "standard_access", [facts.optionalDecision.evidenceRef, ...facts.final.evidenceRefs], "Coherence requires a committed final snapshot after the last opportunity decision; the choice itself is never scored."));
  }
  return observations;
}

export const zero = dollars(0);
