import { dollars, formatDollars } from "../../../core/money";
import { crowdOn, sellCap } from "./economy";
import { popUpLedger, type LedgerInput, type PopUpLedger } from "./ledger";
import { POP_UP_NUMBERS } from "./numbers";
import { POP_UP_SCENARIO, type PopUpScenario, type PopUpVerdictCopy } from "./scenario";
import { POP_UP_LINES, type PopUpNumbers, type SaturdayNumber, type SpotId } from "./types";

/**
 * What each of the student's calls actually did, and what would have happened otherwise.
 *
 * The market used to end by printing a table of four nights the student had already watched
 * one at a time. A table is a receipt: it says what happened and nothing about why, so a
 * student who ran the stall badly was handed a column of numbers and left to reverse-engineer
 * their own run. The helper they paid for and then had nothing for did not appear in it at
 * all.
 *
 * This is the other world's idea — `finance/resolution.ts` and its four verdicts — asked of a
 * different world rather than borrowed from it. The four words are shared on purpose, because
 * a student who plays both should not have to learn two vocabularies for the same four
 * things. Everything under them is a booth, a tray of food and a rented generator.
 *
 * Three rules hold every sentence here honest:
 *
 * 1. **Every verdict is a decision the student actually faced.** A run that never reached the
 *    repair board has no repair verdict; a plan that spent no conditional money is still told
 *    what that was worth, because deciding to leave it out is a decision too.
 * 2. **Every counterfactual is the same ledger with exactly one decision changed**, priced by
 *    the same functions the real run was priced by. Nothing is estimated and nothing is
 *    rolled, so the sentence a student reads is one they can check.
 * 3. **`no_effect` means no money moved.** Not "it did not matter" — a verdict headed "No
 *    effect" over a line naming money changing hands teaches a student to stop reading the
 *    headings, which is the exact defect the critique found in the other world. Every
 *    `no_effect` branch below names $0 and nothing else.
 */

export type MarketVerdictId = "booth" | "stock" | "helper" | "conditional" | "repair" | "cut";

export interface MarketVerdict {
  id: MarketVerdictId;
  label: string;
  /** Whether the student took the thing this verdict is about, rather than declined it. */
  taken: boolean;
  outcome: "paid_off" | "cost_you" | "fell_short" | "no_effect";
  /** What actually happened, in one line, with the counterfactual where there is one. */
  detail: string;
}

export interface MarketResolution {
  verdicts: MarketVerdict[];
  /** Plates the crowd wanted on a night the truck had nothing left to hand over. */
  unfed: number;
  /** The night-by-night crowd, so a screen can say what each Saturday was asked for. */
  crowds: readonly { saturday: SaturdayNumber; crowd: number; willTake: number }[];
}

/**
 * The order the verdicts are read in.
 *
 * Deliberately the same weighting Basketball sorts by: a call that changed the run goes above
 * one that did not, and ties keep their order so nothing here is a ranking of how well the
 * student did. It is restated rather than imported because §7.1 puts a world's interior in
 * the world — but it is the same order, and it should stay the same order.
 */
const VERDICT_WEIGHT: Record<MarketVerdict["outcome"], number> = {
  cost_you: 0,
  paid_off: 1,
  fell_short: 2,
  no_effect: 3,
};

/** A copy template with the run's own numbers in it. Nothing is composed from fragments. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** The same run with exactly one decision changed, priced by the same ledger. */
function ledgerWith(input: LedgerInput, n: PopUpNumbers, changed: Partial<LedgerInput>): PopUpLedger {
  return popUpLedger({ ...input, ...changed }, n);
}

/** Takings minus what the food actually cost. The only fair way to compare two orders. */
function net(ledger: PopUpLedger, n: PopUpNumbers): number {
  const trays = ledger.saturdays.reduce((total, day) => total + day.trays, 0);
  return ledger.takings - trays * n.trayCost;
}

/** Plates a night's crowd wanted and the window never handed over. */
function unfedOn(n: PopUpNumbers, spotId: SpotId, helper: boolean, saturday: SaturdayNumber, sold: number): number {
  return Math.max(0, sellCap(n, spotId, saturday, helper) - sold);
}

function boothVerdict(
  input: LedgerInput,
  ledger: PopUpLedger,
  n: PopUpNumbers,
  copy: PopUpVerdictCopy,
  scenario: PopUpScenario,
  spotId: SpotId,
): MarketVerdict {
  const titleOf = (id: SpotId) => scenario.spots.find((spot) => spot.id === id)?.title ?? id;
  const mine = net(ledger, n) - n.spots[spotId].booth;
  // The same orders, at each of the other two booths. The plan is the plan the student saved,
  // so this is not "what if you had planned differently" — it is the narrower and more
  // answerable question of what this plan would have done somewhere else.
  const rivals = (Object.keys(n.spots) as SpotId[])
    .filter((id) => id !== spotId)
    .map((id) => ({ id, value: net(ledgerWith(input, n, { spotId: id }), n) - n.spots[id].booth }));
  const best = rivals.reduce((top, rival) => (rival.value > top.value ? rival : top), rivals[0]!);
  const values = {
    booth: titleOf(spotId),
    rent: formatDollars(n.spots[spotId].booth),
    sold: ledger.plates.sold,
    takings: formatDollars(ledger.takings),
    rival: titleOf(best.id),
    rival_rent: formatDollars(n.spots[best.id].booth),
    gap: formatDollars(dollars(Math.round(best.value - mine))),
  };
  if (best.value <= mine) {
    return { id: "booth", label: fill(copy.booth.label, values), taken: true, outcome: "paid_off", detail: fill(copy.booth.paidOff, values) };
  }
  // A cheaper booth that would have done better means the rent was money out for a crowd the
  // orders never needed. A dearer one means the orders outgrew the booth they were placed at:
  // different mistakes, and the two words for them are not interchangeable.
  const cheaper = n.spots[best.id].booth < n.spots[spotId].booth;
  return {
    id: "booth",
    label: fill(copy.booth.label, values),
    taken: true,
    outcome: cheaper ? "cost_you" : "fell_short",
    detail: fill(cheaper ? copy.booth.costYou : copy.booth.fellShort, values),
  };
}

function stockVerdict(
  input: LedgerInput,
  ledger: PopUpLedger,
  n: PopUpNumbers,
  copy: PopUpVerdictCopy,
  unfed: number,
): MarketVerdict {
  const cooked = ledger.saturdays.reduce((total, day) => total + day.cooked, 0);
  const middle = input.trays.middle ?? 0;
  const zero = formatDollars(dollars(0));
  if (cooked === 0) {
    return { id: "stock", label: copy.stock.label, taken: false, outcome: "fell_short", detail: fill(copy.stock.nothing, { zero }) };
  }
  // The standing order is the one order in this run that faces two unequal nights, so it is
  // the one worth a counterfactual: a tray more and a tray fewer, priced the same way.
  const mine = net(ledger, n);
  const alternatives = [middle - 1, middle + 1]
    .filter((trays) => trays >= 0)
    .map((trays) => ({ trays, value: net(ledgerWith(input, n, { trays: { ...input.trays, middle: trays } }), n) }));
  const best = alternatives.reduce((top, option) => (option.value > top.value ? option : top), { trays: middle, value: mine });
  const values = {
    cooked,
    sold: ledger.plates.sold,
    takings: formatDollars(ledger.takings),
    binned: formatDollars(ledger.binned),
    unfed,
    actual: middle,
    alt: best.trays,
    gap: formatDollars(dollars(Math.round(best.value - mine))),
  };
  if (best.value <= mine) {
    return { id: "stock", label: copy.stock.label, taken: true, outcome: "paid_off", detail: fill(copy.stock.paidOff, values) };
  }
  return {
    id: "stock",
    label: copy.stock.label,
    taken: true,
    outcome: ledger.binned > 0 ? "cost_you" : "fell_short",
    detail: fill(ledger.binned > 0 ? copy.stock.costYou : copy.stock.fellShort, values),
  };
}

function helperVerdict(
  input: LedgerInput,
  ledger: PopUpLedger,
  n: PopUpNumbers,
  copy: PopUpVerdictCopy,
  spotId: SpotId,
): MarketVerdict {
  const booked = input.helper === true;
  const last = ledger.saturdays.find((day) => day.saturday === n.saturdays);
  const flipped = ledgerWith(input, n, { helper: !booked });
  const flippedLast = flipped.saturdays.find((day) => day.saturday === n.saturdays);
  const mineLast = last?.takings ?? 0;
  const otherLast = flippedLast?.takings ?? 0;
  const cost = formatDollars(n.helperCost);
  const zero = formatDollars(dollars(0));

  if (booked) {
    // She is paid whatever happens: she turned down another shift for it. A last Saturday
    // that never ran is the sharpest case and the one the old ending never mentioned at all.
    if (!last || last.cooked === 0) {
      return { id: "helper", label: copy.helper.labelBooked, taken: true, outcome: "cost_you", detail: fill(copy.helper.noLast, { cost }) };
    }
    const gain = dollars(Math.max(0, mineLast - otherLast));
    const values = { cost, gain: formatDollars(gain), plates: Math.round(gain / n.platePrice) };
    return {
      id: "helper",
      label: copy.helper.labelBooked,
      taken: true,
      outcome: gain > n.helperCost ? "paid_off" : "cost_you",
      detail: fill(gain > n.helperCost ? copy.helper.paidOff : copy.helper.costYou, values),
    };
  }

  const forgone = dollars(Math.max(0, otherLast - mineLast));
  if (forgone === 0) {
    return { id: "helper", label: copy.helper.labelAlone, taken: false, outcome: "no_effect", detail: fill(copy.helper.aloneNoEffect, { zero }) };
  }
  const values = {
    cost,
    gain: formatDollars(forgone),
    crowd: crowdOn(n, spotId, n.saturdays),
    served: last?.sold ?? 0,
  };
  return {
    id: "helper",
    label: copy.helper.labelAlone,
    taken: false,
    outcome: forgone > n.helperCost ? "cost_you" : "paid_off",
    detail: fill(forgone > n.helperCost ? copy.helper.aloneCost : copy.helper.aloneKept, values),
  };
}

function conditionalVerdict(
  input: LedgerInput,
  ledger: PopUpLedger,
  n: PopUpNumbers,
  copy: PopUpVerdictCopy,
  scenario: PopUpScenario,
): MarketVerdict {
  const lineLabel = scenario.lines[input.coverLine ?? "cushion"].label;
  const zero = formatDollars(dollars(0));
  const values = {
    catering: formatDollars(n.catering.amount),
    rebate: formatDollars(n.rebate.amount),
    covered: formatDollars(ledger.covered),
    uncovered: formatDollars(ledger.uncovered),
    line: lineLabel,
    zero,
  };
  if (input.counted.catering) {
    const detail = ledger.uncovered > 0
      ? `${fill(copy.conditional.cateringCounted, values)} ${fill(copy.conditional.uncovered, values)}`
      : fill(copy.conditional.cateringCounted, values);
    return { id: "conditional", label: copy.conditional.label, taken: true, outcome: "cost_you", detail };
  }
  const soldOutFirst = ledger.saturdays.find((day) => day.saturday === 1);
  const earned = soldOutFirst?.soldOut === true && soldOutFirst.cooked >= n.rebate.minimumPlates;
  if (input.counted.rebate) {
    return earned
      ? { id: "conditional", label: copy.conditional.label, taken: true, outcome: "paid_off", detail: fill(copy.conditional.rebateEarnedPlanned, values) }
      : { id: "conditional", label: copy.conditional.label, taken: true, outcome: "cost_you", detail: fill(copy.conditional.rebateMissed, values) };
  }
  return earned
    ? { id: "conditional", label: copy.conditional.label, taken: false, outcome: "paid_off", detail: fill(copy.conditional.rebateWindfall, values) }
    : { id: "conditional", label: copy.conditional.label, taken: false, outcome: "no_effect", detail: fill(copy.conditional.noEffect, values) };
}

function repairVerdict(
  ledger: PopUpLedger,
  n: PopUpNumbers,
  copy: PopUpVerdictCopy,
  scenario: PopUpScenario,
  spotId: SpotId,
  helper: boolean,
): MarketVerdict {
  const gave = POP_UP_LINES.filter((line) => ledger.held[line] - ledger.afterRepair[line] > 0);
  const lines = gave.map((line) => scenario.lines[line].label).join(", ");
  const fromStock = dollars(Math.max(0, ledger.held.stock - ledger.afterRepair.stock));
  const last = ledger.saturdays.find((day) => day.saturday === n.saturdays);
  const values = {
    bill: formatDollars(ledger.bill),
    freed: formatDollars(ledger.freed),
    residual: formatDollars(ledger.residual),
    lines,
    last: formatDollars(last?.takings ?? dollars(0)),
    stock: formatDollars(fromStock),
    cooked: last?.cooked ?? 0,
    crowd: sellCap(n, spotId, n.saturdays, helper),
  };
  if (ledger.residual > 0) {
    return { id: "repair", label: copy.repair.label, taken: true, outcome: "fell_short", detail: fill(copy.repair.fellShort, values) };
  }
  // Money off the stock line is the one repair that charges itself to the last Saturday, and
  // it only reads as a cost when the crowd that night wanted more than the truck could cook.
  const starved = fromStock > 0 && (last?.cooked ?? 0) < sellCap(n, spotId, n.saturdays, helper);
  return {
    id: "repair",
    label: copy.repair.label,
    taken: true,
    outcome: starved ? "cost_you" : "paid_off",
    detail: fill(starved ? copy.repair.costYou : copy.repair.paidOff, values),
  };
}

function cutVerdict(input: LedgerInput, ledger: PopUpLedger, copy: PopUpVerdictCopy): MarketVerdict {
  const planned = input.opening.cut;
  const banked = ledger.banked;
  const zero = formatDollars(dollars(0));
  if (planned === 0) {
    return { id: "cut", label: copy.cut.label, taken: false, outcome: "no_effect", detail: fill(copy.cut.noEffect, { zero }) };
  }
  const values = {
    cut: formatDollars(planned),
    banked: formatDollars(banked),
    taken: formatDollars(dollars(Math.max(0, planned - banked))),
  };
  return banked >= planned
    ? { id: "cut", label: copy.cut.label, taken: true, outcome: "paid_off", detail: fill(copy.cut.paidOff, values) }
    : { id: "cut", label: copy.cut.label, taken: true, outcome: "fell_short", detail: fill(copy.cut.fellShort, values) };
}

/**
 * The whole ending, read off the decisions the student actually made.
 *
 * Order of assembly is not the order of reading: the list is sorted so the call that changed
 * the run is first, because the panel's job is letting a student trace the ending back to the
 * thing that caused it.
 */
export function resolveMarket(
  input: LedgerInput,
  n: PopUpNumbers = POP_UP_NUMBERS,
  scenario: PopUpScenario = POP_UP_SCENARIO,
): MarketResolution {
  const ledger = popUpLedger(input, n);
  const copy = scenario.screens.settle.verdicts;
  const spotId = input.spotId;
  const helper = input.helper === true;
  const crowds = ledger.saturdays.map((day) => ({
    saturday: day.saturday,
    crowd: spotId ? crowdOn(n, spotId, day.saturday) : 0,
    willTake: spotId ? sellCap(n, spotId, day.saturday, helper) : 0,
  }));
  const unfed = spotId
    ? ledger.saturdays.reduce((total, day) => total + unfedOn(n, spotId, helper, day.saturday, day.sold), 0)
    : 0;

  const verdicts: MarketVerdict[] = [];
  if (spotId) {
    verdicts.push(boothVerdict(input, ledger, n, copy, scenario, spotId));
    verdicts.push(stockVerdict(input, ledger, n, copy, unfed));
    if (input.helper !== null) verdicts.push(helperVerdict(input, ledger, n, copy, spotId));
    verdicts.push(conditionalVerdict(input, ledger, n, copy, scenario));
    // Only a run that actually stood at the repair board is judged on it. A student who never
    // met the generator was never asked this question and must not be answered on it.
    if (input.repair) verdicts.push(repairVerdict(ledger, n, copy, scenario, spotId, helper));
    if (input.openingSaved) verdicts.push(cutVerdict(input, ledger, copy));
  }

  return {
    verdicts: verdicts.sort((a, b) => VERDICT_WEIGHT[a.outcome] - VERDICT_WEIGHT[b.outcome]),
    unfed,
    crowds,
  };
}
