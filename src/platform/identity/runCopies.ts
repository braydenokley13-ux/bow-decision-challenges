/**
 * Two copies of one run, and which of them is the run.
 *
 * ---------------------------------------------------------------------------------------
 * A second **device** is the same problem as a second **tab**, one level up, and until now it
 * had no mechanism at all. The tab lock in `app/attemptStore` stops two tabs writing over each
 * other and tells the student what is happening; across two computers nothing was watching,
 * and the rule that decided which copy survived was `same session && here.log.length >=
 * there.log.length → keep the local one`.
 *
 * That rule was written for one honest case and is right about it: a device that is ahead of
 * the service because its last checkpoint did not send has work the service has never seen,
 * and pulling the service's older copy over it would be the sync losing the thing sync is for.
 * But *ahead* is not what it measured. It measured *longer*, and two copies can both be longer
 * than the service's without either being ahead of the other.
 *
 * A verifier ran exactly that. One seat, two devices, both at question 2 of 4. The school
 * machine, offline, counted the bonuses in; the home machine, online, left them out. Both came
 * back online and reloaded twice, and finished like this:
 *
 *     spareSchool   + Only if a bonus rule is met  $800
 *     spareHome     + No bonus money counted         $0
 *
 * Same child, same seat, same session id. Each device kept its own copy, each overwrote the
 * service on its next checkpoint, and neither screen said a word about the other. Whichever
 * one the child happened to finish on was the plan their teacher graded — and the judgement
 * this challenge exists to make, *did you count on money nobody promised?*, was **opposite**
 * on the two machines.
 *
 * ---------------------------------------------------------------------------------------
 * **Compare ancestry, not length.** An evidence log is append-only, so two copies of one run
 * always share a prefix: whatever the student had done before the copies parted. Compare the
 * two logs event by event and the answer falls out —
 *
 * - the other copy is a prefix of this one → **this one is genuinely ahead**, the benign case
 *   the old rule was written for, and it still wins;
 * - this copy is a prefix of the other → this one is simply behind and adopts the other;
 * - neither is a prefix of the other → the two copies have **forked**: each holds a decision
 *   the other does not, and no amount of arithmetic makes them one plan.
 *
 * A fork is the only case that needs deciding, and it is decided by **the most recent decision
 * the child made**, read off the last event's own clock. Not by which copy is longer, and not
 * by which arrived last — arrival order is precisely the arbitrariness being removed, and it
 * would hand the run to whichever machine happened to be reloaded rather than to the machine
 * the child is sitting at. It keeps the thing the child did last, which is the thing they
 * meant, and it never asks a twelve-year-old to arbitrate between two versions of their own
 * plan.
 *
 * It has one honest weakness: it trusts two devices' clocks against each other. A Chromebook
 * whose clock is an hour behind would lose decisions it should win. Nothing available here is
 * better — arrival order is worse for the reason above, and log length is the rule that caused
 * this — and the failure is bounded, because a device that goes on being used goes on
 * producing later decisions and takes the run back.
 *
 * ---------------------------------------------------------------------------------------
 * **Where the rule has to run.** Not only on the device. This was tried on the device alone
 * and reproduced unchanged in a browser, because of the order the two requests happen in: a
 * page that is going away checkpoints on `pagehide`, so by the time the next load asks the
 * service what it holds, the service is holding *the copy this very device just sent it*. The
 * gate then compares a device against itself, reads `identical`, and the fork is invisible.
 * Two devices ping-pong the service between their two plans for ever, each seeing only its own.
 *
 * So the service applies it too, on `PUT /me/attempt`, where both copies are in hand at once
 * (`copyToKeep`). That makes what the service holds a **function of the copies it has been
 * sent rather than of the order they arrived in**, which is the property that makes two
 * machines converge: once both have checkpointed, a reload cannot flip the answer. The device
 * half (`runToCarryOn`) is then what *tells the student*, which is the half the verifier's
 * finding was actually about — *neither is told*, not *they disagree*.
 */

export interface RunCopy {
  meta: { sessionId: string };
  log: readonly unknown[];
}

/** How two copies of one run stand to each other. */
export type RunRelation =
  /** The same events in the same order. Either copy will do. */
  | "identical"
  /** The other copy is a prefix of this one: this copy has work the other has not seen. */
  | "ahead"
  /** This copy is a prefix of the other: this one is behind and has lost nothing. */
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

/**
 * Which of two forked copies the child worked on second — **the same answer whichever copy
 * asks**, which is the whole of why two machines converge without either hearing from the
 * other.
 *
 * The obvious way to write this is `here >= there ? here : there`, and that is a tie broken by
 * *whose turn it is to ask*, which is not a tie broken at all: on two devices with the same
 * last timestamp — the same millisecond, or two clocks that agree, or two copies whose last
 * event never carried a clock — each machine calls itself the winner and the two diverge for
 * ever, which is the defect this file exists to remove. So every step of the comparison is
 * between the copies themselves, and the last step cannot tie: two copies whose whole logs
 * serialise the same way are not forked.
 */
export function laterCopy(a: RunCopy, b: RunCopy): "a" | "b" {
  const at = lastDecisionAt(a);
  const bt = lastDecisionAt(b);
  if (at !== bt) return at > bt ? "a" : "b";
  const aLast = eventKey(a.log.at(-1));
  const bLast = eventKey(b.log.at(-1));
  if (aLast !== bLast) return aLast > bLast ? "a" : "b";
  return eventKey(a.log) >= eventKey(b.log) ? "a" : "b";
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
 * Which of the two copies is the run, on a device, and whether anything was set aside.
 *
 * `here` is this device's; `there` is the service's.
 */
export function runToCarryOn(here: RunCopy | null, there: RunCopy | null): RunToCarryOn {
  if (!there) return { take: "here", forked: false };
  if (!here) return { take: "there", forked: false };
  switch (compareRuns(here, there)) {
    // A different attempt on this device is not a copy of this one: the service's record of
    // the run in this class is the run in this class.
    case "different-run": return { take: "there", forked: false };
    case "identical": return { take: "here", forked: false };
    case "ahead": return { take: "here", forked: false };
    case "behind": return { take: "there", forked: false };
    case "forked": return { take: laterCopy(here, there) === "a" ? "here" : "there", forked: true };
  }
}

/**
 * Which copy the service keeps when a checkpoint arrives — the same rule, from the other side.
 *
 * It differs from `runToCarryOn` in exactly one case, and the difference is not a subtlety:
 * **a checkpoint naming a different session is a second attempt, and replaces what is stored.**
 * A student who finished one run and started another, or who left a run and picked a different
 * world, is not still in the run the service remembers. On a device the same comparison means
 * the opposite thing — an attempt in local storage that is not this class's run is stale — so
 * the two functions cannot be one.
 */
export function copyToKeep(incoming: RunCopy | null, stored: RunCopy | null): "incoming" | "stored" {
  if (!incoming) return "stored";
  if (!stored) return "incoming";
  switch (compareRuns(incoming, stored)) {
    case "different-run": return "incoming";
    case "identical": return "incoming";
    case "ahead": return "incoming";
    case "behind": return "stored";
    case "forked": return laterCopy(incoming, stored) === "a" ? "incoming" : "stored";
  }
}

/**
 * A stored or transmitted attempt, read as a copy of a run — or not read at all.
 *
 * The service holds `payload` as whatever a browser sent it, and a payload that cannot say
 * which attempt it is or what happened in it cannot be compared with anything. Answering
 * `null` rather than guessing keeps every caller's fallback the same: with nothing to compare,
 * the newest thing wins, exactly as it did before any of this existed.
 */
export function asRunCopy(value: unknown): RunCopy | null {
  if (!value || typeof value !== "object") return null;
  const meta = (value as { meta?: unknown }).meta;
  const log = (value as { log?: unknown }).log;
  if (!meta || typeof meta !== "object") return null;
  const sessionId = (meta as { sessionId?: unknown }).sessionId;
  if (typeof sessionId !== "string" || !sessionId) return null;
  if (!Array.isArray(log)) return null;
  return { meta: { sessionId }, log };
}
