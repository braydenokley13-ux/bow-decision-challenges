import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChallengeProvider } from "../app/ChallengeContext";
import { runToCarryOn } from "../app/attemptStore";
import { Button } from "../components/primitives/Button";
import type { ChallengeState } from "../domain/machine/state";
import type { WorldId } from "../domain/core/ids";
import { DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { loadAttemptFor, saveAttempt, type PersistedAttempt } from "../domain/io/persistence";
import { readMyAttempt, studentToken } from "./session";

interface Restored {
  /** The attempt this gate is handing the provider, when it fetched one worth handing over. */
  state?: ChallengeState;
  /** Which world to open, when only that much is known. */
  worldId?: WorldId;
  /** This device's own copy of the run held decisions of its own and has been set aside. */
  setAside?: true;
}

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
 * **Which copy is the run** is decided by `runToCarryOn`, which reads the two evidence logs
 * against each other rather than measuring them. A student who carried on offline on this
 * machine after the last checkpoint has work here that the service has never seen, and pulling
 * the service's older copy over it would be the sync losing the thing sync is for — so a device
 * that is genuinely ahead keeps what is here, as it always did. What is new is the case that
 * rule used to swallow: two copies that have *parted*, each holding a decision the other does
 * not. That is one child with two plans, it cannot be arithmetic'd away, and it used to be
 * settled silently in favour of whichever machine the child happened to reload.
 */
export function ResumeGate({ children }: { children: React.ReactNode }) {
  const [params] = useSearchParams();
  const classCode = (params.get("class") ?? "").toUpperCase();
  // No session or no class named: there is nobody to ask and nothing to ask about, and that is
  // a fact about the arrival rather than a load that resolves — so it is settled during render.
  const nothingToAsk = !classCode || !studentToken();
  const [restored, setRestored] = useState<Restored | null>(() => (nothingToAsk ? {} : null));
  const [told, setTold] = useState(false);

  useEffect(() => {
    if (nothingToAsk) return;
    let cancelled = false;
    void (async () => {
      const here = loadAttemptFor<ChallengeState>(DEFAULT_WORLD_ID);
      const result = await readMyAttempt(classCode);
      if (cancelled) return;
      const attempt = result.ok ? result.body.attempt : null;
      // Nothing to compare against — including because the wifi is down, which is the same
      // answer: what is on this machine is the run, and the run works offline.
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
      if (!there?.meta?.sessionId || !isPlayable(there)) {
        setRestored({});
        return;
      }
      // Which of the two copies is the run. `runToCarryOn` carries the whole argument; the
      // short version is that the old rule here compared how *long* the two logs were, which
      // reads "this device is ahead" off a fact that is also true when the two have parted
      // company — so one child on two devices ended up with two plans that never converged and
      // no screen said so.
      const answer = runToCarryOn(here, there);
      // Kept what is here. Nothing on this screen has changed and nothing of this student's is
      // gone, so there is nothing to interrupt them with — the copy that was set aside says so
      // itself, on the machine it is sitting on, the next time that machine is opened. Telling
      // somebody about work they cannot see, on a device they are not using, is noise.
      if (answer.take === "here") {
        setRestored({});
        return;
      }
      // Adopted, and written down before the student touches anything. Without the write the
      // next reload compares this device's abandoned copy against the service all over again
      // and says the same thing a second time.
      saveAttempt(there as unknown as PersistedAttempt);
      setRestored({ state: there, ...(answer.forked ? { setAside: true } : {}) });
    })();
    return () => { cancelled = true; };
  }, [classCode, nothingToAsk]);

  if (!restored) {
    return <main className="student-home"><p aria-live="polite">Finding where you got to…</p></main>;
  }
  // The one thing that must be said out loud before the run opens: this device's copy held
  // decisions of its own and has been set aside for a newer one.
  if (restored.setAside && !told) {
    return <CopySetAside onCarryOn={() => setTold(true)} />;
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

/**
 * What the machine that lost a fork says before it opens the run.
 *
 * It is the second-tab screen one level up, and deliberately the same shape: the way on is the
 * first thing on it, the explanation is underneath, and the button is not a choice between two
 * plans. A twelve-year-old sitting down to finish their work should not be handed an
 * arbitration; they should be told what happened in one sentence and let through.
 *
 * What it must never become is a refusal. There is no path off this screen that is not "carry
 * on", because the child is in front of this computer and the run is theirs — the thing that
 * moved is which copy of it BOW is keeping, not whether they may work.
 *
 * It borrows `run-elsewhere` for the same reason it borrows the shape: this is the same event
 * to a student — *your run is somewhere else too* — and giving it its own look would be two
 * appearances for one fact.
 */
function CopySetAside({ onCarryOn }: { onCarryOn: () => void }) {
  return (
    <div className="run-elsewhere">
      <main>
        <p className="eyebrow">You worked on this run in two places</p>
        <h1>Carry on where you left off?</h1>
        <Button type="button" variant="primary" onClick={onCarryOn}>Carry on</Button>
        <p>
          This run was open on another computer as well as this one, and the two stopped matching
          — each had answers the other did not.
        </p>
        <p>
          BOW keeps the one you worked on most recently, and that is not the copy that was
          sitting on this computer. What opens next is your run as you last left it somewhere
          else. Nothing has gone to your teacher: you turn this in yourself, when it is done.
        </p>
      </main>
    </div>
  );
}
