import type { ChallengeState } from "../machine/state";
import { STAGE_ORDER } from "../machine/stages";
import { attemptKeyFor, PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";

/**
 * Where a student's in-progress attempt lives between page loads.
 *
 * The key is per challenge. A single global `bow.student.v1.attempt` meant Challenge #2
 * would have opened Plan Under Pressure's attempt, failed to recognise the shape, and
 * backed it up as unreadable — destroying work that belonged to a challenge the student
 * was not playing. Keying by challenge id costs nothing now and cannot be retrofitted
 * safely once real attempts exist in the wild.
 */
export const ATTEMPT_KEY = attemptKeyFor(PLAN_UNDER_PRESSURE);

/** The unversioned key this product shipped with, read once so an attempt in flight survives. */
const LEGACY_ATTEMPT_KEY = "bow.student.v1.attempt";

export function isValidPersistedAttempt(value: unknown): value is ChallengeState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChallengeState>;
  return candidate.meta?.schemaVersion === 1
    && candidate.meta.challengeId === PLAN_UNDER_PRESSURE.id
    // A stage the current build does not know how to render would leave the student
    // on a blank screen, so an attempt carrying one is treated as unreadable and
    // backed up rather than restored.
    && typeof candidate.stage === "string"
    && STAGE_ORDER.includes(candidate.stage)
    && Array.isArray(candidate.log)
    && Array.isArray(candidate.snapshots);
}

function readFrom(storage: Pick<Storage, "getItem" | "setItem">, key: string): ChallengeState | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidPersistedAttempt(parsed)) return parsed;
    storage.setItem(`bow.backup.${Date.now()}`, raw);
    return null;
  } catch {
    storage.setItem(`bow.backup.${Date.now()}`, raw);
    return null;
  }
}

export function loadAttempt(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage): ChallengeState | null {
  const current = readFrom(storage, ATTEMPT_KEY);
  if (current) return current;
  // A student mid-attempt when this shipped keeps their work; it re-saves under the new
  // key on the next state change.
  return readFrom(storage, LEGACY_ATTEMPT_KEY);
}

export function saveAttempt(state: ChallengeState, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  storage.setItem(ATTEMPT_KEY, JSON.stringify(state));
}
