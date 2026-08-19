import type { Dollars } from "../../domain/core/money";
import type { PopUpLedger } from "../../domain/scenario/worlds/food-truck/ledger";
import type { MarketPosition } from "../../domain/scenario/worlds/food-truck/stages";
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

/**
 * What the truck actually has in hand, right now — the motif HUD's own figure.
 *
 * Nothing here is stored; it is read off the same ledger every screen already prices its
 * questions from (`ledger.ts:16-24`). Two facts the ledger cannot answer on its own decide
 * which of its fields is the honest one to show:
 *
 * - Before a booth is taken, nothing has been committed yet, so the honest figure is the
 *   account's own opening balance — not zero, which is what an unopened plan prices to.
 * - Once a booth is taken but before the opening plan is saved, `ledger.cashToPlan` is what
 *   is actually in the account: the permit and the booth are gone, and nothing else has
 *   moved. It deliberately does not include money with a rule on it — a catering fee that
 *   has not been confirmed is not cash in hand, whatever the plan later decides to count.
 * - From the moment the plan is saved onward, `ledger.endMoney` already *is* this figure —
 *   the three lines plus whatever the truck has taken at the window so far — computed fresh
 *   from the decisions on record at every point in the run, not only at the very end. The
 *   settle screen reads the same field and calls it "Money in hand" for the same reason.
 */
export function cashOnHand(hasSpot: boolean, openingCommitted: boolean, ledger: PopUpLedger, n: PopUpNumbers): Dollars {
  if (!hasSpot) return n.startCash;
  if (!openingCommitted) return ledger.cashToPlan;
  return ledger.endMoney;
}

/**
 * Where the run stands, in the HUD's own words rather than the heading's.
 *
 * `marketPositionFor`'s caption is written for a screen's own kicker — "Saturdays 2 and 3",
 * "After Saturday 3" — and reads correctly there because the screen beneath it says which of
 * the two nights is which. A HUD tile has no screen under it, so this asks the same position
 * for the one thing every stage can say honestly: which Saturday of four this is, or how far
 * from one the run currently sits.
 */
export function motifSaturdayLabel(position: MarketPosition, saturdays: number): string {
  if (position.current !== null) return `Saturday ${position.current} of ${saturdays}`;
  if (position.played <= 0) return "Before Saturday 1";
  if (position.played >= saturdays) return "Market over";
  return `After Saturday ${position.played}`;
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
