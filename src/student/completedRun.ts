import { isKnownWorld, type WorldId } from "../domain/core/ids";
import type { EvidenceEvent } from "../domain/evidence/types";
import { loadAttemptFor } from "../domain/io/persistence";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { studentAuthHeaders } from "../platform/identity/token";
import { recapFor, type RunRecap } from "../domain/recap";
import type { MyClasses } from "./session";

/**
 * Finding the log a finished run was written from, so a student can be told what it holds.
 *
 * **The service is the source.** `GET /me/runs/:sessionId` hands a student back the log they
 * turned in and nothing else — no marks, no levels, no reasoning scores — and resolves the
 * seat from the session, so a caller who does not hold the seat a run was filed under gets a
 * 404 rather than somebody else's work. That is the right shape for this page twice over: it
 * is the raw record rather than a verdict, and it makes the recap a *derivation in front of
 * the student* rather than something handed down.
 *
 * This module read local storage first for as long as that endpoint had not been found, and
 * kept its own archive of finished runs so that starting a second run could not delete the
 * account of the first. Both are gone. The archive was a cache in front of a missing endpoint
 * that had to be kept correct forever, and it hid three real failures rather than fixing
 * them: a student opening their run on a different machine, one whose browser data had been
 * cleared, and one who pressed the run's own *"Run the market again"* — which clears the
 * attempt before `/home` ever sees it.
 *
 * What is left of local storage here is a **fallback for a dropped network**, and only that.
 * A student on a school wifi that has gone down still gets their own run back if they are on
 * the machine they played it on, and the page never tells them which copy it read. What it
 * will not do is claim a run it cannot produce: `offline` says the network failed, and says
 * so as a fact about the network.
 */

export type CompletedRunSource =
  /** `label` and `submittedAt` come from the service; both are absent on the offline copy. */
  | { status: "ready"; recap: RunRecap; label?: string; submittedAt?: number }
  /** The service could not be reached and this machine is not holding the run either. */
  | { status: "offline" }
  /** The service does not have this run under this student's seat. */
  | { status: "not-yours" }
  /** The service says nobody is signed in here. The only status that ends at the door. */
  | { status: "signed-out" }
  /** A world this build has no narrator for. Never guessed at. */
  | { status: "no-recap" };

type Storage = Pick<globalThis.Storage, "getItem" | "setItem"> & Partial<globalThis.Storage>;

interface Stored { meta?: { worldId?: unknown }; stage?: unknown; log?: unknown }

/**
 * The screens before a story starts, where there is no run to be in the middle of.
 *
 * `StageId` names these three as the platform's own rather than any world's: a student is
 * signing in or looking at two cards. A checkpoint parked on one holds no decisions, so
 * drawing it as *"You stopped at Choosing a story. Carry on"* offers a button back into a
 * screen they have already answered — and, on this product's own terms, counts a child as
 * mid-run on their teacher's board when they have not started.
 *
 * **This list used to carry the two submitted stages as well, and no longer does.** They were
 * here because a checkpoint written on the way out of the turn-in screen was rebuilt without
 * `submittedAt` and brought a finished run back to life. The service keeps that field across a
 * checkpoint of the same attempt now, and a run played end to end against it reports
 * `inProgress: null` from the turn-in screen onwards — so guarding it here would be guarding
 * nothing, and a guard that guards nothing is the next person's confusion.
 *
 * Removing them also made `unfinishedRunHere` more correct rather than less: an attempt this
 * machine is still holding at the turn-in screen, whose submission never got through, is
 * exactly the work "Play it again" must not clear.
 */
export const NOT_A_RUN_IN_PROGRESS: readonly string[] = ["entry", "join", "choose-world"];

function logOf(value: unknown): EvidenceEvent[] {
  const attempt = value as Stored | null;
  return Array.isArray(attempt?.log) ? (attempt.log as EvidenceEvent[]) : [];
}

/** The world a log was written in, read off the log rather than supplied beside it. */
function worldOf(log: readonly EvidenceEvent[]): WorldId | null {
  const worldId = log[0]?.worldId;
  return typeof worldId === "string" && isKnownWorld(worldId) ? worldId : null;
}

function recapOf(log: readonly EvidenceEvent[], sessionId: string, about?: { label: string; submittedAt: number }): CompletedRunSource | null {
  const worldId = worldOf(log);
  if (!worldId) return { status: "no-recap" };
  const recap = recapFor(worldId, sessionId, log);
  if (!recap) return null;
  return about ? { status: "ready", recap, label: about.label, submittedAt: about.submittedAt } : { status: "ready", recap };
}

/**
 * This machine's own copy, if it happens to be holding this exact run.
 *
 * Matched on the session id and on nothing else, which is the security property rather than a
 * nicety: a shared Chromebook holding the last student's attempt produces no match at all
 * rather than their run under this student's name.
 */
function fromThisMachine(sessionId: string, storage: Storage): CompletedRunSource | null {
  for (const world of PLAYABLE_WORLDS) {
    const log = logOf(loadAttemptFor(world.id, storage));
    if (!log.some((event) => event.sessionId === sessionId)) continue;
    const found = recapOf(log, sessionId);
    if (found) return found;
  }
  return null;
}

interface RunResponse { sessionId: string; classCode: string; label: string; seatCode: string; submittedAt: number; log: EvidenceEvent[] }

/**
 * One finished run, read back from the class service.
 *
 * The outcomes are kept apart on purpose, and this is the whole reason this page does not go
 * through the shared `call` helper in `session.ts`: that one collapses every failure into a
 * message string, and a page that cannot tell *"you are not signed in"* from *"the wifi
 * dropped"* has to guess. It guessed wrong in the worst direction — a school network blip
 * signed the student out and sent them back to the join screen to find their card again.
 *
 * So: a 401 is a fact about the session, a 404 is a fact about whose run it is, a thrown
 * fetch is a fact about the network, and any other status is treated as the network — a
 * student is never told a run is not theirs because a proxy hiccuped.
 */
type ServiceFailure = "signed-out" | "not-mine" | "network";

async function fromService(sessionId: string): Promise<{ ok: true; run: RunResponse } | { ok: false; why: ServiceFailure }> {
  try {
    const response = await fetch(`${CLASS_API_BASE}/me/runs/${encodeURIComponent(sessionId)}`, {
      headers: { "Content-Type": "application/json", ...studentAuthHeaders() },
    });
    if (response.status === 401 || response.status === 403) return { ok: false, why: "signed-out" };
    if (response.status === 404) return { ok: false, why: "not-mine" };
    if (!response.ok) return { ok: false, why: "network" };
    return { ok: true, run: (await response.json()) as RunResponse };
  } catch {
    return { ok: false, why: "network" };
  }
}

export async function completedRunSource(sessionId: string, storage: Storage = window.localStorage): Promise<CompletedRunSource> {
  const answered = await fromService(sessionId);
  if (answered.ok) {
    const { label, submittedAt, log } = answered.run;
    return recapOf(log, sessionId, { label, submittedAt }) ?? { status: "no-recap" };
  }
  if (answered.why === "signed-out") return { status: "signed-out" };
  // A dropped network is the only case this machine's own copy is consulted for — never a
  // 404, because on a shared machine the last student's attempt is exactly what a 404 means
  // this seat may not be shown. It is still this student's own run, read from the copy they
  // made it with, so nothing on the page needs to say which one it came from.
  const here = answered.why === "network" ? fromThisMachine(sessionId, storage) : null;
  if (here) return here;
  return answered.why === "not-mine" ? { status: "not-yours" } : { status: "offline" };
}

/**
 * The class list, with the reason it failed kept apart from the fact that it failed.
 *
 * It lives beside the run reader because it is the same discrimination, and getting it wrong
 * cost the same thing in both places. `readMyClasses` in `session.ts` collapses a 401 and a
 * dead wifi into one `{ ok: false, message }`, and `/home` acted on that by forgetting the
 * student's session — so a school network that dropped for two seconds logged a child out of
 * their own class and sent them back to the join screen to find their card. A student cannot
 * fix a network, and this product's rule is not to make its problems theirs.
 *
 * If `session.ts` ever hands the status code back, this goes and both screens use that.
 */
export async function readClasses(): Promise<
  | { ok: true; body: MyClasses }
  | { ok: false; why: "signed-out" | "network" }
> {
  try {
    const response = await fetch(`${CLASS_API_BASE}/me/classes`, {
      headers: { "Content-Type": "application/json", ...studentAuthHeaders() },
    });
    if (response.status === 401 || response.status === 403) return { ok: false, why: "signed-out" };
    if (!response.ok) return { ok: false, why: "network" };
    return { ok: true, body: (await response.json()) as MyClasses };
  } catch {
    return { ok: false, why: "network" };
  }
}

/**
 * Whether this machine is holding work nobody has turned in.
 *
 * Asked of local storage rather than of the service, because it is asked in order to decide
 * whether clearing local storage is safe — and the only thing that can answer *that* is the
 * thing about to be cleared.
 */
export function unfinishedRunHere(
  worldIds: readonly WorldId[],
  finishedSessionIds: readonly string[],
  storage: Storage = window.localStorage,
): boolean {
  return worldIds.some((worldId) => {
    const attempt = loadAttemptFor(worldId, storage) as Stored | null;
    if (!attempt) return false;
    if (typeof attempt.stage === "string" && NOT_A_RUN_IN_PROGRESS.includes(attempt.stage)) return false;
    const log = logOf(attempt);
    if (log.length === 0) return false;
    return !finishedSessionIds.includes(log[0]!.sessionId);
  });
}
