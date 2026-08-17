import { availableCompetencyIds, isCompetencyAvailable, worldsAssessing } from "../competency/availability";
import type { ObjectiveDemand } from "../competency/objectiveState";
import { competencyById } from "../competency/competencies";
import type { Competency, CompetencyId } from "../competency/types";
import { NYSED_2026, NYSED_2026_STANDARDS } from "./frameworks/nysed-2026";
import { NYSED_2026_COMPLETION_RULES, NYSED_2026_MAPPINGS } from "./mappings/nysed-2026";
import type {
  Coverage,
  DistrictProfile,
  Framework,
  FrameworkId,
  FrameworkLabels,
  Mapping,
  ObjectiveCoverageState,
  Standard,
  StandardCompletionRule,
  StandardRef,
} from "./types";

/**
 * The standards layer's public surface: resolve a state's objective to what BOW measures,
 * and resolve what BOW measures back into a state's language.
 *
 * A New York teacher assigns 1.3. `competenciesFor` turns that into `plan-within-income`.
 * The worlds that assess `plan-within-income` run. The results come back as competency
 * results, and `resolveObjectiveCoverage` turns them into a sentence about 1.3 that the
 * mappings actually support.
 *
 * Nothing here is aware that other frameworks are possible — except that no NYSED code
 * appears in a type, a world, a rubric or a scoring function anywhere in the product.
 */

export type {
  Coverage,
  DistrictProfile,
  DistrictSequenceEntry,
  Framework,
  FrameworkId,
  FrameworkLabels,
  FrameworkTopic,
  Mapping,
  ObjectiveCoverageState,
  Standard,
  StandardCompletionRule,
  StandardRef,
} from "./types";

export { NYSED_2026, NYSED_2026_STANDARDS, NYSED_2026_TOPICS } from "./frameworks/nysed-2026";
export { NYSED_2026_COMPLETION_RULES, NYSED_2026_MAPPINGS } from "./mappings/nysed-2026";

/**
 * The district this deployment reports for, if any.
 *
 * None ships, and that is the honest answer rather than a placeholder: a district profile is
 * a real artefact a real district writes, and inventing one would put a sequence and a
 * required subset in front of a teacher that nobody at their district agreed to. The
 * Objective Map offers its term and required-subset filters only when this returns one.
 */
export function districtProfile(): DistrictProfile | undefined {
  return undefined;
}

/** Every framework BOW carries. NYSED is the first complete one, and today the only one. */
export const FRAMEWORKS: Record<FrameworkId, Framework> = { "nysed-pf-2026": NYSED_2026 };

const STANDARDS_BY_FRAMEWORK: Record<FrameworkId, readonly Standard[]> = { "nysed-pf-2026": NYSED_2026_STANDARDS };
const MAPPINGS_BY_FRAMEWORK: Record<FrameworkId, readonly Mapping[]> = { "nysed-pf-2026": NYSED_2026_MAPPINGS };
const COMPLETION_RULES_BY_FRAMEWORK: Record<FrameworkId, readonly StandardCompletionRule[]> = { "nysed-pf-2026": NYSED_2026_COMPLETION_RULES };

/** Every mapping across every framework, for the integrity tests and the reverse lookup. */
export const ALL_MAPPINGS: readonly Mapping[] = Object.values(MAPPINGS_BY_FRAMEWORK).flat();

/**
 * A framework id that is not one BOW carries resolves to nothing rather than throwing.
 *
 * The type says this cannot happen and the type is right about every call written today.
 * It stops being right the moment a `{ frameworkId, code }` arrives from a stored
 * assignment record written by an older version — which is precisely the read path this
 * layer exists to serve. An unknown framework then answers "no standards, no mappings, not
 * assessable," which is both true and survivable; a thrown error takes down the page a
 * teacher opened to read their class's results.
 */
const empty: readonly never[] = [];
const standardsOf = (frameworkId: FrameworkId): readonly Standard[] => STANDARDS_BY_FRAMEWORK[frameworkId] ?? empty;
const mappingsOf = (frameworkId: FrameworkId): readonly Mapping[] => MAPPINGS_BY_FRAMEWORK[frameworkId] ?? empty;
const rulesOf = (frameworkId: FrameworkId): readonly StandardCompletionRule[] => COMPLETION_RULES_BY_FRAMEWORK[frameworkId] ?? empty;

export function frameworkById(id: FrameworkId): Framework | undefined {
  return FRAMEWORKS[id];
}

/** What this teacher's state calls its parts. Every standard-naming string composes from these. */
export function labelsFor(id: FrameworkId): FrameworkLabels | undefined {
  return FRAMEWORKS[id]?.labels;
}

/** In the framework's own order — `sortIndex` exists so 1.10 sorts after 1.9. */
export function standardsIn(frameworkId: FrameworkId): readonly Standard[] {
  return [...standardsOf(frameworkId)].sort((left, right) => left.sortIndex - right.sortIndex);
}

export function standardByRef(ref: StandardRef): Standard | undefined {
  return standardsOf(ref.frameworkId).find((standard) => standard.code === ref.code);
}

export function mappingsForStandard(ref: StandardRef): readonly Mapping[] {
  return mappingsOf(ref.frameworkId).filter((mapping) => mapping.standardCode === ref.code);
}

export function completionRuleFor(ref: StandardRef): StandardCompletionRule | undefined {
  return rulesOf(ref.frameworkId).find((rule) => rule.standardCode === ref.code);
}

/** One standard, joined to the coverage claim that reached it. */
export interface CoveredStandard {
  standard: Standard;
  coverage: Coverage;
  rationale: string;
}

/**
 * Which state objectives this competency covers, and how much of each.
 *
 * The answer to "a teacher assigned 2.4 — what else did their class just produce evidence
 * for?" Which is 2.3, because one competency fully covers both.
 */
export function standardsFor(competencyId: CompetencyId): readonly CoveredStandard[] {
  return ALL_MAPPINGS.flatMap((mapping) => {
    if (mapping.competencyId !== competencyId) return [];
    const standard = standardByRef({ frameworkId: mapping.frameworkId, code: mapping.standardCode });
    return standard ? [{ standard, coverage: mapping.coverage, rationale: mapping.rationale }] : [];
  });
}

/** One competency, joined to the coverage claim that reached it. */
export interface CoveringCompetency {
  competency: Competency;
  coverage: Coverage;
  rationale: string;
}

/**
 * What BOW actually measures when a teacher assigns this objective.
 *
 * Returned in coverage order — `full` first — because that is the order a teacher setting
 * up an assignment cares about, and because a `supporting` competency is never what they
 * meant to assign.
 */
export function competenciesFor(frameworkId: FrameworkId, code: string): readonly CoveringCompetency[] {
  const order: Record<Coverage, number> = { full: 0, partial: 1, supporting: 2 };
  return mappingsForStandard({ frameworkId, code })
    .map((mapping) => ({ competency: competencyById(mapping.competencyId), coverage: mapping.coverage, rationale: mapping.rationale }))
    .sort((left, right) => order[left.coverage] - order[right.coverage]);
}

/**
 * Whether BOW can assess this objective at all today.
 *
 * **A mapping is not an assessment.** Every one of the 23 NYSED objectives has at least one
 * mapping, and that means only that a person has written down which BOW skill sits behind
 * it. Assessability additionally requires a *built world* that produces every required
 * evidence requirement of the competencies involved — so this returns false for an
 * objective whose competency exists on paper and nowhere else.
 *
 * That distinction is what lets the product say "coming" instead of "0% demonstrated,"
 * which are different sentences and a district reads them differently.
 *
 * - Where a completion rule exists, **every** competency it requires must be available.
 *   4.1 therefore stays unassessable while no world carries insurance, however good the
 *   advance-planning evidence is.
 * - Otherwise at least one `full`-mapped competency must be available. `partial` mappings
 *   without a completion rule and `supporting` mappings never make an objective assessable.
 */
export function isAssessable(
  ref: StandardRef,
  available: ReadonlySet<CompetencyId> = availableCompetencyIds(),
): boolean {
  if (standardByRef(ref) === undefined) return false;

  const rule = completionRuleFor(ref);
  if (rule) return rule.requires.every((competencyId) => available.has(competencyId));

  return mappingsForStandard(ref).some(
    (mapping) => mapping.coverage === "full" && available.has(mapping.competencyId),
  );
}

/**
 * What this objective asks for, said without naming the framework that asks it.
 *
 * The same rule `isAssessable` applies, expressed as the shape the roll-up in
 * `competency/objectiveState.ts` takes — a completion rule wins outright and every part of
 * it is required; otherwise any one `full`-mapped competency meets the demand. `partial` and
 * `supporting` mappings appear in neither list, because §10.5 says they never move a state.
 *
 * This is the join, and it belongs on this side of it: the competency layer may not know
 * that some state numbers one of these, and this file already does.
 */
export function demandFor(ref: StandardRef): ObjectiveDemand {
  const rule = completionRuleFor(ref);
  if (rule) return { anyOf: [], allOf: rule.requires };
  return {
    anyOf: mappingsForStandard(ref).filter((mapping) => mapping.coverage === "full").map((mapping) => mapping.competencyId),
    allOf: [],
  };
}

/** Every objective BOW can assess today, across a framework. Empty is a legitimate answer. */
export function assessableStandards(
  frameworkId: FrameworkId,
  available: ReadonlySet<CompetencyId> = availableCompetencyIds(),
): readonly Standard[] {
  return standardsIn(frameworkId).filter((standard) => isAssessable({ frameworkId, code: standard.code }, available));
}

/**
 * What BOW may say about one objective, given the competencies a student demonstrated.
 *
 * This is the coverage question only — whether the evidence reaches the objective's demand.
 * The class-level states a teacher reads (strong, developing, needs attention) and the
 * thresholds and minimum denominator behind them are a later checkpoint and sit on top of
 * this rather than replacing it.
 *
 * The rules, in the order they matter:
 *
 * 1. A `supporting` mapping never changes an objective's state. It appears in the evidence
 *    trail and nowhere else.
 * 2. Where a completion rule exists, the objective is demonstrated only when **every**
 *    competency it lists is. Assigning one of 2.1's three skills yields
 *    `partially-assessed`, never `demonstrated`.
 * 3. Otherwise a single `full`-mapped competency is enough, and a `partial` one alone is
 *    never enough — it is evidence toward the objective, which is `partially-assessed`.
 */
export function resolveObjectiveCoverage(
  ref: StandardRef,
  demonstrated: ReadonlySet<CompetencyId>,
): ObjectiveCoverageState {
  // Explicit rather than incidental. An unknown code already falls through to
  // `not-assessed` because nothing maps to it, but only because the integrity tests
  // guarantee no orphan mapping exists — which is a fact about a different file.
  if (standardByRef(ref) === undefined) return "not-assessed";

  const rule = completionRuleFor(ref);
  if (rule) {
    const met = rule.requires.filter((competencyId) => demonstrated.has(competencyId));
    if (met.length === rule.requires.length) return "demonstrated";
    return met.length === 0 ? "not-assessed" : "partially-assessed";
  }

  const mappings = mappingsForStandard(ref).filter((mapping) => mapping.coverage !== "supporting");
  if (mappings.some((mapping) => mapping.coverage === "full" && demonstrated.has(mapping.competencyId))) return "demonstrated";
  return mappings.some((mapping) => demonstrated.has(mapping.competencyId)) ? "partially-assessed" : "not-assessed";
}

/**
 * Which parts of a bundled objective are still missing, named.
 *
 * "2.1 partially assessed — still needs the borrowing decision" is a sentence a teacher can
 * act on. "2.1: 33%" is not.
 */
export function missingCompetenciesFor(
  ref: StandardRef,
  demonstrated: ReadonlySet<CompetencyId>,
): readonly CompetencyId[] {
  const rule = completionRuleFor(ref);
  if (!rule) return [];
  return rule.requires.filter((competencyId) => !demonstrated.has(competencyId));
}

/** Re-exported so a caller resolving an objective does not have to reach into two layers. */
export { availableCompetencyIds, isCompetencyAvailable, worldsAssessing };
export type { ObjectiveDemand };
