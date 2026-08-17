import type { Dollars } from "../../../core/money";

/**
 * Run the Pop-Up's own vocabulary.
 *
 * §7.1 — a world has a contract and an interior, and the interior is its own. None of these
 * ids lives in `src/domain/core/ids.ts`: the shared module carries what the platform reasons
 * in (a world id, a challenge id), and a booth spot is not that. Basketball's `SetupId` sits
 * there because Basketball was the only world when it was written, which is a fact about the
 * order things were built in rather than a claim that every world owes the shared layer its
 * nouns.
 */

/** Where you set up in the market. Three prices, three sizes of crowd. */
export type SpotId = "back-lane" | "middle-row" | "bridge-gate";

/**
 * The three lines the student can actually move.
 *
 * `cut` is the savings line — the money banked for the person running the truck, and the
 * reason they took the gig. Nothing about the world says how big it should be.
 */
export type PopUpLineId = "stock" | "cushion" | "cut";

export const POP_UP_LINES: readonly PopUpLineId[] = ["stock", "cushion", "cut"] as const;

/** Money that only arrives if something happens. Both rules are plain and both are stated. */
export type PopUpSourceId = "catering" | "rebate";

/** The four sums a student works out unaided. */
export type PopUpSumId = "owed-up-front" | "cash-to-plan" | "first-order" | "swap-gap";

export const POP_UP_SUM_IDS: readonly PopUpSumId[] = ["owed-up-front", "cash-to-plan", "first-order", "swap-gap"] as const;

/** Which board the student is on. The opening plan, then the one repair. */
export type PopUpBoardId = "opening" | "repair";

/** The four Saturdays, numbered the way the market numbers them. */
export type SaturdayNumber = 1 | 2 | 3 | 4;

/** What money the plan puts where. Every dollar the student can move is in one of these. */
export type PopUpPlan = Record<PopUpLineId, Dollars>;

export interface SpotNumbers {
  id: SpotId;
  /** What the four Saturdays cost at this spot. Due before the first one, and not refundable. */
  booth: Dollars;
  /** Plates this spot's foot traffic will buy on a normal Saturday. */
  crowd: number;
  /** Plates it will buy on the last Saturday, when the market runs late. */
  lastCrowd: number;
}

/**
 * Every price, every crowd and every threshold in Run the Pop-Up.
 *
 * This is deliberately not `ScenarioNumbers`. Basketball's economy is weeks, blocks of time
 * and a course seat; this one is trays, crowds and food that goes in the bin. Forcing one
 * shape over both would have produced two worlds with the same interior wearing different
 * pictures, which §7.1 names as the failure the split exists to prevent.
 *
 * Nothing here is canon because it sounds reasonable. `balance.ts` beside this file sweeps
 * the whole strategy space and fails the build if re-pricing ever produces a spot, a stock
 * level, a hire or a split that is right for everybody or right for nobody.
 */
export interface PopUpNumbers {
  version: string;
  saturdays: 4;
  /** The Saturday the generator dies. Everything after it is run under the new terms. */
  breakdownSaturday: 3;
  /** What is in the truck's account on the first day. */
  startCash: Dollars;
  /** The city permit for the four Saturdays. Due up front, and not refundable. */
  permit: Dollars;
  spots: Record<SpotId, SpotNumbers>;
  /** The supplier sells by the tray, so stock does not divide evenly into a crowd. */
  platesPerTray: number;
  trayCost: Dollars;
  platePrice: Dollars;
  /** Plates one person can get out of the window in a night. */
  soloServeCap: number;
  /** Plates two people can. */
  helperServeCap: number;
  /** What the friend costs for the last Saturday. Booked early, and not refundable. */
  helperCost: Dollars;
  /** The catering job. It pays only if the studio confirms, and the studio does not. */
  catering: { amount: Dollars };
  /** The organiser's rebate. It pays only if the first Saturday sells out. */
  rebate: { amount: Dollars; minimumPlates: number };
  /** The rented generator, and what the shop holds against it. */
  generator: { replacement: Dollars; deposit: Dollars };
  /** The step the opening board moves money in. */
  planIncrement: 50;
  /** The step the repair board moves money in. */
  repairIncrement: 10;
}
