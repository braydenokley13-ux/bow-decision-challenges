import { dollars } from "../core/money";
import { numbersFor } from "../scenario/registry";
import { availableFor, balanceOf, exposureFor, lockedFor, readoutFor } from "../finance/formulas";
import type { PlanAmounts, PlanMode, SnapshotInputs } from "../finance/types";
import { EMPTY_AMOUNTS, type ChallengeState } from "./state";

/** The economy this attempt is priced against. Read off the attempt, never imported. */
function numbersOf(state: ChallengeState) {
  return numbersFor(state.meta.worldId);
}

export function snapshotForMode(state: ChallengeState, mode: PlanMode): SnapshotInputs | null {
  if (!state.setupId) return null;
  /**
   * The plan each board opens on: what the student last committed *that the season is
   * actually running on*.
   *
   * The two safety checks are not that. `fallback` and `remaining-risk` both ask the same
   * question — *show it still holds if the money you counted on never comes* — and both are
   * built on top of a plan that stays where it is. Their amounts do not carry forward, which
   * is why `remaining-risk` has nothing after it and why `week5-first-response` opens on the
   * working plan rather than on the backup check.
   *
   * It used to open on the backup check, and that is the seam the whole of Week 5 fell
   * through. A student who counted both bonuses rebuilt without them, and then Week 5 showed
   * them that backup plan under the heading "the plan Avery walked into this week with",
   * demanded a total measured against the *working* plan — $2,000, refusing $1,000 as too low
   * — and handed them a board asking them to find $200. Three numbers, three different plans,
   * on two consecutive screens.
   */
  const defaultAmounts = mode === "fallback"
    ? state.drafts.working
    : mode === "week5-first-response"
      ? state.drafts.working
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
    numbersVersion: numbersOf(state).version,
  };
}

export function modeReadout(state: ChallengeState, mode: PlanMode) {
  const input = snapshotForMode(state, mode);
  return input ? readoutFor(input, numbersOf(state)) : null;
}

export function exposure(state: ChallengeState) {
  const input = snapshotForMode(state, "working");
  return input ? exposureFor(input, numbersOf(state)) : dollars(0);
}

export function setupLockedAmount(state: ChallengeState) {
  return state.setupId ? numbersOf(state).setupCosts[state.setupId] : dollars(0);
}

export function availableFutureMoney(state: ChallengeState, mode: PlanMode) {
  const input = snapshotForMode(state, mode);
  return input ? dollars(availableFor(input, numbersOf(state)) - lockedFor(input, numbersOf(state))) : dollars(0);
}

export function balance(state: ChallengeState, mode: PlanMode) {
  const input = snapshotForMode(state, mode);
  return input ? balanceOf(input, numbersOf(state)) : dollars(0);
}

export function amountsFor(state: ChallengeState, mode: PlanMode): PlanAmounts {
  return snapshotForMode(state, mode)?.amounts ?? EMPTY_AMOUNTS;
}

export function meaningfulAttempts(state: ChallengeState, mode: PlanMode): number {
  return state.log.filter((event) => event.type === "PLAN_SAVE_REQUESTED" && (event.payload as { mode?: PlanMode }).mode === mode).length;
}
