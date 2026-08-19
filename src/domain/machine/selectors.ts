import { dollars } from "../core/money";
import { numbersFor } from "../scenario/registry";
import { availableFor, balanceOf, exposureFor, lockedFor, readoutFor } from "../finance/formulas";
import type { PlanAmounts, PlanMode, SnapshotInputs } from "../finance/types";
import { EMPTY_AMOUNTS, type ChallengeState } from "./state";

/** The economy this attempt is priced against. Read off the attempt, never imported. */
function numbersOf(state: ChallengeState) {
  return numbersFor(state.meta.worldId);
}

/**
 * The plan a mode starts from: what the student last committed *that the season is
 * actually running on*.
 *
 * The two safety checks are not that. `fallback` and `remaining-risk` both ask the same
 * question — *show it still holds if the money you counted on never comes* — and both are
 * built on top of a plan that stays where it is. Their amounts do not carry forward, which
 * is why `remaining-risk` has nothing after it and why `week5-first-response` starts from the
 * working plan rather than from the backup check.
 *
 * Week 5 used to start from the backup check, and that is the seam the whole of Week 5 fell
 * through. A student who counted both bonuses rebuilt without them, and then Week 5 showed
 * them that backup plan under the heading "the plan Avery walked into this week with",
 * demanded a total measured against the *working* plan — $2,000, refusing $1,000 as too low
 * — and handed them a board asking them to find $200. Three numbers, three different plans,
 * on two consecutive screens.
 *
 * There is one rule and this is the only place it is written, because the last time it was
 * written twice the two copies disagreed and a student lost money they never touched. The
 * screen read this function and rendered the working plan; the reducer kept its own copy that
 * still said backup, and it seeded the Week 5 draft from it — so a board opened on
 * $1,200/$1,400/$1,300, and one press of a $50 stepper on one row committed the whole draft
 * and every *other* row snapped to the backup check. Backup money fell $800 on a screen the
 * student had pressed nothing on, above a caption reading `was $1,400`, and the plan a teacher
 * marks was a merge of two plans the student never made. Whatever else changes here, the
 * reducer that writes a draft and the screen that draws it have to ask the same question of
 * the same function.
 */
export function carriedAmountsFor(state: ChallengeState, mode: PlanMode): PlanAmounts | undefined {
  switch (mode) {
    case "fallback": return state.drafts.working;
    case "week5-first-response": return state.drafts.working;
    case "final": return state.drafts["week5-first-response"] ?? state.drafts.working;
    case "remaining-risk": return state.drafts.final;
    case "working": return undefined;
  }
}

export function snapshotForMode(state: ChallengeState, mode: PlanMode): SnapshotInputs | null {
  if (!state.setupId) return null;
  return {
    mode,
    amounts: state.drafts[mode] ?? carriedAmountsFor(state, mode) ?? EMPTY_AMOUNTS,
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

/**
 * How many times the student has put the three places in an order and been told it was not
 * the one the numbers make.
 *
 * Read off the log rather than kept in `setupRanking`, which holds only the last try, for the
 * same reason `meaningfulAttempts` is: a student who closes a Chromebook lid and comes back
 * has to meet the same rung of the ladder they left, and the log is the part that survives.
 */
export function rankingAttempts(state: ChallengeState): number {
  return state.log.filter((event) => event.type === "SETUP_RANKED" && (event.payload as { correct?: boolean }).correct !== true).length;
}

export function meaningfulAttempts(state: ChallengeState, mode: PlanMode): number {
  return state.log.filter((event) => event.type === "PLAN_SAVE_REQUESTED" && (event.payload as { mode?: PlanMode }).mode === mode).length;
}
