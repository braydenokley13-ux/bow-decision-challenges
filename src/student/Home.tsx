import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { stageLabel, WORLD_REGISTRY } from "../domain/scenario/registry";
import { forgetStudent, studentToken, type StudentClass } from "./session";
import { NOT_A_RUN_IN_PROGRESS, readClasses, unfinishedRunHere } from "./completedRun";
import { PLAYABLE_WORLDS, DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { clearAttemptFor } from "../domain/io/persistence";
import { worldOffer } from "../stages/worldOffer";
import type { WorldId } from "../domain/core/ids";

/**
 * The whole of a student's own screen.
 *
 * It answers three questions and refuses every other job: **what can I do**, **what was I
 * doing**, and **what did my teacher say**. There are no tabs, no streak, no badges, no
 * points, no feed and no notifications, because none of those makes a decision better, makes
 * a student's thinking more visible, or makes a teacher's job easier — which is the test every
 * feature in this product has to pass.
 *
 * The third question is the one that did not exist. A student used to spend twenty minutes
 * deciding, write four sentences explaining why, read *"Your plan is with your teacher"*, and
 * that was the end of the product. Their teacher read the paragraph, scored it criterion by
 * criterion, sometimes disagreed with BOW on the record — and none of it ever came back. So
 * what a teacher wrote sits at the top of this page, above the work, because it is the reason
 * a student would open it again.
 */
export function StudentHome() {
  const navigate = useNavigate();
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; classes: StudentClass[] }>({ status: "loading" });

  useEffect(() => {
    if (!studentToken()) {
      navigate("/join", { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await readClasses();
      if (cancelled) return;
      if (!result.ok) {
        // A dead session is a sign-in to do again. A dead network is not, and this screen used
        // to treat them the same — it forgot the student's session on any failure, so a wifi
        // blip on a Chromebook cart logged a child out and sent them off to find their card.
        if (result.why === "signed-out") {
          forgetStudent();
          navigate("/join", { replace: true });
          return;
        }
        setState({ status: "error", message: "BOW could not reach your class just now. It is almost always the wifi. Your work is safe — try again in a minute." });
        return;
      }
      setState({ status: "ready", classes: result.body.classes });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (state.status === "loading") {
    return <main className="student-home"><p aria-live="polite">Getting your classes…</p></main>;
  }
  if (state.status === "error") {
    return <ClassDidNotLoad message={state.message} />;
  }

  const signedInAs = state.classes[0]?.displayName ?? null;
  return <Ready classes={state.classes} signedInAs={signedInAs} onSignOut={() => { forgetStudent(); navigate("/join", { replace: true }); }} />;
}

/**
 * The screen when the class could not be fetched.
 *
 * It takes focus on arrival for the same reason every other screen here does: this is a page
 * change, and a student using a screen reader who is not told about it is a student tabbing
 * from the top of the document to find out what happened.
 */
function ClassDidNotLoad({ message }: { message: string }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  return (
    <main className="student-home">
      <header className="student-home__bar"><AppMark /></header>
      <section className="student-home__empty">
        <h1 tabIndex={-1} ref={title}>Your class did not load.</h1>
        <p role="alert">{message}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>
        <Link to="/join">Type a class code</Link>
      </section>
    </main>
  );
}

/**
 * The screen, once there is one.
 *
 * Split out for one reason: arriving here is a page change a keyboard or screen-reader user is
 * entitled to be told about. Signing in used to end with focus on `<body>`, so somebody using
 * the door with a screen reader typed two codes, pressed Enter, and was told nothing at all
 * about having arrived anywhere. The heading takes focus, once, on arrival.
 */
function Ready({ classes, signedInAs, onSignOut }: {
  classes: readonly StudentClass[];
  signedInAs: string | null;
  onSignOut: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);

  return (
    <main className="student-home">
      <header className="student-home__bar">
        <AppMark />
        <div>
          {/* Whose screen this is, on every screen. On a shared machine the previous student's
              session used to be indistinguishable from your own — and the way out of that is
              not a warning, it is saying whose it is before anything else loads. */}
          {signedInAs && <span>{signedInAs}</span>}
          <Button variant="quiet" onClick={onSignOut}>Not you?</Button>
        </div>
      </header>

      {classes.length === 0 ? (
        <section className="student-home__empty">
          <h1 tabIndex={-1} ref={title}>You are not in a class yet.</h1>
          <p>Ask your teacher for the class code, then come back.</p>
          <Link className="button button--primary" to="/join">Type a class code</Link>
        </section>
      ) : (
        /* The page had no heading at all until a student had no classes, which left the one
           screen a student comes back to with nothing for a screen reader to land on and a
           heading order that started at h2. */
        <h1 className="student-home__title" tabIndex={-1} ref={title}>Your work is here.</h1>
      )}

      {classes.map((entry) => (
        <ClassBlock key={entry.classCode} entry={entry} />
      ))}

      {classes.length > 0 && (
        <footer className="student-home__foot">
          <Link to="/join">Join another class</Link>
        </footer>
      )}
    </main>
  );
}

/**
 * The run this student actually has open, or null.
 *
 * A checkpoint on one of the screens before a story starts is not a run in progress — see
 * `NOT_A_RUN_IN_PROGRESS`. A finished run is the service's job and it does it: a submission
 * marks its seat's checkpoint, and that mark now survives the checkpoints written after it.
 */
function liveRun(entry: StudentClass): StudentClass["inProgress"] {
  return entry.inProgress && !NOT_A_RUN_IN_PROGRESS.includes(entry.inProgress.stage) ? entry.inProgress : null;
}

function ClassBlock({ entry }: { entry: StudentClass }) {
  const inProgress = liveRun(entry);
  const world = inProgress ? WORLD_REGISTRY[inProgress.worldId] : undefined;
  return (
    <section className="student-class">
      <p className="eyebrow">{entry.label}</p>

      {/* Every note, in the order they were written. The list has always been a list here;
          what changed is that the service now has more than one note to put in it. Keyed by
          the note's own id rather than by its timestamp, because two notes written inside the
          same millisecond are one React key, and an edited note keeps the timestamp it was
          first sent at — which is the point of the edit. */}
      {entry.feedback.length > 0 && (
        <div className="student-feedback">
          <p className="field-label">From your teacher</p>
          {entry.feedback.map((note) => (
            <blockquote key={note.id}>
              {note.body}
              <cite>
                {new Date(note.at).toLocaleDateString()}
                {note.editedAt ? " · your teacher changed this" : ""}
              </cite>
            </blockquote>
          ))}
        </div>
      )}

      {inProgress ? (
        <div className="student-card student-card--live">
          <h2>{world?.title ?? "Your run"}</h2>
          <p>You stopped at <strong>{stageLabel(inProgress.worldId, inProgress.stage)}</strong>.</p>
          {/* The class code goes with them. It is what lets the run be fetched from the service
              rather than from this machine's storage, which is the whole of "started it in class
              on Tuesday, finished it at home on Thursday". Without it this button was a promise
              to hand a student a blank board on any device but the one they began on. */}
          <Link className="button button--primary" to={`${PLAN_UNDER_PRESSURE.route}?class=${entry.classCode}`}>Carry on</Link>
        </div>
      ) : entry.completed.length === 0 ? (
        <div className="student-card">
          <h2>{PLAN_UNDER_PRESSURE.title}</h2>
          {/* The challenge's own line, not one world's. `subtitle` is Basketball's
              ("Eight weeks to the showcase"), and printing it above a button that may open
              the night market is the same false promise the front door used to make. */}
          <p>You handle the money. {PLAN_UNDER_PRESSURE.duration.min}–{PLAN_UNDER_PRESSURE.duration.max} minutes.</p>
          <Link className="button button--primary" to={`${PLAN_UNDER_PRESSURE.route}?class=${entry.classCode}`}>Start</Link>
        </div>
      ) : null}

      {entry.completed.map((done) => (
        <div className="student-card student-card--done" key={done.sessionId}>
          <h2>{done.worldId ? WORLD_REGISTRY[done.worldId]?.title ?? "Turned in" : "Turned in"}</h2>
          <p>
            Turned in {new Date(done.submittedAt).toLocaleDateString()}.
            {entry.feedback.some((note) => note.sessionId === done.sessionId)
              ? " Your teacher has written back."
              : " Your teacher has it."}
          </p>
          {/* The one door to the recap, and it says what is behind it rather than "details".
              A student who turned in yesterday came back to a card that could only tell them
              their work had arrived somewhere — true, and not worth opening the page for.
              The link is deliberately not the word "results": nothing behind it is a mark. */}
          <Link to={`/run/${entry.classCode}/${done.sessionId}`}>See what your run shows</Link>
        </div>
      ))}

      {/* Under the work rather than over it: the offer of another go is the answer to
          "what now", and "what now" comes after "what happened". Clearing this machine's
          attempt costs the student nothing now — a finished run is read back from the class
          service, not from the copy the run left behind. */}
      {entry.completed.length > 0 && liveRun(entry) === null && <PlayAgain entry={entry} />}
    </section>
  );
}

/**
 * The way back in, which did not exist.
 *
 * A student who finished used to reach the end of the product. The turn-in screen offers
 * *"Run the market again"* / *"Try a different plan"*, and both of those clear the attempt
 * and send the browser to `/` — the front door, which is a marketing page with a *"For
 * educators"* link on it and no way back into the class. From `/home` there was nothing at
 * all: the card that offers to start is drawn only while `completed` is empty. So the only
 * route to a second run was typing the challenge URL, which a student in the red-team review
 * worked out and did — producing a second submission on his seat that the product had never
 * agreed to and could not label.
 *
 * Three rulings are baked into what this says, and each is a decision rather than a default.
 *
 * **It offers whatever the class was set, not "the same one again."** If the teacher enabled
 * choice, this lands on the picker, because the most useful second run is usually the other
 * story: the same money problem with different constraints is the whole reason two worlds
 * exist. If the class was set one world, it opens that world, because offering a choice the
 * teacher switched off would be the student screen overruling them.
 *
 * **It says what happens to the first run, in the same words the turn-in screen used.** A
 * second run is turned in *as well as*, never *instead of*. A student who thinks they can
 * quietly replace a bad run is a student who has been misled by the button, and their teacher
 * is the one who finds out.
 *
 * **It is offered to everybody, including in a class whose work is going in a gradebook.**
 * The product has no field that says an assignment is graded, and inferring one — from
 * whether the teacher attached an objective, say — would let a reporting choice silently
 * decide what a child is allowed to do, and be wrong in both directions. The thing that made
 * "let them replay" dangerous is a score to beat, and there is no score anywhere on a
 * student's side of this product: what a second run offers is a different ending, which is
 * what the run itself says at Week 8. Whether a second attempt counts is a teacher's
 * judgement, and the teacher can now see both.
 */
function PlayAgain({ entry }: { entry: StudentClass }) {
  const offer = worldOffer({
    allowedWorldIds: entry.assignments.flatMap((assignment) => assignment.allowedWorldIds ?? []),
    assignmentAllowsChoice: entry.assignments.some((assignment) => assignment.studentChoosesWorld),
    playableWorldIds: PLAYABLE_WORLDS.map((world) => world.id),
    pickerReady: true,
    defaultWorldId: DEFAULT_WORLD_ID,
  });
  const played = new Set(entry.completed.map((done) => done.worldId).filter((id): id is WorldId => id !== null));
  const other = offer.worldIds.filter((id) => !played.has(id));

  // Nothing is offered while this machine is holding a run nobody has turned in, because
  // "again" clears exactly that. Finishing what you started is also the better prompt.
  if (unfinishedRunHere(offer.worldIds, entry.completed.map((done) => done.sessionId))) return null;

  return (
    <div className="student-card">
      <h2>Run it again?</h2>
      <p>
        {offer.studentChooses && other.length > 0
          ? `You can go again, and you can pick a different one — ${other.map((id) => WORLD_REGISTRY[id]?.title ?? id).join(" or ")} is still there.`
          : offer.studentChooses
            ? "You can go again, in either story."
            : `You can play ${WORLD_REGISTRY[offer.opensInto]?.title ?? "it"} again.`}
        {" "}Different decisions make a different ending, and there is no score here to beat.
      </p>
      {/* The same promise the turn-in screen makes, kept on the screen where it is acted on. */}
      <p>Starting again does not take the last one back. What you turned in stays with your teacher, and a new run is turned in as well as it, not instead of it — your teacher sees both.</p>
      <a
        className="button button--secondary"
        href={`${PLAN_UNDER_PRESSURE.route}?class=${entry.classCode}`}
        onClick={() => {
          // Cleared here rather than by the run itself, because a restored attempt is what
          // "again" has to mean the opposite of. Only the worlds this class was set: an
          // attempt in a world this class never offered belongs to another class's run.
          for (const worldId of offer.worldIds) clearAttemptFor(worldId);
        }}
      >
        Play it again
      </a>
    </div>
  );
}
