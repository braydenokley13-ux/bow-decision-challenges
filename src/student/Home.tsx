import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import { forgetStudent, studentToken, type StudentClass } from "./session";
import { readClasses, unfinishedRunHere } from "./completedRun";
import { PLAYABLE_WORLDS, DEFAULT_WORLD_ID } from "../domain/scenario/registry";
import { clearAttemptFor } from "../domain/io/persistence";
import { worldOffer } from "../stages/worldOffer";
import { ReadingTools } from "./reading";
import { chaptersFor, stepPosition, stoppedAt } from "./chapters";
import { homeWork, liveRun, workCount, type HomeCard, type HomeNote, type TurnedInRun } from "./homeModel";
import type { WorldId } from "../domain/core/ids";

/**
 * The whole of a student's own screen.
 *
 * It answers four questions and refuses every other job: **who am I and whose class is this**,
 * **what am I set**, **what state is each piece of it in**, and **what did my teacher say**.
 * There are no tabs, no streak, no badges, no points, no feed and no notifications, because
 * none of those makes a decision better, makes a student's thinking more visible, or makes a
 * teacher's job easier — which is the test every feature in this product has to pass.
 *
 * Three things this screen used to get wrong, and what replaced them.
 *
 * **It could not say whose screen it was.** The display name was a `<span>` in the top bar next
 * to a *"Not you?"* button — and on a class with no roster row it was not even that, because
 * the name was read off `classes[0]`. The nameplate is now the page's first block and its `h1`,
 * and the name comes from the service's answer about the *student* rather than about their
 * classes, so it survives a class closing.
 *
 * **It drew one card from the challenge registry.** A class set two things showed one, and the
 * one it showed was the challenge rather than either assignment. Every assignment is a card
 * now, in an order that ranks the work (`homeModel.rankOf`) and never the student.
 *
 * **A teacher's note floated above all the work.** With one assignment "above the work" and
 * "attached to the run" are the same place; with three they are not, and the immutable is that
 * feedback reaches the correct *attempt*. Notes are keyed by `sessionId` into the card holding
 * that run — see `TeacherNote`.
 *
 * What is deliberately unchanged is everything about how this screen *behaves*: the redirect
 * for a student with no session, the dead-session-versus-dead-network split below (a wifi blip
 * must never sign a child out), the `NOT_A_RUN_IN_PROGRESS` filter, `PlayAgain`'s gating, and
 * the recap link. That was already right.
 */
export function StudentHome() {
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; classes: StudentClass[]; name: string | null }
  >({ status: "loading" });

  useEffect(() => {
    if (!studentToken()) {
      void navigate("/join", { replace: true });
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
          void navigate("/join", { replace: true });
          return;
        }
        setState({ status: "error", message: "BOW could not reach your class just now. It is almost always the wifi. Your work is safe — try again in a minute." });
        return;
      }
      // The service answers who is signed in from the token, so a student with no roster row
      // still has their own name on their own page. The class list is the fallback for a
      // service that has not been deployed yet, and never a cache: `session.ts` says why.
      const name = result.body.student?.displayName ?? result.body.classes[0]?.displayName ?? null;
      setState({ status: "ready", classes: result.body.classes, name });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (state.status === "loading") {
    return <main className="student-home"><p aria-live="polite">Getting your classes…</p></main>;
  }
  if (state.status === "error") {
    return <ClassDidNotLoad message={state.message} />;
  }

  return (
    <Ready
      classes={state.classes}
      name={state.name}
      onSignOut={() => { forgetStudent(); void navigate("/join", { replace: true }); }}
    />
  );
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
 * about having arrived anywhere. The heading takes focus, once, on arrival — and the heading
 * is now the student's own name, which is the one thing worth hearing first.
 */
function Ready({ classes, name, onSignOut }: {
  classes: readonly StudentClass[];
  name: string | null;
  onSignOut: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  const only = classes.length === 1 ? classes[0]! : null;

  return (
    <main className="student-home student-home--desk ground-dark">
      <div className="student-home__inner">
        {/* The product bar, unchanged in contract, position and screen key. The nameplate sits
            under it inside the same landmark rather than in it: one is BOW's row of controls,
            the other is the answer to "whose screen is this". */}
        <header className="student-home__bar">
          <div className="student-home__product">
            <AppMark />
            {/* Reading help, on the screen a student comes back to. It lived inside the run only,
                so the page that says what a student has done and what is left to do — and which
                of two stories they are being offered — was one of three screens in the student's
                path where the accommodation did not exist. */}
            <ReadingTools screenKey="student-home" />
          </div>
          {name && (
            <Nameplate
              name={name}
              titleRef={title}
              onSignOut={onSignOut}
              where={only ? `${only.label} · Seat ${only.seatCode}` : classes.length === 0 ? "Signed in with your class card" : `${classes.length} classes`}
            />
          )}
        </header>

        {classes.length === 0 ? (
          <section className="student-home__empty">
            {/* An `h2` under the nameplate, because the `h1` is the student. Where the service
                could not name them — an older deployment — this is the page's own heading and
                takes the focus instead, so no arrival is silent. */}
            {name
              ? <h2>You are not in a class yet.</h2>
              : <h1 tabIndex={-1} ref={title}>You are not in a class yet.</h1>}
            <p>Ask your teacher for the class code, then come back.</p>
            <Link className="button button--primary" to="/join">Type a class code</Link>
            {!name && <Button variant="secondary" onClick={onSignOut}>Not you? Sign out</Button>}
            {/* The one state with nothing to push down, and the only decoration on this page. */}
            <WorldLinework />
          </section>
        ) : (
          classes.map((entry) => <ClassBlock key={entry.classCode} entry={entry} several={classes.length > 1} />)
        )}

        {classes.length > 0 && (
          <footer className="student-home__foot">
            <Link to="/join">Join another class</Link>
          </footer>
        )}
      </div>
    </main>
  );
}

/**
 * Who this is, whose class it is, and the way out — in one block, in one glance.
 *
 * The sign-out control sits **beside the name it disowns** rather than at the page's right
 * edge, because "Not you?" a screen-width away from the name is a question about nothing. Its
 * words are the pattern the door already established (`Join.tsx`: *"Not you? Start fresh"*): a
 * kid-voice question and a real verb. A bare *"Not you?"* is not a verb, and on a cart
 * Chromebook the verb is the whole point.
 *
 * The disc is one letter and decorative. It is `aria-hidden` because a screen reader reading
 * "M" before "Marisol T." is reading the same name twice, badly.
 */
function Nameplate({ name, where, titleRef, onSignOut }: {
  name: string;
  where: string;
  titleRef: RefObject<HTMLHeadingElement>;
  onSignOut: () => void;
}) {
  return (
    <div className="nameplate">
      <span className="nameplate__disc" aria-hidden="true">{[...name.trim()][0] ?? "?"}</span>
      <div className="nameplate__who">
        <h1 className="nameplate__name" tabIndex={-1} ref={titleRef}>{name}</h1>
        <p className="nameplate__where">{where}</p>
      </div>
      <Button className="nameplate__out" variant="secondary" onClick={onSignOut}>Not you? Sign out</Button>
    </div>
  );
}

/**
 * One class: what it is called, what it set, and what came back.
 *
 * The `h2` is the class, always — the heading order on this page is the student, then their
 * class, then each piece of work, and a page whose structure changes with how many classes a
 * student is in is a page nobody can learn. What changes is whether it is *drawn*: a student in
 * one class already has that class and their seat in the nameplate two lines above, and
 * printing it again immediately underneath is the same sentence twice. A reader still gets the
 * structure; a looker does not get the repetition.
 */
function ClassBlock({ entry, several }: { entry: StudentClass; several: boolean }) {
  const work = homeWork(entry);
  return (
    <section className="student-class">
      <h2 className={several ? "student-class__name" : "student-class__name visually-hidden"}>
        {entry.label}
        <span className="student-class__seat"> · Seat {entry.seatCode}</span>
      </h2>

      {work.cards.length === 0 ? (
        <p className="work-head__empty">Nothing is set for you in this class yet. Your teacher will put it here.</p>
      ) : (
        <>
          {/* Whether to scroll, before scrolling. A plain count and no progress in it: how many
              of them are done is not a score, and this is not the place to imply one. */}
          <p className="work-head">
            <span className="work-head__what">Your work</span>
            <span className="work-head__count">{workCount(work.cards.length)}</span>
          </p>
          <ol className="work-list">
            {work.cards.map((card) => (
              <li key={card.assignmentId}>
                <WorkCard card={card} entry={entry} nameActions={work.cards.length > 1} />
              </li>
            ))}
          </ol>
        </>
      )}

      {(work.strayRuns.length > 0 || work.strayNotes.length > 0) && (
        <section className="work-stray">
          {/* Work this class is no longer set, and words about it. A child's finished run does
              not stop existing because their teacher re-set the class, and a note about it is
              still the only thing on this page a person wrote. */}
          <h3>Work from earlier in this class</h3>
          {work.strayRuns.map((run) => (
            <TurnedInLine key={run.sessionId} run={run} classCode={entry.classCode} named={work.strayRuns.length > 1} />
          ))}
          {work.strayNotes.map((note) => <TeacherNote key={note.id} note={note} />)}
        </section>
      )}

      {/* Under the work rather than over it: the offer of another go is the answer to
          "what now", and "what now" comes after "what happened". */}
      {entry.completed.length > 0 && liveRun(entry) === null && <PlayAgain entry={entry} />}
    </section>
  );
}

/**
 * One piece of work, and everything true about it, in the order a student needs it.
 *
 * Title, then what state it is in *in words*, then a sentence saying it in the run's own
 * vocabulary, then how far in (only where there is a run to be part-way through), then the one
 * way in, then whatever the teacher wrote about it. Nothing on the card has to be compared with
 * anything on another card to be understood, which is the property that makes three of them
 * readable at 360px.
 *
 * Weight is driven by `format`, which the schema already carries: a decision challenge wears a
 * thin accent accent from its world, a quick check is a small flat card with no world treatment
 * at all. That is the guard that stops this list turning into a launcher — if every card gets
 * the theatre, the theatre stops meaning anything.
 */
function WorkCard({ card, entry, nameActions }: { card: HomeCard; entry: StudentClass; nameActions: boolean }) {
  const accent = card.accentWorldId;
  return (
    <article className={`work-card work-card--${card.format} work-card--${card.status}`}>
      {/* The world, as a accent and nothing else. `data-world` sits on the accent rather than
          on the card so the world's palette themes four pixels and not a room: a world block in
          `worlds.css` re-points `--canvas`, `--surface` and the brand, which is right inside a
          run and would be a scene band out here. */}
      {accent && <span className="work-card__accent" data-world={accent} aria-hidden="true" />}

      <h3 className="work-card__title">{card.title}</h3>

      <StatusChip card={card} />

      <p className="work-card__state">{stateSentence(card)}</p>

      {card.status === "not-started" && card.dueAt !== null && (
        // A date, and nothing else. No red, no countdown, no "overdue": a date is information
        // and a countdown is pressure applied to a child. It sorts these cards and it says
        // when — that is the whole of what `dueAt` does here.
        <p className="work-card__due">Your teacher would like this by {onDate(card.dueAt)}.</p>
      )}

      {card.run && <Progress worldId={card.run.worldId} stage={card.run.stage} />}

      {/* One way in, and its accessible name says which piece of work it opens as soon as
          there is more than one — three cards offering three links all called "Start" is a
          list of identical destinations to anybody who is not looking at the screen. With one
          card there is nothing to tell apart and the verb stands alone.

          The verbs are "Carry on" and "Start" rather than "Continue" and "Resume", which read
          as near-synonyms of each other and of nothing a student does. */}
      {card.format === "decision-challenge" && (card.run || card.status === "not-started") && (
        <p className="work-card__go">
          {/* The class code goes with them, on both branches. It is what lets the run be fetched
              from the service rather than from this machine's storage, which is the whole of
              "started it in class on Tuesday, finished it at home on Thursday" — without it this
              button is a promise to hand a student a blank board on any device but the one they
              began on. `educator/carryOn.test.ts` reads this line to keep it true. */}
          {card.run
            ? <Link className="button button--primary" to={`${PLAN_UNDER_PRESSURE.route}?class=${entry.classCode}`}>{nameActions ? `Carry on — ${card.title}` : "Carry on"}</Link>
            : <Link className="button button--primary" to={`${PLAN_UNDER_PRESSURE.route}?class=${entry.classCode}`}>{nameActions ? `Start — ${card.title}` : "Start"}</Link>}
        </p>
      )}

      {card.run && (
        // The promise the product makes teachers and had never said to a student: this is not
        // saved on this computer. It is a fact about where the run lives, not about what any
        // one machine is holding — `ResumeGate` may still set a device copy aside when two
        // copies have parted, and that is a different sentence, said on that machine.
        <p className="work-card__anywhere">Your run is saved with your class, not on this computer — carry on from any computer, any day.</p>
      )}

      {card.turnedIn.map((run) => (
        <TurnedInLine key={run.sessionId} run={run} classCode={entry.classCode} named={card.turnedIn.length > 1} />
      ))}

      {card.notes.map((note) => <TeacherNote key={note.id} note={note} />)}
    </article>
  );
}

/**
 * The state of a piece of work, carried by a word first.
 *
 * Three carriers and colour is the third: the word, the glyph's *shape* (an open ring, a
 * filled play triangle, a check), and only then the ground it sits on. Under forced colors the
 * fill goes and the word, the shape and the 1px border survive. Nothing here is `nowrap` and
 * nothing above it crops, because the sentence a resuming student needs is the exact sentence
 * that gets truncated when a chip is told not to wrap inside a box that hides its overflow.
 *
 * One statement per card. A band across the top *and* a chip saying the same word twice is
 * emphasis nobody asked for and a second thing to read.
 */
function StatusChip({ card }: { card: HomeCard }) {
  const words = card.wroteBack
    ? "Your teacher wrote back"
    : card.status === "in-progress"
      ? "In progress"
      : card.status === "turned-in"
        ? `Turned in ${onDate(card.turnedIn[0]?.submittedAt ?? 0)}`
        : "Not started";
  return (
    <p className={`work-chip work-chip--${card.status}${card.wroteBack ? " work-chip--wrote-back" : ""}`}>
      <StatusGlyph status={card.status} />
      <span className="work-chip__words">{words}</span>
    </p>
  );
}

/** The shape half of a status. Never the only carrier, and never the first one read. */
function StatusGlyph({ status }: { status: HomeCard["status"] }) {
  return (
    <svg className="work-chip__glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {status === "not-started" && <circle cx="8" cy="8" r="5.5" fill="none" strokeWidth="1.6" />}
      {status === "in-progress" && <path d="M4.5 3.2 13 8l-8.5 4.8Z" />}
      {status === "turned-in" && <path d="M3 8.4 6.4 12 13.2 4.6" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function stateSentence(card: HomeCard): string {
  if (card.run) return `You stopped at ${stoppedAt(card.run.worldId, card.run.stage)}.`;
  if (card.status === "turned-in") {
    // The date moves into the sentence exactly when the chip stops carrying it: a note arriving
    // turns the chip into "Your teacher wrote back", and when a student turned their work in
    // should not disappear because somebody replied to it. Printed in both places it would be
    // the same date twice on a card three lines long.
    return card.wroteBack
      ? `You turned this in on ${onDate(card.turnedIn[0]?.submittedAt ?? 0)}. Your teacher has read it and written back.`
      : "You turned this in. Your teacher has it.";
  }
  // A quick check is a real thing a teacher can set and there is no screen in BOW that opens
  // one. Saying so is the only honest card: a "Start" here would open the decision challenge,
  // which is a different piece of work, and the student would find that out inside it.
  if (card.format === "quick-check") return "This one is not something BOW opens — your teacher will say what to do with it.";
  // The world's own length where the card is pinned to one world, and the challenge's where it
  // is not. Printing Basketball's twenty-eight minutes over a button that may open the night
  // market is the same false promise the front door used to make.
  const length = (card.accentWorldId ? WORLD_REGISTRY[card.accentWorldId]?.durationMinutes : undefined) ?? PLAN_UNDER_PRESSURE.duration;
  return `You have not started this one yet. You handle the money, and it takes about ${length.min}–${length.max} minutes.`;
}

/**
 * How far into the story, said in the story's own words and counted off its own stage list.
 *
 * Two carriers, both derived, neither rankable. The chapter track names where you are in the
 * story — a thing a twelve-year-old can act on — and the step label is the number underneath it
 * for anybody who wants one. There is no percentage, no ring and no "3 of 5 done", because a
 * quantity is a thing a child can be ranked by and position in a story is not.
 *
 * A world with no chapter map authored inside it gets the step label alone. Two indicators
 * drawn here before this existed were fabricated — "Week 2 of 4 Saturdays" rendered as five
 * bars, and "Step 3 of 8" for a world with fourteen story screens — so nothing here is drawn
 * that is not read off the world's own ordered stages.
 */
function Progress({ worldId, stage }: { worldId: WorldId; stage: string }) {
  const chapters = chaptersFor(worldId, stage);
  const position = stepPosition(worldId, stage);
  if (!chapters && !position) return null;
  return (
    <div className="progress">
      {chapters && (
        <ol className="progress__chapters">
          {chapters.map((chapter) => (
            <li
              key={chapter.label}
              className={`progress__chapter progress__chapter--${chapter.state}`}
              {...(chapter.state === "here" ? { "aria-current": "step" as const } : {})}
            >
              <span className="progress__mark" aria-hidden="true" />
              <span className="progress__label">{chapter.label}</span>
              <span className="visually-hidden">
                {chapter.state === "done" ? " — done" : chapter.state === "here" ? " — you are here" : " — still to come"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {position && <p className="progress__step">Step {position.step} of {position.of}</p>}
    </div>
  );
}

/**
 * The one door to the recap, and it says what is behind it rather than "details".
 *
 * A student who turned in yesterday came back to a card that could only tell them their work
 * had arrived somewhere — true, and not worth opening the page for. The link is deliberately
 * not the word "results": nothing behind it is a mark.
 */
function TurnedInLine({ run, classCode, named }: { run: TurnedInRun; classCode: string; named: boolean }) {
  const world = run.worldId ? WORLD_REGISTRY[run.worldId]?.title : undefined;
  return (
    <p className="work-card__recap">
      <Link to={`/run/${classCode}/${run.sessionId}`}>
        {named
          ? `See what your run shows — ${world ?? "your run"}, turned in ${onDate(run.submittedAt)}`
          : "See what your run shows"}
      </Link>
    </p>
  );
}

/**
 * What a teacher wrote, attached to the run they wrote it about.
 *
 * It is the one light thing on a dark page, on purpose: it is the only element on this screen
 * that came from a person rather than from the product, and it should not look like the
 * product. A note the teacher took back is not in this list at all — the service filters
 * `deletedAt` before the page ever sees it — and one they rewrote keeps its place in the
 * sequence and says, in the student's own register, that it changed and when.
 */
function TeacherNote({ note }: { note: HomeNote }) {
  return (
    <div className="student-feedback teacher-note">
      <p className="field-label">From your teacher · about this run</p>
      <blockquote>
        {note.body}
        <cite>
          {onDate(note.at)}
          {note.editedAt ? ` · your teacher changed this note on ${onDate(note.editedAt)}` : ""}
        </cite>
      </blockquote>
    </div>
  );
}

/** One date format for the whole screen, in the reader's own locale. */
function onDate(at: number): string {
  return new Date(at).toLocaleDateString();
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
 * is the one who finds out. Both sentences are on the screen, unclipped and never inside a
 * `<details>` — a truthfulness guarantee about a child's work is not a disclosure widget.
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
    <div className="again">
      <p className="again__offer">
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

/**
 * The only decoration on this page, and the only state it appears in.
 *
 * Faint, unlabelled, and drawn from nothing — it names no world and promises no story, because
 * a student with no class has not been offered one. Every other state has work in it, and work
 * is what should be pushing the fold down.
 */
function WorldLinework(): ReactNode {
  return (
    <svg className="empty-linework" viewBox="0 0 320 120" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      {/* Equal uprights on a horizon, deliberately: bars of differing heights read as a chart,
          and a chart on a student's screen reads as a measurement of them. */}
      <path d="M0 96h320M0 72h320M0 48h320" strokeWidth="1" fill="none" />
      <path d="M40 96V60M104 96V60M168 96V60M232 96V60M296 96V60" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
