import { dollars } from "../core/money";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import { availableFor, balanceOf, exposureFor, lockedFor, readoutFor } from "../finance/formulas";
import type { PlanAmounts, PlanMode, SnapshotInputs } from "../finance/types";
import { EMPTY_AMOUNTS, type ChallengeState } from "./state";

export function snapshotForMode(state: ChallengeState, mode: PlanMode): SnapshotInputs | null {
  if (!state.setupId) return null;
  const defaultAmounts = mode === "fallback"
    ? state.drafts.working
    : mode === "week5-first-response"
      ? state.drafts.fallback ?? state.drafts.working
      : mode === "final"
        ? state.drafts["week5-first-response"] ?? state.drafts.working
        : mode === "remaining-risk"
          ? state.drafts.final
          : undefined;
  return {
    mode,
    amounts: state.drafts[mode] ?? defaultAmounts ?? EMPTY_AMOUNTS,
    includeCompletion: mode === "final" || mode === "remaining-risk" ? state.income.includeCompletionFinal : state.income.includeCompletion,
    includeOutcome: state.income.includeOutcome,
    includeOptionalWork: state.income.includeOptionalWork ?? false,
    setupId: state.setupId,
    week5Applied: mode === "week5-first-response" || mode === "final" || mode === "remaining-risk",
    depositTaken: state.depositTaken === true,
    numbersVersion: SCENARIO_NUMBERS.version,
  };
}

export function modeReadout(state: ChallengeState, mode: PlanMode) {
  const input = snapshotForMode(state, mode);
  return input ? readoutFor(input, SCENARIO_NUMBERS) : null;
}

export function exposure(state: ChallengeState) {
  const input = snapshotForMode(state, "working");
  return input ? exposureFor(input, SCENARIO_NUMBERS) : dollars(0);
}

export function setupLockedAmount(state: ChallengeState) {
  return state.setupId ? SCENARIO_NUMBERS.setupCosts[state.setupId] : dollars(0);
}

export function availableFutureMoney(state: ChallengeState, mode: PlanMode) {
  const input = snapshotForMode(state, mode);
  return input ? dollars(availableFor(input, SCENARIO_NUMBERS) - lockedFor(input, SCENARIO_NUMBERS)) : dollars(0);
}

export function balance(state: ChallengeState, mode: PlanMode) {
  const input = snapshotForMode(state, mode);
  return input ? balanceOf(input, SCENARIO_NUMBERS) : dollars(0);
}

export function amountsFor(state: ChallengeState, mode: PlanMode): PlanAmounts {
  return snapshotForMode(state, mode)?.amounts ?? EMPTY_AMOUNTS;
}

export function meaningfulAttempts(state: ChallengeState, mode: PlanMode): number {
  return state.log.filter((event) => event.type === "PLAN_SAVE_REQUESTED" && (event.payload as { mode?: PlanMode }).mode === mode).length;
}
