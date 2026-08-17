/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type PropsWithChildren } from "react";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import type { WorldId } from "../domain/core/ids";
import { ATTEMPT_KEY, attemptKeyForWorld, lastWorldPlayed, loadAttemptFor, saveAttempt } from "../domain/io/persistence";
import { DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { deliverWithRetry, type DeliveryState, type EvidenceTransport } from "../platform/evidence/transport";
import { transportFromEnvironment } from "../platform/evidence/transports";
import type { WorldOffer } from "../stages/worldOffer";

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

export function ChallengeProvider({ children, transport = DEFAULT_TRANSPORT }: PropsWithChildren<{ transport?: EvidenceTransport }>) {
  // Basketball's attempt, by name. This provider holds Basketball's reducer, and with a second
  // world in the browser "whatever was open last" is no longer the same question as "what does
  // this reducer understand" — handing a food-truck attempt to this one would price another
  // world's board with this world's economy.
  const [state, rawDispatch] = useReducer(
    challengeReducer,
    undefined,
    () => loadAttemptFor<ChallengeState>(DEFAULT_WORLD_ID) ?? createInitialState(Date.now()),
  );
  const [activeWorldId, setActiveWorldId] = useState<WorldId>(restoredWorld);
  const [offer, setOffer] = useState<WorldOffer | null>(null);
  const timer = useRef<number | null>(null);
  const savedStage = useRef<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryState>({ status: "idle" });

  // The reducer stays pure, so the clock is read here and travelled with the action. This
  // is the only place the app learns what time it is.
  const dispatch = useCallback<Dispatch<ChallengeAction>>((action) => rawDispatch({ ...action, at: Date.now() }), []);

  useEffect(() => {
    // Only the world on screen writes. Saving is what moves the "last world played" pointer,
    // and a background provider that kept saving would drag a student back into this world
    // on the next reload while they were three screens into the other one.
    if (activeWorldId !== state.meta.worldId) return;
    // A screen the student has actually reached is written down at once. Everything else is
    // debounced, because a board being adjusted changes state on every keypress — but a
    // reload a moment after arriving somewhere used to land the student back at the join
    // form with the screen they had reached still sitting in a 250ms timer.
    if (savedStage.current !== state.stage) {
      savedStage.current = state.stage;
      saveAttempt(state);
      return;
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveAttempt(state), 250);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state, activeWorldId]);

  const reset = useCallback(() => {
    // Both keys: the per-world one every attempt is written to now, and the pre-world one an
    // attempt started before the second world shipped is still sitting in. Clearing only the
    // second used to hand the student back the very plan they asked to start again from.
    window.localStorage.removeItem(attemptKeyForWorld(DEFAULT_WORLD_ID));
    window.localStorage.removeItem(ATTEMPT_KEY);
    window.location.assign("/");
  }, []);

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
    () => ({ state, dispatch, reset, transport, delivery, deliver, activeWorldId, offer, setOffer, enterWorld }),
    [state, dispatch, reset, transport, delivery, deliver, activeWorldId, offer, enterWorld],
  );
  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) throw new Error("useChallenge must be used inside ChallengeProvider.");
  return context;
}
