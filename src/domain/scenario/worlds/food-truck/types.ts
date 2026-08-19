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

/**
 * The three things that want the tips jar after the first Saturday.
 *
 * A world's own ids, as §7.1 asks. What crosses into the shared layer is the *event* they are
 * settled with and the four reasons a student may give, because those are what let a market
 * student's answer and a season student's answer be about the same thing.
 */
export type TipClaimId = "cool-box" | "cleaner-share" | "truck-sign";

/** The four Saturdays, numbered the way the market numbers them. */
export type SaturdayNumber = 1 | 2 | 3 | 4;

/** What money the plan puts where. Every dollar the student can move is in one of these. */
export type PopUpPlan = Record<PopUpLineId, Dollars>;

export interface SpotNumbers {
  id: SpotId;
  /** What the four Saturdays cost at this spot. Due before the first one, and not refundable. */
  booth: Dollars;
  /** Plates this spot's foot traffic will buy on an ordinary Saturday. */
  crowd: number;
}

/**
 * What one Saturday does to the crowd at any booth, as a share of an ordinary night.
 *
 * The market's own weather, priced. It is a property of the *night* rather than of the spot,
 * because a cold evening is cold at all three booths — so a student who has read what the
 * next Saturday is can work out what it means wherever they set up, and two students at two
 * booths are reading the same fact about the same market.
 *
 * `pull` is a whole percentage, not a multiplier, so the copy that states it before the order
 * is placed and the arithmetic that resolves the night afterwards are the same number.
 */
export interface NightNumbers {
  /**
   * What the night actually does. Scripted, never rolled, and the only figure any outcome is
   * worked out from — so the market replays identically whatever the student was told.
   */
  pull: number;
  /**
   * What the organiser can promise, where they cannot promise a figure.
   *
   * A night with a `told` band is stated to the student as a range and resolves at `pull`,
   * which sits inside it. That is not a hidden number: it is the difference between being
   * told what will happen and being told what might, and it is the one thing this world was
   * never asking. Every ordering screen in the market printed the exact plates the crowd
   * would buy, four times, so the student's stocking decision was arithmetic against a
   * printed figure — while the other story's central beat is committing money before you
   * know. One rubric row reads both, and it was reading two different constructs.
   *
   * Determinism does not require disclosure, and the other world is the proof: its Week 5 is
   * scripted, replays identically and is swept identically, and the student is not told about
   * it while building the plan it breaks. So the range is a free choice about *disclosure*
   * and changes nothing about the *world*. `pull` is what happens; `told` is what you knew.
   *
   * It is set on one night — the last one, after the generator, where the stakes are already
   * highest — and not on all four. Three stated nights are what make the fourth readable as a
   * range rather than as a market that has stopped explaining itself, and they keep the
   * planning-inside-known-money competency this world exists to assess intact.
   */
  told?: { low: number; high: number };
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
  /**
   * The four Saturdays, and what each one does to a crowd.
   *
   * Every one of them is a different night, and the student is told which before they order
   * for it. That is the difference between a market and a lottery: an evening that turns out
   * colder than the last one is a surprise, and an evening you were told would be colder is a
   * decision. Nothing here is rolled, so the same order on the same night always resolves the
   * same way — which is what lets the balance harness sweep it and a teacher replay it.
   */
  nights: Record<SaturdayNumber, NightNumbers>;
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
  /**
   * Mo's tips from the first Saturday, and the three things that want them.
   *
   * Outside the plan on purpose: it never reaches stock, the cushion or the cut, it cannot
   * be banked, and no function in `ledger.ts` or `economy.ts` reads it. That keeps the beat
   * out of the strategy space `balance.ts` sweeps, which is what lets a world that refuses
   * to grade a preference grade this one thing.
   */
  tips: { cash: Dollars; claimCosts: Record<TipClaimId, Dollars> };
  /** The step the opening board moves money in. */
  planIncrement: 50;
  /** The step the repair board moves money in. */
  repairIncrement: 10;
}
