import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChallengeProvider } from "../app/ChallengeContext";
import { StudentChallenge } from "../stages/StudentChallenge";
import { localOnlyTransport } from "../platform/evidence/transports";

/** The one prefix every per-screen draft is written under. Mirrored, not imported: it is a
 *  private detail of the persistence layer and this route only ever reads it. */
const DRAFT_PREFIX = "bow.draft.";

/**
 * "Try it as a student", and the thing that button actually has to do.
 *
 * It has been at the top of the educator guide since the guide existed, and it landed on
 * *"What is your class code?"* — a prompt for a code the person evaluating the product does
 * not have and cannot get without first making a class, pasting a roster, printing a card and
 * reading the code off it. `DEMO` is refused there, correctly, because it is four characters
 * and a class code is five. The one button whose whole job is removing that friction delivered
 * a teacher into the middle of it, and the only honest answer to *what do the children see*
 * was a four-step setup.
 *
 * So this is a real run of the real screens, with nothing behind it. It is not a mock, not a
 * video and not a screenshot tour: it is `StudentChallenge`, both stories, the same reducers,
 * the same arithmetic gates, the same Week 5 and the same turn-in — with the transport swapped
 * for the one that was already in the codebase for exactly this and says so out loud:
 * *"Your work stays on this computer. Nothing is sent anywhere."*
 *
 * Three things it must not do, and how each is prevented rather than intended:
 *
 * - **It must not create a class.** `localOnlyTransport` never calls the class service. There
 *   is no join, no seat, no roster row and no code.
 * - **It must not reach a teacher's evidence room.** The checkpoint that tells a class where a
 *   student is up to only fires when the attempt carries a class code, and this one carries the
 *   empty string. Nothing is posted, so nothing can arrive in anybody's reading queue.
 * - **It must not be mistaken for a student's work.** `sample` turns the local autosave off, so
 *   a teacher trying this on a classroom laptop cannot write over the run a child left there at
 *   lunchtime. The cost is that a sample run does not survive a reload, which is the right
 *   trade: it is a look, not a piece of work. The per-screen drafts — the tray counts, the
 *   write-up box — are written by a hook this route does not own, so this route puts the draft
 *   shelf back exactly as it found it on the way out. Not `clearAttemptFor`, which would be the
 *   very harm this is guarding against: a teacher pressing "Try it as a student" on a
 *   classroom laptop must not delete the run a child left there, so nothing here removes a key
 *   it did not itself create, and nothing overwrites a value it did not itself change.
 *
 * And it says what it is, on every screen, in the words `/educator/class/DEMO` already uses for
 * the same idea — because a teacher who cannot tell a sample from the real thing has been shown
 * neither.
 */
export function SampleRun() {
  useEffect(() => {
    const before = new Map<string, string>();
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(DRAFT_PREFIX)) before.set(key, window.localStorage.getItem(key) ?? "");
      }
    } catch { /* a browser with storage switched off has nothing to put back */ }
    return () => {
      try {
        const now: string[] = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
          const key = window.localStorage.key(index);
          if (key?.startsWith(DRAFT_PREFIX)) now.push(key);
        }
        for (const key of now) {
          const was = before.get(key);
          if (was === undefined) window.localStorage.removeItem(key);
          else if (window.localStorage.getItem(key) !== was) window.localStorage.setItem(key, was);
        }
      } catch { /* nothing to put back */ }
    };
  }, []);

  return (
    <div className="sample-run" data-sample="true">
      <header className="sample-run__bar">
        <span className="demo-pill">Sample run — nothing here reaches a teacher</span>
        <p>
          These are the screens your students see. Nothing is saved, nothing is sent, and no
          class is made. Turning in at the end goes nowhere.
        </p>
        <Link to="/educator/guide">Back to the educator guide</Link>
      </header>
      {/* No `ResumeGate`. There is no session to resume from and nothing on the service to ask
          about, and a gate here would put "Finding where you got to…" in front of a teacher who
          has just pressed a button labelled "Try it as a student". */}
      <ChallengeProvider transport={localOnlyTransport()} sample>
        <StudentChallenge />
      </ChallengeProvider>
    </div>
  );
}
