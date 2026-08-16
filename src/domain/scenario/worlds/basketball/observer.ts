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
import { deriveFacts } from "../../../evidence/facts";
import { observeStructured } from "../../../evidence/observe";
import type { EvidenceEvent, MicroSkillObservation } from "../../../evidence/types";
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
 * **What this file may not do.** It may not invent an observation. Every level it emits
 * comes from a micro-skill Plan Under Pressure already scores, or from a person who read
 * the student's writing. Deriving a new judgement here would mean Basketball started
 * scoring something it did not score yesterday — which changes what a saved attempt means,
 * and would risk creating a right answer in a scenario `balance.ts` sweeps precisely to
 * prove has none.
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
  // ── plan-within-income — four of five ──────────────────────────────────────────────
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
    via: "not-produced",
    note: "Avery's three amounts move freely on one board and only the saved plan is recorded, so a student who set the course line first is indistinguishable from one who typed the leftovers into it. Reading the size of the line instead of the order would reward one set of priorities in a scenario balanced to have none. Producing this needs a world that records the order the amounts were set in, or one where the student sets the savings target.",
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

  // ── save-toward-a-goal — examined, and none of it survives ─────────────────────────
  // The course is a savings goal and Avery is plainly saving toward it, which is why this
  // competency was examined at all. Every requirement still fails for the same underlying
  // reason: in this world the target, its deadline and whether it survives are the
  // student's *strategy*, and `balance.ts` exists to keep every strategy defensible. An
  // observation here would turn one of them into the right answer.
  {
    evidenceRequirementId: "save-toward-a-goal.er1",
    via: "not-produced",
    note: "The world sets the target and the date — the course costs what it costs and the season ends when it ends. Naming an amount and a deadline is not something this student does.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er2",
    via: "not-produced",
    note: "Avery plans one eight-week block, not a per-period contribution, so there is no weekly figure for the student to work out or miss.",
  },
  {
    evidenceRequirementId: "save-toward-a-goal.er3",
    via: "not-produced",
    note: "Week 5 does put the course under pressure, but this world scores absorbing the shortfall without regard to which line paid for it — deliberately, and `neutrality.test.ts` holds it there. Scoring the course line's survival would reward one priority over the others.",
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
  scoredExplanations?: ScoredExplanations;
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
    ...(options.scoredExplanations ? { scoredExplanations: options.scoredExplanations } : {}),
  });
}
