import { isKnownWorld, type WorldId } from "../domain/core/ids";
import type { EvidenceEvent } from "../domain/evidence/types";
import { loadAttemptFor } from "../domain/io/persistence";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";
import { recapFor, type RunRecap } from "../domain/recap";

/**
 * Finding the log a finished run was written from, so a student can be told what it holds.
 *
 * **This is the seam that is not finished, and it is the service's half rather than this
 * one's.** A submitted run's event log is on the server — `SubmissionRecord.log`, which is
 * what the teacher's evidence page reads — and `GET /me/classes` does not return it to the
 * student who wrote it. It returns `{ sessionId, submittedAt, worldId }` per completed run
 * and nothing else. So this reads the copy the browser still holds from playing the run,
 * and matches it by session id, and says plainly when it is not there.
 *
 * The match is exact and it is the security property, not a nicety: the recap is built only
 * from events whose own `sessionId` is the one being asked for. A machine holding another
 * student's attempt — a shared Chromebook, a second seat on the same trolley — produces
 * `not-on-this-device` rather than somebody else's run under this student's name.
 *
 * What that costs today, honestly: a student who turned in on the class laptop and opens
 * this at home gets the "not on this device" screen, and so does one whose browser data was
 * cleared, and so does one who has since started a second run in the same world. That is a
 * real hole and the fix is one field on an endpoint — see the note in the report.
 */

export type CompletedRunSource =
  | { status: "ready"; recap: RunRecap }
  /** The run is real; the log it was written from is not on this machine. */
  | { status: "not-on-this-device" }
  /** A world this build has no narrator for. Never guessed at. */
  | { status: "no-recap" };

type Storage = Pick<globalThis.Storage, "getItem" | "setItem"> & Partial<globalThis.Storage>;

interface Stored { meta?: { worldId?: unknown }; log?: unknown }

function logOf(value: unknown): EvidenceEvent[] {
  const attempt = value as Stored | null;
  return Array.isArray(attempt?.log) ? (attempt.log as EvidenceEvent[]) : [];
}

/**
 * The recap for one finished run, or the reason there is not one.
 *
 * `worldId` comes from the class service, which reads it off the first event of the stored
 * submission. It can be null for a log written before worlds existed; that is a run with no
 * world to narrate rather than a run to guess about.
 */
export function completedRunSource(
  sessionId: string,
  worldId: WorldId | null,
  storage: Storage = window.localStorage,
): CompletedRunSource {
  if (worldId === null || !isKnownWorld(worldId)) return { status: "no-recap" };
  // Every world's attempt is checked, not only the one the service named. A student who
  // played the market and then opened the season leaves two attempts behind, and the one
  // holding this session is the one that answers — the session id decides, never the key.
  for (const world of PLAYABLE_WORLDS) {
    const log = logOf(loadAttemptFor(world.id, storage));
    if (!log.some((event) => event.sessionId === sessionId)) continue;
    const recap = recapFor(worldId, sessionId, log);
    if (recap) return { status: "ready", recap };
  }
  return { status: "not-on-this-device" };
}
