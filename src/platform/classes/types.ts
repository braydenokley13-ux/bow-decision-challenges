import type { ReasoningScores } from "../../domain/blueprint/reasoning";
import type { CompetencyId, EvidenceRequirementId, RubricLevel } from "../../domain/competency/types";
import type { WorldId } from "../../domain/core/ids";
import type { EvidenceEvent } from "../../domain/evidence/types";
import type { StandardRef } from "../../domain/standards/types";

/**
 * The whole class-service contract, in one file both sides read.
 *
 * This is deliberately not an LMS. There are no student accounts, no roster, no names and
 * no email addresses — a class is a code, a seat is a number a student picks up when they
 * sit down, and a submission is the evidence log that seat produced. Everything an educator
 * sees is derived from those logs, which means the service stores no claim it cannot show
 * its working for.
 */

/** A class an educator created. The code is what students type; the key is what an educator keeps. */
export interface ClassRecord {
  code: string;
  label: string;
  challengeId: string;
  createdAt: number;
  /** When the service will drop this class and everything in it. */
  expiresAt: number;
}

/**
 * The class as its own educator sees it. The teacher key never leaves the creation
 * response and the educator's own browser — a student who types the class code can join and
 * submit, and cannot read anybody's evidence, because reading takes the key.
 */
export interface ClassCreation extends ClassRecord {
  teacherKey: string;
}

export type AssignmentFormat = "quick-check" | "decision-challenge";

/**
 * One thing a class was set, per §17.3.
 *
 * A class used to be able to hold exactly one thing — `ClassRecord.challengeId` — and a
 * submission belonged to the class rather than to anything the teacher had decided. This is
 * the record that separates the two: a class is a room of seats, and an assignment is
 * something that room was asked to do.
 *
 * **Both the objective and the competencies are stored, and they are not the same claim.**
 * `objectiveRef` is what the teacher picked and the only language reporting may speak in to
 * them. `competencyIds` is what BOW actually measured, resolved from the mapping at the
 * moment it was set. A state that revises its framework next year rewrites the first and
 * cannot touch the second, which is what keeps an old result readable.
 */
export interface Assignment {
  id: string;
  /** The class it belongs to. A class is its code in V1; it has no other identity. */
  classId: string;
  /**
   * What the teacher chose. `null` for a class created before there was an objective to
   * choose — writing a code in there would record a selection nobody made.
   */
  objectiveRef: StandardRef | null;
  /** What is actually assessed, resolved from the mapping when the assignment was set. */
  competencyIds: readonly CompetencyId[];
  /** The worlds offered. One today; the list is what makes a second one a config change. */
  allowedWorldIds: readonly WorldId[];
  studentChoosesWorld: boolean;
  format: AssignmentFormat;
  /**
   * Who it was set for, or `null` for the whole class.
   *
   * V1 has no student accounts and no roster (§17.4), so the only identifier a student has
   * is the seat they sat down at. The field keeps the product definition's name because the
   * thing it identifies is a student; what stands in for one here is a seat code.
   */
  assignedStudentIds: readonly string[] | null;
  createdAt: number;
  /** The assignment this one is a reassessment of. Absent unless it is one. */
  attemptOf?: string;
}

/**
 * A teacher disagreeing with one machine judgement, on the record (§19.4).
 *
 * Stored **alongside** the judgement it disagrees with, never in place of it. Both are kept
 * and both are shown, for two reasons that are not the same: a teacher has to be able to see
 * what BOW saw before deciding it was wrong, and how often teachers overrule a rule is one
 * of the few signals that tells us whether the rule is any good (§23.3).
 *
 * The note is required. An override with no reason is a number that changed and nothing
 * anybody can learn from — including the person who wrote it, three months later.
 */
export interface TeacherOverride {
  evidenceRequirementId: EvidenceRequirementId;
  /** What the teacher says it is. `null` where they say the run never showed it at all. */
  level: RubricLevel | null;
  /** Why. Never optional, never blank. */
  note: string;
  at: number;
}

export interface SubmissionRecord {
  classCode: string;
  seatCode: string;
  sessionId: string;
  challengeId: string;
  challengeVersion: string;
  /**
   * What the student was doing. Absent on every submission stored before assignments
   * existed, and on any client that does not send one — `assignmentIdFor` in
   * `assignments.ts` is what turns absence into an answer, on read, without rewriting
   * anybody's record.
   */
  assignmentId?: string;
  submittedAt: number;
  /** Educator-scored reasoning, written back after review. Null until a person scores it. */
  reasoningPoints: number | null;
  /**
   * The same reading, criterion by criterion.
   *
   * The total alone cannot say which requirement a mark answered — a student who explained
   * the trade-off and quoted no numbers reaches the same ten-point score as one who did the
   * reverse, and they have met opposite halves of the same requirement. Absent on every
   * submission scored before this was recorded, which is why it is optional and why nothing
   * derives a level when it is missing.
   */
  reasoningCriteria?: ReasoningScores;
  /**
   * Every override a teacher has recorded on this attempt, oldest first.
   *
   * Append-only. Changing your mind writes a second entry rather than editing the first, so
   * the record reads as a history a person can follow rather than as a single number whose
   * provenance has been overwritten.
   */
  overrides?: readonly TeacherOverride[];
  log: EvidenceEvent[];
}

/** A submission with the question "what was this for" already answered. */
export type AttributedSubmission = SubmissionRecord & { assignmentId: string };

/** What a student sends. The service stamps everything else. */
export interface EvidenceSubmission {
  classCode: string;
  seatCode: string;
  sessionId: string;
  challengeId: string;
  challengeVersion: string;
  assignmentId?: string;
  log: EvidenceEvent[];
}

export type ClassErrorCode =
  | "class_not_found"
  | "class_expired"
  | "code_taken"
  | "not_authorised"
  | "bad_request"
  | "challenge_mismatch"
  | "assignment_not_found"
  | "unavailable";

export interface ClassError {
  error: ClassErrorCode;
  message: string;
}

export function isClassError(value: unknown): value is ClassError {
  return typeof value === "object" && value !== null && typeof (value as ClassError).error === "string";
}

/**
 * Every error a student or educator can actually hit, in words that say what to do about
 * it. A raw status code on a screen in front of a class is not an error state, it is a
 * dead end.
 */
export const CLASS_ERROR_MESSAGES: Record<ClassErrorCode, string> = {
  class_not_found: "No class with that code. Check the letters with your teacher — it is not case sensitive.",
  class_expired: "That class has closed. Ask your teacher for a new code.",
  code_taken: "That code is already in use. Pick another one, or let us generate it.",
  not_authorised: "This link does not open that class. Use the link you were given when you created it.",
  bad_request: "That request did not look right. Reload the page and try again.",
  challenge_mismatch: "That class is running a different challenge.",
  assignment_not_found: "That class was not set that work. Ask your teacher for the code again.",
  unavailable: "The class service is not reachable right now.",
};

/** How long a class and its evidence are kept before the service drops them. */
export const CLASS_RETENTION_DAYS = 120;

/**
 * The same eight failures, said to the adult. `CLASS_ERROR_MESSAGES` is written for the
 * person who is eleven and stuck at the join screen, which is the right default — it is
 * what almost every one of these renders to. But four of those sentences send the reader
 * to their teacher, and on an educator surface the reader *is* the teacher. Telling a
 * teacher whose class will not open to "check the letters with your teacher" is not a
 * small infelicity: it is the product failing to know who it is talking to at the exact
 * moment that person has lost a room full of student work and needs to be told what to do.
 *
 * Only the codes whose wording actually turns on the audience are overridden. The rest
 * fall through to the student text on purpose, because "The class service is not reachable
 * right now" is the same true sentence whoever is reading it, and a second copy of it is
 * a second thing to keep in step.
 */
const EDUCATOR_OVERRIDES: Partial<Record<ClassErrorCode, string>> = {
  class_not_found:
    "No class with that code. Check the letters — it is not case sensitive. A class is kept for " +
    `${CLASS_RETENTION_DAYS} days and then dropped, so a class from last term will not open.`,
  class_expired:
    `That class has closed. Classes are kept for ${CLASS_RETENTION_DAYS} days after they are created. ` +
    "Its evidence is gone; start a new class for this group.",
  assignment_not_found: "That class was not set that work. Set it from your class list, then reload.",
  challenge_mismatch: "That class is running a different challenge. Open it from your own class list.",
};

/**
 * The message to put in front of an educator for `code`. Every educator surface calls this
 * rather than indexing `CLASS_ERROR_MESSAGES` directly, which is what keeps the two sets
 * from drifting: adding a code to `ClassErrorCode` forces a student sentence, and this
 * function decides whether the adult needs a different one.
 */
export function educatorClassError(code: ClassErrorCode): string {
  return EDUCATOR_OVERRIDES[code] ?? CLASS_ERROR_MESSAGES[code];
}
