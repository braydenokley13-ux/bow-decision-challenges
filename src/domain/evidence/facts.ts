import type { CalcId, SetupId } from "../core/ids";
import { dollars } from "../core/money";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import { amountFreed, balanceOf, exposureFor, residualOf, unassignedOf } from "../finance/formulas";
import type { PlanMode } from "../finance/types";
import { eventPayload } from "../machine/reducer";
import type { EvidenceEvent, AssessmentFacts, CalculationEvidence, PlanSnapshot, AlternateStateEvidence } from "./types";

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

function alternate(log: EvidenceEvent[], mode: Extract<PlanMode, "fallback" | "week5-first-response" | "remaining-risk">, baseline: PlanSnapshot | undefined): AlternateStateEvidence | undefined {
  const entered = log.some((event) => event.stage === (mode === "fallback" ? "fallback-version" : mode === "week5-first-response" ? "first-response" : "remaining-risk-preview"));
  const saved = latestSaved(log, mode);
  const requests = eventsOf(log, "PLAN_SAVE_REQUESTED").filter((event) => eventPayload<PlanRequestPayload>(event).mode === mode);
  if (!entered && !saved && requests.length === 0) return undefined;
  const snapshot = saved?.payload.snapshot;
  const balance = snapshot ? balanceOf(snapshot.inputs, SCENARIO_NUMBERS) : dollars(0);
  const lockedAttempts = eventsOf(log, "LOCKED_MOVE_ATTEMPTED").filter((event) => eventPayload<{ mode: PlanMode }>(event).mode === mode);
  const acknowledged = requests.some((event) => eventPayload<PlanRequestPayload>(event).acknowledgedResidual === Math.max(0, -(eventPayload<PlanRequestPayload>(event).balance)));
  return {
    entered: entered || Boolean(saved) || requests.length > 0,
    saved: Boolean(saved),
    amountFreed: baseline && snapshot ? amountFreed(baseline.inputs.amounts, snapshot.inputs.amounts) : dollars(0),
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

export function deriveFacts(log: EvidenceEvent[]): AssessmentFacts {
  const openingSaved = latestSaved(log, "working");
  const finalSaved = latestSaved(log, "final");
  const finalLockedAttempts = eventsOf(log, "LOCKED_MOVE_ATTEMPTED").filter((event) => eventPayload<{ mode: PlanMode }>(event).mode === "final");
  const firstOpeningRequest = eventsOf(log, "PLAN_SAVE_REQUESTED").find((event) => eventPayload<PlanRequestPayload>(event).mode === "working");
  const setup = eventsOf(log, "SETUP_SELECTED").at(-1);
  const optional = eventsOf(log, "OPTIONAL_WORK_DECIDED").at(-1);
  const applicableGapTiles = [
    ...(openingSaved?.payload.snapshot.inputs.includeOutcome ? ["lost-outcome"] : []),
    "required-cost",
    "setup-cost",
  ];
  const finalRequest = eventsOf(log, "PLAN_SAVE_REQUESTED").filter((event) => eventPayload<PlanRequestPayload>(event).mode === "final").at(-1);
  const facts: AssessmentFacts = {
    calculations: calcFacts(log),
    selectedGapTiles: eventsOf(log, "GAP_TILE_TOGGLED").reduce<string[]>((selected, event) => {
      const payload = eventPayload<{ tileId: string; selected: boolean }>(event);
      return payload.selected ? [...new Set([...selected, payload.tileId])] : selected.filter((id) => id !== payload.tileId);
    }, []),
    applicableGapTiles,
    defenseSubmitted: eventsOf(log, "DEFENSE_SUBMITTED").length > 0,
  };
  if (openingSaved) {
    const snapshot = openingSaved.payload.snapshot;
    const openingBalance = balanceOf(snapshot.inputs, SCENARIO_NUMBERS);
    facts.opening = {
      snapshot,
      balance: openingBalance,
      firstSaveBalance: dollars(firstOpeningRequest ? eventPayload<PlanRequestPayload>(firstOpeningRequest).balance : openingBalance),
      conditionalExposure: exposureFor(snapshot.inputs, SCENARIO_NUMBERS),
      evidenceRefs: [openingSaved.event.id, ...(firstOpeningRequest ? [firstOpeningRequest.id] : [])],
    };
    const fallback = alternate(log, "fallback", snapshot);
    if (fallback) facts.fallback = fallback;
    const firstResponse = alternate(log, "week5-first-response", snapshot);
    if (firstResponse) facts.firstResponse = firstResponse;
  }
  if (finalSaved) {
    facts.final = {
      snapshot: finalSaved.payload.snapshot,
      balance: balanceOf(finalSaved.payload.snapshot.inputs, SCENARIO_NUMBERS),
      acknowledgedResidual: finalRequest ? eventPayload<PlanRequestPayload>(finalRequest).acknowledgedResidual !== undefined : false,
      lockedMoveAttempts: finalLockedAttempts.length,
      evidenceRefs: [...finalLockedAttempts.map((event) => event.id), finalSaved.event.id],
    };
    const preview = alternate(log, "remaining-risk", finalSaved.payload.snapshot);
    if (preview) facts.preview = preview;
  }
  if (setup) facts.selectedSetupId = eventPayload<{ setupId: SetupId }>(setup).setupId;
  if (optional) facts.optionalDecision = { accepted: eventPayload<{ accepted: boolean }>(optional).accepted, sequence: optional.sequence, evidenceRef: optional.id };
  if (finalSaved) facts.finalPlanSequence = finalSaved.event.sequence;
  return facts;
}
