import { useEffect, useId, useRef, useState } from "react";
import type { DeliveryState } from "../../platform/evidence/transport";
import { disclosureEscape } from "./disclosureEscape";

interface RunMenuProps {
  /** The class this run was joined with. Empty before anybody has joined. */
  classCode: string;
  /** The seat this run belongs to. Empty before anybody has joined. */
  seatCode: string;
  /**
   * Where the work actually is, from the same source the submitted screen reads.
   *
   * This was `submitted: boolean`, and both shells passed `state.stage === "submitted"` — a
   * stage the reducer enters on the *button press*, before any request is made. So for the
   * whole of a slow or failed turn-in this control told a child their work was safe with
   * their teacher, next to a button that deletes it. A student on a school network that
   * accepts the POST and never answers sits on "Sending your plan…" with the run menu as the
   * only other control on the screen; reproduced end to end, and it destroyed the attempt,
   * the log and the written defence with nothing anywhere to recover them from.
   *
   * The submitted screen never had this bug — it reads `delivery` and says "Sending your
   * plan…" until the service answers. This now reads the same thing.
   */
  handIn: DeliveryState["status"];
  /** Clears every attempt on this device and goes back to the join form. */
  onLeave: () => void;
}

/**
 * Whose run this is, and the way out of it.
 *
 * Two failures put this in the top bar of every screen, and both of them were reproduced on a
 * shared computer, which is the only kind most of these students have.
 *
 * The first: a restored attempt said nothing about who it belonged to. A student sat down,
 * the browser handed them the last student's half-finished run, and every screen from there on
 * looked exactly like their own — there was no seat on screen to disagree with, and the join
 * form is only reachable at the very first screen, so there was no way back to it either.
 * Everything they then did was filed under somebody else's name.
 *
 * The second: a student who picked the wrong world had two choices, finish the wrong world or
 * stop. There was no "start again" on any screen of the run.
 *
 * One control answers both, because they are the same question — *is this run yours, and do
 * you want it?* It is a closed disclosure holding a confirm, so leaving takes three deliberate
 * presses and cannot happen by accident on a phone; and it says, before the last of them, what
 * leaving costs: an attempt that has not been handed in is cleared, and one that has is
 * already with the teacher and stays there.
 */
const COST: Record<DeliveryState["status"], string> = {
  idle: "Nothing here has been turned in yet. Leaving clears this run off this computer, and it cannot be got back.",
  sending: "Your plan is still on its way to your teacher. Leaving now clears it off this computer before it gets there, and it cannot be got back.",
  failed: "Your plan has not reached your teacher yet. It is safe on this computer, and leaving clears it — it cannot be got back. Try sending it again first.",
  delivered: "What you turned in stays with your teacher. Leaving only clears it off this computer.",
};

export function RunMenu({ classCode, seatCode, handIn, onLeave }: RunMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const named = classCode !== "" && seatCode !== "";
  const costId = useId();
  const drawer = useRef<HTMLDetailsElement>(null);
  /**
   * The safe button, held by identity rather than found by position, exactly as the roster's
   * erase confirmation holds its own.
   *
   * Pressing *Leave this run* removes the button that was pressed and puts two in its place,
   * and focus fell to `<body>`: the next `Tab` landed on *"Yes — clear it and start again"*,
   * which is the one control in the run that destroys a student's unsent work. The whole
   * product teaches `Tab` to the button, `Enter` — so on a shared Chromebook that reflex, once,
   * erased the run. Focus goes to the safe half instead, and the sentence saying what leaving
   * costs is the description on both buttons, so it is read wherever the student lands rather
   * than only if they happen to browse back up to it. A raw `<button>` because `Button` is not
   * a `forwardRef` component and would drop the ref.
   */
  const keepWorking = useRef<HTMLButtonElement>(null);
  /** And back to the button that opened the confirm when the student declines it. */
  const leave = useRef<HTMLButtonElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    // Closing the drawer also clears the confirm, and the button to put focus back on is
    // inside content the browser has just hidden. Nothing to move to, so nothing moves.
    if (!drawer.current?.open) return;
    if (confirming) keepWorking.current?.focus();
    else leave.current?.focus();
  }, [confirming]);
  return (
    <details
      className="run-menu"
      ref={drawer}
      onToggle={() => setConfirming(false)}
      /* Escape closes the drawer and puts the student back on the control that opened it.
         A `<details>` does not do this on its own, so the only ways out of this menu were its
         own two buttons — one of which is the destructive one. Shared with the contract
         drawer in the same bar, which was missing it. */
      onKeyDown={disclosureEscape(() => setConfirming(false))}
    >
      {/* The seat is the summary rather than a word like "menu", because the first job of this
          control is to tell a student whose work is on the screen in front of them. The spoken
          name contains the visible one word for word, so a student driving this by voice can
          ask for what they can see. */}
      <summary aria-label={named ? `This run: ${classCode} · seat ${seatCode}` : "This run has no seat yet"}>
        {named ? `${classCode} · seat ${seatCode}` : "No seat yet"}
      </summary>
      <div>
        <h2>{named ? `This is seat ${seatCode}’s run.` : "Nobody has joined yet."}</h2>
        <p>
          If that is not you, or you want to start again and pick a different one, you can leave
          this run here.
        </p>
        {/* Four states, not two, because "on its way" and "did not arrive" are neither of the
            two things this used to be able to say — and they are the two a student is most
            likely to be reading it in, since a turn-in that went through leaves nothing to
            wonder about. Each says where the work is and what leaving would cost from there. */}
        <p className="run-menu__cost" id={costId}>
          {COST[handIn]}
        </p>
        {confirming ? (
          <div className="run-menu__confirm">
            <button type="button" className="button button--danger" aria-describedby={costId} onClick={onLeave}>Yes — clear it and start again</button>
            <button type="button" className="button button--quiet" ref={keepWorking} aria-describedby={costId} onClick={() => setConfirming(false)}>No — keep working</button>
          </div>
        ) : (
          <button type="button" className="button button--secondary" ref={leave} onClick={() => setConfirming(true)}>Leave this run</button>
        )}
      </div>
    </details>
  );
}
