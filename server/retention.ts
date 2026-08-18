import type { ClassStore } from "./store";

/**
 * The 120 days, executed.
 *
 * The README has always said a class is kept for 120 days and then deleted. A vendor review
 * found nothing that did it: `deleteClass` had exactly one caller — the manual route — and
 * reads merely gated on `expiresAt` and answered 404. The data was hidden, not deleted, so a
 * self-hosted district accumulated children's names, their written explanations and their
 * teachers' notes on disk indefinitely while the product told them it did not.
 *
 * That is the exact contradiction this codebase condemns everywhere else, and it is also an
 * affirmative obligation rather than a nicety: COPPA's rule is that personal information from
 * a child may not be retained indefinitely and must go when it is no longer needed for the
 * purpose it was collected for.
 *
 * Two shapes, because two deployments. A long-running server sweeps on a timer. A serverless
 * one has no timer to run, so it sweeps opportunistically — at most once an hour per process,
 * off the back of a request that was happening anyway, and never in the request's own path.
 */

export interface SweepResult {
  /** Classes whose retention window had passed and whose data is now gone. */
  deleted: readonly string[];
  at: number;
}

export async function sweepExpiredClasses(store: ClassStore, now: number = Date.now()): Promise<SweepResult> {
  const codes = await store.expiredClassCodes(now);
  const deleted: string[] = [];
  for (const code of codes) {
    // One failure does not stop the sweep. A class that cannot be deleted this hour is a class
    // that will be found again next hour, and stopping would leave every class after it.
    try {
      await store.deleteClass(code);
      deleted.push(code);
    } catch { /* reported by the count, retried on the next sweep */ }
  }
  return { deleted, at: now };
}

const HOUR = 60 * 60 * 1000;

/**
 * The last time this process swept, so a health check can report it.
 *
 * A retention control nobody can see the state of is one a district has to take on trust, and
 * the whole point of this file is that the promise stops being a matter of trust.
 */
let lastSweep: SweepResult | null = null;

export function lastSweepResult(): SweepResult | null {
  return lastSweep;
}

/** Sweeps if it has been an hour, and never blocks the request that triggered it. */
export function sweepIfDue(store: ClassStore, now: number = Date.now()): void {
  if (lastSweep && now - lastSweep.at < HOUR) return;
  // Claimed before the await, so a burst of requests starts one sweep rather than thirty.
  lastSweep = { deleted: [], at: now };
  void sweepExpiredClasses(store, now)
    .then((result) => { lastSweep = result; })
    .catch(() => { /* the next hour tries again */ });
}

/** A long-running server's own timer. Returns the handle so a test can stop it. */
export function startRetentionSweep(store: ClassStore, everyMs = HOUR): NodeJS.Timeout {
  const timer = setInterval(() => {
    void sweepExpiredClasses(store).then((result) => { lastSweep = result; }).catch(() => undefined);
  }, everyMs);
  // A sweep must never be the reason a process stays alive.
  timer.unref?.();
  return timer;
}
