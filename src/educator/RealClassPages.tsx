import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { useClassEvidence, type ClassEvidenceState, type OverrideRequest } from "./useClassEvidence";
import { EvidenceTrailPanel, StudentSummary } from "./EvidenceTrailPanel";
import type { AttributedSubmission } from "../platform/classes/types";
import { seatList, type ChoiceDistribution, type ClassAnalysis, type StudentRow } from "./analysis";
import { formatDollars } from "../domain/core/money";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { STRUCTURED_MICRO_SKILLS } from "../domain/blueprint/microSkills";
import { CONCEPTS } from "../domain/blueprint/concepts";
import { STATUS_LABELS, STATUS_ORDER, TRAJECTORY_LABELS } from "./labels";
import { REASONING_MAXIMUM } from "../domain/evidence/grade";
import { REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";

/**
 * The educator's view of a real class.
 *
 * Everything below is a function of the evidence students submitted. There is no fixture
 * import in this file, no demo constant, and no placeholder row — a class with nothing in
 * it says so, and a class with four students in it reports four. That invariant is the one
 * thing the whole educator surface rests on: a teacher who cannot tell whether a
 * distribution is real cannot use any of it.
 *
 * It also leads with what the class did rather than with what they scored. The per-student
 * score is still available on their own page; it is not what a room of thirty is for.
 */

function ClassFrame({ state, children, title }: { state: ClassEvidenceState; title?: string; children: (analysis: ClassAnalysis, label: string) => React.ReactNode }) {
  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">Class evidence</p>
          <h1>{title ?? "This class did not open."}</h1>
          <p>{state.message}</p>
        </header>
        <Link className="button button--secondary" to="/educator/classes/new">Create a class</Link>
      </EducatorShell>
    );
  }
  return <EducatorShell>{children(state.analysis, state.record.label)}</EducatorShell>;
}

/**
 * A class nobody has finished yet. Stated as the fact it is, with the one thing a teacher
 * in that position actually needs — the code to read out again.
 */
function NothingYet({ code, label }: { code: string; label: string }) {
  return (
    <>
      <header className="class-header">
        <div><p className="eyebrow">{label}</p><h1>Nothing turned in yet.</h1></div>
        <div><span>Class {code}</span><span>0 submissions</span></div>
      </header>
      <section className="empty-state">
        <p>
          This class is open and no student has finished. Nothing on this page is a placeholder —
          when students turn work in, their evidence appears here and every number below is
          calculated from it.
        </p>
        <dl>
          <div><dt>Class code</dt><dd>{code}</dd></div>
          <div><dt>Challenge</dt><dd>{BASKETBALL_SCENARIO.title}</dd></div>
        </dl>
        <Button variant="secondary" onClick={() => window.location.reload()}>Check again</Button>
      </section>
    </>
  );
}

function Distribution({ distribution, total }: { distribution: ChoiceDistribution; total: number }) {
  const used = distribution.shares.filter((share) => share.seats.length > 0);
  return (
    <article className="choice-dist">
      <h3>{distribution.question}</h3>
      <div className="choice-dist__bar" aria-hidden="true">
        {used.map((share) => (
          <span key={share.id} data-option={share.id} style={{ width: `${(share.seats.length / total) * 100}%` }} />
        ))}
      </div>
      <ul>
        {distribution.shares.map((share) => (
          <li key={share.id} data-empty={share.seats.length === 0}>
            <b>{share.seats.length}</b>
            <span>{share.label}</span>
            {/* Every count links back to the students inside it, so nothing here is a
                number a teacher has to take on faith. */}
            <span className="choice-dist__seats">{share.seats.length > 0 ? seatList(share.seats) : "Nobody"}</span>
          </li>
        ))}
      </ul>
      <p className="choice-dist__note">{distribution.note}</p>
    </article>
  );
}

export function RealClassOverview() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { state } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  return (
    <ClassFrame state={state}>
      {(analysis, label) => {
        if (analysis.rows.length === 0) return <NothingYet code={code ?? ""} label={label} />;
        const total = analysis.rows.length;
        return (
          <>
            <header className="class-header">
              <div><p className="eyebrow">{label} · {BASKETBALL_SCENARIO.title}</p><h1>What the class did</h1></div>
              <div>
                <span>{total} {total === 1 ? "submission" : "submissions"}</span>
                <span>{analysis.awaitingReview.length} awaiting your reading</span>
              </div>
            </header>

            <section className="dashboard-section">
              <div className="section-heading">
                <p className="eyebrow">The decisions</p>
                <h2>Where they agreed, and where they did not</h2>
              </div>
              <div className="choice-grid">
                {analysis.distributions.map((distribution) => (
                  <Distribution key={distribution.id} distribution={distribution} total={total} />
                ))}
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <p className="eyebrow">After Week 5</p>
                <h2>What they gave up first</h2>
              </div>
              {analysis.adaptation.cutFirst.length === 0 ? (
                <p className="class-state">No student reduced any part of their plan after Week 5.</p>
              ) : (
                <ul className="cut-list">
                  {analysis.adaptation.cutFirst.map((entry) => (
                    <li key={entry.category}>
                      <b>{entry.seats.length}</b>
                      <span>cut <strong>{entry.label.toLowerCase()}</strong> first</span>
                      <span className="choice-dist__seats">{seatList(entry.seats)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="adaptation-lines">
                <div><dt>Backup money absorbed a loss</dt><dd>{analysis.adaptation.buffered.length} of {total}</dd></div>
                <div><dt>Finished with something uncovered</dt><dd>{analysis.adaptation.leftUncovered.length} of {total}</dd></div>
                <div><dt>Landed a plan they never changed</dt><dd>{analysis.adaptation.unchanged.length} of {total}</dd></div>
              </dl>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <p className="eyebrow">Concepts</p>
                <h2>What the evidence shows they can apply</h2>
              </div>
              <table className="concept-matrix">
                <caption>Concept status across {total} submitted {total === 1 ? "attempt" : "attempts"}</caption>
                <thead><tr><th scope="col">Concept</th><th scope="col">Status</th><th scope="col">Follow up with</th></tr></thead>
                <tbody>
                  {analysis.concepts.map((concept) => (
                    <tr key={concept.conceptId} className={concept.conceptId === analysis.reviewFirst?.conceptId ? "is-emphasized" : ""}>
                      <th scope="row"><span>{concept.code}</span>{concept.label}</th>
                      <td>
                        <div className="matrix-bar" aria-label={STATUS_ORDER.map((status) => `${concept.counts[status]} ${STATUS_LABELS[status]}`).join(", ")}>
                          {STATUS_ORDER.map((status) => concept.counts[status] > 0 && (
                            <span key={status} data-status={status} style={{ width: `${(concept.counts[status] / total) * 100}%` }} title={`${STATUS_LABELS[status]}: ${concept.counts[status]} of ${total}`} />
                          ))}
                        </div>
                        <div className="matrix-counts">
                          {STATUS_ORDER.filter((status) => concept.counts[status] > 0).map((status) => (
                            <span key={status}><i data-status={status} />{concept.counts[status]} {STATUS_LABELS[status].toLowerCase()}</span>
                          ))}
                        </div>
                      </td>
                      <td>{concept.needsFollowUp.length > 0 ? seatList(concept.needsFollowUp) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <p className="eyebrow">Open these</p>
                <h2>Every student who turned in</h2>
              </div>
              <div className="row-list">
                {analysis.rows.map((row) => (
                  <Link key={row.sessionId} to={`/educator/class/${code}/students/${row.seatCode}${keyQuery}`}>
                    <div>
                      <small>Seat {row.seatCode} · {row.result.grade.finalPoints === null ? `${row.result.grade.structuredPoints}/${row.result.grade.structuredMaximum} structured` : `${row.result.grade.finalPoints}/100`}</small>
                      <h3>{summarise(row)}</h3>
                      <small>{row.reasoningPoints === null ? "Written explanation not read yet" : `Reasoning scored ${row.reasoningPoints}/${REASONING_MAXIMUM}`}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="class-foot">
              <div>
                <span>Next</span>
                <strong>Run the debrief</strong>
                <p>Two real plans, what changed after Week 5, and prompts drawn from this class.</p>
                <Link className="button button--primary" to={`/educator/class/${code}/debrief${keyQuery}`}>Open the debrief</Link>
              </div>
            </section>
          </>
        );
      }}
    </ClassFrame>
  );
}

/** One line describing what this student actually did, never how well they did it. */
function summarise(row: StudentRow): string {
  const place = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === row.setupId)?.title ?? "No place chosen";
  const bits = [
    place,
    row.reservedSeat ? "reserved the seat" : "waited on the course",
    row.tookClinics ? "took the clinics" : "kept the Saturdays",
  ];
  if (row.resolution) bits.push(row.resolution.attendanceHeld ? "made every session" : "lost the bonus");
  return bits.join(" · ");
}

export function RealStudentEvidence() {
  const { code, seatCode } = useParams();
  const [params] = useSearchParams();
  const { state, scoreReasoning, recordOverride } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  return (
    <ClassFrame state={state} title="That student's work did not open.">
      {(analysis) => {
        const row = analysis.rows.find((item) => item.seatCode === seatCode);
        if (!row) {
          return (
            <>
              <header className="page-header page-header--with-back">
                <Link to={`/educator/class/${code}${keyQuery}`}>← Class evidence</Link>
                <p className="eyebrow">Seat {seatCode}</p>
                <h1>Nothing from this seat.</h1>
                <p>No student has turned work in from seat {seatCode} in this class.</p>
              </header>
            </>
          );
        }
        // The raw submission, not the derived row: the trail is built from the student's own
        // events, and a summary of them cannot be audited against itself.
        const submission = state.status === "ready"
          ? state.submissions.find((entry) => entry.seatCode === seatCode && entry.sessionId === row.sessionId)
          : undefined;
        return (
          <StudentPanel
            row={row}
            code={code ?? ""}
            keyQuery={keyQuery}
            onScore={scoreReasoning}
            {...(submission ? { submission } : {})}
            onOverride={(override) => recordOverride(row.seatCode, row.sessionId, override)}
          />
        );
      }}
    </ClassFrame>
  );
}

/** §19.1's chain, cut into the four things a teacher opens a student to do. */
const TABS = [
  { id: "trail", label: "Evidence trail" },
  { id: "plan", label: "The plan" },
  { id: "explanation", label: "The explanation" },
  { id: "next", label: "What next" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function StudentPanel({ row, code, keyQuery, onScore, submission, onOverride }: {
  row: StudentRow;
  code: string;
  keyQuery: string;
  onScore: (seat: string, session: string, scores: ReasoningScores | null) => Promise<boolean>;
  submission?: AttributedSubmission;
  onOverride: (override: OverrideRequest) => Promise<boolean>;
}) {
  // Opens on the trail, because the reason to open one student is to check a conclusion —
  // and because §19.1 says the chain is read in order, not picked from.
  const [tab, setTab] = useState<TabId>("trail");
  // Opens on whatever a person already recorded, so re-opening a scored student shows
  // their reading rather than a blank rubric that would overwrite it on the next save.
  const [scores, setScores] = useState<ReasoningScores>(() => row.reasoningCriteria ?? {});
  const [saved, setSaved] = useState<string | null>(null);
  const total = reasoningTotal(scores);
  // Every criterion has to have been answered before this is a reading rather than a blank.
  const complete = REASONING_CRITERIA.every((criterion) => scores[criterion.id] !== undefined);
  const grade = row.result.grade;

  return (
    <>
      {/* The headline used to be "Reasoning not read yet" — the largest thing on the page
          was the absence of something, on the page a teacher opens to read one student.
          The seat is who this is about; whether their writing has been read is a fact
          about the page, and it sits with the numbers where the other facts are. */}
      <header className="student-evidence-header">
        <div>
          <Link to={`/educator/class/${code}${keyQuery}`}>← Class evidence</Link>
          <p className="eyebrow">Turned in {new Date(row.submittedAt).toLocaleString()}</p>
          <h1>Seat {row.seatCode}</h1>
          <p>{summarise(row)}</p>
        </div>
        <div>
          <span>Structured</span><strong>{grade.structuredPoints}/{grade.structuredMaximum}</strong>
          <span>Reasoning</span><strong>{row.reasoningPoints === null ? "Not read" : `${row.reasoningPoints}/${REASONING_MAXIMUM}`}</strong>
          <span>Together</span><strong>{grade.finalPoints === null ? "—" : `${grade.finalPoints}/100`}</strong>
        </div>
      </header>

      {/* §19.1 says the chain is read in an order. The four tabs are that order cut into the
          four things a teacher opens a student to do, and every one of them is one click from
          every other — a teacher checking a conclusion should never have to scroll past the
          rubric to reach the evidence, or the other way round. */}
      <div className="student-tabs" role="tablist" aria-label="This student's work">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`student-tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`student-panel-${entry.id}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="student-panel-trail" aria-labelledby="student-tab-trail" hidden={tab !== "trail"}>
        {submission
          ? <EvidenceTrailPanel submission={submission} onOverride={onOverride} />
          : <p className="class-state">This attempt could not be opened in full, so there is no trail to show.</p>}
      </div>

      <div role="tabpanel" id="student-panel-next" aria-labelledby="student-tab-next" hidden={tab !== "next"}>
        {submission
          ? <StudentSummary submission={submission} />
          : <p className="class-state">This attempt could not be opened in full.</p>}
      </div>

      <div role="tabpanel" id="student-panel-explanation" aria-labelledby="student-tab-explanation" hidden={tab !== "explanation"}>
      <section className="reasoning-layout">
        <div className="student-response">
          <p className="eyebrow">What they wrote</p>
          {row.defense && row.defense.text.trim() ? (
            <blockquote>{row.defense.text}</blockquote>
          ) : (
            <p className="class-state">This student turned in no written explanation.</p>
          )}
          <p className="response-note">
            Nothing about this writing is machine-scored, and it is never sent to a model. You read it
            and you score it — which is what the student was told would happen.
          </p>
        </div>
        <div className="rubric-panel">
          <p className="eyebrow">{REASONING_MAXIMUM}-point reasoning rubric</p>
          {REASONING_CRITERIA.map((criterion) => (
            <div className="rubric-row" key={criterion.id}>
              <div><b>{criterion.label}</b><span>{criterion.hint}</span></div>
              <div className="segmented">
                {Array.from({ length: criterion.max + 1 }, (_, value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${criterion.label}: ${value} of ${criterion.max}`}
                    aria-pressed={scores[criterion.id] === value}
                    onClick={() => setScores((current) => ({ ...current, [criterion.id]: value }))}
                  >{value}</button>
                ))}
              </div>
            </div>
          ))}
          <footer>
            <span>Reasoning total</span>
            {/* An unread paragraph and a paragraph a person read and scored zero are
                different facts, and the panel used to show both as "0/10" with nothing
                selected — one stray click away from saving a zero nobody meant. */}
            <strong>{complete ? `${total}/${REASONING_MAXIMUM}` : `—/${REASONING_MAXIMUM}`}</strong>
            <Button
              aria-disabled={!complete}
              onClick={() => complete && void onScore(row.seatCode, row.sessionId, scores).then((ok) => setSaved(ok ? "Saved." : "Could not save that."))}
            >
              Save review
            </Button>
            <span aria-live="polite">{saved || (complete ? "" : "Score all four to save.")}</span>
          </footer>
        </div>
      </section>
      </div>

      <div role="tabpanel" id="student-panel-plan" aria-labelledby="student-tab-plan" hidden={tab !== "plan"}>
      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Grade ledger</p>
          <h2>Every point has a source</h2>
        </div>
        <table className="grade-ledger">
          <thead><tr><th scope="col">What it shows</th><th scope="col">How it went</th><th scope="col">Points</th></tr></thead>
          <tbody>
            {row.result.concepts.map((result) => (
              <tr key={result.conceptId}>
                <th scope="row">{CONCEPTS.find((concept) => concept.id === result.conceptId)?.label ?? result.conceptId}</th>
                <td>
                  <span className="status-badge" data-status={result.status}>{STATUS_LABELS[result.status]}</span>
                  <span className="grade-ledger__how">{TRAJECTORY_LABELS[result.trajectory]}</span>
                </td>
                <td className="money">{result.points === null ? "—" : `${result.points}/${result.maxPoints}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {row.resolution && (
        <section className="dashboard-section">
          <div className="section-heading">
            <p className="eyebrow">How the season ended</p>
            <h2>The consequences of this plan</h2>
          </div>
          <dl className="adaptation-lines">
            <div><dt>Attendance bonus</dt><dd>{row.resolution.attendanceHeld ? "Held" : `Lost in Week ${row.resolution.bonusLostWeek}`}</dd></div>
            <div><dt>Left uncovered</dt><dd>{formatDollars(row.resolution.uncovered)}</dd></div>
            <div><dt>Course</dt><dd>{row.resolution.courseFunded ? "Funded" : `${formatDollars(row.resolution.courseShort)} short`}</dd></div>
            <div><dt>Ends holding</dt><dd>{formatDollars(row.resolution.endCash)}</dd></div>
          </dl>
        </section>
      )}

      {row.opening && row.final && (
        <section className="dashboard-section">
          <div className="section-heading">
            <p className="eyebrow">Before and after Week 5</p>
            <h2>What this student moved</h2>
          </div>
          <table className="resolve-changes-table">
            <thead><tr><th scope="col">Where the money went</th><th scope="col">Opening</th><th scope="col">Final</th></tr></thead>
            <tbody>
              {CHOICE_ORDER.map((category) => (
                <tr key={category}>
                  <th scope="row">{CHOICE_LABELS[category]}</th>
                  <td className="money">{formatDollars(row.opening![category])}</td>
                  <td className="money">{formatDollars(row.final![category])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Micro-skill detail</p>
          <h2>Where the structured points came from</h2>
        </div>
        {/* Eighteen rows reading 5/5 is a loop, not a table. What a teacher needs first is
            the exceptions; the rest is one sentence, and the whole trail is still one
            disclosure away because every point in this product has to be traceable. */}
        <MicroSkillTrail observations={row.result.observations} />
      </section>
      </div>
    </>
  );
}

/**
 * The eighteen micro-skills, led by the ones that did not come out full.
 *
 * The obligation this page carries is that every structured point can be traced to the
 * moment it came from — not that all eighteen are on screen at once. So the exceptions are
 * open, the rest is summarised in a line, and the complete trail is one disclosure away.
 */
function MicroSkillTrail({ observations }: { observations: StudentRow["result"]["observations"] }) {
  const label = (id: string) => STRUCTURED_MICRO_SKILLS.find((skill) => skill.id === id)?.label ?? id;
  const exceptions = observations.filter((observation) => observation.points !== 5);
  const table = (rows: typeof observations) => (
    <table className="micro-table">
      <thead><tr><th scope="col">Micro-skill</th><th scope="col">Outcome</th><th scope="col">Why</th></tr></thead>
      <tbody>
        {rows.map((observation) => (
          <tr key={observation.microSkillId}>
            <th scope="row"><code>{observation.microSkillId}</code>{label(observation.microSkillId)}</th>
            <td>{observation.points === null ? "Not observed" : `${observation.points}/5`}</td>
            <td>{observation.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      {exceptions.length === 0 ? (
        <p className="class-state">
          All {observations.length} micro-skills came out full marks at the first real opportunity.
        </p>
      ) : (
        <>
          <p className="class-state">
            {exceptions.length} of {observations.length} came out below full marks. The rest were full at the first
            real opportunity.
          </p>
          {table(exceptions)}
        </>
      )}
      <details className="micro-trail">
        <summary>Show all {observations.length}</summary>
        {table(observations)}
      </details>
    </>
  );
}
