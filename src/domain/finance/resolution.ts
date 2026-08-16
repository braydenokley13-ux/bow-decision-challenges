import { dollars, formatDollars, type Dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import { bonusWeeks } from "../scenario/season";
import { courseCostFor } from "./formulas";
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

function riskVerdicts(final: SnapshotInputs, n: ScenarioNumbers, held: boolean, bonusLabel: string): RiskVerdict[] {
  const withoutTimeMoney = heldWith(final, n, { timeMoney: dollars(0) });
  const withoutClinics = heldWith(final, n, { clinics: false });
  const bonus = formatDollars(n.completionIncome);
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
          : `Avery missed a session, and the money your plan was counting on never came. ${clearing} more in Avery’s week — taken out of one of your other two amounts — would have kept it.`,
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
      detail: !final.includeOptionalWork
        ? "Avery kept the Saturdays. No extra money, and no extra hours."
        : withoutClinics && !held
          ? "The clinics paid, but they are the reason Avery went over the line. Without them the bonus would have held."
          : held
            ? "The clinics paid, and Avery still made every session."
            // The bonus was already gone at this housing and this spend, so the fee is
            // money the plan would not otherwise have had.
            : "The clinics paid. Avery was over the line with them or without them, so they cost nothing that was not already lost.",
    },
    {
      id: "buying-time",
      label: "Spending on Avery’s week",
      taken: final.amounts.flexibleCash > 0,
      outcome: final.amounts.flexibleCash === 0
        ? "no_effect"
        : held && !withoutTimeMoney
          ? "paid_off"
          : held
            ? "no_effect"
            : "fell_short",
      detail: final.amounts.flexibleCash === 0
        ? "Avery carried the whole week unaided."
        : held && !withoutTimeMoney
          ? "This is what saved the bonus. Without the hours you bought back, Avery would have gone over the line."
          : held
            ? "Avery would have made every session either way, so this money bought rest rather than the bonus."
            : `It bought ${loadFor({ setupId: final.setupId, rehabActive: true, clinicsAccepted: final.includeOptionalWork, timeMoney: final.amounts.flexibleCash }, n).bought} hours back, which was not far enough to clear the line.`,
    },
    {
      id: "course-deposit",
      label: "Reserving the course seat early",
      taken: final.depositTaken,
      outcome: final.depositTaken ? "paid_off" : "no_effect",
      detail: final.depositTaken
        ? "The seat was held from Week 4, and it cost less than the late price."
        : "Avery waited, kept the money reachable, and pays the full price.",
    },
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

export function resolveSeason(final: SnapshotInputs, n: ScenarioNumbers, opening?: PlanAmounts, bonusLabel = "attendance bonus"): SeasonResolution {
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
    risks: riskVerdicts(final, n, attendanceHeld, bonusLabel),
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
