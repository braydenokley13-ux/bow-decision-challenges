import type { ClaimReasonId } from "../../../core/ids";
import type { Dollars } from "../../../core/money";
import { SCENARIO_NUMBERS } from "../../numbers";
import type { ScenarioNumbers } from "../../types";

/**
 * Week 3. Three things want the same money and the money will not stretch.
 *
 * Avery covers a teammate's shift and is handed cash for it. In the same week the shoes
 * start splitting, the away-game travel share falls due on a trip Avery already told the
 * coach they were making, and a sister has a birthday. The three of them cost more than
 * the cash, and no combination pays for all three.
 *
 * **The money is outside the plan, and that is the design.** It is not income, it does not
 * reach the planning board, it never touches the season ledger, and it cannot be banked.
 * Threading a new pot through the plan would multiply the strategy space `balance.ts`
 * sweeps for a beat whose entire subject is which of three claims matters most — and the
 * sweep exists to prove no strategy dominates, which is a claim about the plan. So the
 * plan is left exactly as it was, and this week asks a different question of the student.
 *
 * **What makes it a decision rather than a sum.** Two allocations spend as far as the
 * money reaches: the shoes on their own, or the trip and the present together. One protects
 * the thing Avery's body needs; the other keeps a promise to somebody else and a promise to
 * a sister. Neither is the answer, and the world never says which it prefers.
 */

export type Week3ClaimId = "team-shoes" | "away-travel" | "sister-present";

export const WEEK3_CLAIM_IDS: readonly Week3ClaimId[] = ["team-shoes", "away-travel", "sister-present"] as const;

/**
 * One claim on the cash, and the three facts about it that are not its price.
 *
 * The three flags are what the reason set is checked against. They are properties of the
 * claim in the fiction — the coach is waiting for an answer about the bus, the shoes get
 * worse and dearer the longer they are left, the present is a thing Avery would like to
 * give and nobody is owed. Nothing here ranks them, and nothing here is scored: what is
 * scored is whether the student's stated reason is true of what they actually left unpaid.
 */
export interface CompetingClaim {
  id: Week3ClaimId;
  /** What the card is headed. */
  title: string;
  cost: Dollars;
  /** What the claim is, in Avery's week. */
  detail: string;
  /** What the verdict at Week 8 is headed, when this one goes unpaid. */
  verdictLabel: string;
  /** What Avery is actually left with when it goes unpaid. Week 8 opens on this sentence. */
  wentUnpaid: string;
  /** Somebody outside Avery is depending on this one. */
  countedOnBySomeone: boolean;
  /** Leaving it costs more later. The other two are simply gone. */
  waitsAtAPrice: boolean;
  /** Avery would like it. Nothing breaks and nobody is owed if it does not happen. */
  onlyWanted: boolean;
}

function costOf(id: Week3ClaimId, n: ScenarioNumbers): Dollars {
  return n.week3.claimCosts[id]!;
}

export function week3Claims(n: ScenarioNumbers = SCENARIO_NUMBERS): readonly CompetingClaim[] {
  return [
    {
      id: "team-shoes",
      title: "Team shoes",
      cost: costOf("team-shoes", n),
      detail: "The pair Avery plays in are splitting along the side. Avery can keep playing in them. It hurts.",
      verdictLabel: "Leaving the shoes splitting",
      wentUnpaid: "Avery taped the shoes twice and played out the season in them.",
      countedOnBySomeone: false,
      waitsAtAPrice: true,
      onlyWanted: false,
    },
    {
      id: "away-travel",
      title: "Away-game travel share",
      cost: costOf("away-travel", n),
      detail: "Everyone on the bus pays their share. Avery already told the coach they were in.",
      verdictLabel: "Missing the away game",
      wentUnpaid: "Avery had told the coach they were on the bus, and was not on it.",
      countedOnBySomeone: true,
      waitsAtAPrice: false,
      onlyWanted: false,
    },
    {
      id: "sister-present",
      title: "A present for Avery's sister",
      cost: costOf("sister-present", n),
      detail: "She turns eleven on Saturday.",
      verdictLabel: "The birthday with nothing to open",
      wentUnpaid: "Avery's sister turned eleven with nothing from Avery to open.",
      countedOnBySomeone: false,
      waitsAtAPrice: false,
      onlyWanted: true,
    },
  ];
}

export function week3Claim(id: Week3ClaimId, n: ScenarioNumbers = SCENARIO_NUMBERS): CompetingClaim {
  return week3Claims(n).find((claim) => claim.id === id)!;
}

export function isWeek3ClaimId(id: string): id is Week3ClaimId {
  return (WEEK3_CLAIM_IDS as readonly string[]).includes(id);
}

/**
 * The four things a student may say made them leave a claim out.
 *
 * A closed set, because the question is a decision and not a piece of writing — the writing
 * happens once, at the end, and adding a second textarea here would lengthen a run that is
 * already too long. Three of the four name what the claim *was* to Avery. The fourth names
 * what it cost, and it is the misconception this competency exists to catch: price is a
 * fact about a claim and it is not a judgement about whether the claim matters.
 *
 * They are deliberately close to the same length. An option that is visibly longer or
 * shorter than its neighbours is answerable without reading any of them.
 */
export interface ClaimReason {
  id: ClaimReasonId;
  /** What the student taps, in their own register. */
  label: string;
  /** The claim it makes, restated in the third person for the evidence trail. */
  said: string;
  /** The same claim, said back to the student at Week 8. Short: the ending has a budget. */
  toldBack: string;
  /**
   * Whether this reason is true of a given claim.
   *
   * `null` for the price reason: it makes no claim about what the thing was, so there is
   * nothing about it that can be true or false. That is exactly why it scores where it does.
   */
  holdsOf: ((claim: CompetingClaim) => boolean) | null;
}

export const CLAIM_REASONS: readonly ClaimReason[] = [
  {
    id: "only-wanted",
    toldBack: "You said you only wanted it.",
    label: "It was the one I only wanted.",
    said: "you said it was the one you only wanted",
    holdsOf: (claim) => claim.onlyWanted,
  },
  {
    id: "no-one-counting",
    toldBack: "You said nobody was counting on it.",
    label: "Nobody else was counting on it.",
    said: "you said nobody else was counting on it",
    holdsOf: (claim) => !claim.countedOnBySomeone,
  },
  {
    id: "can-wait",
    toldBack: "You said it could wait.",
    label: "It can wait, even if it costs more.",
    said: "you said it could wait, even at a price",
    holdsOf: (claim) => claim.waitsAtAPrice,
  },
  {
    id: "cheapest",
    toldBack: "You said it was the cheapest to drop.",
    label: "It was the cheapest one to drop.",
    said: "you said it was the cheapest one to drop",
    holdsOf: null,
  },
] as const;

export function claimReason(id: ClaimReasonId): ClaimReason {
  return CLAIM_REASONS.find((reason) => reason.id === id)!;
}

export function isClaimReasonId(id: string): id is ClaimReasonId {
  return CLAIM_REASONS.some((reason) => reason.id === id);
}

/** What a set of funded claims costs. */
export function costOfClaims(ids: readonly string[], n: ScenarioNumbers = SCENARIO_NUMBERS): number {
  return ids.reduce((total, id) => total + (n.week3.claimCosts[id] ?? 0), 0);
}

/** Whether this set of claims can be paid for out of the cash at all. */
export function isAffordable(ids: readonly string[], n: ScenarioNumbers = SCENARIO_NUMBERS): boolean {
  return costOfClaims(ids, n) <= n.week3.cash;
}

/**
 * Whether the cash has been spent as far as it reaches.
 *
 * True when nothing left unpaid could still have been paid for out of what is left over.
 * It is arithmetic rather than a preference: two different sets satisfy it and they express
 * opposite priorities, so nothing here makes one allocation the right one. What it does
 * catch is money left doing nothing in a week where it can do nothing else — this cash
 * never reaches the plan, so a dollar not spent on one of these three is a dollar spent on
 * nothing at all, and the screen says so before the student decides.
 */
export function reachesAsFarAsItGoes(ids: readonly string[], n: ScenarioNumbers = SCENARIO_NUMBERS): boolean {
  const left = n.week3.cash - costOfClaims(ids, n);
  return week3Claims(n)
    .filter((claim) => !ids.includes(claim.id))
    .every((claim) => claim.cost > left);
}
