import type { CalcId, CategoryId, SetupId } from "../core/ids";
import { dollars } from "../core/money";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import type { ScenarioNumbers } from "../scenario/types";
import { amountFreed, assigned, balanceOf, exposureFor, residualOf, unassignedOf } from "../finance/formulas";
import type { PlanMode } from "../finance/types";
import { eventPayload } from "../machine/reducer";
import type { EvidenceEvent, AssessmentFacts, CalculationEvidence, PlanSnapshot, AlternateStateEvidence } from "./types";

/**
 * What the plan was worth when the student saved it. A snapshot saved by the app carries
 * its own priced readout, so scoring reads that in preference to re-pricing the amounts —
 * otherwise re-balancing the scenario would silently rewrite every past attempt.
 */
function savedBalance(snapshot: PlanSnapshot | undefined, n: ScenarioNumbers) {
  if (!snapshot) return dollars(0);
  return snapshot.readout ? snapshot.readout.balance : balanceOf(snapshot.inputs, n);
}

function savedExposure(snapshot: PlanSnapshot, n: ScenarioNumbers) {
  return snapshot.readout ? snapshot.readout.exposure : exposureFor(snapshot.inputs, n);
}

interface PlanSavePayload {
  mode: PlanMode;
  snapshot: PlanSnapshot;
  balance: number;
}

interface PlanRequestPayload {
  mode: PlanMode;
  balance: number;
  acknowledgedResidual?: number;
}

function eventsOf(log: EvidenceEvent[], type: EvidenceEvent["type"]) {
  return log.filter((event) => event.type === type);
}

function calcFacts(log: EvidenceEvent[]): AssessmentFacts["calculations"] {
  const result: AssessmentFacts["calculations"] = {};
  for (const event of eventsOf(log, "CALCULATION_SUBMITTED")) {
    const payload = eventPayload<{ calcId: CalcId; raw: string; value: number | null; correct: boolean }>(event);
    const existing = result[payload.calcId];
    const evidence: CalculationEvidence = existing ?? { calcId: payload.calcId, attempts: [], support: event.supportLevel, supplied: false };
    evidence.attempts.push({ raw: payload.raw, value: payload.value === null ? null : dollars(payload.value), correct: payload.correct, eventRef: event.id });
    evidence.support = event.supportLevel;
    evidence.supplied = event.supportLevel === "answer_supplied";
    result[payload.calcId] = evidence;
  }
  return result;
}

function latestSaved(log: EvidenceEvent[], mode: PlanMode): { event: EvidenceEvent; payload: PlanSavePayload } | undefined {
  return eventsOf(log, "PLAN_SAVED")
    .map((event) => ({ event, payload: eventPayload<PlanSavePayload>(event) }))
    .filter((entry) => entry.payload.mode === mode)
    .at(-1);
}

function alternate(log: EvidenceEvent[], mode: Extract<PlanMode, "fallback" | "week5-first-response" | "remaining-risk">, baseline: PlanSnapshot | undefined, n: ScenarioNumbers): AlternateStateEvidence | undefined {
  // Reaching a screen is now its own recorded fact rather than something inferred from
  // whichever event happened to be stamped with that stage.
  const stage = mode === "fallback" ? "fallback-version" : mode === "week5-first-response" ? "first-response" : "remaining-risk-preview";
  const entered = log.some((event) => event.type === "STAGE_ENTERED" && (event.payload as { stage?: string }).stage === stage)
    || log.some((event) => event.stage === stage);
  const saved = latestSaved(log, mode);
  const requests = eventsOf(log, "PLAN_SAVE_REQUESTED").filter((event) => eventPayload<PlanRequestPayload>(event).mode === mode);
  if (!entered && !saved && requests.length === 0) return undefined;
  const snapshot = saved?.payload.snapshot;
  const balance = savedBalance(snapshot, n);
  const lockedAttempts = eventsOf(log, "LOCKED_MOVE_ATTEMPTED").filter((event) => eventPayload<{ mode: PlanMode }>(event).mode === mode);
  const acknowledged = requests.some((event) => eventPayload<PlanRequestPayload>(event).acknowledgedResidual === Math.max(0, -(eventPayload<PlanRequestPayload>(event).balance)));
  // The state the student was handed: the baseline amounts carried into this mode,
  // priced with this mode's own income and locked costs. This one is a counterfactual
  // across two snapshots, so it has to be computed rather than read back.
  const entryAmounts = baseline?.inputs.amounts;
  const entryShortfall = entryAmounts && snapshot
    ? residualOf(balanceOf({ ...snapshot.inputs, amounts: entryAmounts }, n))
    : dollars(0);
  const absorbTarget = entryAmounts ? dollars(Math.min(entryShortfall, assigned(entryAmounts))) : dollars(0);
  return {
    entered: entered || Boolean(saved) || requests.length > 0,
    saved: Boolean(saved),
    amountFreed: baseline && snapshot ? amountFreed(baseline.inputs.amounts, snapshot.inputs.amounts) : dollars(0),
    absorbTarget,
    residual: snapshot ? residualOf(balance) : dollars(0),
    unassigned: snapshot ? unassignedOf(balance) : dollars(0),
    residualAcknowledged: acknowledged,
    lockedMoveAttempts: lockedAttempts.length,
    changedOnlyAdjustable: lockedAttempts.length === 0,
    savesBeforeAcceptable: requests.filter((event) => {
      const payload = eventPayload<PlanRequestPayload>(event);
      return payload.balance !== 0 && payload.acknowledgedResidual === undefined;
    }).length,
    support: saved?.event.supportLevel ?? requests.at(-1)?.supportLevel ?? "standard_access",
    evidenceRefs: [...requests.map((event) => event.id), ...lockedAttempts.map((event) => event.id), ...(saved ? [saved.event.id] : [])],
  };
}

export function deriveFacts(log: EvidenceEvent[], n: ScenarioNumbers = SCENARIO_NUMBERS): AssessmentFacts {
  const openingSaved = latestSaved(log, "working");
  const finalSaved = latestSaved(log, "final");
  const finalLockedAttempts = eventsOf(log, "LOCKED_MOVE_ATTEMPTED").filter((event) => eventPayload<{ mode: PlanMode }>(event).mode === "final");
  const firstOpeningRequest = eventsOf(log, "PLAN_SAVE_REQUESTED").find((event) => eventPayload<PlanRequestPayload>(event).mode === "working");
  const setup = eventsOf(log, "SETUP_SELECTED").at(-1);
  const optional = eventsOf(log, "OPTIONAL_WORK_DECIDED").at(-1);
  const selectedSetup = setup ? eventPayload<{ setupId: SetupId }>(setup).setupId : undefined;
  // Only components that actually moved money are observable. A setup with no extra
  // travel cost must not require the student to select a $0 change.
  const applicableGapTiles = [
    ...(openingSaved?.payload.snapshot.inputs.includeOutcome ? ["lost-outcome"] : []),
    ...(n.requiredWeek5Cost > 0 ? ["required-cost"] : []),
    ...(selectedSetup && n.setupEventCosts[selectedSetup] > 0 ? ["setup-cost"] : []),
  ];
  const finalRequest = eventsOf(log, "PLAN_SAVE_REQUESTED").filter((event) => eventPayload<PlanRequestPayload>(event).mode === "final").at(-1);
  const facts: AssessmentFacts = {
    calculations: calcFacts(log),
    selectedGapTiles: eventsOf(log, "GAP_TILE_TOGGLED").reduce<string[]>((selected, event) => {
      const payload = eventPayload<{ tileId: string; selected: boolean }>(event);
      return payload.selected ? [...new Set([...selected, payload.tileId])] : selected.filter((id) => id !== payload.tileId);
    }, []),
    applicableGapTiles,
    // Recorded for every mode the control appears on, in the order the student said them.
    // Which of them means anything is the world observer's decision, not this file's.
    remainderChoices: eventsOf(log, "PLAN_REMAINDER_ASSIGNED").map((event) => {
      const payload = eventPayload<{ mode: PlanMode; category: CategoryId; amount: number; remaining: number }>(event);
      return {
        mode: payload.mode,
        category: payload.category,
        amount: dollars(payload.amount),
        remaining: dollars(payload.remaining),
        sequence: event.sequence,
        supportLevel: event.supportLevel,
        evidenceRef: event.id,
      };
    }),
    defenseSubmitted: eventsOf(log, "DEFENSE_SUBMITTED").length > 0,
  };
  if (openingSaved) {
    const snapshot = openingSaved.payload.snapshot;
    const openingBalance = savedBalance(snapshot, n);
    facts.opening = {
      snapshot,
      balance: openingBalance,
      firstSaveBalance: dollars(firstOpeningRequest ? eventPayload<PlanRequestPayload>(firstOpeningRequest).balance : openingBalance),
      conditionalExposure: savedExposure(snapshot, n),
      support: openingSaved.event.supportLevel,
      evidenceRefs: [openingSaved.event.id, ...(firstOpeningRequest ? [firstOpeningRequest.id] : [])],
    };
    const fallback = alternate(log, "fallback", snapshot, n);
    if (fallback) facts.fallback = fallback;
    // The first response starts from whatever the student last committed, so that
    // is the state their Week 5 repair is measured against.
    const firstResponse = alternate(log, "week5-first-response", latestSaved(log, "fallback")?.payload.snapshot ?? snapshot, n);
    if (firstResponse) facts.firstResponse = firstResponse;
  }
  if (finalSaved) {
    facts.final = {
      snapshot: finalSaved.payload.snapshot,
      balance: savedBalance(finalSaved.payload.snapshot, n),
      acknowledgedResidual: finalRequest ? eventPayload<PlanRequestPayload>(finalRequest).acknowledgedResidual !== undefined : false,
      lockedMoveAttempts: finalLockedAttempts.length,
      support: finalSaved.event.supportLevel,
      evidenceRefs: [...finalLockedAttempts.map((event) => event.id), finalSaved.event.id],
    };
    const preview = alternate(log, "remaining-risk", finalSaved.payload.snapshot, n);
    if (preview) facts.preview = preview;
  }
  if (selectedSetup) facts.selectedSetupId = selectedSetup;
  const rankings = eventsOf(log, "SETUP_RANKED");
  if (rankings.length > 0) {
    facts.setupRanking = {
      attempts: rankings.length,
      firstCorrect: eventPayload<{ correct: boolean }>(rankings[0]!).correct,
      correct: rankings.some((event) => eventPayload<{ correct: boolean }>(event).correct),
      evidenceRefs: rankings.map((event) => event.id),
    };
  }
  if (optional) facts.optionalDecision = { accepted: eventPayload<{ accepted: boolean }>(optional).accepted, sequence: optional.sequence, evidenceRef: optional.id };
  const completion = eventsOf(log, "COMPLETION_INCOME_DECIDED").at(-1);
  if (completion) facts.completionDecision = { included: eventPayload<{ included: boolean }>(completion).included, sequence: completion.sequence, evidenceRef: completion.id };
  if (finalSaved) facts.finalPlanSequence = finalSaved.event.sequence;
  return facts;
}
