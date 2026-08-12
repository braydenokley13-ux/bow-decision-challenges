import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { CourtBackdrop } from "./components/story/CourtBackdrop";
import { RosterCard } from "./components/story/RosterCard";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";

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
            <Link className="button button--primary" to="/challenge">Start the challenge</Link>
            <Link className="button button--secondary" to="/educator/class">See the evidence a teacher gets</Link>
          </div>
        </div>
        <aside className="home__side">
          <RosterCard note="Eight weeks. One shot at the sports-media course." />
        </aside>
      </section>
      <footer className="home__foot">
        <span>Grades 6–8</span>
        <span>12–15 minutes</span>
        <span>Applied after instruction</span>
        <span>Adaptive budgeting under uncertainty</span>
      </footer>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/challenge" element={<ChallengeProvider><StudentChallenge /></ChallengeProvider>} />
      <Route path="/educator/guide" element={<EducatorGuide />} />
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
