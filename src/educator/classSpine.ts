import {
  MINIMUM_RESULTS_FOR_CLASS_NARRATION,
  type ObjectiveDemand,
} from "../domain/competency/objectiveState";
import { demandFor, type StandardRef } from "../domain/standards";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import { classResultFor, type ObjectiveClassResult } from "./objectiveResults";

/**
 * What a class has shown, computed once and read by every class-level surface.
 *
 * The class page, the debrief and the objective page all describe the same evidence, and
 * before this module they described it three ways: the objective page prescribed a lesson
 * from a failed required requirement, the debrief rolled the same evidence up to concept
 * level and announced that nothing needed reteaching, and the class page led with a points
 * total. Two of those were wrong at the same time for the same class.
 *
 * So there is one derivation. `classResultFor` does the counting; this decides which
 * assignment a class's evidence is read against, and whether the denominator is large
 * enough for the surfaces to say anything about the class at all.
 */

export interface ClassSpine {
  /** The assignment this class's evidence is read against. Every class has one (§17.3). */
  assignment: Assignment | null;
  /** What the teacher picked, when they picked one. `null` is not a missing value here. */
  objectiveRef: StandardRef | null;
  /** The counts, the states, the teach-next reading and the spotlight. One derivation. */
  reading: ObjectiveClassResult | null;
  submitted: number;
  /** Of those, how many still have writing nobody has read. */
  awaitingReading: number;
  /**
   * Students with a usable result. The denominator for every claim about what they *showed*.
   *
   * It is not the same number as `submitted`, and the difference is usually a teacher's
   * marking pile: a student whose written explanation nobody has read has no usable result
   * yet. The share, the class state and the teach-next reading are all refused below
   * `MINIMUM_ASSESSED_FOR_A_STATE` of these, inside the domain, where neither this module nor
   * a screen can talk its way past it.
   */
  assessed: number;
  /**
   * Whether this class may be described as a class at all.
   *
   * Below the minimum the surfaces show counts and individual work and nothing else: no
   * distribution of what the room decided, no consensus sentence, no lesson. Each of those is
   * a claim about a room, and a room is not what a handful of runs is evidence about
   * (§15.3, §18.4).
   *
   * The denominator here is runs turned in rather than usable results, because that is what
   * these particular claims rest on: "eleven of thirty put Avery in the cousin's room" is
   * true whether or not anybody has read a word of their writing. What rests on assessed
   * results is guarded by `assessed`, one field up, and refused in the domain.
   */
  narratable: boolean;
}

/**
 * Which assignment the class page speaks about.
 *
 * One with an objective wins, because that is the language a teacher chose and the only one
 * reporting may speak to them in. Otherwise the oldest, which for a class nobody set an
 * objective on is the one the service synthesises — the challenge they actually ran.
 */
function leadAssignment(assignments: readonly Assignment[]): Assignment | null {
  return assignments.find((entry) => entry.objectiveRef !== null) ?? assignments[0] ?? null;
}

/**
 * What that assignment asks for.
 *
 * An objective's demand comes from the mappings. An assignment with no objective is a class
 * that ran a challenge, so the demand is what the challenge measures — all of it, because a
 * student who showed one of two skills has not shown what the run asked for.
 */
function demandOf(assignment: Assignment): ObjectiveDemand {
  if (assignment.objectiveRef) return demandFor(assignment.objectiveRef);
  return { anyOf: [], allOf: assignment.competencyIds };
}

export function classSpineFrom(input: {
  record: ClassRecord;
  assignments: readonly Assignment[];
  submissions: readonly AttributedSubmission[];
}): ClassSpine {
  const assignment = leadAssignment(input.assignments);
  if (!assignment) {
    return {
      assignment: null,
      objectiveRef: null,
      reading: null,
      submitted: input.submissions.length,
      awaitingReading: input.submissions.filter((submission) => submission.reasoningPoints === null).length,
      assessed: 0,
      narratable: input.submissions.length >= MINIMUM_RESULTS_FOR_CLASS_NARRATION,
    };
  }
  const reading = classResultFor({
    record: input.record,
    assignment,
    demand: demandOf(assignment),
    submissions: input.submissions,
  });
  return {
    assignment,
    objectiveRef: assignment.objectiveRef,
    reading,
    submitted: reading.submitted,
    awaitingReading: reading.awaitingReading,
    assessed: reading.result.assessed,
    narratable: reading.submitted >= MINIMUM_RESULTS_FOR_CLASS_NARRATION,
  };
}
