import { useState } from "react";
import { Button } from "./Button";

interface RunMenuProps {
  /** The class this run was joined with. Empty before anybody has joined. */
  classCode: string;
  /** The seat this run belongs to. Empty before anybody has joined. */
  seatCode: string;
  /** Whether the work has been handed in and is now with the teacher. */
  submitted: boolean;
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
export function RunMenu({ classCode, seatCode, submitted, onLeave }: RunMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const named = classCode !== "" && seatCode !== "";
  return (
    <details className="run-menu" onToggle={() => setConfirming(false)}>
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
        <p className="run-menu__cost">
          {submitted
            ? "What you turned in stays with your teacher. Leaving only clears it off this computer."
            : "Nothing here has been turned in yet. Leaving clears this run off this computer, and it cannot be got back."}
        </p>
        {confirming ? (
          <div className="run-menu__confirm">
            <Button type="button" variant="danger" onClick={onLeave}>Yes — clear it and start again</Button>
            <Button type="button" variant="quiet" onClick={() => setConfirming(false)}>No — keep working</Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>Leave this run</Button>
        )}
      </div>
    </details>
  );
}
