import type { ChallengeState } from "../machine/state";
import { STAGE_ORDER } from "../machine/stages";

export const ATTEMPT_KEY = "bow.student.v1.attempt";

export function isValidPersistedAttempt(value: unknown): value is ChallengeState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChallengeState>;
  return candidate.meta?.schemaVersion === 1
    && candidate.meta.challengeId === "plan-under-pressure"
    // A stage the current build does not know how to render would leave the student
    // on a blank screen, so an attempt carrying one is treated as unreadable and
    // backed up rather than restored.
    && typeof candidate.stage === "string"
    && STAGE_ORDER.includes(candidate.stage)
    && Array.isArray(candidate.log)
    && Array.isArray(candidate.snapshots);
}

export function loadAttempt(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage): ChallengeState | null {
  const raw = storage.getItem(ATTEMPT_KEY);
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

export function saveAttempt(state: ChallengeState, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  storage.setItem(ATTEMPT_KEY, JSON.stringify(state));
}
