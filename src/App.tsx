import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";

function Home() {
  return (
    <main className="home-page">
      <header><AppMark /><Link to="/educator/guide">Educator brief</Link></header>
      <section>
        <div><p className="eyebrow">BOW DECISION CHALLENGES · BASKETBALL</p><h1>Can you keep Avery’s money plan alive?</h1><p>You have 8 weeks. Pick a place to stay. Decide which cash to count. Then fix the plan when the season goes sideways.</p><div><Link className="button button--primary" to="/challenge">Start the Basketball Story</Link><Link className="button button--secondary" to="/educator/class">See the Teacher View</Link></div></div>
        <aside><span>PLAN</span><strong>UNDER</strong><b>PRESSURE</b><i>08 WEEKS</i></aside>
      </section>
      <footer><span>Grades 6–8</span><span>Real money choices</span><span>Basketball ready · Fashion coming soon</span></footer>
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
