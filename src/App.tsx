import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { CourtBackdrop } from "./components/story/CourtBackdrop";
import { RosterCard } from "./components/story/RosterCard";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";
import { ClassSetup } from "./educator/ClassSetup";
import { durationLabel, PLAN_UNDER_PRESSURE } from "./platform/challenges/registry";

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
          <p className="home__deck">Avery Reyes just got the last roster spot with the Harbor City Flight. Some of the money is promised, some has to be earned, and the bills arrive either way. Avery plays. You handle the money.</p>
          <div className="home__actions">
            <Link className="button button--primary" to={PLAN_UNDER_PRESSURE.route}>Start the challenge</Link>
            <Link className="button button--secondary" to="/educator/guide">For educators</Link>
          </div>
        </div>
        <aside className="home__side">
          <RosterCard note="Eight weeks. One shot at the sports-media course." />
        </aside>
      </section>
      <footer className="home__foot">
        <span>{PLAN_UNDER_PRESSURE.grades}</span>
        <span>{durationLabel(PLAN_UNDER_PRESSURE)}</span>
        <span>{PLAN_UNDER_PRESSURE.placement}</span>
        <span>Adaptive budgeting under uncertainty</span>
      </footer>
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
      <Route path="/educator/guide" element={<EducatorGuide />} />
      <Route path="/educator/classes/new" element={<ClassSetup />} />
      <Route path="/educator/teaching-companion" element={<TeachingCompanion />} />
      <Route path="/educator/class" element={<ClassOverview />} />
      <Route path="/educator/class/concepts/:conceptId" element={<ConceptDrilldown />} />
      <Route path="/educator/class/students/:seatCode" element={<StudentEvidence />} />
      <Route path="/educator/class/students/:seatCode/reasoning" element={<ReasoningReview />} />
      <Route path="/educator/class/standards" element={<StandardsView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
