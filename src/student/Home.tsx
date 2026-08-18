import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { stageLabel, WORLD_REGISTRY } from "../domain/scenario/registry";
import { forgetStudent, readMyClasses, studentToken, type StudentClass } from "./session";

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
      const result = await readMyClasses();
      if (cancelled) return;
      if (!result.ok) {
        // A dead session is not an error to explain, it is a sign-in to do again.
        forgetStudent();
        navigate("/join", { replace: true });
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
    return <main className="student-home"><p role="alert">{state.message}</p></main>;
  }

  const signedInAs = state.classes[0]?.displayName ?? null;
  return <Ready classes={state.classes} signedInAs={signedInAs} onSignOut={() => { forgetStudent(); navigate("/join", { replace: true }); }} />;
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

function ClassBlock({ entry }: { entry: StudentClass }) {
  const world = entry.inProgress ? WORLD_REGISTRY[entry.inProgress.worldId] : undefined;
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

      {entry.inProgress ? (
        <div className="student-card student-card--live">
          <h2>{world?.title ?? "Your run"}</h2>
          <p>You stopped at <strong>{stageLabel(entry.inProgress.worldId, entry.inProgress.stage)}</strong>.</p>
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
        </div>
      ))}
    </section>
  );
}
