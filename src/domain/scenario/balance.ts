import type { SetupId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import { loadFor } from "../finance/load";
import type { ScenarioNumbers } from "./types";

/**
 * Does this challenge actually contain a decision?
 *
 * The previous model did not. Cheap housing was $450 cheaper all-in and its 140 minutes a
 * day cost nothing the model tracked; the clinics were free money; the showcase bonus was
 * cancelled on every run, so counting it was always punished. Three of four choices had a
 * right answer, and no test could tell.
 *
 * This module sweeps the whole space of end states a student can reach and asks, for each
 * choice, whether some reasonable set of priorities makes it the best move. A student is
 * not a utility maximiser, but a challenge where one option wins under *every* set of
 * priorities has no decision in it, and one where an option wins under *none* has a wrong
 * answer in it. Both are failures, and both are caught here.
 *
 * The target is not equality. It is that attractiveness depends on what the student cares
 * about and on what they chose earlier.
 */

export interface Strategy {
  setupId: SetupId;
  deposit: boolean;
  clinics: boolean;
  countBonus: boolean;
  course: Dollars;
  buffer: Dollars;
  averyWeek: Dollars;
}

export interface Outcome {
  strategy: Strategy;
  /** The plan balanced and nothing was left uncovered at the end. */
  viable: boolean;
  courseShort: number;
  /** Money still in hand once the season resolves. */
  endCash: number;
  /** Blocks Avery is carrying in the weeks that decide the bonus. Lower is easier. */
  load: number;
  attendanceHeld: boolean;
  uncovered: number;
}

/**
 * What a student might be trying to do. Each is a defensible reading of the situation, and
 * none of them is the "right" one. Every profile carries a small load term because nobody
 * is truly indifferent to a nineteen-hour week, and a course term because getting Avery to
 * the course is what Avery actually said they wanted.
 */
export const PRIORITIES = {
  /** Get Avery to the course. That is what Avery said they wanted. */
  goal: (o: Outcome) => -o.courseShort * 8 + o.endCash * 0.5 - o.load * 10,
  /** Never be caught short. Keep money back and keep the bonus safe. */
  safety: (o: Outcome) => o.endCash * 1.5 - o.courseShort * 2 - o.load * 10 + (o.attendanceHeld ? 200 : 0),
  /** Protect Avery. A season of 5:40 alarms is a cost even when it is not a bill. */
  avery: (o: Outcome) => -o.load * 130 + o.endCash * 0.6 - o.courseShort * 2,
  /** Commit late, hold cash, keep options open — even at the cost of the course. */
  flexible: (o: Outcome) => o.endCash * 1.2 - o.courseShort * 0.35 - o.load * 12,
} satisfies Record<string, (outcome: Outcome) => number>;

export type PriorityId = keyof typeof PRIORITIES;
export const PRIORITY_IDS = Object.keys(PRIORITIES) as PriorityId[];

export function spendableFor(strategy: Omit<Strategy, "course" | "buffer" | "averyWeek">, n: ScenarioNumbers): number {
  const available =
    n.savings + n.basePay + (strategy.countBonus ? n.completionIncome : 0) + (strategy.clinics ? n.optionalWorkIncome : 0);
  const locked =
    n.setupCosts[strategy.setupId]
    + n.essentialsTotal
    + n.requiredWeek5Cost
    + n.setupEventCosts[strategy.setupId]
    + (strategy.clinics ? n.optionalWorkCost : 0)
    + (strategy.deposit ? n.course.depositPrice : 0);
  return available - locked;
}

export function evaluate(strategy: Strategy, n: ScenarioNumbers): Outcome {
  const load = loadFor(
    { setupId: strategy.setupId, rehabActive: true, clinicsAccepted: strategy.clinics, timeMoney: strategy.averyWeek },
    n,
  );
  const shortfall = strategy.countBonus && !load.attendanceHolds ? n.completionIncome : 0;
  const absorbed = Math.min(shortfall, strategy.buffer);
  const uncovered = shortfall - absorbed;
  const unplanned = !strategy.countBonus && load.attendanceHolds ? n.completionIncome : 0;

  const coursePrice = strategy.deposit ? n.course.depositPrice : n.course.fullPrice;
  const courseSaved = strategy.deposit ? n.course.depositPrice : strategy.course;
  const courseShort = Math.max(0, coursePrice - courseSaved);

  return {
    strategy,
    viable: uncovered === 0,
    courseShort,
    // Money Avery still holds: the buffer that survived, plus anything that arrived
    // unplanned. Money spent on Avery's week bought time and is gone, and so is the
    // course fund — both were spent on purpose.
    endCash: strategy.buffer - absorbed + unplanned,
    load: load.net,
    attendanceHeld: load.attendanceHolds,
    uncovered,
  };
}

/** Every balanced end state a student can reach, at the repair increment. */
export function enumerateOutcomes(n: ScenarioNumbers): Outcome[] {
  const step = n.repairIncrement;
  const outcomes: Outcome[] = [];
  for (const setupId of Object.keys(n.setupCosts) as SetupId[]) {
    for (const deposit of [false, true]) {
      for (const clinics of [false, true]) {
        for (const countBonus of [false, true]) {
          const shell = { setupId, deposit, clinics, countBonus };
          const spendable = spendableFor(shell, n);
          if (spendable < 0) continue;
          const courseCap = deposit ? 0 : Math.min(n.course.fullPrice, spendable);
          for (let course = 0; course <= courseCap; course += step) {
            for (let averyWeek = 0; course + averyWeek <= spendable; averyWeek += step) {
              const buffer = spendable - course - averyWeek;
              outcomes.push(
                evaluate({ ...shell, course: dollars(course), buffer: dollars(buffer), averyWeek: dollars(averyWeek) }, n),
              );
            }
          }
        }
      }
    }
  }
  return outcomes;
}

export interface ChoiceVerdict {
  dimension: string;
  option: string;
  /** Priorities under which this option appears in the single best plan. */
  bestUnder: PriorityId[];
  /** Priorities under which it is within a whisker of the best. */
  competitiveUnder: PriorityId[];
  /** The best viable score this option can reach, per priority. */
  ceiling: Record<PriorityId, number>;
}

/**
 * Four named profiles are a coarse sample of what a student might want, and linear
 * preferences only ever pick vertices — so a perfectly reasonable middle option can look
 * dead just because nobody hand-wrote the weights that favour it. The gate therefore
 * sweeps the whole simplex of priorities rather than trusting four points on it.
 */
export interface WeightVector {
  course: number;
  cash: number;
  time: number;
}

/**
 * Three axes, not four: whether the attendance bonus arrives is already inside the cash a
 * student ends with, so weighting it separately double-counts it and quietly tilts the
 * whole sweep toward whichever housing keeps it cheaply.
 */
export function weightSimplex(step = 0.05): WeightVector[] {
  const vectors: WeightVector[] = [];
  const steps = Math.round(1 / step);
  for (let a = 0; a <= steps; a += 1) {
    for (let b = 0; a + b <= steps; b += 1) {
      const c = steps - a - b;
      vectors.push({ course: a / steps, cash: b / steps, time: c / steps });
    }
  }
  return vectors;
}

/** Each outcome on a common 0–1 scale, so priorities can be compared like for like. */
function normalise(outcomes: Outcome[]) {
  const maxCash = Math.max(1, ...outcomes.map((outcome) => outcome.endCash));
  const maxLoad = Math.max(1, ...outcomes.map((outcome) => outcome.load));
  const maxShort = Math.max(1, ...outcomes.map((outcome) => outcome.courseShort));
  return (outcome: Outcome, weights: WeightVector) =>
    weights.course * (1 - outcome.courseShort / maxShort)
    + weights.cash * (outcome.endCash / maxCash)
    + weights.time * (1 - outcome.load / maxLoad);
}

export interface OptionSweep {
  dimension: string;
  option: string;
  /** How many priority weightings out of the whole simplex this option wins under. */
  wins: number;
  /** Share of the simplex, 0–1. */
  share: number;
}

export interface BalanceReport {
  totalStates: number;
  viableStates: number;
  verdicts: ChoiceVerdict[];
  /** Options no set of priorities ever makes attractive. */
  deadOptions: ChoiceVerdict[];
  /** Options every set of priorities prefers — a right answer hiding in the model. */
  alwaysRight: ChoiceVerdict[];
  /** The single best plan under each priority, so their shapes can be compared. */
  bestByPriority: Record<PriorityId, Outcome>;
  /** True when the four priorities do not all land on the same overall plan. */
  distinctWinners: number;
  /** How often each option wins across the whole simplex of possible priorities. */
  sweep: OptionSweep[];
  /** Housing options that are worse on every axis than some other housing option. */
  dominatedHousing: string[];
}

const DIMENSIONS: { dimension: string; options: { option: string; matches: (s: Strategy) => boolean }[] }[] = [
  {
    dimension: "housing",
    options: [
      { option: "gym-sublet", matches: (s) => s.setupId === "gym-sublet" },
      { option: "teammate-share", matches: (s) => s.setupId === "teammate-share" },
      { option: "cousin-room", matches: (s) => s.setupId === "cousin-room" },
    ],
  },
  {
    dimension: "course deposit",
    options: [
      { option: "reserve the seat early", matches: (s) => s.deposit },
      { option: "pay full price later", matches: (s) => !s.deposit },
    ],
  },
  {
    dimension: "Saturday clinics",
    options: [
      { option: "take the clinics", matches: (s) => s.clinics },
      { option: "keep the Saturdays", matches: (s) => !s.clinics },
    ],
  },
  {
    dimension: "attendance bonus",
    options: [
      { option: "build the plan around it", matches: (s) => s.countBonus },
      { option: "plan without it", matches: (s) => !s.countBonus },
    ],
  },
  {
    dimension: "buying time back",
    options: [
      { option: "spend nothing on Avery's week", matches: (s) => s.averyWeek === 0 },
      { option: "spend something on Avery's week", matches: (s) => s.averyWeek > 0 },
    ],
  },
];

/** Within this fraction of the best score, an option is a live alternative rather than a loss. */
const COMPETITIVE_MARGIN = 0.06;

export function analyseBalance(n: ScenarioNumbers): BalanceReport {
  const outcomes = enumerateOutcomes(n);
  const viable = outcomes.filter((outcome) => outcome.viable);

  const bestByPriority = {} as Record<PriorityId, Outcome>;
  const bestScore = {} as Record<PriorityId, number>;
  const spread = {} as Record<PriorityId, number>;
  for (const priority of PRIORITY_IDS) {
    const scored = viable.map((outcome) => ({ outcome, score: PRIORITIES[priority](outcome) }));
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = scored.reduce((a, b) => (b.score < a.score ? b : a));
    bestByPriority[priority] = best.outcome;
    bestScore[priority] = best.score;
    spread[priority] = Math.max(1, best.score - worst.score);
  }

  const verdicts: ChoiceVerdict[] = [];
  for (const { dimension, options } of DIMENSIONS) {
    for (const { option, matches } of options) {
      const pool = viable.filter((outcome) => matches(outcome.strategy));
      const ceiling = {} as Record<PriorityId, number>;
      const bestUnder: PriorityId[] = [];
      const competitiveUnder: PriorityId[] = [];
      for (const priority of PRIORITY_IDS) {
        if (pool.length === 0) {
          ceiling[priority] = Number.NEGATIVE_INFINITY;
          continue;
        }
        const top = Math.max(...pool.map((outcome) => PRIORITIES[priority](outcome)));
        ceiling[priority] = top;
        if (matches(bestByPriority[priority].strategy)) bestUnder.push(priority);
        if (bestScore[priority] - top <= spread[priority] * COMPETITIVE_MARGIN) competitiveUnder.push(priority);
      }
      verdicts.push({ dimension, option, bestUnder, competitiveUnder, ceiling });
    }
  }

  const distinctWinners = new Set(
    PRIORITY_IDS.map((priority) => {
      const s = bestByPriority[priority].strategy;
      return `${s.setupId}|${s.deposit}|${s.clinics}|${s.countBonus}`;
    }),
  ).size;

  // The systematic pass: for every weighting of the four things a student could care
  // about, find the best plan and record which options it used.
  const score = normalise(viable);
  const vectors = weightSimplex();
  const tally = new Map<string, number>();
  for (const weights of vectors) {
    let best = viable[0]!;
    let bestScore = score(best, weights);
    for (const outcome of viable) {
      const value = score(outcome, weights);
      if (value > bestScore) {
        best = outcome;
        bestScore = value;
      }
    }
    for (const { dimension, options } of DIMENSIONS) {
      for (const { option, matches } of options) {
        if (matches(best.strategy)) tally.set(`${dimension}|${option}`, (tally.get(`${dimension}|${option}`) ?? 0) + 1);
      }
    }
  }
  const sweep: OptionSweep[] = DIMENSIONS.flatMap(({ dimension, options }) =>
    options.map(({ option }) => {
      const wins = tally.get(`${dimension}|${option}`) ?? 0;
      return { dimension, option, wins, share: wins / vectors.length };
    }),
  );

  // Housing is the one choice with a genuine two-axis frontier, so it gets a dominance
  // check rather than a preference check. A housing option earns its place if at least one
  // plan it makes possible sits on the overall money-versus-Avery's-week frontier: no other
  // plan anywhere gives more cash for no more load, or less load for no less cash.
  const onFrontier = (candidate: Outcome) =>
    !viable.some(
      (other) =>
        other.endCash >= candidate.endCash
        && other.load <= candidate.load
        && (other.endCash > candidate.endCash || other.load < candidate.load),
    );
  const frontier = viable.filter(onFrontier);
  const housingOnFrontier = new Set(frontier.map((outcome) => outcome.strategy.setupId));
  const dominatedHousing = (Object.keys(n.setupCosts) as SetupId[]).filter((setupId) => !housingOnFrontier.has(setupId));

  return {
    totalStates: outcomes.length,
    viableStates: viable.length,
    verdicts,
    deadOptions: verdicts.filter((verdict) => verdict.competitiveUnder.length === 0),
    alwaysRight: verdicts.filter((verdict) => verdict.bestUnder.length === PRIORITY_IDS.length),
    bestByPriority,
    distinctWinners,
    sweep,
    dominatedHousing,
  };
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines: string[] = [];
  lines.push(`States swept: ${report.totalStates} (${report.viableStates} viable)`);
  lines.push("");
  lines.push("Best plan under each set of priorities:");
  for (const priority of PRIORITY_IDS) {
    const { strategy, courseShort, endCash, load, attendanceHeld } = report.bestByPriority[priority];
    lines.push(
      `  ${priority.padEnd(7)} ${strategy.setupId.padEnd(15)} deposit=${String(strategy.deposit).padEnd(5)} clinics=${String(strategy.clinics).padEnd(5)} count800=${String(strategy.countBonus).padEnd(5)} ` +
      `course=$${strategy.course} buffer=$${strategy.buffer} averyWeek=$${strategy.averyWeek} → short=$${courseShort} cash=$${endCash} load=${load}${attendanceHeld ? "" : " (bonus lost)"}`,
    );
  }
  lines.push("");
  lines.push("Every option, and who would pick it:");
  let dimension = "";
  for (const verdict of report.verdicts) {
    if (verdict.dimension !== dimension) {
      dimension = verdict.dimension;
      lines.push(`  ${dimension}`);
    }
    const best = verdict.bestUnder.length ? verdict.bestUnder.join(",") : "—";
    const live = verdict.competitiveUnder.length ? verdict.competitiveUnder.join(",") : "nobody";
    lines.push(`    ${verdict.option.padEnd(30)} best for: ${best.padEnd(24)} live for: ${live}`);
  }
  if (report.deadOptions.length) {
    lines.push("");
    lines.push(`DEAD OPTIONS (rational for nobody): ${report.deadOptions.map((v) => `${v.dimension}/${v.option}`).join(", ")}`);
  }
  if (report.alwaysRight.length) {
    lines.push("");
    lines.push(`ALWAYS RIGHT (a hidden answer key): ${report.alwaysRight.map((v) => `${v.dimension}/${v.option}`).join(", ")}`);
  }
  lines.push("");
  lines.push("Share of all possible priority weightings each option wins under:");
  let sweepDimension = "";
  for (const entry of report.sweep) {
    if (entry.dimension !== sweepDimension) {
      sweepDimension = entry.dimension;
      lines.push(`  ${sweepDimension}`);
    }
    const bar = "█".repeat(Math.round(entry.share * 40));
    lines.push(`    ${entry.option.padEnd(30)} ${(entry.share * 100).toFixed(1).padStart(5)}%  ${bar}`);
  }
  if (report.dominatedHousing.length) {
    lines.push("");
    lines.push(`DOMINATED HOUSING (beaten on money and on Avery's week at once): ${report.dominatedHousing.join(", ")}`);
  }
  lines.push("");
  lines.push(`Distinct winning plans across priorities: ${report.distinctWinners} of ${PRIORITY_IDS.length}`);
  return lines.join("\n");
}
