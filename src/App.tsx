import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { DocumentTitle } from "./app/DocumentTitle";
import { NotFound } from "./app/NotFound";
import { AppMark } from "./components/primitives/AppMark";
import { StudentChallenge } from "./stages/StudentChallenge";
import { EducatorGuide } from "./educator/EducatorPages";
import { SampleRun } from "./educator/SampleRun";
import { MyClasses } from "./educator/MyClasses";
import { AssignmentBuilder } from "./educator/AssignmentBuilder";
import { TeacherSignIn } from "./educator/SignIn";
import { AssignFlow, ObjectiveDetail, ObjectiveList } from "./educator/ObjectivePages";
import { RealClassOverview, RealStudentEvidence } from "./educator/RealClassPages";
import { ReadingQueue } from "./educator/ReadingQueue";
import { AssignmentMonitor } from "./educator/AssignmentMonitor";
import { Debrief } from "./educator/Debrief";
import { Roster } from "./educator/Roster";
import { ShareOut } from "./educator/ShareOutPage";
import { DataProtection } from "./legal/DataProtection";
import { PLAN_UNDER_PRESSURE } from "./platform/challenges/registry";
import { StudentJoin } from "./student/Join";
import { studentToken } from "./student/session";
import { StudentHome } from "./student/Home";
import { RunReport } from "./student/RunReport";
import { ResumeGate } from "./student/ResumeGate";
import { PLAYABLE_WORLDS } from "./domain/scenario/registry";
import { WorldArt } from "./components/primitives/WorldArt";
import { DEMO_CLASS_CODE } from "./fixtures/demoClass";

/** A seat-scoped demo route redirected to its real-class equivalent, param and all. */
function DemoStudentRedirect() {
  const { seatCode } = useParams();
  return <Navigate to={`/educator/class/${DEMO_CLASS_CODE}/students/${seatCode}`} replace />;
}

/**
 * The front door, and the one screen that has to be true of the whole product.
 *
 * It used to be Basketball's: the navy court, Avery's roster card, "Eight weeks to the
 * showcase", and one button that started that world. The very next screen then said "Two ways
 * in. You pick one." — so a student who chose the night market had pressed a button promising
 * eight weeks of basketball, and a teacher arriving to evaluate a two-world product met a
 * one-world advertisement.
 *
 * So the door names the challenge rather than a story inside it, and sends a student to the
 * place they can actually get in from: a class code. Nothing here starts a run, because a run
 * that is not attached to a class produces evidence nobody can read.
 */
function Home() {
  /* The second door is offered only when this browser actually holds a session for it to
     open. Without that check it led to `/home`, which sends a student with no session
     straight back to `/join` — so on a new tab, a cleared browser or a school-managed
     machine the returning student was offered a door that was the door they had just
     declined, and the two screens were byte-identical. */
  const returning = studentToken();
  return (
    <main className="home home--cinematic ground-dark">
      {/* The light in the room. One violet bloom behind the headline and one warm one under
          the worlds, so the page has a direction to it rather than being flat dark. */}
      <div className="home__aurora" aria-hidden="true" />

      <header className="home__bar">
        <AppMark />
        <Link className="home__educator-link" to="/educator/classes">Teacher workspace</Link>
      </header>

      <section className="home__hero">
        <div className="home__hero-copy">
          <p className="home__eyebrow">{PLAN_UNDER_PRESSURE.pillar} · {PLAN_UNDER_PRESSURE.grades}</p>
          <h1>Decisions have consequences. <span>You choose what happens next.</span></h1>
          {/* "Story", not "world", was the old vocabulary here and it has been retired: the
              educator surface, the registry and the student's own chooser all say world, and a
              front door speaking a schema nothing else uses is where a vocabulary starts
              coming apart. */}
          <p className="home__deck">
            Handle the money. Make the tradeoffs. See what follows — then explain the thinking
            behind your decisions.
          </p>
          <div className="home__actions">
            <Link className="button button--primary" to="/join">Enter with a class code</Link>
            {returning && <Link className="button button--secondary" to="/home">Continue my work</Link>}
          </div>
          <p className="home__continuity">Your work stays connected to your class, even when you change computers.</p>
        </div>

        {/* The reference art is cinematic, but BOW cannot borrow its invented students or
            photography. These are the product's own two lightweight scenes, composed as a
            doorway rather than as a false world picker. The real, accessible descriptions
            remain directly below. */}
        <div className="home__hero-art" aria-hidden="true">
          {PLAYABLE_WORLDS.map((world, index) => (
            <figure className="home__hero-world" data-world={world.id} data-position={index === 0 ? "front" : "back"} key={world.id}>
              <WorldArt world={world.id} />
              <figcaption>
                <span>{world.title}</span>
                <small>{world.subtitle}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Two worlds, described. **Not** a chooser: the choice is real and it happens inside a
          class, after signing in, because it is the teacher's to allow (`worldOffer.ts`). This
          section was headed *"Choose your world"* over two cards with no link, no button and no
          handler on them, under a hero reading *"Pick a world"* and over a note reading *"the
          choice is yours to make"* — three invitations to act on the first screen a district
          evaluator meets, and no way to act on any of them (`DEFECTS.md` D26). It says what
          these are and where the choice actually happens. */}
      <section className="home__worlds-section" aria-labelledby="home-worlds">
        <div className="home__worlds-heading">
          <p className="stamp">Decision Challenges</p>
          <h2 id="home-worlds">Two worlds. The same decision skills.</h2>
        </div>
        <ul className="home__worlds">
          {PLAYABLE_WORLDS.map((world) => (
            <li key={world.id} className="world-card world-card--brief" data-world={world.id}>
              <span className="world-card__accent" aria-hidden="true" />
              <div className="world-card__body">
                <h3>{world.title}</h3>
                <p>{world.subtitle}</p>
                <span className="world-card__length">
                  {world.durationMinutes.min}–{world.durationMinutes.max} minutes
                </span>
              </div>
            </li>
          ))}
        </ul>
        {/* The one sentence that carries the product's whole claim, on the screen a district
            evaluator meets first. Both worlds are judged against the same named parts of the
            work, which is what makes the choice above safe to offer. */}
        <p className="home__worlds-note">
          Your teacher sets which world is available. Both ask you to make a plan, respond when
          conditions change, and explain why you made your decisions.
        </p>
      </section>

      <footer className="home__foot">
        <span>BOW Decision Challenges</span>
        <Link to="/privacy">Data protection</Link>
        <Link to="/educator/guide">Teacher&rsquo;s guide</Link>
      </footer>
    </main>
  );
}

export function App() {
  return (
    <>
    {/* What the tab says. One element, because a title set page by page is a title the next
        page forgets — and every route in this product answered to the same string until this
        landed, including the address that is not a page. `src/app/pageTitles.ts` is the table,
        and a test walks the route list below against it. */}
    <DocumentTitle />
    <Routes>
      <Route path="/" element={<Home />} />
      {/* A student signs in once and comes back to a screen that is theirs. What the door asks
          for depends on whether the teacher pasted a class list: with one, the class code and
          then the code on their own card; without one, the class code and then their own first
          name, which BOW files the run under. The "tap your name" step this used to describe
          went when the door stopped publishing the roster to anyone holding the class code —
          a list of children's names is not something a five-letter code should open.

          No student is asked for an email address, a password or a birthday, on either path.
          That is the claim this comment can make; the one it used to make — that nothing here
          asks for a name — was false of every class without a list. */}
      <Route path="/join" element={<StudentJoin />} />
      <Route path="/home" element={<StudentHome />} />
      {/* What a student gets back: their own run, read out of their own log, in their own
          world's words. Reached from the finished card on /home and from nowhere else. */}
      <Route path="/run/:classCode/:sessionId" element={<RunReport />} />
      <Route path={PLAN_UNDER_PRESSURE.route} element={<ResumeGate><StudentChallenge /></ResumeGate>} />
      {/* The route this shipped on. Class codes and bookmarks already point at it, so it
          redirects rather than 404s — and keeps redirecting after Challenge #2 lands. */}
      <Route path="/challenge" element={<Navigate to={PLAN_UNDER_PRESSURE.route} replace />} />
      {/* An educator lands on their own classes. The map is a click away in the nav; it is
          a year-planning surface, not the thing a teacher opens mid-week. */}
      <Route path="/educator" element={<Navigate to="/educator/classes" replace />} />
      <Route path="/educator/classes" element={<MyClasses />} />
      {/* The real builder: pick a learning goal, and BOW shows only the stories it can prove
          are compatible — §0 of the ruling, made into a screen. Reachable with an objective
          already chosen (`?objective=`) or a class already chosen (`?classCode=`), or neither. */}
      <Route path="/educator/assignments/new" element={<AssignmentBuilder />} />
      {/* The door a teacher did not have. A class used to be a code and a key in one browser,
          so a reimaged laptop destroyed a term of assessed work — and every endpoint behind
          this screen had been answering correctly for hours with nothing calling them. */}
      <Route path="/educator/sign-in" element={<TeacherSignIn />} />
      <Route path="/educator/classes/new" element={<MyClasses />} />
      <Route path="/educator/guide" element={<EducatorGuide />} />
      {/* The guide's own "Try it as a student", which used to land on a class-code prompt for
          a code the person evaluating the product does not have. A real run of the real
          screens with nothing behind it: no class, no seat, nothing saved and nothing sent. */}
      <Route path="/educator/try" element={<SampleRun />} />
      <Route path="/educator/objectives" element={<ObjectiveList />} />
      {/* The Objective Map's URL. The surface is gone — a nine-value status filter over a
          teacher-maintained "taught" flag is a planbook — but the question it answered is a
          column on the objectives page now, and a teacher's bookmark should land on the answer
          rather than silently on the front door. */}
      <Route path="/educator/map" element={<Navigate to="/educator/objectives" replace />} />
      <Route path="/educator/objectives/:frameworkId/:code" element={<ObjectiveDetail />} />
      {/* One path to assigning work, and it is the classes page. This is the URL the old
          second path shipped on. */}
      <Route path="/educator/assign" element={<AssignFlow />} />
      {/* The two-day sample mini-unit used to be a page. It is a disclosure inside the
          guide's "Before students begin" now, directly under the six prerequisites it is a
          worked answer to — so the bookmark lands on the content rather than on nothing. */}
      <Route path="/educator/teaching-companion" element={<Navigate to="/educator/guide" replace />} />
      {/* A real class. Everything under here reads submitted evidence and nothing else. */}
      <Route path="/educator/class/:code" element={<RealClassOverview />} />
      {/* One assignment, one live room, one evidence boundary. The class center keeps the
          history; this route opens the work without combining it with earlier assignments. */}
      <Route path="/educator/class/:code/assignments/:assignmentId" element={<AssignmentMonitor />} />
      <Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} />
      <Route path="/educator/class/:code/reading" element={<ReadingQueue />} />
      <Route path="/educator/class/:code/debrief" element={<Debrief />} />
      {/* Select, sequence, project. Nothing is shown to a room unless a teacher chose it. */}
      <Route path="/educator/class/:code/share-out" element={<ShareOut />} />
      {/* The class list and the cards that come off it. Every route behind this screen has
          existed since accounts shipped; until this screen there was no way for a teacher to
          reach any of them, which made the whole account system reachable only by curl. */}
      <Route path="/educator/class/:code/roster" element={<Roster />} />
      {/* The sample class. `DEMO_CLASS_CODE` cannot be a real class's code — real codes are
          five characters from `CODE_ALPHABET`, this one is four — so this is the exact same
          `RealClassOverview` a real class opens, fed evidence `useClassEvidence` builds from
          `src/fixtures/demoClass.ts` instead of the service. There is no separate demo
          component any more: a teacher who learns this screen has learned the one a real
          class actually shows them. */}
      <Route path="/educator/demo" element={<Navigate to={`/educator/class/${DEMO_CLASS_CODE}`} replace />} />
      {/* Four routes the old bespoke demo shipped on, none of which has a real-class
          equivalent at that exact address — a real class has no per-concept drilldown, no
          sub-route for scoring reasoning, and no standards page scoped to one class. Rather
          than 404 a bookmark or a link in a PD deck, each redirects to the real surface that
          actually answers the question it was asking. */}
      <Route path="/educator/demo/concepts/:conceptId" element={<Navigate to={`/educator/class/${DEMO_CLASS_CODE}`} replace />} />
      <Route path="/educator/demo/students/:seatCode" element={<DemoStudentRedirect />} />
      {/* Reasoning is a tab on the student page now, not a page of its own, so this lands on
          the same seat the old reasoning screen was scoped to. */}
      <Route path="/educator/demo/students/:seatCode/reasoning" element={<DemoStudentRedirect />} />
      <Route path="/educator/demo/standards" element={<Navigate to="/educator/objectives" replace />} />
      {/* The routes the demo shipped on before that. */}
      <Route path="/educator/class" element={<Navigate to="/educator/demo" replace />} />
      <Route path="/educator/class/standards" element={<Navigate to="/educator/objectives" replace />} />
      {/* The five addresses a vendor review types before it reads anything else. All five used
          to render the front door, because the fallback below sent every unknown address there
          — so a district looking for a privacy notice, a data inventory, a subprocessor list or
          a security overview found the marketing headline five times and concluded, correctly,
          that there was nothing to open.

          One document answers all five, and `/privacy` is where it lives: `/security` and
          `/legal` are the same disclosure under the names a reviewer reaches for, and `/terms`
          and `/dpa` are addresses for documents that do not exist — which the page says, under
          "What a district asks for that this product does not have", rather than leaving the
          reviewer to find the silence themselves. Redirects rather than five copies, so there
          is one URL to cite and one page to keep true. */}
      <Route path="/privacy" element={<DataProtection />} />
      <Route path="/security" element={<Navigate to="/privacy" replace />} />
      <Route path="/legal" element={<Navigate to="/privacy" replace />} />
      <Route path="/terms" element={<Navigate to="/privacy" replace />} />
      <Route path="/dpa" element={<Navigate to="/privacy" replace />} />
      {/* Everything above this line is a route or a redirect somebody can name. What falls
          through is an address this product does not serve, and it says so rather than landing
          quietly on the front door — a teacher who has lost a character out of a class link
          needs to be told that, not shown a page that looks entirely correct. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
