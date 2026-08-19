import { useCallback, useState } from "react";

/**
 * Whether this student wants the screen read to them, remembered on their own machine.
 *
 * Three things are true of it on purpose.
 *
 * **It is the student's, not the class's.** There is no teacher setting behind it, no
 * accommodation profile, and nothing to administer. A child who needs the screen read presses
 * the control and it is on; nobody grants it to them and nobody has to be asked.
 *
 * **It is never recorded.** It is not in the evidence log, it is not in a checkpoint, and it
 * does not reach the teacher's surface. Whether a student used read-aloud is not evidence
 * about their financial decision-making, and a product that filed it next to evidence that is
 * would be inviting a reader to weigh one against the other. `noRecording.test.ts` holds that:
 * nothing in this directory may import the transport, the evidence types or either world's
 * context.
 *
 * **It stays on the device.** `localStorage`, one key, no request. A student who moves to a
 * different Chromebook presses the control again — which is the price of not having a record
 * of it anywhere, and the right way round.
 *
 * The shared-Chromebook case is worth naming rather than leaving to be found: the preference
 * outlives one child's session, so the next child to sit down meets the tools open if the last
 * one left them open. Pressing once puts them back. The alternative — clearing it when a seat
 * is handed over — would take the accommodation away from the student it belongs to every time
 * a lesson ended, and this is the trade that costs a child less.
 */

const KEY = "bow.reading.v1";

export interface ReadingPreference {
  /** Whether the tools are showing more than the one control that opens them. */
  toolsOpen: boolean;
  /** Whether each new screen starts reading itself. */
  readEveryScreen: boolean;
}

export const DEFAULT_PREFERENCE: ReadingPreference = { toolsOpen: false, readEveryScreen: false };

/** Storage throws in private modes and when a device is full. Neither is the student's problem. */
function safely<T>(work: () => T, fallback: T): T {
  try {
    return work();
  } catch {
    return fallback;
  }
}

export function readPreference(): ReadingPreference {
  return safely(() => {
    if (typeof window === "undefined") return DEFAULT_PREFERENCE;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCE;
    const held = JSON.parse(raw) as Partial<ReadingPreference>;
    return {
      toolsOpen: held.toolsOpen === true,
      readEveryScreen: held.readEveryScreen === true,
    };
  }, DEFAULT_PREFERENCE);
}

export function writePreference(preference: ReadingPreference): void {
  safely(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(preference));
  }, undefined);
}

/** Forgets it. Nothing calls this yet; a hand-over flow that wants to is welcome to. */
export function forgetPreference(): void {
  safely(() => window.localStorage.removeItem(KEY), undefined);
}

export function useReadingPreference(): [ReadingPreference, (patch: Partial<ReadingPreference>) => void] {
  // Read once, as the initial state. The app is created with `createRoot` and never rendered
  // on a server, so there is no hydration to disagree with — and a student who has asked for
  // the tools should not watch them appear a frame after the screen does.
  const [preference, setPreference] = useState<ReadingPreference>(readPreference);
  const update = useCallback((patch: Partial<ReadingPreference>) => {
    setPreference((current) => {
      const next = { ...current, ...patch };
      writePreference(next);
      return next;
    });
  }, []);
  return [preference, update];
}
