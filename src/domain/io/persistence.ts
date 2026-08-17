import { isKnownWorld, type WorldId } from "../core/ids";
import type { StageId } from "../evidence/types";
import { DEFAULT_WORLD_ID, isPlayableWorld, stagesFor } from "../scenario/registry";
import { attemptKeyFor, PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";

/**
 * The part of an attempt the store has to understand, whatever world wrote it.
 *
 * A world's state is the world's own — Basketball's carries setups and plan modes, Run the
 * Pop-Up's carries trays and Saturdays — and the store has no business knowing either. What it
 * checks is the envelope: which challenge, which world, which screen, and that the two arrays
 * every world keeps are arrays. Anything narrower would mean the store could only ever hold
 * the shape it was written against.
 */
export interface PersistedAttempt {
  meta: {
    schemaVersion: 1;
    challengeId: string;
    worldId: WorldId;
    assignmentId?: string;
  };
  stage: StageId;
  log: unknown[];
  snapshots: unknown[];
}

/**
 * Where a student's in-progress attempt lives between page loads.
 *
 * The key is per challenge **and per world**, and both halves were learned the same way.
 * A single global `bow.student.v1.attempt` meant Challenge #2 would have opened Plan Under
 * Pressure's attempt, failed to recognise the shape, and backed it up as unreadable —
 * destroying work that belonged to a challenge the student was not playing.
 *
 * Keying only by challenge left the identical trap one level down. Two worlds under one
 * challenge share a challenge id, so a student who started Basketball and then opened the
 * food truck would have been handed the Basketball attempt back: same key, same challenge
 * id, valid shape, wrong world — a board priced by one world's economy while the story on
 * screen came from another's. The world is in the key, and it is checked on the way out.
 *
 * A pointer records which world was last open, because the shell has to restore an attempt
 * before it knows which world the student wants. It holds a world id and nothing else.
 */
export function attemptKeyForWorld(worldId: WorldId): string {
  return `${attemptKeyFor(PLAN_UNDER_PRESSURE)}.${worldId}`;
}

/** The pre-world key. Read once, for Basketball only, so an attempt in flight survives. */
export const ATTEMPT_KEY = attemptKeyFor(PLAN_UNDER_PRESSURE);

/** The unversioned key this product shipped with, read once for the same reason. */
const LEGACY_ATTEMPT_KEY = "bow.student.v1.attempt";

/** Which world the student was last in. A single id; never state, never work. */
const LAST_WORLD_KEY = `${attemptKeyFor(PLAN_UNDER_PRESSURE)}.world`;

export function isValidPersistedAttempt(value: unknown, worldId?: WorldId): value is PersistedAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedAttempt>;
  if (candidate.meta?.schemaVersion !== 1) return false;
  if (candidate.meta.challengeId !== PLAN_UNDER_PRESSURE.id) return false;
  // An attempt from another world is not this world's attempt. It is somebody's real work, so
  // it is left exactly where it is rather than restored or backed up.
  if (worldId !== undefined && candidate.meta.worldId !== worldId) return false;
  if (typeof candidate.stage !== "string") return false;
  // A stage the current build does not know how to render would leave the student on a blank
  // screen, so an attempt carrying one is treated as unreadable and backed up rather than
  // restored. The list is the world's own: checking a second world's attempt against the first
  // world's screens would quarantine real work for being in a different story.
  const storedWorld: string = candidate.meta.worldId;
  const known = isKnownWorld(storedWorld) ? stagesFor(storedWorld) : [];
  if (!known.includes(candidate.stage)) return false;
  return Array.isArray(candidate.log) && Array.isArray(candidate.snapshots);
}

function readFrom(storage: Pick<Storage, "getItem" | "setItem">, key: string, worldId?: WorldId): PersistedAttempt | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    // An attempt saved before assignments existed carries no assignment id, and the field
    // is a string everywhere else. Defaulting it here rather than widening the type keeps
    // "this run was set nothing" as one value instead of two.
    if (isValidPersistedAttempt(parsed, worldId)) return { ...parsed, meta: { ...parsed.meta, assignmentId: parsed.meta.assignmentId ?? "" } };
    // Only unreadable work is backed up. An attempt that is simply another world's is
    // readable, is not ours, and must survive untouched.
    if (!isValidPersistedAttempt(parsed)) storage.setItem(`bow.backup.${Date.now()}`, raw);
    return null;
  } catch {
    storage.setItem(`bow.backup.${Date.now()}`, raw);
    return null;
  }
}

/**
 * The world the student was last in, or the default when nothing says otherwise.
 *
 * Checked against the ids this build knows rather than against the ones it can play. The
 * pointer is a record of what happened; whether that world can still be opened is a
 * different question, asked one function down, where refusing means starting fresh rather
 * than silently reading somebody else's key.
 */
export function lastWorldPlayed(storage: Pick<Storage, "getItem"> = window.localStorage): WorldId {
  const stored = storage.getItem(LAST_WORLD_KEY);
  return stored !== null && isKnownWorld(stored) ? stored : DEFAULT_WORLD_ID;
}

/**
 * One world's attempt, and nothing from any other world.
 *
 * The type parameter is how a caller says which world's interior it is expecting. The
 * envelope has been checked — challenge, world, a stage that world knows, the two arrays —
 * and the interior belongs to the world, so only that world's own shell asks for it. A caller
 * that names the wrong world gets `null`, because the world id is checked before anything is
 * handed back.
 */
export function loadAttemptFor<T extends PersistedAttempt = PersistedAttempt>(
  worldId: WorldId,
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): T | null {
  // A world this build cannot render is a world whose attempt must not be restored: the
  // student would land on a board with no story behind it, priced by a fallback economy.
  if (!isPlayableWorld(worldId)) return null;
  const current = readFrom(storage, attemptKeyForWorld(worldId), worldId);
  if (current) return current as T;
  // The two pre-world keys belong to Basketball, because Basketball is the only world that
  // existed when they were written. A second world may not inherit them.
  if (worldId !== DEFAULT_WORLD_ID) return null;
  return (readFrom(storage, ATTEMPT_KEY, worldId) ?? readFrom(storage, LEGACY_ATTEMPT_KEY, worldId)) as T | null;
}

/**
 * Whatever world the student was last in.
 *
 * It returns the envelope rather than a particular world's state, and that is not a
 * convenience: with two worlds in one browser, a shell that assumed the answer was
 * Basketball's would hand a food-truck attempt to Basketball's reducer — the same board,
 * priced by the wrong economy, writing evidence about a game nobody played. A caller reads
 * `meta.worldId` first and then asks for that world's own shape.
 */
export function loadAttempt(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage): PersistedAttempt | null {
  return loadAttemptFor(lastWorldPlayed(storage), storage);
}

export function saveAttempt(state: PersistedAttempt, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  storage.setItem(attemptKeyForWorld(state.meta.worldId), JSON.stringify(state));
  storage.setItem(LAST_WORLD_KEY, state.meta.worldId);
}
