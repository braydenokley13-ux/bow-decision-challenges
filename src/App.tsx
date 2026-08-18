import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppMark } from "./components/primitives/AppMark";
import { StudentChallenge } from "./stages/StudentChallenge";
import { EducatorGuide, TeachingCompanion } from "./educator/EducatorPages";
import { MyClasses } from "./educator/MyClasses";
import { TeacherSignIn } from "./educator/SignIn";
import { AssignFlow, ObjectiveDetail, ObjectiveList } from "./educator/ObjectivePages";
import { ObjectiveMap } from "./educator/ObjectiveMap";
import { RealClassOverview, RealStudentEvidence } from "./educator/RealClassPages";
import { ReadingQueue } from "./educator/ReadingQueue";
import { Debrief } from "./educator/Debrief";
import { Roster } from "./educator/Roster";
import { ShareOut } from "./educator/ShareOut";
import { PLAN_UNDER_PRESSURE } from "./platform/challenges/registry";
import { StudentJoin } from "./student/Join";
import { StudentHome } from "./student/Home";
import { RunReport } from "./student/RunReport";
import { ResumeGate } from "./student/ResumeGate";
import { PLAYABLE_WORLDS } from "./domain/scenario/registry";
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
  return (
    <main className="home scene">
      <header className="home__bar">
        <AppMark />
        <Link to="/educator/guide">For educators</Link>
      </header>
      <section className="home__grid">
        <div className="home__copy">
          <p className="eyebrow">{PLAN_UNDER_PRESSURE.pillar} · {PLAN_UNDER_PRESSURE.grades}</p>
          <h1>Somebody has to decide where the money goes.</h1>
          <p className="home__deck">
            Two worlds, one job. {PLAYABLE_WORLDS.map((world) => world.title).join(" or ")} — you handle the money,
            and you find out what your decisions cost.
          </p>
          <div className="home__actions">
            <Link className="button button--primary" to="/join">I have a class code</Link>
            <Link className="button button--secondary" to="/home">Come back to my class</Link>
          </div>
        </div>
        <aside className="home__side">
          <ul className="home__worlds">
            {PLAYABLE_WORLDS.map((world) => (
              <li key={world.id} data-world={world.id}>
                <strong>{world.title}</strong>
                <span>{world.subtitle}</span>
                <span className="home__worlds-length">{world.durationMinutes.min}–{world.durationMinutes.max} minutes</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* A student signs in once and comes back to a screen that is theirs. The three
          actions are the same every time: class code, tap your name, type the code on your
          card. Nothing here asks for a name, an email address or a birthday. */}
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
      {/* The door a teacher did not have. A class used to be a code and a key in one browser,
          so a reimaged laptop destroyed a term of assessed work — and every endpoint behind
          this screen had been answering correctly for hours with nothing calling them. */}
      <Route path="/educator/sign-in" element={<TeacherSignIn />} />
      <Route path="/educator/classes/new" element={<MyClasses />} />
      <Route path="/educator/guide" element={<EducatorGuide />} />
      {/* The objective a teacher assigns and the list they find it in. Real classes only;
          there is no demo objective. */}
      <Route path="/educator/map" element={<ObjectiveMap />} />
      <Route path="/educator/objectives" element={<ObjectiveList />} />
      <Route path="/educator/objectives/:frameworkId/:code" element={<ObjectiveDetail />} />
      {/* One path to assigning work, and it is the classes page. This is the URL the old
          second path shipped on. */}
      <Route path="/educator/assign" element={<AssignFlow />} />
      <Route path="/educator/teaching-companion" element={<TeachingCompanion />} />
      {/* A real class. Everything under here reads submitted evidence and nothing else. */}
      <Route path="/educator/class/:code" element={<RealClassOverview />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
