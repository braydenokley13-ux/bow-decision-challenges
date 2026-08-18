import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { Assignment } from "../platform/classes/types";
import type { DeviceClass, RosterChoice } from "../platform/identity/types";
import type { WorldId } from "../domain/core/ids";

/**
 * A student, as their own browser knows them.
 *
 * One token and the seat it opens, and nothing else. Deliberately not the place a name is
 * cached: the label belongs to the teacher's class and is read back from the service, so a
 * teacher who corrects a spelling on Monday does not leave a stale name on a Chromebook for
 * the rest of the term.
 *
 * The token is held in `localStorage` rather than a cookie because this product is a static
 * bundle talking to an API that may not be on the same registrable domain, and a cookie that
 * a district's browser policy drops silently is a sign-in that fails for reasons nobody can
 * see. What makes that safe enough is the other end: the token carries a session generation,
 * so a teacher can end every session in their class in one action, and a shared-device
 * session is measured in hours rather than weeks.
 */

const TOKEN_KEY = "bow.student.v1.token";

export function studentToken(storage: Pick<Storage, "getItem"> = window.localStorage): string | null {
  return storage.getItem(TOKEN_KEY);
}

export function rememberStudent(token: string, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  storage.setItem(TOKEN_KEY, token);
}

export function forgetStudent(storage: Pick<Storage, "removeItem"> = window.localStorage): void {
  storage.removeItem(TOKEN_KEY);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<{ ok: true; body: T } | { ok: false; message: string }> {
  const token = studentToken();
  try {
    const response = await fetch(`${CLASS_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

/** What a student sees before they have proved anything: the names, and nothing else. */
export interface ClassDoor {
  roster: RosterChoice[];
  joinMode: "roster" | "open";
  label: string;
}

export function readClassDoor(classCode: string) {
  return call<ClassDoor>(`/classes/${classCode.toUpperCase()}/roster`);
}

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
  seatCode?: string;
  joinCode?: string;
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
  assignments: Assignment[];
  inProgress: { worldId: WorldId; stage: string; updatedAt: number } | null;
  completed: { sessionId: string; submittedAt: number; worldId: WorldId | null }[];
  /** What a teacher wrote back. The half of the loop that did not exist. */
  feedback: { body: string; at: number; sessionId: string }[];
}

export function readMyClasses() {
  return call<{ classes: StudentClass[] }>("/me/classes");
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
  assignmentId?: string;
  payload: unknown;
}) {
  return call<{ savedAt: number }>("/me/attempt", { method: "PUT", body: JSON.stringify(input) });
}
