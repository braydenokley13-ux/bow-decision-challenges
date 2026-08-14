import { dollars } from "../core/money";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import { DEFAULT_WORLD_ID, PLAN_UNDER_PRESSURE_LAUNCH } from "../scenario/registry";
import { balanceOf, readoutFor, residualOf, unassignedOf } from "../finance/formulas";
import type { PlanMode, SnapshotInputs } from "../finance/types";
import type { EvidenceEvent, EvidenceEventType, StageId, SupportLevel } from "../evidence/types";
import { conceptsForEvent } from "../evidence/eventConcepts";
import type { ChallengeAction } from "./actions";
import { EMPTY_AMOUNTS, type ChallengeState } from "./state";

/**
 * The wall clock, supplied by whoever dispatched the action.
 *
 * The reducer stays pure, and every event carries a real timestamp instead of the
 * synthetic `+1ms` counter that used to make every event look one millisecond apart —
 * which meant nothing about how long anything took could be recovered from a product
 * called Plan Under Pressure. Tests that do not care pass no clock and fall back to the
 * old monotonic counter.
 */
function stampFor(state: ChallengeState, action: { at?: number }): number {
  const at = action.at;
  return typeof at === "number" && Number.isFinite(at) ? Math.max(at, state.meta.updatedAt) : state.meta.updatedAt + 1;
}

function append<T>(state: ChallengeState, type: EvidenceEventType, payload: T, supportLevel: SupportLevel = "standard_access", dedupeKey?: string, at?: number): ChallengeState {
  if (dedupeKey && state.log.some((event) => event.dedupeKey === dedupeKey)) return state;
  const sequence = state.log.length + 1;
  const event: EvidenceEvent<T> = {
    id: `event-${sequence}`,
    sequence,
    timestamp: stampFor(state, { ...(at !== undefined ? { at } : {}) }),
    type,
    stage: state.stage,
    challengeId: state.meta.challengeId,
    challengeVersion: state.meta.challengeVersion,
    sessionId: state.meta.sessionId,
    worldId: state.meta.worldId,
    conceptIds: conceptsForEvent(type, payload),
    payload,
    supportLevel,
    ...(dedupeKey ? { dedupeKey } : {}),
  };
  return { ...state, log: [...state.log, event], meta: { ...state.meta, updatedAt: event.timestamp } };
}

/**
 * Stage progression is recorded, not inferred. It used to be read off whichever event
 * happened to be stamped with a stage, so a student who reached a screen and did nothing
 * was indistinguishable from one who never got there at all.
 */
function goTo(state: ChallengeState, stage: StageId, at?: number): ChallengeState {
  if (state.stage === stage) return state;
  const moved = { ...state, stage, stageHistory: [...state.stageHistory, stage] };
  return append(moved, "STAGE_ENTERED", { stage, from: state.stage }, "standard_access", `stage:${stage}`, at);
}

function supportFor(state: ChallengeState, interactionId: string): SupportLevel {
  return state.support[interactionId] ?? "standard_access";
}

function defaultAmountsFor(state: ChallengeState, mode: PlanMode) {
  if (mode === "fallback") return state.drafts.working ?? EMPTY_AMOUNTS;
  if (mode === "week5-first-response") return state.drafts.fallback ?? state.drafts.working ?? EMPTY_AMOUNTS;
  if (mode === "final") return state.drafts["week5-first-response"] ?? state.drafts.working ?? EMPTY_AMOUNTS;
  if (mode === "remaining-risk") return state.drafts.final ?? EMPTY_AMOUNTS;
  return EMPTY_AMOUNTS;
}

function snapshotInputs(state: ChallengeState, mode: PlanMode): SnapshotInputs | null {
  if (!state.setupId) return null;
  return {
    mode,
    amounts: state.drafts[mode] ?? defaultAmountsFor(state, mode),
    includeCompletion: mode === "final" || mode === "remaining-risk" ? state.income.includeCompletionFinal : state.income.includeCompletion,
    includeOutcome: state.income.includeOutcome,
    includeOptionalWork: state.income.includeOptionalWork ?? false,
    setupId: state.setupId,
    week5Applied: mode === "week5-first-response" || mode === "final" || mode === "remaining-risk",
    depositTaken: state.depositTaken === true,
    numbersVersion: SCENARIO_NUMBERS.version,
  };
}

export type TimestampedAction = ChallengeAction & { at?: number };

export function challengeReducer(state: ChallengeState, action: TimestampedAction): ChallengeState {
  const at = action.at;
  switch (action.type) {
    case "GO_TO_STAGE":
      return goTo(state, action.stage, at);
    case "SESSION_STARTED": {
      // With one finished world there is no choice to present, so the session opens
      // straight into it. Restoring the picker means routing to "choose-world" here.
      // The opening screen already told the story, so checking in lands on the deal
      // rather than on a second orientation screen.
      const next = { ...state, meta: { ...state.meta, sessionId: action.sessionId, classCode: action.classCode, seatCode: action.seatCode, worldId: DEFAULT_WORLD_ID } };
      const started = append(next, action.type, action, "standard_access", undefined, at);
      return goTo(PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld ? started : append(started, "WORLD_CONFIRMED", { worldId: DEFAULT_WORLD_ID }, "standard_access", undefined, at), PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld ? "choose-world" : "role-contract", at);
    }
    case "WORLD_CONFIRMED": {
      const next = { ...state, meta: { ...state.meta, worldId: action.worldId } };
      return goTo(append(next, action.type, action, "standard_access", undefined, at), "role-contract", at);
    }
    case "CALCULATION_SUBMITTED": {
      const previous = state.calculations[action.calcId];
      const calculation = {
        raw: action.raw,
        value: action.value,
        attempts: (previous?.attempts ?? 0) + 1,
        correct: action.correct,
        supplied: previous?.supplied ?? false,
      };
      const next = { ...state, calculations: { ...state.calculations, [action.calcId]: calculation } };
      return append(next, action.type, action, supportFor(state, action.calcId), undefined, at);
    }
    case "SETUP_SELECTED": {
      const next = { ...state, setupId: action.setupId };
      return append(next, action.type, action, "standard_access", undefined, at);
    }
    case "COURSE_DEPOSIT_DECIDED": {
      // Reserving the seat moves that money out of the adjustable rows and into the
      // locked costs, so any course amount the student had parked is released.
      const next = {
        ...state,
        depositTaken: action.taken,
        drafts: action.taken
          ? Object.fromEntries(Object.entries(state.drafts).map(([mode, amounts]) => [mode, { ...amounts, goal: dollars(0) }])) as ChallengeState["drafts"]
          : state.drafts,
      };
      return append(next, action.type, action, "standard_access", undefined, at);
    }
    case "INCOME_SOURCE_TOGGLED": {
      const key = action.sourceId === "completion-800" ? "includeCompletion" : "includeOutcome";
      const next = { ...state, income: { ...state.income, [key]: action.included } };
      return append(next, action.type, action, "standard_access", undefined, at);
    }
    case "PLAN_AMOUNT_CHANGED":
      return { ...state, drafts: { ...state.drafts, [action.mode]: { ...(state.drafts[action.mode] ?? defaultAmountsFor(state, action.mode)), [action.category]: action.amount } } };
    case "PLAN_SAVE_REQUESTED": {
      const inputs = snapshotInputs(state, action.mode);
      if (!inputs) return state;
      const balance = balanceOf(inputs, SCENARIO_NUMBERS);
      let next = append(state, action.type, { mode: action.mode, inputs, balance, residual: residualOf(balance), unassigned: unassignedOf(balance), acknowledgedResidual: action.acknowledgedResidual }, supportFor(state, action.mode), undefined, at);
      if (balance !== 0 && action.acknowledgedResidual === undefined) return next;
      const sequence = next.log.length + 1;
      // The readout is frozen onto the snapshot here, priced with the numbers in force at
      // save time, so a later re-balancing of the scenario cannot rewrite this result.
      const snapshot = { id: `snapshot-${sequence}`, sequence, inputs, readout: readoutFor(inputs, SCENARIO_NUMBERS), ...(action.acknowledgedResidual !== undefined ? { acknowledgedResidual: action.acknowledgedResidual } : {}) };
      next = { ...next, snapshots: [...next.snapshots, snapshot], saved: { ...next.saved, [action.mode]: snapshot.id } };
      next = append(next, "PLAN_SAVED", { mode: action.mode, snapshot, balance }, supportFor(state, action.mode), undefined, at);
      // A plan built on no conditional income has no lower-resource version to build,
      // so the season starts instead of a screen that only says there is nothing to do.
      if (action.mode === "working") return goTo(next, state.income.includeCompletion || state.income.includeOutcome ? "fallback-version" : "week5-transition", at);
      if (action.mode === "fallback") return goTo(next, "week5-transition", at);
      if (action.mode === "week5-first-response") return goTo(next, "opportunity-final-repair", at);
      if (action.mode === "final") return goTo(next, state.income.includeCompletionFinal ? "remaining-risk-preview" : "defense", at);
      return goTo(next, "defense", at);
    }
    case "LOCKED_MOVE_ATTEMPTED":
      return append(state, action.type, action, supportFor(state, action.mode), undefined, at);
    case "WEEK5_ADVANCE_CONFIRMED":
      return goTo(append(state, action.type, action, "standard_access", "week5-applied", at), "week5-event", at);
    case "GAP_TILE_TOGGLED": {
      const selectedGapTiles = action.selected
        ? [...new Set([...state.selectedGapTiles, action.tileId])]
        : state.selectedGapTiles.filter((id) => id !== action.tileId);
      return append({ ...state, selectedGapTiles }, action.type, action, "standard_access", undefined, at);
    }
    case "OPTIONAL_WORK_DECIDED": {
      const next = { ...state, income: { ...state.income, includeOptionalWork: action.accepted } };
      return append(next, action.type, action, "standard_access", undefined, at);
    }
    case "COMPLETION_INCOME_DECIDED": {
      const next = { ...state, income: { ...state.income, includeCompletionFinal: action.included } };
      return append(next, action.type, action, "standard_access", undefined, at);
    }
    case "SCAFFOLD_OPENED": {
      const next = { ...state, support: { ...state.support, [action.interactionId]: "direct_scaffold" as const } };
      return append(next, action.type, action, "direct_scaffold", undefined, at);
    }
    case "SHOW_AND_CONTINUE_USED": {
      const next = { ...state, support: { ...state.support, [action.interactionId]: "answer_supplied" as const } };
      return append(next, action.type, action, "answer_supplied", undefined, at);
    }
    case "DEFENSE_SUBMITTED": {
      const next = { ...state, defense: { tileIds: action.tileIds, text: action.text }, meta: { ...state.meta, completedAt: state.meta.updatedAt + 1 } };
      return goTo(append(next, action.type, action, "standard_access", undefined, at), "submitted", at);
    }
  }
}

export function eventPayload<T>(event: EvidenceEvent): T {
  return event.payload as T;
}

export const moneyFrom = (value: number) => dollars(value);
