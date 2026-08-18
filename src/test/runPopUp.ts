import { dollars } from "../domain/core/money";
import {
  availableToPlan,
  cashToPlan,
  orderCost,
  owedUpFront,
  swapBill,
} from "../domain/scenario/worlds/food-truck/economy";
import { ledgerOf, popUpReducer, createPopUpState, type PopUpState, type TimestampedPopUpAction } from "../domain/scenario/worlds/food-truck/machine";
import { POP_UP_NUMBERS as N } from "../domain/scenario/worlds/food-truck/numbers";
import { POP_UP_LINES, type PopUpLineId, type PopUpPlan, type PopUpSumId, type SpotId, type TipClaimId } from "../domain/scenario/worlds/food-truck/types";
import type { ClaimReasonId } from "../domain/core/ids";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { SubmissionRecord } from "../platform/classes/types";

/**
 * A whole Run the Pop-Up run, headless.
 *
 * The same idea as `runChallenge.ts` and for the same reason: a test that hand-writes an event
 * log is testing a shape somebody typed rather than a shape the product produces. This drives
 * the world's own reducer through its own stages, so the log it returns is the log a browser
 * would have written, and any change to the machine that would break a real student's evidence
 * breaks these tests too.
 *
 * Every amount is computed from `numbers.ts` rather than written down, so re-pricing the market
 * leaves these runs correct instead of leaving them subtly wrong.
 */
export interface PopUpRunOptions {
  seatCode?: string;
  spotId?: SpotId;
  countCatering?: boolean;
  countRebate?: boolean;
  /** The line that gives conditional money back if it does not come. Null skips the statement. */
  coverLine?: PopUpLineId | null;
  /** Trays cooked on the first Saturday, on each of the middle two, and on the last. */
  trays?: { first?: number; middle?: number; last?: number };
  bookHelper?: boolean;
  /** What the tips jar pays for after the first Saturday, and what made the rest matter less. */
  tipClaims?: readonly TipClaimId[];
  tipReason?: ClaimReasonId;
  /** Walk past the tips jar without settling it, so an unanswered beat can be exercised. */
  skipTipClaims?: boolean;
  /** Share of the money left after stock that goes into the cushion rather than the cut. */
  cushionShare?: number;
  /** The line the student sends the last of the money to when closing the opening plan. */
  closeOpeningInto?: PopUpLineId;
  /** Close the opening plan with the steppers instead, so no line is ever named. */
  closeByHand?: boolean;
  /** Which lines the generator money comes out of, in order. */
  repairOrder?: readonly PopUpLineId[];
  /** Reach for money that is already committed, this many times, before repairing. */
  reachForCommitted?: number;
  /** Sums the student gets wrong once before getting right. */
  fumbleSums?: readonly PopUpSumId[];
  /** Sums the student never gets right. */
  missSums?: readonly PopUpSumId[];
  /** Interactions the student opens the step-by-step help on before acting. */
  scaffold?: readonly string[];
  writeUpText?: string;
  /** Stop before the write-up, so an unfinished attempt can be exercised. */
  skipWriteUp?: boolean;
  /** Stop before the repair board, so a run that never met the generator can be exercised. */
  stopAfterSaturdayThree?: boolean;
  startedAt?: number;
}

const DEFAULTS = {
  seatCode: "7",
  spotId: "middle-row" as SpotId,
  countCatering: false,
  countRebate: false,
  coverLine: "cushion" as PopUpLineId | null,
  trays: { first: 3, middle: 4, last: 4 },
  bookHelper: false,
  tipClaims: ["cool-box"] as readonly TipClaimId[],
  tipReason: "only-wanted" as ClaimReasonId,
  skipTipClaims: false,
  cushionShare: 0.55,
  closeOpeningInto: "stock" as PopUpLineId,
  closeByHand: false,
  repairOrder: ["cushion", "stock", "cut"] as readonly PopUpLineId[],
  reachForCommitted: 0,
  fumbleSums: [] as readonly PopUpSumId[],
  missSums: [] as readonly PopUpSumId[],
  scaffold: [] as readonly string[],
  writeUpText: "I kept the cushion at $350 because the generator is rented and rented things break. That meant a smaller cut for me, and I would do it again.",
  skipWriteUp: false,
  stopAfterSaturdayThree: false,
};

function toStep(value: number, step: number): number {
  return Math.max(0, Math.round(value / step) * step);
}

/** The opening plan this run is aiming at: stock enough for the trays, then a split. */
export function openingPlanFor(options: PopUpRunOptions = {}): PopUpPlan {
  const opts = { ...DEFAULTS, ...options, trays: { ...DEFAULTS.trays, ...options.trays } };
  const available = availableToPlan(N, opts.spotId, { catering: opts.countCatering, rebate: opts.countRebate });
  const stock = Math.min(available, orderCost(N, opts.trays.first + opts.trays.middle * 2 + opts.trays.last));
  const rest = available - stock;
  const cushion = Math.min(rest, toStep(rest * opts.cushionShare, N.planIncrement));
  return { stock: dollars(stock), cushion: dollars(cushion), cut: dollars(rest - cushion) };
}

export function runPopUp(options: PopUpRunOptions = {}): PopUpState {
  const opts = { ...DEFAULTS, ...options, trays: { ...DEFAULTS.trays, ...options.trays } };
  let at = options.startedAt ?? 1_780_000_000_000;
  let state = createPopUpState(at);
  const send = (action: TimestampedPopUpAction) => {
    at += 1000;
    state = popUpReducer(state, { ...action, at });
  };

  const sum = (sumId: PopUpSumId, expected: number) => {
    if (opts.scaffold.includes(sumId)) send({ type: "SCAFFOLD_OPENED", interactionId: sumId });
    if (opts.missSums.includes(sumId)) {
      send({ type: "POPUP_SUM_SUBMITTED", sumId, raw: String(expected + 40), value: dollars(expected + 40), correct: false });
      return;
    }
    if (opts.fumbleSums.includes(sumId)) {
      send({ type: "POPUP_SUM_SUBMITTED", sumId, raw: String(expected + 40), value: dollars(expected + 40), correct: false });
    }
    send({ type: "POPUP_SUM_SUBMITTED", sumId, raw: String(expected), value: dollars(expected), correct: true });
  };

  send({ type: "SESSION_STARTED", sessionId: `session-${opts.seatCode.padStart(8, "0")}`, classCode: "H4KVW", seatCode: opts.seatCode });

  // Beat 2a — the booth.
  send({ type: "GO_TO_STAGE", stage: "popup-spot" });
  send({ type: "POPUP_SPOT_SELECTED", spotId: opts.spotId });
  sum("owed-up-front", owedUpFront(N, opts.spotId));

  // Beat 2b — the two pieces of money with a rule on them.
  send({ type: "GO_TO_STAGE", stage: "popup-money" });
  send({ type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: opts.countCatering });
  send({ type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "rebate", counted: opts.countRebate });
  sum("cash-to-plan", cashToPlan(N, opts.spotId));

  // Beat 2c — the opening plan.
  send({ type: "GO_TO_STAGE", stage: "popup-plan" });
  if (opts.scaffold.includes("opening")) send({ type: "SCAFFOLD_OPENED", interactionId: "opening" });
  if ((opts.countCatering || opts.countRebate) && opts.coverLine) {
    send({ type: "POPUP_COVER_LINE_NAMED", line: opts.coverLine });
  }
  const plan = openingPlanFor(options);
  if (opts.closeByHand) {
    for (const line of POP_UP_LINES) send({ type: "POPUP_LINE_CHANGED", board: "opening", line, amount: plan[line] });
  } else {
    for (const line of POP_UP_LINES) {
      if (line === opts.closeOpeningInto) continue;
      send({ type: "POPUP_LINE_CHANGED", board: "opening", line, amount: plan[line] });
    }
    send({ type: "POPUP_REMAINDER_ASSIGNED", board: "opening", line: opts.closeOpeningInto, amount: plan[opts.closeOpeningInto] });
  }
  send({ type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" });

  // Beat 3 — the Saturdays.
  sum("first-order", orderCost(N, opts.trays.first));
  send({ type: "POPUP_STOCK_ORDERED", saturday: 1, trays: opts.trays.first });
  if (!opts.skipTipClaims) {
    send({ type: "POPUP_CLAIMS_SETTLED", fundedIds: opts.tipClaims, reason: opts.tipReason });
  }
  send({ type: "POPUP_HELPER_DECIDED", booked: opts.bookHelper });
  send({ type: "POPUP_STOCK_ORDERED", saturday: 2, trays: opts.trays.middle });
  if (opts.stopAfterSaturdayThree) return state;

  // Beat 4 — the generator.
  sum("swap-gap", swapBill(N));
  send({ type: "GO_TO_STAGE", stage: "popup-repair" });
  for (let attempt = 0; attempt < opts.reachForCommitted; attempt += 1) {
    send({ type: "POPUP_LOCKED_MOVE_ATTEMPTED", board: "repair", lockedId: "booth" });
  }
  if (opts.scaffold.includes("repair")) send({ type: "SCAFFOLD_OPENED", interactionId: "repair" });

  const held = ledgerOf(state).held;
  const bill = swapBill(N);
  let outstanding: number = bill;
  const after: PopUpPlan = { ...held };
  for (const line of [...opts.repairOrder, ...POP_UP_LINES.filter((entry) => !opts.repairOrder.includes(entry))]) {
    if (outstanding === 0) break;
    const give = Math.min(outstanding, after[line]);
    after[line] = dollars(after[line] - give);
    outstanding -= give;
    send({ type: "POPUP_LINE_CHANGED", board: "repair", line, amount: after[line] });
  }
  send({
    type: "POPUP_PLAN_SAVE_REQUESTED",
    board: "repair",
    // A run that genuinely cannot cover the swap names the shortfall rather than pretending.
    ...(outstanding > 0 ? { acknowledgedResidual: dollars(Math.round(outstanding)) } : {}),
  });
  send({ type: "POPUP_STOCK_ORDERED", saturday: 4, trays: opts.trays.last });

  // Beat 5 — the organiser's question.
  if (opts.skipWriteUp) return state;
  send({ type: "GO_TO_STAGE", stage: "popup-writeup" });
  send({ type: "POPUP_WRITEUP_SUBMITTED", tileIds: ["takings", "binned"], text: opts.writeUpText });
  return state;
}

/** The same run, packaged the way the class service stores it. */
export function buildPopUpSubmission(options: PopUpRunOptions = {}): SubmissionRecord {
  const state = runPopUp(options);
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
