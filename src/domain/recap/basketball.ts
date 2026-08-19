import type { CategoryId, ClaimReasonId, SetupId } from "../core/ids";
import type { CompetingClaimsSettlement, PlanSnapshot } from "../evidence/types";
import type { PlanAmounts, PlanMode } from "../finance/types";
import { BASKETBALL_SCENARIO } from "../scenario/worlds/basketball";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { CHOICE_LABELS } from "./labels";
import { eventsOfType, listed, money, note, notesForTried, payloadOf, reached, times, topicOf, triedAt, type Log } from "./log";
import type { RecapNote, RecapTopic } from "./types";

/**
 * Eight Weeks to the Showcase, said back to the student who played it.
 *
 * Every sentence in this file is a fact with an event id under it. Nothing here reads a
 * rubric, nothing here counts anything up, and the words are Avery's season rather than
 * BOW's vocabulary — the shared idea is carried by the topic id and the concept beside it,
 * which is exactly the split `WorldContract` makes for assessment, made again on the side
 * of the product a student actually sees.
 */

const ROWS: readonly CategoryId[] = ["goal", "reserve", "flexibleCash"];

const WEEK3_CLAIM_TITLES: Record<string, string> = {
  "team-shoes": "the team shoes",
  "away-travel": "the away-game travel share",
  "sister-present": "a present for Avery's sister",
};

const REASON_SAID: Record<ClaimReasonId, string> = {
  "only-wanted": "it was the one you only wanted",
  "no-one-counting": "nobody else was counting on it",
  "can-wait": "it could wait, even at a price",
  cheapest: "it was the cheapest one to drop",
};

const SETUP_TITLES: Record<string, string> = Object.fromEntries(
  BASKETBALL_SCENARIO.setups.map((setup) => [setup.id, setup.title]),
);

const GAP_TILES: Record<string, string> = {
  "required-cost": "the new bill Week 5 brought",
  "setup-cost": "the extra it cost where Avery was living",
  "lost-outcome": "the bonus that stopped being possible",
};

interface PlanSavePayload { mode: PlanMode; snapshot: PlanSnapshot; balance: number }
interface PlanRequestPayload { mode: PlanMode; balance: number; acknowledgedResidual?: number }

function savedPlan(log: Log, mode: PlanMode): { amounts: PlanAmounts; snapshot: PlanSnapshot; ref: string } | null {
  const saved = eventsOfType(log, "PLAN_SAVED")
    .map((event) => ({ event, payload: payloadOf<PlanSavePayload>(event) }))
    .filter((entry) => entry.payload.mode === mode)
    .at(-1);
  if (!saved) return null;
  return { amounts: saved.payload.snapshot.inputs.amounts, snapshot: saved.payload.snapshot, ref: saved.event.id };
}

function requestsFor(log: Log, mode: PlanMode) {
  return eventsOfType(log, "PLAN_SAVE_REQUESTED").filter((event) => payloadOf<PlanRequestPayload>(event).mode === mode);
}

function rowsOf(amounts: PlanAmounts): string {
  return listed(ROWS.map((id) => `${money(amounts[id])} to ${CHOICE_LABELS[id]}`));
}

/** The money the student could count on, and the two payments that might never arrive. */
function moneyYouCanCountOn(log: Log): RecapNote[] {
  const notes: RecapNote[] = [];
  const floor = triedAt(log, "CALCULATION_SUBMITTED", "calcId", "reliable-floor");
  if (floor) {
    notes.push(...notesForTried(floor, "the money Avery could count on over the eight weeks"));
  }

  const opening = savedPlan(log, "working");
  const toggles = eventsOfType(log, "INCOME_SOURCE_TOGGLED");
  const bonuses = [
    { id: "completion-800", label: `the ${money(N.completionIncome)} attendance bonus`, included: opening?.snapshot.inputs.includeCompletion },
    { id: "outcome-1000", label: `the ${money(N.outcomeIncome)} showcase bonus`, included: opening?.snapshot.inputs.includeOutcome },
  ];
  for (const bonus of bonuses) {
    if (bonus.included === undefined) continue;
    const touched = toggles.filter((event) => payloadOf<{ sourceId: string }>(event).sourceId === bonus.id);
    const refs = [...touched.map((event) => event.id), ...(opening ? [opening.ref] : [])];
    if (touched.length === 0) {
      // The screen opens with both bonuses left out, so a student who never touched them and
      // one who deliberately excluded them save the identical plan. The page says which of
      // the two this run can actually tell, rather than crediting a decision nobody made.
      notes.push(note("decision",
        `Your first plan left ${bonus.label} out. The screen opened that way and you carried on without changing it, so this run cannot tell whether leaving it out was the call you meant to make.`,
        refs));
    } else {
      notes.push(note("decision",
        bonus.included
          ? `You counted ${bonus.label} into your first plan. It only arrives if things go Avery's way, so counting it in means the plan needs it to.`
          : `You left ${bonus.label} out of your first plan, so nothing in it depends on that money arriving.`,
        refs));
    }
  }

  const fallback = savedPlan(log, "fallback");
  if (fallback) {
    notes.push(note("decision",
      "You also built the version of the plan without the bonus money, so there was one on the table that worked if it never came.",
      [fallback.ref]));
  }

  const finalCall = eventsOfType(log, "COMPLETION_INCOME_DECIDED").at(-1);
  if (finalCall) {
    // Three different sentences, because "you stopped counting it in" is only true of a
    // student who was counting it in. Said to one who never did, it invents a change of mind.
    const kept = payloadOf<{ included: boolean }>(finalCall).included;
    const hadIt = opening?.snapshot.inputs.includeCompletion === true;
    notes.push(note("decision",
      kept
        ? `Week 5 asked you about the ${money(N.completionIncome)} attendance bonus again, and you were still counting it in.`
        : hadIt
          ? "By Week 5 you had stopped counting the attendance bonus in, and rebuilt the plan without it."
          : "Week 5 asked you about the attendance bonus again, and you left it out again.",
      [finalCall.id, ...(opening ? [opening.ref] : [])]));
  }
  return notes;
}

/** Where Avery lived, and the costs that were true whatever else the student decided. */
function whatHadToBePaid(log: Log): RecapNote[] {
  const notes: RecapNote[] = [];
  const ranked = eventsOfType(log, "SETUP_RANKED");
  if (ranked.length > 0) {
    const first = payloadOf<{ correct: boolean }>(ranked[0]!).correct;
    const anyRight = ranked.some((event) => payloadOf<{ correct: boolean }>(event).correct);
    const refs = ranked.map((event) => event.id);
    notes.push(first
      ? note("decision", "You put the three places in order of what they really cost over eight weeks, and had the order right the first time.", refs)
      : anyRight
        ? note("correction", "You put the three places in order of what they really cost over eight weeks. The first order you tried was not it; you went again and got there.", refs)
        : note("correction", "You put the three places in order of what they really cost over eight weeks, and the order you settled on was not the one the numbers make.", refs));
  }

  const selected = eventsOfType(log, "SETUP_SELECTED").at(-1);
  if (selected) {
    const setupId = payloadOf<{ setupId: SetupId }>(selected).setupId;
    notes.push(note("decision", `You put Avery in the ${SETUP_TITLES[setupId] ?? setupId}.`, [selected.id]));
  }
  const chosen = triedAt(log, "CALCULATION_SUBMITTED", "calcId", "chosen-setup-total");
  if (chosen) {
    notes.push(...notesForTried(chosen, "what that place takes out of Avery's money over the eight weeks"));
  } else if (selected) {
    const setupId = payloadOf<{ setupId: SetupId }>(selected).setupId;
    notes.push(note("decision",
      `Over the eight weeks that place takes ${money(N.setupCosts[setupId])} of Avery's money before anything else is decided.`,
      [selected.id]));
  }
  const essentials = triedAt(log, "CALCULATION_SUBMITTED", "calcId", "essentials-total");
  if (essentials) {
    notes.push(...notesForTried(essentials, "what rent, food and getting to practice add up to across the season"));
  }
  return notes;
}

/** The row that took whatever was left, and the plan the student closed. */
function theLastOfTheMoney(log: Log): RecapNote[] {
  const opening = savedPlan(log, "working");
  if (!opening) return [];
  const notes: RecapNote[] = [note("decision", `Your first plan put ${rowsOf(opening.amounts)}.`, [opening.ref])];

  const closed = eventsOfType(log, "PLAN_REMAINDER_ASSIGNED")
    .filter((event) => payloadOf<{ mode: PlanMode }>(event).mode === "working")
    .at(-1);
  if (closed) {
    const payload = payloadOf<{ category: CategoryId; amount: number; remaining: number }>(closed);
    const label = CHOICE_LABELS[payload.category];
    notes.push(payload.remaining === 0
      ? note("decision", `You gave the other rows a figure of your own and then sent what was left — ${money(payload.amount)} — to ${label}. That row is the one that took whatever the arithmetic ended up with.`, [closed.id])
      : note("decision", `You sent ${money(payload.amount)} to ${label} on the way past, with ${money(payload.remaining)} still to place. That row got a figure you chose rather than the leftovers.`, [closed.id]));
  } else {
    notes.push(note("decision",
      "You typed a figure into every row yourself. No row was left to soak up what the others did not use.",
      [opening.ref]));
  }
  return notes;
}

/** Whether the board let the plan through, and what it took to get there. */
function whetherItAddedUp(log: Log): RecapNote[] {
  const opening = savedPlan(log, "working");
  const requests = requestsFor(log, "working");
  if (!opening && requests.length === 0) return [];
  const notes: RecapNote[] = [];
  const refused = requests.filter((event) => {
    const payload = payloadOf<PlanRequestPayload>(event);
    return payload.balance !== 0 && payload.acknowledgedResidual === undefined;
  });
  if (opening) {
    const available = opening.snapshot.readout?.available;
    notes.push(note("decision",
      available === undefined
        ? "The plan you kept has every dollar assigned to a row."
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

/** Week 3: three claims, one pot of cash, and the reason the student gave. */
function notEnoughForEverything(log: Log): RecapNote[] {
  const settled = eventsOfType(log, "COMPETING_CLAIMS_SETTLED").at(-1);
  if (!settled) return [];
  const payload = payloadOf<CompetingClaimsSettlement>(settled);
  const named = (ids: readonly string[]) => listed(ids.map((id) => WEEK3_CLAIM_TITLES[id] ?? id));
  const notes: RecapNote[] = [
    note("decision",
      `Week 3 put ${money(payload.cash)} in Avery's hand and three things wanted it. You paid for ${named(payload.fundedIds)} — ${money(payload.spent)} — and left ${named(payload.unfundedIds)}.`,
      [settled.id]),
    note("decision", `You said ${REASON_SAID[payload.reason]}.`, [settled.id]),
  ];
  if (payload.leftOver > 0) {
    notes.push(note("decision", `You left ${money(payload.leftOver)} of it unspent, and cash Avery does not spend that week goes nowhere.`, [settled.id]));
  }
  return notes;
}

/** Week 5, the deposit that was already gone, and what could still move. */
function whenTheMoneyChanged(log: Log): RecapNote[] {
  if (!reached(log, "week5-event") && !reached(log, "first-response")) return [];
  const notes: RecapNote[] = [];
  const deposit = eventsOfType(log, "COURSE_DEPOSIT_DECIDED").at(-1);
  if (deposit) {
    notes.push(note("decision",
      payloadOf<{ taken: boolean }>(deposit).taken
        ? `In Week 4 you reserved the course seat early for ${money(N.course.depositPrice)}. That money was committed before Week 5 arrived, which meant it could not be moved afterwards.`
        : "In Week 4 you left the course seat unreserved and kept the money where you could still move it.",
      [deposit.id]));
  }
  const change = triedAt(log, "CALCULATION_SUBMITTED", "calcId", "week5-change");
  if (change) notes.push(...notesForTried(change, "how much Week 5 changed"));

  const tiles = eventsOfType(log, "GAP_TILE_TOGGLED");
  const picked = [...new Set(tiles.filter((event) => payloadOf<{ selected: boolean }>(event).selected)
    .map((event) => payloadOf<{ tileId: string }>(event).tileId))];
  if (picked.length > 0) {
    notes.push(note("decision",
      `You picked out ${listed(picked.map((id) => GAP_TILES[id] ?? id))} as ${picked.length === 1 ? "the part" : "the parts"} of the plan that had actually changed.`,
      tiles.map((event) => event.id)));
  }

  const optional = eventsOfType(log, "OPTIONAL_WORK_DECIDED").at(-1);
  if (optional) {
    notes.push(note("decision",
      payloadOf<{ accepted: boolean }>(optional).accepted
        ? `You took the Saturday clinics. That is ${money(N.optionalWorkIncome)} in, and hours out of Avery's week.`
        : "You turned down the Saturday clinics and kept Avery's hours.",
      [optional.id]));
  }

  const locked = eventsOfType(log, "LOCKED_MOVE_ATTEMPTED");
  if (locked.length > 0) {
    notes.push(note("decision",
      `You reached ${times(locked.length)} for money that was already committed. It could not come back, so the repair had to come out of the rows that could still move.`,
      locked.map((event) => event.id)));
  }

  const final = savedPlan(log, "final");
  const finalRequest = requestsFor(log, "final").at(-1);
  if (final) {
    const residual = final.snapshot.readout?.residual ?? 0;
    const acknowledged = finalRequest ? payloadOf<PlanRequestPayload>(finalRequest).acknowledgedResidual : undefined;
    notes.push(note("decision",
      residual > 0 && acknowledged !== undefined
        ? `You finished with ${money(residual)} still not covered, and said so on the record rather than leaving it hidden.`
        : `You rebuilt the plan and it came back to zero: ${rowsOf(final.amounts)}.`,
      [final.ref, ...(finalRequest ? [finalRequest.id] : [])]));
  }
  return notes;
}

export function basketballTopics(log: Log): RecapTopic[] {
  return [
    topicOf("money-you-can-count-on", "The money Avery could count on, and the money that might never come",
      moneyYouCanCountOn(log), "Your run did not reach the two payments that might never arrive."),
    topicOf("what-had-to-be-paid", "What had to be paid whatever else happened",
      whatHadToBePaid(log), "Your run did not get as far as choosing where Avery lived, so there is nothing here yet."),
    topicOf("the-last-of-the-money", "How the last of the money got decided",
      theLastOfTheMoney(log), "You did not get as far as saving a first plan, so there is nothing here to show you yet."),
    topicOf("whether-it-added-up", "Whether the plan added up",
      whetherItAddedUp(log), "You did not get as far as saving a first plan, so there is nothing here to show you yet."),
    topicOf("not-enough-for-everything", "The week three things wanted the same money",
      notEnoughForEverything(log), "Week 3's cash never came up in your run, so there is nothing here about it."),
    topicOf("when-the-money-changed", "When Week 5 changed the plan",
      whenTheMoneyChanged(log), "Your run stopped before Week 5, so the news never landed and there was nothing to repair."),
  ];
}
