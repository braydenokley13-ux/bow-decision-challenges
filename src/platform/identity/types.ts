import type { WorldId } from "../../domain/core/ids";

/**
 * Who is who, and the deliberate shape of what BOW is willing to know about them.
 *
 * The organising decision in this file is that **a student account holds no personal
 * information at all**. `StudentAccount` is an id, a timestamp and a session counter — an
 * identity rather than a description of a person, and nothing on it says who the person is.
 *
 * Every human-readable label lives on a `RosterEntry` instead, which belongs to a class,
 * which belongs to a teacher. It gets there through one of two doors, and this comment named
 * only the first: *"the only name in the system is one a teacher typed"*. Either the teacher
 * pasted their class list, or the class has no list and the student typed a first name at
 * `/join` — which is what `selfNamed` records, twenty-five lines below the sentence that
 * denied it. Both write the same row, and BOW cannot tell whether either is a real name
 * because it never checks one against anything.
 *
 * What is true of both doors is the shape, and the shape is the whole of what may be said: a
 * first name, against a seat, in one teacher's class. It is handed back to that teacher's
 * account or to whoever holds that class's key (`opensClass`) and to nobody else — the
 * unauthenticated door answers a class code with the label and the join mode and no roster at
 * all. It is sealed at rest (`server/vault.ts`), and it goes when the class goes.
 *
 * The reassurance that survives unqualified is about the fields that are not here. A student
 * is asked for no email address, no password and no birthday, on any screen, and there is no
 * such field on any student surface to ask with. The one thing BOW does learn about the
 * machine is whether it is shared (`DeviceClass`, below, asked once at the door so that a cart
 * Chromebook does not leave one child sitting inside the last one's session).
 *
 * What is deliberately not written here is a compliance claim. This file describes what is
 * stored; whether that satisfies any particular law, framework or district is a judgement for
 * the people who make it, on evidence, and a comment asserting the answer would be the same
 * class of defect as the sentence above it — a reassuring line nobody had checked.
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
 * One seat on one class's roster, with the label somebody put on it.
 *
 * Somebody, not the teacher: `selfNamed` below is the field that says which, and the two are
 * stored identically because nothing downstream may treat a child's own first name as less of
 * a name than the one their teacher pasted.
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
  /** What the teacher pasted, or what the student typed. Neither is checked against anything. */
  displayName: string;
  studentId: string | null;
  addedAt: number;
  claimedAt?: number;
  removedAt?: number;
  /**
   * Whether this row was written by the student rather than by their teacher.
   *
   * It is the difference between a class list and a class that has not got one. Join mode used
   * to be derived from "does this class have any roster rows", which meant the first student to
   * type their own name into an open class turned it into a roster class — and the second
   * student arrived at a list of one name that was not theirs, with no way to add themselves
   * and a card they had never been given.
   */
  selfNamed?: boolean;
}

/**
 * What a student is told about the class before they have proved anything.
 *
 * Names are conspicuously not in it. The door used to answer any five-character code with the
 * whole class list — and a class code is written on a whiteboard, read aloud, photographed and
 * typed into group chats, so that published a roster of children's first names to anyone who
 * had ever been in the room or seen a picture of it. There is no version of that a district
 * vendor review should accept, and the product did not need it: a student types the code on
 * their card, and BOW answers with the one name that code belongs to.
 */
export interface ClassDoor {
  label: string;
  joinMode: ClassJoinMode;
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
  /**
   * Which attempt this is. Not read into — the service still never looks inside `payload` —
   * but held beside it, because "has this been turned in" is a fact about one attempt and a
   * student who starts a second run needs the answer to become no again.
   */
  sessionId?: string;
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
 * One note a teacher wrote about one attempt.
 *
 * **A note, not the note.** This was stored one record per `(classCode, seatCode, sessionId)`,
 * so the second thing a teacher wrote about a piece of work destroyed the first: two writes,
 * two `201`s, one file, and the student read only the later one. The earlier note was never
 * seen by anybody and no longer existed anywhere. Both surfaces already implied otherwise —
 * the composer labels the second write "Say something else" and the student's home renders
 * feedback as a list — so the only thing that disagreed was the store.
 *
 * So an attempt carries a **sequence** of notes, each with its own `id` and its own `at`, and
 * the student gets all of them. That is still not a thread: a student cannot write back, and
 * there is nothing here for them to write into. It is the difference between a teacher being
 * able to add "and check Week 5" the next morning and a teacher silently deleting what they
 * said yesterday.
 *
 * `editedAt` and `deletedAt` are what "I mistyped" means. Editing rewrites a note in place —
 * same id, same position in the sequence — because a typo fix must not arrive as a second
 * message. Deleting sets `deletedAt` and the student stops seeing it, while the teacher keeps
 * the row, the same way a removed roster entry keeps what that student did: a teacher who
 * takes back the wrong sentence should be able to see what they took back.
 */
export interface TeacherFeedback {
  /**
   * Unique per note. Absent on every record written before feedback was a sequence; those
   * are read back with their old storage key as their id, so the one note a teacher wrote
   * under the old model still exists, still reaches its student, and can still be edited.
   */
  id: string;
  classCode: string;
  seatCode: string;
  sessionId: string;
  body: string;
  at: number;
  /** When this note was last rewritten by its author. Absent means it says what it first said. */
  editedAt?: number;
  /** When the teacher took it back. Hidden from the student from that moment; kept for the teacher. */
  deletedAt?: number;
  /** Whether the teacher wants to talk to this student rather than only write to them. */
  flagged: boolean;
}

/**
 * How long one note may be, and why it is not 400.
 *
 * At 400 a teacher writing the paragraph this feature exists for stopped being able to type
 * mid-sentence, and a longer note sent by API was cut to 400 mid-word and answered `201` — the
 * teacher was told their note had been delivered and the student read three quarters of it.
 * 1,200 is a long paragraph, comfortably past what anybody writes into a box beside a
 * student's work, and still short enough that no note is a file. The server refuses what is
 * over it rather than trimming it, because a truncated note is worse than a rejected one:
 * a rejected note is still in the teacher's hands.
 */
export const MAX_FEEDBACK_LENGTH = 1200;

/** Notes one attempt may carry. A ceiling, not a target — nothing legitimate comes near it. */
export const MAX_FEEDBACK_NOTES = 20;

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
  | "seat_removed"
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
  /* A real card for a seat their teacher took off the list. It is the one case where "that did
     not match" would send a student off to check a code that is perfectly correct, so it says
     what actually happened and who can undo it. */
  seat_removed: "You are not on this class list any more. Ask your teacher.",
  roster_full: `A class holds up to ${MAX_ROSTER_SIZE} students.`,
  join_closed: "This class is not letting new students in. Ask your teacher.",
  /* Ten, because the window is ten. It used to say "wait a minute" while holding the door shut
     for ten of them, which is how a room decides the product is broken. */
  too_many_attempts: "Too many tries from this school's network. Wait ten minutes, or ask your teacher.",
};
