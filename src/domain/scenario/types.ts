import type { Dollars } from "../core/money";
import type { SetupId, WorldId } from "../core/ids";

export interface ScenarioNumbers {
  version: string;
  weeks: 8;
  savings: Dollars;
  basePay: Dollars;
  reliableFloor: Dollars;
  completionIncome: Dollars;
  outcomeIncome: Dollars;
  essentialsPerWeek: Dollars;
  essentialsTotal: Dollars;
  goalCap: Dollars;
  setupCosts: Record<SetupId, Dollars>;
  setupEventCosts: Record<SetupId, Dollars>;
  requiredWeek5Cost: Dollars;
  optionalWorkIncome: Dollars;
  openingIncrement: 100;
  repairIncrement: 50;
}

export interface SetupOptionDefinition {
  id: SetupId;
  title: string;
  terms: string;
  total: Dollars;
  /** The cost that is not money: what this place asks of Avery's day. */
  commute: string;
  /** One-way minutes, so the three options can be compared as a drawn bar. */
  commuteMinutes: number;
  tradeoff: string;
  eventCost: Dollars;
  eventCostLabel: string;
}

export interface WorldScenario {
  id: WorldId;
  title: string;
  subtitle: string;
  role: { name: string; age: 18; description: string };
  goalLabel: string;
  numbers: ScenarioNumbers;
  setups: readonly SetupOptionDefinition[];
  incomeCopy: Record<"savings" | "base" | "completion" | "outcome", string>;
  /** Beat 1. What just happened to the player, and what they want out of it. */
  offer: {
    team: string;
    position: string;
    jersey: string;
    kicker: string;
    headline: string;
    body: string;
    want: string;
    wantDetail: string;
    facts: readonly { label: string; value: string }[];
  };
  /**
   * Weeks the student does not play through, so the jump to Week 5 still feels earned.
   * `voice` is Avery's own line for that week, and it differs by where the student put
   * Avery — the housing choice is felt every week, not only when it bills.
   */
  season: readonly { week: string; note: string; voice: Record<SetupId, string> }[];
  /** Week 5 arrives as two separate pieces of news, so the turn lands as two hits. */
  disruption: {
    source: string;
    title: string;
    beats: readonly { marker: string; tag: string; text: string }[];
    /** What rehab actually means for the place the student chose. */
    voice: Record<SetupId, string>;
    requiredCostLabel: string;
  };
  opportunity: { from: string; title: string; body: string; timeCost: string };
}

export interface WorldRegistryEntry {
  id: WorldId;
  title: string;
  subtitle: string;
  availability: "available";
  scenario: WorldScenario;
}
