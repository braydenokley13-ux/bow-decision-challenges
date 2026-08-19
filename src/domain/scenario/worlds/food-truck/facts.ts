import { dollars, type Dollars } from "../../../core/money";
import type { CompetingClaimsSettlement, EvidenceEvent, SupportLevel } from "../../../evidence/types";
import type { PopUpBoardId, PopUpLineId, PopUpSourceId, PopUpSumId, SpotId } from "./types";

/**
 * What a Run the Pop-Up log says happened, without saying what any of it is worth.
 *
 * The split is the same one Basketball draws between `facts.ts` and `observe.ts`, and it is
 * worth keeping: this file reads events and counts, and it contains no rubric, no level and
 * no judgement. Everything a teacher will ever read as a claim about a student is produced one
 * file over, from these numbers, where the rule can be read on its own.
 */

export interface PopUpSumEvidence {
  sumId: PopUpSumId;
  attempts: { raw: string; value: Dollars | null; correct: boolean; eventRef: string }[];
  support: SupportLevel;
  supplied: boolean;
}

/** Where one line's figure came from, as the save event recorded it. */
export interface PopUpLineOrigin {
  amountSource: "typed" | "suggested" | "remainder";
  revised: boolean;
}

export interface PopUpBoardEvidence {
  entered: boolean;
  saved: boolean;
  /**
   * Where each figure on this board came from, for the lines the student actually moved.
   *
   * A line missing from this map was never touched. That is a different fact from "set to
   * nothing", and the difference is the one the teacher's page was getting wrong: three
   * students were reported as having planned a savings figure on a line they never opened.
   */
  lineSources: Partial<Record<PopUpLineId, PopUpLineOrigin>>;
  /** How the board stood at the first save the student asked for, before anything was fixed. */
  firstSaveBalance: Dollars;
  balance: Dollars;
  /** Money the board is holding with no job. */
  unassigned: Dollars;
  /** Money taken off the lines that can still move. Repair board only. */
  freed: Dollars;
  /** The most that could have been freed — the smaller of the bill and the money that moves. */
  freeable: Dollars;
  residual: Dollars;
  residualAcknowledged: boolean;
  /** Saves asked for that the board would not take. */
  savesBeforeAcceptable: number;
  /** Times the student reached for money that is already committed. */
  lockedMoveAttempts: number;
  support: SupportLevel;
  evidenceRefs: string[];
}

/** One moment where the student sent the money still unassigned to a named line. */
export interface PopUpRemainderChoice {
  board: PopUpBoardId;
  line: PopUpLineId;
  amount: Dollars;
  /**
   * What was still unassigned afterwards, and the field that decides what the move meant.
   * Zero means this line took the last of the money and closed the plan. Anything else means
   * the line filled up on the way past — a deliberate figure being placed.
   */
  remaining: Dollars;
  sequence: number;
  supportLevel: SupportLevel;
  evidenceRef: string;
}

export interface PopUpFacts {
  sums: Partial<Record<PopUpSumId, PopUpSumEvidence>>;
  spotId: SpotId | null;
  counted: Record<PopUpSourceId, boolean>;
  /** The line named to give conditional money back from, and when it was named. */
  cover: { line: PopUpLineId; sequence: number; evidenceRef: string } | null;
  opening: PopUpBoardEvidence;
  repair: PopUpBoardEvidence;
  /** Every "put the rest here" on the opening board, in the order they were made. */
  openingRemainder: PopUpRemainderChoice[];
  /** The tips jar, settled: what it paid for and what the student said about the rest. */
  tipClaims: { settlement: CompetingClaimsSettlement; supportLevel: SupportLevel; evidenceRef: string } | null;
  writeUp: { submitted: boolean; evidenceRefs: string[] };
}

function emptyBoard(): PopUpBoardEvidence {
  return {
    entered: false,
    saved: false,
    firstSaveBalance: dollars(0),
    balance: dollars(0),
    unassigned: dollars(0),
    freed: dollars(0),
    freeable: dollars(0),
    residual: dollars(0),
    residualAcknowledged: false,
    lineSources: {},
    savesBeforeAcceptable: 0,
    lockedMoveAttempts: 0,
    support: "standard_access",
    evidenceRefs: [],
  };
}

interface SavePayload {
  board: PopUpBoardId;
  lineSources?: Partial<Record<PopUpLineId, PopUpLineOrigin>>;
  balance: number;
  unassigned: number;
  freed: number;
  freeable: number;
  residual: number;
  acknowledgedResidual?: number;
}

export function derivePopUpFacts(log: readonly EvidenceEvent[]): PopUpFacts {
  const facts: PopUpFacts = {
    sums: {},
    spotId: null,
    counted: { catering: false, rebate: false },
    cover: null,
    opening: emptyBoard(),
    repair: emptyBoard(),
    openingRemainder: [],
    tipClaims: null,
    writeUp: { submitted: false, evidenceRefs: [] },
  };
  const boards: Record<PopUpBoardId, PopUpBoardEvidence> = { opening: facts.opening, repair: facts.repair };
  const firstSaveSeen: Partial<Record<PopUpBoardId, boolean>> = {};

  for (const event of log) {
    const payload = event.payload as Record<string, unknown>;
    switch (event.type) {
      case "STAGE_ENTERED": {
        const stage = payload.stage;
        if (stage === "popup-plan") boards.opening.entered = true;
        if (stage === "popup-repair") boards.repair.entered = true;
        break;
      }
      case "POPUP_SUM_SUBMITTED": {
        const sumId = payload.sumId as PopUpSumId;
        const existing = facts.sums[sumId] ?? { sumId, attempts: [], support: event.supportLevel, supplied: false };
        existing.attempts.push({
          raw: typeof payload.raw === "string" ? payload.raw : "",
          value: (payload.value ?? null) as Dollars | null,
          correct: payload.correct === true,
          eventRef: event.id,
        });
        // The strongest support the student had on any attempt stands for the whole checkpoint.
        if (event.supportLevel !== "standard_access") existing.support = event.supportLevel;
        facts.sums[sumId] = existing;
        break;
      }
      case "SHOW_AND_CONTINUE_USED": {
        const interactionId = payload.interactionId as PopUpSumId;
        const existing = facts.sums[interactionId];
        if (existing) {
          existing.supplied = true;
          existing.support = "answer_supplied";
        }
        break;
      }
      case "POPUP_SPOT_SELECTED":
        facts.spotId = payload.spotId as SpotId;
        break;
      case "POPUP_CONDITIONAL_MONEY_DECIDED":
        facts.counted = { ...facts.counted, [payload.sourceId as PopUpSourceId]: payload.counted === true };
        // Nothing conditional left in the plan means nothing to give back.
        if (!facts.counted.catering && !facts.counted.rebate) facts.cover = null;
        break;
      case "POPUP_COVER_LINE_NAMED":
        facts.cover = { line: payload.line as PopUpLineId, sequence: event.sequence, evidenceRef: event.id };
        break;
      case "POPUP_REMAINDER_ASSIGNED": {
        const board = payload.board as PopUpBoardId;
        if (board !== "opening") break;
        facts.openingRemainder.push({
          board,
          line: payload.line as PopUpLineId,
          amount: dollars(Number(payload.amount ?? 0)),
          remaining: dollars(Number(payload.remaining ?? 0)),
          sequence: event.sequence,
          supportLevel: event.supportLevel,
          evidenceRef: event.id,
        });
        break;
      }
      case "POPUP_LOCKED_MOVE_ATTEMPTED": {
        const board = boards[payload.board as PopUpBoardId];
        if (board) board.lockedMoveAttempts += 1;
        break;
      }
      case "POPUP_PLAN_SAVE_REQUESTED": {
        const save = payload as unknown as SavePayload;
        const board = boards[save.board];
        if (!board) break;
        board.entered = true;
        if (!firstSaveSeen[save.board]) {
          firstSaveSeen[save.board] = true;
          board.firstSaveBalance = dollars(save.balance);
        }
        board.balance = dollars(save.balance);
        board.unassigned = dollars(save.unassigned);
        board.freed = dollars(save.freed);
        board.freeable = dollars(save.freeable);
        board.residual = dollars(save.residual);
        board.residualAcknowledged = save.acknowledgedResidual !== undefined;
        // The last save is the plan the student went with, so the last save's origins are the
        // ones that describe it.
        board.lineSources = (payload.lineSources as Partial<Record<PopUpLineId, PopUpLineOrigin>> | undefined) ?? board.lineSources;
        if (event.supportLevel !== "standard_access") board.support = event.supportLevel;
        board.evidenceRefs.push(event.id);
        break;
      }
      case "POPUP_PLAN_SAVED": {
        const board = boards[payload.board as PopUpBoardId];
        if (!board) break;
        board.saved = true;
        board.evidenceRefs.push(event.id);
        break;
      }
      case "COMPETING_CLAIMS_SETTLED":
        // The one event this world shares with the other, so it is the one that has to be
        // gated on who wrote it. Reading a season student's Week 3 here would name Avery's
        // shoes with a cool box's fiction, and the envelope already says which world it is.
        if (event.worldId !== "food-truck") break;
        facts.tipClaims = {
          settlement: payload as unknown as CompetingClaimsSettlement,
          supportLevel: event.supportLevel,
          evidenceRef: event.id,
        };
        break;
      case "POPUP_WRITEUP_SUBMITTED":
        facts.writeUp = { submitted: true, evidenceRefs: [...facts.writeUp.evidenceRefs, event.id] };
        break;
      default:
        break;
    }
  }

  // A save the board would not take is a save the student asked for and did not get. It is
  // counted after the walk so the arithmetic cannot disagree with the two event streams.
  for (const board of ["opening", "repair"] as const) {
    const requested = log.filter((event) => event.type === "POPUP_PLAN_SAVE_REQUESTED" && (event.payload as { board?: string }).board === board).length;
    const taken = log.filter((event) => event.type === "POPUP_PLAN_SAVED" && (event.payload as { board?: string }).board === board).length;
    boards[board].savesBeforeAcceptable = Math.max(0, requested - taken);
  }

  return facts;
}
