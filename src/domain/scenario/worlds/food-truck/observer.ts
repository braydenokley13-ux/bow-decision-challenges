import type {
  EvidenceKind,
  EvidenceRequirementId,
  EvidenceRequirementObservation,
  RubricLevel,
  SupportLevel,
} from "../../../competency/types";
import { evidenceRequirementById } from "../../../competency/competencies";
import type { EvidenceEvent } from "../../../evidence/types";
import { formatDollars } from "../../../core/money";
import type { CompetingClaimsSettlement } from "../../../evidence/types";
import { isTipClaimReasonId, tipClaimReason, tipClaims, tipsReachAsFarAsTheyGo, type TipClaim } from "./claims";
import { cashToPlan, owedUpFront, swapBill } from "./economy";
import { derivePopUpFacts, type PopUpBoardEvidence, type PopUpFacts, type PopUpRemainderChoice, type PopUpSumEvidence } from "./facts";
import { POP_UP_NUMBERS } from "./numbers";
import type { PopUpLineId, PopUpNumbers, PopUpSumId } from "./types";

/**
 * Run the Pop-Up, speaking competencies.
 *
 * This world has no micro-skills and no eighteen-row scorer of its own. It does not need one:
 * the thing the product actually compares across worlds is the named evidence requirement, so
 * this file goes from the log to those directly, and the shared engine in
 * `competency/observe.ts` applies the same rubric and the same support caps it applies to
 * Basketball's. Neither the engine nor the rubric learned that a second world exists.
 *
 * **What this file may not do.** It may not read a preference. No booth spot, tray count,
 * hire or split is worth a level here, and `balance.ts` beside it is the proof that none of
 * them could be — an observation that read the size of the cut would make one set of
 * priorities the right answer in a world swept to show that none of them is.
 *
 * It is reached only through `WorldContract`. Nothing a student downloads imports it.
 */

/** How one evidence requirement gets produced in this world, or why it does not. */
export type PopUpRouteVia =
  | {
      /** A sum the student worked out unaided, gated on the board that sum was for. */
      via: "sum";
      sumId: PopUpSumId;
      /** The board that has to exist for the sum to be evidence about this requirement. */
      gate?: "opening" | "repair";
    }
  | {
      /** The sum, and what the student did about money that had a condition on it. */
      via: "sum-and-cover";
      sumId: PopUpSumId;
    }
  | {
      /** The opening board: what it spent against what there was, and what was left over. */
      via: "opening-balance";
    }
  | {
      /** The student named the line that takes what their other choices left over. */
      via: "remainder-declaration";
    }
  | {
      /** The repair board: whether committed money was left alone. */
      via: "repair-committed";
    }
  | {
      /** The repair board: how much was freed against how much could have been. */
      via: "repair-freed";
    }
  | {
      /** The repair board: whether it ended settled, or the shortfall was named out loud. */
      via: "repair-ending";
    }
  | {
      /**
       * The tips jar, settled. One event, three separable facts, one read each.
       *
       * The same three the other world reads from the same event, deliberately: `reach` is
       * arithmetic over the allocation, `kind-of-reason` is whether the basis given was about
       * the claim or about its price, and `reason-holds` is whether that basis is actually
       * true of what went unpaid and not equally true of what was funded.
       */
      via: "competing-claims";
      reads: "reach" | "kind-of-reason" | "reason-holds";
    }
  | {
      /** The student writes it; a person scores it. BOW never grades student writing. */
      via: "written-answer";
    }
  | {
      /** Examined and declined. `note` says what stops it. */
      via: "not-produced";
    };

export type PopUpEvidenceRoute = PopUpRouteVia & {
  evidenceRequirementId: EvidenceRequirementId;
  /** The sentence that goes in the evidence trail, or the reason there is nothing to put there. */
  note: string;
};

/**
 * Every evidence requirement of every competency Run the Pop-Up was examined against.
 *
 * The `not-produced` rows are the useful half. A missing row is an oversight; a declined row
 * is a finding about the world, written where the next world's designer will read it.
 * `coverage.test.ts` fails the build if a competency named here gains a requirement this
 * table does not account for.
 */
export const POP_UP_EVIDENCE_ROUTES: readonly PopUpEvidenceRoute[] = [
  // ── plan-within-income — all five ──────────────────────────────────────────────────
  {
    evidenceRequirementId: "plan-within-income.er1",
    via: "sum-and-cover",
    sumId: "cash-to-plan",
    note: "Totalling the cash that is actually the student's once the permit and the booth are paid, and saying what gives if the catering job or the rebate does not come.",
  },
  {
    evidenceRequirementId: "plan-within-income.er2",
    via: "sum",
    sumId: "owed-up-front",
    gate: "opening",
    note: "Working out what the market wants before a single plate is sold — the permit and the booth for the spot the student chose — and then building the plan on what is left rather than on the whole account.",
  },
  {
    evidenceRequirementId: "plan-within-income.er3",
    via: "remainder-declaration",
    note: "Closing the opening plan by sending the last of the money to a named line. Your cut is the money the student is banking for themselves, so a student who sends the leftovers there has let the arithmetic set their pay, and a student who sends them to stock or the cushion has set their cut themselves and let something else absorb the rest.",
  },
  {
    evidenceRequirementId: "plan-within-income.er4",
    via: "opening-balance",
    note: "The saved opening plan spends no more than there is and leaves no dollar without a job.",
  },
  {
    evidenceRequirementId: "plan-within-income.er5",
    via: "written-answer",
    note: "The organiser's question is where the student names what they gave up and what they gave it up for.",
  },

  // ── adapt-a-plan — all five ────────────────────────────────────────────────────────
  {
    evidenceRequirementId: "adapt-a-plan.er1",
    via: "sum",
    sumId: "swap-gap",
    gate: "repair",
    note: "Totalling what the shop still wants for a replacement generator once the deposit is put against it.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er2",
    via: "repair-committed",
    note: "Repairing out of the lines that can still move, without reaching for the permit, the booth, the stock already cooked or the shift already promised.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er3",
    via: "repair-freed",
    note: "Freeing as much as the bill needed, measured against the most that could have been freed from what the student was still holding.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er4",
    via: "repair-ending",
    note: "Finishing on a plan that covers the swap, or naming out loud how much of it is still not covered.",
  },
  {
    evidenceRequirementId: "adapt-a-plan.er5",
    via: "written-answer",
    note: "The organiser's question is where the student names what they refused to cut and why.",
  },

  // ── sort-by-need-want-goal — all four, from the tips jar and the write-up ─────────
  // The market could not produce any of these until it had a moment where more than one
  // person wanted the same money at once. Every board before the tips jar divides money the
  // student controls into lines the plan names; nothing on any of them is a claim somebody
  // else is making. The four below read one settlement and one paragraph, and none of them
  // reads how much any claim cost — which is what keeps the two allocations that spend the
  // jar as far as it goes worth the same, and stops this competency quietly deciding that a
  // cool box matters more than a promise or the other way round.
  {
    evidenceRequirementId: "sort-by-need-want-goal.er1",
    via: "competing-claims",
    reads: "reach",
    note: "Making the first Saturday's tips reach as far as they can across three claims that together cost more than the jar — committing no more than there is, and leaving nothing behind that one of the unpaid claims could still have taken.",
  },
  {
    evidenceRequirementId: "sort-by-need-want-goal.er2",
    via: "competing-claims",
    reads: "kind-of-reason",
    note: "Saying what the unpaid claim was to Mo rather than what it cost. Price is a fact about a claim and it is not a judgement about whether the claim matters, and this row is where the difference between the two shows.",
  },
  {
    evidenceRequirementId: "sort-by-need-want-goal.er3",
    via: "competing-claims",
    reads: "reason-holds",
    note: "Whether the reason the student gave is actually true of what they left unpaid, and not equally true of what they paid for. A basis that fits both halves of a choice explains neither of them.",
  },
  {
    evidenceRequirementId: "sort-by-need-want-goal.er4",
    via: "written-answer",
    note: "The organiser's question is where the student says what made one claim matter more than another — something the truck needed, a promise to somebody on the row, or something they simply wanted.",
  },

  // ── save-toward-a-goal — examined, and declined for the same reasons as Basketball ──
  // Your cut is money being put aside and the student plainly cares about it, which is why
  // this competency was examined at all. It still fails on every requirement, and the reason
  // matters more than the verdict: in this world the size of the cut, whether it survives the
  // generator and what it was for are the student's *strategy*, and `balance.ts` sweeps this
  // market specifically to prove that no strategy is the right one. An observation here would
  // turn one of them into the answer key.
  //
  // Keeping this uncovered also keeps the two worlds pooling honestly. Basketball produces
  // none of it either; a pop-up that claimed it would put a competency on a teacher's screen
  // that only one of the two worlds could ever produce, and §9.1 is the claim that a student
  // who picks a different story is measured on the same things.
  {
    evidenceRequirementId: "save-toward-a-goal.er1",
    via: "not-produced",
    note: "The world sets the target and the date — four Saturdays, and the organiser settles at the end of them. The student never names an amount they are saving toward or a day they need it by, and naming the line that takes the leftovers is not naming a target.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er2",
    via: "not-produced",
    note: "The cut is set once, for the whole run, on the opening board. There is no per-Saturday contribution for a student to work out, so there is nothing here that could be got right or missed.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er3",
    via: "not-produced",
    note: "The generator does put the cut under pressure, and this world scores covering the bill without regard to which line paid for it — deliberately, because scoring the cut's survival would reward one priority over the others. Whether a student protected their own pay or spent it on a generator is a decision the world records and refuses to grade.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er4",
    via: "not-produced",
    note: "The settle-up shows the student what they banked; it never asks them to state a gap against a target, because there was no target. Only the 'ended on it' half of the rule is visible here, and crediting that half alone rewards the student who chose to bank the most.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er5",
    via: "not-produced",
    note: "The organiser asks what the student would keep and what they would change, not what the money was for. Adding that prompt is a content change to this world rather than a mapping, and it would need its own reasoning criterion before a person could mark it.",
  },
] as const;

/** A person's judgement of the writing, keyed by requirement. Never machine-derived (§10.6). */
export type PopUpScoredExplanations = Partial<Record<EvidenceRequirementId, RubricLevel>>;

export interface PopUpObserverInput {
  facts: PopUpFacts;
  numbers: PopUpNumbers;
  scoredExplanations?: PopUpScoredExplanations;
}

/** The line the student is banking for themselves. This is the savings line ER3 is about. */
const SAVINGS_LINE: PopUpLineId = "cut";

interface Part {
  level: RubricLevel | null;
  supportLevel: SupportLevel;
  evidenceRefs: readonly string[];
  detail: string;
}

const NOT_REACHED = (what: string, marker: string): Part => ({
  level: null,
  supportLevel: "standard_access",
  evidenceRefs: [`not-observed:${marker}`],
  detail: what,
});

/**
 * What a sum came to.
 *
 * Right at the first attempt is 5, right after getting it wrong is 4, and an answer the world
 * handed over is 0 whatever happened next — the support cap in the shared engine says the same
 * thing, and it is applied there rather than trusted from here.
 */
function sumPart(sum: PopUpSumEvidence | undefined, expected: number | null, label: string): Part {
  if (!sum) return NOT_REACHED(`The ${label} was never worked out.`, label);
  if (expected === null) return NOT_REACHED(`This world has no expected total for the ${label} yet.`, label);
  const refs = sum.attempts.map((attempt) => attempt.eventRef);
  const firstCorrect = sum.attempts.findIndex((attempt) => attempt.correct && attempt.value === expected);
  const level: RubricLevel = sum.supplied || firstCorrect === -1 ? 0 : firstCorrect === 0 ? 5 : 4;
  return {
    level,
    supportLevel: sum.support,
    evidenceRefs: refs,
    detail: level === 0
      ? `The ${label} was never reconciled with what the market is charging.`
      : level === 5
        ? `The ${label} came out right at the first attempt.`
        : `The ${label} came out wrong and the student put it right.`,
  };
}

/**
 * What the student did about money that had a condition on it.
 *
 * The rule is the requirement's, unaltered: money with a condition attached may be planned on,
 * and it may not be planned on *as if it were certain*. Counting the catering job or the
 * rebate is a defensible call — `balance.ts` shows the rebate is a live strategy either way —
 * so what is judged is whether the student said what would give if it did not come.
 *
 * A plan built only on cash the student is holding satisfies this outright. There is nothing
 * to cover, and asking a student to cover nothing would be scoring caution.
 */
function coverPart(facts: PopUpFacts): Part {
  const countedAny = facts.counted.catering || facts.counted.rebate;
  if (!facts.opening.entered) return NOT_REACHED("The opening plan was never reached.", "opening-plan");
  if (!countedAny) {
    return {
      level: 5,
      supportLevel: "standard_access",
      evidenceRefs: facts.opening.evidenceRefs.length > 0 ? facts.opening.evidenceRefs : ["not-observed:conditional-money"],
      detail: "The plan divided only the cash in the account, so nothing in it depended on a condition being met.",
    };
  }
  if (!facts.cover) {
    return {
      level: 0,
      supportLevel: facts.opening.support,
      evidenceRefs: facts.opening.evidenceRefs.length > 0 ? facts.opening.evidenceRefs : ["not-observed:cover-line"],
      detail: "Money with a condition on it was written into the plan and no line was named to give it back, so the plan treated it as money already in the account.",
    };
  }
  // Naming the line only after the board refused a save is the §10.3 level 4: the student saw
  // the raw state, and put it right with nothing on screen but the board.
  const afterAFailedSave = facts.opening.savesBeforeAcceptable > 0
    && facts.opening.evidenceRefs.length > 0
    && facts.cover.sequence > 0
    && facts.opening.firstSaveBalance !== 0;
  return {
    level: afterAFailedSave ? 4 : 5,
    supportLevel: facts.opening.support,
    evidenceRefs: [facts.cover.evidenceRef, ...facts.opening.evidenceRefs],
    detail: afterAFailedSave
      ? "Money with a condition on it was written into the plan, and the line that would give it back was named after the board would not take the plan."
      : "Money with a condition on it was written into the plan, and the student named the line it would come out of if it did not arrive.",
  };
}

/**
 * Which half of a conjunction settles it.
 *
 * The order of the rules is what keeps `null` out of the scoring: an observed 0 wins, because
 * a student who got the reachable half plainly wrong has failed the whole; otherwise a missing
 * half makes the whole thing not observed, because half of a conjunction is not a judgement
 * about the conjunction; otherwise the weaker half stands, carrying its own support with it.
 */
function conjoin(parts: readonly Part[]): Part {
  const refs = [...new Set(parts.flatMap((part) => part.evidenceRefs))];
  const failed = parts.find((part) => part.level === 0);
  if (failed) return { ...failed, evidenceRefs: refs };
  const missing = parts.find((part) => part.level === null);
  if (missing) return { ...missing, evidenceRefs: refs };
  const weakest = parts.reduce((lowest, part) => ((part.level ?? 5) < (lowest.level ?? 5) ? part : lowest));
  // When every half held, the trail gets every half's sentence. A conjunction that reported
  // only the weakest would tell a teacher one of the two things the student actually did.
  return { ...weakest, evidenceRefs: refs, detail: parts.map((part) => part.detail).join(" ") };
}

/**
 * `plan-within-income.er3`, from the one statement the student makes about it.
 *
 * The rule is the product definition's: savings is a planned amount when the student set it
 * and let something else take the remainder, and is not when the remainder *is* the savings.
 *
 * Only a move that left nothing unassigned counts. A line can take the rest of the money or it
 * can fill up on the way past, and `remaining` is what tells them apart — a student who funds
 * their cut to a figure they chose and then places what is actually left somewhere else has
 * done the thing this requirement is looking for, not the thing it is looking out for.
 *
 * Three things this deliberately does not read: how much is in any line (a student who plans
 * to bank nothing this season has still planned it), the order the steppers were touched in
 * (click sequence is not intention, and this product records no clickstream to read it from),
 * and whether the plan is a good one.
 *
 * **What it does read, and did not used to.** Sending the rest to the stock line is a
 * statement about the stock line. It is only a statement about *your cut* if your cut holds a
 * figure the student put there — and until the board recorded where each figure came from,
 * this said "your cut held a figure the student set" about a line whose stepper had never been
 * touched. A student red team caught it on three children at once: one click on
 * *"Stock — takes what is left over"* closed the whole opening plan, their cut sat at the
 * board's own zero, and their teacher's page reported **Savings is a planned amount —
 * Independently**.
 *
 * So a cut nobody moved produces no observation at all. Not a low level: this world cannot
 * tell "deliberately banking nothing" from "never opened the line", and §10.4's rule for a
 * question that never came up is silence rather than a zero. A figure the board itself
 * suggested and the student never went back to is the same silence for the same reason —
 * being handed a split is not planning one.
 */
function remainderPart(choices: readonly PopUpRemainderChoice[], opening: PopUpBoardEvidence): Part {
  const closings = choices.filter((choice) => choice.remaining === 0);
  const closed = closings.at(-1);
  const cutFigure = opening.lineSources[SAVINGS_LINE];
  const suggested = cutFigure !== undefined && cutFigure.amountSource === "suggested" && !cutFigure.revised;
  if (!closed) {
    return {
      level: null,
      supportLevel: "standard_access",
      evidenceRefs: choices.length > 0 ? choices.map((choice) => choice.evidenceRef) : ["not-observed:popup-remainder"],
      detail: suggested
        ? "The board filled in one split that adds up, so the figure on your cut was the one BOW suggested and the student did not change it."
        : choices.length === 0
          ? "The student closed the opening plan without saying which line took the rest, so this world saw neither answer."
          : "The student used the control to place a figure but finished the plan another way, so no line was ever named as taking the last of the money.",
    };
  }
  const everClosedOnCut = closings.some((choice) => choice.line === SAVINGS_LINE);
  if (closed.line === SAVINGS_LINE) {
    return {
      level: 0,
      supportLevel: closed.supportLevel,
      evidenceRefs: choices.map((choice) => choice.evidenceRef),
      detail: "Your cut took what the other lines left over, so what the student is banking is what the arithmetic came to rather than a figure they set.",
    };
  }
  // Another line closed the plan. Whether that says anything about the savings line depends
  // entirely on whether the student ever set the savings line.
  const set = cutFigure !== undefined && (cutFigure.amountSource === "typed" || cutFigure.revised);
  if (!set) {
    return {
      level: null,
      supportLevel: closed.supportLevel,
      evidenceRefs: choices.map((choice) => choice.evidenceRef),
      detail: suggested
        ? "Another line took the last of the money, and the figure on your cut was the one BOW suggested, which the student did not change."
        : "Another line took the last of the money, and your cut was never moved off the figure the board opened on — so this run cannot say whether banking nothing was the plan or whether the line was never read.",
    };
  }
  return {
    level: everClosedOnCut ? 4 : 5,
    supportLevel: closed.supportLevel,
    evidenceRefs: choices.map((choice) => choice.evidenceRef),
    detail: everClosedOnCut
      ? "The leftovers landed on your cut first and the student took them back off it and closed somewhere else, with nothing on screen but the board."
      : "Your cut held a figure the student set, and another line took the last of the money.",
  };
}

/** `plan-within-income.er4` — what the opening board spent, and what it left lying about. */
function openingBalancePart(board: PopUpBoardEvidence): Part {
  if (!board.saved) {
    return {
      level: null,
      supportLevel: board.support,
      evidenceRefs: board.evidenceRefs.length > 0 ? board.evidenceRefs : ["not-observed:opening-plan"],
      detail: "No opening plan was ever committed, so there is nothing to say about whether one balanced.",
    };
  }
  const firstTime = board.firstSaveBalance === 0;
  return {
    level: firstTime ? 5 : 4,
    supportLevel: board.support,
    evidenceRefs: board.evidenceRefs,
    detail: firstTime
      ? "The first plan the student asked to commit already gave every dollar a job and spent nothing that was not there."
      : board.firstSaveBalance < 0
        ? "The first plan the student asked to commit spent more than the account held; they saw the board and brought it back."
        : "The first plan the student asked to commit still had money with no job; they saw the board and placed it.",
  };
}

/** `adapt-a-plan.er2` — committed money left alone, or reached for and then left alone. */
function repairCommittedPart(board: PopUpBoardEvidence): Part {
  if (!board.saved) {
    return {
      level: null,
      supportLevel: board.support,
      evidenceRefs: board.evidenceRefs.length > 0 ? board.evidenceRefs : ["not-observed:repair"],
      detail: "The repair was never committed, so nothing was settled about where the money came from.",
    };
  }
  return {
    level: board.lockedMoveAttempts === 0 ? 5 : 4,
    supportLevel: board.support,
    evidenceRefs: board.evidenceRefs,
    detail: board.lockedMoveAttempts === 0
      ? "The permit, the booth, the stock already cooked and the shift already promised were left alone while the money that could still move did the work."
      : `Money already committed was reached for ${board.lockedMoveAttempts} time(s), and the repair was then made out of the lines that could still move.`,
  };
}

/** `adapt-a-plan.er3` — how much was freed against how much could have been. */
function repairFreedPart(board: PopUpBoardEvidence): Part {
  if (!board.saved) {
    return {
      level: null,
      supportLevel: board.support,
      evidenceRefs: board.evidenceRefs.length > 0 ? board.evidenceRefs : ["not-observed:repair"],
      detail: "No repair was committed, so no response to the generator was recorded.",
    };
  }
  if (board.freeable === 0) {
    return {
      level: 5,
      supportLevel: board.support,
      evidenceRefs: board.evidenceRefs,
      detail: "There was nothing left in any line that could still move, so there was nothing to free.",
    };
  }
  const full = board.freed >= board.freeable;
  const level: RubricLevel = full ? (board.savesBeforeAcceptable > 0 ? 4 : 5) : board.freed > 0 ? 2 : 0;
  return {
    level,
    supportLevel: board.support,
    evidenceRefs: board.evidenceRefs,
    detail: `The repair freed $${board.freed} of the $${board.freeable} the lines that could still move were holding.`,
  };
}

/** `adapt-a-plan.er4` — settled, or short and said so. */
function repairEndingPart(board: PopUpBoardEvidence): Part {
  if (!board.saved) {
    return {
      level: null,
      supportLevel: board.support,
      evidenceRefs: board.evidenceRefs.length > 0 ? board.evidenceRefs : ["not-observed:repair"],
      detail: "The repair was never committed.",
    };
  }
  const settled = board.residual === 0;
  return {
    level: settled ? 5 : board.residualAcknowledged ? 2 : 0,
    supportLevel: board.support,
    evidenceRefs: board.evidenceRefs,
    detail: settled
      ? "The swap was covered in full and every dollar moved had somewhere to be."
      : board.residualAcknowledged
        ? `The repair finished $${board.residual} short of the swap, and the student said so rather than leaving it hidden.`
        : `The repair finished $${board.residual} short of the swap with nothing said about it.`,
  };
}

function explanationPart(facts: PopUpFacts, scored: RubricLevel | undefined): Part {
  return {
    level: scored ?? null,
    supportLevel: "standard_access",
    evidenceRefs: facts.writeUp.evidenceRefs.length > 0 ? facts.writeUp.evidenceRefs : ["not-observed:write-up"],
    detail: scored !== undefined
      ? "A person read the writing and recorded this level."
      : facts.writeUp.submitted
        ? "The answer was sent and is waiting for a person to read it. BOW does not score student writing."
        : "Nothing was written.",
  };
}

function expectedFor(sumId: PopUpSumId, facts: PopUpFacts, n: PopUpNumbers): number | null {
  if (sumId === "swap-gap") return swapBill(n);
  if (!facts.spotId) return null;
  if (sumId === "owed-up-front") return owedUpFront(n, facts.spotId);
  if (sumId === "cash-to-plan") return cashToPlan(n, facts.spotId);
  // The cost of a tray order is priced against a decision the world never scores, so it has
  // no expected value here and no route reads one.
  return null;
}

/**
 * The tips jar, read three ways.
 *
 * Nothing here reads *which* claims survived, and that is the whole discipline of the beat.
 * Two ways of spending the jar reach as far as the money goes: the seal on its own, or the
 * cleaner's share and the sign together. One protects the food, the other keeps a promise
 * and puts the truck's name on the truck, and this file has no opinion about which is
 * better. An observer that scored which claims survived would be scoring a set of values,
 * and `balance.ts` exists to keep this world from doing that anywhere.
 */
function claimsPart(reads: "reach" | "kind-of-reason" | "reason-holds", facts: PopUpFacts, n: PopUpNumbers): Part {
  const settled = facts.tipClaims;
  if (!settled) {
    return NOT_REACHED("The run never reached the night the tips jar is emptied, so this world saw no answer either way.", "tip-claims");
  }
  const claims = tipClaims(n);
  const named = (ids: readonly string[]) =>
    claims.filter((claim) => ids.includes(claim.id)).map((claim) => claim.title).join(" and ");
  const built = reads === "reach"
    ? tipsReachRead(settled.settlement, named, n)
    : reasonRead(reads, settled.settlement, claims, named);
  return {
    level: built.level,
    supportLevel: settled.supportLevel,
    evidenceRefs: [settled.evidenceRef],
    detail: built.detail,
  };
}

interface ClaimsRead {
  level: RubricLevel;
  detail: string;
}

/**
 * `er1` — how far the jar was made to reach.
 *
 * Arithmetic, and neutral by construction: more than one allocation satisfies it and it is
 * indifferent between them. The tips never enter the plan and cannot be banked — the screen
 * says so before the student decides — so a dollar not spent on one of these three is a
 * dollar spent on nothing, which is why leaving a claim affordable and unpaid is a real gap
 * rather than a preference.
 */
function tipsReachRead(
  settlement: CompetingClaimsSettlement,
  named: (ids: readonly string[]) => string,
  n: PopUpNumbers,
): ClaimsRead {
  const cash = formatDollars(settlement.cash);
  const spent = formatDollars(settlement.spent);
  const left = formatDollars(settlement.leftOver);
  if (settlement.spent > settlement.cash) {
    return { level: 0, detail: `The claims taken on came to ${spent} against ${cash} in the jar, which is more money than was in it.` };
  }
  if (settlement.fundedIds.length === 0) {
    return { level: 0, detail: `Nothing on the list was paid for, so the whole ${cash} sat in a jar that could not be banked and could not be spent on anything else.` };
  }
  if (tipsReachAsFarAsTheyGo(settlement.fundedIds, n)) {
    return { level: 5, detail: `${named(settlement.fundedIds)} took ${spent} of the ${cash}, and the ${left} left over could not have covered ${named(settlement.unfundedIds)}.` };
  }
  return { level: 2, detail: `${named(settlement.fundedIds)} took ${spent} of the ${cash}, and the ${left} still in the jar could have covered something on the unpaid list as well.` };
}

function reasonRead(
  reads: "kind-of-reason" | "reason-holds",
  settlement: CompetingClaimsSettlement,
  claims: readonly TipClaim[],
  named: (ids: readonly string[]) => string,
): ClaimsRead {
  if (!isTipClaimReasonId(settlement.reason)) {
    return { level: 0, detail: "The settlement carries a reason this world does not offer, so nothing about it can be read either way." };
  }
  const reason = tipClaimReason(settlement.reason);
  if (reads === "kind-of-reason") {
    // No middle level, because the tap has no middle. Whether the basis given was the right
    // *kind* is a yes or a no; whether it was *true* is the next row down, and that one does
    // have a middle.
    return reason.holdsOf
      ? { level: 5, detail: `They gave a reason about what the claim was — “${reason.label}” — rather than about its price.` }
      : { level: 0, detail: `They gave the price as the reason — “${reason.label}” — which says which claim was smallest and nothing about which one mattered.` };
  }
  return tipsHoldRead(settlement, claims, reason.holdsOf, reason.said, named);
}

/**
 * `er3` — whether the reason they gave is true of what they actually left unpaid.
 *
 * Two ways to miss it, and they are different mistakes. A reason true of nothing they left
 * unpaid contradicts what they did: calling the perishing cool box seal the one they only
 * wanted is a claim about the world the world does not support. A reason true of something
 * they left unpaid *and* of something they paid for did not do the separating: "nobody else
 * was counting on it" is true of the seal and of the sign alike, so a student who funds one
 * of them and drops the other has named a fact rather than a reason. Both read as a real
 * gap; only the first is a contradiction.
 */
function tipsHoldRead(
  settlement: CompetingClaimsSettlement,
  claims: readonly TipClaim[],
  holdsOf: ((claim: TipClaim) => boolean) | null,
  said: string,
  named: (ids: readonly string[]) => string,
): ClaimsRead {
  if (!holdsOf) {
    return { level: 0, detail: `The reason given was the price, so nothing was claimed about ${named(settlement.unfundedIds)} that could be true or false of it.` };
  }
  const holds = (ids: readonly string[]) => claims.filter((claim) => ids.includes(claim.id) && holdsOf(claim));
  const unpaidThatFit = holds(settlement.unfundedIds);
  const paidThatFit = holds(settlement.fundedIds);
  if (unpaidThatFit.length === 0) {
    return { level: 0, detail: `They left ${named(settlement.unfundedIds)} unpaid and ${said}, and that is not what this world says ${settlement.unfundedIds.length > 1 ? "either of them was" : "it was"}.` };
  }
  if (settlement.fundedIds.length === 0) {
    return { level: 2, detail: `${said}, which is true of ${named(unpaidThatFit.map((claim) => claim.id))} — but nothing was paid for, so the reason has nothing to explain the choosing of.` };
  }
  if (paidThatFit.length > 0) {
    return {
      level: 2,
      detail: `${said}, which is true of ${named(unpaidThatFit.map((claim) => claim.id))} — and just as true of ${named(paidThatFit.map((claim) => claim.id))}, which they did pay for, so it does not account for this choice.`,
    };
  }
  return { level: 5, detail: `${said}, which is true of ${named(unpaidThatFit.map((claim) => claim.id))} and of nothing they paid for.` };
}

function partFor(route: PopUpEvidenceRoute, input: PopUpObserverInput): Part {
  const { facts, numbers } = input;
  switch (route.via) {
    case "sum": {
      const board = route.gate === "repair" ? facts.repair : route.gate === "opening" ? facts.opening : undefined;
      const label = route.sumId === "owed-up-front" ? "total owed before the first Saturday" : route.sumId === "swap-gap" ? "amount still owed on the generator" : "money left to plan with";
      if (board && !board.saved && route.gate === "opening") {
        return NOT_REACHED("No opening plan was committed, so the total was never carried into one.", "opening-plan");
      }
      return sumPart(facts.sums[route.sumId], expectedFor(route.sumId, facts, numbers), label);
    }
    case "sum-and-cover":
      return conjoin([
        sumPart(facts.sums[route.sumId], expectedFor(route.sumId, facts, numbers), "money left to plan with"),
        coverPart(facts),
      ]);
    case "opening-balance":
      return openingBalancePart(facts.opening);
    case "remainder-declaration":
      return remainderPart(facts.openingRemainder, facts.opening);
    case "repair-committed":
      return repairCommittedPart(facts.repair);
    case "repair-freed":
      return repairFreedPart(facts.repair);
    case "repair-ending":
      return repairEndingPart(facts.repair);
    case "competing-claims":
      return claimsPart(route.reads, facts, numbers);
    case "written-answer":
      return explanationPart(facts, input.scoredExplanations?.[route.evidenceRequirementId]);
    case "not-produced":
      return NOT_REACHED("This world does not produce this.", "not-produced");
  }
}

/**
 * Every routed requirement, restated as an observation the shared engine can score.
 *
 * A `not-produced` row emits nothing at all, on purpose: writing "not observed" against every
 * student for something this world structurally cannot see would put a fact about the world
 * onto a page about a child. Absence is the honest form of that statement, and the route table
 * is where the reason lives.
 */
export function observePopUpEvidence(input: PopUpObserverInput): readonly EvidenceRequirementObservation[] {
  return POP_UP_EVIDENCE_ROUTES.flatMap((route) => {
    const requirement = evidenceRequirementById(route.evidenceRequirementId);
    if (!requirement || route.via === "not-produced") return [];
    const kind: EvidenceKind = requirement.kind;
    const part = partFor(route, input);
    return [{
      evidenceRequirementId: route.evidenceRequirementId,
      kind,
      level: part.level,
      supportLevel: part.supportLevel,
      evidenceRefs: part.evidenceRefs,
      reason: `${route.note} ${part.detail}`,
    }];
  });
}

/** The same thing, from a raw event log. This is what the world contract calls. */
export function observePopUpFromLog(
  log: readonly EvidenceEvent[],
  options: { scoredExplanations?: PopUpScoredExplanations; numbers?: PopUpNumbers } = {},
): readonly EvidenceRequirementObservation[] {
  return observePopUpEvidence({
    facts: derivePopUpFacts(log),
    numbers: options.numbers ?? POP_UP_NUMBERS,
    ...(options.scoredExplanations ? { scoredExplanations: options.scoredExplanations } : {}),
  });
}
