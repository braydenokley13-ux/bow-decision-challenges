import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { CONCEPTS } from "../domain/blueprint/concepts";
import { STRUCTURED_MICRO_SKILLS } from "../domain/blueprint/microSkills";
import { ALIGNMENT_DISCLAIMER, NYSED_OBJECTIVES, STANDARDS_ROWS } from "../domain/blueprint/standards";
import type { MasteryStatus, Trajectory } from "../domain/evidence/types";
import { aggregateConcepts, aggregateMicroSkills, classSummary, contingencyRoutes, DEMO_LABEL, DEMO_STUDENTS, reviewQueue, teachNext, type DemoStudent } from "../fixtures/demoClass";
import { EducatorShell } from "./EducatorShell";
import { durationLabel, PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { RETEACH_TOPICS } from "../domain/competency/reteach";

const STATUS_LABELS: Record<MasteryStatus, string> = {
  demonstrated_independently: "Independent",
  demonstrated_with_support: "With support",
  developing: "Developing",
  not_demonstrated: "Not demonstrated",
  not_observed: "Not observed",
};

const TRAJECTORY_LABELS: Record<Trajectory, string> = {
  independent_first_opportunity: "Independent first opportunity",
  corrected_after_consequence: "Corrected after consequence",
  corrected_after_scaffold: "Corrected after scaffold",
  new_difficulty_during_adaptation: "New difficulty during adaptation",
  persistent_gap: "Persistent gap",
  insufficient_evidence: "Insufficient evidence",
};

const objective = (id: string) => NYSED_OBJECTIVES.find((item) => item.objectiveId === id)!;

/** Copy-to-clipboard that confirms it worked, and says so when the browser blocks it. */
function CopyButton({ text, label = "Copy the reteach" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <Button
      variant="secondary"
      onClick={() => {
        navigator.clipboard?.writeText(text)
          .then(() => setState("copied"))
          .catch(() => setState("failed"));
        window.setTimeout(() => setState("idle"), 2400);
      }}
    >
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy blocked — select it manually" : label}</span>
    </Button>
  );
}

/**
 * The reteach this sample points at, read from the table every real class reads.
 *
 * The demo used to carry its own three-step script and call it a "4-minute reteach" while
 * the real objective page called the same lesson twelve minutes. A duration written twice is
 * a duration that disagrees with itself, so there is one of each here: one title, one focus,
 * one set of moves, one number of minutes.
 */
const DEMO_RETEACH = RETEACH_TOPICS.find((topic) => topic.id === "certain-and-conditional")!;
const RETEACH_SCRIPT = `${DEMO_RETEACH.title}. ${DEMO_RETEACH.moves.join(" ")}`;

function AlignmentBlock() {
  return (
    <section className="alignment-block">
      <div className="section-heading"><p className="eyebrow">Standards alignment</p><h2>Mapped to NYSED objectives, not scored against them.</h2></div>
      <div className="alignment-grid">
        {["1.2", "1.3", "5.1", "1.1", "4.1"].map((id) => {
          const item = objective(id);
          return <article key={id}><span>{id === "1.2" || id === "1.3" ? "Primary" : id === "4.1" ? "Partial" : "Supporting"}</span><h3>{id} · {item.shortLabel}</h3><p>{id === "4.1" ? "Advance-planning portion only; insurance is not assessed." : item.officialObjective}</p><a href={item.officialUrl} target="_blank" rel="noreferrer">Official source ↗</a></article>;
        })}
      </div>
      <p className="disclaimer">{ALIGNMENT_DISCLAIMER}</p>
    </section>
  );
}

/**
 * The eight questions a teacher who has never spoken to anyone at BOW needs answered
 * before they will run this, answered above the fold and in their own words. The last
 * three are questions about a real class, so they link into the evidence rather than
 * being described here.
 */
function BriefAnswers() {
  return (
    <section className="brief-answers">
      <div className="section-heading"><p className="eyebrow">Read this first</p><h2>The whole resource in one minute.</h2></div>
      <dl>
        <div><dt>What does it assess?</dt><dd>Whether students can <b>apply</b> budgeting under uncertainty — build a workable eight-week plan, keep it working when income and costs change, and justify it.</dd></div>
        <div><dt>When do I use it?</dt><dd><b>After</b> you have taught the concepts. It is an application task, not a lesson.</dd></div>
        <div><dt>How long?</dt><dd><b>{durationLabel(PLAN_UNDER_PRESSURE)}</b> for most students. One sitting, one device, no sound.</dd></div>
        <div><dt>What do students do?</dt><dd>They handle the money for a player’s eight-week season: read a contract, choose housing, build a plan, absorb a Week 5 loss and a new required cost, repair the plan, and defend it.</dd></div>
        <div><dt>What do I get back?</dt><dd>For each student, what the evidence shows against each skill — requirement by requirement, every judgement traceable to the moment in their own run. Plus what the class decided, and one written explanation you read and score yourself. A points total for your gradebook comes with it.</dd></div>
        <div><dt>How do I launch it?</dt><dd>Create a class, read out the code, and give each student a seat number. No accounts, no email addresses, no names, no roster.</dd></div>
      </dl>
      <div className="brief-answers__links">
        <Link to="/educator/classes">Run this with my class →</Link>
        <Link to="/educator/demo">See a sample class →</Link>
        <Link to="/educator/objectives">What it assesses →</Link>
      </div>
    </section>
  );
}

/**
 * The educator guide — a quick start, not a brochure.
 *
 * This was a 4,669px marketing page with a three-circle graphic that encoded a sum. What a
 * teacher needs before running this is six answers, what students should already know, and
 * five steps. Everything else it used to say is on the surfaces that do the work.
 */
export function EducatorGuide() {
  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">Educator guide · {PLAN_UNDER_PRESSURE.grades}</p>
        <h1>{PLAN_UNDER_PRESSURE.title}</h1>
        <p>
          An application task for adaptive budgeting under uncertainty. {durationLabel(PLAN_UNDER_PRESSURE)},
          one sitting, one device. {PLAN_UNDER_PRESSURE.placement}.
        </p>
        <p className="guide-actions">
          <Link className="button button--primary" to="/educator/classes">Create a class</Link>
          <Link className="button button--secondary" to={PLAN_UNDER_PRESSURE.route}>Try it as a student</Link>
          {/* The one way in to the fixture, framed as what it is. It used to be a nav item
              beside a teacher's real classes. */}
          <Link className="button button--secondary" to="/educator/demo">See a sample class</Link>
        </p>
      </header>
      <BriefAnswers />
      <section className="dashboard-section">
        <div className="section-head">
          <h2>Before students begin</h2>
          <p>Teach these first. This is an application task, not a lesson.</p>
        </div>
        <ol className="prerequisite-list">
          <li><span>01</span>Distinguish dependable and conditional income.</li>
          <li><span>02</span>Combine recurring and one-time costs.</li>
          <li><span>03</span>Build a budget that does not exceed available money.</li>
          <li><span>04</span>Separate committed money from money that can change.</li>
          <li><span>05</span>Revise after income or expenses change.</li>
          <li><span>06</span>Explain a tradeoff with relevant numbers.</li>
        </ol>
        <p className="companion-callout">
          Schools may use their own instruction. <Link to="/educator/teaching-companion">A two-day sample mini-unit →</Link>
        </p>
      </section>
      <section className="dashboard-section launch-guide">
        <div className="section-head">
          <h2>Running it</h2>
        </div>
        <ol>
          <li><Link to="/educator/classes">Create a class</Link>, read out the code, and give each student a seat number.</li>
          <li>Allow {durationLabel(PLAN_UNDER_PRESSURE)}. Do not coach a financial strategy.</li>
          <li>Read and score the written explanations. Nothing a student writes is machine-scored.</li>
          <li>Open the class: what the evidence shows, and what to teach next.</li>
          <li>Run the debrief with the room.</li>
        </ol>
        <p>
          A high grade reflects demonstrated financial skills — not a preference for saving more, spending less,
          taking a job, or choosing the cheapest option.
        </p>
      </section>
      <AlignmentBlock />
    </EducatorShell>
  );
}

export function TeachingCompanion() {
  return (
    <EducatorShell measure="bleed">
      <header className="page-header"><p className="eyebrow">Optional educator resource</p><h1>Two-Day Mini-Unit: Budgeting Under Uncertainty</h1><p>Schools may use their own instruction. This sample sequence shows the prerequisite skills students should learn before Plan Under Pressure. It does not pre-teach Avery's answers.</p></header>
      <div className="mini-unit-grid">
        <article><header><span>Day 01</span><h2>Build a plan from dependable money</h2><p>Example context: Jordan is saving for a robotics camp while earning money from neighborhood jobs.</p></header><ol><li><b>Dependable vs conditional income</b><p>Sort a guaranteed allowance from snow-shoveling money that depends on weather.</p></li><li><b>Recurring + one-time full cost</b><p>Calculate six weeks of bus fare plus a one-time registration fee.</p></li><li><b>Basic viable budget</b><p>Give every dollar one job across required costs, a goal, a reserve, and flexible cash.</p></li></ol><aside>Exit prompt: “Which dollars can Jordan count on before the weather is known?”</aside></article>
        <article><header><span>Day 02</span><h2>Revise when conditions change</h2><p>Example context: Sam is preparing for a school music showcase with a short paid equipment-helper role.</p></header><ol><li><b>Committed vs adjustable money</b><p>Mark the registration and transit already committed; keep future savings adjustable.</p></li><li><b>Contingency thinking</b><p>Construct a lower-income version without telling students which priority to reduce.</p></li><li><b>Unexpected change</b><p>Add a required repair cost, revise the plan, and explain one tradeoff with two numbers.</p></li></ol><aside>Debrief prompt: “How can two different revised plans both be financially coherent?”</aside></article>
      </div>
      <section className="teaching-boundary"><h2>Keep the assessment clean</h2><p>Teach the concepts with different names, amounts, and situations. During the BOW challenge, allow calculators and access tools, but do not tell students which financial strategy to choose.</p><Link className="button button--primary" to="/educator/guide">Return to challenge brief</Link></section>
    </EducatorShell>
  );
}

function StatusKey() {
  return (
    <ul className="status-key">
      {statusOrder.map((status) => <li key={status}><i data-status={status} />{STATUS_LABELS[status]}</li>)}
    </ul>
  );
}

function Matrix({ records }: { records: DemoStudent[] }) {
  const rows = aggregateConcepts(records);
  return (
    <table className="concept-matrix">
      <caption>Concept status across 28 hypothetical student records</caption>
      <thead><tr><th scope="col">Concept</th><th scope="col">Status distribution</th><th scope="col">Follow-up</th></tr></thead>
      <tbody>{rows.map((row) => {
        const concept = CONCEPTS.find((item) => item.id === row.conceptId)!;
        const followUp = row.counts.developing + row.counts.not_demonstrated;
        return <tr key={row.conceptId} className={row.conceptId === "contingency" ? "is-emphasized" : ""}><th scope="row"><Link to={`/educator/demo/concepts/${row.conceptId}`}><span>{concept.code}</span>{concept.label}</Link></th><td><div className="matrix-bar" aria-label={`${row.counts.demonstrated_independently} independent, ${row.counts.demonstrated_with_support} with support, ${row.counts.developing} developing, ${row.counts.not_demonstrated} not demonstrated, ${row.counts.not_observed} not observed`}>{statusOrder.map((status) => row.counts[status] > 0 && <span key={status} data-status={status} style={{ width: `${(row.counts[status] / records.length) * 100}%` }} title={`${STATUS_LABELS[status]}: ${row.counts[status]} of ${records.length}`} />)}</div><div className="matrix-counts">{statusOrder.map((status) => <span key={status}><i data-status={status} />{row.counts[status]}</span>)}</div></td><td><b>{followUp}</b> of {records.length}</td></tr>;
      })}</tbody>
    </table>
  );
}

const statusOrder: readonly MasteryStatus[] = ["demonstrated_independently", "demonstrated_with_support", "developing", "not_demonstrated", "not_observed"];

export function ClassOverview() {
  const insight = teachNext(DEMO_STUDENTS);
  const summary = classSummary(DEMO_STUDENTS);
  const routes = contingencyRoutes(DEMO_STUDENTS);
  const reviewStudents = reviewQueue(DEMO_STUDENTS);
  return (
    <EducatorShell demo>
      <header className="class-header"><div><p className="eyebrow">{DEMO_LABEL} · {BASKETBALL_SCENARIO.title}</p><h1>Sample class</h1><p>{summary.total} hypothetical records, so you can read the shape of the evidence before you run it with anybody.</p></div><div><span>{summary.total} turned in</span><span>{summary.reviewed} read</span><span>{summary.pending} awaiting reading</span></div></header>
      <section className="teach-next"><p className="eyebrow">Teach next · C4</p><h2>Build a complete fallback.</h2><p><b>{summary.persistentFallbackGap} of {summary.total}</b> students finished with a backup plan that does not cover the risk. Another <b>{summary.laterCorrected}</b> left the opening fallback short and closed it themselves during Week 5, and <b>{summary.completedWithSupport}</b> got there after using a scaffold.</p><div><Link className="button button--primary" to={`/educator/demo/concepts/${insight?.conceptId}`}>Open C4 evidence</Link><CopyButton text={RETEACH_SCRIPT} /></div><span className="standard-chip">NYSED 1.2 · 4.1 partial</span></section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Concept matrix</p><h2>Current evidence by financial concept</h2></div><StatusKey /><Matrix records={DEMO_STUDENTS} /></section>
      <section className="trajectory-panel"><div><p className="eyebrow">How they got there · C4</p><h2>Every student is in exactly one of these four.</h2><p>Same 28 records as the matrix, grouped by the route they took to a backup plan.</p></div><div className="route-grid">{routes.map((group) => (
        <article key={group.route} data-route={group.route}>
          <b>{group.students.length}</b>
          <h3>{group.label}</h3>
          <p>{group.meaning}</p>
          <div className="seat-chips">{group.students.map((student) => <Link key={student.seatCode} to={`/educator/demo/students/${student.seatCode}`}>{student.seatCode}</Link>)}</div>
        </article>
      ))}</div></section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Open these first</p><h2>Ordered by evidence, not by grade</h2></div><div className="student-worklist">{reviewStudents.map((student) => <Link key={student.seatCode} to={`/educator/demo/students/${student.seatCode}`}><div><span>Seat {student.seatCode} · {student.finalPoints === null ? `${student.structuredPoints}/90 structured` : `${student.finalPoints}/100`}</span><h3>{student.evidenceLine}</h3><p>{student.primaryNeed}</p></div><span aria-hidden="true">→</span></Link>)}</div></section>
      <section className="class-foot"><div><span>Grade status</span><strong>{summary.reviewed} of {summary.total} reviewed</strong><p>Median {summary.median} · Range {summary.range[0]}–{summary.range[1]}</p></div><div><span>Challenge</span><strong>{PLAN_UNDER_PRESSURE.title}</strong><p>{BASKETBALL_SCENARIO.title}</p></div><div><span>Data status</span><strong>{DEMO_LABEL}</strong><p>All totals derive from individual records. <Link to="/educator/demo/standards">How this maps to objectives</Link></p></div></section>
    </EducatorShell>
  );
}

export function ConceptDrilldown() {
  const { conceptId = "contingency" } = useParams();
  const concept = CONCEPTS.find((item) => item.id === conceptId) ?? CONCEPTS[3]!;
  const affected = DEMO_STUDENTS.filter((student) => ["developing", "not_demonstrated"].includes(student.concepts.find((result) => result.conceptId === concept.id)?.status ?? ""));
  return (
    <EducatorShell demo>
      <header className="page-header page-header--with-back"><Link to="/educator/demo">← Sample class</Link><p className="eyebrow">{concept.code} · Concept drill-down</p><h1>{concept.label}</h1><p>{concept.description}</p><div className="tag-row"><span>NYSED 1.2</span>{concept.id === "contingency" && <span>4.1 partial</span>}</div></header>
      <section className="drill-grid">
        <div className="drill-main"><div className="section-heading"><p className="eyebrow">Micro-skill distribution</p><h2>Where the evidence separates</h2></div><table className="micro-table"><caption>Counts across {DEMO_STUDENTS.length} hypothetical records</caption><thead><tr><th scope="col">Micro-skill</th><th scope="col">Independent</th><th scope="col">Support</th><th scope="col">Partial / not</th></tr></thead><tbody>{aggregateMicroSkills(DEMO_STUDENTS, concept.id).map(({ id, label, independent, support, partial }) => <tr key={id}><th scope="row"><code>{id}</code>{label}</th><td>{independent}</td><td>{support}</td><td>{partial}</td></tr>)}</tbody></table>{concept.id === "contingency" && <p className="context-note">C4 observation context is shown for every student: <b>Opening income fallback</b> or <b>Week 5 cost response</b>.</p>}
          <div className="misconception-list"><h2>How each pattern is identified</h2><p className="misconception-list__note">These are fixed rules applied to the financial states a student saved. The same evidence always produces the same flag — nothing here is inferred or AI-generated.</p>{[
            ["Partial fallback", "A lower-resource plan was saved, but money was still exposed when it was saved.", "The student changed the plan and left part of the risk uncovered."],
            ["Reached for committed money", "The student tried to move a cost that was already locked.", "Committed money is being treated as if it were still available."],
            ["Backup still depends on a bonus", "The backup plan's costs and choices exceed the money that does not depend on a condition.", "The lower-income version still relies on money that may not arrive."],
          ].map(([label, rule, wording]) => <article key={label}><div><b>{label}</b><span>{rule}</span></div><p>{wording}</p></article>)}</div>
        </div>
        <aside className="reteach-card"><p className="eyebrow">Teach next</p><h2>{DEMO_RETEACH.title}</h2><p>{DEMO_RETEACH.focus}</p><ol>{DEMO_RETEACH.moves.map((move) => <li key={move}>{move}</li>)}</ol><p className="next-lesson__minutes">About {DEMO_RETEACH.minutes} minutes.</p><CopyButton text={RETEACH_SCRIPT} /></aside>
      </section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Affected students</p><h2>{affected.length} students need follow-up on {concept.code}</h2><p>Each row lists the micro-skills still open for that student, so a small group can be pulled for the piece they are actually missing.</p></div><div className="student-worklist">{affected.map((student) => {
        const open = STRUCTURED_MICRO_SKILLS.filter((skill) => skill.conceptId === concept.id && student.microStatuses[skill.id] !== "independent");
        return (
          <Link key={student.seatCode} to={`/educator/demo/students/${student.seatCode}`}>
            <div>
              <span>Seat {student.seatCode} · {STATUS_LABELS[student.concepts.find((result) => result.conceptId === concept.id)!.status]}</span>
              <h3>{open.map((skill) => skill.label).join(" · ") || "Concept-level gap with no single micro-skill isolated"}</h3>
              <p>{open.map((skill) => skill.id).join(", ")}</p>
            </div>
            <span aria-hidden="true">→</span>
          </Link>
        );
      })}</div></section>
    </EducatorShell>
  );
}

function readReview(seatCode: string): number | null {
  try {
    const raw = window.localStorage.getItem("bow.educator.v1.review");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, { total: number }>;
    return parsed[seatCode]?.total ?? null;
  } catch { return null; }
}

function StudentLedger({ student }: { student: DemoStudent }) {
  return <table className="grade-ledger"><thead><tr><th>Concept</th><th>Status</th><th>Trajectory</th><th>Points</th></tr></thead><tbody>{student.concepts.map((result) => { const concept = CONCEPTS.find((item) => item.id === result.conceptId)!; return <tr key={result.conceptId}><th><span>{concept.code}</span>{concept.label}</th><td><span className="status-badge" data-status={result.status}>{STATUS_LABELS[result.status]}</span></td><td>{TRAJECTORY_LABELS[result.trajectory]}</td><td>{result.points === null ? "—" : `${result.points}/${result.maxPoints}`}</td></tr>; })}</tbody></table>;
}

export function StudentEvidence() {
  const { seatCode = "14" } = useParams();
  const student = DEMO_STUDENTS.find((item) => item.seatCode === seatCode) ?? DEMO_STUDENTS[13]!;
  const reviewed = readReview(student.seatCode);
  const reasoning = reviewed ?? student.reasoningPoints;
  const final = reasoning === null ? null : student.structuredPoints + reasoning;
  return (
    <EducatorShell demo>
      <header className="student-evidence-header"><div><Link to="/educator/demo">← Sample class</Link><p className="eyebrow">Seat {student.seatCode} · Basketball</p><h1>{final === null ? "Final grade pending" : `${final}/100`}</h1><p>{student.evidenceLine}</p></div><div><span>Structured</span><strong>{student.structuredPoints}/90</strong><span>Reasoning</span><strong>{reasoning === null ? "Pending" : `${reasoning}/10`}</strong><Link className="button button--secondary" to={`/educator/demo/students/${student.seatCode}/reasoning`}>Review reasoning</Link></div></header>
      {student.seatCode === "14" && <section className="golden-case"><p className="eyebrow">Golden evidence case</p><h2>C4: 17/20 · Demonstrated independently</h2><p>Trajectory: <b>Corrected after consequence.</b> The incomplete opening fallback stays in the ledger; the later balanced no-$800 preview updates current status without rewriting earlier points.</p></section>}
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Grade ledger</p><h2>Every point has a source</h2></div><StudentLedger student={student} /></section>
      <section className="evidence-detail-grid">
        <div><div className="section-heading"><p className="eyebrow">Student evidence timeline</p><h2>First attempt through final state</h2></div><ol className="evidence-timeline">{student.timeline.map((entry) => <li key={entry.stage}><span /><div><b>{entry.stage}</b><p>{entry.body}</p><small>{entry.result}</small></div></li>)}</ol></div>
        <aside className="snapshot-stack"><p className="eyebrow">Saved financial states</p>{student.savedStates.map((saved) => <article key={saved.label}><span>{saved.label}</span><strong>{saved.headline}</strong><p>{saved.detail}</p></article>)}</aside>
      </section>
    </EducatorShell>
  );
}

export function ReasoningReview() {
  const { seatCode = "14" } = useParams();
  const navigate = useNavigate();
  const student = DEMO_STUDENTS.find((item) => item.seatCode === seatCode) ?? DEMO_STUDENTS[13]!;
  const [scores, setScores] = useState({ workability: 2, priority: 2, tradeoff: student.seatCode === "14" ? 1 : 0, numbers: student.seatCode === "14" ? 4 : 0 });
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const save = () => {
    const reviews: Record<string, { total: number; scores: typeof scores }> = {};
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem("bow.educator.v1.review") ?? "{}");
      if (parsed && typeof parsed === "object") Object.assign(reviews, parsed);
    } catch { /* A malformed local demo review is safely replaced. */ }
    reviews[student.seatCode] = { total, scores };
    window.localStorage.setItem("bow.educator.v1.review", JSON.stringify(reviews));
    navigate(`/educator/demo/students/${student.seatCode}`);
  };
  return (
    <EducatorShell demo>
      <header className="page-header page-header--with-back"><Link to={`/educator/demo/students/${student.seatCode}`}>← Seat {student.seatCode} evidence</Link><p className="eyebrow">Human review · C6</p><h1>Score the financial defense.</h1><p>Reasoning changes only C6 and the final grade. Structured evidence remains untouched.</p></header>
      <div className="reasoning-layout"><section className="student-response"><p className="eyebrow">Student response</p><blockquote>{student.seatCode === "14" ? "I kept $800 for the sports-media course after the update. The clinic added $500, but I gave up Avery's only rest block and reduced the reserve to $400. The revised plan balances at $6,300, and if the $800 completion payment does not arrive, my preview still balances." : "My plan works because I changed future money after the new cost. I used the numbers in my final plan to make sure it balanced."}</blockquote><div className="selected-evidence">{(student.seatCode === "14"
        ? [["Final funds", "$6,300"], ["Course goal", "$800"], ["Reserve", "$400"]]
        : [["Structured evidence", `${student.structuredPoints}/90`], ["Current need", student.primaryNeed]]
      ).map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}</div><p className="response-note">Numbers shown are the ones this student selected from their own saved plan. Scoring the writing does not change any of them.</p></section><section className="rubric-panel"><p className="eyebrow">10-point reasoning rubric</p>{([
        ["workability", "Workability", 2, "Explains why the final plan actually holds"], ["priority", "Protected priority", 2, "Names what they chose to keep, and why"], ["tradeoff", "Tradeoff / opportunity cost", 2, "Names what that choice cost them"], ["numbers", "Numerical evidence", 4, "Two accurate, relevant numbers from their own plan"],
      ] as const).map(([key, label, max, hint]) => <div className="rubric-row" key={key}><div><b>{label}</b><span>{hint}</span></div><div>{Array.from({ length: max + 1 }, (_, value) => <button type="button" key={value} aria-pressed={scores[key] === value} onClick={() => setScores((current) => ({ ...current, [key]: value }))}>{value}</button>)}</div></div>)}<footer><span>Reasoning total</span><strong>{total}/10</strong><Button onClick={save}>Save review</Button></footer></section></div>
    </EducatorShell>
  );
}

export function StandardsView() {
  return (
    <EducatorShell demo>
      <header className="page-header page-header--with-back"><Link to="/educator/demo">← Sample class</Link><p className="eyebrow">Standards evidence view · {DEMO_LABEL}</p><h1>Evidence connected to NYSED objectives.</h1><p>The same micro-skill observations are regrouped here. There is no separate standards score and no NYSED mastery claim. Each chip below is one micro-skill: its code, then what it observes.</p></header>
      <div className="standards-list">{NYSED_OBJECTIVES.map((item) => { const rows = STANDARDS_ROWS.filter((row) => row.objectiveId === item.objectiveId); const strength = item.objectiveId === "4.1" ? "Partial alignment" : rows.some((row) => row.strength === "primary") ? "Primary" : "Supporting"; return <article key={item.objectiveId}><header><span>{strength}</span><b>{item.objectiveId}</b></header><h2>{item.shortLabel}</h2><blockquote>{item.officialObjective}</blockquote><ul className="skill-chips">{[...new Set(rows.map((row) => row.microSkillId))].map((id) => <li key={id}><code>{id}</code>{STRUCTURED_MICRO_SKILLS.find((skill) => skill.id === id)?.label ?? id}</li>)}</ul>{item.objectiveId === "4.1" && <p>Advance planning for unexpected events only. Insurance is not taught or assessed.</p>}<a href={item.officialUrl} target="_blank" rel="noreferrer">Open official NYSED source ↗</a></article>; })}</div><p className="disclaimer">{ALIGNMENT_DISCLAIMER}</p>
    </EducatorShell>
  );
}
