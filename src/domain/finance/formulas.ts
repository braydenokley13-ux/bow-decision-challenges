import { CATEGORY_ORDER, type CategoryId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import type { PlanAmounts, PlanReadout, SnapshotInputs } from "./types";

export function assigned(amounts: PlanAmounts) {
  return dollars(amounts.goal + amounts.reserve + amounts.flexibleCash);
}

export function exposureFor(input: Pick<SnapshotInputs, "includeCompletion" | "includeOutcome">, n: ScenarioNumbers) {
  return dollars((input.includeCompletion ? n.completionIncome : 0) + (input.includeOutcome ? n.outcomeIncome : 0));
}

export function availableFor(input: SnapshotInputs, n: ScenarioNumbers) {
  const reliable = n.savings + n.basePay;
  switch (input.mode) {
    case "working":
      return dollars(reliable + (input.includeCompletion ? n.completionIncome : 0) + (input.includeOutcome ? n.outcomeIncome : 0));
    case "fallback":
      return dollars(reliable);
    case "week5-first-response":
      return dollars(reliable + (input.includeCompletion ? n.completionIncome : 0));
    case "final":
      return dollars(reliable + (input.includeCompletion ? n.completionIncome : 0) + (input.includeOptionalWork ? n.optionalWorkIncome : 0));
    case "remaining-risk":
      return dollars(reliable + (input.includeOptionalWork ? n.optionalWorkIncome : 0));
  }
}

/**
 * How much of what this plan can spend arrives only if a rule is met.
 *
 * It follows `availableFor` mode by mode rather than reading the student's ticks, because
 * the two answer different questions: the ticks say what they once counted on, and this
 * says what the plan in front of them is counting on now. The backup version and the
 * no-bonus check are priced with no conditional money at all, so both are zero here — and
 * anything drawing a hatched band or naming an exposure has to agree with the arithmetic
 * that priced the board rather than with a checkbox two screens back.
 */
export function conditionalIn(input: SnapshotInputs, n: ScenarioNumbers) {
  switch (input.mode) {
    case "working":
      return exposureFor(input, n);
    case "week5-first-response":
    case "final":
      return dollars(input.includeCompletion ? n.completionIncome : 0);
    case "fallback":
    case "remaining-risk":
      return dollars(0);
  }
}

export function lockedFor(input: SnapshotInputs, n: ScenarioNumbers) {
  const base = n.setupCosts[input.setupId] + n.essentialsTotal;
  const event = input.week5Applied ? n.requiredWeek5Cost + n.setupEventCosts[input.setupId] : 0;
  // A reserved seat is committed money. It is cheaper than paying later and it cannot be
  // pulled back to cover Week 5 — that is the whole trade.
  const deposit = input.depositTaken ? n.course.depositPrice : 0;
  // Coaching the clinics is not free to Avery: travel, and the physio a body that is not
  // resting needs. The fee is gross; this is what comes back out of it.
  const clinicCost = input.includeOptionalWork ? n.optionalWorkCost : 0;
  return dollars(base + event + deposit + clinicCost);
}

/** What the course still costs this plan, given whether the seat was reserved early. */
export function courseCostFor(input: Pick<SnapshotInputs, "depositTaken">, n: ScenarioNumbers) {
  return input.depositTaken ? n.course.depositPrice : n.course.fullPrice;
}

/** The most the adjustable course row may hold. A reserved seat is already paid. */
export function courseRowCapFor(input: Pick<SnapshotInputs, "depositTaken">, n: ScenarioNumbers) {
  return input.depositTaken ? dollars(0) : n.course.fullPrice;
}

/**
 * The ceiling the product itself puts on each adjustable row, or null where it puts none.
 *
 * Only the course row has one. Reserving the seat moves that money into the locked costs and
 * `courseRowCapFor` drops the row to zero; the money in the other two is bounded by the plan
 * and by nothing else, which is the constraint the whole task is about rather than the
 * product overruling a student.
 */
export function rowCeilingsFor(input: Pick<SnapshotInputs, "depositTaken">, n: ScenarioNumbers): Record<CategoryId, Dollars | null> {
  return { goal: courseRowCapFor(input, n), reserve: null, flexibleCash: null };
}

/**
 * One adjustable row, read as a record of what the *student* did to it.
 *
 * A delta cannot answer that question, because the product edits these rows too. Pressing
 * *Reserve it now* at Week 4 commits the course money: `courseRowCapFor` drops that row's
 * ceiling to zero and the reducer empties it in every draft the student is holding. Read as
 * a plain `final − opening`, that forced zero is the deepest reduction on the board — so
 * every student who paid to protect the course seat was filed as the one who gave it up
 * first, and the class read and the printed debrief said so out loud, four inches under the
 * same five names listed as the students who reserved it.
 *
 * So a movement is measured against `reachable`: the opening amount clamped to the ceiling
 * the final board actually left the row. A row the product emptied has nothing left for a
 * student to give up, and contributes to neither figure.
 */
export interface RowMovement {
  category: CategoryId;
  /** The most this row could still hold on the final board, after the product's own caps. */
  reachable: Dollars;
  /** What the student took off the row. Zero for a row the product had already emptied. */
  chosenReduction: Dollars;
  /** What the product's own ceiling took off it. Never reported as a decision. */
  forcedReduction: Dollars;
  /** Whether the student moved the row at all, in either direction. */
  moved: boolean;
}

/**
 * The three rows of one plan, opening to final, with the product's own edits taken out.
 *
 * `caps` is the plan the ceilings are read from — the final one, because that is the board
 * the student was last free to act on.
 */
export function planMovements(
  opening: PlanAmounts,
  final: PlanAmounts,
  caps: Pick<SnapshotInputs, "depositTaken">,
  n: ScenarioNumbers,
): RowMovement[] {
  const ceilings = rowCeilingsFor(caps, n);
  return CATEGORY_ORDER.map((category) => {
    const ceiling = ceilings[category];
    const reachable = dollars(ceiling === null ? opening[category] : Math.min(opening[category], ceiling));
    return {
      category,
      reachable,
      chosenReduction: dollars(Math.max(0, reachable - final[category])),
      forcedReduction: dollars(opening[category] - reachable),
      moved: final[category] !== reachable,
    };
  });
}

export function balanceOf(input: SnapshotInputs, n: ScenarioNumbers) {
  return dollars(availableFor(input, n) - lockedFor(input, n) - assigned(input.amounts));
}

export function residualOf(balance: number) {
  return dollars(Math.max(0, -balance));
}

export function unassignedOf(balance: number) {
  return dollars(Math.max(0, balance));
}

export function amountFreed(baseline: PlanAmounts, current: PlanAmounts) {
  return dollars(assigned(baseline) - assigned(current));
}

export function readoutFor(input: SnapshotInputs, n: ScenarioNumbers): PlanReadout {
  const balance = balanceOf(input, n);
  return {
    available: availableFor(input, n),
    locked: lockedFor(input, n),
    assignedTotal: assigned(input.amounts),
    balance,
    residual: residualOf(balance),
    unassigned: unassignedOf(balance),
    exposure: input.mode === "working" ? exposureFor(input, n) : dollars(0),
  };
}

export function week5Change(input: Pick<SnapshotInputs, "includeOutcome" | "setupId">, n: ScenarioNumbers) {
  return dollars((input.includeOutcome ? n.outcomeIncome : 0) + n.requiredWeek5Cost + n.setupEventCosts[input.setupId]);
}

export function fallbackMetrics(opening: SnapshotInputs, fallback: SnapshotInputs, n: ScenarioNumbers) {
  const balance = balanceOf(fallback, n);
  return {
    exposure: exposureFor(opening, n),
    amountFreed: amountFreed(opening.amounts, fallback.amounts),
    stillExposed: residualOf(balance),
    fallbackUnassigned: unassignedOf(balance),
  };
}
