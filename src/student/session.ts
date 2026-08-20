import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { Assignment } from "../platform/classes/types";
import type { ClassDoor, DeviceClass } from "../platform/identity/types";
import {
  forgetStudent, joinCodeHeld, rememberJoinCode, rememberStudent, rememberStudentId, studentAuthHeaders, studentIdHeld, studentToken,
} from "../platform/identity/token";
import type { WorldId } from "../domain/core/ids";

/**
 * A student, as their own browser knows them.
 *
 * One token and the seat it opens, and nothing else. Deliberately not the place a name is
 * cached: the label belongs to the teacher's class and is read back from the service, so a
 * teacher who corrects a spelling on Monday does not leave a stale name on a Chromebook for
 * the rest of the term.
 *
 * The token itself lives one layer down, in `platform/identity/token`, because the evidence
 * transport needs to send it too — a rostered class refuses work that cannot say who it is
 * from. These re-exports are the student screens' own way in.
 */

export { forgetStudent, joinCodeHeld, rememberJoinCode, rememberStudent, rememberStudentId, studentIdHeld, studentToken };

async function call<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; body: T } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${CLASS_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...studentAuthHeaders(),
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : null;
    if (response.ok) return { ok: true, body: body as T };
    const message = typeof (body as { message?: unknown })?.message === "string"
      ? (body as { message: string }).message
      : "Something went wrong. Try again.";
    return { ok: false, message };
  } catch {
    return { ok: false, message: "No connection. Check the wifi and try again." };
  }
}

/**
 * What a student is told before they have proved anything: the class's own label, and how it
 * lets people in. Deliberately not the class list — see `ClassDoor` for why.
 */
export function readClassDoor(classCode: string) {
  return call<ClassDoor>(`/classes/${classCode.toUpperCase()}/roster`);
}

export type { ClassDoor };

export interface JoinedStudent {
  studentId: string;
  seatCode: string;
  displayName: string;
  token: string;
  classCode: string;
  label: string;
  /** Handed back once on an open join, so a student who loses their session can get back in. */
  joinCode?: string;
}

export function claimSeat(input: {
  classCode: string;
  /** The code on the card. It resolves the seat by itself; there is nothing else to send. */
  joinCode?: string;
  /** Only for an open class, and only for somebody who has never been in it before. */
  displayName?: string;
  device: DeviceClass;
}) {
  return call<JoinedStudent>(`/classes/${input.classCode.toUpperCase()}/join`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface StudentClass {
  classCode: string;
  label: string;
  seatCode: string;
  displayName: string;
  /** What this seat was set, minus anything set for other seats. */
  assignments: Assignment[];
  /**
   * Whether the class holds no assignment at all — a different fact from "none for this seat".
   *
   * Most classes are in this state: `Assignment` is newer than the class service, and a teacher
   * who has not opened the builder has set nothing. The run treats such a class as *every world,
   * student chooses* (`StudentChallenge.tsx`), so the student's screen draws one card saying
   * exactly that rather than inventing a title. Absent from an older service, which reads as
   * `false` — the same as it behaved before this field existed.
   */
  nothingSetYet?: boolean;
  /**
   * The run this seat has open, and which piece of work it belongs to.
   *
   * `assignmentId` is what lets a class holding two assignments say *which one* is in
   * progress. It is absent on a checkpoint written before the client sent one, and the screen
   * treats that as "the oldest assignment" rather than as "no assignment" — the same fallback
   * the service uses when attributing a submission that named none.
   */
  inProgress: { worldId: WorldId; stage: string; updatedAt: number; assignmentId?: string } | null;
  completed: { sessionId: string; submittedAt: number; worldId: WorldId | null; assignmentId?: string }[];
  /**
   * What a teacher wrote back — every note, oldest first, not just the last one.
   *
   * It was one note per attempt for as long as the store held one, which meant a teacher who
   * added a second thought overwrote the first and the student never saw it. `editedAt` is
   * set when the teacher rewrote a note they had already sent; notes they took back are not
   * in this list at all.
   */
  feedback: { id: string; body: string; at: number; sessionId: string; editedAt?: number }[];
}

/**
 * Who is signed in here, and what they are in.
 *
 * `student` is answered from the token rather than from the class list, so a student with no
 * roster row still has a name on their own screen. It is deliberately not cached anywhere on
 * the device — see the note at the top of this file.
 */
export interface MyClasses {
  student?: { displayName: string | null };
  classes: StudentClass[];
}

export function readMyClasses() {
  return call<MyClasses>("/me/classes");
}

/** The attempt this student left behind in this class, from any device. */
export function readMyAttempt(classCode: string) {
  return call<{ attempt: { worldId: WorldId; stage: string; payload: unknown } | null; seatCode: string }>(
    `/me/attempt?classCode=${encodeURIComponent(classCode.toUpperCase())}`,
  );
}

export function checkpointAttempt(input: {
  classCode: string;
  worldId: WorldId;
  stage: string;
  sessionId: string;
  assignmentId?: string;
  payload: unknown;
}) {
  return call<{ savedAt: number }>("/me/attempt", { method: "PUT", body: JSON.stringify(input) });
}
