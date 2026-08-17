import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { CourtBackdrop } from "./components/story/CourtBackdrop";
import { RosterCard } from "./components/story/RosterCard";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";
import { MyClasses } from "./educator/MyClasses";
import { AssignFlow, ObjectiveDetail, ObjectiveList } from "./educator/ObjectivePages";
import { ObjectiveMap } from "./educator/ObjectiveMap";
import { RealClassOverview, RealStudentEvidence } from "./educator/RealClassPages";
import { ReadingQueue } from "./educator/ReadingQueue";
import { Debrief } from "./educator/Debrief";
import { PLAN_UNDER_PRESSURE } from "./platform/challenges/registry";

function Home() {
  return (
    <main className="home scene" data-world="basketball">
      <CourtBackdrop />
      <header className="home__bar">
        <AppMark />
        <Link to="/educator/guide">For educators</Link>
      </header>
      <section className="home__grid">
        <div className="home__copy">
          <p className="eyebrow">Plan Under Pressure · Basketball</p>
          <h1>Eight weeks to the showcase.</h1>
          <p className="home__deck">Avery Reyes just got the last roster spot. Avery plays. You handle the money.</p>
          <div className="home__actions">
            <Link className="button button--primary" to={PLAN_UNDER_PRESSURE.route}>Start the challenge</Link>
          </div>
        </div>
        <aside className="home__side">
          <RosterCard note="Eight weeks. One shot at the sports-media course." />
        </aside>
      </section>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
