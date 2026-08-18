import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { WorldId } from "../domain/core/ids";
import { readDraft, saveAttempt, writeDraft, type PersistedAttempt } from "../domain/io/persistence";

/**
 * Keeping a student's work, for both worlds' providers.
 *
 * Everything here is the platform's half of the seam §7.1 draws: neither world's decisions,
 * neither world's economy, only the four things that are true of any attempt in any world —
 * it has to be written down before the page can go away, a press must be recorded once, a
 * screen holds work that is not a decision yet, and one browser must not run the same attempt
 * twice over. Basketball's provider and Run the Pop-Up's provider both hold their own reducer
 * and share these, which is the same split they already make for the transport and the
 * delivery retry.
 */

/**
 * How long a change that only moved a draft waits before it is written.
 *
 * It is short because it is not protecting much: the only actions that reach it are the ones
 * that append nothing to the evidence log — a stepper being nudged, a row being typed into —
 * and those change state on every keypress. Everything a student would be upset to lose is
 * written the moment it happens rather than waiting for this at all.
 */
const DRAFT_SAVE_MS = 250;

function stampOf(state: PersistedAttempt): string {
  return `${state.stage}:${state.log.length}:${state.snapshots.length}`;
}

/**
 * The attempt on disk, kept up with the attempt on screen.
 *
 * The old rule here was "write immediately on a stage change, debounce everything else", and
 * it lost real work three ways that a person reproduced in a browser. A ranking checked and
 * marked correct, a setup chosen, a dollar total accepted: all three change state without
 * changing the screen, so all three sat in a 250ms timer, and a reload inside that window
 * threw them away — and then made it worse, because the student re-did the work and the
 * second attempt was recorded as a second attempt. What a teacher was told about that student
 * was a consequence of how fast they pressed F5.
 *
 * So the rule is now about what the change *was*, not which screen it happened on. Anything
 * that reached the evidence log or the snapshot list is work already recorded, and it is
 * written before the function returns. Only a draft — the two actions in this product that
 * deliberately write no event — is allowed to wait, and even then the wait is ended by the
 * page going away: `pagehide` fires on a reload, a navigation and a closed tab, and
 * `visibilitychange` covers the phone case where a tab is backgrounded and killed without
 * ever firing `pagehide`. `beforeunload` is deliberately not used — it is the one of the
 * three that a browser may skip on mobile, and hanging a save on it is how "we save on
 * unload" comes to mean "we save on a laptop".
 */
export function useAttemptAutosave(state: PersistedAttempt, active = true): void {
  const timer = useRef<number | null>(null);
  const pending = useRef<PersistedAttempt | null>(null);
  const written = useRef<string | null>(null);
  const seen = useRef<PersistedAttempt | null>(null);
  const first = useRef(true);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      saveAttempt(pending.current);
      pending.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    // The same attempt arriving again is not a change. The reducer returns a new object for
    // every real change, so object identity is the honest test — and React runs an effect
    // twice on mount in development, which without this scheduled a write of the attempt as
    // it stood at mount and let it land on top of newer work a moment later.
    if (seen.current === state) return;
    seen.current = state;
    const stamp = stampOf(state);
    // The state a provider opens with came out of storage or has nothing in it yet, so the
    // first render owes storage nothing. Writing here would put an empty attempt in every
    // browser that so much as loaded the page.
    if (first.current) {
      first.current = false;
      written.current = stamp;
      return;
    }
    if (written.current !== stamp) {
      written.current = stamp;
      pending.current = null;
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      saveAttempt(state);
      return;
    }
    pending.current = state;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      pending.current = null;
      saveAttempt(state);
    }, DRAFT_SAVE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state, active]);

  useEffect(() => {
    if (!active) return;
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [active, flush]);

  // A provider that goes away still owes the student whatever is in the timer.
  useEffect(() => flush, [flush]);
}

/**
 * How long after a press an identical press is read as the same press.
 *
 * Long enough to cover a double-click, a double-tap and a key repeat; short enough that a
 * student who presses, reads the answer and presses again is never silenced. Nothing in this
 * product is a decision a person makes twice in a third of a second on purpose.
 */
const DOUBLE_FIRE_MS = 400;

/**
 * One press, one event.
 *
 * Every judgement this product makes about a student is read off the evidence log, so an
 * event that appears twice is a fact about their mouse being reported as a fact about them.
 * A double-click on the button that checks a ranking made "got it right first time" read as
 * two attempts; a double-click on a save wrote two save requests; one full run double-clicked
 * its way to duplicates on thirteen of thirteen event types.
 *
 * The guard is here rather than on the buttons because there is no such thing as "the primary
 * button" — the same duplication came off plain toggle buttons inside cards, and a fix that
 * covered the ones wearing the shared component would have left the others. Everything a
 * screen can do to an attempt comes through this function, so this is the one place that
 * covers all of them.
 *
 * It compares the whole action, not just its type, so two *different* decisions in quick
 * succession are both kept: pressing "yes" and then "no" on the same card is two answers and
 * is recorded as two.
 */
export function useSingleFireDispatch<A extends { type: string }>(raw: Dispatch<A & { at: number }>): Dispatch<A> {
  const last = useRef<{ key: string; at: number } | null>(null);
  return useCallback(
    (action: A) => {
      const at = Date.now();
      const key = JSON.stringify(action);
      if (last.current && last.current.key === key && at - last.current.at < DOUBLE_FIRE_MS) return;
      last.current = { key, at };
      raw({ ...action, at });
    },
    [raw],
  );
}

/**
 * Work a screen is holding that is not a decision yet.
 *
 * Three of these were reproduced as lost work in a browser: a written defence typed into a
 * box and never saved until the submit button, the tray order dialled up on the standing
 * order screen, and the course seat selected at the Week 4 deadline. All three lived in
 * component state, which is another way of saying they lived until the next reload — and the
 * defence is the piece a teacher actually grades.
 *
 * They are not events and they must not become events: a paragraph a student is half-way
 * through is not a claim about them, and an evidence log with keystrokes in it is a
 * clickstream, which this product does not have and must not grow. So the draft is written
 * beside the attempt, under the world it belongs to, and restored when the screen comes back.
 */
export function useDraft<T>(worldId: WorldId, id: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readDraft<T>(worldId, id) ?? initial);
  useEffect(() => {
    writeDraft(worldId, id, value);
  }, [worldId, id, value]);
  return [value, setValue];
}

/** Which tab is running this attempt, and when it last said so. */
const RUN_LOCK_KEY = "bow.run.tab";

/** How often the tab holding the run says it is still there. */
const LOCK_HEARTBEAT_MS = 2_000;

/**
 * How long a silent lock is believed.
 *
 * A tab that was closed, crashed or thrown out by the operating system leaves its claim
 * behind, and a student whose browser died must not be locked out of their own work — so a
 * claim nobody has renewed for three heartbeats is treated as abandoned. A background tab
 * whose timers a browser has throttled loses the lock the same way, which is safe: it finds
 * out through the `storage` event, stops writing, and says so on screen.
 */
const LOCK_STALE_MS = 6_000;

interface Claim {
  tabId: string;
  at: number;
}

/**
 * Who this tab is, across its own reloads.
 *
 * It has to survive a reload and it has to differ between tabs, which is exactly what session
 * storage is: per tab, and kept while the tab lives. A fresh id per page load would have made
 * every reload look like a second tab arriving, and a student who pressed F5 would have been
 * told their own run was open somewhere else.
 */
function thisTab(): string {
  if (tabId !== null) return tabId;
  const known = window.sessionStorage.getItem(TAB_KEY);
  tabId = known ?? crypto.randomUUID();
  if (!known) window.sessionStorage.setItem(TAB_KEY, tabId);
  return tabId;
}

const TAB_KEY = "bow.run.tabId";
let tabId: string | null = null;

/** Whether a claim belongs to a different tab that is still saying it is there. */
function heldElsewhere(claim: Claim | null): boolean {
  return claim !== null && claim.tabId !== thisTab() && Date.now() - claim.at < LOCK_STALE_MS;
}

function readClaim(): Claim | null {
  const raw = window.localStorage.getItem(RUN_LOCK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Claim>;
    return typeof parsed.tabId === "string" && typeof parsed.at === "number" ? { tabId: parsed.tabId, at: parsed.at } : null;
  } catch {
    return null;
  }
}

export interface RunLock {
  /** True when another tab is running this attempt, so this one must not write. */
  shadowed: boolean;
  /** Move the run to this tab. The caller reloads, because this tab's copy is behind. */
  takeOver: () => void;
  /** Let go, so a tab opened after this one is not told the run is still in use here. */
  release: () => void;
}

/**
 * One browser, one writer.
 *
 * Two tabs on the same attempt was silent, total data loss and it took one click to cause:
 * both tabs restored the same attempt at mount, neither checked what was in storage before
 * writing, and neither listened for the other. A tab left open at the setup screen and
 * clicked once replaced a ten-event log with its own five — no warning, no recovery, and the
 * student's next save wrote the shorter log to the teacher.
 *
 * The fix is a claim in storage with a heartbeat on it, and the rule that a tab which does
 * not hold the claim does not write. A second tab is not broken and is not silently made
 * read-only either: it says the run is open somewhere else and offers to move it here, which
 * re-reads the attempt from storage on the way in so the tab that takes over starts from the
 * newest work rather than from whatever it had in memory.
 */
export function useRunLock(): RunLock {
  const [shadowed, setShadowed] = useState<boolean>(() => heldElsewhere(readClaim()));

  const claim = useCallback(() => {
    window.localStorage.setItem(RUN_LOCK_KEY, JSON.stringify({ tabId: thisTab(), at: Date.now() }));
  }, []);

  const release = useCallback(() => {
    if (readClaim()?.tabId === thisTab()) window.localStorage.removeItem(RUN_LOCK_KEY);
  }, []);

  useEffect(() => {
    if (shadowed) return;
    claim();
    const beat = window.setInterval(claim, LOCK_HEARTBEAT_MS);
    // A tab that goes away hands the run on rather than making the next one wait out the
    // stale window with a screen that says the run is somewhere it is not.
    window.addEventListener("pagehide", release);
    return () => {
      window.clearInterval(beat);
      window.removeEventListener("pagehide", release);
    };
  }, [shadowed, claim, release]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== RUN_LOCK_KEY) return;
      const current = readClaim();
      // Somebody else has the run: stop writing at once, whatever this tab was doing.
      if (heldElsewhere(current)) setShadowed(true);
      // Nobody has it and this tab was waiting: it is free to take it.
      else if (!current && shadowed) setShadowed(false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [shadowed]);

  const takeOver = useCallback(() => {
    claim();
    // Reloading is the point rather than a shortcut: this tab has been out of the run for as
    // long as the other tab has been in it, and adopting a newer attempt means starting from
    // what is in storage instead of writing this tab's older copy over it.
    window.location.reload();
  }, [claim]);

  return { shadowed, takeOver, release };
}
