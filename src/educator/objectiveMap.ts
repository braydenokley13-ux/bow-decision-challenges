import {
  isStale,
  objectiveMapStateFrom,
  objectiveResultFrom,
  studentOutcomeFor,
  type ObjectiveMapState,
  type ObjectiveResult,
  type StudentObjectiveOutcome,
} from "../domain/competency/objectiveState";
import { isCountable } from "../domain/competency/observe";
import type { CompetencyId } from "../domain/competency/types";
import {
  demandFor,
  isAssessable,
  standardsIn,
  worldsAssessing,
  type DistrictProfile,
  type FrameworkId,
  type Standard,
  type StandardRef,
} from "../domain/standards";
import { competencyResultsFor } from "./objectiveResults";
import type { OpenedClass } from "./useTeacherClasses";

/**
 * The whole framework, as one class stands against it.
 *
 * This is the join the Objective Map is: availability from the built worlds, an assignment
 * from the class service, evidence from the submissions, and a coverage mark from the
 * teacher. Every rule that turns those into a word lives one layer down in
 * `objectiveState.ts`, so this file assembles and never decides.
 *
 * Two things it refuses to do. It does not pool a class that was never set an objective into
 * that objective's denominator — a room that was never asked is not a room that failed. And
 * it never derives *taught* from anything a student did, because a lesson is not something
 * BOW can see (§15.3).
 */

export interface ObjectiveMapRow {
  standard: Standard;
  state: ObjectiveMapState;
  /** BOW has a built world for this. False means "coming", never "nobody demonstrated it". */
  available: boolean;
  /** A person ticked it for the class in view. */
  markedTaught: boolean;
  /** Turned in against an assignment for this objective. Not the size of the class. */
  submitted: number;
  result: ObjectiveResult;
  /** How many built worlds can assess what this objective rests on. */
  worlds: number;
  lastAssessedAt: number | null;
  /** A result older than the staleness line has to be shown with its date (§15.3). */
  stale: boolean;
}

export interface ObjectiveMapInputs {
  frameworkId: FrameworkId;
  classes: readonly OpenedClass[];
  /** One class, or `null` for every class this browser can open, pooled. */
  classCode: string | null;
  now: number;
  /** A district's ordering and required subset, when one is configured. */
  district?: DistrictProfile;
}

const DAY = 24 * 60 * 60 * 1000;

function assignmentsOn(entry: OpenedClass, ref: StandardRef) {
  return entry.assignments.filter(
    (assignment) => assignment.objectiveRef?.frameworkId === ref.frameworkId && assignment.objectiveRef.code === ref.code,
  );
}

/**
 * One row, from however many classes are in view.
 *
 * Pooling across classes is a real question a teacher asks — "across all my sections, where
 * are we" — and it is honest because every student is counted once, in the class they sat
 * in. What is not pooled is the coverage mark: *taught* is per class per objective, so with
 * several classes in view it is true only when it is true of all of them, which is the only
 * reading that does not overstate what a teacher has covered.
 */
function rowFor(standard: Standard, inputs: ObjectiveMapInputs): ObjectiveMapRow {
  const ref: StandardRef = { frameworkId: standard.frameworkId, code: standard.code };
  const inView = inputs.classCode === null
    ? inputs.classes
    : inputs.classes.filter((entry) => entry.record.code === inputs.classCode);

  const demand = demandFor(ref);
  const required: readonly CompetencyId[] = demand.allOf;
  const partsWithResults = new Set<CompetencyId>();
  const outcomes: StudentObjectiveOutcome[] = [];
  let submitted = 0;
  let assigned = false;
  let assignedStudents: number | null = null;
  let namedAnyGroup = false;
  let lastAssessedAt: number | null = null;

  for (const entry of inView) {
    const forThis = assignmentsOn(entry, ref);
    if (forThis.length === 0) continue;
    assigned = true;
    for (const assignment of forThis) {
      if (assignment.assignedStudentIds) {
        namedAnyGroup = true;
        assignedStudents = (assignedStudents ?? 0) + assignment.assignedStudentIds.length;
      }
    }
    const ids = new Set(forThis.map((assignment) => assignment.id));
    for (const submission of entry.submissions) {
      if (!ids.has(submission.assignmentId)) continue;
      submitted += 1;
      lastAssessedAt = Math.max(lastAssessedAt ?? 0, submission.submittedAt);
      const results = competencyResultsFor(submission);
      for (const result of results) {
        if (required.includes(result.competencyId) && isCountable(result.state)) partsWithResults.add(result.competencyId);
      }
      outcomes.push(studentOutcomeFor(results, demand));
    }
  }

  const taughtIn = inView.filter((entry) =>
    (entry.record.taughtObjectives ?? []).some(
      (marker) => marker.frameworkId === ref.frameworkId && marker.standardCode === standard.code,
    ));
  const markedTaught = inView.length > 0 && taughtIn.length === inView.length;

  const result = objectiveResultFrom(outcomes);
  const available = isAssessable(ref);
  const state = objectiveMapStateFrom({
    available,
    markedTaught,
    assigned,
    // Only a group every assignment in view named carries a denominator. One whole-class
    // assignment among them and there is no roster to measure the rest against.
    assignedStudents: namedAnyGroup && assigned ? assignedStudents : null,
    submitted,
    partsWithResults: partsWithResults.size,
    partsRequired: required.length,
    result,
  });

  return {
    standard,
    state,
    available,
    markedTaught,
    submitted,
    result,
    worlds: new Set([...demand.allOf, ...demand.anyOf].flatMap((id) => [...worldsAssessing(id)])).size,
    lastAssessedAt,
    stale: lastAssessedAt !== null && isStale(Math.floor((inputs.now - lastAssessedAt) / DAY)),
  };
}

/**
 * Every objective in the framework, in the framework's own order — or the district's.
 *
 * A district is an ordering and a renaming over a framework, never a second standards system
 * (§5.5), so its sequence reorders these rows and its required subset filters them. With no
 * district configured the framework's own order stands, which is what every deployment gets
 * today.
 */
export function objectiveMapRows(inputs: ObjectiveMapInputs): readonly ObjectiveMapRow[] {
  const rows = standardsIn(inputs.frameworkId).map((standard) => rowFor(standard, inputs));
  const sequence = inputs.district?.frameworkId === inputs.frameworkId ? inputs.district.sequence : undefined;
  if (!sequence) return rows;
  const order = new Map(sequence.map((entry, index) => [entry.standardCode, index]));
  return [...rows].sort((left, right) =>
    (order.get(left.standard.code) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.standard.code) ?? Number.MAX_SAFE_INTEGER)
    || left.standard.sortIndex - right.standard.sortIndex);
}

export interface MapFilters {
  topicCode: string | null;
  state: ObjectiveMapState | null;
  /** Only what this district requires. Available only where a district profile exists. */
  requiredOnly: boolean;
  /** A district's own term for a block of the year. Available only where a profile exists. */
  term: string | null;
}

export const NO_FILTERS: MapFilters = { topicCode: null, state: null, requiredOnly: false, term: null };

export function applyMapFilters(
  rows: readonly ObjectiveMapRow[],
  filters: MapFilters,
  district?: DistrictProfile,
): readonly ObjectiveMapRow[] {
  const required = district ? new Set(district.requiredSubset) : null;
  const termOf = new Map(district?.sequence.map((entry) => [entry.standardCode, entry.term]) ?? []);
  return rows.filter((row) => {
    if (filters.topicCode && row.standard.topicCode !== filters.topicCode) return false;
    if (filters.state && row.state !== filters.state) return false;
    if (filters.requiredOnly && required && !required.has(row.standard.code)) return false;
    if (filters.term && termOf.get(row.standard.code) !== filters.term) return false;
    return true;
  });
}

/** What a district calls this objective, when it calls it something of its own (§5.5). */
export function displayNameFor(standard: Standard, district?: DistrictProfile): string {
  return district?.localNames?.[standard.code] ?? standard.shortLabel;
}
