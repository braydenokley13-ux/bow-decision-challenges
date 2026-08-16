import { dollars } from "../core/money";
import type { ChallengeAction } from "../machine/actions";
import { challengeReducer } from "../machine/reducer";
import { createInitialState } from "../machine/state";
import type { EvidenceEvent } from "./types";

/**
 * Seat 14 — the golden case, as the actions that produced it.
 *
 * One student's real run, kept because a person has looked at it and agreed with what it
 * says: 85/90 structured, 94/100 with the reasoning score, and a contingency that reads
 * *demonstrated independently, corrected after consequence, 17/20* because they got the
 * fallback wrong, saw what it cost, and fixed it themselves.
 *
 * It lives in its own module because two tests now assert against it — the concept-level
 * reconciliation that has guarded this scorer since it was written, and the competency-level
 * one Checkpoint 2 adds. A copied action list would let the two drift, and then "the same
 * Seat 14 log produces both" would quietly stop being true, which is the one claim the
 * pairing exists to make.
 */
export const SEAT_14_ACTIONS: readonly ChallengeAction[] = [
  { type: "SETUP_SELECTED", setupId: "cousin-room" },
  { type: "SETUP_RANKED", order: ["teammate-share", "cousin-room", "gym-sublet"], correct: false },
  { type: "SETUP_RANKED", order: ["cousin-room", "teammate-share", "gym-sublet"], correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: "300", value: dollars(300), correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
  { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true },
  { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true },
  { type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: true },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "reserve", amount: dollars(900) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "flexibleCash", amount: dollars(2800) },
  { type: "PLAN_SAVE_REQUESTED", mode: "working" },
  { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "goal", amount: dollars(1100) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "reserve", amount: dollars(600) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "fallback", category: "flexibleCash", amount: dollars(2300) },
  { type: "PLAN_SAVE_REQUESTED", mode: "fallback", acknowledgedResidual: dollars(900) },
  { type: "WEEK5_ADVANCE_CONFIRMED" },
  { type: "GAP_TILE_TOGGLED", tileId: "lost-outcome", selected: true },
  { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true },
  { type: "GAP_TILE_TOGGLED", tileId: "setup-cost", selected: true },
  { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "1900", value: dollars(1900), correct: false },
  { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "2000", value: dollars(2000), correct: true },
  { type: "GO_TO_STAGE", stage: "first-response" },
  // Absorbs the whole $1,100 shortfall out of the $4,000 still adjustable,
  // before the clinic opportunity is offered.
  { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "goal", amount: dollars(800) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "reserve", amount: dollars(400) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "week5-first-response", category: "flexibleCash", amount: dollars(1700) },
  { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
  { type: "OPTIONAL_WORK_DECIDED", accepted: true },
  { type: "COMPLETION_INCOME_DECIDED", included: true },
  { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "goal", amount: dollars(800) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "reserve", amount: dollars(400) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "final", category: "flexibleCash", amount: dollars(2100) },
  { type: "PLAN_SAVE_REQUESTED", mode: "final" },
  { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "goal", amount: dollars(500) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "reserve", amount: dollars(200) },
  { type: "PLAN_AMOUNT_CHANGED", mode: "remaining-risk", category: "flexibleCash", amount: dollars(1800) },
  { type: "PLAN_SAVE_REQUESTED", mode: "remaining-risk" },
];

/** What a person scored the written defense: 9 of 10. */
export const SEAT_14_REASONING_POINTS = 9;

export function seat14Log(): EvidenceEvent[] {
  return SEAT_14_ACTIONS.reduce(challengeReducer, createInitialState()).log;
}
