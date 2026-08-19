import { dollars, type Dollars } from "../../../core/money";
import type { ClaimReasonId } from "../../../core/ids";
import type { CompetingClaimsSettlement, EvidenceEvent, EvidenceEventType, StageId, SupportLevel } from "../../../evidence/types";
import { costOfTipClaims, TIP_CLAIM_IDS } from "./claims";
import { PLAN_UNDER_PRESSURE } from "../../../../platform/challenges/registry";
import { orderCost, payForTrays, playSaturday, rebateEarned } from "./economy";
import { EMPTY_PLAN, planSum, popUpLedger, type LedgerInput, type PopUpLedger } from "./ledger";
import { POP_UP_NUMBERS } from "./numbers";
import type { PopUpBoardId, PopUpLineId, PopUpNumbers, PopUpPlan, PopUpSourceId, PopUpSumId, SaturdayNumber, SpotId, TipClaimId } from "./types";
import { popUpEvidenceRequirementsForEvent, popUpCompetenciesForEvent } from "./eventEvidence";

/**
 * Run the Pop-Up's own stage machine.
 *
 * It is a second machine rather than a second branch inside the first one. §7.1 draws the
 * line exactly here: the envelope, the support taxonomy and the rubric are shared, and the
 * interior — what a stage is, what a decision is, what money does — belongs to the world. A
 * reducer that had to serve both would be a reducer with a world id in it, and the first
 * thing that goes wrong when a shared machine grows a world id is that one world's economy
 * prices another world's board.
 *
 * What is shared, and deliberately: the event envelope every action writes, the four support
 * levels, and the fact that ordering comes from `sequence` rather than from the clock.
 */

export interface PopUpSumState {
  raw: string;
  value: Dollars | null;
  attempts: number;
  correct: boolean;
  supplied: boolean;
}

/**
 * How a figure on a board arrived, and whether the student revisited it.
 *
 * `typed` is the steppers: the student set this number. `suggested` is the split the board
 * fills in for a student who could not balance one — the same help the calculations offer,
 * and no more a statement about them than being handed an answer is. `remainder` is the card
 * that sends what is left to a named line: the student chose the *line* and the arithmetic
 * chose the *amount*, which is exactly why it is neither of the other two.
 *
 * `revised` is how a figure earns itself back. A suggested or leftover number the student then
 * moved by hand is a number they set, and the evidence should say so.
 */
export interface PopUpLineSource {
  amountSource: "typed" | "suggested" | "remainder";
  revised: boolean;
}

export interface PopUpSnapshot {
  id: string;
  sequence: number;
  board: PopUpBoardId;
  plan: PopUpPlan;
  /** Priced with the numbers in force at save time, so a re-pricing cannot rewrite a result. */
  readout: { available: Dollars; assigned: Dollars; balance: Dollars; freed: Dollars; residual: Dollars };
  acknowledgedResidual?: Dollars;
}

export interface PopUpState {
  meta: {
    schemaVersion: 1;
    sessionId: string;
    classCode: string;
    seatCode: string;
    challengeId: string;
    assignmentId: string;
    challengeVersion: string;
    worldId: "food-truck";
    startedAt: number;
    updatedAt: number;
    completedAt?: number;
  };
  stage: StageId;
  stageHistory: StageId[];
  sums: Partial<Record<PopUpSumId, PopUpSumState>>;
  spotId: SpotId | null;
  /** Whether each piece of conditional money was written into the plan. */
  counted: Record<PopUpSourceId, boolean>;
  /** The line the student named to give money back from if a condition is not met. */
  coverLine: PopUpLineId | null;
  /**
   * The line the student named to pay for the last Saturday's food past the stock line.
   *
   * It is set by the order itself rather than by a decision of its own, because that is what
   * it is: "cook six trays, and the last $310 of it comes off my cut" is one sentence and one
   * commitment. `economy.ts` carries why this night can reach another line and no other can.
   */
  foodLine: PopUpLineId | null;
  drafts: Partial<Record<PopUpBoardId, PopUpPlan>>;
  /**
   * Where each line's figure came from, and whether the student went back to it.
   *
   * A line that never appears here was never moved: its figure is the board's own zero, and
   * nothing about the student can be read off it. That distinction is the whole point. Three
   * children were reported to their teacher as having planned a savings figure —
   * `Independently` — on a line they had not touched, because the board can reach any amount
   * one way or another and the log only recorded the amounts.
   */
  lineSources: Partial<Record<PopUpBoardId, Partial<Record<PopUpLineId, PopUpLineSource>>>>;
  saved: Partial<Record<PopUpBoardId, string>>;
  snapshots: PopUpSnapshot[];
  /** Trays ordered for the first Saturday, for each of the middle two, and for the last. */
  trays: { first: number | null; middle: number | null; last: number | null };
  helper: boolean | null;
  /** The tips jar, once the student has said what it pays for and what it does not. */
  tipClaims: { fundedIds: readonly TipClaimId[]; reason: ClaimReasonId } | null;
  log: EvidenceEvent[];
  support: Partial<Record<string, SupportLevel>>;
  writeUp: { tileIds: string[]; text: string };
}

export type PopUpAction =
  | { type: "GO_TO_STAGE"; stage: StageId }
  | { type: "SESSION_STARTED"; sessionId: string; classCode: string; seatCode: string; assignmentId?: string }
  | { type: "POPUP_SUM_SUBMITTED"; sumId: PopUpSumId; raw: string; value: Dollars | null; correct: boolean }
  | { type: "POPUP_SPOT_SELECTED"; spotId: SpotId }
  | { type: "POPUP_CONDITIONAL_MONEY_DECIDED"; sourceId: PopUpSourceId; counted: boolean }
  /** "If it does not come, this line gives it back." Named before the plan is committed. */
  | { type: "POPUP_COVER_LINE_NAMED"; line: PopUpLineId }
  /**
   * One line moved on a board. `from` is "suggested" only for the split the board fills in
   * when a student cannot balance one; everything a student touches themselves is typed.
   */
  | { type: "POPUP_LINE_CHANGED"; board: PopUpBoardId; line: PopUpLineId; amount: Dollars; from?: "typed" | "suggested" }
  /** "Put the rest here" — the student names the line that takes what is still unassigned. */
  | { type: "POPUP_REMAINDER_ASSIGNED"; board: PopUpBoardId; line: PopUpLineId; amount: Dollars }
  | { type: "POPUP_PLAN_SAVE_REQUESTED"; board: PopUpBoardId; acknowledgedResidual?: Dollars }
  | { type: "POPUP_LOCKED_MOVE_ATTEMPTED"; board: PopUpBoardId; lockedId: string }
  /**
   * The order for one Saturday. `fromLine` is read on the last Saturday only: it is the line
   * the student named to pay for the trays their stock line will not cover.
   */
  | { type: "POPUP_STOCK_ORDERED"; saturday: SaturdayNumber; trays: number; fromLine?: PopUpLineId | null }
  | { type: "POPUP_HELPER_DECIDED"; booked: boolean }
  /** The tips jar settled: what it paid for, and what made the rest matter less. */
  | { type: "POPUP_CLAIMS_SETTLED"; fundedIds: readonly TipClaimId[]; reason: ClaimReasonId }
  | { type: "SCAFFOLD_OPENED"; interactionId: string }
  | { type: "SHOW_AND_CONTINUE_USED"; interactionId: string }
  | { type: "POPUP_WRITEUP_SUBMITTED"; tileIds: string[]; text: string };

export type TimestampedPopUpAction = PopUpAction & { at?: number };

export function createPopUpState(now = 1): PopUpState {
  return {
    meta: {
      schemaVersion: 1,
      sessionId: "",
      classCode: "",
      seatCode: "",
      challengeId: PLAN_UNDER_PRESSURE.id,
      assignmentId: "",
      challengeVersion: PLAN_UNDER_PRESSURE.version,
      worldId: "food-truck",
      startedAt: now,
      updatedAt: now,
    },
    stage: "entry",
    stageHistory: ["entry"],
    sums: {},
    spotId: null,
    counted: { catering: false, rebate: false },
    coverLine: null,
    foodLine: null,
    drafts: {},
    lineSources: {},
    saved: {},
    snapshots: [],
    trays: { first: null, middle: null, last: null },
    helper: null,
    tipClaims: null,
    log: [],
    support: {},
    writeUp: { tileIds: [], text: "" },
  };
}

/** What the ledger needs, read off the state. The draft stands in until a board is saved. */
export function ledgerInputFor(state: PopUpState): LedgerInput {
  const savedOpening = state.snapshots.find((snapshot) => snapshot.id === state.saved.opening);
  const savedRepair = state.snapshots.find((snapshot) => snapshot.id === state.saved.repair);
  return {
    spotId: state.spotId,
    counted: state.counted,
    opening: savedOpening?.plan ?? state.drafts.opening ?? EMPTY_PLAN,
    openingSaved: savedOpening !== undefined,
    coverLine: state.coverLine,
    foodLine: state.foodLine,
    trays: state.trays,
    helper: state.helper,
    repair: savedRepair?.plan ?? state.drafts.repair ?? null,
  };
}

export function ledgerOf(state: PopUpState, n: PopUpNumbers = POP_UP_NUMBERS): PopUpLedger {
  return popUpLedger(ledgerInputFor(state), n);
}

/**
 * The wall clock, supplied by whoever dispatched the action, exactly as Basketball does it.
 * Tests that do not care pass no clock and fall back to a monotonic counter.
 */
function stampFor(state: PopUpState, at?: number): number {
  return typeof at === "number" && Number.isFinite(at) ? Math.max(at, state.meta.updatedAt) : state.meta.updatedAt + 1;
}

function append<T>(
  state: PopUpState,
  type: EvidenceEventType,
  payload: T,
  supportLevel: SupportLevel = "standard_access",
  dedupeKey?: string,
  at?: number,
): PopUpState {
  if (dedupeKey && state.log.some((event) => event.dedupeKey === dedupeKey)) return state;
  const sequence = state.log.length + 1;
  const event: EvidenceEvent<T> = {
    id: `event-${sequence}`,
    sequence,
    timestamp: stampFor(state, at),
    type,
    stage: state.stage,
    challengeId: state.meta.challengeId,
    challengeVersion: state.meta.challengeVersion,
    sessionId: state.meta.sessionId,
    worldId: state.meta.worldId,
    // Concepts are Plan Under Pressure's own grouping of its own micro-skills. This world
    // speaks to none of them, and saying so is the honest answer — borrowing another world's
    // vocabulary would file this student's decisions under a scheme nothing here observes.
    conceptIds: [],
    competencyIds: popUpCompetenciesForEvent(type, payload),
    evidenceRequirementIds: popUpEvidenceRequirementsForEvent(type, payload),
    payload,
    supportLevel,
    ...(dedupeKey ? { dedupeKey } : {}),
  };
  return { ...state, log: [...state.log, event], meta: { ...state.meta, updatedAt: event.timestamp } };
}

function goTo(state: PopUpState, stage: StageId, at?: number): PopUpState {
  if (state.stage === stage) return state;
  const moved = { ...state, stage, stageHistory: [...state.stageHistory, stage] };
  return append(moved, "STAGE_ENTERED", { stage, from: state.stage }, "standard_access", `stage:${stage}`, at);
}

function supportFor(state: PopUpState, interactionId: string): SupportLevel {
  return state.support[interactionId] ?? "standard_access";
}

/**
 * The action as a payload: what the student decided, without the clock or the type tag.
 *
 * Both of those are already on the envelope. Copying the wall clock into the payload as well
 * is the difference between two runs of the same decisions producing the same log and merely
 * producing the same-shaped log, and the first is what §10.1's "deterministic rules over the
 * event log" actually needs.
 */
function decisionPayload<T extends { type: string; at?: number }>(action: T): Omit<T, "type" | "at"> {
  const copy: Record<string, unknown> = { ...action };
  delete copy.type;
  delete copy.at;
  return copy as Omit<T, "type" | "at">;
}

/**
 * One line's figure, re-sourced.
 *
 * A hand move onto a line that arrived some other way is the student taking it over, and that
 * is what `revised` records. A hand move onto a line they were already setting by hand is not
 * a revision of anything — it is the same student still typing.
 */
function withLineSource(
  sources: PopUpState["lineSources"],
  board: PopUpBoardId,
  line: PopUpLineId,
  amountSource: PopUpLineSource["amountSource"],
): PopUpState["lineSources"] {
  const onBoard = sources[board] ?? {};
  const before = onBoard[line];
  const revised = before !== undefined && (before.revised || before.amountSource !== amountSource);
  return { ...sources, [board]: { ...onBoard, [line]: { amountSource, revised } } };
}

function draftFor(state: PopUpState, board: PopUpBoardId): PopUpPlan {
  if (board === "repair") return state.drafts.repair ?? ledgerOf(state).held;
  return state.drafts.opening ?? EMPTY_PLAN;
}

/**
 * The Saturdays an order covers, played and written into the log.
 *
 * Playing a night is a consequence rather than a decision, and it is recorded because the
 * §19.2 evidence timeline has to be able to show a teacher what happened between two of a
 * student's choices. It carries what sold and what went in the bin and nothing else.
 */
function playSaturdays(state: PopUpState, saturdays: readonly SaturdayNumber[], n: PopUpNumbers, at?: number): PopUpState {
  const ledger = ledgerOf(state, n);
  let next = state;
  for (const saturday of saturdays) {
    const day = ledger.saturdays.find((entry) => entry.saturday === saturday);
    if (!day) continue;
    next = append(next, "POPUP_SATURDAY_PLAYED", {
      saturday,
      trays: day.trays,
      cooked: day.cooked,
      sold: day.sold,
      spoiled: day.spoiled,
      takings: day.takings,
      binned: day.binned,
      soldOut: day.soldOut,
      ...(saturday === 1 ? { rebateEarned: rebateEarned(n, day) } : {}),
    }, "standard_access", `saturday:${saturday}`, at);
  }
  return next;
}

export function popUpReducer(state: PopUpState, action: TimestampedPopUpAction, n: PopUpNumbers = POP_UP_NUMBERS): PopUpState {
  const at = action.at;
  switch (action.type) {
    case "GO_TO_STAGE":
      return goTo(state, action.stage, at);

    case "SESSION_STARTED": {
      const next = {
        ...state,
        meta: {
          ...state.meta,
          sessionId: action.sessionId,
          classCode: action.classCode,
          seatCode: action.seatCode,
          assignmentId: action.assignmentId ?? "",
        },
      };
      const started = append(next, action.type, decisionPayload(action), "standard_access", undefined, at);
      // Straight to the booth. The screen that used to stand in front of it said who Mo was
      // and then listed the decisions the world was about to make; the first half moved onto
      // the booth screen and the second half was a contents page.
      return goTo(append(started, "WORLD_CONFIRMED", { worldId: "food-truck" }, "standard_access", undefined, at), "popup-spot", at);
    }

    case "POPUP_SUM_SUBMITTED": {
      const previous = state.sums[action.sumId];
      const sum: PopUpSumState = {
        raw: action.raw,
        value: action.value,
        attempts: (previous?.attempts ?? 0) + 1,
        correct: action.correct,
        supplied: previous?.supplied ?? false,
      };
      return append({ ...state, sums: { ...state.sums, [action.sumId]: sum } }, action.type, decisionPayload(action), supportFor(state, action.sumId), undefined, at);
    }

    case "POPUP_SPOT_SELECTED":
      return append({ ...state, spotId: action.spotId }, action.type, decisionPayload(action), "standard_access", undefined, at);

    case "POPUP_CONDITIONAL_MONEY_DECIDED": {
      const counted = { ...state.counted, [action.sourceId]: action.counted };
      // Nothing conditional in the plan means there is nothing to give back, so a line named
      // earlier is dropped rather than left standing against money that is no longer there.
      const coverLine = counted.catering || counted.rebate ? state.coverLine : null;
      return append({ ...state, counted, coverLine }, action.type, decisionPayload(action), "standard_access", undefined, at);
    }

    case "POPUP_COVER_LINE_NAMED":
      return append({ ...state, coverLine: action.line }, action.type, decisionPayload(action), supportFor(state, "opening"), undefined, at);

    case "POPUP_LINE_CHANGED":
      return {
        ...state,
        drafts: { ...state.drafts, [action.board]: { ...draftFor(state, action.board), [action.line]: action.amount } },
        lineSources: withLineSource(state.lineSources, action.board, action.line, action.from ?? "typed"),
      };

    case "POPUP_REMAINDER_ASSIGNED": {
      // The one move on either board that is a statement rather than an adjustment: the
      // student names the line that takes whatever the rest of their plan left over. It moves
      // exactly the money the steppers move, so no plan is reachable one way and not the
      // other — what it adds is a record of which line they let the arithmetic decide.
      const current = draftFor(state, action.board);
      const moved = {
        ...state,
        drafts: { ...state.drafts, [action.board]: { ...current, [action.line]: dollars(current[action.line] + action.amount) } },
        lineSources: withLineSource(state.lineSources, action.board, action.line, "remainder"),
      };
      const ledger = ledgerOf(moved, n);
      // What is still looking for a job once this line has taken its share. Zero means the
      // line closed the plan; anything else means it filled up on the way past, which is a
      // figure being placed rather than leftovers being absorbed.
      const remaining = action.board === "opening" ? ledger.openingUnassigned : ledger.repairUnassigned;
      return append(moved, action.type, { ...decisionPayload(action), remaining }, supportFor(state, action.board), undefined, at);
    }

    case "POPUP_PLAN_SAVE_REQUESTED": {
      if (!state.spotId) return state;
      const plan = draftFor(state, action.board);
      const ledger = ledgerOf({ ...state, drafts: { ...state.drafts, [action.board]: plan } }, n);
      const opening = action.board === "opening";
      const readout = {
        available: opening ? ledger.available : ledger.bill,
        assigned: planSum(plan),
        balance: opening ? ledger.openingBalance : dollars(0 - ledger.residual),
        freed: opening ? dollars(0) : ledger.freed,
        residual: opening ? dollars(0) : ledger.residual,
      };
      const unassigned = opening ? ledger.openingUnassigned : ledger.repairUnassigned;
      let next = append(state, action.type, {
        board: action.board,
        plan,
        ...readout,
        unassigned,
        freeable: ledger.freeable,
        // Where each figure on this board came from. A line missing from this map was never
        // moved, and the absence is the honest form of "the student said nothing about it".
        lineSources: state.lineSources[action.board] ?? {},
        ...(action.acknowledgedResidual !== undefined ? { acknowledgedResidual: action.acknowledgedResidual } : {}),
      }, supportFor(state, action.board), undefined, at);

      // A board that does not add up is recorded and not committed. The exception is the
      // repair, where a shortfall the student names out loud is a real answer (§10.2) — but
      // money taken off a line and left nowhere never is.
      const settled = opening
        ? ledger.openingBalance === 0
        : unassigned === 0 && (ledger.residual === 0 || action.acknowledgedResidual !== undefined);
      if (!settled) return next;

      const sequence = next.log.length + 1;
      const snapshot: PopUpSnapshot = {
        id: `snapshot-${sequence}`,
        sequence,
        board: action.board,
        plan,
        readout,
        ...(action.acknowledgedResidual !== undefined ? { acknowledgedResidual: action.acknowledgedResidual } : {}),
      };
      next = { ...next, snapshots: [...next.snapshots, snapshot], saved: { ...next.saved, [action.board]: snapshot.id } };
      next = append(next, "POPUP_PLAN_SAVED", {
        board: action.board,
        snapshot,
        balance: readout.balance,
        lineSources: state.lineSources[action.board] ?? {},
      }, supportFor(state, action.board), undefined, at);
      // The opening board hands over to the first Saturday. The repair board does not move
      // anywhere: the money has been found, and the next thing on the same screen is deciding
      // what the last Saturday can now afford to cook.
      return opening ? goTo(next, "popup-first-saturday", at) : next;
    }

    case "POPUP_LOCKED_MOVE_ATTEMPTED":
      return append(state, action.type, decisionPayload(action), supportFor(state, action.board), undefined, at);

    case "POPUP_HELPER_DECIDED":
      return append({ ...state, helper: action.booked }, action.type, decisionPayload(action), "standard_access", undefined, at);

    case "POPUP_CLAIMS_SETTLED": {
      // The one event this world writes that another world also writes. The payload is the
      // shared shape, so the evidence a market student produces about which claim mattered
      // pools with the evidence a season student produces about the same question — which is
      // §9.1's whole claim, and the reason none of these fields is named for a food truck.
      const fundedIds = TIP_CLAIM_IDS.filter((id) => action.fundedIds.includes(id));
      const unfundedIds = TIP_CLAIM_IDS.filter((id) => !fundedIds.includes(id));
      const spent = dollars(costOfTipClaims(fundedIds, n));
      const settlement: CompetingClaimsSettlement = {
        cash: n.tips.cash,
        fundedIds,
        unfundedIds,
        spent,
        leftOver: dollars(Math.max(0, n.tips.cash - spent)),
        reason: action.reason,
      };
      return append(
        { ...state, tipClaims: { fundedIds, reason: action.reason } },
        "COMPETING_CLAIMS_SETTLED", settlement, "standard_access", undefined, at,
      );
    }

    case "POPUP_STOCK_ORDERED": {
      if (!state.spotId) return state;
      const key = action.saturday === 1 ? "first" : action.saturday === 4 ? "last" : "middle";
      const trays = Math.max(0, Math.round(action.trays));
      // Only the last Saturday can reach past the stock line, and only to the line the
      // student named on the order itself.
      const fromLine = action.saturday === n.saturdays ? action.fromLine ?? null : null;
      // Where the money actually comes off, priced with the same function that will buy the
      // trays, so the log says what the ledger did rather than what the screen guessed.
      const spend = payForTrays(n, ledgerOf({ ...state, foodLine: fromLine }, n).afterRepair, trays, fromLine);
      const ordered = { ...state, foodLine: fromLine, trays: { ...state.trays, [key]: trays } };
      let next = append(ordered, action.type, {
        saturday: action.saturday,
        trays,
        cost: orderCost(n, trays),
        ...(action.saturday === n.saturdays
          ? { fromStock: spend.fromStock, fromLine: spend.fromLine, ...(fromLine ? { line: fromLine } : {}) }
          : {}),
      }, "standard_access", undefined, at);
      if (action.saturday === 1) {
        next = playSaturdays(next, [1], n, at);
        return goTo(next, "popup-standing-order", at);
      }
      if (action.saturday === 4) {
        next = playSaturdays(next, [4], n, at);
        return goTo(next, "popup-settle", at);
      }
      next = playSaturdays(next, [2, 3], n, at);
      return goTo(next, "popup-generator", at);
    }

    case "SCAFFOLD_OPENED":
      return append(
        { ...state, support: { ...state.support, [action.interactionId]: "direct_scaffold" as const } },
        action.type, decisionPayload(action), "direct_scaffold", undefined, at,
      );

    case "SHOW_AND_CONTINUE_USED": {
      const supplied = { ...state.sums };
      const sum = supplied[action.interactionId as PopUpSumId];
      if (sum) supplied[action.interactionId as PopUpSumId] = { ...sum, supplied: true };
      return append(
        { ...state, sums: supplied, support: { ...state.support, [action.interactionId]: "answer_supplied" as const } },
        action.type, decisionPayload(action), "answer_supplied", undefined, at,
      );
    }

    case "POPUP_WRITEUP_SUBMITTED": {
      const next = {
        ...state,
        writeUp: { tileIds: action.tileIds, text: action.text },
        meta: { ...state.meta, completedAt: state.meta.updatedAt + 1 },
      };
      return goTo(append(next, action.type, decisionPayload(action), "standard_access", undefined, at), "popup-submitted", at);
    }
  }
}

/** What a Saturday would do with this many trays, for a screen that shows it before ordering. */
export function previewSaturday(state: PopUpState, saturday: SaturdayNumber, trays: number, n: PopUpNumbers = POP_UP_NUMBERS) {
  if (!state.spotId) return null;
  return playSaturday(n, state.spotId, saturday, trays, state.helper === true);
}
