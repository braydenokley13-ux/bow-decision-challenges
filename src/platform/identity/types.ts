import type { WorldId } from "../../domain/core/ids";

/**
 * Who is who, and the deliberate shape of what BOW is willing to know about them.
 *
 * The organising decision in this file is that **a student account holds no personal
 * information at all**. It is an id and a credential. Every human-readable label lives on a
 * `RosterEntry`, which belongs to a class, which belongs to a teacher — so the only name in
 * the system is one a teacher typed, about their own students, in their own class, and it
 * is deleted when that class is. BOW does not ask for, store, or have any way to learn a
 * student's real name, email address, birthday, school or device.
 *
 * That is not a privacy flourish. It is what makes the answer to a district's §2-d question
 * short: the student record a vendor holds is `{ id, createdAt }`, and the labels are the
 * district's own data held on the district's own teacher's class.
 *
 * The second decision is that **the roster names seats rather than replacing them.** Every
 * piece of evidence this product has ever stored is keyed by `(classCode, seatCode)`, and a
 * roster that introduced a second identifier would have made every stored submission
 * ambiguous. A `RosterEntry` is a seat with a name on it, so a class that has no roster
 * still reads exactly as it did — as seats — and a class that has one reads as people
 * without a single stored record changing meaning.
 */

/**
 * How long a session lasts, and why there are two answers for a student.
 *
 * A school Chromebook cart is the normal case, not the exception, and the failure it
 * produces is specific: the next student sits down inside the last one's session and their
 * work is filed under somebody else's name. So a student says once whether the device is
 * theirs, the answer defaults to **shared**, and a shared session is measured in hours
 * rather than weeks. A student on their own laptop is asked once and then left alone.
 */
export const SHARED_DEVICE_SESSION_HOURS = 10;
export const OWN_DEVICE_SESSION_DAYS = 45;
export const TEACHER_SESSION_DAYS = 30;

export type DeviceClass = "shared" | "own";

/** A class cannot hold more seats than a room does. Also the abuse ceiling. */
export const MAX_ROSTER_SIZE = 60;

/** What a teacher may type as a label. Long enough for "Alexandra V.", short enough to scan. */
export const MAX_DISPLAY_NAME = 40;

/**
 * A teacher's account.
 *
 * The email address is the only piece of adult contact information in the product, it is
 * the sign-in identifier and nothing else, and it is never shown to a student. There is no
 * name field: BOW has no use for a teacher's name, so it does not have one.
 */
export interface TeacherAccount {
  id: string;
  /** Lower-cased and trimmed at the boundary, so one person cannot hold two accounts. */
  email: string;
  createdAt: number;
  /**
   * Raised to invalidate every session this account currently holds.
   *
   * Absent means zero. It is a counter rather than a list of live sessions because the
   * operation anybody actually asks for is "sign me out everywhere", and that is one write
   * here instead of a table read on every request for the rest of the term.
   */
  sessionGeneration?: number;
}

/**
 * A student's account. This is the whole record.
 *
 * No name. No email. No class — a student can be on the roster of several classes and this
 * record does not change. `createdAt` exists because a record with no timestamp cannot be
 * expired, and expiry is the only thing that makes retention a promise rather than a claim.
 */
export interface StudentAccount {
  id: string;
  createdAt: number;
  /** Raised to sign this student out of every device at once. Absent means zero. */
  sessionGeneration?: number;
}

/**
 * One seat on one class's roster, with the label its teacher gave it.
 *
 * `studentId` is null until a student claims the seat. Claiming is what turns a printed card
 * into an account: the join code on the card is checked against `joinCodeHash`, and from
 * then on that seat's work belongs to that account on any device.
 *
 * `removedAt` rather than deletion, because a student who is removed from a class has still
 * done work in it, and a teacher who removes the wrong row should be able to see what they
 * did. Removed rows are hidden from every surface and refuse every sign-in.
 */
export interface RosterEntry {
  id: string;
  classCode: string;
  /** The seat this row names. The join to every piece of evidence the class holds. */
  seatCode: string;
  /** What the teacher typed. BOW does not know whether it is a real name. */
  displayName: string;
  studentId: string | null;
  addedAt: number;
  claimedAt?: number;
  removedAt?: number;
}

/** A roster row as a student may see it before they have proved who they are: no ids, no codes. */
export interface RosterChoice {
  seatCode: string;
  displayName: string;
  /** Whether somebody is already signed in on this seat, so a student can tell theirs apart. */
  claimed: boolean;
}

/** The card a teacher prints and hands out. The join code appears here and nowhere else, once. */
export interface JoinCard {
  seatCode: string;
  displayName: string;
  joinCode: string;
}

/**
 * How a class lets students in.
 *
 * `roster` is the default and the one a teacher should use: they paste their class list, BOW
 * prints cards, and every piece of work has a name on it from the first second.
 * `open` exists for the teacher who has four minutes and no list — students type their own
 * label and are given a seat. It still mints a real account and a real session, so there is
 * no path through this product that writes evidence without one.
 */
export type ClassJoinMode = "roster" | "open";

/**
 * A student's attempt, as the service holds it.
 *
 * This is the record that makes a class visible while it is happening rather than only after
 * it is over, and it is the smallest thing that can do that: which world, which screen, when
 * it started, when it was last touched, and the attempt itself so another device can pick it
 * up. There is no clickstream, no timing telemetry and no per-interaction log — the stage and
 * two timestamps are what a teacher can act on, and anything finer would be surveillance
 * bought with nothing.
 */
export interface AttemptCheckpoint {
  classCode: string;
  seatCode: string;
  studentId: string;
  assignmentId: string;
  worldId: WorldId;
  /** The screen the student is on, in the world's own vocabulary. */
  stage: string;
  startedAt: number;
  updatedAt: number;
  /** Set when the attempt has been turned in, so a checkpoint never outranks a submission. */
  submittedAt?: number;
  /** The opaque attempt, as the world's own machine wrote it. The service never reads inside. */
  payload: unknown;
}

/** What a teacher sees about a seat that has not turned anything in. */
export interface ProgressRow {
  seatCode: string;
  worldId: WorldId;
  stage: string;
  startedAt: number;
  updatedAt: number;
}

/**
 * A teacher's response to one student's work.
 *
 * Deliberately one short message per attempt rather than a thread. The loop this closes is
 * "the student finds out what their teacher thought"; a conversation is a different product,
 * and building it here would make BOW into a messaging system nobody asked for.
 */
export interface TeacherFeedback {
  classCode: string;
  seatCode: string;
  sessionId: string;
  body: string;
  at: number;
  /** Whether the teacher wants to talk to this student rather than only write to them. */
  flagged: boolean;
}

export const MAX_FEEDBACK_LENGTH = 400;

/**
 * One piece of student work a teacher has chosen to put in front of the room.
 *
 * Nothing is shared by default and nothing is shared automatically. A share-out item exists
 * only because a teacher selected it, and it carries the teacher's reason for selecting it —
 * which is the part that turns a wall of responses into a sequence worth discussing.
 */
export interface ShareOutItem {
  sessionId: string;
  seatCode: string;
  /** Why this one, in the teacher's words. Shown to them while presenting, never to the room. */
  note: string;
  order: number;
}

export interface ShareOutSelection {
  classCode: string;
  items: readonly ShareOutItem[];
  /** Whether names are hidden when the selection is projected. Hidden unless a teacher says otherwise. */
  named: boolean;
  updatedAt: number;
}

export type IdentityErrorCode =
  | "email_taken"
  | "bad_credentials"
  | "no_session"
  | "seat_taken"
  | "seat_not_found"
  | "roster_full"
  | "join_closed"
  | "too_many_attempts";

/** What a person is told, in words that say what to do next. */
export const IDENTITY_ERROR_MESSAGES: Record<IdentityErrorCode, string> = {
  email_taken: "There is already an account with that email. Sign in instead.",
  bad_credentials: "That did not match. Check it and try again.",
  no_session: "You are signed out. Sign in again to carry on.",
  seat_taken: "Somebody is already signed in as that name. Ask your teacher.",
  seat_not_found: "That name is not on this class list. Check with your teacher.",
  roster_full: `A class holds up to ${MAX_ROSTER_SIZE} students.`,
  join_closed: "This class is not letting new students in. Ask your teacher.",
  too_many_attempts: "Too many tries. Wait a minute and try again.",
};
