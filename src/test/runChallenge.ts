import { dollars } from "../domain/core/money";
import type { SetupId } from "../domain/core/ids";
import { challengeReducer, type TimestampedAction } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import { availableFor, lockedFor, week5Change } from "../domain/finance/formulas";
import { snapshotForMode } from "../domain/machine/selectors";
import type { PlanMode } from "../domain/finance/types";
import { SCENARIO_NUMBERS as N } from "../domain/scenario/numbers";
import { setupCostOrder } from "../domain/scenario/expectations";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { SubmissionRecord } from "../platform/classes/types";

/**
 * A whole student run, headless.
 *
 * Tests that need real evidence used to have to hand-write event logs, which meant they
 * were testing a shape somebody typed rather than a shape the product produces. This drives
 * the actual reducer through the actual stages, so the log it returns is indistinguishable
 * from one a browser produced — and any change to the machine that would break a real
 * student's evidence breaks these tests too.
 */
export interface RunOptions {
  seatCode?: string;
  setupId?: SetupId;
  countCompletion?: boolean;
  countOutcome?: boolean;
  reserveSeat?: boolean;
  takeClinics?: boolean;
  countCompletionFinal?: boolean;
  /** How the student splits what is left, as fractions of the spendable money. */
  split?: { goal: number; reserve: number };
  defenseText?: string;
  startedAt?: number;
}

const DEFAULTS: Required<Omit<RunOptions, "startedAt">> = {
  seatCode: "7",
  setupId: "cousin-room",
  countCompletion: false,
  countOutcome: false,
  reserveSeat: false,
  takeClinics: false,
  countCompletionFinal: false,
  split: { goal: 0.4, reserve: 0.3 },
  defenseText: "My plan still works because every dollar has a job after Week 5. I protected the course money and gave up part of the reserve.",
};

function toStep(value: number, step: number): number {
  return Math.max(0, Math.round(value / step) * step);
}

/**
 * Splits whatever is spendable across the three rows so the board lands on exactly zero.
 * The course row is capped by the scenario, and a reserved seat empties it entirely.
 */
function planFor(state: ChallengeState, mode: PlanMode, split: { goal: number; reserve: number }) {
  const input = snapshotForMode(state, mode);
  if (!input) return { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) };
  const step = mode === "working" || mode === "fallback" ? N.openingIncrement : N.repairIncrement;
  const spendable = Math.max(0, availableFor(input, N) - lockedFor(input, N));
  const cap = input.depositTaken ? 0 : N.course.fullPrice;
  const goal = Math.min(cap, toStep(spendable * split.goal, step));
  const reserve = toStep(Math.min(spendable - goal, spendable * split.reserve), step);
  return { goal: dollars(goal), reserve: dollars(reserve), flexibleCash: dollars(spendable - goal - reserve) };
}

export function runChallenge(options: RunOptions = {}): ChallengeState {
  const opts = { ...DEFAULTS, ...options };
  let at = options.startedAt ?? 1_770_000_000_000;
  let state = createInitialState(at);
  const send = (action: TimestampedAction) => {
    at += 1000;
    state = challengeReducer(state, { ...action, at });
  };

  send({ type: "SESSION_STARTED", sessionId: `session-${opts.seatCode.padStart(8, "0")}`, classCode: "H4KVW", seatCode: opts.seatCode });
  send({ type: "GO_TO_STAGE", stage: "setup-comparison" });

  const order = setupCostOrder(N);
  send({ type: "SETUP_RANKED", order, correct: true });
  send({ type: "SETUP_SELECTED", setupId: opts.setupId });
  send({ type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: String(N.setupCosts[opts.setupId]), value: N.setupCosts[opts.setupId], correct: true });
  send({ type: "GO_TO_STAGE", stage: "working-plan" });

  send({ type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: String(N.reliableFloor), value: N.reliableFloor, correct: true });
  send({ type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: String(N.essentialsTotal), value: N.essentialsTotal, correct: true });
  if (opts.countCompletion) send({ type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true });
  if (opts.countOutcome) send({ type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: true });

  const savePlan = (mode: PlanMode) => {
    const amounts = planFor(state, mode, opts.split);
    for (const category of ["goal", "reserve", "flexibleCash"] as const) {
      send({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: amounts[category] });
    }
    send({ type: "PLAN_SAVE_REQUESTED", mode });
  };

  savePlan("working");
  if (state.stage === "fallback-version") savePlan("fallback");

  // Weeks 1–4 play, then the course-deposit deadline closes them.
  send({ type: "COURSE_DEPOSIT_DECIDED", taken: opts.reserveSeat });
  send({ type: "WEEK5_ADVANCE_CONFIRMED" });

  // Week 5: pull out the components that moved, then total them.
  const applicable = [
    ...(state.income.includeOutcome ? ["lost-outcome"] : []),
    "required-cost",
    ...(N.setupEventCosts[opts.setupId] > 0 ? ["setup-cost"] : []),
  ];
  for (const tileId of applicable) send({ type: "GAP_TILE_TOGGLED", tileId, selected: true });
  const expected = week5Change({ includeOutcome: state.income.includeOutcome, setupId: opts.setupId }, N);
  send({ type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: String(expected), value: expected, correct: true });
  send({ type: "GO_TO_STAGE", stage: "first-response" });

  savePlan("week5-first-response");
  send({ type: "OPTIONAL_WORK_DECIDED", accepted: opts.takeClinics });
  send({ type: "COMPLETION_INCOME_DECIDED", included: opts.countCompletionFinal });
  savePlan("final");
  if (state.stage === "remaining-risk-preview") savePlan("remaining-risk");

  send({ type: "GO_TO_STAGE", stage: "defense" });
  send({ type: "DEFENSE_SUBMITTED", tileIds: ["final-funds", "reserve"], text: opts.defenseText });
  return state;
}

/** The same run, packaged the way the class service stores it. */
export function buildSubmission(options: RunOptions = {}): SubmissionRecord {
  const state = runChallenge(options);
  return {
    classCode: state.meta.classCode,
    seatCode: state.meta.seatCode,
    sessionId: state.meta.sessionId,
    challengeId: PLAN_UNDER_PRESSURE.id,
    challengeVersion: PLAN_UNDER_PRESSURE.version,
    submittedAt: state.meta.updatedAt,
    reasoningPoints: null,
    log: state.log,
  };
}
