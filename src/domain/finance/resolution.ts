import { dollars, formatDollars, type Dollars } from "../core/money";
import { hours } from "../core/units";
import type { ScenarioNumbers } from "../scenario/types";
import { bonusWeeks } from "../scenario/season";
import { assigned, courseCostFor, planMovements } from "./formulas";
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
/**
 * A claim on one week's cash that the student did not pay for, handed to the ending.
 *
 * The world composes the words — what the claim was called, and the one line that says what
 * Avery was actually left with — and this module composes the arithmetic around them, out
 * of the student's own settlement. Nothing here is a template with a blank in it: which
 * claims are on this list at all, what the money went on instead, whether the leftover
 * would have covered it, and what the student said about leaving it out are four different
 * readings of one log, and two students get two different sentences.
 */
export interface UnpaidClaim {
  id: string;
  /** What the verdict is headed. */
  label: string;
  /** The same claim inside a sentence, for the line that names several of them at once. */
  inSentence: string;
  cost: Dollars;
  /** What Avery was left with. The world's sentence, in the world's voice. */
  wentUnpaid: string;
}

export interface CompetingClaimsOutcome {
  cash: Dollars;
  spent: Dollars;
  leftOver: Dollars;
  /** What was paid for, in the order the world lists them. */
  paidFor: readonly string[];
  unpaid: readonly UnpaidClaim[];
  /** What the student said made them leave the rest out, said back to them in one line. */
  reasonToldBack: string;
}

export interface RiskVerdict {
  id: "attendance-bonus" | "clinics" | "buying-time" | "course-deposit" | `unpaid-claim:${string}`;
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
}

/**
 * One row's before and after, as a record of the plan rather than of the student.
 *
 * `delta` is not a decision and must never be reported as one: the product edits these rows
 * too, and reserving the seat empties the course row without the student touching it.
 * `planMovements` is what separates the two, and anything turning a plan into a sentence
 * about a child reads that instead of this.
 */
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
 *
 * `courseLineCut` has to mean *the student took the course line down*, and only the caller
 * with the row's ceiling in hand can say that. Read off a plain `final.goal < opening.goal`
 * it was true of every student who had been saving for the course and then reserved the seat,
 * because reserving is what empties that row — so "or that had to take the course line down"
 * fired on every reserved season Week 5 tested, and the "paid off" branch above was
 * unreachable for them. A plan whose movable money covered the bill three times over was
 * still headed **Cost you**, over a sentence saying reserving stopped being money Avery could
 * move. `resolveSeason` derives it from `planMovements`; nothing here re-derives it.
 */
function depositVerdict(final: SnapshotInputs, n: ScenarioNumbers, pressure: Week5Pressure, courseLineCut: boolean): RiskVerdict {
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
    const strained = tested && (!held || courseLineCut);
    // The badge and the first sentence have to agree. A verdict headed "Cost you" that opens
    // "the course cost less" reads as a mistake, and one headed "Paid off" that opens with
    // what the decision cost teaches a student that the badge is decoration. The price is in
    // every branch; what moves is whether it leads or follows.
    const priced = `The seat was held from Week ${week} for ${early} instead of ${full}, so the course cost ${premium} less.`;
    return {
      id: "course-deposit",
      label: "Reserving the course seat early",
      taken: true,
      outcome: strained ? "cost_you" : "paid_off",
      detail: strained
        ? `Reserving it stopped being money Avery could move, and Week 5 asked for ${asked} out of the ${movable} that still could. ${priced}`
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
    // Same rule as the branch above, and this is where it was broken: a green **Paid off**
    // sat over a sentence opening "the course cost the full price … so Avery paid more". The
    // premium is a real cost and it is still said; what leads the sentence is whatever the
    // badge is about.
    detail: !tested
      ? `${priced} Week 5 then asked nothing of the money Avery kept reachable, so the room it bought was never needed.`
      : held
        ? `Week 5 asked for ${asked}, and it came out of the ${movable} Avery had kept reachable. Reserving early would have locked some of that away. ${priced}`
        : `Week 5 asked for ${asked} and only ${movable} could move, so keeping it reachable was not enough on its own. ${priced}`,
  };
}

/**
 * The week the plan never saw, coming back.
 *
 * Three things wanted the same cash and it would not stretch, so something went unpaid —
 * always, on every allocation, because the three of them cost more than the money. Each one
 * that did gets a verdict here in the same shape as the season's own, for the reason the
 * panel exists at all: a student should be able to trace an ending to the call that caused
 * it, and a decision whose consequence is never shown is a decision the product asked for
 * and then threw away.
 *
 * **None of these is ever `no_effect`.** A birthday that passed, a bus Avery said they
 * would be on, a pair of shoes taped twice — money changed hands or failed to, and a
 * verdict headed "No effect" over a line saying what it cost teaches a student to stop
 * reading the labels. That was already true of the course seat and it is true here.
 */
function unpaidClaimVerdicts(outcome: CompetingClaimsOutcome): RiskVerdict[] {
  const wentOn = outcome.paidFor.length > 0
    ? `${formatDollars(outcome.spent)} went on ${listOf(outcome.paidFor)} instead.`
    : `None of the ${formatDollars(outcome.cash)} was spent on any of them.`;
  // Where the money went, and what the student said, are facts about the week rather than
  // about a claim — so they are said on the first of these verdicts and not again on the
  // second. They used to be appended to every one, which put the same two sentences twice
  // under one heading, twelve words apart, at the end of the run. The verdicts keep their
  // order through the sort below: both are `cost_you`, so they carry the same weight and stay
  // adjacent, which is what lets the second one lean on the first.
  // Money left in a week it could not be saved in, beside the claims it would have covered.
  // It is one fact about the week and not a fact about a claim, so it is said once and names
  // whichever of them it is true of. Printed per card it produced the same sentence twice
  // under two headings twelve words apart, at the end of the run, to a student who had just
  // been told twice what their choice cost.
  const covered = outcome.unpaid.filter((claim) => claim.cost <= outcome.leftOver);
  const affordable = covered.length > 0
    ? ` The ${formatDollars(outcome.leftOver)} left over would have covered ${listOf(covered.map((claim) => claim.inSentence))}.`
    : "";
  return outcome.unpaid.map((claim, index) => ({
    id: `unpaid-claim:${claim.id}` as const,
    label: claim.label,
    taken: false,
    outcome: "cost_you" as const,
    detail: `${claim.wentUnpaid}${index === 0 ? ` ${wentOn} ${outcome.reasonToldBack}${affordable}` : ""}`,
  }));
}

/** "a and b", "a, b and c" — one comma rule, so no branch of the ending reads as a list. */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function riskVerdicts(final: SnapshotInputs, n: ScenarioNumbers, load: LoadReadout, bonusLabel: string, pressure: Week5Pressure, courseLineCut: boolean, claims?: CompetingClaimsOutcome): RiskVerdict[] {
  const held = load.attendanceHolds;
  const withoutTimeMoney = heldWith(final, n, { timeMoney: dollars(0) });
  const withoutClinics = heldWith(final, n, { clinics: false });
  const bonus = formatDollars(n.completionIncome);
  const clinicHours = n.load.clinicBlocks;
  /**
   * What the rides row had to hold, and whether this plan could ever have put it there.
   *
   * It used to print `costToClear`, which `load.ts` defines as what the week would cost
   * **from here, given what has already been spent** — a delta — inside a sentence reading
   * "Putting $X into rides", which is a total. The two coincide only when the row is empty,
   * which is what a fixture plans, so the figure shipped short by exactly what the student
   * had already spent in every case where they had spent anything: a run that put $1,150
   * into rides was told $1,500 would have held a bonus whose row had to hold $2,550. The
   * plan board says the same number correctly, as "**Another** $X on rides would cover it",
   * and gates it on the money actually being there to move.
   *
   * So this says the total, and checks the move it names is one this plan could have made.
   * The rows are a split of one fixed sum, so "could the other two have covered it" and
   * "could the whole plan have reached it" are the same question. Where the answer is no,
   * the sentence says that instead of naming money that was never there — which is the true
   * and more useful lesson: the bonus was already gone when the week was chosen, and the
   * verdicts either side of this one name the choices that made it so.
   */
  const pool = assigned(final.amounts);
  const protect = load.costToProtect;
  const spentOnRides = final.amounts.flexibleCash;
  // Null only on a week that never went over the line, which is not a week the bonus can be
  // lost in — read as an absence rather than assumed away, so a missing figure prints no
  // counterfactual instead of a wrong one.
  const counterfactual = protect === null
    ? ""
    : protect > pool
      ? ` Holding it needed ${formatDollars(protect)} in the rides row, and this plan had ${formatDollars(pool)} to split across all three amounts — no way of splitting it would have kept the bonus.`
      : spentOnRides > 0
        ? ` Putting ${formatDollars(protect)} into rides — ${formatDollars(dollars(protect - spentOnRides))} more than you put there, out of your other two amounts — would have kept it.`
        : ` Putting ${formatDollars(protect)} into rides, out of your other two amounts, would have kept it.`;

  const verdicts: RiskVerdict[] = [
    {
      id: "attendance-bonus",
      // The label names the call the student made. It used to read "Building the plan around
      // the attendance bonus" over a body saying "Your plan was already built without it" —
      // a heading and its own sentence disagreeing about what the student did. Every other
      // verdict on this panel already names both sides of its decision.
      label: final.includeCompletion ? `Building the plan around the ${bonusLabel}` : `Planning without the ${bonusLabel}`,
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
          : `Avery missed a session, and the money your plan was counting on never came.${counterfactual}`,
    },
    {
      id: "clinics",
      label: final.includeOptionalWork ? "Coaching the Saturday clinics" : "Keeping the Saturdays",
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
      label: final.amounts.flexibleCash > 0 ? "Paying for rides" : "Putting nothing into rides",
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
            : `It bought ${hours(load.bought)} back, and Avery still did not have enough week left.`,
    },
    depositVerdict(final, n, pressure, courseLineCut),
    // Appended before the sort rather than merged into it, so that within one outcome the
    // season's own calls still read first: `sort` is stable, and one week's cash is small
    // beside a plan of thousands. It is the last thing in the list that costs, not the
    // first thing on the screen.
    ...(claims ? unpaidClaimVerdicts(claims) : []),
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
  claims?: CompetingClaimsOutcome,
): SeasonResolution {
  /**
   * Absent, the season is read as one Week 5 never put under: no shortfall, and whatever the
   * final plan still holds counted as movable. A caller that knows what the week asked passes
   * it, and every real run does.
   */
  const pressure: Week5Pressure = week5 ?? { shortfall: dollars(0), movable: assigned(final.amounts) };
  /**
   * Did the student take the course line down themselves to cover Week 5?
   *
   * Derived here rather than handed in, because the only honest answer needs the ceiling the
   * board left that row and a caller holding two sets of amounts cannot see it. `final.goal <
   * opening.goal` is true of every student who was saving for the course and then reserved
   * the seat — reserving is what empties the row — so read that way it turned the deposit
   * trade into a fixed verdict for exactly the students who had committed to the course.
   */
  const courseLineCut = opening
    ? planMovements(opening, final.amounts, final, n).some((row) => row.category === "goal" && row.chosenReduction > 0)
    : false;
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

  /**
   * The course, priced against the goal row alone — and this is a known false ending that a
   * reconciliation cannot fix on its own. Read this before changing it.
   *
   * `courseSaved` is the goal row and `endCash` below is the buffer that survived plus
   * anything unplanned, and the two never meet. So a run can end *"short of the place — Avery
   * does not start this term"* on the same screen as a *"What Avery ends with"* card holding
   * more than the shortfall. Walking the ending grid at 6,552 reachable final states,
   * **1,676 of them say that while holding enough in hand to close their own gap**. An
   * economics review called it the one thing in this model that teaches something false about
   * money without qualification, and they are right: the deposit screen tells the student the
   * course still needs the rest of its price by the end of the season, the attendance payment
   * lands with the last of the season's money, and nothing anywhere says the seat is gone.
   *
   * **The obvious fix was written and measured and it is worse.** Letting cash in hand pay the
   * balance whenever it covers the whole of it — in here and in `scenario/balance.ts`, so the
   * sweep and the ending agree — closes all 1,676 and puts a right answer in the challenge:
   *
   *     ALWAYS RIGHT (a hidden answer key): course deposit/reserve the seat early
   *     DOMINATED HOUSING (beaten on money and on Avery's week at once): teammate-share
   *     Distinct winning plans across priorities: 2 of 4   (was 3 of 4)
   *
   * — because the only thing that ever made reserving the seat cost anything was that it
   * locked money into a row the ending would not spend on anything else. Make every dollar
   * fungible at the settle-up and the early-bird discount is free money, best under all four
   * priorities and 80.5% of the simplex. A challenge with an answer key is a worse defect than
   * an ending that under-reports, so the reconciliation was reverted rather than shipped.
   *
   * **What was done instead, and it is not a change to this line.** The Week 8 card now says
   * what happened: it names the money in hand beside the shortfall, says where it would have
   * covered the gap that it would have, and states the rule the ending actually runs on —
   * *a goal is reached by the money a plan puts toward it*. Nothing moves; the screen stops
   * being silent about two figures it prints inches apart. `stages/week8Truth.test.tsx` pins
   * it and re-measures the family rather than quoting the number above.
   *
   * The other real fix, still open and much larger, is to **re-price the deposit** so that
   * reserving early still costs something once money is fungible — then the reconciliation
   * can ship. That is a re-tune of the economy and needs its own sweep.
   * `gauntlet/critiques/econ-2.md` F6 is the finding.
   */
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
    risks: riskVerdicts(final, n, load, bonusLabel, pressure, courseLineCut, claims),
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
