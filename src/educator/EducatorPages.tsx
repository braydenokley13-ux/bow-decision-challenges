import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { CONCEPTS } from "../domain/blueprint/concepts";
import { STRUCTURED_MICRO_SKILLS } from "../domain/blueprint/microSkills";
import { ALIGNMENT_DISCLAIMER, NYSED_OBJECTIVES, STANDARDS_ROWS } from "../domain/blueprint/standards";
import type { MasteryStatus, Trajectory } from "../domain/evidence/types";
import { aggregateC4MicroSkills, aggregateConcepts, classSummary, DEMO_LABEL, DEMO_STUDENTS, teachNext, type DemoStudent } from "../fixtures/demoClass";
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

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <Button variant="secondary" onClick={() => { void copy(); }}>{copied ? "Copied" : label}</Button>;
}

function AlignmentBlock() {
  return (
    <section className="alignment-block">
      <div className="section-heading"><p className="eyebrow">Evidence connection to NYSED</p><h2>The mapping starts with what BOW observed.</h2><p>Each connection points back to a student calculation, saved financial state, decision, or explanation.</p></div>
      <div className="alignment-grid">
        {["1.2", "1.3", "5.1", "1.1", "4.1"].map((id) => {
          const item = objective(id);
          return <article key={id}><span>{id === "1.2" || id === "1.3" ? "Primary connection" : id === "4.1" ? "Partial connection" : "Supporting connection"}</span><h3>{id} · {item.shortLabel}</h3><p>{id === "4.1" ? "BOW observes advance planning for an unexpected event. It does not teach or assess insurance." : item.officialObjective}</p><a href={item.officialUrl} target="_blank" rel="noreferrer">Open the NYSED source ↗</a></article>;
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
        <div><p className="eyebrow">Educator brief · Grades 6–8</p><h1>Plan Under Pressure</h1><p className="lede">Use it after instruction to see whether students can budget, plan for uncertain income, and adapt when the numbers change.</p><div className="guide-meta"><span>Estimated 12–15 minutes</span><span>Basketball scenario</span><span>Independent application</span></div><div className="hero-actions"><Button onClick={() => window.location.assign("/challenge")}>Open the student challenge</Button><Link className="button button--secondary" to="/educator/class">View hypothetical class evidence</Link></div></div>
        <aside><span className="guide-hero__mark">BOW / 01</span><blockquote>Schools teach the skill. BOW reveals whether students can apply it.</blockquote><p>The challenge does not reteach the lesson. Students produce evidence by building and revising Avery’s actual financial state.</p></aside>
      </section>
      <section className="guide-section guide-section--dark"><div className="section-heading"><p className="eyebrow">When to use it</p><h2>After students have learned the six underlying skills.</h2><p>BOW can follow your curriculum or the optional companion below. It should not be the first time students encounter these ideas.</p></div><ol className="prerequisite-list"><li><span>01</span>Tell dependable income from income tied to a condition.</li><li><span>02</span>Combine recurring and one-time costs.</li><li><span>03</span>Build a budget that stays within available money.</li><li><span>04</span>Separate committed costs from amounts that can change.</li><li><span>05</span>Revise a plan after income or expenses change.</li><li><span>06</span>Explain a tradeoff with relevant numbers.</li></ol><p className="companion-callout">Use your own instruction or <Link to="/educator/teaching-companion">open the optional two-day mini-unit →</Link></p></section>
      <section className="guide-section"><div className="section-heading"><p className="eyebrow">What students do</p><h2>The situation changes, so the evidence does too.</h2></div><div className="process-line"><div><span>01</span><h3>Compare</h3><p>Calculate two full housing costs and choose one setup.</p></div><div><span>02</span><h3>Construct</h3><p>Build an eight-week plan and decide which conditional income to use.</p></div><div><span>03</span><h3>Prepare</h3><p>Build a lower-income version if the first plan relies on conditional money.</p></div><div><span>04</span><h3>Adapt</h3><p>Respond to the Week 5 income loss, new cost, and optional work decision.</p></div><div><span>05</span><h3>Explain</h3><p>Show why the final plan works and what the decision required.</p></div></div></section>
      <section className="guide-section evidence-system"><div className="section-heading"><p className="eyebrow">What you see afterward</p><h2>The grade has two visible parts.</h2></div><div className="evidence-system__grid"><div className="score-architecture"><div><strong>90</strong><span>structured evidence</span></div><i>+</i><div><strong>10</strong><span>teacher-reviewed reasoning</span></div><i>=</i><div><strong>100</strong><span>final grade</span></div></div><ul><li>Results across six assessed concepts</li><li>18 structured micro-skill observations</li><li>First attempts, later corrections, and support used</li><li>Saved plans before and after Week 5</li><li>Current status shown separately from learning trajectory</li><li>A short written explanation for human review</li></ul></div></section>
      <AlignmentBlock />
      <section className="guide-section launch-guide"><div className="section-heading"><p className="eyebrow">What to do with the results</p><h2>Move from the class pattern to the student evidence.</h2></div><ol><li>Confirm instruction covered the prerequisites.</li><li>Give students the challenge link and two short codes.</li><li>Let students work independently without coaching a strategy.</li><li>Open the largest concept gap and inspect the affected students.</li><li>Review written reasoning, then choose a reteach or debrief.</li></ol><div className="claim-boundary"><h3>What BOW does not claim</h3><p>BOW does not teach the complete financial-literacy curriculum, certify mastery of a NYSED objective, or reward one lifestyle strategy. It shows what a student did with this financial situation and how independently the student did it.</p></div></section>
    </EducatorShell>
  );
}

export function TeachingCompanion() {
  return (
    <EducatorShell>
      <header className="page-header"><p className="eyebrow">Optional teaching companion</p><h1>Two days of instruction before the independent challenge.</h1><p>Use this sequence or teach the same skills through another curriculum. The names, amounts, and situations stay separate from Avery’s challenge.</p></header>
      <div className="mini-unit-grid">
        <article><header><span>Day 01</span><h2>Build a plan from dependable money</h2><p>Example context: Jordan is saving for a robotics camp while earning money from neighborhood jobs.</p></header><ol><li><b>Dependable vs conditional income</b><p>Sort a guaranteed allowance from snow-shoveling money that depends on weather.</p></li><li><b>Recurring + one-time full cost</b><p>Calculate six weeks of bus fare plus a one-time registration fee.</p></li><li><b>Basic viable budget</b><p>Assign the remaining money across required costs, a goal, a reserve, and flexible cash.</p></li></ol><aside>Exit prompt: “Which dollars can Jordan count on before the weather is known?”</aside></article>
        <article><header><span>Day 02</span><h2>Revise when conditions change</h2><p>Example context: Sam is preparing for a school music showcase with a short paid equipment-helper role.</p></header><ol><li><b>Committed vs adjustable money</b><p>Mark the registration and transit already committed; keep future savings adjustable.</p></li><li><b>Contingency thinking</b><p>Construct a lower-income version without telling students which priority to reduce.</p></li><li><b>Unexpected change</b><p>Add a required repair cost, revise the plan, and explain one tradeoff with two numbers.</p></li></ol><aside>Debrief prompt: “How can two different revised plans both be financially coherent?”</aside></article>
      </div>
      <section className="teaching-boundary"><h2>The classroom sequence</h2><p>Live instruction → independent BOW challenge → dashboard evidence → debrief or reteach. During the challenge, allow calculators and access tools, but do not choose a financial strategy for the student.</p><Link className="button button--primary" to="/educator/guide">Return to the educator brief</Link></section>
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
      <header className="class-header"><div><p className="eyebrow">Period 3 · Eight Weeks to the Showcase</p><h1>Class evidence</h1></div><div><span>{summary.total} students</span><span>{summary.reviewed} reasoning reviews complete</span><span>{summary.pending} pending</span></div></header>
      <section className="teach-next"><p className="eyebrow">Teach next · C4 contingency</p><h2>{summary.openingIncomplete} students left money exposed in the opening plan.</h2><p><b>{summary.laterCorrected}</b> closed that gap after the Week 5 consequence. <b>{summary.persistentFallbackGap}</b> still need help building a complete lower-income version without moving committed costs.</p><div><Link className="button button--primary" to={`/educator/class/concepts/${insight?.conceptId}`}>See the C4 evidence</Link><CopyButton label="Copy the 4-minute reteach" text="Remove one uncertain $800 source from two sample plans. Ask which plan can adjust without moving committed money, then have students build the revised state." /></div><span className="standard-chip">Evidence connected to NYSED 1.2 · 4.1 partial</span></section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Six assessed concepts</p><h2>Where the class is now</h2><p>Open any row to see the evidence behind the distribution.</p></div><div className="matrix-legend" aria-label="Concept status colors">{statusOrder.map((status) => <span key={status}><i data-status={status} />{STATUS_LABELS[status]}</span>)}</div><Matrix records={DEMO_STUDENTS} /></section>
      <section className="trajectory-panel"><div><p className="eyebrow">How students got here</p><h2>Current status is only half the story.</h2><p>These counts answer different questions and can overlap.</p></div><div className="trajectory-strip"><span><b>{summary.independentFirst}</b> showed the skill at the first opportunity</span><span><b>{summary.laterCorrected}</b> fixed the gap after a consequence</span><span><b>{summary.completedWithSupport}</b> completed with direct support</span><span><b>{summary.persistentFallbackGap}</b> still need follow-up</span></div></section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Students to review</p><h2>Start with the evidence, then look at the grade.</h2></div><div className="student-worklist">{reviewStudents.map((student) => <Link key={student.seatCode} to={`/educator/class/students/${student.seatCode}`}><div><span>Seat {student.seatCode} · {student.finalPoints === null ? `${student.structuredPoints}/90 structured` : `${student.finalPoints}/100`}</span><h3>{student.evidenceLine}</h3><p>{student.primaryNeed}</p></div><span aria-hidden="true">→</span></Link>)}</div></section>
      <section className="class-foot"><div><span>Reasoning review</span><strong>{summary.reviewed} of {summary.total} complete</strong><p>Current median {summary.median} · Range {summary.range[0]}–{summary.range[1]}</p></div><div><span>Scenario</span><strong>{summary.basketball} Basketball</strong><p>All students completed the same financial scenario.</p></div><div><span>Data status</span><strong>{DEMO_LABEL}</strong><p>Every total is calculated from the 28 records shown.</p></div></section>
    </EducatorShell>
  );
}

const C4_LABELS = { "C4.1": "Constructed a fallback or first response", "C4.2": "Changed only adjustable, uncommitted money", "C4.3": "Recognized the exact remaining exposure", "C4.4": "Produced a workable lower-resource plan" } as const;

export function ConceptDrilldown() {
  const { conceptId = "contingency" } = useParams();
  const concept = CONCEPTS.find((item) => item.id === conceptId) ?? CONCEPTS[3]!;
  const affected = DEMO_STUDENTS.filter((student) => ["developing", "not_demonstrated"].includes(student.concepts.find((result) => result.conceptId === concept.id)?.status ?? ""));
  const skills = STRUCTURED_MICRO_SKILLS.filter((skill) => skill.conceptId === concept.id);
  const c4Micro = aggregateC4MicroSkills(DEMO_STUDENTS);
  const conceptAggregate = aggregateConcepts(DEMO_STUDENTS).find((row) => row.conceptId === concept.id)!;
  const standardIds = [...new Set(STANDARDS_ROWS.filter((row) => concept.microSkillIds.includes(row.microSkillId)).map((row) => row.objectiveId))];
  const reteach = {
    "income-reliability": { title: "Which $800 belongs in the plan?", body: "Give students two short plans with the same total income. One includes an $800 payment tied to a condition.", steps: ["Mark the money each person can count on.", "Remove the conditional $800.", "Revise only the plan that used it."] },
    "full-cost": { title: "Find the cost that hides after Week 1.", body: "Compare one recurring cost with one recurring cost plus a one-time fee.", steps: ["Calculate the full time period.", "Add the one-time fee once.", "Explain why the weekly price alone misleads."] },
    "viable-budget": { title: "Make the two sides match.", body: "Show a plan with $300 unassigned and another that is $300 over available money.", steps: ["Name the problem in each plan.", "Change one open amount.", "Stop when each balance reaches $0."] },
    contingency: { title: "Which $800 can move?", body: "Show two plans that both include an $800 conditional payment. In one, it supports an open goal. In the other, it is needed for a committed cost.", steps: ["Remove the $800.", "Ask which plan can still work.", "Revise without choosing the student’s priority."] },
    adaptation: { title: "Update the plan, not the history.", body: "Give students a balanced plan, then remove $400 of income and add a $250 required cost.", steps: ["Keep the original plan visible.", "Total the new change.", "Revise only the amounts still open."] },
    "financial-defense": { title: "Make the claim match the numbers.", body: "Give students one workable plan and three possible explanations.", steps: ["Find the claim about workability.", "Underline the numbers that support it.", "Name the priority and tradeoff."] },
  }[concept.id];
  const reteachText = `${reteach.title} ${reteach.body} ${reteach.steps.join(" ")}`;
  return (
    <EducatorShell demo>
      <header className="page-header page-header--with-back"><Link to="/educator/class">← Class evidence</Link><p className="eyebrow">{concept.code} · Evidence detail</p><h1>{concept.label}</h1><p>{concept.description}</p>{standardIds.length > 0 && <div className="tag-row">{standardIds.map((id) => <span key={id}>Evidence connected to NYSED {id}{id === "4.1" ? " · partial" : ""}</span>)}</div>}</header>
      <section className="drill-grid">
        <div className="drill-main"><div className="section-heading"><p className="eyebrow">What the class evidence shows</p><h2>{concept.id === "contingency" ? "The four contingency signals do not rise and fall together." : "Current status comes from the recorded concept evidence."}</h2></div>{concept.id === "contingency" ? <><table className="micro-table"><thead><tr><th>Observed signal</th><th>Independent</th><th>With support</th><th>Partial / not shown</th></tr></thead><tbody>{c4Micro.map(({ id, independent, support, partial }) => <tr key={id}><th><code>{id}</code>{C4_LABELS[id]}</th><td>{independent}</td><td>{support}</td><td>{partial}</td></tr>)}</tbody></table><p className="context-note">Each student’s C4 record names the observation point: <b>opening income fallback</b> or <b>Week 5 cost response</b>.</p></> : <div className="concept-status-summary">{statusOrder.map((status) => <div key={status}><span>{STATUS_LABELS[status]}</span><strong>{conceptAggregate.counts[status]}</strong><small>of {DEMO_STUDENTS.length}</small></div>)}</div>}
          <div className="misconception-list"><h2>{concept.id === "contingency" ? "What the common patterns mean" : "What BOW observed for this concept"}</h2>{concept.id === "contingency" ? [
            ["Plan changed, risk remained", "The student changed open amounts but left part of the financial risk uncovered."],
            ["Committed money was reused", "The student tried to move money that Avery had already agreed to spend."],
            ["Lower-income version still depended on the missing money", "The revised state still required income that might not arrive."],
          ].map(([label, wording]) => <article key={label}><div><strong>{label}</strong></div><p>{wording}</p></article>) : skills.map((skill) => <article key={skill.id}><div><code>{skill.id}</code><strong>{skill.label}</strong></div><p>{skill.evidenceRule}</p></article>)}</div>
        </div>
        <aside className="reteach-card"><p className="eyebrow">4-minute next move</p><h2>{reteach.title}</h2><p>{reteach.body}</p><ol>{reteach.steps.map((step) => <li key={step}>{step}</li>)}</ol><CopyButton label="Copy the reteach" text={reteachText} /></aside>
      </section>
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Students to follow up with</p><h2>{affected.length} students are developing or have not yet shown this concept.</h2></div><div className="student-worklist">{affected.map((student) => <Link key={student.seatCode} to={`/educator/class/students/${student.seatCode}`}><div><span>Seat {student.seatCode}</span><h3>{student.evidenceLine}</h3><p>{student.primaryNeed}</p></div><span aria-hidden="true">→</span></Link>)}</div></section>
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
      <header className="student-evidence-header"><div><Link to="/educator/class">← Class evidence</Link><p className="eyebrow">Seat {student.seatCode} · Basketball</p><h1>{final === null ? "Grade pending" : `${final}/100`}</h1><p>{student.evidenceLine}</p></div><div><span>Structured evidence</span><strong>{student.structuredPoints}/90</strong><span>Teacher-reviewed reasoning</span><strong>{reasoning === null ? "Pending" : `${reasoning}/10`}</strong><Link className="button button--secondary" to={`/educator/class/students/${student.seatCode}/reasoning`}>{reasoning === null ? "Review reasoning" : "Open reasoning review"}</Link></div></header>
      {student.seatCode === "14" && <section className="golden-case"><p className="eyebrow">Why the current status and earlier score differ</p><h2>C4: 17/20 · Demonstrated independently</h2><p>Seat 14 first left $900 exposed. Later, the student built a balanced no-$800 version without a scaffold. The later evidence updates the current status; the earlier attempt remains part of the score and timeline.</p></section>}
      <section className="dashboard-section"><div className="section-heading"><p className="eyebrow">Six concept results</p><h2>The score, current status, and trajectory stay separate.</h2></div><StudentLedger student={student} /></section>
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
      <header className="page-header page-header--with-back"><Link to={`/educator/class/students/${student.seatCode}`}>← Seat {student.seatCode} evidence</Link><p className="eyebrow">Teacher review · C6</p><h1>Does the explanation match the plan?</h1><p>This review changes only C6 and the final grade. The 90 points of structured evidence remain unchanged.</p></header>
      <div className="reasoning-layout"><section className="student-response"><p className="eyebrow">Student response</p><blockquote>{student.seatCode === "14" ? "I kept $800 for the sports-media course after the update. The clinic added $500, but I gave up Avery's only rest block and reduced the reserve to $400. The revised plan balances at $6,300, and if the $800 completion payment does not arrive, my preview still balances." : "My plan works because I changed future money after the new cost. I used the numbers in my final plan to make sure it balanced."}</blockquote><div className="selected-evidence"><span>Final funds <b>$6,300</b></span><span>Course goal <b>$800</b></span><span>Reserve <b>$400</b></span></div></section><section className="rubric-panel"><p className="eyebrow">10-point reasoning rubric</p>{([
        ["workability", "Workability", 2], ["priority", "Protected priority", 2], ["tradeoff", "Tradeoff / opportunity cost", 2], ["numbers", "Numerical evidence", 4],
      ] as const).map(([key, label, max]) => <div className="rubric-row" key={key}><div><b>{label}</b><span>{key === "numbers" ? "Two accurate, relevant numbers" : "Clear connection to the student's plan"}</span></div><div>{Array.from({ length: max + 1 }, (_, value) => <button type="button" key={value} aria-pressed={scores[key] === value} onClick={() => setScores((current) => ({ ...current, [key]: value }))}>{value}</button>)}</div></div>)}<footer><span>Reasoning total</span><strong>{total}/10</strong><Button onClick={save}>Save review</Button></footer></section></div>
    </EducatorShell>
  );
}

export function StandardsView() {
  return (
    <EducatorShell demo>
      <header className="page-header"><p className="eyebrow">NYSED evidence view</p><h1>How challenge evidence connects to NYSED objectives.</h1><p>This page regroups the same BOW observations; it does not create a standards score or claim that a student mastered a NYSED objective.</p></header>
      <div className="standards-list">{NYSED_OBJECTIVES.map((item) => { const rows = STANDARDS_ROWS.filter((row) => row.objectiveId === item.objectiveId); const strength = item.objectiveId === "4.1" ? "Partial connection" : rows.some((row) => row.strength === "primary") ? "Primary connection" : "Supporting connection"; return <article key={item.objectiveId}><header><span>{strength}</span><b>{item.objectiveId}</b></header><h2>{item.shortLabel}</h2><blockquote>{item.officialObjective}</blockquote><p>{rows.length} BOW micro-skill connection{rows.length === 1 ? "" : "s"}</p><div>{[...new Set(rows.map((row) => row.microSkillId))].map((id) => <code key={id}>{id}</code>)}</div>{item.objectiveId === "4.1" && <p>BOW observes advance planning for an unexpected event. Insurance is not taught or assessed.</p>}<a href={item.officialUrl} target="_blank" rel="noreferrer">Open the NYSED source ↗</a></article>; })}</div><p className="disclaimer">{ALIGNMENT_DISCLAIMER}</p>
    </EducatorShell>
  );
}
