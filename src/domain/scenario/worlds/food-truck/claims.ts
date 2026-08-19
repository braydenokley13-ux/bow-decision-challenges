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
 * cushion or the cut, no beat in this world offers a way to put it by, and it does not appear
 * in `ledger.ts` anywhere. That is a statement about how far this beat was built and it is
 * deliberately not phrased as "it cannot be banked": the screens said that to a child for a
 * release, and `savingIsPossible.test.ts` now stops them saying it again.
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
  /** What the card is headed. */
  title: string;
  /**
   * The same claim, as it reads inside a sentence.
   *
   * The card heading and the middle of a sentence want different words, and this world had only
   * the heading — so the evidence a teacher reads said *"the $25 left over could not have
   * covered Your share of the night cleaner and A painted sign for the truck"*. A world-class
   * review found eleven sentences like it. Basketball has carried `inSentence` since it shipped
   * for exactly this; the market was built without it and every observer sentence about a claim
   * has been printing a card heading ever since.
   *
   * Two fields rather than a capitalisation rule, for the reason basketball's own comment
   * gives: the difference is an article and a lower-case letter and no rule gets both right —
   * "A painted sign" wants "the painted sign", and "Your share of the night cleaner" wants "the
   * share of the night cleaner", which is not a case change at all.
   *
   * It is third person because the sentence it lands in is: the evidence trail is a sentence a
   * teacher reads *about* a student. What the student is told back is a different register and
   * lives in `src/domain/recap/popup.ts`.
   */
  inSentence: string;
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
      inSentence: "the cool box seal",
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
      inSentence: "the share of the night cleaner",
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
      inSentence: "the painted sign for the truck",
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
  /**
   * The claim it makes, as a clause the evidence trail can put after "They said" — third
   * person, because the trail is a sentence a teacher reads about a student.
   *
   * These were written in the second person ("you said it was the one you only wanted") and
   * dropped straight into sentences that talk about the student as *they*, at the start of a
   * sentence, after a full stop. So the teacher's page read *"A basis that fits both halves of a
   * choice explains neither of them. you said it was the one you only wanted, which is true of A
   * painted sign for the truck and of nothing they paid for."* — a lower-case sentence start and
   * a person change inside one clause, in the prose a teacher may quote to a parent. What a
   * student is told back is second person and correct, and lives in `src/domain/recap/popup.ts`.
   */
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
    said: "that it was the one they only wanted",
    holdsOf: (claim) => claim.onlyWanted,
  },
  {
    id: "no-one-counting",
    label: "Nobody else was counting on it.",
    said: "that nobody else was counting on it",
    holdsOf: (claim) => !claim.countedOnBySomeone,
  },
  {
    id: "can-wait",
    label: "It can wait, even if it costs more.",
    said: "that it could wait, even at a price",
    holdsOf: (claim) => claim.waitsAtAPrice,
  },
  {
    id: "cheapest",
    label: "It was the cheapest one to drop.",
    said: "that it was the cheapest one to drop",
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
