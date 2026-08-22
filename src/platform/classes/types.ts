import type { ReasoningScores } from "../../domain/blueprint/reasoning";
import type { CompetencyId, EvidenceRequirementId, RubricLevel } from "../../domain/competency/types";
import type { WorldId } from "../../domain/core/ids";
import type { EvidenceEvent } from "../../domain/evidence/types";
import type { StandardRef } from "../../domain/standards/types";

/**
 * The whole class-service contract, in one file both sides read.
 *
 * A class is a code, a seat is a number a student picks up when they sit down, and a
 * submission is the evidence log that seat produced. Everything an educator sees is derived
 * from those logs, which is what lets the service store no claim it cannot show its working
 * for.
 *
 * What this comment used to add to that was *"there are no student accounts, no roster, no
 * names and no email addresses"*, and by the time anybody read it back all four clauses were
 * false. There are student accounts — `StudentAccount`, an id and a timestamp. There is a
 * roster: one `RosterEntry` per seat. Every row carries a `displayName`, which arrives either
 * from the class list a teacher pasted or from the first name a student typed at `/join` in a
 * class that has no list, and BOW has no way to tell whether either is a real name. And a
 * teacher signs in with an email address, which is the account.
 *
 * All four live next door in `src/platform/identity/types.ts`. What was true when the sentence
 * was written, and is still true, is that *this file* has none of them — which is a fact about
 * one module, and was never a fact about the product. A file whose types do not mention names
 * is not a product that does not hold them, and a comment is the wrong place to learn that.
 *
 * The narrower claim is the one worth keeping, because it is the one that survives reading the
 * store: the class service holds no identifier anybody else issued. No student number, no SIS
 * id, no email address for a child, no birthday, no school. What it holds is a first name
 * against a seat in one teacher's class — sealed at rest (`server/vault.ts`), read by that
 * class's teacher and by the student whose row it is, and dropped with the class after
 * `CLASS_RETENTION_DAYS`.
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
/**
 * A question a teacher writes themselves, asked once, after the challenge is over.
 *
 * §37. It belongs to the **assignment** and never to the challenge version, and that is the
 * whole design rather than a filing decision: a challenge version is what makes an attempt
 * readable in three years, and a teacher typing a question on a Tuesday may not change what a
 * run recorded in September means. Two teachers may set the same challenge with different
 * closing questions and both attempts stay comparable, because nothing BOW measures depends on
 * this text.
 *
 * It is deliberately small. §37 says *keep it light* — one question, at the end, optional to
 * answer unless the teacher says otherwise. It is not a second rubric, it carries no
 * competency, and no evidence requirement can ever route through it.
 */
export interface ClosingQuestion {
  /** The teacher's own words. Never generated, never edited by BOW. */
  text: string;
  /** Whether a student must answer before the run is finished. */
  required: boolean;
}

/**
 * What a student wrote in answer to it.
 *
 * **`questionText` is copied onto the answer rather than looked up through the assignment**,
 * and that is the load-bearing part. A teacher who edits the question next term would
 * otherwise silently re-label every answer already given to the old one — a child's words
 * filed under a question they were never asked. The copy is what makes the pair readable
 * later, and it is the same reason a challenge version is stamped on an attempt.
 *
 * It is stored beside the evidence log and never inside it. Nothing in `observe.ts` reads it,
 * no competency result moves because of it, and `closingAnswerIsNotEvidence.test.ts` is what
 * holds that to being true rather than intended.
 */
export interface ClosingAnswer {
  /** The question as it was asked, at the moment it was asked. */
  questionText: string;
  answer: string;
  at: number;
}

export interface Assignment {
  id: string;
  /** The class it belongs to. A class is its code in V1; it has no other identity. */
  classId: string;
  /**
   * The teacher's short name for this piece of work. Absent means the challenge title is the
   * name students and teachers see, which keeps every assignment written before titles existed
   * readable without inventing one after the fact.
   */
  title?: string;
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
   * The strings in here are **seat codes**. The field keeps the product definition's name
   * because the thing it identifies is a student, and it was written when a seat was the only
   * identifier a student had. That has not been true for a while — there are accounts and
   * there is a roster row per seat — but the field has not changed and must not: the parser in
   * `assignments.ts` reads these as seats, and every piece of evidence this product has ever
   * stored is keyed by `(classCode, seatCode)` rather than by an account.
   */
  assignedStudentIds: readonly string[] | null;
  createdAt: number;
  /**
   * The teacher's own closing question, if they wrote one. Absent on every assignment made
   * before this existed, and on every assignment whose teacher did not want one.
   */
  closingQuestion?: ClosingQuestion;
  /** The assignment this one is a reassessment of. Absent unless it is one. */
  attemptOf?: string;
  /**
   * When the teacher wants this finished, in epoch ms. Absent means no due date was set —
   * which is a real, common answer, not a missing one: a class that runs an assignment
   * open-ended until the class itself closes has not skipped a step.
   *
   * There is deliberately no reminder, no late flag and no lock at this date; nothing in the
   * service reads it back to change what a student can do. It is stored so the builder can
   * show a teacher what they set and nothing more — a control that wrote to a field nobody
   * ever read back would be indistinguishable from a control that wrote nowhere at all, and
   * the assignment builder's own reference is explicit that a date picker must not be drawn
   * over a field that does not exist. This is the honest alternative to that: the field is
   * real, it round-trips, and what it does not yet do is enforce anything.
   */
  dueAt?: number;
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
  /**
   * The answer to the teacher's own closing question, kept apart from everything BOW measures.
   *
   * Not in `log`, so no observer can see it. Not in `reasoningPoints` or `reasoningCriteria`,
   * which are the canonical reasoning a rubric scores — a teacher reading this is reading
   * their own question's answer, and whatever they think of it may not move a competency.
   * §37: *do not let arbitrary custom prompts silently alter canonical BOW evidence.*
   */
  closingAnswer?: ClosingAnswer;
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
  /** Present only when the assignment carried a closing question and the student answered it. */
  closingAnswer?: ClosingAnswer;
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
