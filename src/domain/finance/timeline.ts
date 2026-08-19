import type { SetupId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import type { PlanAmounts } from "./types";

/**
 * The season as it is actually lived, week by week.
 *
 * The plan is priced across all eight weeks at once, which is the right way to build it and
 * the wrong way to feel it. Nothing in the product ever showed money leaving: a student
 * committed to eight weeks of rent on one screen and then watched four weeks pass on a
 * screen where the only thing that changed was the text. This turns the commitments the
 * plan already holds into what they are — a weekly drain on an account and a weekly bite
 * out of Avery's time — without adding a single new number to the model.
 *
 * Every value here is a view of costs the plan has already locked. There is no second
 * ledger and nothing to balance; a student cannot change these, only see them.
 */
export interface SeasonWeekEntry {
  week: number;
  /** Pay that has landed by the end of this week, savings included. */
  received: Dollars;
  /** Rent and essentials that have gone out by the end of this week. */
  paid: Dollars;
  /** What is left of the money that has actually arrived. */
  inHand: Dollars;
  /** Rent paid this week alone. */
  setupThisWeek: Dollars;
  /** Essentials paid this week alone. */
  essentialsThisWeek: Dollars;
  /** Hours the trip to the gym costs in a single week. */
  hoursThisWeek: number;
  /** Hours the trip has cost since the season started. */
  hoursToDate: number;
}

/**
 * Base pay lands across the season rather than on day one, so `received` is what has
 * arrived rather than what was promised. Rounding is applied to the running total, not to
 * each week, so eight weeks always sum to exactly the contract.
 */
function accruedBy(total: number, week: number, weeks: number): number {
  return Math.round((total * week) / weeks);
}

export function seasonLedger(setupId: SetupId, throughWeek: number, n: ScenarioNumbers): SeasonWeekEntry[] {
  const setupCost = n.setupCosts[setupId];
  const hoursPerWeek = n.load.commuteBlocks[setupId];
  return Array.from({ length: Math.max(0, Math.min(throughWeek, n.weeks)) }, (_, index) => {
    const week = index + 1;
    const received = n.savings + accruedBy(n.basePay, week, n.weeks);
    const setupPaid = accruedBy(setupCost, week, n.weeks);
    const essentialsPaid = n.essentialsPerWeek * week;
    const paid = setupPaid + essentialsPaid;
    return {
      week,
      received: dollars(received),
      paid: dollars(paid),
      inHand: dollars(received - paid),
      setupThisWeek: dollars(setupPaid - accruedBy(setupCost, week - 1, n.weeks)),
      essentialsThisWeek: n.essentialsPerWeek,
      hoursThisWeek: hoursPerWeek,
      hoursToDate: hoursPerWeek * week,
    };
  });
}

/**
 * What reserving the course seat would do to the plan the student is holding, worked out
 * before they commit rather than discovered afterwards.
 *
 * The seat is cheaper than paying later and the money stops being movable — that is the
 * whole trade. A student who set nothing aside for the course can still reserve it; they
 * simply see, in advance, exactly how far it puts them under. Showing the number first is
 * what makes this a decision instead of a trap.
 */
export interface DepositPreview {
  /** What the seat costs today. */
  price: Dollars;
  /** What it costs if the student waits. */
  laterPrice: Dollars;
  saving: Dollars;
  /** What the plan already has set aside for the course. */
  setAside: Dollars;
  /** Money the plan must find elsewhere to cover the seat. Zero when it is already there. */
  shortBy: Dollars;
  /** Course money freed by paying less than was set aside, which needs a new job. */
  freed: Dollars;
  /** Every dollar the plan is holding that the student can still move today. */
  movableNow: Dollars;
  /**
   * What would still be movable once the seat is held. The course line is what pays for the
   * seat and stops being adjustable, so this is the money left to meet whatever the rest of
   * the season brings — the other half of the trade, and the half the screen used not to say.
   */
  movableAfter: Dollars;
}

export function depositPreview(amounts: PlanAmounts, n: ScenarioNumbers): DepositPreview {
  const price = n.course.depositPrice;
  const courseSetAside = amounts.goal;
  return {
    price,
    laterPrice: n.course.fullPrice,
    saving: dollars(n.course.fullPrice - price),
    setAside: courseSetAside,
    shortBy: dollars(Math.max(0, price - courseSetAside)),
    freed: dollars(Math.max(0, courseSetAside - price)),
    movableNow: dollars(amounts.goal + amounts.reserve + amounts.flexibleCash),
    movableAfter: dollars(amounts.reserve + amounts.flexibleCash),
  };
}
