import type { Dollars } from "../core/money";
import type { SetupId, WorldId } from "../core/ids";

/**
 * Avery's week, in blocks.
 *
 * A block is one hour that is not already practice, a game, or school. Time is a second
 * scarce resource, not decoration: where Avery lives, required rehab, and the Saturday
 * clinics all spend blocks, and money can buy some of them back. Above `attendanceLimit`
 * in the weeks that decide the attendance bonus, Avery misses a session and the bonus is
 * gone — deterministically, from the student's own choices, never at random.
 */
export interface LoadNumbers {
  /** Blocks Avery has in a week once practice, games and school are taken out. */
  weeklyCapacity: number;
  /** Blocks the trip to and from the gym costs each week, by where Avery stays. */
  commuteBlocks: Record<SetupId, number>;
  /** Blocks required rehab costs each week once it starts. */
  rehabBlocks: number;
  /** Extra blocks getting to rehab costs, by where Avery stays. */
  rehabTravelBlocks: Record<SetupId, number>;
  /** Blocks the Saturday clinics cost each week if Avery takes them. */
  clinicBlocks: number;
  /** Dollars that buy back one block a week for the rest of the season. */
  blockBuybackCost: Dollars;
  /** Above this weekly load, Avery misses a session and the attendance bonus is lost. */
  attendanceLimit: number;
}

/**
 * The sports-media course. Reserving the seat early is cheaper, and the money is gone the
 * moment it is committed — which is the point: it buys a discount and costs flexibility
 * the student may want back after Week 5.
 */
export interface CourseNumbers {
  fullPrice: Dollars;
  depositPrice: Dollars;
  depositDeadlineWeek: number;
}

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
  course: CourseNumbers;
  load: LoadNumbers;
  setupCosts: Record<SetupId, Dollars>;
  setupEventCosts: Record<SetupId, Dollars>;
  requiredWeek5Cost: Dollars;
  optionalWorkIncome: Dollars;
  /** What coaching the clinics costs Avery out of pocket — travel, and the extra physio. */
  optionalWorkCost: Dollars;
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
