import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { CONCEPTS } from "../domain/blueprint/concepts";
import { ALIGNMENT_DISCLAIMER, NYSED_OBJECTIVES, STANDARDS_ROWS } from "../domain/blueprint/standards";
import type { MasteryStatus, Trajectory } from "../domain/evidence/types";
import { aggregateC4MicroSkills, aggregateConcepts, aggregateMicroSkills, classSummary, DEMO_LABEL, DEMO_STUDENTS, teachNext, type DemoStudent } from "../fixtures/demoClass";
import { EducatorShell } from "./EducatorShell";

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
function CopyButton({ text, label = "Copy 4-minute reteach" }: { text: string; label?: string }) {
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

const RETEACH_SCRIPT = "Remove one uncertain $800 source from two sample plans. Ask which plan can adjust without moving locked money, then have students build the revised state.";

function AlignmentBlock() {
  return (
    <section className="alignment-block">
      <div className="section-heading"><p className="eyebrow">Verified NYSED connection</p><h2>One evidence engine. Two useful views.</h2></div>
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

export function EducatorGuide() {
  return (
    <EducatorShell>
      <section className="guide-hero">
        <div><p className="eyebrow">Educator challenge brief · Grades 6–8</p><h1>Plan Under Pressure</h1><p className="lede">A post-instruction application assessment for adaptive budgeting under uncertainty.</p><div className="guide-meta"><span>Grades 6–8</span><span>12–15 minutes</span><span>Basketball · Eight Weeks to the Showcase</span><span>Use after instruction</span></div><div className="hero-actions"><Link className="button button--primary" to="/challenge">Try the student challenge</Link><Link className="button button--secondary" to="/educator/class">Open demo evidence</Link></div></div>
        <aside><span className="guide-hero__mark">PUP / 01</span><blockquote>“Schools teach the skill. BOW reveals whether students can apply it.”</blockquote><p>No vocabulary quiz. The financial state the student constructs is the answer.</p></aside>
      </section>
      <section className="guide-section guide-section--dark"><div className="section-heading"><p className="eyebrow">Before students begin</p><h2>Students should already know how to…</h2></div><ol className="prerequisite-list"><li><span>01</span>Distinguish dependable and conditional income.</li><li><span>02</span>Combine recurring and one-time costs.</li><li><span>03</span>Build a budget that does not exceed available money.</li><li><span>04</span>Separate committed money from money that can change.</li><li><span>05</span>Revise after income or expenses change.</li><li><span>06</span>Explain a tradeoff with relevant numbers.</li></ol><p className="companion-callout">Schools may use their own instruction. <Link to="/educator/teaching-companion">View the optional two-day sample mini-unit →</Link></p></section>
      <section className="guide-section"><div className="section-heading"><p className="eyebrow">What students do</p><h2>One plan. A consequence. A defense.</h2></div><div className="process-line"><div><span>01</span><h3>Compare</h3><p>Calculate full setup costs and choose a context.</p></div><div><span>02</span><h3>Construct</h3><p>Build a viable eight-week plan from dependable and optional conditional income.</p></div><div><span>03</span><h3>Check</h3><p>Build a lower-resource state by changing the real plan.</p></div><div><span>04</span><h3>Adapt</h3><p>Respond to a personalized Week 5 income loss and required cost.</p></div><div><span>05</span><h3>Defend</h3><p>Explain workability, priority, and opportunity cost with numbers.</p></div></div></section>
      <section className="guide-section evidence-system"><div className="section-heading"><p className="eyebrow">Evidence generated</p><h2>Every point can be traced.</h2></div><div className="evidence-system__grid"><div className="score-architecture"><div><strong>90</strong><span>structured points</span></div><i>+</i><div><strong>10</strong><span>educator-reviewed reasoning</span></div><i>=</i><div><strong>100</strong><span>transparent final grade</span></div></div><ul><li>Six concept results</li><li>18 structured micro-skill observations</li><li>First attempts and independent corrections</li><li>Support history and saved financial states</li><li>Status and trajectory shown separately</li><li>Written reasoning reviewed by the educator</li></ul></div></section>
      <AlignmentBlock />
      <section className="guide-section launch-guide"><div className="section-heading"><p className="eyebrow">Use it in class</p><h2>Five simple steps.</h2></div><ol><li>Confirm your instruction covered the prerequisites.</li><li>Give students the challenge link, class code, and seat code.</li><li>Allow about 15 minutes and do not coach a financial strategy.</li><li>Open the top concept gap and inspect affected evidence.</li><li>Score reasoning, compare defensible plans, and decide what to reteach.</li></ol><p>A high grade reflects demonstrated financial skills—not a preference for saving more, spending less, taking a job, or choosing the cheapest option.</p></section>
    </EducatorShell>
  );
}

export function TeachingCompanion() {
  return (
    <EducatorShell>
      <header className="page-header"><p className="eyebrow">Optional educator resource</p><h1>Two-Day Mini-Unit: Budgeting Under Uncertainty</h1><p>Schools may use their own instruction. This sample sequence shows the prerequisite skills students should learn before Plan Under Pressure. It does not pre-teach Avery's answers.</p></header>
      <div className="mini-unit-grid">
        <article><header><span>Day 01</span><h2>Build a plan from dependable money</h2><p>Example context: Jordan is saving for a robotics camp while earning money from neighborhood jobs.</p></header><ol><li><b>Dependable vs conditional income</b><p>Sort a guaranteed allowance from snow-shoveling money that depends on weather.</p></li><li><b>Recurring + one-time full cost</b><p>Calculate six weeks of bus fare plus a one-time registration fee.</p></li><li><b>Basic viable budget</b><p>Give every dollar one job across required costs, a goal, a reserve, and flexible cash.</p></li></ol><aside>Exit prompt: “Which dollars can Jordan count on before the weather is known?”</aside></article>
        <article><header><span>Day 02</span><h2>Revise when conditions change</h2><p>Example context: Sam is preparing for a school music showcase with a short paid equipment-helper role.</p></header><ol><li><b>Committed vs adjustable money</b><p>Mark the registration and transit already committed; keep future savings adjustable.</p></li><li><b>Contingency thinking</b><p>Construct a lower-income version without telling students which priority to reduce.</p></li><li><b>Unexpected change</b><p>Add a required repair cost, revise the plan, and explain one tradeoff with two numbers.</p></li></ol><aside>Debrief prompt: “How can two different revised plans both be financially coherent?”</aside></article>
      </div>
      <section className="teaching-boundary"><h2>Keep the assessment clean</h2><p>Teach the concepts with different names, amounts, and situations. During the BOW challenge, allow calculators and access tools, but do not tell students which financial strategy to choose.</p><Link className="button button--primary" to="/educator/guide">Return to challenge brief</Link></section>
    </EducatorShell>
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
        return <tr key={row.conceptId} className={row.conceptId === "contingency" ? "is-emphasized" : ""}><th scope="row"><Link to={`/educator/class/concepts/${row.conceptId}`}><span>{concept.code}</span>{concept.label}</Link></th><td><div className="matrix-bar" aria-label={`${row.counts.demonstrated_independently} independent, ${row.counts.demonstrated_with_support} with support, ${row.counts.developing} developing, ${row.counts.not_demonstrated} not demonstrated, ${row.counts.not_observed} not observed`}>{statusOrder.map((status) => row.counts[status] > 0 && <span key={status} data-status={status} style={{ width: `${(row.counts[status] / records.length) * 100}%` }} title={`${STATUS_LABELS[status]}: ${row.counts[status]} of ${records.length}`} />)}</div><div className="matrix-counts">{statusOrder.map((status) => <span key={status}><i data-status={status} />{row.counts[status]}</span>)}</div></td><td><b>{followUp}</b> of {records.length}</td></tr>;
      })}</tbody>
    </table>
  );
}

const statusOrder: readonly MasteryStatus[] = ["demonstrated_independently", "demonstrated_with_support", "developing", "not_demonstrated", "not_observed"];

export function ClassOverview() {
  const insight = teachNext(DEMO_STUDENTS);
  const summary = classSummary(DEMO_STUDENTS);
  const reviewStudents = ["04", "11", "14", "18"].map((seat) => DEMO_STUDENTS.find((student) => student.seatCode === seat)!);
  return (
    <EducatorShell demo>
      <header className="class-header"><div><p className="eyebrow">Period 3 · Plan Under Pressure</p><h1>Basketball evidence room</h1></div><div><span>{summary.total} students</span><span>{summary.reviewed} reviewed</span><span>{summary.pending} reasoning pending</span></div></header>
      <section className="teach-next"><p className="eyebrow">Teach next · C4</p><h2>Build a complete fallback.</h2><p><b>{summary.openingIncomplete} of {summary.total}</b> students saved a plan with money still exposed. <b>{summary.laterCorrected}</b> later closed the gap during Week 5; <b>{summary.persistentFallbackGap}</b> still need follow-up.</p><div><Link className="button button--primary" to={`/educator/class/concepts/${insight?.conceptId}`}>Open C4 evidence</Link><CopyButton text={RETEACH_SCRIPT} /></div><span className="standard-chip">NYSED 1.2 · 4.1 partial</span></section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Concept matrix</p><h2>Current evidence by financial concept</h2></div><Matrix records={DEMO_STUDENTS} /></section>
      <section className="trajectory-panel"><div><p className="eyebrow">Trajectory</p><h2>How students got here</h2><p>Counts answer different questions and may overlap.</p></div><div className="trajectory-strip"><span><b>{summary.independentFirst}</b> independent first</span><span><b>{summary.laterCorrected}</b> corrected after consequence</span><span><b>{summary.completedWithSupport}</b> completed with support</span><span><b>{summary.persistentFallbackGap}</b> still need follow-up</span></div></section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Students to review</p><h2>Evidence before grade order</h2></div><div className="student-worklist">{reviewStudents.map((student) => <Link key={student.seatCode} to={`/educator/class/students/${student.seatCode}`}><div><span>Seat {student.seatCode} · {student.finalPoints === null ? `${student.structuredPoints}/90 structured` : `${student.finalPoints}/100`}</span><h3>{student.evidenceLine}</h3><p>{student.primaryNeed}</p></div><span aria-hidden="true">→</span></Link>)}</div></section>
      <section className="class-foot"><div><span>Grade status</span><strong>{summary.reviewed} of {summary.total} reviewed</strong><p>Median {summary.median} · Range {summary.range[0]}–{summary.range[1]}</p></div><div><span>Challenge</span><strong>Plan Under Pressure</strong><p>Basketball · Eight Weeks to the Showcase</p></div><div><span>Data status</span><strong>{DEMO_LABEL}</strong><p>All totals derive from individual records.</p></div></section>
    </EducatorShell>
  );
}

const C4_LABELS = { "C4.1": "Constructed a fallback or first response", "C4.2": "Changed only adjustable, uncommitted money", "C4.3": "Recognized the exact remaining exposure", "C4.4": "Produced a workable lower-resource plan" } as const;

export function ConceptDrilldown() {
  const { conceptId = "contingency" } = useParams();
  const concept = CONCEPTS.find((item) => item.id === conceptId) ?? CONCEPTS[3]!;
  const affected = DEMO_STUDENTS.filter((student) => ["developing", "not_demonstrated"].includes(student.concepts.find((result) => result.conceptId === concept.id)?.status ?? ""));
  const c4Micro = aggregateC4MicroSkills(DEMO_STUDENTS);
  return (
    <EducatorShell demo>
      <header className="page-header page-header--with-back"><Link to="/educator/class">← Class evidence</Link><p className="eyebrow">{concept.code} · Concept drill-down</p><h1>{concept.label}</h1><p>{concept.description}</p><div className="tag-row"><span>NYSED 1.2</span>{concept.id === "contingency" && <span>4.1 partial</span>}</div></header>
      <section className="drill-grid">
        <div className="drill-main"><div className="section-heading"><p className="eyebrow">Micro-skill distribution</p><h2>Where the evidence separates</h2></div><table className="micro-table"><caption>Counts across {DEMO_STUDENTS.length} hypothetical records</caption><thead><tr><th scope="col">Micro-skill</th><th scope="col">Independent</th><th scope="col">Support</th><th scope="col">Partial / not</th></tr></thead><tbody>{(concept.id === "contingency"
          ? c4Micro.map((row) => ({ ...row, label: C4_LABELS[row.id] }))
          : aggregateMicroSkills(DEMO_STUDENTS, concept.id)
        ).map(({ id, label, independent, support, partial }) => <tr key={id}><th scope="row"><code>{id}</code>{label}</th><td>{independent}</td><td>{support}</td><td>{partial}</td></tr>)}</tbody></table>{concept.id === "contingency" && <p className="context-note">C4 observation context is shown for every student: <b>Opening income fallback</b> or <b>Week 5 cost response</b>.</p>}
          <div className="misconception-list"><h2>How each pattern is identified</h2><p className="misconception-list__note">These are fixed rules applied to the financial states a student saved. The same evidence always produces the same flag — nothing here is inferred or AI-generated.</p>{[
            ["Partial fallback", "A lower-resource plan was saved, but money was still exposed when it was saved.", "The student changed the plan and left part of the risk uncovered."],
            ["Reached for committed money", "The student tried to move a cost that was already locked.", "Committed money is being treated as if it were still available."],
            ["Backup still depends on a bonus", "The backup plan's costs and choices exceed the money that does not depend on a condition.", "The lower-income version still relies on money that may not arrive."],
          ].map(([label, rule, wording]) => <article key={label}><div><b>{label}</b><span>{rule}</span></div><p>{wording}</p></article>)}</div>
        </div>
        <aside className="reteach-card"><p className="eyebrow">4-minute next move</p><h2>Which $800 can move?</h2><p>Show two sample plans that both include an $800 conditional payment. In one, the money supports adjustable goals. In the other, it is needed for a locked cost.</p><ol><li>Remove the $800.</li><li>Ask which plan can still work.</li><li>Have students revise the other plan without choosing their priority for them.</li></ol><CopyButton text={RETEACH_SCRIPT} label="Copy reteach" /></aside>
      </section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Affected students</p><h2>{affected.length} students need follow-up</h2></div><div className="student-worklist">{affected.slice(0, 9).map((student) => <Link key={student.seatCode} to={`/educator/class/students/${student.seatCode}`}><div><span>Seat {student.seatCode}</span><h3>{student.evidenceLine}</h3><p>{student.primaryNeed}</p></div><span>→</span></Link>)}</div></section>
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
      <header className="student-evidence-header"><div><Link to="/educator/class">← Students to review</Link><p className="eyebrow">Seat {student.seatCode} · Basketball</p><h1>{final === null ? "Final grade pending" : `${final}/100`}</h1><p>{student.evidenceLine}</p></div><div><span>Structured</span><strong>{student.structuredPoints}/90</strong><span>Reasoning</span><strong>{reasoning === null ? "Pending" : `${reasoning}/10`}</strong><Link className="button button--secondary" to={`/educator/class/students/${student.seatCode}/reasoning`}>Review reasoning</Link></div></header>
      {student.seatCode === "14" && <section className="golden-case"><p className="eyebrow">Golden evidence case</p><h2>C4: 17/20 · Demonstrated independently</h2><p>Trajectory: <b>Corrected after consequence.</b> The incomplete opening fallback stays in the ledger; the later balanced no-$800 preview updates current status without rewriting earlier points.</p></section>}
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Grade ledger</p><h2>Every point has a source</h2></div><StudentLedger student={student} /></section>
      <section className="evidence-detail-grid">
        <div><div className="section-heading"><p className="eyebrow">Student evidence timeline</p><h2>First attempt through final state</h2></div><ol className="evidence-timeline">{student.seatCode === "14" ? [
          ["Setup comparison", "Entered $1,200 for Teammate Share, then independently corrected to $1,400.", "C2.1 · 4/5"],
          ["Working Plan", "Saved $6,800 funds with $1,200 goal, $900 reserve, and $2,100 flexible cash.", "C3 · 15/15"],
          ["Opening fallback", "Freed $900 and explicitly acknowledged $900 still exposed.", "C4 · 17/20"],
          ["Week 5 change", "Entered $1,950, then corrected to $2,050 without a scaffold.", "C5.1 · 4/5"],
          ["Final repair", "Accepted the $500 clinic and balanced at $0 with $6,300 in working funds.", "C5.4 · 5/5"],
          ["Remaining-risk preview", "Removed the conditional $800 and built a second balanced state.", "Current C4 status updated"],
        ].map(([label, body, result]) => <li key={label}><span /><div><b>{label}</b><p>{body}</p><small>{result}</small></div></li>) : <li><span /><div><b>Recorded evidence</b><p>{student.evidenceLine}</p><small>{student.primaryNeed}</small></div></li>}</ol></div>
        <aside className="snapshot-stack"><p className="eyebrow">Saved financial states</p>{student.seatCode === "14" ? <><article><span>Working Plan</span><strong>$6,800 funds</strong><p>Locked $2,600 · Assigned $4,200 · Balance $0</p></article><article><span>Fallback Version</span><strong>$900 exposed</strong><p>Freed $900 · residual acknowledged</p></article><article><span>Final</span><strong>$6,300 funds</strong><p>Locked $3,650 · Assigned $2,650 · Balance $0</p></article><article><span>No-$800 preview</span><strong>$5,500 funds</strong><p>Assigned $1,850 · Balance $0</p></article></> : <article><span>Evidence snapshot</span><strong>{student.primaryNeed}</strong><p>{student.evidenceLine}</p></article>}</aside>
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
    navigate(`/educator/class/students/${student.seatCode}`);
  };
  return (
    <EducatorShell demo>
      <header className="page-header page-header--with-back"><Link to={`/educator/class/students/${student.seatCode}`}>← Seat {student.seatCode} evidence</Link><p className="eyebrow">Human review · C6</p><h1>Score the financial defense.</h1><p>Reasoning changes only C6 and the final grade. Structured evidence remains untouched.</p></header>
      <div className="reasoning-layout"><section className="student-response"><p className="eyebrow">Student response</p><blockquote>{student.seatCode === "14" ? "I kept $800 for the sports-media course after the update. The clinic added $500, but I gave up Avery's only rest block and reduced the reserve to $400. The revised plan balances at $6,300, and if the $800 completion payment does not arrive, my preview still balances." : "My plan works because I changed future money after the new cost. I used the numbers in my final plan to make sure it balanced."}</blockquote><div className="selected-evidence"><span>Final funds <b>$6,300</b></span><span>Course goal <b>$800</b></span><span>Reserve <b>$400</b></span></div></section><section className="rubric-panel"><p className="eyebrow">10-point reasoning rubric</p>{([
        ["workability", "Workability", 2], ["priority", "Protected priority", 2], ["tradeoff", "Tradeoff / opportunity cost", 2], ["numbers", "Numerical evidence", 4],
      ] as const).map(([key, label, max]) => <div className="rubric-row" key={key}><div><b>{label}</b><span>{key === "numbers" ? "Two accurate, relevant numbers" : "Clear connection to the student's plan"}</span></div><div>{Array.from({ length: max + 1 }, (_, value) => <button type="button" key={value} aria-pressed={scores[key] === value} onClick={() => setScores((current) => ({ ...current, [key]: value }))}>{value}</button>)}</div></div>)}<footer><span>Reasoning total</span><strong>{total}/10</strong><Button onClick={save}>Save review</Button></footer></section></div>
    </EducatorShell>
  );
}

export function StandardsView() {
  return (
    <EducatorShell demo>
      <header className="page-header"><p className="eyebrow">Standards evidence view</p><h1>Evidence connected to NYSED objectives.</h1><p>The same micro-skill observations are regrouped here. There is no separate standards score and no NYSED mastery claim.</p></header>
      <div className="standards-list">{NYSED_OBJECTIVES.map((item) => { const rows = STANDARDS_ROWS.filter((row) => row.objectiveId === item.objectiveId); const strength = item.objectiveId === "4.1" ? "Partial alignment" : rows.some((row) => row.strength === "primary") ? "Primary" : "Supporting"; return <article key={item.objectiveId}><header><span>{strength}</span><b>{item.objectiveId}</b></header><h2>{item.shortLabel}</h2><blockquote>{item.officialObjective}</blockquote><div>{[...new Set(rows.map((row) => row.microSkillId))].map((id) => <code key={id}>{id}</code>)}</div>{item.objectiveId === "4.1" && <p>Advance planning for unexpected events only. Insurance is not taught or assessed.</p>}<a href={item.officialUrl} target="_blank" rel="noreferrer">Open official NYSED source ↗</a></article>; })}</div><p className="disclaimer">{ALIGNMENT_DISCLAIMER}</p>
    </EducatorShell>
  );
}
