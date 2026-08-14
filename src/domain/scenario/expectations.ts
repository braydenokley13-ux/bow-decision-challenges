import type { Dollars } from "../core/money";
import { dollars } from "../core/money";
import type { SetupId } from "../core/ids";
import type { ScenarioNumbers } from "./types";

/**
 * The answer each entered calculation should reconcile to, derived from the scenario's
 * own numbers.
 *
 * Nothing here may be a literal. The grader used to carry 5000 / 1400 / 1000 / 1600 in its
 * own source while the scenario held every one of them, so changing a dollar amount marked
 * correct answers wrong without failing a test. Every expectation is now a function of
 * `ScenarioNumbers`, which is what lets the model be re-priced and re-balanced safely.
 */

/** The places ordered cheapest-first over the whole eight weeks. */
export function setupCostOrder(n: ScenarioNumbers): SetupId[] {
  return (Object.keys(n.setupCosts) as SetupId[]).sort((a, b) => n.setupCosts[a] - n.setupCosts[b]);
}

/** The three setup prices in rank order, so "middle" and "lowest" survive a re-pricing. */
export function setupTotalsByRank(n: ScenarioNumbers): { lowest: Dollars; middle: Dollars; highest: Dollars } {
  const totals = (Object.keys(n.setupCosts) as SetupId[])
    .map((id) => n.setupCosts[id])
    .sort((a, b) => a - b);
  const [lowest, middle, highest] = totals;
  if (lowest === undefined || middle === undefined || highest === undefined) {
    throw new Error("A scenario must price exactly three setups for the full-cost comparison.");
  }
  return { lowest, middle, highest };
}

/** What the place the student actually picked costs across the eight weeks. */
export function chosenSetupExpectation(n: ScenarioNumbers, setupId: SetupId | undefined): Dollars | null {
  return setupId ? n.setupCosts[setupId] : null;
}

export function reliableFloorExpectation(n: ScenarioNumbers): Dollars {
  return dollars(n.savings + n.basePay);
}

export function essentialsExpectation(n: ScenarioNumbers): Dollars {
  return dollars(n.essentialsPerWeek * n.weeks);
}

/**
 * The Week 5 total is the only expectation that depends on the run: conditional income the
 * student chose to count disappears, and the required costs land on the setup they picked.
 */
export function week5ChangeExpectation(
  n: ScenarioNumbers,
  context: { setupId: SetupId | undefined; countedOutcome: boolean },
): Dollars | null {
  if (!context.setupId) return null;
  return dollars(
    (context.countedOutcome ? n.outcomeIncome : 0) + n.requiredWeek5Cost + n.setupEventCosts[context.setupId],
  );
}
