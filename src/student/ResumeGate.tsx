import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChallengeProvider } from "../app/ChallengeContext";
import type { ChallengeState } from "../domain/machine/state";
import type { WorldId } from "../domain/core/ids";
import { DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { loadAttemptFor } from "../domain/io/persistence";
import { readMyAttempt, studentToken } from "./session";

/**
 * Tuesday's run, opened on Thursday, on a different Chromebook.
 *
 * The product tells teachers this works — homework across three days is one of the things a
 * class is set — and until this existed it did not. The attempt lived in one browser's local
 * storage and nowhere else, so a student handed a different machine got a blank board and no
 * warning that twenty minutes of their own decisions were sitting on a laptop in another room.
 *
 * It has to be a gate rather than a hook inside the provider because a reducer's initial state
 * is chosen once, at mount. An attempt fetched afterwards can only be dispatched *into* a run
 * that has already started, and a reducer adopting a state it did not produce is worse than a
 * page load — so the fetch happens first and the provider is built around the answer.
 *
 * The local copy wins a tie and wins outright when it is newer. A student who carried on
 * offline on this machine after the last checkpoint has work here that the service has never
 * seen, and pulling the server's older copy over it would be the sync losing the thing sync is
 * for. The service is consulted when this machine has nothing, or has something older.
 */
export function ResumeGate({ children }: { children: React.ReactNode }) {
  const [params] = useSearchParams();
  const classCode = (params.get("class") ?? "").toUpperCase();
  // No session or no class named: there is nobody to ask and nothing to ask about, and that is
  // a fact about the arrival rather than a load that resolves — so it is settled during render.
  const nothingToAsk = !classCode || !studentToken();
  const [restored, setRestored] = useState<{ state?: ChallengeState; worldId?: WorldId } | null>(() => (nothingToAsk ? {} : null));

  useEffect(() => {
    if (nothingToAsk) return;
    let cancelled = false;
    void (async () => {
      const here = loadAttemptFor<ChallengeState>(DEFAULT_WORLD_ID);
      const result = await readMyAttempt(classCode);
      if (cancelled) return;
      const attempt = result.ok ? result.body.attempt : null;
      if (!attempt) {
        setRestored({});
        return;
      }
      // A run in the other world. This gate does not carry its state — that world's provider has
      // its own gate, because a reducer's initial state is chosen at mount and each world's is a
      // different shape. What it does carry is the answer to *which world*, which only this
      // fetch knows on a machine that never saw the run: without it a student resuming the
      // market met the world picker and was asked to choose a world they had already chosen.
      if (attempt.worldId !== DEFAULT_WORLD_ID) {
        setRestored({ worldId: attempt.worldId });
        return;
      }
      const there = attempt.payload as ChallengeState | null;
      if (!there?.meta?.sessionId) {
        setRestored({});
        return;
      }
      // Same run, and this machine is at least as far along: keep what is here.
      const mineIsNewer = here && here.meta.sessionId === there.meta.sessionId && here.log.length >= there.log.length;
      setRestored(mineIsNewer || !isPlayable(there) ? {} : { state: there });
    })();
    return () => { cancelled = true; };
  }, [classCode, nothingToAsk]);

  if (!restored) {
    return <main className="student-home"><p aria-live="polite">Finding where you got to…</p></main>;
  }
  return (
    <ChallengeProvider
      {...(restored.state ? { initial: restored.state } : {})}
      {...(restored.worldId ? { initialWorldId: restored.worldId } : {})}
    >
      {children}
    </ChallengeProvider>
  );
}

/**
 * Whether a stored attempt is one this build can still open.
 *
 * A run saved before a challenge version that changed the stages would resume onto a screen
 * that no longer exists, which is a blank page in front of a student who did nothing wrong. A
 * finished attempt is also not resumable — it has been turned in, and re-opening it would offer
 * to submit it twice.
 */
function isPlayable(state: ChallengeState): boolean {
  return state.stage !== "submitted" && typeof state.stage === "string" && state.log.length > 0;
}
