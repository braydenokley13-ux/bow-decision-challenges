import { dollars, type Dollars } from "../../../core/money";
import { crowdOn, playSaturday, sellCap, serveCap, type SaturdayOutcome } from "./economy";
import type { PopUpNumbers, SaturdayNumber, SpotId } from "./types";

/**
 * The night, played out instead of reported.
 *
 * `playSaturday` answers a Saturday in four lines of arithmetic: cook `trays × 10`, sell the
 * smaller of what you cooked and what the window can pass, bin the rest. It is correct, it is
 * swept over 174,339 states, and a student met it as a card of finished numbers — *30 cooked,
 * 22 sold, 8 binned* — for a decision they had made two screens earlier. The most consequential
 * thing in the world happened to them off-screen.
 *
 * This module turns those same four numbers into an evening. Nobody arrives who was not already
 * in `crowdOn`; nobody is served who was not already in `sold`; nobody is turned away who was
 * not already in `spoiled` or above the serve cap. **The fold of every beat is
 * `playSaturday` exactly**, and `service.test.ts` asserts that over every booth, every
 * Saturday, every helper state and every reachable tray count — so this can never become a
 * second, kinder account of the night sitting beside the real one.
 *
 * ## Why the beats are what they are
 *
 * The model already contains two different ways to lose a sale and they are not the same
 * lesson, so the night has to tell them apart:
 *
 *   - **`no-stock`** — somebody wanted a plate and there were none left. That is the tray
 *     decision arriving. `cooked < min(crowd, cap)`.
 *   - **`no-hands`** — somebody wanted a plate, there were plenty, and one pair of hands could
 *     not get to them. That is `serveCap`, and it is why hiring Marisol is a real question
 *     rather than a fee. At the bridge gate on your own, `crowdOn` is 54 and `soloServeCap` is
 *     45: nine people were always going to leave, and until now the world charged the student
 *     for that without ever showing it to them.
 *
 * ## What this deliberately does not do
 *
 * It adds no decision, no sum, no money and no state. `PARITY_BANDS.arithmeticOperations` is
 * `{ kind: "equal" }` across worlds and `balance.ts` sweeps a fixed strategy space; a service
 * phase that let a student change anything mid-night would move both. The student's agency here
 * is pace and attention. What changes is that a consequence they had to be *told* is now one
 * they *watch*, which is the whole difference between a result and a run.
 */

/** Why an order ended the way it did. */
export type ServiceOutcome = "served" | "short" | "no-stock" | "no-hands";

export interface ServiceOrder {
  /** 1-based, the way a ticket number reads. */
  ticket: number;
  /** Minutes after the window opens. */
  minute: number;
  /** How many plates this group came for. */
  wanted: number;
  /**
   * How many of this group the window could physically have got to, plates aside.
   *
   * Kept on the order because a group can be split by both ceilings at once — two of the three
   * were inside the cap and only one of those found a plate — and a fold that could not tell
   * those apart would report a serve-cap loss as a stock loss, which is the opposite lesson.
   */
  reachable: number;
  /** How many they left with. Zero for both turned-away kinds. */
  served: number;
  outcome: ServiceOutcome;
  /** What this order put in the till. */
  takings: Dollars;
  /** Plates still on the counter once this order has been dealt with. */
  platesLeft: number;
  /** Money in the till once this order has been dealt with. */
  tillAfter: Dollars;
}

export interface ServiceRun {
  orders: readonly ServiceOrder[];
  /** Plates cooked before the window opened. The counter's starting stock. */
  cooked: number;
  /** Everyone `crowdOn` says walked past tonight. */
  crowd: number;
  /** The most this window could pass in an evening, whatever was on the counter. */
  cap: number;
  /** How long the window is open, in minutes. */
  minutes: number;
  /** The night as `playSaturday` computes it. The fold of `orders` reproduces every field. */
  outcome: SaturdayOutcome;
}

/** The window is open five hours. Arrivals are spread across it, busiest in the middle. */
const SERVICE_MINUTES = 300;

/**
 * How many plates the next group wants.
 *
 * A fixed cycle rather than anything random: the run has to replay identically for a teacher
 * reading it back, and `determinism.test.ts` holds the whole world to that. Ones and twos with
 * the occasional three is what a street food queue actually looks like, and it keeps the
 * number of taps a student makes to roughly half the crowd rather than all of it.
 */
const GROUP_CYCLE: readonly number[] = [1, 2, 1, 1, 3, 2, 1, 2, 1, 1, 2, 3];

/**
 * When the nth of `total` arrivals reaches the window.
 *
 * Weighted so the middle of the evening is busiest — a market fills up and then thins out, and
 * a flat arrival rate makes running out of plates at 21:40 feel the same as running out at
 * 17:20. It is a shape, not a mechanic: nothing downstream reads the minute, and the outcome is
 * identical whatever the curve.
 */
function minuteOf(index: number, total: number): number {
  if (total <= 1) return Math.round(SERVICE_MINUTES / 2);
  const t = index / (total - 1);
  // A smoothstep, so arrivals bunch toward the middle without any group sharing a minute.
  const eased = t * t * (3 - 2 * t);
  return Math.round(eased * SERVICE_MINUTES);
}

/**
 * The evening, order by order.
 *
 * The three quantities that decide it are the three the model already has. `servable` is how
 * many people one window could physically deal with; `sold` is how many of those found a plate
 * waiting. Everyone above `servable` left because nobody could get to them, and everyone
 * between `sold` and `servable` left because the counter was bare.
 */
export function serviceRun(
  n: PopUpNumbers,
  spotId: SpotId,
  saturday: SaturdayNumber,
  trays: number,
  helper: boolean,
): ServiceRun {
  const outcome = playSaturday(n, spotId, saturday, trays, helper);
  const crowd = crowdOn(n, spotId, saturday);
  const cap = serveCap(n, saturday, helper);
  const servable = sellCap(n, spotId, saturday, helper);
  const cooked = outcome.cooked;

  const orders: ServiceOrder[] = [];
  let dealtWith = 0;
  let servedSoFar = 0;
  let till = dollars(0);
  let ticket = 0;

  while (dealtWith < crowd) {
    const wanted = Math.min(GROUP_CYCLE[ticket % GROUP_CYCLE.length] ?? 1, crowd - dealtWith);
    ticket += 1;

    // How many of this group are inside the window's reach at all, and how many of those find
    // a plate. Both are running totals against the model's own two ceilings.
    const reachable = Math.max(0, Math.min(wanted, servable - dealtWith));
    const served = Math.max(0, Math.min(reachable, outcome.sold - servedSoFar));

    servedSoFar += served;
    dealtWith += wanted;
    const takings = dollars(served * n.platePrice);
    till = dollars(till + takings);

    const outcomeOf: ServiceOutcome = served === wanted
      ? "served"
      : served > 0
        ? "short"
        : reachable > 0
          ? "no-stock"
          : "no-hands";

    orders.push({
      ticket,
      // Filled in below, once the run knows how many orders there were to spread.
      minute: 0,
      wanted,
      reachable,
      served,
      outcome: outcomeOf,
      takings,
      platesLeft: cooked - servedSoFar,
      tillAfter: till,
    });
  }

  // The clock is assigned last, because spreading arrivals across the evening needs the order
  // count and the order count is not known until the crowd has been dealt out into groups.
  const timed = orders.map((order, index) => ({ ...order, minute: minuteOf(index, orders.length) }));

  return { orders: timed, cooked, crowd, cap, minutes: SERVICE_MINUTES, outcome };
}

/** The clock on the window, from minutes after opening. The market runs 17:00 to 22:00. */
export function marketClock(minute: number): string {
  const total = 17 * 60 + Math.max(0, Math.min(SERVICE_MINUTES, Math.round(minute)));
  const hour = Math.floor(total / 60) % 24;
  return `${String(hour).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * What the run adds up to, recomputed from the beats rather than copied from the outcome.
 *
 * This exists so the test can compare two independently-derived answers. A helper that read
 * `run.outcome` back out would assert nothing at all.
 */
export function foldService(run: ServiceRun): {
  sold: number;
  takings: Dollars;
  turnedAwayNoStock: number;
  turnedAwayNoHands: number;
} {
  let sold = 0;
  let takings = 0;
  let noStock = 0;
  let noHands = 0;
  for (const order of run.orders) {
    sold += order.served;
    takings += order.takings;
    // Both ceilings can bite one order, so each loss is attributed to the one that caused it:
    // inside the window's reach but with a bare counter is stock; beyond its reach is hands.
    noStock += Math.max(0, order.reachable - order.served);
    noHands += Math.max(0, order.wanted - order.reachable);
  }
  return { sold, takings: dollars(takings), turnedAwayNoStock: noStock, turnedAwayNoHands: noHands };
}
