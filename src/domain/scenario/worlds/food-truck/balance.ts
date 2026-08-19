import { dollars } from "../../../core/money";
import { availableToPlan, crowdOn, crowdTold, orderCost, resolveSeason, sellCap, serveCap, type PopUpChoices, type SeasonOutcome } from "./economy";
import { POP_UP_LINES, type PopUpLineId, type PopUpNumbers, type SaturdayNumber, type SpotId } from "./types";

/**
 * Does Run the Pop-Up actually contain a decision?
 *
 * Same question `src/domain/scenario/balance.ts` asks of Basketball, asked of a different
 * world, and it has to be asked again rather than inherited: the harness pattern travels, the
 * verdict does not. A world where the cheap booth is simply better, or where cooking to the
 * crowd is always right, has a right answer in it — and a right answer turns an assessment of
 * how a student plans into a test of whether they guessed the designer's preference.
 *
 * What is swept: which booth spot, whether the friend goes on the window for the last
 * Saturday, whether the organiser's rebate is counted into the opening plan, how much stock
 * is cooked against what each crowd will take, whether anything is banked as the student's
 * own cut, and which line the generator money comes out of.
 *
 * **What is deliberately not swept: counting the catering job.** Sunrise Yoga does not
 * confirm — that is a fact of the world, not a preference — so planning on that money is a
 * mistake and the harness has nothing to be even-handed about. Basketball treats the showcase
 * bonus exactly this way, and for the same reason: the two conditional sources are different
 * on purpose, and only the one whose condition the student's own choices decide belongs in a
 * sweep of defensible strategies.
 *
 * ## What this proves, and what it does not
 *
 * A student red team read the four crowd figures off the booth card, noticed that nothing in
 * this market is rolled, and reported: *"Is there a dominant strategy? Yes, and the product
 * tells you."* They are right about the thing they measured, and it is not the thing this
 * harness measures. Both statements are true and it is worth being exact about which is which,
 * because a reader who takes this file for a proof of the other claim will be misled.
 *
 * **What it proves:** no *option* on any one axis is the right answer regardless of what the
 * student is trying to do. Every booth wins somewhere on the simplex of priorities; so does
 * every answer about Marisol, the rebate, the extra tray, banking a cut, and each of the three
 * lines the generator money can come out of. That is a claim about the menu, and it is the
 * claim the product makes — `observer.ts` may not read a preference, and this is why it may
 * not.
 *
 * **What it does not prove:** that no plan is best once an objective is fixed. It could not:
 * `bestByPriority` below *finds* that plan, four times over, and finding it is the harness
 * working. Fix "end the run with the most money", and the market is a deterministic
 * optimisation whose inputs are all printed before the first order — which is exactly what the
 * red team solved. Nothing here contradicts them.
 *
 * **Whether the printed crowds are a mistake:** three of them are not, and the fourth was.
 *
 * The defence of printing them is still the right one for Saturdays 1 to 3, and `types.ts` and
 * `economy.ts` state it where the numbers are declared: an evening that turns out colder than
 * the last one is a surprise, an evening you were told would be colder is a decision, and the
 * competencies assessed here are planning within money that is actually there and repairing a
 * plan when a cost changes — neither of which is forecasting demand.
 *
 * What that defence did **not** license was printing all four, and the argument that broke it
 * is the other world's own design. Basketball's Week 5 is scripted, not rolled: it replays
 * identically, it is swept identically, and no child is scored on luck — and the student is not
 * told about it while building the plan it breaks. Determinism comes from *scripted*, not from
 * *disclosed*. So the fireworks night is now stated as a band and resolves at a scripted figure
 * inside it (`numbers.ts`), and everything this harness sweeps is worked out from that figure,
 * unchanged: **the numbers in this report are the same numbers they were before the range
 * existed.** The range changed what the student was told, and nothing about what replays.
 *
 * That leaves a second question this harness now has to answer, because the old one no longer
 * covers it: is the band a decision, or decoration? A range that has one best answer across
 * its whole width is a number wearing a costume, and it would be worse than the number — it
 * would look like a question and mark like an answer key. `analyseLastSaturdayRange` below is
 * that gate, and `balance.test.ts` fails the build if the band ever collapses to one order.
 *
 * The red team's finding about the other three nights stands and is deliberate: a student who
 * wants to optimise Saturdays 1 to 3 *can*, with arithmetic, before the market opens. The
 * answer to that is not to hide those numbers. It is that the ending must never tell a child
 * there was one right answer measured in money — see `resolution.ts`, which says what its own
 * comparisons are counted in.
 */

export interface Strategy {
  spotId: SpotId;
  helper: boolean;
  countRebate: boolean;
  trays: { first: number; middle: number; last: number };
  cut: number;
  repairFirst: PopUpLineId;
}

export interface Outcome {
  strategy: Strategy;
  /** Every dollar the plan counted on arrived, and the generator got swapped. */
  viable: boolean;
  /** Money in hand once the organiser settles up. */
  endMoney: number;
  /** What survived of the line the student was banking for themselves. */
  banked: number;
  /** Plates that went over the counter. */
  fed: number;
  /** Plates that went in the bin. */
  spoiled: number;
  /** Money the plan counted on and could never give back. */
  uncovered: number;
  lastSaturdayRan: boolean;
  /** Saturdays the truck actually opened with food on it. */
  saturdaysTraded: number;
  season: SeasonOutcome;
}

/**
 * What a student might be trying to do. Each is a defensible reading of the job, and none of
 * them is the right one. Every profile carries a small waste term, because nobody running a
 * food truck is truly indifferent to throwing food away.
 */
export const PRIORITIES = {
  /** Run the best market you can. The truck is the point. */
  takings: (o: Outcome) => o.endMoney * 1.0 - o.spoiled * 2 + o.fed * 0.5,
  /** Get paid. You took the gig for the money in your own pocket. */
  pocket: (o: Outcome) => o.banked * 2.2 + o.endMoney * 0.2 - o.spoiled * 2,
  /** Feed the market. Be the stall people come back for. */
  crowd: (o: Outcome) => o.fed * 9 + o.endMoney * 0.15 - o.spoiled * 3,
  /** Never be caught out. Open every Saturday, keep cash in the box, waste nothing. */
  steady: (o: Outcome) => o.saturdaysTraded * 320 + o.endMoney * 0.4 + o.banked * 0.4 - o.spoiled * 8 + (o.lastSaturdayRan ? 250 : 0),
} satisfies Record<string, (outcome: Outcome) => number>;

export type PriorityId = keyof typeof PRIORITIES;
export const PRIORITY_IDS = Object.keys(PRIORITIES) as PriorityId[];

/** Trays worth enumerating on one Saturday: up to the crowd, and one past it. */
function trayRange(n: PopUpNumbers, spotId: SpotId, saturday: SaturdayNumber, helper: boolean): number[] {
  const cap = sellCap(n, spotId, saturday, helper);
  const most = Math.ceil(cap / n.platesPerTray) + 1;
  return Array.from({ length: most + 1 }, (_, index) => index);
}

function choicesOf(n: PopUpNumbers, strategy: Strategy): PopUpChoices | null {
  const available = availableToPlan(n, strategy.spotId, { catering: false, rebate: strategy.countRebate });
  const stock = orderCost(n, strategy.trays.first + strategy.trays.middle * 2 + strategy.trays.last);
  const cushion = available - stock - strategy.cut;
  if (cushion < 0) return null;
  return {
    spotId: strategy.spotId,
    countCatering: false,
    countRebate: strategy.countRebate,
    plan: { stock, cushion: dollars(cushion), cut: dollars(strategy.cut) },
    trays: strategy.trays,
    helper: strategy.helper,
    // The rebate is the only conditional money in the sweep, and a plan that counted it puts
    // it back from the cash in the box first. Which line a student names is their call on the
    // board; the sweep prices one reading of it so the strategies stay comparable.
    coverLine: "cushion",
    repairOrder: [strategy.repairFirst, ...POP_UP_LINES.filter((line) => line !== strategy.repairFirst)],
  };
}

export function evaluate(n: PopUpNumbers, strategy: Strategy): Outcome | null {
  const choices = choicesOf(n, strategy);
  if (!choices) return null;
  const season = resolveSeason(n, choices);
  return {
    strategy,
    viable: season.viable,
    endMoney: season.endMoney,
    banked: season.banked,
    fed: season.plates.sold,
    spoiled: season.plates.spoiled,
    uncovered: season.uncovered,
    lastSaturdayRan: season.lastSaturdayRan,
    saturdaysTraded: season.saturdays.filter((day) => day.cooked > 0).length,
    season,
  };
}

/** Every end state a student can reach, at the plan board's own step. */
export function enumerateOutcomes(n: PopUpNumbers): Outcome[] {
  const outcomes: Outcome[] = [];
  for (const spotId of Object.keys(n.spots) as SpotId[]) {
    for (const helper of [false, true]) {
      const firsts = trayRange(n, spotId, 1, helper);
      const middles = trayRange(n, spotId, 2, helper);
      const lasts = trayRange(n, spotId, n.saturdays, helper);
      for (const countRebate of [false, true]) {
        const available = availableToPlan(n, spotId, { catering: false, rebate: countRebate });
        for (const repairFirst of POP_UP_LINES) {
          for (const first of firsts) {
            for (const middle of middles) {
              for (const last of lasts) {
                const stock = orderCost(n, first + middle * 2 + last);
                if (stock > available) continue;
                for (let cut = 0; cut <= available - stock; cut += n.planIncrement) {
                  const outcome = evaluate(n, { spotId, helper, countRebate, trays: { first, middle, last }, cut, repairFirst });
                  if (outcome) outcomes.push(outcome);
                }
              }
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
  ceiling: Record<PriorityId, number>;
}

/**
 * Three axes, and only three: money at the end, money the student actually banked, and
 * plates over the counter. Waste is not a fourth — it is already inside the first two, since
 * every binned plate is a tray that was paid for and never sold, and weighting it separately
 * would count it twice and tilt the whole sweep toward the thinnest crowd.
 */
export interface WeightVector {
  money: number;
  pocket: number;
  fed: number;
}

export function weightSimplex(step = 0.05): WeightVector[] {
  const vectors: WeightVector[] = [];
  const steps = Math.round(1 / step);
  for (let a = 0; a <= steps; a += 1) {
    for (let b = 0; a + b <= steps; b += 1) {
      vectors.push({ money: a / steps, pocket: b / steps, fed: (steps - a - b) / steps });
    }
  }
  return vectors;
}

/** `Math.max(...array)` blows the call stack on a sweep this size, so the loop is written out. */
function highest<T>(items: readonly T[], of: (item: T) => number, floor = Number.NEGATIVE_INFINITY): number {
  let top = floor;
  for (const item of items) {
    const value = of(item);
    if (value > top) top = value;
  }
  return top;
}

/** Each outcome on a common 0–1 scale, so priorities can be compared like for like. */
function normalise(outcomes: Outcome[]) {
  const maxMoney = highest(outcomes, (outcome) => outcome.endMoney, 1);
  const maxBanked = highest(outcomes, (outcome) => outcome.banked, 1);
  const maxFed = highest(outcomes, (outcome) => outcome.fed, 1);
  return {
    money: (outcome: Outcome) => outcome.endMoney / maxMoney,
    pocket: (outcome: Outcome) => outcome.banked / maxBanked,
    fed: (outcome: Outcome) => outcome.fed / maxFed,
  };
}

export interface OptionSweep {
  dimension: string;
  option: string;
  wins: number;
  /** Share of the whole simplex of priorities, 0–1. */
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
  bestByPriority: Record<PriorityId, Outcome>;
  distinctWinners: number;
  sweep: OptionSweep[];
  /** Spots beaten on money and on plates served at the same time. */
  dominatedSpots: string[];
  /** Whether any plan that wins somewhere on the simplex throws food away. */
  bestPlansThatSpoil: number;
}

function dimensionsFor(n: PopUpNumbers): { dimension: string; options: { option: string; matches: (o: Outcome) => boolean }[] }[] {
  return [
    {
      dimension: "booth spot",
      options: (Object.keys(n.spots) as SpotId[]).map((spotId) => ({
        option: spotId,
        matches: (o: Outcome) => o.strategy.spotId === spotId,
      })),
    },
    {
      dimension: "the last Saturday",
      options: [
        { option: "put a second person on the window", matches: (o) => o.strategy.helper },
        { option: "work the window alone", matches: (o) => !o.strategy.helper },
      ],
    },
    {
      dimension: "the sell-out rebate",
      options: [
        { option: "count it into the plan", matches: (o) => o.strategy.countRebate },
        { option: "plan without it", matches: (o) => !o.strategy.countRebate },
      ],
    },
    {
      // The supplier sells by the tray and no crowd is a round number of trays, so this is
      // the world's central question rather than an error a careful student avoids: the tray
      // that carries you past what the crowd will take sells a few more plates and bins the
      // rest. Sometimes that is worth it and sometimes it is money in the bin.
      dimension: "the extra tray",
      options: [
        { option: "cook past what the crowd will take", matches: (o) => o.spoiled > 0 },
        { option: "never cook more than the crowd will take", matches: (o) => o.spoiled === 0 },
      ],
    },
    {
      dimension: "your cut",
      options: [
        { option: "bank something for yourself", matches: (o) => o.strategy.cut > 0 },
        { option: "put it all back into the truck", matches: (o) => o.strategy.cut === 0 },
      ],
    },
    {
      dimension: "the generator money",
      options: POP_UP_LINES.map((line) => ({
        option: `out of the ${line}`,
        matches: (o: Outcome) => o.strategy.repairFirst === line,
      })),
    },
  ];
}

/** Within this fraction of the best score, an option is a live alternative rather than a loss. */
const COMPETITIVE_MARGIN = 0.06;

export function analyseBalance(n: PopUpNumbers): BalanceReport {
  const outcomes = enumerateOutcomes(n);
  const viable = outcomes.filter((outcome) => outcome.viable);
  const dimensions = dimensionsFor(n);
  const flatOptions = dimensions.flatMap(({ dimension, options }) => options.map((option) => ({ dimension, ...option })));

  // The sweep reaches six figures of end states, so the four priority scores and the option
  // membership of every one of them are worked out once into flat arrays. The arithmetic is
  // identical to scoring inside each loop; what changes is that it happens once rather than
  // once per priority and once per weighting.
  const scores = PRIORITY_IDS.map((priority) => Float64Array.from(viable, (outcome) => PRIORITIES[priority](outcome)));
  const membership = flatOptions.map(({ matches }) => Uint8Array.from(viable, (outcome) => (matches(outcome) ? 1 : 0)));

  const bestByPriority = {} as Record<PriorityId, Outcome>;
  const bestScore = {} as Record<PriorityId, number>;
  const spread = {} as Record<PriorityId, number>;
  PRIORITY_IDS.forEach((priority, axis) => {
    const column = scores[axis]!;
    let bestIndex = 0;
    let worst = column[0]!;
    for (let index = 1; index < column.length; index += 1) {
      if (column[index]! > column[bestIndex]!) bestIndex = index;
      if (column[index]! < worst) worst = column[index]!;
    }
    bestByPriority[priority] = viable[bestIndex]!;
    bestScore[priority] = column[bestIndex]!;
    spread[priority] = Math.max(1, column[bestIndex]! - worst);
  });

  const verdicts: ChoiceVerdict[] = flatOptions.map(({ dimension, option, matches }, slot) => {
    const inPool = membership[slot]!;
    const ceiling = {} as Record<PriorityId, number>;
    const bestUnder: PriorityId[] = [];
    const competitiveUnder: PriorityId[] = [];
    PRIORITY_IDS.forEach((priority, axis) => {
      const column = scores[axis]!;
      let top = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < column.length; index += 1) {
        if (inPool[index] === 1 && column[index]! > top) top = column[index]!;
      }
      ceiling[priority] = top;
      if (matches(bestByPriority[priority])) bestUnder.push(priority);
      if (bestScore[priority] - top <= spread[priority] * COMPETITIVE_MARGIN) competitiveUnder.push(priority);
    });
    return { dimension, option, bestUnder, competitiveUnder, ceiling };
  });

  /**
   * A right answer, defined as strict dominance rather than as winning the tie-break.
   *
   * Basketball's harness reads "always right" off the single best plan under each priority.
   * That works there because no two of its options ever score exactly alike. One pair here
   * does: whether the organiser's rebate is written into the opening plan changes nothing at
   * all for a student whose stock was never limited by cash — the money arrives either way,
   * and where it sits on the board is the only difference. Reading the argmax would report
   * "plan without it" as a hidden answer key on the strength of a coin toss between two
   * identical outcomes, which is a defect in the reading rather than a defect in the world.
   *
   * So an option is a right answer only when every sibling is *strictly* worse under every
   * priority. An option that ties costs the student nothing, and an option that costs nothing
   * is not an answer key.
   */
  const siblings = new Map(dimensions.map(({ dimension, options }) => [dimension, options.map(({ option }) => option)]));
  const ceilingOf = new Map(verdicts.map((verdict) => [`${verdict.dimension}|${verdict.option}`, verdict.ceiling]));
  const strictlyBeatsEverySibling = (verdict: ChoiceVerdict) =>
    PRIORITY_IDS.every((priority) =>
      (siblings.get(verdict.dimension) ?? [])
        .filter((option) => option !== verdict.option)
        .every((option) => verdict.ceiling[priority] > (ceilingOf.get(`${verdict.dimension}|${option}`)?.[priority] ?? Number.NEGATIVE_INFINITY)),
    );

  const distinctWinners = new Set(
    PRIORITY_IDS.map((priority) => {
      const s = bestByPriority[priority].strategy;
      return `${s.spotId}|${s.helper}|${s.countRebate}|${s.repairFirst}`;
    }),
  ).size;

  // The systematic pass: for every weighting of the three things a student could care about,
  // find the best plan and record which options it used.
  const scaled = normalise(viable);
  const money = Float64Array.from(viable, (outcome) => scaled.money(outcome));
  const pocket = Float64Array.from(viable, (outcome) => scaled.pocket(outcome));
  const fed = Float64Array.from(viable, (outcome) => scaled.fed(outcome));
  const vectors = weightSimplex();
  const wins = new Array<number>(flatOptions.length).fill(0);
  let bestPlansThatSpoil = 0;
  for (const weights of vectors) {
    let bestIndex = 0;
    let top = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < money.length; index += 1) {
      const value = weights.money * money[index]! + weights.pocket * pocket[index]! + weights.fed * fed[index]!;
      if (value > top) {
        top = value;
        bestIndex = index;
      }
    }
    if (viable[bestIndex]!.spoiled > 0) bestPlansThatSpoil += 1;
    for (let slot = 0; slot < flatOptions.length; slot += 1) {
      if (membership[slot]![bestIndex] === 1) wins[slot] = (wins[slot] ?? 0) + 1;
    }
  }
  const sweep: OptionSweep[] = flatOptions.map(({ dimension, option }, slot) => ({
    dimension,
    option,
    wins: wins[slot]!,
    share: wins[slot]! / vectors.length,
  }));

  // The spot is the choice with a genuine frontier, so it gets a dominance check rather than
  // a preference check, and the frontier is drawn over all three axes rather than the two that
  // money reads on. The back lane loses on money and on plates to the middle row and still
  // belongs in the world — it is the only spot that leaves enough spare to bank a real cut.
  //
  // The statement is about ceilings: a spot earns its place when no other spot can match or
  // beat the most money it can make, the most a student can bank at it, and the most plates it
  // can serve, all at once. In other words, every spot has to be the best in this world at
  // something. A spot that is not is a decoy, and a decoy on the first real screen teaches a
  // student that reading the options carefully was a waste of their time.
  const spotIds = Object.keys(n.spots) as SpotId[];
  const ceilings = new Map(spotIds.map((spotId) => {
    const own = viable.filter((outcome) => outcome.strategy.spotId === spotId);
    return [spotId, {
      money: highest(own, (outcome) => outcome.endMoney),
      banked: highest(own, (outcome) => outcome.banked),
      fed: highest(own, (outcome) => outcome.fed),
    }];
  }));
  const dominatedSpots = spotIds.filter((spotId) => {
    const mine = ceilings.get(spotId)!;
    return spotIds.some((other) => {
      if (other === spotId) return false;
      const theirs = ceilings.get(other)!;
      return theirs.money >= mine.money && theirs.banked >= mine.banked && theirs.fed >= mine.fed
        && (theirs.money > mine.money || theirs.banked > mine.banked || theirs.fed > mine.fed);
    });
  });

  return {
    totalStates: outcomes.length,
    viableStates: viable.length,
    verdicts,
    deadOptions: verdicts.filter((verdict) => verdict.competitiveUnder.length === 0),
    alwaysRight: verdicts.filter(strictlyBeatsEverySibling),
    bestByPriority,
    distinctWinners,
    sweep,
    dominatedSpots,
    bestPlansThatSpoil,
  };
}

/* ---------------------------------------------------------------------------
   The second gate: is the stated range a decision, or decoration?
   --------------------------------------------------------------------------- */

/** One booth, one answer about Marisol, and what the fireworks band does to the order. */
export interface RangeVerdict {
  spotId: SpotId;
  helper: boolean;
  /** Plates the student is told the night could buy, after the window's own ceiling. */
  told: { low: number; high: number };
  /** Plates it actually buys. Scripted, and never shown before the order. */
  realised: number;
  /** The best tray order if the night comes in at the bottom of the band, and at the top. */
  bestAtLow: number;
  bestAtHigh: number;
  /** The order that is best if you knew — which is the order this world used to print. */
  bestAtRealised: number;
  /** Orders that are the single best answer somewhere inside the band. */
  liveOrders: number[];
  /** What cooking for the top costs when the night comes in at the bottom. Money in the bin. */
  costOfCookingHigh: number;
  /** What cooking for the bottom forgoes when it comes in at the top. Plates never handed over. */
  costOfCookingLow: number;
}

/** Three readings of a band a student could actually hold, and where each one is right. */
export type BandReading = "cook for the bottom" | "cook for the middle" | "cook for the top";

export interface RangeReport {
  /** Saturdays the organiser states as a band rather than a figure. */
  ranged: SaturdayNumber[];
  verdicts: RangeVerdict[];
  /**
   * Runs where the band is wide enough to move the order by a whole tray. Only these are
   * questions; the rest have had the band closed by the window, which is an answer.
   */
  facingARange: RangeVerdict[];
  /** Bands the student's own window closed below a tray. Reported, not a fault — see below. */
  handsClosed: RangeVerdict[];
  /** Bands where one order is the best answer at every crowd inside them. A hidden number. */
  collapsed: RangeVerdict[];
  /** Bands where the realised night sits on an edge, so the band gives the figure away. */
  edged: RangeVerdict[];
  /** For each reading of the band, the runs where it happens to be the best order. */
  readings: Record<BandReading, RangeVerdict[]>;
  /** A reading that is the best order everywhere a band is faced — a rule to be taught, not a call. */
  alwaysRightReadings: BandReading[];
}

/** One night's money for one order: what sells, less what the trays cost. */
function nightNet(n: PopUpNumbers, trays: number, crowd: number, cap: number): number {
  return Math.min(trays * n.platesPerTray, Math.min(crowd, cap)) * n.platePrice - trays * n.trayCost;
}

/**
 * Whether the fireworks band asks a question, and what answering it wrong costs.
 *
 * This is not the simplex sweep above and does not replace it. That one asks whether any
 * *option* is right whatever the student is trying to do, and it is unaffected by the range
 * because it is worked out entirely from the realised night. This one asks the question the
 * range itself creates: given only the band, is there still something to decide?
 *
 * The test is the one that matters to a child. Enumerate every order the truck could cook, and
 * every crowd the organiser said was possible. If a single order is the best answer at every
 * crowd in the band, the band is a number in a costume: a student who reasons carefully and a
 * student who cooks the same thing every time land in the same place, and the beat measures
 * nothing. If different crowds want different orders, the student has to weigh food in the bin
 * against people turned away — which is what the other story asks at its own central beat, and
 * what one shared rubric row was reading two different constructs of.
 *
 * The window's ceiling is folded in, because a range the student could not reach the top of is
 * not a range they face. At the bridge gate alone, every crowd the fireworks could bring is
 * more than one pair of hands can serve, so the band closes to a figure there and the decision
 * moves to Marisol — which is a real answer, not a gap.
 */
export function analyseLastSaturdayRange(n: PopUpNumbers): RangeReport {
  const saturday = n.saturdays;
  const ranged = (Object.keys(n.nights) as unknown as SaturdayNumber[])
    .map((key) => Number(key) as SaturdayNumber)
    .filter((night) => n.nights[night].told !== undefined);
  const verdicts: RangeVerdict[] = [];
  for (const spotId of Object.keys(n.spots) as SpotId[]) {
    for (const helper of [false, true]) {
      const cap = serveCap(n, saturday, helper);
      const band = crowdTold(n, spotId, saturday);
      const told = { low: Math.min(band.low, cap), high: Math.min(band.high, cap) };
      const realised = Math.min(crowdOn(n, spotId, saturday), cap);
      // Every order worth cooking: up to a tray past the most that could ever sell.
      const orders = Array.from({ length: Math.ceil(told.high / n.platesPerTray) + 2 }, (_, trays) => trays);
      const bestAt = (crowd: number) => orders.reduce(
        (top, trays) => (nightNet(n, trays, crowd, cap) > nightNet(n, top, crowd, cap) ? trays : top),
        0,
      );
      const live = new Set<number>();
      for (let crowd = told.low; crowd <= told.high; crowd += 1) live.add(bestAt(crowd));
      const bestAtLow = bestAt(told.low);
      const bestAtHigh = bestAt(told.high);
      verdicts.push({
        spotId,
        helper,
        told,
        realised,
        bestAtLow,
        bestAtHigh,
        bestAtRealised: bestAt(realised),
        liveOrders: [...live].sort((a, b) => a - b),
        costOfCookingHigh: nightNet(n, bestAtLow, told.low, cap) - nightNet(n, bestAtHigh, told.low, cap),
        costOfCookingLow: nightNet(n, bestAtHigh, told.high, cap) - nightNet(n, bestAtLow, told.high, cap),
      });
    }
  }
  /**
   * A band only asks something where it can move the order by a whole tray.
   *
   * The supplier sells by the tray, so a band three plates wide is a figure with a rounding
   * error on it. Where the student's own window has closed the band to less than a tray — the
   * bridge gate on your own, where every crowd the fireworks could bring is more than one pair
   * of hands can serve — there is nothing to decide on the last night and the screen says so
   * in as many words. That is a consequence of a decision they already made about Marisol, not
   * a gap in this one, and folding it in with the real bands would let a genuinely collapsed
   * band hide behind it.
   */
  const facesARange = (verdict: RangeVerdict) => verdict.told.high - verdict.told.low >= n.platesPerTray;
  const facingARange = verdicts.filter(facesARange);
  const bestAtCrowd = (verdict: RangeVerdict, crowd: number) => {
    const cap = serveCap(n, saturday, verdict.helper);
    const orders = Array.from({ length: Math.ceil(verdict.told.high / n.platesPerTray) + 2 }, (_, trays) => trays);
    return orders.reduce((top, trays) => (nightNet(n, trays, crowd, cap) > nightNet(n, top, crowd, cap) ? trays : top), 0);
  };
  // What each reading of the band would have you cook, and whether it happens to be the order
  // that was best. A student cannot check any of these against the night; the point is only
  // that none of them is a rule the world quietly rewards everywhere.
  const readingOrder: Record<BandReading, (verdict: RangeVerdict) => number> = {
    "cook for the bottom": (verdict) => bestAtCrowd(verdict, verdict.told.low),
    "cook for the middle": (verdict) => bestAtCrowd(verdict, Math.round((verdict.told.low + verdict.told.high) / 2)),
    "cook for the top": (verdict) => bestAtCrowd(verdict, verdict.told.high),
  };
  const readings = Object.fromEntries(
    (Object.keys(readingOrder) as BandReading[]).map((reading) => [
      reading,
      facingARange.filter((verdict) => readingOrder[reading](verdict) === verdict.bestAtRealised),
    ]),
  ) as Record<BandReading, RangeVerdict[]>;

  return {
    ranged,
    verdicts,
    facingARange,
    handsClosed: verdicts.filter((verdict) => !facesARange(verdict)),
    // A band with one live order is a number the student has to guess rather than a decision
    // they have to make.
    collapsed: facingARange.filter((verdict) => verdict.liveOrders.length < 2),
    // A realised night sitting on an edge of the band tells a student where to aim without
    // saying so, which is a printed number with extra steps.
    edged: facingARange.filter((verdict) => verdict.realised <= verdict.told.low || verdict.realised >= verdict.told.high),
    readings,
    alwaysRightReadings: (Object.keys(readings) as BandReading[])
      .filter((reading) => facingARange.length > 0 && readings[reading].length === facingARange.length),
  };
}

export function formatRangeReport(report: RangeReport): string {
  const lines: string[] = [];
  lines.push(`Saturdays stated as a range: ${report.ranged.join(", ") || "none"}`);
  lines.push("");
  lines.push("What the band asks, booth by booth:");
  lines.push(
    "  " + "booth".padEnd(12) + "helper".padEnd(8) + "told".padEnd(10) + "lands".padEnd(7)
    + "best low".padEnd(10) + "best high".padEnd(11) + "live orders".padEnd(14)
    + "cook high, get low".padEnd(20) + "cook low, get high",
  );
  for (const verdict of report.verdicts) {
    lines.push(
      "  " + verdict.spotId.padEnd(12)
      + String(verdict.helper).padEnd(8)
      + `${verdict.told.low}-${verdict.told.high}`.padEnd(10)
      + String(verdict.realised).padEnd(7)
      + `${verdict.bestAtLow} trays`.padEnd(10)
      + `${verdict.bestAtHigh} trays`.padEnd(11)
      + verdict.liveOrders.join("/").padEnd(14)
      + `-$${verdict.costOfCookingHigh}`.padEnd(20)
      + `-$${verdict.costOfCookingLow}`,
    );
  }
  lines.push("");
  lines.push("Where each reading of the band happens to be the order that was best:");
  for (const [reading, where] of Object.entries(report.readings)) {
    lines.push(`  ${reading.padEnd(22)} ${where.length}/${report.facingARange.length}  ${
      where.map((v) => `${v.spotId}${v.helper ? "+Marisol" : ""}`).join(", ") || "nowhere"}`);
  }
  if (report.handsClosed.length) {
    lines.push("");
    lines.push(`No band to decide inside — the window closed it, and the screen says so: ${
      report.handsClosed.map((v) => `${v.spotId}/helper=${v.helper}`).join(", ")}`);
  }
  if (report.collapsed.length) {
    lines.push("");
    lines.push(`COLLAPSED BANDS (one order best at every crowd — a number in a costume): ${
      report.collapsed.map((v) => `${v.spotId}/helper=${v.helper}`).join(", ")}`);
  }
  if (report.edged.length) {
    lines.push("");
    lines.push(`EDGED BANDS (the night lands on the edge, which gives the figure away): ${
      report.edged.map((v) => `${v.spotId}/helper=${v.helper}`).join(", ")}`);
  }
  if (report.alwaysRightReadings.length) {
    lines.push("");
    lines.push(`ALWAYS-RIGHT READINGS (a rule to be taught, not a call to make): ${report.alwaysRightReadings.join(", ")}`);
  }
  return lines.join("\n");
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines: string[] = [];
  lines.push(`States swept: ${report.totalStates} (${report.viableStates} viable)`);
  lines.push("");
  lines.push("Best run under each set of priorities:");
  for (const priority of PRIORITY_IDS) {
    const { strategy, endMoney, banked, fed, spoiled, lastSaturdayRan } = report.bestByPriority[priority];
    lines.push(
      `  ${priority.padEnd(8)} ${strategy.spotId.padEnd(12)} helper=${String(strategy.helper).padEnd(5)} rebate=${String(strategy.countRebate).padEnd(5)} `
      + `trays=${strategy.trays.first}/${strategy.trays.middle}/${strategy.trays.last} cut=$${strategy.cut} repair=${strategy.repairFirst.padEnd(7)} `
      + `→ money=$${endMoney} banked=$${banked} fed=${fed} binned=${spoiled}${lastSaturdayRan ? "" : " (no generator)"}`,
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
    lines.push(`    ${verdict.option.padEnd(34)} best for: ${best.padEnd(24)} live for: ${live}`);
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
    lines.push(`    ${entry.option.padEnd(34)} ${(entry.share * 100).toFixed(1).padStart(5)}%  ${"#".repeat(Math.round(entry.share * 40))}`);
  }
  if (report.dominatedSpots.length) {
    lines.push("");
    lines.push(`DOMINATED SPOTS (beaten on money and on plates at once): ${report.dominatedSpots.join(", ")}`);
  }
  lines.push("");
  lines.push(`Winning plans that throw food away: ${report.bestPlansThatSpoil} of ${weightSimplex().length}`);
  lines.push(`Distinct winning runs across priorities: ${report.distinctWinners} of ${PRIORITY_IDS.length}`);
  return lines.join("\n");
}
