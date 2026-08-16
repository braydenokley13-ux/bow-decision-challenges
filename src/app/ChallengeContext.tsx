/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type PropsWithChildren } from "react";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import { ATTEMPT_KEY, loadAttempt, saveAttempt } from "../domain/io/persistence";
import { deliverWithRetry, type DeliveryState, type EvidenceTransport } from "../platform/evidence/transport";
import { transportFromEnvironment } from "../platform/evidence/transports";

interface ChallengeContextValue {
  state: ChallengeState;
  dispatch: Dispatch<ChallengeAction>;
  reset: () => void;
  transport: EvidenceTransport;
  /** Where the finished work stands: not sent, sending, delivered, or honestly failed. */
  delivery: DeliveryState;
  /** Sends the finished attempt. Safe to call again after a failure. */
  deliver: () => Promise<void>;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

/** One transport per build. Tests and design work pass their own. */
const DEFAULT_TRANSPORT = transportFromEnvironment();

export function ChallengeProvider({ children, transport = DEFAULT_TRANSPORT }: PropsWithChildren<{ transport?: EvidenceTransport }>) {
  const [state, rawDispatch] = useReducer(challengeReducer, undefined, () => loadAttempt() ?? createInitialState(Date.now()));
  const timer = useRef<number | null>(null);
  const [delivery, setDelivery] = useState<DeliveryState>({ status: "idle" });

  // The reducer stays pure, so the clock is read here and travelled with the action. This
  // is the only place the app learns what time it is.
  const dispatch = useCallback<Dispatch<ChallengeAction>>((action) => rawDispatch({ ...action, at: Date.now() }), []);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveAttempt(state), 250);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state]);

  const reset = useCallback(() => {
    window.localStorage.removeItem(ATTEMPT_KEY);
    window.location.assign("/");
  }, []);

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
        log: state.log,
      },
      setDelivery,
    );
  }, [transport, state.meta, state.log]);

  const value = useMemo(
    () => ({ state, dispatch, reset, transport, delivery, deliver }),
    [state, dispatch, reset, transport, delivery, deliver],
  );
  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) throw new Error("useChallenge must be used inside ChallengeProvider.");
  return context;
}
