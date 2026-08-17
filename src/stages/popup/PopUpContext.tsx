/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type PropsWithChildren } from "react";
import { attemptKeyForWorld, loadAttemptFor, saveAttempt } from "../../domain/io/persistence";
import { createPopUpState, popUpReducer, type PopUpAction, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { deliverWithRetry, type DeliveryState, type EvidenceTransport } from "../../platform/evidence/transport";

/**
 * Run the Pop-Up's own provider, holding Run the Pop-Up's own machine.
 *
 * It is a second provider rather than a second branch inside the first one, for the reason
 * §7.1 gives: the interior belongs to the world. Basketball's provider holds a reducer that
 * knows about setups, weeks and blocks of time; this one holds a reducer that knows about
 * trays, crowds and a rented generator. Neither can read the other's state, which is exactly
 * the guarantee that stops one world's board being priced by the other's economy.
 *
 * What they share is everything that is genuinely the platform's: the transport, the delivery
 * retry, the per-world attempt key, and the clock being read here so the reducer stays pure.
 */
interface PopUpContextValue {
  state: PopUpState;
  dispatch: Dispatch<PopUpAction>;
  transport: EvidenceTransport;
  delivery: DeliveryState;
  deliver: () => Promise<void>;
  reset: () => void;
}

const PopUpContext = createContext<PopUpContextValue | null>(null);

/** Who this seat is, carried over from the join screen the student already passed. */
export interface PopUpSeed {
  classCode: string;
  seatCode: string;
  assignmentId: string;
}

export function PopUpProvider({ children, seed, transport }: PropsWithChildren<{ seed: PopUpSeed; transport: EvidenceTransport }>) {
  const [state, rawDispatch] = useReducer(
    popUpReducer,
    undefined,
    () => loadAttemptFor<PopUpState>("food-truck") ?? createPopUpState(Date.now()),
  );
  const [delivery, setDelivery] = useState<DeliveryState>({ status: "idle" });
  const timer = useRef<number | null>(null);
  const savedStage = useRef<string | null>(null);

  const dispatch = useCallback<Dispatch<PopUpAction>>((action) => rawDispatch({ ...action, at: Date.now() }), []);

  // A run that has not been started yet starts here, with the class and seat the student
  // already typed. The session id is this world's own: two attempts in one browser are two
  // pieces of work, and giving them one id would make the class service's record ambiguous
  // about which one a submission came from.
  const started = state.meta.sessionId !== "";
  useEffect(() => {
    if (started) return;
    dispatch({
      type: "SESSION_STARTED",
      sessionId: crypto.randomUUID(),
      classCode: seed.classCode,
      seatCode: seed.seatCode,
      ...(seed.assignmentId ? { assignmentId: seed.assignmentId } : {}),
    });
  }, [started, seed, dispatch]);

  useEffect(() => {
    // Arriving somewhere is written down at once; adjusting a board is debounced. The same
    // rule Basketball's provider keeps, and for the same reason: a reload a moment after a
    // screen change must not cost the student the screen.
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
  }, [state]);

  const deliver = useCallback(async () => {
    await deliverWithRetry(
      transport,
      {
        classCode: state.meta.classCode,
        seatCode: state.meta.seatCode,
        sessionId: state.meta.sessionId,
        challengeId: state.meta.challengeId,
        challengeVersion: state.meta.challengeVersion,
        ...(state.meta.assignmentId ? { assignmentId: state.meta.assignmentId } : {}),
        log: state.log,
      },
      setDelivery,
    );
  }, [transport, state.meta, state.log]);

  const reset = useCallback(() => {
    window.localStorage.removeItem(attemptKeyForWorld("food-truck"));
    window.location.assign("/");
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, transport, delivery, deliver, reset }),
    [state, dispatch, transport, delivery, deliver, reset],
  );
  return <PopUpContext.Provider value={value}>{children}</PopUpContext.Provider>;
}

export function usePopUp() {
  const context = useContext(PopUpContext);
  if (!context) throw new Error("usePopUp must be used inside PopUpProvider.");
  return context;
}
