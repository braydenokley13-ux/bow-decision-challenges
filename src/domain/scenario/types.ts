import type { Dollars } from "../core/money";
import type { SetupId, WorldId } from "../core/ids";
import type { StageId } from "../evidence/types";

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

/**
 * The one week Avery is handed money the plan never sees.
 *
 * A teammate's shift, covered on a Tuesday, paid in cash. It is deliberately not income:
 * it never reaches the planning board, never touches the season ledger, and cannot be
 * banked. That is what makes it usable as a values decision rather than as a fourth axis
 * of the budget — `balance.ts` sweeps the strategy space of the plan, and money that can
 * be moved into the plan would multiply that space for a beat whose whole subject is which
 * of three claims matters most.
 *
 * The three claims add up to more than the cash on purpose, and to more than any two of
 * them can be paid for from what one of them leaves behind. There is no combination that
 * funds all three and there is no combination that is obviously right, which is the same
 * standard every other decision in this world is held to.
 */
export interface Week3Numbers {
  /** The week the shift is covered and the money arrives. */
  week: number;
  cash: Dollars;
  /** What each claim costs. Keyed by the world's own claim ids. */
  claimCosts: Record<string, Dollars>;
}

export interface ScenarioNumbers {
  version: string;
  weeks: 8;
  /** The week the season turns. Everything after it is played under the new terms. */
  disruptionWeek: number;
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
  /** The Week 3 cash and the three things that want it. Outside the plan, on purpose. */
  week3: Week3Numbers;
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

/**
 * The five payments a world can name, and the only place they are named.
 *
 * Screens used to write "$800" and "Perfect Attendance Bonus" into their own JSX, which is
 * the same defect the grader had before it was priced from the scenario: re-pricing the
 * model left correct copy describing the wrong money. Amounts come from
 * `incomeAmount`, words come from `incomeCopy`, and no student-facing file spells either.
 */
export type IncomeKey = "savings" | "base" | "completion" | "outcome" | "optionalWork";

export interface IncomeLineCopy {
  /** What the payment is called, wherever it is named. */
  label: string;
  /** What the money is, in one line. */
  note: string;
  /** The condition attached, for the payments that carry one. */
  rule?: string;
  /**
   * What it means for the season if the condition is not met, for the payments that carry
   * one. It is the half of a conditional payment the always-open money sheet in the top bar
   * cannot show, and the reason the terms screen is a screen rather than a slide repeating it.
   */
  ifNot?: string;
}

export interface WorldScenario {
  id: WorldId;
  title: string;
  subtitle: string;
  role: { name: string; age: 18; description: string };
  goalLabel: string;
  numbers: ScenarioNumbers;
  setups: readonly SetupOptionDefinition[];
  incomeCopy: Record<IncomeKey, IncomeLineCopy>;
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
   * The invitation, as a job rather than as news.
   *
   * The opening used to lead on the story — "Avery got the call." — at scene size, with the
   * sentence that says what the student is actually for ("Avery plays. You handle the
   * money.") in small type off to one side. Readers came away knowing something had
   * happened to a stranger and not knowing what they had been asked to do. The headline is
   * now the ask, the story is the paragraph under it, and the three decisions are named
   * before a student has spent a dollar.
   */
  invitation: {
    kicker: string;
    headline: string;
    role: string;
    decisions: readonly { title: string; detail: string }[];
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

/**
 * What every world's story declares, whatever else it carries.
 *
 * §7.1 — a world has a contract and an interior, and the interior is its own. Basketball's
 * `WorldScenario` above is Basketball's shape: eight weeks, three places to live, a course
 * seat and a set of bonuses. Run the Pop-Up's is four Saturdays, three booths, trays of food
 * and a rented generator, and forcing one of those two shapes over both would produce two
 * worlds with the same interior wearing different pictures.
 *
 * So the registry knows three things about a story — which world it is, what it is called and
 * the line that goes on its card — and a world's own module is what knows the rest.
 */
export interface WorldStory {
  id: WorldId;
  title: string;
  subtitle: string;
}

export interface WorldRegistryEntry {
  id: WorldId;
  title: string;
  /** The card blurb, in the world's own voice (§13.3). */
  subtitle: string;
  /**
   * Who the student is in this world, in one line (§7.2, §13.3).
   *
   * It sits on the registry rather than inside a world's own scenario shape because the world
   * choice screen draws two cards side by side and has to ask both worlds the same question.
   * The line itself is the world's — read off its own copy, never written here.
   */
  role: string;
  /** What a teacher is told to allow for, in minutes. */
  durationMinutes: { min: number; max: number };
  availability: "available";
  /**
   * Every stage this world's own machine can be in.
   *
   * Persistence reads it. A restored attempt used to be checked against Basketball's stage
   * list, which was the only list there was; checking a second world's attempt against it
   * would have quarantined real work as unreadable for the crime of being in a different
   * story.
   */
  stages: readonly StageId[];
  scenario: WorldStory;
}
