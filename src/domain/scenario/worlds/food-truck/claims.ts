import type { ClaimReasonId } from "../../../core/ids";
import { formatDollars, type Dollars } from "../../../core/money";
import { POP_UP_NUMBERS } from "./numbers";
import type { PopUpNumbers, TipClaimId } from "./types";

/**
 * The tips jar after the first Saturday, and three things that want it.
 *
 * Mo empties the jar on the way home from the first market. It is his — the organiser
 * settles the takings at the end of the run and this is not part of that — and three things
 * want it before the second Saturday. Together they cost more than is in it, and no
 * combination pays for all three.
 *
 * **The money is outside the plan, and that is the design.** It never reaches stock, the
 * cushion or the cut, it cannot be banked, and it does not appear in `ledger.ts` anywhere.
 * That is the same decision Basketball made about Avery's Week 3 cash and it is made here
 * for the same reason: `balance.ts` sweeps the strategy space to prove no plan dominates,
 * and threading a fourth pot through the three lines would multiply that space for a beat
 * whose entire subject is which of three claims matters most. The plan is left exactly as it
 * was, and this beat asks a different question.
 *
 * **What makes it a decision rather than a sum.** Two ways of spending it reach as far as
 * the money goes: the cool box seal on its own, or the cleaner's share and the sign
 * together. One protects the food; the other keeps a promise Mo already made to the other
 * stallholders and puts the truck's name on the truck. Neither is the answer, and nothing in
 * this world says which it prefers.
 *
 * **Why the same event as the other world.** `COMPETING_CLAIMS_SETTLED` and the four
 * `ClaimReasonId`s live in the shared layer on purpose: a student who ran the market and a
 * student who ran the season produce evidence about `sort-by-need-want-goal` that pools.
 * What is *not* shared is a line of fiction — the labels below are the market's own, and
 * nothing in this file imports the other world.
 */

export const TIP_CLAIM_IDS: readonly TipClaimId[] = ["cool-box", "cleaner-share", "truck-sign"] as const;

/**
 * One claim on the tips, and the three facts about it that are not its price.
 *
 * The three flags are what the reason set is checked against. They are properties of the
 * claim in the fiction — the other stallholders are waiting on Mo's share, the seal gets
 * worse and dearer the longer it is left, the sign is a thing Mo would like and nobody is
 * owed. Nothing here ranks them and nothing here is scored: what is scored is whether the
 * reason a student gave is true of what they actually left unpaid.
 */
export interface TipClaim {
  id: TipClaimId;
  title: string;
  cost: Dollars;
  /** What the claim is, in Mo's week. */
  detail: string;
  /** What the settle-up says Mo was left with, when this one goes unpaid. */
  wentUnpaid: string;
  /** Somebody outside the truck is depending on this one. */
  countedOnBySomeone: boolean;
  /** Leaving it costs more later. The other two are simply gone. */
  waitsAtAPrice: boolean;
  /** Mo would like it. Nothing breaks and nobody is owed if it does not happen. */
  onlyWanted: boolean;
}

function costOf(id: TipClaimId, n: PopUpNumbers): Dollars {
  return n.tips.claimCosts[id];
}

export function tipClaims(n: PopUpNumbers = POP_UP_NUMBERS): readonly TipClaim[] {
  return [
    {
      id: "cool-box",
      title: "A seal for the cool box",
      cost: costOf("cool-box", n),
      detail: "The rubber round the lid has perished. The box still holds cold for a night. It holds less every week.",
      wentUnpaid: "The cool box seal was never replaced, and it got worse every Saturday.",
      countedOnBySomeone: false,
      waitsAtAPrice: true,
      onlyWanted: false,
    },
    {
      id: "cleaner-share",
      title: "Your share of the night cleaner",
      cost: costOf("cleaner-share", n),
      detail: "Every stall on the row chips in for the man who sweeps the lane at midnight. You already said you were in.",
      wentUnpaid: "The other stalls covered the cleaner between them, and they knew whose share was missing.",
      countedOnBySomeone: true,
      waitsAtAPrice: false,
      onlyWanted: false,
    },
    {
      id: "truck-sign",
      title: "A painted sign for the truck",
      cost: costOf("truck-sign", n),
      detail: "Salt and Smoke, in proper letters, instead of the chalkboard leaning against the wheel.",
      wentUnpaid: "The truck went the whole run with a chalkboard leaning against the wheel.",
      countedOnBySomeone: false,
      waitsAtAPrice: false,
      onlyWanted: true,
    },
  ];
}

export function tipClaim(id: TipClaimId, n: PopUpNumbers = POP_UP_NUMBERS): TipClaim {
  return tipClaims(n).find((claim) => claim.id === id)!;
}

export function isTipClaimId(id: string): id is TipClaimId {
  return (TIP_CLAIM_IDS as readonly string[]).includes(id);
}

/**
 * The four things a student may say made them leave a claim out.
 *
 * The ids are the shared ones, so a market answer and a season answer are the same answer.
 * The words are the market's, because a student is answering about a cool box and not about
 * a pair of basketball shoes. Three of the four name what the claim *was* to Mo. The fourth
 * names what it cost, and it is the misconception this competency exists to catch: price is
 * a fact about a claim and it is not a judgement about whether the claim matters.
 *
 * Deliberately close to the same length. An option visibly longer or shorter than its
 * neighbours is answerable without reading any of them.
 */
export interface TipClaimReason {
  id: ClaimReasonId;
  /** What the student taps, in their own register. */
  label: string;
  /** The claim it makes, restated for the evidence trail. */
  said: string;
  /**
   * Whether this reason is true of a given claim.
   *
   * `null` for the price reason: it makes no claim about what the thing was, so there is
   * nothing about it that can be true or false. That is exactly why it scores where it does.
   */
  holdsOf: ((claim: TipClaim) => boolean) | null;
}

export const TIP_CLAIM_REASONS: readonly TipClaimReason[] = [
  {
    id: "only-wanted",
    label: "It was the one I only wanted.",
    said: "you said it was the one you only wanted",
    holdsOf: (claim) => claim.onlyWanted,
  },
  {
    id: "no-one-counting",
    label: "Nobody else was counting on it.",
    said: "you said nobody else was counting on it",
    holdsOf: (claim) => !claim.countedOnBySomeone,
  },
  {
    id: "can-wait",
    label: "It can wait, even if it costs more.",
    said: "you said it could wait, even at a price",
    holdsOf: (claim) => claim.waitsAtAPrice,
  },
  {
    id: "cheapest",
    label: "It was the cheapest one to drop.",
    said: "you said it was the cheapest one to drop",
    holdsOf: null,
  },
] as const;

export function tipClaimReason(id: ClaimReasonId): TipClaimReason {
  return TIP_CLAIM_REASONS.find((reason) => reason.id === id)!;
}

export function isTipClaimReasonId(id: string): id is ClaimReasonId {
  return TIP_CLAIM_REASONS.some((reason) => reason.id === id);
}

/** What a set of funded claims costs. */
export function costOfTipClaims(ids: readonly string[], n: PopUpNumbers = POP_UP_NUMBERS): number {
  return ids.reduce((total, id) => total + (isTipClaimId(id) ? n.tips.claimCosts[id] : 0), 0);
}

export function tipsAffordable(ids: readonly string[], n: PopUpNumbers = POP_UP_NUMBERS): boolean {
  return costOfTipClaims(ids, n) <= n.tips.cash;
}

/**
 * Whether the jar has been spent as far as it reaches.
 *
 * True when nothing left unpaid could still have been paid for out of what is left over. It
 * is arithmetic rather than a preference: two different sets satisfy it and they express
 * opposite priorities, so nothing here makes one allocation the right one. What it catches is
 * money left doing nothing in a week where it can do nothing else — the jar never reaches the
 * three lines, so a dollar not spent on one of these three is a dollar spent on nothing at
 * all, and the screen says so before the student decides.
 */
export function tipsReachAsFarAsTheyGo(ids: readonly string[], n: PopUpNumbers = POP_UP_NUMBERS): boolean {
  const left = n.tips.cash - costOfTipClaims(ids, n);
  return tipClaims(n).filter((claim) => !ids.includes(claim.id)).every((claim) => claim.cost > left);
}

/** The jar and what is left of it, for a screen that has to say both before the taps. */
export function tipsReadout(ids: readonly string[], n: PopUpNumbers = POP_UP_NUMBERS): { spent: string; left: string } {
  const spent = costOfTipClaims(ids, n);
  return { spent: formatDollars(spent), left: formatDollars(Math.max(0, n.tips.cash - spent)) };
}
