import type { SetupId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";

/**
 * Avery's week, priced the same way the money is.
 *
 * Load is deliberately a single readout, not a second ledger. The student never balances
 * it — they see one meter move as a consequence of where Avery lives, what the season has
 * done to the schedule, and how much of the plan they spent buying time back.
 */
export interface LoadInputs {
  setupId: SetupId;
  /** Rehab has started: Week 5 onward. */
  rehabActive: boolean;
  /** The Saturday clinics were accepted. */
  clinicsAccepted: boolean;
  /** Money assigned to Avery's week, which buys blocks back. */
  timeMoney: Dollars;
}

export interface LoadReadout {
  /** Blocks the week costs before any money is spent on it. */
  demand: number;
  /** Blocks bought back with money assigned to Avery's week. */
  bought: number;
  /** What Avery is actually carrying. */
  net: number;
  /** The line above which Avery misses a session. */
  limit: number;
  /**
   * Whether the attendance bonus is on the line yet. It is decided in the weeks after the
   * injury, so before rehab starts the meter is context about the choice already made, not
   * a warning about a consequence that cannot happen yet.
   */
  atRisk: boolean;
  capacity: number;
  /** Blocks still to shed before the attendance bonus is safe. Zero when it is. */
  overBy: number;
  attendanceHolds: boolean;
  /** What one hour a week costs to buy back. */
  blockCost: Dollars;
  /**
   * The most money this week can absorb. Every hour there is to buy, at the block price —
   * past it a dollar buys nothing at all, because there is no hour left for it to buy. It is
   * a fact the student needs *before* they spend, which is why it is on the readout rather
   * than discovered from a row that stopped responding.
   */
  buybackCeiling: Dollars;
  /** What it would cost to get back under the line, or null when already under it. */
  costToProtect: Dollars | null;
  /** What it would cost from here, given what has already been spent. */
  costToClear: Dollars;
}

export function blocksBoughtBy(timeMoney: Dollars, n: ScenarioNumbers): number {
  if (n.load.blockBuybackCost <= 0) return 0;
  return Math.floor(timeMoney / n.load.blockBuybackCost);
}

export function loadDemand(input: Pick<LoadInputs, "setupId" | "rehabActive" | "clinicsAccepted">, n: ScenarioNumbers): number {
  return (
    n.load.commuteBlocks[input.setupId]
    + (input.rehabActive ? n.load.rehabBlocks + n.load.rehabTravelBlocks[input.setupId] : 0)
    + (input.rehabActive && input.clinicsAccepted ? n.load.clinicBlocks : 0)
  );
}

export function loadFor(input: LoadInputs, n: ScenarioNumbers): LoadReadout {
  const demand = loadDemand(input, n);
  // Money only buys back blocks that are actually there to buy.
  const bought = Math.min(demand, blocksBoughtBy(input.timeMoney, n));
  const net = demand - bought;
  const atRisk = input.rehabActive;
  const overBy = atRisk ? Math.max(0, net - n.load.attendanceLimit) : 0;
  const shortfallFromDemand = atRisk ? Math.max(0, demand - n.load.attendanceLimit) : 0;
  return {
    demand,
    bought,
    net,
    limit: n.load.attendanceLimit,
    atRisk,
    capacity: n.load.weeklyCapacity,
    overBy,
    attendanceHolds: overBy === 0,
    blockCost: n.load.blockBuybackCost,
    buybackCeiling: dollars(demand * n.load.blockBuybackCost),
    costToProtect: shortfallFromDemand === 0 ? null : dollars(shortfallFromDemand * n.load.blockBuybackCost),
    costToClear: dollars(overBy * n.load.blockBuybackCost),
  };
}
