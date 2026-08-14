import type { EvidenceEvent } from "../../domain/evidence/types";

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

export interface SubmissionRecord {
  classCode: string;
  seatCode: string;
  sessionId: string;
  challengeId: string;
  challengeVersion: string;
  submittedAt: number;
  /** Educator-scored reasoning, written back after review. Null until a person scores it. */
  reasoningPoints: number | null;
  log: EvidenceEvent[];
}

/** What a student sends. The service stamps everything else. */
export interface EvidenceSubmission {
  classCode: string;
  seatCode: string;
  sessionId: string;
  challengeId: string;
  challengeVersion: string;
  log: EvidenceEvent[];
}

export type ClassErrorCode =
  | "class_not_found"
  | "class_expired"
  | "code_taken"
  | "not_authorised"
  | "bad_request"
  | "challenge_mismatch"
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
  unavailable: "The class service is not reachable right now.",
};

/** How long a class and its evidence are kept before the service drops them. */
export const CLASS_RETENTION_DAYS = 120;
