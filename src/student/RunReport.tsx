import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import type { RecapNote, RecapTopic } from "../domain/recap";
import { completedRunSource, type CompletedRunSource } from "./completedRun";
import { forgetStudent, readMyClasses, studentToken, type StudentClass } from "./session";

/**
 * What a student gets back.
 *
 * Between *"Your plan is with your teacher"* and *"your teacher wrote back"* there used to
 * be nothing at all, and after it there was still nothing that said what the run had shown
 * about the decisions in it. This page is that missing half, and every constraint on it is
 * the same one the rest of the product keeps: **software may check whether the money works;
 * it may not decide whether a student's thinking makes sense.**
 *
 * So, concretely, and each of these is load-bearing rather than decorative:
 *
 * - **No number stands for the student.** No score, no level, no badge, no percentage, no
 *   progress bar, no count of how many topics went well. Every figure on the page is one the
 *   student themselves put into the run.
 * - **Nothing about their writing.** A person reads that and has not yet. Saying anything
 *   here about the paragraph would be the product pre-empting the one judgement it says only
 *   a human may make — so the page says out loud that it is silent about it, and why.
 * - **Absences are absences.** A topic the run never reached says so. It is never a zero and
 *   never an empty bar, because "never came up in this run" and "did not do it" are
 *   different sentences about a child.
 * - **Help is help.** A student who used a scaffold is described as having used one. The
 *   page says once, in its own voice, that using it is allowed and is written down as what
 *   it was.
 * - **The teacher goes first.** Wherever a person's words and BOW's facts are on the same
 *   screen, the person's are above. A note from a teacher is the only thing on this page
 *   anybody decided; everything under it is a read-out.
 *
 * **Why a route and not a panel on `/home`.** `/home` answers three questions — what can I
 * do, what was I doing, what did my teacher say — and a run's recap is six sections long.
 * Expanded inline it would turn the one screen a student comes back to into a wall, and with
 * two classes and three runs it would be a wall of walls. It is also worth reading rather
 * than glancing at. The card on `/home` is the only door to it and says what is behind it,
 * so the route is not a thing to find. **Why not the ending:** the ending is a receipt, read
 * ninety seconds after the last decision and before anything has been turned in anywhere;
 * a recap there is read as a mark, and the run's own Week 8 already tells the student what
 * their decisions did.
 */
export function RunReport() {
  const { classCode = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; classes: readonly StudentClass[]; source: CompletedRunSource }
  >({ status: "loading" });

  useEffect(() => {
    if (!studentToken()) {
      void navigate("/join", { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      // Both at once, and only one of them can send a student back to the door. The run comes
      // from `/me/runs/:sessionId` — the copy they turned in — and the class list is here for
      // one thing: what a person wrote back. A class list that fails to load costs this page
      // the teacher's note and nothing else, because a dropped wifi is not a signed-out
      // student, and treating it as one is how a network blip logged a child out of their
      // own class and sent them off to find their card again.
      const [classes, source] = await Promise.all([readMyClasses(), completedRunSource(sessionId)]);
      if (cancelled) return;
      if (source.status === "signed-out") {
        forgetStudent();
        void navigate("/join", { replace: true });
        return;
      }
      setState({ status: "ready", classes: classes.ok ? classes.body.classes : [], source });
    })();
    return () => { cancelled = true; };
  }, [navigate, sessionId]);

  if (state.status === "loading") {
    return <main className="student-home"><p aria-live="polite">Getting your run…</p></main>;
  }

  // The service is the one that decides whose run this is; the class list is only how the
  // page finds the teacher's note, and a page that refused to draw without it would be a page
  // that goes blank when the wifi does.
  if (state.source.status === "not-yours") return <NoSuchRun />;
  const entry = state.classes.find((row) => row.classCode === classCode.toUpperCase()) ?? null;
  const done = entry?.completed.find((row) => row.sessionId === sessionId) ?? null;

  return <Report entry={entry} done={done} source={state.source} sessionId={sessionId} />;
}

/**
 * A run that is not this student's, or not there.
 *
 * Deliberately the same screen for both, and deliberately not an error. A student who
 * mistypes a URL and a student whose class has been deleted are both people who should be
 * sent back to their own work, and neither of them needs to be told which of those two
 * things a stranger's session id is.
 */
function NoSuchRun() {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  return (
    <main className="student-home">
      <header className="student-home__bar"><AppMark /></header>
      <section className="student-home__empty">
        <h1 tabIndex={-1} ref={title}>That run is not one of yours.</h1>
        <p>Open the one you want from your own class.</p>
        <Link className="button button--primary" to="/home">Back to your class</Link>
      </section>
    </main>
  );
}

function Report({ entry, done, source, sessionId }: {
  entry: StudentClass | null;
  done: { sessionId: string; submittedAt: number } | null;
  source: CompletedRunSource;
  sessionId: string;
}) {
  // Keyed on the run, not on mount alone: a student who opens a second finished run from
  // /home moves between two pages that share this component, and a route change nobody is
  // told about leaves a screen-reader user tabbing from the top of six sections of document.
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [sessionId]);
  const recap = source.status === "ready" ? source.recap : null;
  // Both facts are the service's, and the class list is only a second place they happen to
  // appear. Neither is invented when nobody could say: a page with no date simply has no
  // date on it, which is a smaller wrong than a date that is not the one on the record.
  const label = (source.status === "ready" ? source.label : undefined) ?? entry?.label ?? null;
  const turnedInAt = (source.status === "ready" ? source.submittedAt : undefined) ?? done?.submittedAt ?? null;
  const notes = entry?.feedback.filter((note) => note.sessionId === sessionId) ?? [];

  return (
    <main className="student-home">
      <header className="student-home__bar">
        <AppMark />
        <div><Link to="/home">Back to your class</Link></div>
      </header>

      <div>
        <p className="eyebrow">{[label, recap?.worldTitle].filter(Boolean).join(" · ")}</p>
        <h1 className="student-home__title" tabIndex={-1} ref={title}>What your run shows</h1>
        {/* Only where there is something below. On the screen that says the page could not
            load, "everything below" is a promise about an apology. */}
        {recap && (
          <p>
            {turnedInAt === null ? "" : `You turned this in on ${new Date(turnedInAt).toLocaleDateString()}. `}
            Everything below is something you did with the money in your run, written down from your own run and
            nobody else’s.
          </p>
        )}
      </div>

      {/* The person first, always. A teacher's sentence outranks every read-out under it,
          and on the one screen where BOW says the most about a student it would be the wrong
          way round for the software to be at the top. */}
      {notes.length > 0 && (
        <div className="student-feedback">
          <p className="field-label">From your teacher</p>
          {notes.map((note) => (
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

      {/* The two things this page is not, said before it starts rather than buried at the
          bottom — because the question a twelve-year-old opens it with is "what did I get".
          Drawn only when there is something under it: promising a list that is not there and
          then saying the page could not load is two paragraphs of throat-clearing in front of
          an apology. */}
      {recap && (
      <section className="handed-in__record">
        <p className="stamp">Before you read it</p>
        <p>
          There is no score on this page and there is no level on it. It is a list of what you decided, not a
          mark out of anything.
        </p>
        <p>
          {notes.length > 0
            ? "Your writing is the part a person reads. Your teacher has written back, and their note is at the top of this page. Nothing else here is about your writing."
            : "Your writing is the part a person reads. Your teacher has it and has not read it yet — when they write back, it will appear at the top of this page. Nothing on this page is about your writing."}
        </p>
        {recap?.topics.some((topic) => topic.notes.some((note) => note.kind === "support")) && (
          <p>
            Where you used the help buttons, it says so. Using them is allowed — they are there to be
            pressed — and it is written down as help you used, not as a mistake.
          </p>
        )}
      </section>
      )}

      {recap
        ? recap.topics.map((topic) => <Topic key={topic.id} topic={topic} />)
        : <Missing source={source} />}

      <footer className="student-home__foot">
        <Link to="/home">Back to your class</Link>
      </footer>
    </main>
  );
}

/**
 * One idea, and what this student did about it.
 *
 * The order inside the card is the argument: the thing they did, then what that idea is
 * called. A name at the top would be a label being applied to a child; a name at the bottom
 * is a word for something they have just read themselves doing, which is the only version of
 * vocabulary this surface is entitled to offer.
 */
function Topic({ topic }: { topic: RecapTopic }) {
  return (
    <section className="student-card" data-recap-topic={topic.id} data-never-came-up={topic.neverCameUp || undefined}>
      <h2>{topic.heading}</h2>
      <ul>
        {topic.notes.map((note, index) => <Note key={`${topic.id}-${index}`} note={note} />)}
      </ul>
      {/* The word, last, and only where there is something to attach it to. A student who
          never met an idea is not handed its name as a thing they are missing. */}
      {!topic.neverCameUp && (
        <>
          <p className="field-label">What this is called</p>
          <p><strong>{topic.concept.term}</strong> — {topic.concept.means}</p>
        </>
      )}
    </section>
  );
}

function Note({ note }: { note: RecapNote }) {
  return <li data-recap-note={note.kind}>{note.text}</li>;
}

/**
 * The run is real and this page could not get it.
 *
 * Said as a fact about the network or about the build, never as a fact about the student, and
 * never dressed up as "nothing to show" — which a twelve-year-old reads as "you did nothing".
 * The reload is offered because it is the whole of the fix: the run is on the service, and the
 * next request that gets through will have it.
 */
function Missing({ source }: { source: CompletedRunSource }) {
  if (source.status === "offline") {
    return (
      <section className="student-card">
        <h2>BOW could not reach your class just now.</h2>
        <p>
          Your work went to your teacher and it is safe — this page is the part that could not load. It is
          almost always the wifi.
        </p>
        <p>Try again in a minute, or open this from the computer you played on.</p>
      </section>
    );
  }
  return (
    <section className="student-card">
      <h2>BOW cannot read this run back to you.</h2>
      <p>Your work went to your teacher and it is safe. This run was played in a story this version does not know how to read back.</p>
    </section>
  );
}
