import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { useClassEvidence, type ClassEvidenceState, type OverrideRequest } from "./useClassEvidence";
import { EvidenceTrailPanel, StudentSummary } from "./EvidenceTrailPanel";
import type { AttributedSubmission } from "../platform/classes/types";
import { decisionsByWorld, seatList, type ChoiceDistribution, type ClassAnalysis, type StudentRow } from "./analysis";
import { formatDollars } from "../domain/core/money";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import { POP_UP_SCENARIO } from "../domain/scenario/worlds/food-truck";
import { derivePopUpFacts } from "../domain/scenario/worlds/food-truck/facts";
import { STRUCTURED_MICRO_SKILLS } from "../domain/blueprint/microSkills";
import { CONCEPTS } from "../domain/blueprint/concepts";
import { COMPETENCY_STATE_HEADLINES, COMPETENCY_STATE_LABELS, STATUS_LABELS, TRAJECTORY_LABELS } from "./labels";
import { REASONING_MAXIMUM } from "../domain/evidence/grade";
import { REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import { MINIMUM_ASSESSED_FOR_A_STATE, MINIMUM_RESULTS_FOR_CLASS_NARRATION } from "../domain/competency/objectiveState";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { classSpineFrom, type ClassSpine } from "./classSpine";
import { studentSpineFor, type StudentSpine } from "./studentSpine";
import { TeachNext } from "./TeachNext";

/**
 * The educator's view of a real class.
 *
 * Everything below is a function of the evidence students submitted. There is no fixture
 * import in this file, no demo constant, and no placeholder row — a class with nothing in
 * it says so, and a class with four students in it reports four. That invariant is the one
 * thing the whole educator surface rests on: a teacher who cannot tell whether a
 * distribution is real cannot use any of it.
 *
 * Two rules shape what leads. **One spine on screen:** every heading, every row and every
 * count here is the competency reading — what the evidence requirements show. The points
 * total still exists, is still computed the same way, and appears once per student at the
 * bottom of their own page, labelled as the gradebook line it is. **Nothing about the class
 * below the minimum denominator:** a handful of runs is evidence about those students and
 * about nobody else, so under it this page shows counts and individual work and stops.
 */

type ReadyClass = Extract<ClassEvidenceState, { status: "ready" }>;

function ClassFrame({ state, children, title }: {
  state: ClassEvidenceState;
  title?: string;
  children: (ready: ReadyClass) => React.ReactNode;
}) {
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
        <Link className="button button--secondary" to="/educator/classes">My classes</Link>
      </EducatorShell>
    );
  }
  return <EducatorShell>{children(state)}</EducatorShell>;
}

/**
 * A class nobody has finished yet.
 *
 * In a classroom this screen has one job, and it is to put the code where thirty students
 * can read it from their seats. So the code is the page, at the size a projector needs, with
 * the address they type beside it.
 */
function NothingYet({ code, label }: { code: string; label: string }) {
  return (
    <>
      <header className="class-header">
        <div>
          <p className="eyebrow">{label}</p>
          <h1>Nothing turned in yet.</h1>
        </div>
        <div><span>0 turned in</span></div>
      </header>
      <section className="class-created">
        <div className="class-created__code class-created__code--projector">
          <p className="field-label">Class code</p>
          <strong>{code}</strong>
          <p>Not case sensitive.</p>
        </div>
        <div className="class-created__body">
          <h2>Students go here</h2>
          <p className="join-address"><code>{window.location.origin}{PLAN_UNDER_PRESSURE.route}</code></p>
          <p>Each student types the code and picks a seat number. No accounts, no email addresses, no names.</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>Check again</Button>
        </div>
      </section>
    </>
  );
}

/**
 * What this class actually played, named from the evidence rather than assumed.
 *
 * Every class used to be titled "Eight Weeks to the Showcase" whether or not a single
 * student had opened it. With two worlds in the product that is a false label on the first
 * line of the page, and a class where students chose differently has two worlds to name.
 */
function worldsPlayed(rows: readonly StudentRow[]): string | null {
  const titles = [...new Set(rows.map((row) => row.worldId))]
    .map((worldId) => WORLD_REGISTRY[worldId]?.title)
    .filter((title): title is string => title !== undefined);
  return titles.length > 0 ? titles.join(" · ") : null;
}

/** One decision, and who made each call. Counts, and the seats behind every count. */
function Distribution({ distribution }: { distribution: ChoiceDistribution }) {
  return (
    <article className="choice-dist">
      <h3>{distribution.question}</h3>
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
    </article>
  );
}

/**
 * The class headline, and the rule that governs it.
 *
 * A share is only ever shown at a denominator that can carry one. Below it the same two
 * numbers are still true and are printed as a count, which is what §15.3's first guard asks
 * for and what stops "60%" being read as a fact about a room of twenty-eight.
 */
function ClassLead({ spine }: { spine: ClassSpine }) {
  const reading = spine.reading;
  if (!reading || spine.assessed === 0) {
    return (
      <>
        <h1>Nobody is assessed yet.</h1>
        <p>
          {spine.awaitingReading > 0
            ? `${spine.submitted} turned in. ${spine.awaitingReading} written ${spine.awaitingReading === 1 ? "explanation is" : "explanations are"} still to read, and a student whose writing nobody has read is not assessed.`
            : `${spine.submitted} turned in, and none of it has produced a usable result yet.`}
        </p>
      </>
    );
  }
  // The share is refused at a denominator that cannot carry one, and the same two numbers
  // are printed as the count they are.
  if (reading.result.percentDemonstrated === null) {
    return (
      <>
        <h1>{reading.result.demonstrated} of {spine.assessed} assessed showed the skill.</h1>
        <p>
          {spine.submitted} turned in. Under {MINIMUM_ASSESSED_FOR_A_STATE} assessed students BOW shows the
          count rather than a share, because a share of {spine.assessed} reads as a fact about the whole class.
        </p>
      </>
    );
  }
  return (
    <>
      <h1>{reading.result.percentDemonstrated}% demonstrated.</h1>
      <p>{reading.result.demonstrated} of {spine.assessed} assessed · {spine.submitted} turned in</p>
    </>
  );
}

export function RealClassOverview() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { state } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";
  const teacherKey = params.get("key") ?? "";

  return (
    <ClassFrame state={state}>
      {(ready) => {
        const { analysis, record, assignments, submissions } = ready;
        if (analysis.rows.length === 0) return <NothingYet code={record.code} label={record.label} />;
        const spine = classSpineFrom({ record, assignments, submissions });
        const total = analysis.rows.length;
        const students = (
          <section className="dashboard-section">
            <div className="section-heading">
              <p className="eyebrow">Open these</p>
              <h2>Every student who turned in</h2>
            </div>
            <StudentRows rows={analysis.rows} submissions={submissions} code={record.code} keyQuery={keyQuery} />
          </section>
        );

        return (
          <>
            <header className="class-header">
              <div>
                <p className="eyebrow">{[record.label, worldsPlayed(analysis.rows)].filter(Boolean).join(" · ")}</p>
                <ClassLead spine={spine} />
              </div>
              <div>
                <span>{total} turned in</span>
                {/* The largest single job this product creates, and it used to be a
                    sentence. It is the way into the queue that does it. */}
                {analysis.awaitingReview.length > 0
                  ? <Link to={`/educator/class/${record.code}/reading${keyQuery}`}>{analysis.awaitingReview.length} awaiting your reading</Link>
                  : <span>Every explanation read</span>}
              </div>
            </header>

            {!spine.narratable && (
              <p className="class-guard">
                {total} turned in — individual work below. BOW does not describe a class from
                fewer than {MINIMUM_RESULTS_FOR_CLASS_NARRATION} runs.
              </p>
            )}

            {/* §18.1, at the top of the surface a teacher actually lands on. The objective
                page renders the same reading from the same module; neither owns it. */}
            {spine.reading && spine.narratable && (
              <section className="dashboard-section">
                <TeachNext
                  reading={spine.reading.teachNext}
                  spotlight={spine.reading.spotlight}
                  classCode={record.code}
                  teacherKey={teacherKey}
                />
              </section>
            )}

            {!spine.narratable && students}

            {spine.narratable && spine.reading && spine.reading.competencies.length > 0 && (
              <section className="dashboard-section">
                <div className="section-heading">
                  <p className="eyebrow">What the evidence shows</p>
                  <h2>Where the class is on each skill</h2>
                </div>
                <table className="micro-table">
                  <caption>Counts across {spine.assessed} of {total} with a usable result</caption>
                  <thead><tr><th scope="col">Skill</th><th scope="col">Where the class is</th></tr></thead>
                  <tbody>
                    {spine.reading.competencies.map((row) => (
                      <tr key={row.competencyId}>
                        <th scope="row">{competencyStatement(row.competencyId, submissions)}</th>
                        <td>
                          {Object.entries(row.counts)
                            .filter(([, count]) => count > 0)
                            .map(([entry, count]) => `${count} ${COMPETENCY_STATE_LABELS[entry as keyof typeof COMPETENCY_STATE_LABELS]}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Below the guard, nothing here describes the class. These two sections are
                distributions, so they wait until there is a class to distribute. */}
            {spine.narratable && (
              <>
                {/* One section per world, because the questions are the world's. A class
                    where students chose differently was asked two different sets of
                    questions, and each set has its own denominator. */}
                {decisionsByWorld(analysis.rows).map((group) => (
                  <section className="dashboard-section" key={group.worldId}>
                    <div className="section-heading">
                      <p className="eyebrow">
                        {WORLD_REGISTRY[group.worldId]?.title ?? group.worldId} · {group.seats} {group.seats === 1 ? "student" : "students"}
                      </p>
                      <h2>What they decided</h2>
                    </div>
                    <div className="choice-grid">
                      {group.distributions.map((distribution) => (
                        <Distribution key={distribution.id} distribution={distribution} />
                      ))}
                    </div>
                  </section>
                ))}

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
                          <span>of {total} cut <strong>{entry.label.toLowerCase()}</strong> first</span>
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
              </>
            )}

            {spine.narratable && students}

            <section className="class-foot">
              <div>
                <span>Next</span>
                <strong>Run the debrief</strong>
                <p>Two real plans, what changed after Week 5, and what to review — from this class's evidence.</p>
                <Link className="button button--primary" to={`/educator/class/${record.code}/debrief${keyQuery}`}>Open the debrief</Link>
              </div>
            </section>
          </>
        );
      }}
    </ClassFrame>
  );
}

/** The skill's own sentence, read from the first student who has a result for it. */
function competencyStatement(competencyId: string, submissions: readonly AttributedSubmission[]): string {
  for (const submission of submissions) {
    const line = studentSpineFor(submission).competencies.find((entry) => entry.competencyId === competencyId);
    if (line) return line.statement;
  }
  return competencyId;
}

/**
 * The class list, led by what each student showed.
 *
 * Every row used to open with `100/100`, which is the number that is the same for almost
 * everybody and says nothing about what to do next. It opens with the competency state and
 * the requirement that fell short, which is the sentence a teacher acts on.
 */
function StudentRows({ rows, submissions, code, keyQuery }: {
  rows: readonly StudentRow[];
  submissions: readonly AttributedSubmission[];
  code: string;
  keyQuery: string;
}) {
  return (
    <div className="row-list">
      {rows.map((row) => {
        const submission = submissions.find((entry) => entry.sessionId === row.sessionId);
        const spine = submission ? studentSpineFor(submission) : null;
        return (
          <Link key={row.sessionId} to={`/educator/class/${code}/students/${row.seatCode}${keyQuery}`}>
            <div>
              <small>Seat {row.seatCode}</small>
              <h3>{spine ? COMPETENCY_STATE_HEADLINES[spine.lead] : "No result"}</h3>
              <small>{spine ? shortfallLine(spine, row) : "This attempt could not be read."}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/** The one requirement a teacher would open this student for, said in their own words. */
function shortfallLine(spine: StudentSpine, row: StudentRow): string {
  const [first, ...rest] = spine.shortfalls;
  if (first) {
    const verdict = first.level === 0 ? "not shown" : "partly shown";
    return `${first.label} — ${verdict}${rest.length > 0 ? ` · ${rest.length} more` : ""}`;
  }
  if (row.reasoningPoints === null) return "Written explanation not read yet.";
  if (spine.notObserved.length > 0) {
    return `${spine.notObserved.length} requirement${spine.notObserved.length === 1 ? "" : "s"} never came up in this run.`;
  }
  return "Showed every required part.";
}

export function RealStudentEvidence() {
  const { code, seatCode } = useParams();
  const [params] = useSearchParams();
  const { state, scoreReasoning, recordOverride } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  return (
    <ClassFrame state={state} title="That student's work did not open.">
      {(ready) => {
        const row = ready.analysis.rows.find((item) => item.seatCode === seatCode);
        if (!row) {
          return (
            <header className="page-header page-header--with-back">
              <Link to={`/educator/class/${code}${keyQuery}`}>← Class evidence</Link>
              <p className="eyebrow">Seat {seatCode}</p>
              <h1>Nothing from this seat.</h1>
              <p>No student has turned work in from seat {seatCode} in this class.</p>
            </header>
          );
        }
        // The raw submission, not the derived row: the trail is built from the student's own
        // events, and a summary of them cannot be audited against itself.
        const submission = ready.submissions.find((entry) => entry.seatCode === seatCode && entry.sessionId === row.sessionId);
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

/**
 * What this attempt shows, at the top of the page it is about.
 *
 * The header used to print `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100` two
 * hundred pixels above a red *Not demonstrated*, and reconciled the two nowhere. The states
 * are the assessment; the flags are the requirements behind them; the points are at the
 * bottom of the page with a sentence saying what they count.
 */
function StudentLead({ spine, awaitingReading }: { spine: StudentSpine; awaitingReading: boolean }) {
  return (
    <div className="student-lead" data-state={spine.lead}>
      <p className="field-label">What the evidence shows</p>
      <strong>{COMPETENCY_STATE_HEADLINES[spine.lead]}</strong>
      <ul className="student-lead__skills">
        {spine.competencies.map((line) => (
          <li key={line.competencyId}>
            <span>{line.statement}</span>
            <b>{COMPETENCY_STATE_LABELS[line.state]}</b>
          </li>
        ))}
      </ul>
      {spine.shortfalls.length > 0 && (
        <ul className="student-lead__flags">
          {spine.shortfalls.map((flag) => (
            <li key={flag.evidenceRequirementId}>
              {flag.label} — {flag.level === 0 ? "not shown" : "partly shown"}
            </li>
          ))}
        </ul>
      )}
      {spine.lead === "incomplete" && awaitingReading && (
        <p className="student-lead__absence">Their written explanation has not been read yet, so the evidence is not all in.</p>
      )}
      {spine.notObserved.length > 0 && (
        <p className="student-lead__absence">
          {spine.notObserved.length} required {spine.notObserved.length === 1 ? "requirement" : "requirements"} never came
          up in this run. Absences, not zeros.
        </p>
      )}
    </div>
  );
}

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
  const spine = submission ? studentSpineFor(submission) : null;

  return (
    <>
      <header className="student-evidence-header">
        <div>
          <Link to={`/educator/class/${code}${keyQuery}`}>← Class evidence</Link>
          <p className="eyebrow">Turned in {new Date(row.submittedAt).toLocaleString()}</p>
          <h1>Seat {row.seatCode}</h1>
          <p>{summarise(row)}</p>
        </div>
        {spine
          ? <StudentLead spine={spine} awaitingReading={row.reasoningPoints === null} />
          : <p className="class-state">This attempt could not be opened in full.</p>}
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
          <p className="response-note">
            <Link to={`/educator/class/${code}/reading${keyQuery}`}>Read the whole class in one queue →</Link>
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
      </div>

      {/* The other model, once, at the bottom, saying what it is.
          BOW computes a points total because a gradebook needs a number, and the way it is
          computed has not changed. What changed is that it no longer sits at the top of the
          page contradicting the states above: it is one line, it says what it counts, and
          the working behind it is one disclosure away. */}
      <Gradebook row={row} structured={grade.structuredPoints} structuredMaximum={grade.structuredMaximum} />
    </>
  );
}

/**
 * The points line, for the world that has one.
 *
 * The eighteen micro-skills this total is built from are Basketball's, and only Basketball's
 * screens can produce them. Printing "2 of 90 structured" under a market run stated a number
 * the world cannot earn as though the student had failed to earn it — a figure that would
 * have been copied into a real gradebook. A world without a points spine says so and lets
 * the states stand as the account, which is what they are on every world anyway.
 */
function Gradebook({ row, structured, structuredMaximum }: { row: StudentRow; structured: number; structuredMaximum: number }) {
  const final = row.result.grade.finalPoints;
  if (row.worldId !== "basketball") {
    return (
      <section className="gradebook">
        <p className="field-label">Gradebook line</p>
        <p className="gradebook__figure">
          <strong>No points total for this world</strong>
          <span>
            The points total is built from Eight Weeks to the Showcase&rsquo;s own eighteen steps, and this
            student played {WORLD_REGISTRY[row.worldId]?.title ?? "another world"}. What they showed is above,
            requirement by requirement, and it is the same reading either world produces.
          </span>
        </p>
      </section>
    );
  }
  return (
    <section className="gradebook">
      <p className="field-label">Gradebook line</p>
      <p className="gradebook__figure">
        <strong>{final === null ? `${structured} of ${structuredMaximum} structured` : `${final} of 100`}</strong>
        <span>
          {structured} structured points
          {row.reasoningPoints === null
            ? ", and no reasoning marks until you read the writing."
            : ` plus ${row.reasoningPoints} reasoning points you recorded.`}
          {" "}It is a mark for a gradebook. What the student can actually do is the states above.
        </span>
      </p>
      <details className="gradebook__working">
        <summary>Where the points came from</summary>
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
        <MicroSkillTrail observations={row.result.observations} />
      </details>
    </section>
  );
}

/**
 * One line describing what this student actually did, never how well they did it.
 *
 * Read from the world the student was actually in. This used to name Avery's housing, the
 * course seat and the Saturday clinics whatever the log said — so a market run was described
 * to a teacher as "No place chosen · waited on the course · kept the Saturdays", three
 * sentences about decisions that student was never offered. A false fact on the first line a
 * teacher reads costs more trust than a missing one, so a world with nothing to say here says
 * nothing rather than borrowing the other world's.
 */
function summarise(row: StudentRow): string {
  if (row.worldId === "food-truck") return popUpSummary(row);
  const place = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === row.setupId)?.title ?? "No place chosen";
  const bits = [
    place,
    row.reservedSeat ? "reserved the seat" : "waited on the course",
    row.tookClinics ? "took the clinics" : "kept the Saturdays",
  ];
  if (row.resolution) bits.push(row.resolution.attendanceHeld ? "made every session" : "lost the bonus");
  return bits.join(" · ");
}

/** The same line for a market run, in the market's own nouns. */
function popUpSummary(row: StudentRow): string {
  const facts = derivePopUpFacts(row.log);
  const spot = POP_UP_SCENARIO.spots.find((entry) => entry.id === facts.spotId)?.title;
  const counted = [facts.counted.catering ? "the catering job" : null, facts.counted.rebate ? "the sell-out rebate" : null]
    .filter((entry): entry is string => entry !== null);
  const bits = [
    spot ?? "No booth taken",
    counted.length > 0 ? `counted ${counted.join(" and ")}` : "counted neither conditional payment",
  ];
  if (facts.repair.saved) bits.push(facts.repair.residual > 0 ? "finished the swap still short" : "covered the swap");
  return bits.join(" · ");
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
          All {observations.length} micro-skills scored full marks. These are points, not the requirement states above.
        </p>
      ) : (
        <>
          <p className="class-state">
            {exceptions.length} of {observations.length} scored below full marks.
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

export type { ClassAnalysis };
