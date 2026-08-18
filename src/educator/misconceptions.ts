import { writtenAnswerFrom } from "../domain/evidence/writtenAnswer";
import { evidenceRequirementById } from "../domain/competency/competencies";
import { isShortfall, levelFor } from "../domain/competency/teachNext";
import type { CompetencyResult, EvidenceRequirementId, RubricLevel } from "../domain/competency/types";
import type { AttributedSubmission } from "../platform/classes/types";

/**
 * The misconception spotlight — §18.3.
 *
 * "Savings = whatever is left" is a claim about a room of children, and the only thing that
 * makes it safe to put on a screen is the students' own work underneath it. So this returns
 * exactly two lists and never a summary of either:
 *
 * - **Evidenced.** Seats whose own run shows the shortfall, with what they wrote if a person
 *   has read it. This is the audit trail; a teacher who disagrees can open the seat.
 * - **Missing.** Seats where BOW has nothing to say, and why. A student the world never
 *   asked and a student whose writing is still on the teacher's desk are absences, not
 *   quiet failures, and the spotlight names them separately so a teacher cannot read the
 *   count as "everyone else was fine".
 *
 * Nothing here paraphrases, scores or infers. The writing is quoted verbatim or omitted.
 */

export interface SpotlightExample {
  seatCode: string;
  /** The rubric level this seat reached on the requirement in the spotlight. */
  level: RubricLevel;
  /** Their own words, quoted, or `null` where nobody has read them yet. */
  writing: string | null;
}

export type AbsenceReason =
  /** The run never presented this requirement to this student. */
  | "not-observed"
  /** It is an explanation requirement and nobody has read what they wrote. */
  | "writing-unread";

export interface SpotlightAbsence {
  seatCode: string;
  why: AbsenceReason;
}

export interface MisconceptionSpotlight {
  evidenceRequirementId: EvidenceRequirementId;
  /** The named wrong idea, or `null` where the model names none behind this failure. */
  misconception: string | null;
  /** The rubric row in words, so a teacher can check the claim against the rule. */
  observableRule: string;
  evidenced: readonly SpotlightExample[];
  missing: readonly SpotlightAbsence[];
}

/** One seat's competency results and the submission they came from. */
export interface SeatResults {
  seatCode: string;
  submission: AttributedSubmission;
  results: readonly CompetencyResult[];
}

/**
 * What a student wrote, taken from their own log rather than from a derived summary.
 *
 * Every world's written explanation arrives as the same event, so this needs no world
 * knowledge — and quoting the payload means the spotlight shows the sentence the student
 * actually turned in.
 */
export function writtenExplanationOf(submission: AttributedSubmission): string | null {
  const answer = writtenAnswerFrom(submission.log);
  return answer && answer.text.length > 0 ? answer.text : null;
}

/**
 * The spotlight for one requirement, over the seats that were assessed on the objective.
 *
 * `seats` must already be filtered to assessed students: a seat with no usable result on
 * the objective is not in the denominator upstream and must not appear here either.
 */
export function spotlightFor(evidenceRequirementId: EvidenceRequirementId, seats: readonly SeatResults[]): MisconceptionSpotlight | null {
  const requirement = evidenceRequirementById(evidenceRequirementId);
  if (!requirement) return null;

  const evidenced: SpotlightExample[] = [];
  const missing: SpotlightAbsence[] = [];
  for (const seat of seats) {
    const level = levelFor(seat.results, evidenceRequirementId);
    if (level === null) {
      // An explanation nobody has read is a different silence from an opportunity the run
      // never presented, and only one of them is anybody's fault.
      const unread = requirement.kind === "explanation" && seat.submission.reasoningPoints === null;
      missing.push({ seatCode: seat.seatCode, why: unread ? "writing-unread" : "not-observed" });
      continue;
    }
    if (!isShortfall(level)) continue;
    evidenced.push({
      seatCode: seat.seatCode,
      level,
      writing: seat.submission.reasoningPoints === null ? null : writtenExplanationOf(seat.submission),
    });
  }

  // Seat order, so the same class reads the same way every time it is opened.
  const bySeat = (a: { seatCode: string }, b: { seatCode: string }) =>
    Number(a.seatCode) - Number(b.seatCode) || a.seatCode.localeCompare(b.seatCode);
  return {
    evidenceRequirementId,
    misconception: requirement.misconceptionIfNot,
    observableRule: requirement.observableRule,
    evidenced: evidenced.sort(bySeat),
    missing: missing.sort(bySeat),
  };
}
