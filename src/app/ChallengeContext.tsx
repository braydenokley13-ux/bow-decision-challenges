/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useReducer, useState, type Dispatch, type PropsWithChildren } from "react";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import type { WorldId } from "../domain/core/ids";
import { clearAttemptFor, clearEveryAttempt, lastWorldPlayed, loadAttemptFor } from "../domain/io/persistence";
import { useAttemptAutosave, useRunLock, useSingleFireDispatch } from "./attemptStore";
import { forgetStudent } from "../platform/identity/token";
import { Button } from "../components/primitives/Button";
import { DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { deliverWithRetry, type DeliveryState, type EvidenceTransport } from "../platform/evidence/transport";
import { transportFromEnvironment } from "../platform/evidence/transports";
import type { WorldOffer } from "../stages/worldOffer";
import { useAttemptCheckpoint } from "../student/useAttemptCheckpoint";

interface ChallengeContextValue {
  state: ChallengeState;
  dispatch: Dispatch<ChallengeAction>;
  reset: () => void;
  transport: EvidenceTransport;
  /** Where the finished work stands: not sent, sending, delivered, or honestly failed. */
  delivery: DeliveryState;
  /** Sends the finished attempt. Safe to call again after a failure. */
  deliver: () => Promise<void>;
  /**
   * Whose screens are on. Basketball's reducer lives in this provider; a second world brings
   * its own, so this is the one fact that decides which of them the student is looking at.
   */
  activeWorldId: WorldId;
  /** What this seat was offered, once the class has answered. Null until it has. */
  offer: WorldOffer | null;
  setOffer: (offer: WorldOffer) => void;
  /** Leaves this provider's world and opens another one's machine. */
  enterWorld: (worldId: WorldId) => void;
  /**
   * Hands the device to somebody else: every world's attempt cleared, back to the join form.
   *
   * It is not `reset` with a wider broom. `reset` is one student starting their own run
   * again; this is a different person sitting down, and the difference matters because a
   * restored attempt in the *other* world would put them straight back inside the last
   * student's run through a door nobody was watching.
   */
  handOver: () => void;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

/** One transport per build. Tests and design work pass their own. */
const DEFAULT_TRANSPORT = transportFromEnvironment();

/**
 * Which world's screens to open on a cold load.
 *
 * The pointer says where the student was last, and it is trusted only as far as an attempt
 * that actually exists: a pointer at a world with no saved work would send a student who has
 * never played it into a machine with nothing in it. Basketball is the fallback because
 * Basketball is this provider's own reducer, so falling back costs nothing.
 */
function restoredWorld(): WorldId {
  const last = lastWorldPlayed();
  if (last === DEFAULT_WORLD_ID) return DEFAULT_WORLD_ID;
  return loadAttemptFor(last) ? last : DEFAULT_WORLD_ID;
}

export function ChallengeProvider({ children, transport = DEFAULT_TRANSPORT, initial }: PropsWithChildren<{
  transport?: EvidenceTransport;
  /**
   * An attempt this browser did not write.
   *
   * Cross-device resume, and the only way it can work: the reducer's initial state is chosen
   * once, at mount, so a run recovered from the service has to be in hand before the provider
   * exists rather than dispatched into it afterwards. `ResumeGate` in `App.tsx` is what fetches
   * it. Absent on every other route, where the answer is whatever this machine remembers.
   */
  initial?: ChallengeState;
}>) {
  // Basketball's attempt, by name. This provider holds Basketball's reducer, and with a second
  // world in the browser "whatever was open last" is no longer the same question as "what does
  // this reducer understand" — handing a food-truck attempt to this one would price another
  // world's board with this world's economy.
  const [state, rawDispatch] = useReducer(
    challengeReducer,
    undefined,
    () => initial ?? loadAttemptFor<ChallengeState>(DEFAULT_WORLD_ID) ?? createInitialState(Date.now()),
  );
  const [activeWorldId, setActiveWorldId] = useState<WorldId>(restoredWorld);
  const [offer, setOffer] = useState<WorldOffer | null>(null);
  const [delivery, setDelivery] = useState<DeliveryState>({ status: "idle" });
  // One browser runs this attempt once. A second tab is told so rather than allowed to write
  // its own older copy over the tab the student is actually working in.
  const run = useRunLock();

  // The reducer stays pure, so the clock is read here and travelled with the action, and a
  // press that arrives twice is recorded once. This is the only place the app learns what
  // time it is.
  const dispatch = useSingleFireDispatch<ChallengeAction>(rawDispatch);

  // Only the world on screen writes, and only from the tab that holds the run. Saving is what
  // moves the "last world played" pointer, and a background provider that kept saving would
  // drag a student back into this world on the next reload while they were three screens into
  // the other one.
  useAttemptAutosave(state, activeWorldId === state.meta.worldId && !run.shadowed);

  // And the same attempt to the class it belongs to, so a teacher walking the room can see who
  // is mid-run and a student can finish on a different machine. Local storage answers neither
  // of those questions, and both are things this product promises.
  useAttemptCheckpoint(
    state.meta.classCode
      ? {
        classCode: state.meta.classCode,
        worldId: state.meta.worldId,
        stage: state.stage,
        payload: state,
        ...(state.meta.assignmentId ? { assignmentId: state.meta.assignmentId } : {}),
      }
      : null,
    activeWorldId === state.meta.worldId && !run.shadowed,
  );

  const reset = useCallback(() => {
    // Every key the loader reads for this world, not the two somebody remembered: the
    // unversioned one it still falls back to used to survive this and hand the student back
    // the very plan they had asked to start again from. Drafts go with it, because a
    // half-written defence from the abandoned run is the abandoned run.
    clearAttemptFor(activeWorldId);
    run.release();
    // Back to the student's own screen rather than the front door. They are signed in, the
    // work they just turned in is on it, and the front door's first question — do you have a
    // class code — is one they answered twenty-five minutes ago.
    window.location.assign("/home");
  }, [activeWorldId, run]);

  const handOver = useCallback(() => {
    clearEveryAttempt();
    run.release();
    // The session goes with the attempt. Clearing one and keeping the other is the shared-cart
    // failure with an extra step: the next student would sit down to a cleared board that was
    // still signed in as the last one, and every decision they made would be filed under a
    // name that is not theirs.
    forgetStudent();
    // Straight to the sign-in rather than the front door: the next person is here to do the
    // work, and the one screen they need is the one that asks who they are.
    window.location.assign("/join");
  }, [run]);

  const enterWorld = useCallback((worldId: WorldId) => setActiveWorldId(worldId), []);

  /**
   * Delivery is separate from the reducer on purpose. The attempt is already safe in
   * localStorage by the time this runs, so a failed send is a thing the student can retry
   * rather than work they have lost — and the reducer stays a pure function of decisions,
   * with no network state smuggled into the evidence log.
   */
  const deliver = useCallback(async () => {
    await deliverWithRetry(
      transport,
      {
        classCode: state.meta.classCode,
        seatCode: state.meta.seatCode,
        sessionId: state.meta.sessionId,
        challengeId: state.meta.challengeId,
        challengeVersion: state.meta.challengeVersion,
        // Sent only when the class named one. An empty string would be a claim about which
        // assignment this was, and the service is better placed to attribute it than a
        // browser that was never told.
        ...(state.meta.assignmentId ? { assignmentId: state.meta.assignmentId } : {}),
        log: state.log,
      },
      setDelivery,
    );
  }, [transport, state.meta, state.log]);

  const value = useMemo(
    () => ({ state, dispatch, reset, transport, delivery, deliver, activeWorldId, offer, setOffer, enterWorld, handOver }),
    [state, dispatch, reset, transport, delivery, deliver, activeWorldId, offer, enterWorld, handOver],
  );
  return (
    <ChallengeContext.Provider value={value}>
      {run.shadowed ? <RunElsewhere onTakeOver={run.takeOver} /> : children}
    </ChallengeContext.Provider>
  );
}

/**
 * What the second tab gets instead of the run.
 *
 * It replaces the whole challenge rather than sitting on top of it, and that is deliberate: a
 * banner over a live board is a board a student will use, and every press on it would be a
 * press this tab cannot save. The run is not lost and this does not throw anything away — the
 * work is in the tab that holds it, and taking it over here re-reads that work rather than
 * overwriting it.
 */
function RunElsewhere({ onTakeOver }: { onTakeOver: () => void }) {
  return (
    <div className="run-elsewhere">
      <main>
        <p className="eyebrow">This tab is not the one running it</p>
        <h1>Your challenge is open in another tab.</h1>
        <p>
          Two copies of the same run cannot both save, so this one is not saving anything. Go
          back to the other tab and carry on there — everything you have done is in it.
        </p>
        <p>If you cannot find it, or you closed it, you can move the run into this tab instead.</p>
        <Button type="button" variant="secondary" onClick={onTakeOver}>Move the run to this tab</Button>
      </main>
    </div>
  );
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) throw new Error("useChallenge must be used inside ChallengeProvider.");
  return context;
}
