import { dollars, type Dollars } from "../../../core/money";
import { POP_UP_LINES, type PopUpLineId, type PopUpNumbers, type PopUpPlan, type SaturdayNumber, type SpotId } from "./types";

/**
 * What actually happens at the market, worked out from what the student chose.
 *
 * **Nothing here is random.** Every Saturday resolves from the spot the student picked, the
 * trays they cooked and whether they put a second person on the window. That is the rule the
 * whole product runs on: a consequence a student cannot trace back to a decision they made
 * is a consequence they cannot learn anything from, and a world that rolls dice cannot claim
 * the evidence it collects is about the student.
 *
 * The module is pure and takes the numbers as an argument, so the balance harness can price
 * a hypothetical economy with it and the machine can price the real one. Neither imports the
 * other.
 */

/** The permit and the booth. Both are due before the first Saturday and neither comes back. */
export function owedUpFront(n: PopUpNumbers, spotId: SpotId): Dollars {
  return dollars(n.permit + n.spots[spotId].booth);
}

/** What is left once the permit and the booth are paid. The money the plan divides. */
export function cashToPlan(n: PopUpNumbers, spotId: SpotId): Dollars {
  return dollars(n.startCash - owedUpFront(n, spotId));
}

/** What a stock order costs. Trays, because that is how the supplier sells. */
export function orderCost(n: PopUpNumbers, trays: number): Dollars {
  return dollars(Math.max(0, Math.round(trays)) * n.trayCost);
}

/** What the shop still wants for a replacement generator once the deposit is put against it. */
export function swapBill(n: PopUpNumbers): Dollars {
  return dollars(n.generator.replacement - n.generator.deposit);
}

/**
 * Plates this spot's crowd will buy on this Saturday.
 *
 * Two facts multiplied: how many people walk past this booth on an ordinary night, and what
 * this particular Saturday does to that. Three of the four used to return the same figure,
 * so a world that printed weather over every night resolved three of them identically and the
 * standing order that covered two of them was one question wearing two dates.
 *
 * This is what the night *does*, and it is the only figure any outcome is worked out from.
 * Nothing is rolled: same booth, same night, same number, every run, on any machine.
 *
 * What the student was *told* is `crowdTold`, and on three of the four Saturdays the two are
 * the same figure, printed on the booth card before a booth is taken and again on the order
 * screen before the order is placed — so a student who cooks for the wrong night mis-planned
 * rather than got unlucky. On the fireworks night they are not: the organiser states a band
 * and the night lands inside it, which is a decision made before you know rather than a
 * lottery, because the band itself is stated and the same band every run.
 */
export function crowdOn(n: PopUpNumbers, spotId: SpotId, saturday: SaturdayNumber): number {
  return Math.round((n.spots[spotId].crowd * n.nights[saturday].pull) / 100);
}

/**
 * What the student is *told* this night's crowd will buy, which is not always a figure.
 *
 * Three of the four Saturdays are stated exactly and this returns the same number twice for
 * them. The fireworks night is stated as a band, because the organiser does not know — and
 * because a market that prints the answer to its own central question four times is asking a
 * student to do arithmetic where the other story asks them to commit money before they know.
 * `numbers.ts` and `types.ts` carry the whole argument.
 *
 * **Nothing downstream of a resolved night may call this.** The band is what the student knew;
 * `crowdOn` is what happened, and every outcome, every verdict and the whole balance harness
 * are worked out from `crowdOn` alone. That separation is the guarantee that a range changes
 * what is asked and nothing about what replays.
 */
export interface CrowdTold {
  low: number;
  /** Equal to `low` on a night the organiser states as a figure. */
  high: number;
  /** Whether the student was given a range rather than a number. */
  range: boolean;
}

export function crowdTold(n: PopUpNumbers, spotId: SpotId, saturday: SaturdayNumber): CrowdTold {
  const told = n.nights[saturday].told;
  const at = (pull: number) => Math.round((n.spots[spotId].crowd * pull) / 100);
  if (!told) {
    const exact = crowdOn(n, spotId, saturday);
    return { low: exact, high: exact, range: false };
  }
  return { low: at(told.low), high: at(told.high), range: true };
}

/**
 * Plates that can actually go out of the window.
 *
 * The friend is booked for the last Saturday only, which is the one the market runs late
 * for. On a normal Saturday the crowd at the bridge gate is already more than one person can
 * serve, and that is the point of the spot rather than a defect in it.
 */
export function serveCap(n: PopUpNumbers, saturday: SaturdayNumber, helper: boolean): number {
  return helper && saturday === n.saturdays ? n.helperServeCap : n.soloServeCap;
}

/** The most plates that can be sold here on this night, whatever is cooked. */
export function sellCap(n: PopUpNumbers, spotId: SpotId, saturday: SaturdayNumber, helper: boolean): number {
  return Math.min(crowdOn(n, spotId, saturday), serveCap(n, saturday, helper));
}

/**
 * The same question the order screen asks, answered with what the student was told.
 *
 * The window is the window whichever way the night goes, so the serve cap closes the band from
 * above: at the bridge gate on your own, every crowd in the fireworks band is more than one
 * pair of hands can serve, and the honest thing to print there is a number rather than a range
 * the student could not reach either end of.
 */
export function sellCapTold(n: PopUpNumbers, spotId: SpotId, saturday: SaturdayNumber, helper: boolean): CrowdTold {
  const told = crowdTold(n, spotId, saturday);
  const cap = serveCap(n, saturday, helper);
  const low = Math.min(told.low, cap);
  const high = Math.min(told.high, cap);
  return { low, high, range: low !== high };
}

export interface SaturdayOutcome {
  saturday: SaturdayNumber;
  trays: number;
  cooked: number;
  sold: number;
  /** Plates nobody bought. This is the money in the bin, and it is the world's constraint. */
  spoiled: number;
  takings: Dollars;
  /** What the spoiled plates cost to make. Shown as money thrown away, never as a score. */
  binned: Dollars;
  soldOut: boolean;
}

/** One Saturday, resolved. */
export function playSaturday(
  n: PopUpNumbers,
  spotId: SpotId,
  saturday: SaturdayNumber,
  trays: number,
  helper: boolean,
): SaturdayOutcome {
  const cooked = Math.max(0, Math.round(trays)) * n.platesPerTray;
  const sold = Math.min(cooked, sellCap(n, spotId, saturday, helper));
  const spoiled = cooked - sold;
  return {
    saturday,
    trays: Math.max(0, Math.round(trays)),
    cooked,
    sold,
    spoiled,
    takings: dollars(sold * n.platePrice),
    binned: dollars(Math.round((spoiled / n.platesPerTray) * n.trayCost)),
    soldOut: cooked > 0 && spoiled === 0,
  };
}

/** Whether the organiser's rebate is earned. Every plate gone, and enough of them to count. */
export function rebateEarned(n: PopUpNumbers, firstSaturday: SaturdayOutcome): boolean {
  return firstSaturday.soldOut && firstSaturday.cooked >= n.rebate.minimumPlates;
}

/** What the plan is dividing: the cash in hand plus any conditional money counted in. */
export function availableToPlan(
  n: PopUpNumbers,
  spotId: SpotId,
  counted: { catering: boolean; rebate: boolean },
): Dollars {
  return dollars(
    cashToPlan(n, spotId)
    + (counted.catering ? n.catering.amount : 0)
    + (counted.rebate ? n.rebate.amount : 0),
  );
}

export function planTotal(plan: PopUpPlan): Dollars {
  return dollars(plan.stock + plan.cushion + plan.cut);
}

/**
 * Money taken out of the lines that can still move, in the order the student named.
 *
 * Returns what was actually taken and what each line has left. Nothing here decides which
 * line *should* give — that is the student's call on the board, and scoring it would make one
 * set of priorities the right answer in a world swept to prove none of them is.
 */
export function drawFrom(
  lines: PopUpPlan,
  order: readonly PopUpLineId[],
  amount: number,
): { taken: Dollars; left: PopUpPlan } {
  const left: PopUpPlan = { ...lines };
  let outstanding = Math.max(0, amount);
  const queue = [...order, ...POP_UP_LINES.filter((line) => !order.includes(line))];
  for (const line of queue) {
    if (outstanding === 0) break;
    const give = Math.min(outstanding, left[line]);
    left[line] = dollars(left[line] - give);
    outstanding -= give;
  }
  return { taken: dollars(Math.max(0, amount) - outstanding), left };
}

/**
 * Buying an order, and taking the money off the lines it actually comes off.
 *
 * The stock line pays first and pays as far as it goes. `alsoFrom` is the line the student
 * named to cover the rest, and it exists for one night only — see `PopUpChoices.foodLine`.
 * Both the live ledger and the whole-season resolution buy stock through this, so a screen
 * and a settle-up can never disagree about how many trays a plan could pay for.
 */
export function payForTrays(
  n: PopUpNumbers,
  lines: PopUpPlan,
  wanted: number,
  alsoFrom: PopUpLineId | null = null,
): { trays: number; cost: Dollars; fromStock: Dollars; fromLine: Dollars; left: PopUpPlan } {
  const extra = alsoFrom && alsoFrom !== "stock" ? lines[alsoFrom] : 0;
  const affordable = Math.floor((lines.stock + extra) / n.trayCost);
  const trays = Math.max(0, Math.min(Math.round(wanted), affordable));
  const cost = orderCost(n, trays);
  const fromStock = dollars(Math.min(lines.stock, cost));
  const fromLine = dollars(cost - fromStock);
  const left: PopUpPlan = { ...lines, stock: dollars(lines.stock - fromStock) };
  if (fromLine > 0 && alsoFrom && alsoFrom !== "stock") left[alsoFrom] = dollars(left[alsoFrom] - fromLine);
  return { trays, cost, fromStock, fromLine, left };
}

export interface PopUpChoices {
  spotId: SpotId;
  countCatering: boolean;
  countRebate: boolean;
  /** What the opening plan put where. The board makes this add up to the money available. */
  plan: PopUpPlan;
  /** Trays cooked on the first Saturday, on each of the two middle ones, and on the last. */
  trays: { first: number; middle: number; last: number };
  /** A second person on the window for the last Saturday. Booked early, and not refundable. */
  helper: boolean;
  /** The line the student named to give money back from if a condition is not met. */
  coverLine: PopUpLineId;
  /** The order the generator money comes out of the lines that can still move. */
  repairOrder: readonly PopUpLineId[];
  /**
   * The line that pays for the last Saturday's food once the stock line runs out.
   *
   * Null is "nothing but the stock line", which is what every Saturday before this one is.
   * The last Saturday is the only night where the answer can be anything else, and the
   * reason is not generosity: on Saturdays 1 to 3 a stock line that will not stretch means a
   * smaller night and a bigger one still to come, and on Saturday 4 it means the truck does
   * not open at all with no Saturday left to answer it. Nothing in this world's fiction ever
   * said the cash in the box could not buy food — Ramos delivers on the Saturday morning and
   * takes money — so a market that made a child lose the biggest night to a rule it never
   * stated was enforcing a model, not a consequence.
   */
  foodLine?: PopUpLineId | null;
}

export interface SeasonOutcome {
  choices: PopUpChoices;
  saturdays: readonly SaturdayOutcome[];
  /** Conditional money the plan counted on that did not arrive. */
  shortfall: Dollars;
  /** How much of that shortfall the movable lines could give back. */
  covered: Dollars;
  /** What the plan counted on and could not give back. A plan with any of this never worked. */
  uncovered: Dollars;
  /** Money that arrived without being planned for, because a condition was met anyway. */
  windfall: Dollars;
  /** What the shop wants for a replacement generator. */
  bill: Dollars;
  /** Money the student freed toward the bill from the lines that could still move. */
  freed: Dollars;
  /** The most that could have been freed. A full response is judged against this, not the bill. */
  freeable: Dollars;
  /** What the bill was still short by. Anything above zero means no generator. */
  stillShort: Dollars;
  /** Whether the last Saturday happened at all. */
  lastSaturdayRan: boolean;
  plates: { sold: number; spoiled: number };
  takings: Dollars;
  /** Money thrown away as stock nobody bought. */
  binned: Dollars;
  /** Money in hand once the organiser settles up. */
  endMoney: Dollars;
  /** What survived of the line the student was banking for themselves. */
  banked: Dollars;
  /** The plan counted only on money that arrived, or gave back everything that did not. */
  viable: boolean;
}

/**
 * The whole four Saturdays, from the plan to the settle-up.
 *
 * The order below is the order the student lives it in, and it is the order the money moves
 * in: stock is bought before it is sold, the organiser settles at the end of the run, and the
 * generator dies while there is still one Saturday to pay for. That last fact is the world —
 * takings that have not landed cannot pay a bill that has.
 *
 * **That rule was litigated and it is kept, which is the opposite of what happened to
 * `foodLine` above.** An economics review found the two together and was right about both: a
 * market that closes a truck on a rule it never stated is enforcing a model rather than
 * delivering a consequence. Of 174,339 reachable end states, **726** end with the truck shut
 * on the biggest Saturday and **519** of those belong to a student who had planned trays for
 * it — and every one of the 726 had taken more at the window than the $270 bill, up to
 * $1,500. The student had been shown those takings, night by night, in their own words.
 *
 * The food order was fixed by letting the money through, because nothing in the fiction ever
 * said the cash in the box could not buy food. This one is fixed the other way, by saying the
 * rule out loud before the plan is written — `screens.plan.lead` and `breakdown.locked` — and
 * the reason is what letting it through would cost:
 *
 * - **The takings would cover the bill in 85.6% of all runs that sold anything** over the
 *   first three Saturdays, and paying from the till rather than from a line is the same $270
 *   out of the same season either way. So the repair board would stop being a decision: no
 *   student would ever give up stock, cushion or their own cut for a bill the till can meet.
 * - `adapt-a-plan.er3` is scored on what the repair freed against the most the movable lines
 *   were holding. Every run would free nothing, and the world's only evidence about repairing
 *   a plan under a changed cost would go with it. That is a worse defect than the one it fixes.
 *
 * What makes the rule fair rather than merely stated is that it is *plannable*: the cushion's
 * own line on the plan board says what it is for, the bill is worked out on screen before the
 * repair board opens, and the organiser's rebate — which does land in the box on the night —
 * is a refund of booth money the student already paid, not a night's takings.
 * `takings.test.ts` holds the copy and the arithmetic to each other.
 */
export function resolveSeason(n: PopUpNumbers, choices: PopUpChoices): SeasonOutcome {
  let lines: PopUpPlan = { ...choices.plan };
  const saturdays: SaturdayOutcome[] = [];

  const cook = (saturday: SaturdayNumber, wanted: number, alsoFrom: PopUpLineId | null = null): SaturdayOutcome => {
    const spent = payForTrays(n, lines, wanted, alsoFrom);
    lines = spent.left;
    const outcome = playSaturday(n, choices.spotId, saturday, spent.trays, choices.helper);
    saturdays.push(outcome);
    return outcome;
  };

  const first = cook(1, choices.trays.first);
  const earned = rebateEarned(n, first);

  // The rebate lands on the night, in the cash box. A student who did not plan on it still
  // has it; a student who did has already spent it somewhere on the board.
  let windfall = dollars(0);
  if (earned && !choices.countRebate) {
    windfall = n.rebate.amount;
    lines = { ...lines, cushion: dollars(lines.cushion + n.rebate.amount) };
  }

  cook(2, choices.trays.middle);
  cook(3, choices.trays.middle);

  // What the plan counted on and did not get. The studio never confirms; the rebate depends
  // on the student's own first Saturday.
  const shortfall = dollars(
    (choices.countCatering ? n.catering.amount : 0)
    + (choices.countRebate && !earned ? n.rebate.amount : 0),
  );
  const givenBack = drawFrom(lines, [choices.coverLine], shortfall);
  lines = givenBack.left;
  const uncovered = dollars(shortfall - givenBack.taken);

  // The friend is booked before the last Saturday and paid whatever happens. She turned down
  // another shift for it, which is what makes it committed rather than adjustable.
  if (choices.helper) {
    const paid = drawFrom(lines, ["cushion", "stock", "cut"], n.helperCost);
    lines = paid.left;
  }

  const bill = swapBill(n);
  const freeable = dollars(Math.min(bill, lines.stock + lines.cushion + lines.cut));
  const repair = drawFrom(lines, choices.repairOrder, bill);
  const freed = repair.taken;
  const stillShort = dollars(bill - freed);
  // No generator, no cooking. The shop does not swap it for part of the money.
  const lastSaturdayRan = stillShort === 0;
  if (lastSaturdayRan) {
    lines = repair.left;
    cook(4, choices.trays.last, choices.foodLine ?? null);
  }

  const plates = saturdays.reduce(
    (total, day) => ({ sold: total.sold + day.sold, spoiled: total.spoiled + day.spoiled }),
    { sold: 0, spoiled: 0 },
  );
  const takings = dollars(saturdays.reduce((total, day) => total + day.takings, 0));
  const binned = dollars(saturdays.reduce((total, day) => total + day.binned, 0));

  return {
    choices,
    saturdays,
    shortfall,
    covered: givenBack.taken,
    uncovered,
    windfall,
    bill,
    freed,
    freeable,
    stillShort,
    lastSaturdayRan,
    plates,
    takings,
    binned,
    endMoney: dollars(lines.stock + lines.cushion + lines.cut + takings),
    banked: lines.cut,
    viable: uncovered === 0 && stillShort === 0,
  };
}
