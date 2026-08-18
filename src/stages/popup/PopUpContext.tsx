/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type PropsWithChildren } from "react";
import { clearAttemptFor, clearEveryAttempt, loadAttemptFor } from "../../domain/io/persistence";
import { useAttemptAutosave, useSingleFireDispatch } from "../../app/attemptStore";
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
  /** Somebody else is sitting here: every world's attempt cleared, back to the join form. */
  handOver: () => void;
}

const PopUpContext = createContext<PopUpContextValue | null>(null);

/** Who this seat is, carried over from the join screen the student already passed. */
export interface PopUpSeed {
  classCode: string;
  seatCode: string;
  assignmentId: string;
}

/**
 * Whether a stored run is this student's to carry on with.
 *
 * A run nobody has claimed a seat against belongs to whoever is here — that is the ordinary
 * case of a student reloading, and the seat on the attempt is the one they typed. The case
 * this exists for is the other one: a student who has just joined with their *own* seat, on a
 * device where the last student left an unfinished market behind. The provider used to skip
 * starting a session whenever the restored attempt already had one, so the new student's seat
 * was dropped on the floor and everything they then did was filed under the seat of whoever
 * had the machine before them — a submission attributed to a child who did not make it.
 *
 * An empty seed is not a mismatch. It means nobody has joined in this browser since the page
 * loaded, so there is no competing claim, and the run on screen says whose it is and offers
 * the way out.
 */
function belongsToSeat(state: PopUpState, seed: PopUpSeed): boolean {
  if (state.meta.sessionId === "") return true;
  if (!seed.seatCode || !seed.classCode) return true;
  return state.meta.seatCode === seed.seatCode && state.meta.classCode === seed.classCode;
}

export function PopUpProvider({ children, seed, transport }: PropsWithChildren<{ seed: PopUpSeed; transport: EvidenceTransport }>) {
  const [state, rawDispatch] = useReducer(
    popUpReducer,
    undefined,
    () => {
      const restored = loadAttemptFor<PopUpState>("food-truck");
      if (restored && belongsToSeat(restored, seed)) return restored;
      // The seat that has just joined outranks a run left behind by the seat before it. The
      // stale keys and drafts go with it, so the new student's write-up box does not open
      // holding somebody else's sentences.
      if (restored) clearAttemptFor("food-truck");
      return createPopUpState(Date.now());
    },
  );
  const [delivery, setDelivery] = useState<DeliveryState>({ status: "idle" });

  // The reducer stays pure, so the clock is read here and travelled with the action, and a
  // button pressed twice inside a double-click is recorded once.
  const dispatch = useSingleFireDispatch<PopUpAction>(rawDispatch);

  // A run that has not been started yet starts here, with the class and seat the student
  // already typed. The session id is this world's own: two attempts in one browser are two
  // pieces of work, and giving them one id would make the class service's record ambiguous
  // about which one a submission came from.
  const started = state.meta.sessionId !== "";
  // The ref, not the flag, is what stops this happening twice. React runs an effect twice on
  // mount in development, and both runs read the same `started` from the same render — so the
  // market opened with two SESSION_STARTED events in its log and a session id that did not
  // match the one on the first of them.
  const starting = useRef(false);
  useEffect(() => {
    if (started || starting.current) return;
    starting.current = true;
    dispatch({
      type: "SESSION_STARTED",
      sessionId: crypto.randomUUID(),
      classCode: seed.classCode,
      seatCode: seed.seatCode,
      ...(seed.assignmentId ? { assignmentId: seed.assignmentId } : {}),
    });
  }, [started, seed, dispatch]);

  // The same rule Basketball's provider keeps, from the same module: anything that reached
  // the log is written at once, a draft waits a moment, and the page going away ends the wait.
  useAttemptAutosave(state);

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
    // Every key this world's attempt can be restored from, plus the drafts its screens were
    // holding. A student who asks to run the market again must not be handed the last one.
    clearAttemptFor("food-truck");
    window.location.assign("/");
  }, []);

  const handOver = useCallback(() => {
    clearEveryAttempt();
    // Same door as the other world's, for the same reason: the next person at this machine
    // has to be able to say who they are before anything else happens.
    window.location.assign("/");
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, transport, delivery, deliver, reset, handOver }),
    [state, dispatch, transport, delivery, deliver, reset, handOver],
  );
  return <PopUpContext.Provider value={value}>{children}</PopUpContext.Provider>;
}

export function usePopUp() {
  const context = useContext(PopUpContext);
  if (!context) throw new Error("usePopUp must be used inside PopUpProvider.");
  return context;
}
