import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";

function Home() {
  return (
    <main className="home-page" data-world="basketball">
      <header><AppMark /><Link to="/educator/guide">For educators</Link></header>
      <section className="home-page__stage">
        <div className="home-page__copy">
          <p className="eyebrow">Plan Under Pressure · Basketball</p>
          <h1>Eight weeks to the showcase.</h1>
          <p className="home-page__deck">Avery has $5,000 that is certain, $1,800 that is not, and bills either way. You make the money calls. In Week 5 the season changes and your plan has to survive it.</p>
          <ol className="home-page__beats">
            <li><span>01</span>Build a plan that works</li>
            <li><span>02</span>Week 5 breaks it</li>
            <li><span>03</span>Repair it and defend it</li>
          </ol>
          <div className="home-page__actions">
            <Link className="button button--primary" to="/challenge">Start the challenge</Link>
            <Link className="button button--secondary" to="/educator/class">See the evidence a teacher gets</Link>
          </div>
        </div>
        <aside className="home-page__mark" aria-hidden="true">
          <span className="home-page__weeks">08</span>
          <b>weeks</b>
          <i>Week 5 changes everything</i>
        </aside>
      </section>
      <footer>
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
