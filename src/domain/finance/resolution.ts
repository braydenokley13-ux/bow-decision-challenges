import { dollars, formatDollars, type Dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import { bonusWeeks } from "../scenario/season";
import { assigned, courseCostFor } from "./formulas";
import { loadFor, type LoadReadout } from "./load";
import type { PlanAmounts, SnapshotInputs } from "./types";

/**
 * How Avery's eight weeks actually end.
 *
 * Every line here is derived from the student's own decisions — where Avery lived, whether
 * the clinics were taken, how much of the plan went to buying time back, whether the seat
 * was reserved early, and whether the plan was built around the attendance bonus. Nothing
 * is rolled. Two students who planned differently get two different endings, and each can
 * trace theirs to a choice they made.
 *
 * The counterfactuals are the part that makes the ending answerable rather than merely
 * different. "The bonus did not arrive" is a result; "the bonus did not arrive, and it
 * would have if you had not taken the clinics" is the thing a student can argue about with
 * the person sitting next to them. Each one re-runs the same load model with exactly one
 * of the student's decisions changed, so none of them is a guess.
 */
/**
 * `cost_you` and `fell_short` are deliberately different verdicts. Taking the clinics when
 * the clinics are why the bonus was lost genuinely cost the student the money. Spending on
 * Avery's week and not getting far enough under the line did not cost them anything — it
 * bought fewer hours than the problem needed. Collapsing the two would tell a student who
 * spent sensibly and came up short that they made a mistake, which is both untrue and the
 * fastest way to teach that the safe move is never to spend.
 */
export interface RiskVerdict {
  id: "attendance-bonus" | "clinics" | "buying-time" | "course-deposit";
  label: string;
  /** Whether the student took this risk at all. */
  taken: boolean;
  outcome: "paid_off" | "cost_you" | "fell_short" | "no_effect";
  /** What actually happened, in one line, with the counterfactual where there is one. */
  detail: string;
}

export interface ResolvedWeek {
  week: number;
  /** Avery made every session that week. */
  madeIt: boolean;
}

/**
 * What Week 5 actually asked of the plan, and what the plan still had that could move.
 *
 * The deposit verdict is the one call in this world whose whole point is the trade between a
 * cheaper price and money that stays reachable, and it used to be reported as a constant:
 * reserving was always "paid off" and waiting was always "no effect", on every season, for
 * every plan. A trade-off with a fixed verdict is a hidden right answer, which is the thing
 * `balance.ts` exists to prevent everywhere else in the model.
 *
 * These three facts are what make the same decision read differently for two students. They
 * are read off the plan the student carried into Week 5 and the bill that landed on it — the
 * caller already holds both — and nothing here is rolled or scored. This is the narrative on
 * the Week 8 ledger; no observation is produced from it.
 */
export interface Week5Pressure {
  /** What the plan was over by the moment Week 5's bills landed on it. */
  shortfall: Dollars;
  /** Money sitting in lines the student could still move when it landed. */
  movable: Dollars;
  /** The course line finished lower than the plan Avery carried into Week 5. */
  courseLineCut: boolean;
}

export interface PlanChange {
  category: keyof PlanAmounts;
  before: Dollars;
  after: Dollars;
  delta: number;
}

export interface SeasonResolution {
  load: LoadReadout;
  /** Avery made every session, so the attendance bonus is paid. */
  attendanceHeld: boolean;
  weeks: ResolvedWeek[];
  /** The week the bonus was decided against, or null when Avery kept it. */
  bonusLostWeek: number | null;
  /** The plan was built as though that money would arrive. */
  countedOnBonus: boolean;
  /** Money the plan expected and did not get. */
  shortfall: Dollars;
  /** Backup money the plan was holding when the shortfall landed. */
  bufferHeld: Dollars;
  /** How much of the shortfall the backup money covered. */
  absorbed: Dollars;
  /** What the plan could not cover. Zero when the student planned for this. */
  uncovered: Dollars;
  /** Money that arrived for a plan that never counted on it. */
  unplannedGain: Dollars;
  coursePrice: Dollars;
  courseSaved: Dollars;
  courseFunded: boolean;
  courseShort: Dollars;
  /** Money Avery still holds once everything has landed. */
  endCash: Dollars;
  /** Money that went into Avery's week and bought hours back. */
  spentOnTime: Dollars;
  risks: RiskVerdict[];
  changes: PlanChange[];
}

/** The same week, with exactly one decision changed. */
function heldWith(final: SnapshotInputs, n: ScenarioNumbers, changed: { clinics?: boolean; timeMoney?: Dollars }): boolean {
  return loadFor(
    {
      setupId: final.setupId,
      rehabActive: true,
      clinicsAccepted: changed.clinics ?? final.includeOptionalWork,
      timeMoney: changed.timeMoney ?? final.amounts.flexibleCash,
    },
    n,
  ).attendanceHolds;
}

/**
 * The course seat, judged by what the season did with the money it tied up.
 *
 * The premium is named in every branch, because it is the half of the trade that is true
 * whatever happened: reserving early cost less than paying later, and waiting cost more. What
 * varies is the other half — whether the flexibility that reserving gave up, or that waiting
 * kept, was the flexibility Week 5 turned out to need.
 *
 * Neither answer wins on every season. Reserving reads as "paid off" on a plan whose movable
 * lines absorbed Week 5 anyway, and as "cost you" on a plan that could not cover the bill out
 * of what was left or that had to take the course line down to do it. Waiting reads as "paid
 * off" when the money it kept reachable is what covered Week 5, "fell short" when even that
 * was not enough, and "no effect" on a season that never asked the movable money for anything
 * — a real third state, not a default, and the premium is still on the page.
 */
function depositVerdict(final: SnapshotInputs, n: ScenarioNumbers, pressure: Week5Pressure): RiskVerdict {
  const premium = formatDollars(n.course.fullPrice - n.course.depositPrice);
  const early = formatDollars(n.course.depositPrice);
  const full = formatDollars(n.course.fullPrice);
  const week = n.course.depositDeadlineWeek;
  const asked = formatDollars(pressure.shortfall);
  const movable = formatDollars(pressure.movable);
  // A season that never put the plan under is a season where the trade was never tested. It
  // is not the same as the trade going well, and saying so is what stops "no effect" from
  // being the answer waiting always gets.
  const tested = pressure.shortfall > 0;
  const held = pressure.shortfall <= pressure.movable;

  if (final.depositTaken) {
    const strained = tested && (!held || pressure.courseLineCut);
    const priced = `The seat was held from Week ${week} for ${early} instead of ${full}, so the course cost ${premium} less.`;
    return {
      id: "course-deposit",
      label: "Reserving the course seat early",
      taken: true,
      outcome: strained ? "cost_you" : "paid_off",
      detail: strained
        ? `${priced} It also stopped being money Avery could move, and Week 5 asked for ${asked} out of the ${movable} that still could.`
        : tested
          ? `${priced} Week 5 asked for ${asked}, and the ${movable} still free to move covered it.`
          : `${priced} Week 5 asked nothing of the money left movable, so committing early cost Avery no room.`,
    };
  }

  const priced = `The course cost the full ${full} rather than the ${early} it took at Week ${week}, so Avery paid ${premium} more.`;
  return {
    id: "course-deposit",
    label: "Not reserving the course seat early",
    taken: false,
    // Not "no effect". Not reserving always costs the premium — the sentence directly under
    // this label says so, in dollars — and a verdict headed "No effect" over a line reading
    // "Avery paid more" teaches a student that a cost they can read is not a cost. What is
    // true when Week 5 never tested the plan is that the money bought room nobody needed:
    // a decision that cost something and returned nothing.
    outcome: !tested ? "cost_you" : held ? "paid_off" : "fell_short",
    detail: !tested
      ? `${priced} Week 5 then asked nothing of the money Avery kept reachable, so the room it bought was never needed.`
      : held
        ? `${priced} Week 5 asked for ${asked}, and it came out of the ${movable} Avery had kept reachable.`
        : `${priced} Week 5 asked for ${asked} and only ${movable} could move, so keeping it reachable was not enough on its own.`,
  };
}

function riskVerdicts(final: SnapshotInputs, n: ScenarioNumbers, held: boolean, bonusLabel: string, pressure: Week5Pressure): RiskVerdict[] {
  const withoutTimeMoney = heldWith(final, n, { timeMoney: dollars(0) });
  const withoutClinics = heldWith(final, n, { clinics: false });
  const bonus = formatDollars(n.completionIncome);
  const clinicHours = n.load.clinicBlocks;
  // What it would have taken to stay under the line, from the same load model. Adding this
  // much to Avery's week buys back exactly the hours the plan was over by, so the sentence
  // it goes into is a fact about this student's plan and not a figure of speech.
  const clearing = formatDollars(
    loadFor(
      { setupId: final.setupId, rehabActive: true, clinicsAccepted: final.includeOptionalWork, timeMoney: final.amounts.flexibleCash },
      n,
    ).costToClear,
  );

  const verdicts: RiskVerdict[] = [
    {
      id: "attendance-bonus",
      label: `Building the plan around the ${bonusLabel}`,
      taken: final.includeCompletion,
      outcome: !final.includeCompletion ? "no_effect" : held ? "paid_off" : "cost_you",
      // The verdict that costs the most is the one that most needs the counterfactual: a
      // student who reads only "the bonus never came" has learned an outcome, and a student
      // who reads what would have kept it has learned why their plan behaved as it did.
      detail: !final.includeCompletion
        ? held
          ? `Avery made every session, so the bonus arrived anyway. Your plan never needed it — that is ${bonus} more than you planned for.`
          : "Avery missed a session, so the bonus never arrived. Your plan was already built without it."
        : held
          ? "Avery made every session. The money you planned around actually landed."
          : `Avery missed a session, and the money your plan was counting on never came. Putting ${clearing} into rides — taken out of your other two amounts — would have kept it.`,
    },
    {
      id: "clinics",
      label: "Coaching the Saturday clinics",
      taken: final.includeOptionalWork,
      outcome: !final.includeOptionalWork
        ? "no_effect"
        : withoutClinics && !held
          ? "cost_you"
          : "paid_off",
      // Both currencies, in every branch. This used to close with "cost Avery nothing extra"
      // on the seasons where the bonus was already gone, which retroactively zeroed the hours
      // the Week 5 screen had just insisted were real. The clinics always cost those hours;
      // what changes between seasons is whether they are why the bonus went.
      detail: !final.includeOptionalWork
        ? "Avery kept the Saturdays. No extra money, and no extra hours."
        : withoutClinics && !held
          ? `The clinics brought in ${formatDollars(n.optionalWorkIncome)} and took ${clinicHours} hours a week. Those hours are why Avery went over the line — without them the bonus would have held.`
          : held
            ? `The clinics brought in ${formatDollars(n.optionalWorkIncome)} and took ${clinicHours} hours a week. Avery made every session anyway.`
            // The bonus was already gone at this housing and this spend, so the fee is money
            // the plan would not otherwise have had — and the hours were still spent.
            : `The clinics brought in ${formatDollars(n.optionalWorkIncome)} and took ${clinicHours} hours a week. The week was already over the line without them, so they are not why the bonus went.`,
    },
    {
      id: "buying-time",
      label: "Paying for rides",
      taken: final.amounts.flexibleCash > 0,
      outcome: final.amounts.flexibleCash === 0
        ? "no_effect"
        : held && !withoutTimeMoney
          ? "paid_off"
          : held
            ? "no_effect"
            : "fell_short",
      detail: final.amounts.flexibleCash === 0
        ? "Nothing went on rides, so Avery took every bus and every long way round."
        : held && !withoutTimeMoney
          ? "This is what saved the bonus. Without the hours you bought back, Avery would have run out of week."
          : held
            ? "Avery would have made every session either way, so this money bought rest rather than the bonus."
            : `It bought ${loadFor({ setupId: final.setupId, rehabActive: true, clinicsAccepted: final.includeOptionalWork, timeMoney: final.amounts.flexibleCash }, n).bought} hours back, and Avery still did not have enough week left.`,
    },
    depositVerdict(final, n, pressure),
  ];
  return verdicts.sort((a, b) => VERDICT_WEIGHT[a.outcome] - VERDICT_WEIGHT[b.outcome]);
}

/**
 * The order the verdicts are read in.
 *
 * A decision that changed the season goes above one that did not. Listing them in the
 * order the code happens to build them meant a student whose plan turned on the clinics
 * could find that verdict third, under two lines saying nothing happened — and the whole
 * point of this panel is that the student can trace the ending back to the call that
 * caused it. Ties keep their order, so nothing here is a ranking of how well they did.
 */
const VERDICT_WEIGHT: Record<RiskVerdict["outcome"], number> = {
  cost_you: 0,
  paid_off: 1,
  fell_short: 2,
  no_effect: 3,
};

export function resolveSeason(
  final: SnapshotInputs,
  n: ScenarioNumbers,
  opening?: PlanAmounts,
  bonusLabel = "attendance bonus",
  week5?: Week5Pressure,
): SeasonResolution {
  /**
   * Absent, the season is read as one Week 5 never put under: no shortfall, and whatever the
   * final plan still holds counted as movable. A caller that knows what the week asked passes
   * it, and every real run does.
   */
  const pressure: Week5Pressure = week5 ?? {
    shortfall: dollars(0),
    movable: assigned(final.amounts),
    courseLineCut: opening ? final.amounts.goal < opening.goal : false,
  };
  const load = loadFor(
    {
      setupId: final.setupId,
      rehabActive: true,
      clinicsAccepted: final.includeOptionalWork,
      timeMoney: final.amounts.flexibleCash,
    },
    n,
  );
  const attendanceHeld = load.attendanceHolds;
  const countedOnBonus = final.includeCompletion;

  const shortfall = dollars(countedOnBonus && !attendanceHeld ? n.completionIncome : 0);
  const bufferHeld = final.amounts.reserve;
  const absorbed = dollars(Math.min(shortfall, bufferHeld));
  const uncovered = dollars(shortfall - absorbed);
  const unplannedGain = dollars(!countedOnBonus && attendanceHeld ? n.completionIncome : 0);

  const coursePrice = courseCostFor(final, n);
  const courseSaved = final.depositTaken ? n.course.depositPrice : final.amounts.goal;
  const courseShort = dollars(Math.max(0, coursePrice - courseSaved));

  // Avery's week costs the same every week, so a plan that is over the line is over it in
  // all three. Showing one missed week followed by two clean ones would have described a
  // model this product does not have; the bonus is simply decided at the first of them.
  const decidingWeeks = bonusWeeks(n);
  const weeks = decidingWeeks.map((week) => ({ week, madeIt: attendanceHeld }));
  const bonusLostWeek = attendanceHeld ? null : decidingWeeks[0] ?? null;

  return {
    load,
    attendanceHeld,
    weeks,
    bonusLostWeek,
    countedOnBonus,
    shortfall,
    bufferHeld,
    absorbed,
    uncovered,
    unplannedGain,
    coursePrice,
    courseSaved,
    courseFunded: courseShort === 0,
    courseShort,
    endCash: dollars(bufferHeld - absorbed + unplannedGain),
    spentOnTime: final.amounts.flexibleCash,
    risks: riskVerdicts(final, n, attendanceHeld, bonusLabel, pressure),
    changes: opening
      ? (["goal", "reserve", "flexibleCash"] as const).map((category) => ({
          category,
          before: opening[category],
          after: final.amounts[category],
          delta: final.amounts[category] - opening[category],
        }))
      : [],
  };
}
