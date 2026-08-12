import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ChallengeProvider } from "./app/ChallengeContext";
import { AppMark } from "./components/primitives/AppMark";
import { StudentChallenge } from "./stages/StudentChallenge";
import { ClassOverview, ConceptDrilldown, EducatorGuide, ReasoningReview, StandardsView, StudentEvidence, TeachingCompanion } from "./educator/EducatorPages";

function Home() {
  return (
    <main className="home-page">
      <header><AppMark /><Link to="/educator/guide">For educators</Link></header>
      <section>
        <div><p className="eyebrow">BOW DECISION CHALLENGES · GRADES 6–8</p><h1>Eight weeks can change a plan.</h1><p>Avery Reyes has a place with the Harbor City Flight and one chance to save for a sports-media course. The first plan looks manageable. Week 5 changes the math.</p><div><Link className="button button--primary" to="/challenge">Start Avery’s story</Link><Link className="button button--secondary" to="/educator/class">View class evidence</Link></div></div>
        <aside aria-label="Eight Weeks to the Showcase"><span>HARBOR CITY FLIGHT</span><strong>08</strong><b>WEEKS</b><i>AVERY REYES · AGE 18</i></aside>
      </section>
      <footer><span>Post-instruction application assessment</span><span>Six assessed concepts</span><span>Basketball</span></footer>
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
