/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useReducer, useState, type Dispatch, type PropsWithChildren } from "react";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import type { WorldId } from "../domain/core/ids";
import { clearAttemptFor, lastWorldPlayed, loadAttemptFor } from "../domain/io/persistence";
import { useAttemptAutosave, useRunLock, useSingleFireDispatch } from "./attemptStore";
import { Button } from "../components/primitives/Button";
import { DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { deliverWithRetry, type DeliveryState, type EvidenceTransport } from "../platform/evidence/transport";
import { transportFromEnvironment } from "../platform/evidence/transports";
import type { WorldOffer } from "../stages/worldOffer";
import { useAttemptCheckpoint } from "../student/useAttemptCheckpoint";
import { closingAnswerFor } from "../student/closingQuestion";
import { handOverStudentDevice } from "../student/handOver";

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
  /** A disposable run with nothing behind it. Nothing about it is saved or sent. */
  sample: boolean;
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

export function ChallengeProvider({ children, transport = DEFAULT_TRANSPORT, initial, initialWorldId, sample = false }: PropsWithChildren<{
  transport?: EvidenceTransport;
  /**
   * A disposable run nobody is going to read: the educator guide's "Try it as a student".
   *
   * It turns off the two things that outlive the tab — the local autosave and the class
   * checkpoint — because a teacher trying the product on a classroom laptop must not write over
   * the attempt a child left in that browser, and a run with no class behind it has nothing to
   * checkpoint to. Everything else is the run a student gets, including this world's reducer,
   * so what a teacher sees here is what their students see.
   */
  sample?: boolean;
  /**
   * An attempt this browser did not write.
   *
   * Cross-device resume, and the only way it can work: the reducer's initial state is chosen
   * once, at mount, so a run recovered from the service has to be in hand before the provider
   * exists rather than dispatched into it afterwards. `ResumeGate` in `App.tsx` is what fetches
   * it. Absent on every other route, where the answer is whatever this machine remembers.
   */
  initial?: ChallengeState;
  /**
   * Which world's screens to open on, when something outside this provider already knows.
   *
   * `restoredWorld()` answers from this machine's own storage, which is the right answer on the
   * machine the run was made on and no answer at all on a different one. A student resuming the
   * market on a second device landed on the world picker and was asked to choose again — and
   * the market's own gate, which restores its run, only runs once its screens are mounted, so
   * the run stayed unrestored behind a question the student had already answered.
   */
  initialWorldId?: WorldId;
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
  const [activeWorldId, setActiveWorldId] = useState<WorldId>(() => initialWorldId ?? restoredWorld());
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
  useAttemptAutosave(state, !sample && activeWorldId === state.meta.worldId && !run.shadowed);

  // And the same attempt to the class it belongs to, so a teacher walking the room can see who
  // is mid-run and a student can finish on a different machine. Local storage answers neither
  // of those questions, and both are things this product promises.
  useAttemptCheckpoint(
    state.meta.classCode
      ? {
        classCode: state.meta.classCode,
        worldId: state.meta.worldId,
        stage: state.stage,
        sessionId: state.meta.sessionId,
        payload: state,
        ...(state.meta.assignmentId ? { assignmentId: state.meta.assignmentId } : {}),
      }
      : null,
    !sample && activeWorldId === state.meta.worldId && !run.shadowed,
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
    handOverStudentDevice({ release: run.release });
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
        // The teacher's own question, answered. Read from its own store rather than from the
        // reducer, because it is not evidence and there is no path from that store into a log.
        ...(closingAnswerFor(state.meta.sessionId) ? { closingAnswer: closingAnswerFor(state.meta.sessionId)! } : {}),
        log: state.log,
      },
      setDelivery,
    );
  }, [transport, state.meta, state.log]);

  const value = useMemo(
    () => ({ state, dispatch, reset, transport, delivery, deliver, activeWorldId, sample, offer, setOffer, enterWorld, handOver }),
    [state, dispatch, reset, transport, delivery, deliver, activeWorldId, sample, offer, enterWorld, handOver],
  );
  return (
    <ChallengeContext.Provider value={value}>
      {run.state === "elsewhere"
        ? <RunElsewhere onTakeOver={run.takeOver} />
        : run.state === "checking" ? <PickingUp /> : children}
    </ChallengeContext.Provider>
  );
}

/**
 * The blink while this tab finds out whether anybody else has the run.
 *
 * It is under a second and it says nothing about the student, because at this moment nothing
 * about the student is known. What used to be here instead was a red screen asserting that
 * their challenge was open in another tab — asserted, not checked — and the common way to see
 * it was to close the browser at the end of a lesson and come back to it the next morning.
 */
function PickingUp() {
  return (
    <div className="run-elsewhere">
      <main>
        <p className="eyebrow">One moment</p>
        <h1>Picking your run back up…</h1>
        <p>Making sure it is not open in another window first, so two copies cannot save over each other.</p>
      </main>
    </div>
  );
}

/**
 * What the second tab gets instead of the run — once there really is a second tab.
 *
 * It replaces the whole challenge rather than sitting on top of it, and that is deliberate: a
 * banner over a live board is a board a student will use, and every press on it would be a
 * press this tab cannot save. The run is not lost and this does not throw anything away — the
 * work is in the window that holds it, and carrying on here re-reads that work rather than
 * overwriting it.
 *
 * It leads with the way out. A twelve-year-old sitting down to finish their work does not need
 * a paragraph about why two copies cannot both save before they are allowed to carry on; they
 * need the button, and the explanation underneath it. This screen is only ever shown now to a
 * tab that has heard the other one answer, so every sentence on it is true of what happened.
 */
function RunElsewhere({ onTakeOver }: { onTakeOver: () => void }) {
  return (
    <div className="run-elsewhere">
      <main>
        <p className="eyebrow">This run is open in another window</p>
        <h1>Carry on here?</h1>
        <Button type="button" variant="primary" onClick={onTakeOver}>Carry on here</Button>
        <p>
          The same run is open in another window on this computer, and it is still saving there.
          Only one of them can save at a time, so this one is not saving anything yet.
        </p>
        <p>Carrying on here brings the run over with everything you have done. Nothing is lost either way.</p>
      </main>
    </div>
  );
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) throw new Error("useChallenge must be used inside ChallengeProvider.");
  return context;
}
