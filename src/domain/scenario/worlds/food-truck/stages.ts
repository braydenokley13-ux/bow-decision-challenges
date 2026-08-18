import type { StageId } from "../../../evidence/types";

/**
 * The ten screens of Run the Pop-Up, and how long each is designed to take.
 *
 * The budget is Basketball's `machine/pacing.ts` idea applied to a different world, and it
 * lives here rather than there because it is a fact about this world's screens. Nothing in
 * `pacing.ts` had to change to admit it: a design budget is not something the platform owns,
 * it is something each world owes.
 *
 * It is a **design budget**, not a measurement: reading at roughly 150 words a minute, a beat
 * to consider each decision, and about four seconds per deliberate input. Real students are
 * slower, which is why the total sits in the lower half of the 18–25 minute band rather than
 * the middle of it. No human has been timed, and no test in this repository can claim one has.
 */
export type PopUpStageId =
  | "popup-spot" | "popup-money" | "popup-plan" | "popup-first-saturday"
  | "popup-standing-order" | "popup-generator" | "popup-repair" | "popup-settle"
  | "popup-writeup" | "popup-submitted";

export const POP_UP_STAGES: readonly PopUpStageId[] = [
  "popup-spot",
  "popup-money",
  "popup-plan",
  "popup-first-saturday",
  "popup-standing-order",
  "popup-generator",
  "popup-repair",
  "popup-settle",
  "popup-writeup",
  "popup-submitted",
] as const;

export interface PopUpStageBudget {
  seconds: number;
  /** What those seconds are made of. Changing the screen means changing this line too. */
  basis: string;
}

export const POP_UP_STAGE_BUDGET: Record<PopUpStageId, PopUpStageBudget> = {
  "popup-spot": { seconds: 150, basis: "Read who you are and what is already owed, compare three booths on price and on four different crowds, pick one, and total what is owed before the first Saturday." },
  "popup-money": { seconds: 90, basis: "Read two pieces of money with a rule attached, decide about each, and work out what is left to plan with." },
  "popup-plan": { seconds: 160, basis: "Set three lines, name the line that takes the rest, and say what gives if conditional money does not come." },
  "popup-first-saturday": { seconds: 95, basis: "Order trays for opening night against one stated crowd, price the order, then read what sold and what went in the bin." },
  "popup-standing-order": { seconds: 185, basis: "Settle the tips jar across three claims it will not stretch to and say what made the rest matter less, answer the friend on the window, then weigh one order against two unequal nights." },
  "popup-generator": { seconds: 95, basis: "Read what happened to the generator and work out what the shop still wants." },
  "popup-repair": { seconds: 125, basis: "Free the money from lines that can still move, then set the last Saturday's order." },
  "popup-settle": { seconds: 85, basis: "Read the last Saturday, the settle-up, and what each call actually did." },
  "popup-writeup": { seconds: 140, basis: "Pick two or three of their own numbers and write two to four sentences for the organiser." },
  "popup-submitted": { seconds: 20, basis: "Confirmation that the work reached the class." },
};

/** Everything a student passes through. This world has no branch that skips a screen. */
export const POP_UP_PATH: readonly PopUpStageId[] = POP_UP_STAGES;

export function popUpBudget(path: readonly PopUpStageId[] = POP_UP_PATH): number {
  return path.reduce((total, stage) => total + POP_UP_STAGE_BUDGET[stage].seconds, 0);
}

/** Where the story stands, in market time rather than in form time. */
export interface MarketPosition {
  caption: string;
  /** Saturdays behind the truck. */
  played: number;
  /** The Saturday being lived through, or null before the market opens. */
  current: number | null;
}

const MARKET_POSITIONS: Partial<Record<StageId, MarketPosition>> = {
  "popup-spot": { caption: "Before the market", played: 0, current: null },
  "popup-money": { caption: "Before the market", played: 0, current: null },
  "popup-plan": { caption: "Before the market", played: 0, current: null },
  "popup-first-saturday": { caption: "Saturday 1", played: 0, current: 1 },
  "popup-standing-order": { caption: "Saturdays 2 and 3", played: 1, current: 2 },
  "popup-generator": { caption: "After Saturday 3", played: 3, current: null },
  "popup-repair": { caption: "After Saturday 3", played: 3, current: null },
  "popup-settle": { caption: "Saturday 4", played: 3, current: 4 },
  "popup-writeup": { caption: "Market over", played: 4, current: null },
  "popup-submitted": { caption: "Market over", played: 4, current: null },
};

export function marketPositionFor(stage: StageId): MarketPosition {
  return MARKET_POSITIONS[stage] ?? { caption: "Before the market", played: 0, current: null };
}
