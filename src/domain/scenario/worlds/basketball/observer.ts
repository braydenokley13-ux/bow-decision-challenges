import type { StructuredMicroSkillId } from "../../../blueprint/types";
import type {
  CompetencyId,
  EvidenceKind,
  EvidenceRequirementId,
  EvidenceRequirementObservation,
  RubricLevel,
  SupportLevel,
} from "../../../competency/types";
import { evidenceRequirementById } from "../../../competency/competencies";
import type { CategoryId } from "../../../core/ids";
import { dollars, formatDollars } from "../../../core/money";
import { deriveFacts } from "../../../evidence/facts";
import { observeStructured } from "../../../evidence/observe";
import { readPlannedSavings, type SavingsOrigin, type SavingsVerdictId } from "../../../evidence/plannedSavings";
import type { CompetingClaimsSettlement, EvidenceEvent, MicroSkillObservation, PlanAmountSources, RemainderChoice } from "../../../evidence/types";
import { SCENARIO_NUMBERS } from "../../numbers";
import type { ScenarioNumbers } from "../../types";
import { claimReason, isClaimReasonId, reachesAsFarAsItGoes, week3Claims, type CompetingClaim } from "./claims";

/**
 * Basketball, speaking competencies.
 *
 * Plan Under Pressure already observes eighteen micro-skills from Avery's event log, and
 * that scorer is not touched here — this file is a layer on top of it. It restates what
 * those observations mean in the product's shared vocabulary, so that a second world
 * assessing the same competency produces evidence that pools with this one's.
 *
 * The direction of the dependency is the whole point. This world knows about evidence
 * requirements. The competency layer does not know this world exists, the shared engine
 * takes no world id, and neither of them knows that some state numbers one of these
 * objectives — that join lives in `src/domain/standards/` and nowhere near here.
 *
 * **What this file may not do.** It may not invent an observation about a moment that has
 * already happened. Every level below comes from a micro-skill Plan Under Pressure already
 * scores, from a person who read the student's writing, or — in exactly one case — from a
 * board action that did not exist before and therefore appears in no saved attempt.
 *
 * That one case is `plan-within-income.er3`, and the distinction matters. Re-reading an old
 * log through a new rule would change what a finished attempt means. Reading a new action
 * cannot: a log written before the action existed contains none of it and scores `null`,
 * which is what "the world never presented the opportunity" has always meant here. And the
 * action moves the same money the steppers move, so it adds no plan to the strategy space
 * and takes none away — which is why `balance.ts` sweeps the same board it swept before.
 */

/** How one evidence requirement gets produced in this world, or why it does not. */
export type BasketballRouteVia =
  | {
      /** Every listed micro-skill has to hold. The requirement is their conjunction. */
      via: "micro-skills";
      microSkillIds: readonly StructuredMicroSkillId[];
    }
  | {
      /** The student writes it; a person scores it. BOW never grades student writing. */
      via: "written-defense";
    }
  | {
      /**
       * Read off where the savings row's figure came from, and off nothing else.
       *
       * Never from how much that row holds — a student who plans $0 toward the course this
       * season has still planned it — and never from the order three steppers were touched
       * in, which this product records nowhere and could not read if it did.
       */
      via: "savings-figure";
    }
  | {
      /**
       * Read off the one week where three claims wanted the same money.
       *
       * `reads` names which of the settlement's three separable facts this requirement is
       * judged from, because one action carries three of them and a route that did not say
       * which would be three rows standing on the same sentence.
       */
      via: "competing-claims";
      reads: "reach" | "kind-of-reason" | "reason-holds";
    }
  | {
      /** Examined and declined. `note` says what stops it. */
      via: "not-produced";
    };

export type BasketballEvidenceRoute = BasketballRouteVia & {
  evidenceRequirementId: EvidenceRequirementId;
  /** The sentence that goes in the evidence trail, or the reason there is nothing to put there. */
  note: string;
};

/**
 * Every evidence requirement of every competency Basketball was examined against.
 *
 * The table lists the requirements it cannot produce as well as the ones it can, and that
 * is the more useful half. A missing row is an oversight; a `not-produced` row is a finding
 * about the world, written down where the next world's designer will read it.
 * `coverage.test.ts` fails the build if a competency named here has a requirement the table
 * does not account for, so the list cannot quietly go out of date.
 */
export const BASKETBALL_EVIDENCE_ROUTES: readonly BasketballEvidenceRoute[] = [
  // ── plan-within-income — all five ──────────────────────────────────────────────────
  {
    evidenceRequirementId: "plan-within-income.er1",
    via: "micro-skills",
    microSkillIds: ["C1.1", "C1.2"],
    note: "Totalling the money that actually arrives, and keeping the two bonuses out of it unless they are treated as removable.",
  },
  {
    evidenceRequirementId: "plan-within-income.er2",
    via: "micro-skills",
    microSkillIds: ["C3.1"],
    note: "Carrying the place and the eight weeks of essentials into the plan once each, at what they cost.",
  },
  {
    evidenceRequirementId: "plan-within-income.er3",
    via: "savings-figure",
    note: "Where the figure on the course line came from when the opening plan was closed. The course is what Avery is saving into, so a student who let that row take whatever the other two left has let the arithmetic set their savings, and a student who set the figure themselves and let another row absorb the rest has planned it.",
  },
  {
    evidenceRequirementId: "plan-within-income.er4",
    via: "micro-skills",
    microSkillIds: ["C3.2", "C3.3"],
    note: "The saved plan spends no more than Avery has and leaves no dollar without a job.",
  },
  {
    evidenceRequirementId: "plan-within-income.er5",
    via: "written-defense",
    note: "Avery's defense is where the student names what they gave up and what they gave it up for.",
  },

  // ── sort-by-need-want-goal — all four, from Week 3 and the defense ───────────
  // This world could not produce any of these until it had a moment where more than one
  // person wanted the same money at once. Every board before Week 3 divides money the
  // student controls into rows the plan names; nothing on any of them is a claim somebody
  // else is making. The four below read one settlement and one paragraph, and none of them
  // reads how much any claim cost — which is what keeps the two allocations that spend the
  // money as far as it goes worth the same, and stops this competency quietly deciding that
  // shoes matter more than a promise or the other way round.
  {
    evidenceRequirementId: "sort-by-need-want-goal.er1",
    via: "competing-claims",
    reads: "reach",
    note: "Making one week's cash reach as far as it can across three claims that together cost more than it — committing no more than there is, and leaving nothing behind that one of the unpaid claims could still have taken.",
  },
  {
    evidenceRequirementId: "sort-by-need-want-goal.er2",
    via: "competing-claims",
    reads: "kind-of-reason",
    note: "Saying what the unpaid claim was to Avery rather than what it cost. Price is a fact about a claim and it is not a judgement about whether the claim matters, and this row is where the difference between the two shows.",
  },
  {
    evidenceRequirementId: "sort-by-need-want-goal.er3",
    via: "competing-claims",
    reads: "reason-holds",
    note: "Whether the reason the student gave is actually true of what they left unpaid, and not equally true of what they paid for. A basis that fits both halves of a choice explains neither of them.",
  },
  {
    evidenceRequirementId: "sort-by-need-want-goal.er4",
    via: "written-defense",
    note: "Avery's defense is where the student says what made one claim matter more than another — something needed, a promise to somebody, or something they were saving toward.",
  },

  // ── adapt-a-plan — all five ────────────────────────────────────────────────────────
  {
    evidenceRequirementId: "adapt-a-plan.er1",
    via: "micro-skills",
    microSkillIds: ["C5.1", "C5.3"],
    note: "Totalling what Week 5 took away and what it newly requires, with every component of the change counted.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er2",
    via: "micro-skills",
    microSkillIds: ["C5.2"],
    note: "Repairing out of the amounts that can still move, without reaching for money already committed.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er3",
    via: "micro-skills",
    microSkillIds: ["C5.6"],
    note: "Freeing as much as the shortfall needed at the first response, measured against the most that could have been freed.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er4",
    via: "micro-skills",
    microSkillIds: ["C5.4"],
    note: "Finishing on a plan that balances, or carrying a known uncovered amount forward on purpose.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er5",
    via: "written-defense",
    note: "Avery's defense is where the student names what they refused to cut and why.",
  },

  // ── save-toward-a-goal — examined twice, and none of it survives ───────────────────
  // The course is a savings goal and Avery is plainly saving toward it, which is why this
  // competency was examined at all. Every requirement still fails for the same underlying
  // reason: in this world the target, its deadline and whether it survives are the
  // student's *strategy*, and `balance.ts` exists to keep every strategy defensible. An
  // observation here would turn one of them into the right answer.
  //
  // Re-examined requirement by requirement when the remainder declaration was added, since
  // that control is the first thing this world records about the course line on purpose. It
  // reaches none of these five: it says which row absorbs what is left, which is a fact
  // about how the plan was closed, and says nothing about an amount, a date, a per-week
  // figure, or what happened to the course when Week 5 came for the money.
  {
    evidenceRequirementId: "save-toward-a-goal.er1",
    via: "not-produced",
    note: "The world sets the target and the date — the course costs what it costs and the season ends when it ends. Naming an amount and a deadline is not something this student does, and naming the row that takes the leftovers is not naming a target.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er2",
    via: "not-produced",
    note: "Avery plans one eight-week block, not a per-period contribution, so there is no weekly figure for the student to work out or miss.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er3",
    via: "not-produced",
    note: "Week 5 does put the course under pressure, but this world scores absorbing the shortfall without regard to which line paid for it — deliberately, and `neutrality.test.ts` holds it there. Scoring the course line's survival would reward one priority over the others. The remainder declaration does not reach this either: it is offered while a plan is being built, never while one is being cut, so nothing records a choice made under competition.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er4",
    via: "not-produced",
    note: "Week 8 shows the student whether the course was funded; it never asks them to state the gap. Only the 'ends on target' half of the rule is visible here, and crediting that half alone rewards the student who prioritised the course.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er5",
    via: "not-produced",
    note: "The defense asks what Avery's plan gives up and why it works, not what the saving was for. Adding the prompt is a content change to the world, not a mapping.",
  },
] as const;

/**
 * Competencies Basketball produces evidence about that cannot be recorded yet.
 *
 * `plan-for-the-unexpected` is the one. Building a lower-resource version of a plan before
 * knowing what will go wrong, then meeting something that goes wrong, is exactly what C4.1
 * to C4.4 observe, and the product definition says as much. There is nothing to map it onto:
 * that competency's evidence requirements are an empty array, because writing them is
 * content work owned by a person and an invented requirement becomes a rubric row, a
 * reteach card and a claim about a student.
 *
 * So the route is named here instead of guessed, and `coverage.test.ts` fails the moment
 * somebody writes those requirements — which is exactly when this file needs changing.
 */
export const AWAITING_EVIDENCE_REQUIREMENTS: readonly CompetencyId[] = ["plan-for-the-unexpected"];

/** The micro-skills that would carry it, for whoever writes those requirements. */
export const CONTINGENCY_MICRO_SKILLS: readonly StructuredMicroSkillId[] = ["C4.1", "C4.2", "C4.3", "C4.4"];

/** A person's judgement of the writing, keyed by requirement. Never machine-derived (§10.6). */
export type ScoredExplanations = Partial<Record<EvidenceRequirementId, RubricLevel>>;

export interface BasketballObserverInput {
  /** Plan Under Pressure's own output, unmodified. */
  observations: readonly MicroSkillObservation[];
  defense: {
    submitted: boolean;
    /** The `DEFENSE_SUBMITTED` event ids, so the trail points at the writing itself. */
    evidenceRefs: readonly string[];
  };
  /**
   * The opening plan as it was saved: where each row's figure came from, what the savings
   * row finished at, and the events to point a teacher at. Absent means no opening plan was
   * ever saved, which is `null` evidence and not a low score.
   */
  openingPlan?: OpeningPlan;
  /**
   * Every row the student named as taking the leftovers while building the opening plan,
   * in the order they named them. Read only for an attempt saved before the board recorded
   * provenance; a run recorded today is judged from `openingPlan.sources`.
   */
  openingRemainder?: readonly RemainderChoice[];
  /**
   * How Week 3's three claims were settled, if the student got that far.
   *
   * Absent means the run never reached the week, which is `null` evidence on all three of
   * the decision requirements it carries and is not a low score on any of them. An attempt
   * saved before this week existed contains no such event and reads exactly the same way.
   */
  competingClaims?: SettledClaims;
  scoredExplanations?: ScoredExplanations;
}

/**
 * The opening plan, as much of it as this requirement is allowed to see.
 *
 * `savingsAmount` is read for two things and neither of them is how much was saved: whether
 * the row finished at $0 in a log that carries no provenance, and — the comparison
 * `plannedSavings.ts` turns on — whether a row that took the last of the money was already
 * holding a figure before it did. Both are about where a figure came from rather than about
 * its size, and `neutrality.test.ts` is what keeps it that way.
 */
export interface OpeningPlan {
  sources?: PlanAmountSources;
  savingsAmount: number;
  supportLevel: SupportLevel;
  evidenceRefs: readonly string[];
}

/** One settlement, with the event it came from. */
export interface SettledClaims {
  settlement: CompetingClaimsSettlement;
  evidenceRef: string;
  supportLevel: SupportLevel;
}

/**
 * The row Avery is saving into.
 *
 * The course is the only thing in this world that money is being put aside *for* — it is the
 * want the offer screen names, it has a price and a deadline, and it is the line the student
 * is asked to fund. The backup money is a buffer against a season going wrong and Avery's
 * week is what gets spent now, so neither is the savings line ER3 is about.
 */
const SAVINGS_ROW: CategoryId = "goal";

/**
 * `plan-within-income.er3` — savings as a planned amount, in Avery's nouns.
 *
 * The rule itself is `evidence/plannedSavings.ts`, shared with the market so that identical
 * behaviour cannot be *Showed it* in one story and *Not yet* in the other — which is exactly
 * what it was: a student who set the two discretionary rows and let the savings row have what
 * was left scored **5** here and **0** at the market, in the same class, pooled into one
 * percentage. `worldJudgementParity.test.ts` is what now holds the two together.
 *
 * **This file used to read the provenance of the savings row and nothing else, and that
 * inverted the judgement in both directions.** An assessment-validity review reproduced both
 * on rendered pages:
 *
 * - Filling the two discretionary rows to the figures you want and typing the arithmetic
 *   leftover into the course line — the misconception, in the order the rule names — scored
 *   **5**, under a sentence saying *"another row took the last of the money"* about a run in
 *   which no row did.
 * - Typing $1,000 into the course line first and then choosing to send the last $100 there as
 *   well scored **0** and put that child in the reteach group for *"Savings is leftover
 *   money"* — the one misconception she had demonstrably not got.
 *
 * What the world reads now is two facts about the saved plan: which row the student said
 * takes the last of the money, and what the savings row was already holding when it did.
 * Where nobody said — a board typed to balance, where one of three rows is always the
 * residual of the other two — this world says `null` and says why. That is not a zero, and
 * the sentence beside it is the one a teacher can act on: go and ask them.
 */
function savingsObservation(
  route: BasketballEvidenceRoute,
  kind: EvidenceKind,
  opening: OpeningPlan | undefined,
  choices: readonly RemainderChoice[],
): EvidenceRequirementObservation {
  const said = (level: RubricLevel | null, supportLevel: SupportLevel, evidenceRefs: readonly string[], detail: string) => ({
    evidenceRequirementId: route.evidenceRequirementId,
    kind,
    level,
    supportLevel,
    evidenceRefs: evidenceRefs.length > 0 ? [...evidenceRefs] : ["not-observed:plan-savings"],
    reason: `${route.note} ${detail}`,
  });
  if (!opening) {
    return said(null, "standard_access", [], "The opening plan was never saved, so this world saw neither answer.");
  }
  const closings = choices.filter((choice) => choice.remaining === 0);
  const closed = closings.at(-1);
  const origin = savingsOrigin(opening);
  const read = readPlannedSavings({
    closings: closings.map((choice) => ({ toSavings: choice.category === SAVINGS_ROW, amount: Number(choice.amount) })),
    savingsHeld: opening.savingsAmount,
    ...(origin ? { origin } : {}),
  });
  const refs = [...opening.evidenceRefs, ...choices.map((choice) => choice.evidenceRef)];
  const held = opening.savingsAmount - Number(closed?.amount ?? 0);
  const detail: Record<SavingsVerdictId, string> = {
    // Said as a fact about the screen and a silence in the run, never as a choice and never
    // as a failure to make one. The student's own read-back of their run says the same thing
    // in the same shape — *the screen opened that way, you carried on, and this run cannot
    // tell whether that was the call you meant to make* — and the two surfaces agree exactly
    // as long as neither of them claims the student decided. "Go and ask them" is the move
    // this sentence is for.
    "never-opened": "The course line was at $0 when the screen opened and nothing was ever put into it or said about it, so this run cannot tell whether saving nothing toward the course was the call the student meant to make.",
    supplied: "The figure on the course line is one BOW put there and the student did not change it, so this run cannot tell whether they can set one themselves.",
    "no-statement": choices.length === 0
      ? "Every row was given a figure and the plan was typed until it balanced, so no row was ever named as taking the last of the money — and one of three rows always holds what the other two left. This run cannot tell whether the course figure was the amount the student meant to save or what the other two rows left."
      : "The student used the control to place a figure but finished the plan another way, so no row was ever named as taking the last of the money, and this run cannot tell whether the course figure was the amount the student meant to save or what the other two rows left.",
    leftovers: "The course line took what the other rows left over, so the amount saved is what the arithmetic came to rather than a figure the student set.",
    "topped-up": `The course line was already holding ${formatDollars(dollars(held))} when the student sent the last ${formatDollars(dollars(Number(closed?.amount ?? 0)))} to it as well, so the savings figure was one they set and then added to rather than what the arithmetic left.`,
    "set-and-closed-elsewhere": "The course line held a figure the student set, and another row took the last of the money.",
    "took-it-back": "The leftovers landed on the course line first and the student took them back off it and closed somewhere else, with nothing on screen but the board.",
  };
  return said(read.level, opening.supportLevel, refs, detail[read.verdict]);
}

/**
 * Where the savings figure came from, including on a log written before the board kept it.
 *
 * An attempt saved before the record exists carries no provenance at all, and it is not left
 * unreadable: in that era the only two ways money reached a row were the steppers and a
 * declaration, and the declarations are in the log. So a row holding something with no
 * declaration behind it is a figure the student typed, and a row at $0 is the ambiguity the
 * record was added to settle — *deliberately nothing* and *never opened* look identical, and
 * claiming the good half of it is how three students who never opened that row came to be
 * reported as having planned their savings. Those runs read `null`, which is the honest thing
 * a log that cannot say should produce.
 */
function savingsOrigin(opening: OpeningPlan): SavingsOrigin | undefined {
  if (opening.sources) {
    const provenance = opening.sources[SAVINGS_ROW];
    return provenance ? { source: provenance.source, revised: provenance.revised } : undefined;
  }
  return opening.savingsAmount === 0 ? undefined : { source: "typed", revised: false };
}

/** What a conjunction of micro-skills came to, and which one decided it. */
interface Combined {
  level: RubricLevel | null;
  supportLevel: SupportLevel;
  evidenceRefs: readonly string[];
  detail: string;
}

/** The part of a conjunction that settles it, and what it settles it at. */
interface Decision {
  level: RubricLevel | null;
  part: MicroSkillObservation | undefined;
}

/**
 * Which micro-skill decides a requirement built from several.
 *
 * A requirement built from two micro-skills is a conjunction — "totals the money available
 * **and** does not count conditional money as guaranteed" — so the weaker half decides it.
 * The order of the three rules is what keeps `null` out of the scoring:
 *
 * 1. An observed **0** wins. A student who got the reachable part plainly wrong has failed
 *    the conjunction, and hiding that behind "not observed" would lose real evidence of a
 *    real gap.
 * 2. Otherwise a missing half makes the whole thing **not observed**. Half of a conjunction
 *    is not a judgement about the conjunction, and it must never be scored as a low one.
 * 3. Otherwise the lowest level stands, carrying its own support with it — a part that
 *    needed a hint is already capped at 3, and the requirement inherits that.
 */
function decide(parts: readonly (MicroSkillObservation | undefined)[]): Decision {
  const failed = parts.find((part) => part?.points === 0);
  if (failed) return { level: 0, part: failed };
  // `findIndex`, not `find`: a micro-skill missing from the map is itself `undefined`, and
  // `find` cannot tell that apart from having found nothing.
  const gap = parts.findIndex((part) => part === undefined || part.points === null);
  if (gap !== -1) return { level: null, part: parts[gap] };
  const weakest = parts.reduce<MicroSkillObservation | undefined>(
    (lowest, part) => (part !== undefined && (lowest === undefined || (part.points ?? 5) < (lowest.points ?? 5)) ? part : lowest),
    undefined,
  );
  return { level: weakest?.points ?? null, part: weakest };
}

/**
 * A conjunction, as one level and one sentence a teacher can act on.
 *
 * The level is `decide`'s. The sentence used to be `decide`'s too — the deciding half's
 * reason and nothing else — and on a requirement that held in both halves that reported one
 * of the two things the student did. An assessment review read the strongest run in a class
 * and found the trail for *"Knows what money is actually available"* — the row whose rule is
 * about conditional money — saying only *"The calculation reconciled with the scenario terms
 * at the first attempt."* The conceptual half was the reason the row was met and it was
 * invisible.
 *
 * So when every half held, every half's sentence goes in the trail. The market's `conjoin`
 * has always done this and said why; this is the same rule, in the world that did not.
 * Where a half failed or was never reached, the deciding half still speaks alone: that one
 * is the whole of the judgement, and padding it with the halves that were fine would bury
 * what a teacher is being told to look at.
 */
function combine(
  microSkillIds: readonly StructuredMicroSkillId[],
  byId: ReadonlyMap<StructuredMicroSkillId, MicroSkillObservation>,
): Combined {
  const parts = microSkillIds.map((id) => byId.get(id));
  const evidenceRefs = [...new Set(parts.flatMap((part) => part?.evidenceRefs ?? []))];
  const decision = decide(parts);
  const held = parts.every((part) => part !== undefined && part.points !== null && part.points > 0);
  return {
    level: decision.level,
    supportLevel: decision.part?.supportLevel ?? "standard_access",
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : microSkillIds.map((id) => `not-observed:${id}`),
    detail: held
      ? parts.map((part) => part!.reason).join(" ")
      : decision.part?.reason ?? "This part of the run was not reached.",
  };
}

/**
 * Week 3, read three ways.
 *
 * One action, three separable facts, and they are kept separate because they fail
 * independently and mean different things to the person who has to do something about it.
 *
 * **What none of these read is how much a claim cost.** The world puts three claims in
 * front of the student that cost more together than the money will cover, and two of the
 * ways to spend it reach as far as the money goes: the shoes on their own, or the trip and
 * the present together. One protects what Avery's body needs, the other keeps a promise to
 * a coach and a promise to a sister, and this file has no opinion about which is better. An
 * observer that scored *which* claims survived would be scoring a set of values, and the
 * whole reason `balance.ts` sweeps this world is to keep it from doing that anywhere.
 */
function claimsObservation(
  route: BasketballEvidenceRoute & { via: "competing-claims" },
  kind: EvidenceKind,
  settled: SettledClaims | undefined,
): EvidenceRequirementObservation {
  if (!settled) {
    return {
      evidenceRequirementId: route.evidenceRequirementId,
      kind,
      level: null,
      supportLevel: "standard_access",
      evidenceRefs: ["not-observed:competing-claims"],
      reason: `${route.note} The run never reached the week where the three claims arrive, so this world saw neither answer.`,
    };
  }
  const { settlement, evidenceRef, supportLevel } = settled;
  const claims = week3Claims();
  // The mid-sentence form, not the card heading. "$105 went on A present for Avery's sister"
  // reads as a typo, and every sentence below puts a claim inside one.
  const named = (ids: readonly string[]) => {
    const titles = claims.filter((claim) => ids.includes(claim.id)).map((claim) => claim.inSentence);
    if (titles.length <= 1) return titles[0] ?? "";
    return `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
  };
  const built = read(route.reads, settlement, claims, named);
  return {
    evidenceRequirementId: route.evidenceRequirementId,
    kind,
    level: built.level,
    supportLevel,
    evidenceRefs: [evidenceRef],
    reason: `${route.note} ${built.detail}`,
  };
}

/** What one of the three facts came to, and the sentence that says why. */
interface ClaimsRead {
  level: RubricLevel;
  detail: string;
}

function read(
  reads: "reach" | "kind-of-reason" | "reason-holds",
  settlement: CompetingClaimsSettlement,
  claims: readonly CompetingClaim[],
  named: (ids: readonly string[]) => string,
): ClaimsRead {
  if (reads === "reach") return reachRead(settlement, named);
  const reason = isClaimReasonId(settlement.reason) ? claimReason(settlement.reason) : undefined;
  if (!reason) {
    return {
      level: 0,
      detail: "The settlement carries a reason this world does not offer, so nothing about it can be read either way.",
    };
  }
  return reads === "kind-of-reason" ? kindRead(reason.holdsOf !== null, reason.label) : holdsRead(settlement, claims, reason.holdsOf, reason.said, named);
}

/**
 * `er1` — how far the money was made to reach.
 *
 * Arithmetic, and neutral by construction: more than one allocation satisfies it and it is
 * indifferent between them. The cash never enters the plan — the screen says so before the
 * student decides — so a dollar not spent on one of these three does nothing for any of
 * them this week, which is why leaving a claim affordable and unpaid is a real gap rather
 * than a preference.
 *
 * This note used to end *"and cannot be banked"*, and the level-0 sentence below said the
 * money *"could not be saved"*. Neither is true of cash in a person's hand, and stating it
 * as the ground for a zero is the worst place in the product to state it: an economics
 * review found the same claim on the screens, and a teacher defending this mark to a parent
 * would have been quoting it. The reach rule itself has not changed — what changed is that
 * the sentence now says what the money failed to do rather than what the world forbade it
 * to be. `claims.ts` carries why the beat is walled off from the plan at all.
 */
function reachRead(settlement: CompetingClaimsSettlement, named: (ids: readonly string[]) => string): ClaimsRead {
  const cash = formatDollars(settlement.cash);
  const spent = formatDollars(settlement.spent);
  const left = formatDollars(settlement.leftOver);
  if (settlement.spent > settlement.cash) {
    return { level: 0, detail: `The claims taken on came to ${spent} against ${cash} in hand, which is more money than the week had in it.` };
  }
  if (settlement.fundedIds.length === 0) {
    return { level: 0, detail: `Nothing on the list was paid for, so none of the ${cash} did anything for the three claims in front of it.` };
  }
  if (reachesAsFarAsItGoes(settlement.fundedIds)) {
    return { level: 5, detail: `${spent} of the ${cash} went on ${named(settlement.fundedIds)}, and the ${left} left over could not have covered ${named(settlement.unfundedIds)}.` };
  }
  return { level: 2, detail: `${spent} of the ${cash} went on ${named(settlement.fundedIds)}, and the ${left} still in hand could have covered something on the unpaid list as well.` };
}

/**
 * `er2` — whether the reason was about what the claim was or about what it cost.
 *
 * Deliberately the whole of this row and nothing else. "It was the cheapest one to drop" is
 * the misconception this competency exists to catch: price is a fact about a claim and it
 * is not a judgement about whether the claim matters. A student can spend the money
 * perfectly and still say only that, and this is the row that has to notice.
 *
 * There is no middle level here, because the tap has no middle. Whether the basis given was
 * the right *kind* is a yes or a no; whether it was *true* is the next row down, and that
 * one does have a middle.
 */
function kindRead(isValuesBasis: boolean, label: string): ClaimsRead {
  return isValuesBasis
    ? { level: 5, detail: `They gave a reason about what the claim was — “${label}” — rather than about its price.` }
    : { level: 0, detail: `They gave the price as the reason — “${label}” — which says which claim was smallest and nothing about which one mattered.` };
}

/**
 * `er3` — whether the reason they gave is true of what they actually left unpaid.
 *
 * Two ways to miss it, and they are different mistakes. A reason that is true of nothing
 * they left unpaid contradicts what they did: calling the shoes that were splitting the one
 * they only wanted is a claim about the world that the world does not support. A reason
 * that is true of something they left unpaid *and* of something they paid for did not do
 * the separating: "nobody else was counting on it" is true of the shoes and of the present
 * alike, so a student who funds one of them and drops the other has named a fact rather
 * than a reason. Both read as a real gap; only the first is a contradiction.
 */
function holdsRead(
  settlement: CompetingClaimsSettlement,
  claims: readonly CompetingClaim[],
  holdsOf: ((claim: CompetingClaim) => boolean) | null,
  said: string,
  named: (ids: readonly string[]) => string,
): ClaimsRead {
  if (!holdsOf) {
    return { level: 0, detail: `The reason given was the price, so nothing was claimed about ${named(settlement.unfundedIds)} that could be true or false of it.` };
  }
  const holds = (ids: readonly string[]) => claims.filter((claim) => ids.includes(claim.id) && holdsOf(claim));
  const unpaidThatFit = holds(settlement.unfundedIds);
  const paidThatFit = holds(settlement.fundedIds);
  const ids = (list: readonly CompetingClaim[]) => named(list.map((claim) => claim.id));
  if (unpaidThatFit.length === 0) {
    return { level: 0, detail: `They left ${named(settlement.unfundedIds)} unpaid and said ${said}, and that is not what this world says ${settlement.unfundedIds.length > 1 ? "either of them was" : "it was"}.` };
  }
  if (settlement.fundedIds.length === 0) {
    return { level: 2, detail: `They said ${said}, which is true of ${ids(unpaidThatFit)} — but nothing at all was paid for, so the reason has no choice to account for.` };
  }
  if (paidThatFit.length > 0) {
    return {
      level: 2,
      detail: `They said ${said}, which is true of ${ids(unpaidThatFit)} — and just as true of ${ids(paidThatFit)}, which they did pay for, so it does not account for this choice.`,
    };
  }
  return {
    level: 5,
    detail: `They said ${said}, which is true of ${ids(unpaidThatFit)} and of nothing they paid for.`,
  };
}

function explanationObservation(
  route: BasketballEvidenceRoute,
  kind: EvidenceKind,
  input: BasketballObserverInput,
): EvidenceRequirementObservation {
  const scored = input.scoredExplanations?.[route.evidenceRequirementId];
  const detail = scored !== undefined
    ? "A person read the writing and recorded this level."
    : input.defense.submitted
      ? "The defense was submitted and is waiting for a person to read it. BOW does not score student writing."
      : "No defense was submitted.";
  return {
    evidenceRequirementId: route.evidenceRequirementId,
    kind,
    level: scored ?? null,
    supportLevel: "standard_access",
    evidenceRefs: input.defense.evidenceRefs.length > 0
      ? input.defense.evidenceRefs
      : ["not-observed:defense"],
    reason: `${route.note} ${detail}`,
  };
}

/**
 * Basketball's eighteen micro-skills, restated as evidence about competencies.
 *
 * Only routed requirements produce an observation. A `not-produced` row emits nothing at
 * all, on purpose: writing "not observed" against every student for something this world
 * structurally cannot see would put a fact about the world onto a page about a child.
 * Absence is the honest form of that statement, and the route table above is where the
 * reason lives.
 */
export function observeBasketballEvidence(
  input: BasketballObserverInput,
): readonly EvidenceRequirementObservation[] {
  const byId = new Map(input.observations.map((observation) => [observation.microSkillId, observation]));
  return BASKETBALL_EVIDENCE_ROUTES.flatMap((route) => {
    const requirement = evidenceRequirementById(route.evidenceRequirementId);
    if (!requirement || route.via === "not-produced") return [];
    if (route.via === "written-defense") return [explanationObservation(route, requirement.kind, input)];
    if (route.via === "savings-figure") {
      return [savingsObservation(route, requirement.kind, input.openingPlan, input.openingRemainder ?? [])];
    }
    if (route.via === "competing-claims") return [claimsObservation(route, requirement.kind, input.competingClaims)];
    const combined = combine(route.microSkillIds, byId);
    return [{
      evidenceRequirementId: route.evidenceRequirementId,
      kind: requirement.kind,
      level: combined.level,
      supportLevel: combined.supportLevel,
      evidenceRefs: combined.evidenceRefs,
      reason: `${route.note} ${combined.detail}`,
    }];
  });
}

/**
 * The same thing, from a raw event log.
 *
 * The composition lives here rather than in `deriveResult` so that adding competency
 * evidence cannot change what an existing Basketball attempt already scores. `deriveResult`
 * is untouched; this walks the same facts through the same scorer and then says what they
 * mean.
 */
export function observeBasketballFromLog(
  log: readonly EvidenceEvent[],
  options: { scoredExplanations?: ScoredExplanations; numbers?: ScenarioNumbers } = {},
): readonly EvidenceRequirementObservation[] {
  const numbers = options.numbers ?? SCENARIO_NUMBERS;
  const facts = deriveFacts([...log], numbers);
  const defenseEvents = log.filter((event) => event.type === "DEFENSE_SUBMITTED");
  // The last settlement stands, for the same reason the last remainder declaration does:
  // a student who revisited a judgement is judged on where they ended, not where they began.
  // …and only this world's. `COMPETING_CLAIMS_SETTLED` is deliberately shared with the
  // market, which is what lets the two worlds' evidence about the same competency pool — and
  // it means an unguarded filter here would read a market student's tips jar and name it with
  // Avery's shoes. The envelope already records which world wrote each event.
  const settled = log
    .filter((event) => event.type === "COMPETING_CLAIMS_SETTLED" && event.worldId === "basketball")
    .at(-1);
  return observeBasketballEvidence({
    observations: observeStructured(facts, numbers),
    defense: { submitted: defenseEvents.length > 0, evidenceRefs: defenseEvents.map((event) => event.id) },
    // The opening plan only. Later boards repair a plan that already exists, and ER3 is
    // about the one moment money is being divided for the first time.
    openingRemainder: (facts.remainderChoices ?? []).filter((choice) => choice.mode === "working"),
    ...(facts.opening
      ? {
          openingPlan: {
            ...(facts.opening.sources ? { sources: facts.opening.sources } : {}),
            savingsAmount: facts.opening.snapshot.inputs.amounts.goal,
            supportLevel: facts.opening.support,
            evidenceRefs: facts.opening.evidenceRefs,
          },
        }
      : {}),
    ...(settled
      ? {
          competingClaims: {
            settlement: settled.payload as CompetingClaimsSettlement,
            evidenceRef: settled.id,
            supportLevel: settled.supportLevel,
          },
        }
      : {}),
    ...(options.scoredExplanations ? { scoredExplanations: options.scoredExplanations } : {}),
  });
}
