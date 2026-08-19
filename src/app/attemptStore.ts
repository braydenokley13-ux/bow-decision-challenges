import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { WorldId } from "../domain/core/ids";
import { readDraft, saveAttempt, writeDraft, type PersistedAttempt } from "../domain/io/persistence";

/**
 * Keeping a student's work, for both worlds' providers.
 *
 * Everything here is the platform's half of the seam §7.1 draws: neither world's decisions,
 * neither world's economy, only the five things that are true of any attempt in any world —
 * it has to be written down before the page can go away, a press must be recorded once, a
 * screen holds work that is not a decision yet, one browser must not run the same attempt
 * twice over, and **one child must not end up with two plans**. Basketball's provider and Run
 * the Pop-Up's provider both hold their own reducer and share these, which is the same split
 * they already make for the transport and the delivery retry.
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

/**
 * Where an arriving tab knocks, and where a live tab answers.
 *
 * A claim on its own cannot tell "another tab is running this" from "a tab that is gone left
 * this behind", and the difference is the whole of what a student is told. So an arriving tab
 * asks: it writes here, and any tab that holds the claim renews it the moment the write lands.
 * An answer means somebody is there. Silence means nobody is, and silence is the common case —
 * a child who closed the browser at the end of the lesson and came back the next morning.
 */
const RUN_PING_KEY = "bow.run.ping";

/** How often the tab holding the run says it is still there. */
const LOCK_HEARTBEAT_MS = 2_000;

/**
 * How long an arriving tab waits for an answer before deciding the run is nobody's.
 *
 * A `storage` event crosses tabs in the same browser in single-digit milliseconds, so a second
 * is many times what a live tab needs, and it is short enough that a student who has genuinely
 * come back to an empty machine sees one blink of "picking your run back up" rather than an
 * accusation.
 */
const PING_GRACE_MS = 1_000;

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
  /**
   * The tab this claim is an answer to, when it is one.
   *
   * A knock is answered by name rather than by timestamp. Time was the obvious way and it is
   * the wrong one: a claim written and a knock sent inside the same millisecond are
   * indistinguishable by clock, and the two ways that reads wrong are a student being told
   * their run is open in a window that closed, and a student being turned out of the window
   * they are actually working in. Neither is acceptable, and neither can happen if the answer
   * carries the name of who it is for.
   */
  ack?: string;
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
    if (typeof parsed.tabId !== "string" || typeof parsed.at !== "number") return null;
    return { tabId: parsed.tabId, at: parsed.at, ...(typeof parsed.ack === "string" ? { ack: parsed.ack } : {}) };
  } catch {
    return null;
  }
}

/** Who knocked, off the ping they wrote. */
function readPing(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { from?: unknown };
    return typeof parsed.from === "string" ? parsed.from : null;
  } catch {
    return null;
  }
}

/**
 * What this tab knows about who is running the attempt.
 *
 * `checking` is the state that was missing, and its absence is what made the product lie. A
 * tab that found a claim it did not own went straight to *your challenge is open in another
 * tab* without ever having heard from that tab — so every student who closed the browser and
 * came back met a red screen about a window that did not exist. Not knowing yet is a real
 * state and it is a short one; it is not the same fact as knowing.
 */
export type RunLockState = "running" | "checking" | "elsewhere";

export interface RunLock {
  /** True while this tab must not write — either somebody else has the run, or nobody knows yet. */
  shadowed: boolean;
  /** What is actually known, as opposed to what is assumed. */
  state: RunLockState;
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
  // A claim that has not been renewed inside the stale window is nobody's, and this tab simply
  // takes the run. A claim that looks live is not believed either — it is asked.
  const [state, setState] = useState<RunLockState>(() => (heldElsewhere(readClaim()) ? "checking" : "running"));

  const claim = useCallback((ack?: string) => {
    window.localStorage.setItem(
      RUN_LOCK_KEY,
      JSON.stringify({ tabId: thisTab(), at: Date.now(), ...(ack ? { ack } : {}) }),
    );
  }, []);

  const release = useCallback(() => {
    if (readClaim()?.tabId === thisTab()) window.localStorage.removeItem(RUN_LOCK_KEY);
  }, []);

  useEffect(() => {
    if (state !== "running") return;
    claim();
    const beat = window.setInterval(() => claim(), LOCK_HEARTBEAT_MS);
    // A tab that goes away hands the run on rather than making the next one wait out the
    // stale window with a screen that says the run is somewhere it is not.
    window.addEventListener("pagehide", release);
    return () => {
      window.clearInterval(beat);
      window.removeEventListener("pagehide", release);
    };
  }, [state, claim, release]);

  // Knocking, and listening for an answer. This is the whole of the difference between "your
  // run is open somewhere else" and "the last tab to run this did not clean up after itself".
  useEffect(() => {
    if (state !== "checking") return;
    const askedAt = Date.now();
    window.localStorage.setItem(RUN_PING_KEY, JSON.stringify({ from: thisTab(), at: askedAt }));
    // An answer is a claim addressed to this tab by name. Nothing else counts as one.
    const answered = () => {
      const current = readClaim();
      return current !== null && current.tabId !== thisTab() && current.ack === thisTab();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== RUN_LOCK_KEY) return;
      if (answered()) setState("elsewhere");
    };
    window.addEventListener("storage", onStorage);
    const decide = window.setTimeout(() => setState(answered() ? "elsewhere" : "running"), PING_GRACE_MS);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearTimeout(decide);
    };
  }, [state]);

  // Answering. A tab that holds the run renews its claim the instant somebody knocks, so the
  // tab that knocked hears back inside its grace window rather than waiting out a heartbeat.
  useEffect(() => {
    const onPing = (event: StorageEvent) => {
      if (event.key !== RUN_PING_KEY) return;
      if (readClaim()?.tabId !== thisTab()) return;
      const from = readPing(event.newValue);
      claim(from ?? undefined);
    };
    window.addEventListener("storage", onPing);
    return () => window.removeEventListener("storage", onPing);
  }, [claim]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== RUN_LOCK_KEY) return;
      const current = readClaim();
      // Somebody else has the run and is saying so: stop writing at once, whatever this tab
      // was doing. A tab that is still checking decides for itself, in the effect above.
      if (state === "running" && heldElsewhere(current)) setState("elsewhere");
      // Nobody has it and this tab was waiting: it is free to take it.
      else if (!current && state === "elsewhere") setState("running");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [state]);

  // A tab that was told to wait must not wait for ever. A browser that is killed, a laptop
  // that sleeps and a tab a browser discards all leave a claim behind and fire no event, and
  // without this the student sat on the waiting screen until they thought to reload.
  useEffect(() => {
    if (state !== "elsewhere") return;
    const watch = window.setInterval(() => {
      if (!heldElsewhere(readClaim())) setState("running");
    }, LOCK_HEARTBEAT_MS);
    return () => window.clearInterval(watch);
  }, [state]);

  const takeOver = useCallback(() => {
    claim();
    // Reloading is the point rather than a shortcut: this tab has been out of the run for as
    // long as the other tab has been in it, and adopting a newer attempt means starting from
    // what is in storage instead of writing this tab's older copy over it.
    window.location.reload();
  }, [claim]);

  return { shadowed: state !== "running", state, takeOver, release };
}

/**
 * Two copies of one run, and which of them the student is actually in.
 *
 * ---------------------------------------------------------------------------------------
 * A second **device** is the same problem as a second **tab**, one level up, and until now it
 * had no mechanism at all. The lock above stops two tabs writing over each other and tells the
 * student what is happening; across two computers nothing was watching, and the rule that
 * decided which copy survived was `same session && here.log.length >= there.log.length → keep
 * the local one`.
 *
 * That rule was written for one honest case and is right about it: a device that is ahead of
 * the service because its last checkpoint did not send has work the service has never seen,
 * and pulling the service's older copy over it would be the sync losing the thing sync is for.
 * But *ahead* is not what it measured. It measured *longer*, and two copies can both be longer
 * than the service's without either being ahead of the other.
 *
 * A verifier ran exactly that. One seat, two devices, both at question 2 of 4. The school
 * machine, offline, counted both bonuses in; the home machine, online, left both out. Both came
 * back online and reloaded twice, and finished like this:
 *
 *     spareSchool   + Only if a bonus rule is met  $1,800
 *     spareHome     + No bonus money counted           $0
 *
 * Eleven events each, eleven on the service. Each device kept its own copy, each overwrote the
 * service on its next checkpoint, and neither screen said a word about the other. Whichever one
 * the child happened to finish on was the plan their teacher graded — and the judgement this
 * challenge exists to make, *did you count on money nobody promised?*, was **opposite** on the
 * two machines.
 *
 * ---------------------------------------------------------------------------------------
 * **The fix is to compare ancestry instead of length.** An evidence log is append-only, so two
 * copies of one run always share a prefix: whatever the student had done before the two copies
 * parted. Compare the two logs event by event and the answer falls out —
 *
 * - the service's log is a prefix of this device's → **this device is genuinely ahead**, the
 *   benign case the old rule was written for, and it still keeps what is here;
 * - this device's log is a prefix of the service's → this device is simply behind and adopts
 *   the service's copy, which is what a student picking a run up on a second machine does;
 * - neither is a prefix of the other → the two copies have **forked**: each holds a decision
 *   the other does not, and no amount of arithmetic makes them one plan.
 *
 * A fork is the only case that needs deciding, and it is decided by **the most recent decision
 * the child made**, read off the last event's own clock. That rule has three properties worth
 * having: it is a pure function of the two logs, so *both* devices work out the same winner
 * without asking each other or the service — the copies converge on the next load of each,
 * permanently; it keeps the thing the child did last, which is the thing they meant; and it
 * never asks a twelve-year-old to arbitrate between two versions of their own plan.
 *
 * What it cannot do is keep both, because the two logs are contradictory answers to the same
 * questions and merging them would invent a plan the child never made. So the device whose copy
 * is set aside says so, in as many words, before its student carries on (`ResumeGate`). Nothing
 * is decided silently, which is the half of this the verifier could not fault: *neither is
 * told* was the finding, not *they disagree*.
 */
export interface RunCopy {
  meta: { sessionId: string };
  log: readonly unknown[];
}

/** How two copies of one run stand to each other. */
export type RunRelation =
  /** The same events in the same order. Either copy will do. */
  | "identical"
  /** The other copy is a prefix of this one: this device has work nothing else has seen. */
  | "ahead"
  /** This copy is a prefix of the other: this device is behind and has lost nothing. */
  | "behind"
  /** Each holds decisions the other does not. One child, two plans. */
  | "forked"
  /** Not two copies of one run at all — a different attempt entirely. */
  | "different-run";

/**
 * One event, as a string that is equal exactly when the events are the same event.
 *
 * The event's own `id` cannot do this job: it is `event-${sequence}`, a position rather than an
 * identity, so the fifth event of one fork and the fifth of the other are both `event-5` while
 * being different answers to different questions. The whole event is compared instead. Both
 * sides have been through `JSON.parse` already — one out of local storage, one out of the
 * service's payload — so they serialise the same way when they are the same event.
 */
function eventKey(event: unknown): string {
  return JSON.stringify(event);
}

/** How much of the run the two copies agree about. */
function sharedPrefix(here: readonly unknown[], there: readonly unknown[]): number {
  const limit = Math.min(here.length, there.length);
  let shared = 0;
  while (shared < limit && eventKey(here[shared]) === eventKey(there[shared])) shared += 1;
  return shared;
}

export function compareRuns(here: RunCopy | null, there: RunCopy | null): RunRelation {
  if (!here || !there) return "different-run";
  // A run with no session id has not started; it is nobody's copy of anything.
  if (!here.meta.sessionId || !there.meta.sessionId) return "different-run";
  if (here.meta.sessionId !== there.meta.sessionId) return "different-run";
  const shared = sharedPrefix(here.log, there.log);
  if (shared === here.log.length && shared === there.log.length) return "identical";
  if (shared === there.log.length) return "ahead";
  if (shared === here.log.length) return "behind";
  return "forked";
}

/**
 * When the last thing in this copy happened, by the clock of the machine it happened on.
 *
 * Only ever compared with the same field of a copy of the same run, so what it measures is
 * "which of these two decisions did the child make second" rather than any absolute time.
 */
function lastDecisionAt(copy: RunCopy): number {
  const last = copy.log.at(-1) as { timestamp?: unknown } | undefined;
  return typeof last?.timestamp === "number" ? last.timestamp : 0;
}

export interface RunToCarryOn {
  /** Which copy the student carries on with. */
  take: "here" | "there";
  /**
   * True when the copy that is not taken held decisions of its own, so a person has to be told
   * rather than quietly given a plan that is not the one on the screen they left.
   */
  forked: boolean;
}

/**
 * Which of the two copies is the run, and whether anything was set aside to say so.
 *
 * `here` is this device's; `there` is the service's. The answer is deliberately the same
 * whichever device asks, because that is what makes two machines converge without either of
 * them having to hear from the other.
 */
export function runToCarryOn(here: RunCopy | null, there: RunCopy | null): RunToCarryOn {
  if (!there) return { take: "here", forked: false };
  if (!here) return { take: "there", forked: false };
  switch (compareRuns(here, there)) {
    // A different attempt on this device is not a copy of this one: the service's record of the
    // run in this class is the run in this class.
    case "different-run": return { take: "there", forked: false };
    case "identical": return { take: "here", forked: false };
    case "ahead": return { take: "here", forked: false };
    case "behind": return { take: "there", forked: false };
    case "forked": return { take: lastDecisionAt(here) >= lastDecisionAt(there) ? "here" : "there", forked: true };
  }
}
