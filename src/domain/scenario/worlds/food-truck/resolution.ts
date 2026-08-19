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

/**
 * The same run with exactly one decision changed, priced by the same ledger.
 *
 * The repair is the one thing that cannot simply be carried across. A saved repair board is
 * three absolute figures, and a counterfactual that changes what the stock line spent changes
 * what the three lines were holding when the shop asked for its money — so copying the figures
 * over would have the student freeing a different amount than they actually freed, and often
 * failing to cover the bill at all. A counterfactual whose generator silently goes unbought is
 * a counterfactual that flatters the run it is being compared against, which is the opposite
 * of what these sentences are for. What travels is what the student *gave*, line by line.
 */
function ledgerWith(input: LedgerInput, n: PopUpNumbers, changed: Partial<LedgerInput>): PopUpLedger {
  const next: LedgerInput = { ...input, ...changed };
  const repair = input.repair;
  if (!repair) return popUpLedger(next, n);
  const heldHere = popUpLedger(input, n).held;
  const heldThere = popUpLedger({ ...next, repair: null }, n).held;
  const givenBack = { ...heldThere };
  for (const line of POP_UP_LINES) {
    givenBack[line] = dollars(Math.max(0, heldThere[line] - Math.max(0, heldHere[line] - repair[line])));
  }
  return popUpLedger({ ...next, repair: givenBack }, n);
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

/**
 * The most trays the standing order could have been, in the student's own run.
 *
 * Read off the stock line as it stood when that order was placed — after the first Saturday
 * was paid for and any windfall had landed — and halved, because one order covers two nights
 * and the screen would not let a student place one they could not pay for twice. It is the
 * exact set of orders that were on offer, which is what makes a claim about "no other order"
 * a claim about something rather than a claim about a neighbourhood.
 */
function standingOrderCeiling(input: LedgerInput, n: PopUpNumbers): number {
  const atOrder = popUpLedger({ ...input, trays: { first: input.trays.first, middle: null, last: null } }, n);
  return Math.floor(atOrder.held.stock / (2 * n.trayCost));
}

function stockVerdict(
  input: LedgerInput,
  ledger: PopUpLedger,
  n: PopUpNumbers,
  copy: PopUpVerdictCopy,
  unfed: number,
  spotId: SpotId,
  helper: boolean,
): MarketVerdict {
  const cooked = ledger.saturdays.reduce((total, day) => total + day.cooked, 0);
  const middle = input.trays.middle ?? 0;
  const zero = formatDollars(dollars(0));
  if (cooked === 0) {
    return { id: "stock", label: copy.stock.label, taken: false, outcome: "fell_short", detail: fill(copy.stock.nothing, { zero }) };
  }
  /**
   * The standing order, against every standing order the student could have placed.
   *
   * This used to compare one tray more and one tray fewer and then print "no standing order
   * does better on these four crowds" whenever neither beat it. That is a claim about a
   * neighbourhood dressed as a claim about the whole space, and on this world's numbers it is
   * false often enough to find by looking: a run that cooked nothing on the middle Saturdays
   * sat one tray away from worse in both directions and four trays away from sixty dollars
   * better, and was told nothing beat it. A claim of optimality made to a child has to be
   * true of the thing it names, so the sweep now runs the whole range and the sentence names
   * exactly what was swept.
   */
  const mine = net(ledger, n);
  const ceiling = Math.max(middle, standingOrderCeiling(input, n));
  const alternatives = Array.from({ length: ceiling + 1 }, (_, trays) => trays)
    .filter((trays) => trays !== middle)
    .map((trays) => ({ trays, value: net(ledgerWith(input, n, { trays: { ...input.trays, middle: trays } }), n) }));
  const best = alternatives.reduce((top, option) => (option.value > top.value ? option : top), { trays: middle, value: mine });
  // A Saturday the truck opened with nothing on it, on a night that would have bought plates.
  // It outranks everything else this verdict could say: an order that was the best of its
  // range is not what a student needs to hear about a run with an empty night in it.
  const emptyNights = ledger.saturdays
    .filter((day) => day.cooked === 0 && sellCap(n, spotId, day.saturday, helper) > 0)
    .sort((a, b) => sellCap(n, spotId, b.saturday, helper) - sellCap(n, spotId, a.saturday, helper));
  const values = {
    cooked,
    sold: ledger.plates.sold,
    takings: formatDollars(ledger.takings),
    binned: formatDollars(ledger.binned),
    unfed,
    actual: middle,
    alt: best.trays,
    gap: formatDollars(dollars(Math.round(best.value - mine))),
    night: emptyNights[0]?.saturday ?? 0,
    wanted: emptyNights[0] ? sellCap(n, spotId, emptyNights[0].saturday, helper) : 0,
    empty: emptyNights.length,
  };
  if (emptyNights[0]) {
    return {
      id: "stock",
      label: copy.stock.label,
      taken: true,
      outcome: "fell_short",
      detail: fill(emptyNights.length > 1 ? copy.stock.emptyNights : copy.stock.emptyNight, values),
    };
  }
  if (best.value <= mine) {
    // An order can be the best of the three and still have thrown food away — the extra tray
    // that fills the busy night bins its other half on the thin one, and on this world's
    // numbers the two can come out level. Saying "paid off" over a run that binned ninety
    // dollars without naming the ninety dollars is the heading contradicting the page.
    return {
      id: "stock",
      label: copy.stock.label,
      taken: true,
      outcome: "paid_off",
      detail: fill(ledger.binned > 0 ? copy.stock.paidOffSpoiled : copy.stock.paidOff, values),
    };
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
  const lineLabel = scenario.lines[input.coverLine ?? "cushion"].inline;
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
  // "the cushion and your cut", not "Cushion, Your cut". A control's name dropped into a
  // sentence is how the ending came to say "$270 off the Your cut".
  const named = gave.map((line) => scenario.lines[line].inline);
  const lines = named.length > 1 ? `${named.slice(0, -1).join(", ")} and ${named.at(-1)}` : named.join("");
  const fromStock = dollars(Math.max(0, ledger.held.stock - ledger.afterRepair.stock));
  const last = ledger.saturdays.find((day) => day.saturday === n.saturdays);
  const values = {
    bill: formatDollars(ledger.bill),
    freed: formatDollars(ledger.freed),
    residual: formatDollars(ledger.residual),
    lines,
    last: formatDollars(last?.takings ?? dollars(0)),
    stock: formatDollars(fromStock),
    left: formatDollars(ledger.afterRepair.stock),
    cooked: last?.cooked ?? 0,
    crowd: sellCap(n, spotId, n.saturdays, helper),
    zero: formatDollars(dollars(0)),
  };
  if (ledger.residual > 0) {
    return { id: "repair", label: copy.repair.label, taken: true, outcome: "fell_short", detail: fill(copy.repair.fellShort, values) };
  }
  /**
   * A generator bought for a truck that then opened with nothing to sell.
   *
   * This branch is the whole of a student red team's worst finding. The bill was cleared, so
   * the old reading called it **Paid off** and then said, in the same sentence, "the last
   * Saturday ran and took $0" — a heading and a fact that contradict each other, on the
   * biggest crowd of the run. The money was found and it bought an empty night: that is what
   * `cost you` is for, and it is true whichever line paid, because the question this verdict
   * answers is what the swap money did rather than which row it came off.
   */
  const emptyLast = (last?.cooked ?? 0) === 0;
  if (emptyLast) {
    return { id: "repair", label: copy.repair.label, taken: true, outcome: "cost_you", detail: fill(copy.repair.emptyLast, values) };
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
    verdicts.push(stockVerdict(input, ledger, n, copy, unfed, spotId, helper));
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
