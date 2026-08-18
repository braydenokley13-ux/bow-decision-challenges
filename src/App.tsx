import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";
import { MyClasses } from "./educator/MyClasses";
import { AssignFlow, ObjectiveDetail, ObjectiveList } from "./educator/ObjectivePages";
import { ObjectiveMap } from "./educator/ObjectiveMap";
import { RealClassOverview, RealStudentEvidence } from "./educator/RealClassPages";
import { ReadingQueue } from "./educator/ReadingQueue";
import { Debrief } from "./educator/Debrief";
import { PLAN_UNDER_PRESSURE } from "./platform/challenges/registry";
import { StudentJoin } from "./student/Join";
import { StudentHome } from "./student/Home";
import { PLAYABLE_WORLDS } from "./domain/scenario/registry";

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
      <Route path={PLAN_UNDER_PRESSURE.route} element={<ChallengeProvider><StudentChallenge /></ChallengeProvider>} />
      {/* The route this shipped on. Class codes and bookmarks already point at it, so it
          redirects rather than 404s — and keeps redirecting after Challenge #2 lands. */}
      <Route path="/challenge" element={<Navigate to={PLAN_UNDER_PRESSURE.route} replace />} />
      {/* An educator lands on their own classes. The map is a click away in the nav; it is
          a year-planning surface, not the thing a teacher opens mid-week. */}
      <Route path="/educator" element={<Navigate to="/educator/classes" replace />} />
      <Route path="/educator/classes" element={<MyClasses />} />
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
      {/* The fixture class, behind a route that says so. It exists to show an educator the
          shape of the evidence before they run one, and it can never be reached from a
          real class's URL. */}
      <Route path="/educator/demo" element={<ClassOverview />} />
      <Route path="/educator/demo/concepts/:conceptId" element={<ConceptDrilldown />} />
      <Route path="/educator/demo/students/:seatCode" element={<StudentEvidence />} />
      <Route path="/educator/demo/students/:seatCode/reasoning" element={<ReasoningReview />} />
      <Route path="/educator/demo/standards" element={<StandardsView />} />
      {/* The routes the demo shipped on. */}
      <Route path="/educator/class" element={<Navigate to="/educator/demo" replace />} />
      <Route path="/educator/class/standards" element={<Navigate to="/educator/demo/standards" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
