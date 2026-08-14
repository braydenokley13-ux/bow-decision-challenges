/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type PropsWithChildren } from "react";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import { ATTEMPT_KEY, loadAttempt, saveAttempt } from "../domain/io/persistence";

interface ChallengeContextValue {
  state: ChallengeState;
  dispatch: Dispatch<ChallengeAction>;
  reset: () => void;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export function ChallengeProvider({ children }: PropsWithChildren) {
  const [state, rawDispatch] = useReducer(challengeReducer, undefined, () => loadAttempt() ?? createInitialState(Date.now()));
  const timer = useRef<number | null>(null);

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

  const value = useMemo(() => ({ state, dispatch, reset }), [state, dispatch, reset]);
  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) throw new Error("useChallenge must be used inside ChallengeProvider.");
  return context;
}
