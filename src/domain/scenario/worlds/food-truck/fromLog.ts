import { dollars } from "../../../core/money";
import type { EvidenceEvent } from "../../../evidence/types";
import { EMPTY_PLAN, popUpLedger, type LedgerInput, type PopUpLedger } from "./ledger";
import { POP_UP_NUMBERS } from "./numbers";
import { POP_UP_LINES, type PopUpLineId, type PopUpNumbers, type PopUpPlan, type SpotId } from "./types";

/**
 * A finished market run, rebuilt from the log a teacher's browser actually holds.
 *
 * The machine can answer "where did the money go" because it is holding the state. Every
 * educator surface is holding a log instead, and it was answering the same question by
 * guessing: the share-out told a whole room that a named child's *"cushion covered the
 * generator in full"* on the strength of `residual === 0`, which is true of a student who
 * emptied the cushion, a student who took two dollars off it, and a student who never
 * touched it. One of the three sentences is right and the product had no way of knowing
 * which.
 *
 * So the reconstruction is here, once, rather than a per-surface heuristic. Every decision
 * the ledger needs is a decision the student made out loud and the log recorded — the booth,
 * the two pieces of conditional money, the line named to give them back, the saved opening
 * plan, the trays cooked on each Saturday, the helper, and the saved repair plan. Nothing is
 * inferred and nothing is averaged, so `popUpLedgerFromLog(log)` and `ledgerOf(state)` are
 * the same ledger read two ways.
 *
 * The one thing this file adds that the ledger does not is **which line gave what**. The
 * ledger reports `freed` as a total because the board only ever needed the total; a sentence
 * with a line's name in it needs the split, and a sentence with a line's name in it is what
 * a teacher reads out.
 */

interface Payload { [key: string]: unknown }

function payloadOf(event: EvidenceEvent): Payload {
  return (event.payload ?? {}) as Payload;
}

function planFrom(value: unknown): PopUpPlan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (POP_UP_LINES.some((line) => typeof record[line] !== "number")) return null;
  return { stock: dollars(record.stock as number), cushion: dollars(record.cushion as number), cut: dollars(record.cut as number) };
}

/** The last plan this board was actually saved with, or `null` where it never was. */
function savedPlan(log: readonly EvidenceEvent[], board: "opening" | "repair"): PopUpPlan | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const event = log[index]!;
    if (event.type !== "POPUP_PLAN_SAVED") continue;
    const payload = payloadOf(event);
    if (payload.board !== board) continue;
    const snapshot = payload.snapshot as { plan?: unknown } | undefined;
    const plan = planFrom(snapshot?.plan);
    if (plan) return plan;
  }
  return null;
}

/**
 * The decisions the ledger prices, read off one student's own events.
 *
 * A run that stopped early simply produces the input it got as far as: a `null` repair is a
 * repair that never happened, not a repair of zero, and the ledger already knows the
 * difference.
 */
export function ledgerInputFromLog(log: readonly EvidenceEvent[]): LedgerInput {
  let spotId: SpotId | null = null;
  const counted = { catering: false, rebate: false };
  let coverLine: PopUpLineId | null = null;
  let helper: boolean | null = null;
  const trays: { first: number | null; middle: number | null; last: number | null } = { first: null, middle: null, last: null };

  for (const event of log) {
    const payload = payloadOf(event);
    switch (event.type) {
      case "POPUP_SPOT_SELECTED":
        spotId = payload.spotId as SpotId;
        break;
      case "POPUP_CONDITIONAL_MONEY_DECIDED": {
        const source = payload.sourceId as "catering" | "rebate";
        if (source === "catering" || source === "rebate") counted[source] = payload.counted === true;
        // The machine drops a named cover line the moment nothing conditional is left to
        // cover, and a reconstruction that kept it would price a give-back that cannot happen.
        if (!counted.catering && !counted.rebate) coverLine = null;
        break;
      }
      case "POPUP_COVER_LINE_NAMED":
        coverLine = payload.line as PopUpLineId;
        break;
      case "POPUP_HELPER_DECIDED":
        helper = payload.booked === true;
        break;
      case "POPUP_STOCK_ORDERED": {
        const saturday = Number(payload.saturday);
        const ordered = Math.max(0, Math.round(Number(payload.trays ?? 0)));
        if (saturday === 1) trays.first = ordered;
        // Saturdays 2 and 3 are one standing order, exactly as the machine records them.
        if (saturday === 2 || saturday === 3) trays.middle = ordered;
        if (saturday === 4) trays.last = ordered;
        break;
      }
      default:
        break;
    }
  }

  const opening = savedPlan(log, "opening");
  return {
    spotId,
    counted,
    opening: opening ?? EMPTY_PLAN,
    openingSaved: opening !== null,
    coverLine,
    trays,
    helper,
    repair: savedPlan(log, "repair"),
  };
}

export function popUpLedgerFromLog(log: readonly EvidenceEvent[], n: PopUpNumbers = POP_UP_NUMBERS): PopUpLedger {
  return popUpLedger(ledgerInputFromLog(log), n);
}

/** One line, and what the repair took off it. */
export interface FreedLine {
  line: PopUpLineId;
  amount: number;
}

export interface RepairSplit {
  /** Whether the repair board was ever saved. Nothing below means anything if it was not. */
  settled: boolean;
  /** What the generator cost. */
  bill: number;
  /** What the student found, in total. */
  freed: number;
  /** What the bill is still short by, after everything they moved. */
  residual: number;
  /** Every line the money actually came off, largest first. Empty where none did. */
  lines: readonly FreedLine[];
  /** The one line that covered the whole bill on its own, or `null` where none did. */
  soleLine: PopUpLineId | null;
}

/**
 * Where the generator money actually came from.
 *
 * This is the fact the share-out was asserting without holding. `soleLine` is deliberately
 * strict — one line, the whole bill, nothing off the other two — because that is the only
 * shape under which a sentence naming one line is true.
 */
export function repairSplitFromLog(log: readonly EvidenceEvent[], n: PopUpNumbers = POP_UP_NUMBERS): RepairSplit {
  const input = ledgerInputFromLog(log);
  const ledger = popUpLedger(input, n);
  if (!input.repair) {
    return { settled: false, bill: ledger.bill, freed: 0, residual: ledger.bill, lines: [], soleLine: null };
  }
  const held = ledger.held;
  const after = ledger.afterRepair;
  const lines = POP_UP_LINES
    .map((line) => ({ line, amount: Math.max(0, held[line] - after[line]) }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount || POP_UP_LINES.indexOf(a.line) - POP_UP_LINES.indexOf(b.line));
  const soleLine = lines.length === 1 && ledger.residual === 0 ? lines[0]!.line : null;
  return { settled: true, bill: ledger.bill, freed: ledger.freed, residual: ledger.residual, lines, soleLine };
}
