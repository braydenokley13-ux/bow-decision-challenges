import type { PopUpLedger } from "../../domain/scenario/worlds/food-truck/ledger";
import type { PopUpNumbers, SaturdayNumber } from "../../domain/scenario/worlds/food-truck/types";
import type { SaturdayOutcome } from "../../domain/scenario/worlds/food-truck/economy";

/**
 * The arithmetic the screens do, kept out of the screens.
 *
 * None of it is about money the world owes anybody — `economy.ts` and `ledger.ts` own that and
 * these functions call into them rather than restating them. What lives here is the question a
 * *screen* has to answer: how many trays this student can still pay for, and whether the night
 * they just watched is worth a sentence about the bin. Pure, so it can be tested without a
 * browser, and separate, so a screen never quietly invents a second economy.
 */

/**
 * The most trays this student can order for each of `nights` nights.
 *
 * The ledger buys what the stock line can afford and silently cooks fewer, which is correct
 * and invisible. A control that let a student ask for ten trays they cannot pay for would be a
 * control that lies to them, so the cap is stated here and drawn on the screen.
 */
export function affordableTrays(stockHeld: number, n: PopUpNumbers, nights = 1): number {
  return Math.max(0, Math.floor(stockHeld / (n.trayCost * Math.max(1, nights))));
}

export interface NightRead {
  /** Plates that went in the bin, as whole trays where it divides. */
  spoiled: number;
  binned: number;
  soldOut: boolean;
  /** The crowd wanted more than the window could hand over. A different lesson from spoilage. */
  turnedAway: boolean;
}

/**
 * What one night is worth saying out loud.
 *
 * `turnedAway` is the honest half of the bridge-gate trade: a booth can be busier than one
 * pair of hands, and a student who sold every plate at the cap has not been told anything by
 * "you sold out" alone.
 */
export function readNight(outcome: SaturdayOutcome, crowd: number, serveCap: number): NightRead {
  return {
    spoiled: outcome.spoiled,
    binned: outcome.binned,
    soldOut: outcome.soldOut,
    turnedAway: outcome.spoiled === 0 && outcome.cooked > 0 && Math.min(crowd, outcome.cooked) > serveCap,
  };
}

/** The Saturdays as a strip: what is done, what is being lived through, what is ahead. */
export function marketStrip(ledger: PopUpLedger, current: number | null, saturdays: number) {
  return Array.from({ length: saturdays }, (_, index) => {
    const saturday = (index + 1) as SaturdayNumber;
    const played = ledger.saturdays.find((day) => day.saturday === saturday);
    return {
      saturday,
      state: played ? "played" : current === saturday ? "current" : "ahead",
      sold: played?.sold ?? null,
      spoiled: played?.spoiled ?? null,
    } as const;
  });
}
