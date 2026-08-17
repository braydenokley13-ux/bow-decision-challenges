import { dollars, type Dollars } from "../../../core/money";
import {
  availableToPlan,
  cashToPlan,
  drawFrom,
  owedUpFront,
  playSaturday,
  rebateEarned,
  swapBill,
  type SaturdayOutcome,
} from "./economy";
import { POP_UP_NUMBERS } from "./numbers";
import type { PopUpLineId, PopUpNumbers, PopUpPlan, SaturdayNumber, SpotId } from "./types";

/**
 * Where the money stands, worked out from the decisions the student has actually made.
 *
 * Nothing about the money is stored. Every figure below is derived from the choices in the
 * state, which is what makes the world deterministic in the strong sense: the same decisions
 * in the same order always produce the same market, on any machine, on a replay, and in a
 * test. A stored balance is a second copy of the truth and the two drift the first time a
 * screen forgets to update one of them.
 */

export const EMPTY_PLAN: PopUpPlan = { stock: dollars(0), cushion: dollars(0), cut: dollars(0) };

export function planSum(plan: PopUpPlan): Dollars {
  return dollars(plan.stock + plan.cushion + plan.cut);
}

/** The decisions the ledger reads. The machine's state satisfies this; so does a test fixture. */
export interface LedgerInput {
  spotId: SpotId | null;
  counted: { catering: boolean; rebate: boolean };
  /** What the opening board holds — the saved plan, or the draft while it is being built. */
  opening: PopUpPlan;
  /** Whether the opening plan has been committed. */
  openingSaved: boolean;
  coverLine: PopUpLineId | null;
  trays: { first: number | null; middle: number | null; last: number | null };
  helper: boolean | null;
  /** What the repair board holds — the three lines as the student would leave them. */
  repair: PopUpPlan | null;
}

export interface PopUpLedger {
  owed: Dollars;
  cashToPlan: Dollars;
  /** The money the opening board divides, conditional money included when it was counted. */
  available: Dollars;
  /** Available money minus what the opening board has given a job. Zero closes the plan. */
  openingUnassigned: Dollars;
  /** Below zero when the plan spends more than there is. */
  openingBalance: Dollars;
  saturdays: readonly SaturdayOutcome[];
  /** The organiser's rebate, earned by a first Saturday the plan never counted on. */
  windfall: Dollars;
  /** Conditional money the plan counted on and did not get. */
  shortfall: Dollars;
  covered: Dollars;
  uncovered: Dollars;
  /** What the three lines hold when the generator goes down. */
  held: PopUpPlan;
  bill: Dollars;
  /** The most the lines that can still move could put toward the bill. */
  freeable: Dollars;
  /** What the repair board has freed. */
  freed: Dollars;
  /** What the bill is still short by. */
  residual: Dollars;
  /** Money taken off a line and left with no job. */
  repairUnassigned: Dollars;
  /** The three lines after the repair. */
  afterRepair: PopUpPlan;
  takings: Dollars;
  binned: Dollars;
  plates: { sold: number; spoiled: number };
  endMoney: Dollars;
  /** What survived of the line the student was banking for themselves. */
  banked: Dollars;
}

/**
 * The whole run so far, in the order it happens.
 *
 * A Saturday that has not been ordered for yet simply does not appear, so the same function
 * answers "what does the board look like right now" on every screen and "how did the season
 * end" at the settle-up.
 */
export function popUpLedger(input: LedgerInput, n: PopUpNumbers = POP_UP_NUMBERS): PopUpLedger {
  const spotId = input.spotId;
  const owed = spotId ? owedUpFront(n, spotId) : dollars(0);
  const toPlan = spotId ? cashToPlan(n, spotId) : dollars(0);
  const available = spotId ? availableToPlan(n, spotId, input.counted) : dollars(0);
  const assigned = planSum(input.opening);
  const bill = swapBill(n);

  const blank: PopUpLedger = {
    owed,
    cashToPlan: toPlan,
    available,
    openingUnassigned: dollars(Math.max(0, available - assigned)),
    openingBalance: dollars(available - assigned),
    saturdays: [],
    windfall: dollars(0),
    shortfall: dollars(0),
    covered: dollars(0),
    uncovered: dollars(0),
    held: input.opening,
    bill,
    freeable: dollars(0),
    freed: dollars(0),
    residual: bill,
    repairUnassigned: dollars(0),
    afterRepair: input.opening,
    takings: dollars(0),
    binned: dollars(0),
    plates: { sold: 0, spoiled: 0 },
    endMoney: dollars(0),
    banked: input.opening.cut,
  };
  if (!spotId || !input.openingSaved) return blank;

  let lines: PopUpPlan = { ...input.opening };
  const saturdays: SaturdayOutcome[] = [];
  const cook = (saturday: SaturdayNumber, trays: number) => {
    const affordable = Math.floor(lines.stock / n.trayCost);
    const bought = Math.max(0, Math.min(Math.round(trays), affordable));
    lines = { ...lines, stock: dollars(lines.stock - bought * n.trayCost) };
    saturdays.push(playSaturday(n, spotId, saturday, bought, input.helper === true));
  };

  let windfall = dollars(0);
  if (input.trays.first !== null) {
    cook(1, input.trays.first);
    if (rebateEarned(n, saturdays[0]!) && !input.counted.rebate) {
      windfall = n.rebate.amount;
      lines = { ...lines, cushion: dollars(lines.cushion + n.rebate.amount) };
    }
  }

  let shortfall = dollars(0);
  let covered = dollars(0);
  let uncovered = dollars(0);
  if (input.trays.middle !== null) {
    cook(2, input.trays.middle);
    cook(3, input.trays.middle);
    // Both answers land while Saturdays 2 and 3 are being played: the studio says no, and the
    // organiser has already decided about the rebate on the strength of the first Saturday.
    shortfall = dollars(
      (input.counted.catering ? n.catering.amount : 0)
      + (input.counted.rebate && !rebateEarned(n, saturdays[0] ?? playSaturday(n, spotId, 1, 0, false)) ? n.rebate.amount : 0),
    );
    const givenBack = drawFrom(lines, input.coverLine ? [input.coverLine] : ["cushion"], shortfall);
    lines = givenBack.left;
    covered = givenBack.taken;
    uncovered = dollars(shortfall - covered);
    if (input.helper === true) {
      lines = drawFrom(lines, ["cushion", "stock", "cut"], n.helperCost).left;
    }
  }

  const held: PopUpPlan = { ...lines };
  const freeable = dollars(Math.min(bill, held.stock + held.cushion + held.cut));
  const repair = input.repair;
  const freed = repair
    ? dollars(Math.max(0, (held.stock - repair.stock) + (held.cushion - repair.cushion) + (held.cut - repair.cut)))
    : dollars(0);
  const residual = dollars(Math.max(0, bill - freed));
  const repairUnassigned = dollars(Math.max(0, freed - bill));
  const afterRepair: PopUpPlan = repair ?? held;

  if (repair && residual === 0 && input.trays.last !== null) {
    lines = { ...afterRepair };
    cook(4, input.trays.last);
  } else if (repair) {
    lines = { ...afterRepair };
  }

  const plates = saturdays.reduce(
    (total, day) => ({ sold: total.sold + day.sold, spoiled: total.spoiled + day.spoiled }),
    { sold: 0, spoiled: 0 },
  );
  const takings = dollars(saturdays.reduce((total, day) => total + day.takings, 0));

  return {
    ...blank,
    saturdays,
    windfall,
    shortfall,
    covered,
    uncovered,
    held,
    freeable,
    freed,
    residual,
    repairUnassigned,
    afterRepair,
    takings,
    binned: dollars(saturdays.reduce((total, day) => total + day.binned, 0)),
    plates,
    endMoney: dollars(lines.stock + lines.cushion + lines.cut + takings),
    banked: lines.cut,
  };
}
