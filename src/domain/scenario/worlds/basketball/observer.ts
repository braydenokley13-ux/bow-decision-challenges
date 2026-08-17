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
import { deriveFacts } from "../../../evidence/facts";
import { observeStructured } from "../../../evidence/observe";
import type { EvidenceEvent, MicroSkillObservation, RemainderChoice } from "../../../evidence/types";
import { SCENARIO_NUMBERS } from "../../numbers";
import type { ScenarioNumbers } from "../../types";

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
       * The student named the row that takes what their other choices left over. Derived
       * from that statement alone — never from how much any row holds, and never from the
       * order three steppers were touched in.
       */
      via: "remainder-declaration";
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
    via: "remainder-declaration",
    note: "Closing the opening plan by sending the last of the money to a named row. The course line is what Avery is saving into, so a student who sends the leftovers there has let the arithmetic set their savings, and a student who sends them to Avery's week or the backup money has set the course line themselves and let something else absorb the rest.",
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
   * Every row the student named as taking the leftovers while building the opening plan,
   * in the order they named them. Absent or empty means they closed the plan another way,
   * which is `null` evidence and not a low score.
   */
  openingRemainder?: readonly RemainderChoice[];
  scoredExplanations?: ScoredExplanations;
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
 * `plan-within-income.er3`, from the one statement the student makes about it.
 *
 * The rule is the product definition's, unaltered: savings is a planned amount when the
 * student set it and let something else take the remainder, and is not when the remainder
 * *is* the savings.
 *
 * **Only a move that left nothing unassigned counts.** A row can take the rest of the money
 * or it can fill up on the way past — the course row is capped at what the course costs, so
 * a student funding it in full still has money to place afterwards. The first is a statement
 * about where the leftovers went; the second is a deliberate figure being placed, and
 * reading it as the first would score the goal-first student as the misconception. `remaining`
 * is what tells them apart, which is why the board records it.
 *
 * Three things this deliberately does not read:
 *
 * - **How much is in any row.** A student who plans $0 for the course this season has still
 *   planned it. Reading the size of the line would score a priority, which is the mistake
 *   `balance.ts` and `neutrality.test.ts` exist to prevent, and the reason this evidence
 *   could not be produced before.
 * - **The order the steppers were touched in.** Click sequence is not intention, and this
 *   product records no clickstream to read it from even if it were.
 * - **Whether the plan is a good one.** A plan that sends the leftovers to Avery's week
 *   scores here exactly as one that sends them to the backup money.
 *
 * The one level that is not a plain read of the closing statement is 4. A student who closed
 * onto the course line, saw the board that produced, took money back off it and closed
 * somewhere else has done what §10.3 calls self-correction: got it wrong, saw the raw state,
 * fixed it with nothing but the tools already on screen.
 */
function remainderObservation(
  route: BasketballEvidenceRoute,
  kind: EvidenceKind,
  choices: readonly RemainderChoice[],
): EvidenceRequirementObservation {
  const closings = choices.filter((choice) => choice.remaining === 0);
  const closed = closings.at(-1);
  if (!closed) {
    const detail = choices.length === 0
      ? "The student closed the opening plan without saying which row took the rest, so this world saw neither answer."
      : "The student used the control to place a figure but finished the plan another way, so no row was ever named as taking the last of the money.";
    return {
      evidenceRequirementId: route.evidenceRequirementId,
      kind,
      level: null,
      supportLevel: "standard_access",
      evidenceRefs: choices.length > 0 ? choices.map((choice) => choice.evidenceRef) : ["not-observed:plan-remainder"],
      reason: `${route.note} ${detail}`,
    };
  }
  const everClosedOnSavings = closings.some((choice) => choice.category === SAVINGS_ROW);
  const level: RubricLevel = closed.category === SAVINGS_ROW ? 0 : everClosedOnSavings ? 4 : 5;
  const detail = closed.category === SAVINGS_ROW
    ? "The course line took what the other rows left over, so the amount saved is what the arithmetic came to rather than a figure the student set."
    : everClosedOnSavings
      ? "The leftovers landed on the course line first and the student took them back off it and closed somewhere else, with nothing on screen but the board."
      : "The course line held a figure the student set, and another row took the last of the money.";
  return {
    evidenceRequirementId: route.evidenceRequirementId,
    kind,
    level,
    supportLevel: closed.supportLevel,
    evidenceRefs: choices.map((choice) => choice.evidenceRef),
    reason: `${route.note} ${detail}`,
  };
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

function combine(
  microSkillIds: readonly StructuredMicroSkillId[],
  byId: ReadonlyMap<StructuredMicroSkillId, MicroSkillObservation>,
): Combined {
  const parts = microSkillIds.map((id) => byId.get(id));
  const evidenceRefs = [...new Set(parts.flatMap((part) => part?.evidenceRefs ?? []))];
  const decision = decide(parts);
  return {
    level: decision.level,
    supportLevel: decision.part?.supportLevel ?? "standard_access",
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : microSkillIds.map((id) => `not-observed:${id}`),
    detail: decision.part?.reason ?? "This part of the run was not reached.",
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
    if (route.via === "remainder-declaration") {
      return [remainderObservation(route, requirement.kind, input.openingRemainder ?? [])];
    }
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
  return observeBasketballEvidence({
    observations: observeStructured(facts, numbers),
    defense: { submitted: defenseEvents.length > 0, evidenceRefs: defenseEvents.map((event) => event.id) },
    // The opening plan only. Later boards repair a plan that already exists, and ER3 is
    // about the one moment money is being divided for the first time.
    openingRemainder: (facts.remainderChoices ?? []).filter((choice) => choice.mode === "working"),
    ...(options.scoredExplanations ? { scoredExplanations: options.scoredExplanations } : {}),
  });
}
