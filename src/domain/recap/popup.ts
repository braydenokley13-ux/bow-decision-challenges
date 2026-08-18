import type { ClaimReasonId } from "../core/ids";
import type { CompetingClaimsSettlement } from "../evidence/types";
import { POP_UP_SCENARIO } from "../scenario/worlds/food-truck";
import { POP_UP_NUMBERS as N } from "../scenario/worlds/food-truck/numbers";
import type { PopUpLineId, PopUpPlan, SpotId } from "../scenario/worlds/food-truck/types";
import { eventsOfType, listed, money, note, notesForTried, payloadOf, reached, times, topicOf, triedAt, type Log } from "./log";
import type { RecapNote, RecapTopic } from "./types";

/**
 * Run the Pop-Up, said back to the student who played it.
 *
 * Same six ideas as the season, same order, same concept names, and not one shared
 * sentence. That is the whole of §9.1 on the student's side of the product: a market
 * student and a season student get the same kind of thing back, each in the story they
 * actually played, and neither of them is handed the other's nouns.
 */

const LINES: readonly PopUpLineId[] = ["stock", "cushion", "cut"];

const TIP_CLAIM_TITLES: Record<string, string> = {
  "cool-box": "the seal for the cool box",
  "cleaner-share": "your share of the night cleaner",
  "truck-sign": "a painted sign for the truck",
};

const REASON_SAID: Record<ClaimReasonId, string> = {
  "only-wanted": "it was the one you only wanted",
  "no-one-counting": "nobody else was counting on it",
  "can-wait": "it could wait, even at a price",
  cheapest: "it was the cheapest one to drop",
};

const SPOT_TITLES: Record<string, string> = Object.fromEntries(
  POP_UP_SCENARIO.spots.map((spot) => [spot.id, spot.title]),
);

const LINE_LABELS: Record<PopUpLineId, string> = {
  stock: POP_UP_SCENARIO.lines.stock.label,
  cushion: POP_UP_SCENARIO.lines.cushion.label,
  cut: POP_UP_SCENARIO.lines.cut.label,
};

const CONDITIONAL_SOURCES: Record<string, string> = {
  catering: `the ${money(N.catering.amount)} catering job`,
  rebate: `the ${money(N.rebate.amount)} supplier rebate`,
};

interface PlanBoardPayload {
  board: "opening" | "repair";
  plan: PopUpPlan;
  available: number;
  assigned: number;
  balance: number;
  freed: number;
  residual: number;
  unassigned: number;
  acknowledgedResidual?: number;
}

interface SavedBoardPayload {
  board: string;
  snapshot: { plan: PopUpPlan; readout?: { available: number; residual: number; freed: number } };
}

function savedBoard(log: Log, board: "opening" | "repair") {
  const saved = eventsOfType(log, "POPUP_PLAN_SAVED")
    .map((event) => ({ event, payload: payloadOf<SavedBoardPayload>(event) }))
    .filter((entry) => entry.payload.board === board)
    .at(-1);
  if (!saved) return null;
  return { plan: saved.payload.snapshot.plan, readout: saved.payload.snapshot.readout, ref: saved.event.id };
}

function requestsFor(log: Log, board: "opening" | "repair") {
  return eventsOfType(log, "POPUP_PLAN_SAVE_REQUESTED").filter((event) => payloadOf<PlanBoardPayload>(event).board === board);
}

function linesOf(plan: PopUpPlan): string {
  return listed(LINES.map((line) => `${money(plan[line])} to ${LINE_LABELS[line]}`));
}

/** The money with a rule on it, and the line the student put behind it. */
function moneyYouCanCountOn(log: Log): RecapNote[] {
  const decided = eventsOfType(log, "POPUP_CONDITIONAL_MONEY_DECIDED");
  const notes: RecapNote[] = [];
  let countedAnything = false;
  for (const event of decided) {
    const payload = payloadOf<{ sourceId: string; counted: boolean }>(event);
    const label = CONDITIONAL_SOURCES[payload.sourceId] ?? payload.sourceId;
    if (payload.counted) countedAnything = true;
    notes.push(note("decision",
      payload.counted
        ? `You counted ${label} into your plan. That money only turns up if the condition on it is met, so counting it in means the plan needs it to.`
        : `You left ${label} out of your plan, so nothing in it depends on that money turning up.`,
      [event.id]));
  }

  const cover = eventsOfType(log, "POPUP_COVER_LINE_NAMED").at(-1);
  if (cover) {
    const line = payloadOf<{ line: PopUpLineId }>(cover).line;
    notes.push(note("decision",
      `You named ${LINE_LABELS[line]} as the line that gives that money back if it does not come, so there was an answer ready before it was needed.`,
      [cover.id]));
  } else if (countedAnything) {
    notes.push(note("decision",
      "You did not name a line that would give that money back if it did not come, so the plan was carrying it without a way out.",
      decided.map((event) => event.id)));
  }

  const cash = triedAt(log, "POPUP_SUM_SUBMITTED", "sumId", "cash-to-plan");
  if (cash) notes.push(...notesForTried(cash, "the cash you actually had left to plan with"));
  return notes;
}

/** The booth, and what the market charged before a single plate was sold. */
function whatHadToBePaid(log: Log): RecapNote[] {
  const notes: RecapNote[] = [];
  const spot = eventsOfType(log, "POPUP_SPOT_SELECTED").at(-1);
  if (spot) {
    const spotId = payloadOf<{ spotId: SpotId }>(spot).spotId;
    notes.push(note("decision",
      `You took the ${SPOT_TITLES[spotId] ?? spotId} booth. It costs ${money(N.spots[spotId].booth)} for the four Saturdays, and the city permit is another ${money(N.permit)} on top, before you have cooked anything at all.`,
      [spot.id]));
  }
  const owed = triedAt(log, "POPUP_SUM_SUBMITTED", "sumId", "owed-up-front");
  if (owed) notes.push(...notesForTried(owed, "what the market wanted up front"));
  const order = triedAt(log, "POPUP_SUM_SUBMITTED", "sumId", "first-order");
  if (order) notes.push(...notesForTried(order, "what the first tray order would cost"));
  return notes;
}

/** The line that took what was left, and the opening plan the student closed. */
function theLastOfTheMoney(log: Log): RecapNote[] {
  const opening = savedBoard(log, "opening");
  if (!opening) return [];
  const notes: RecapNote[] = [note("decision", `Your opening plan put ${linesOf(opening.plan)}.`, [opening.ref])];

  const closed = eventsOfType(log, "POPUP_REMAINDER_ASSIGNED")
    .filter((event) => payloadOf<{ board: string }>(event).board === "opening")
    .at(-1);
  if (closed) {
    const payload = payloadOf<{ line: PopUpLineId; amount: number; remaining: number }>(closed);
    notes.push(payload.remaining === 0
      ? note("decision", `You gave the other lines a figure of your own and then sent what was left — ${money(payload.amount)} — to ${LINE_LABELS[payload.line]}. That line is the one that took whatever the arithmetic ended up with.`, [closed.id])
      : note("decision", `You sent ${money(payload.amount)} to ${LINE_LABELS[payload.line]} on the way past, with ${money(payload.remaining)} still to place. That line got a figure you chose rather than the leftovers.`, [closed.id]));
  } else {
    notes.push(note("decision",
      "You typed a figure into every line yourself. No line was left to soak up what the others did not use.",
      [opening.ref]));
  }
  return notes;
}

/** Whether the board let the opening plan through. */
function whetherItAddedUp(log: Log): RecapNote[] {
  const opening = savedBoard(log, "opening");
  const requests = requestsFor(log, "opening");
  if (!opening && requests.length === 0) return [];
  const notes: RecapNote[] = [];
  const refused = requests.filter((event) => {
    const payload = payloadOf<PlanBoardPayload>(event);
    return (payload.residual > 0 || payload.unassigned > 0) && payload.acknowledgedResidual === undefined;
  });
  if (opening) {
    const available = opening.readout?.available;
    notes.push(note("decision",
      available === undefined
        ? "The plan you kept has every dollar assigned to a line."
        : `The plan you kept uses all ${money(available)} you had to plan with, with nothing left unassigned.`,
      [opening.ref]));
  }
  if (refused.length > 0) {
    notes.push(note("decision",
      `The board sent the plan back ${times(refused.length)} before that, because the money did not add up yet. You changed the amounts and went again.`,
      refused.map((event) => event.id)));
  }
  return notes;
}

/** The tips jar, and three things that wanted it. */
function notEnoughForEverything(log: Log): RecapNote[] {
  const settled = eventsOfType(log, "COMPETING_CLAIMS_SETTLED").at(-1);
  if (!settled) return [];
  const payload = payloadOf<CompetingClaimsSettlement>(settled);
  const named = (ids: readonly string[]) => listed(ids.map((id) => TIP_CLAIM_TITLES[id] ?? id));
  const notes: RecapNote[] = [
    note("decision",
      `The tips jar had ${money(payload.cash)} in it after the first Saturday and three things wanted it. You paid for ${named(payload.fundedIds)} — ${money(payload.spent)} — and left ${named(payload.unfundedIds)}.`,
      [settled.id]),
    note("decision", `You said ${REASON_SAID[payload.reason]}.`, [settled.id]),
  ];
  if (payload.leftOver > 0) {
    notes.push(note("decision", `${money(payload.leftOver)} of it was left in the jar.`, [settled.id]));
  }
  return notes;
}

/** The generator, the money that was already gone, and what was left to move. */
function whenTheMoneyChanged(log: Log): RecapNote[] {
  if (!reached(log, "popup-generator") && !reached(log, "popup-repair")) return [];
  const notes: RecapNote[] = [];
  const gap = triedAt(log, "POPUP_SUM_SUBMITTED", "sumId", "swap-gap");
  if (gap) notes.push(...notesForTried(gap, "what was still owed on the generator swap once the deposit came off"));

  const helper = eventsOfType(log, "POPUP_HELPER_DECIDED").at(-1);
  if (helper) {
    notes.push(note("decision",
      payloadOf<{ booked: boolean }>(helper).booked
        ? `You booked Marisol on the window. That is ${money(N.helperCost)} out, and a queue you can actually serve.`
        : "You worked the window alone, and kept the money you would have paid a second pair of hands.",
      [helper.id]));
  }

  const locked = eventsOfType(log, "POPUP_LOCKED_MOVE_ATTEMPTED");
  if (locked.length > 0) {
    notes.push(note("decision",
      `You reached ${times(locked.length)} for money that was already spent. It could not come back, so the repair had to come out of the lines that could still move.`,
      locked.map((event) => event.id)));
  }

  const repair = savedBoard(log, "repair");
  const request = requestsFor(log, "repair").at(-1);
  if (repair) {
    const freed = repair.readout?.freed;
    const residual = repair.readout?.residual ?? 0;
    const acknowledged = request ? payloadOf<PlanBoardPayload>(request).acknowledgedResidual : undefined;
    notes.push(note("decision",
      residual > 0 && acknowledged !== undefined
        ? `You finished ${money(residual)} short and said so on the record rather than leaving it hidden.`
        : freed === undefined
          ? "You rebuilt the plan out of the lines that could still move, and it came back to zero."
          : `You freed ${money(freed)} out of the lines that could still move, and the plan came back to zero: ${linesOf(repair.plan)}.`,
      [repair.ref, ...(request ? [request.id] : [])]));
  }
  return notes;
}

export function popUpTopics(log: Log): RecapTopic[] {
  return [
    topicOf("money-you-can-count-on", "The money with a rule on it",
      moneyYouCanCountOn(log), "Your run did not reach the money with a rule on it."),
    topicOf("what-had-to-be-paid", "What had to be paid whatever else happened",
      whatHadToBePaid(log), "Your run did not get as far as taking a booth, so there is nothing here yet."),
    topicOf("the-last-of-the-money", "How the last of the money got decided",
      theLastOfTheMoney(log), "You did not get as far as saving an opening plan, so there is nothing here to show you yet."),
    topicOf("whether-it-added-up", "Whether the plan added up",
      whetherItAddedUp(log), "You did not get as far as saving an opening plan, so there is nothing here to show you yet."),
    topicOf("not-enough-for-everything", "The evening three things wanted the same money",
      notEnoughForEverything(log), "The tips jar never came up in your run, so there is nothing here about it."),
    topicOf("when-the-money-changed", "When the generator changed the plan",
      whenTheMoneyChanged(log), "Your run stopped before the generator went, so nothing had to be repaired."),
  ];
}
