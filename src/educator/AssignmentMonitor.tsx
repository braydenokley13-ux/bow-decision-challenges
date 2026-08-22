import { Link, useParams } from "react-router-dom";
import { WORLD_REGISTRY, stageLabel } from "../domain/scenario/registry";
import { standardByRef } from "../domain/standards";
import type { Assignment, AttributedSubmission } from "../platform/classes/types";
import type { ProgressRow } from "../platform/identity/types";
import { challengeById } from "../platform/challenges/registry";
import { analyseClass, classRoll } from "./analysis";
import { ClassUnreachable, EducatorShell } from "./EducatorShell";
import { SeatNamesContext, seatLabel, seatLabels, seatNames, type RosterRow } from "./names";
import { useClassEvidence } from "./useClassEvidence";
import "./AssignmentMonitor.css";

type NamedAssignment = Assignment & { title?: string };
type ScopedProgress = ProgressRow & { assignmentId?: string };

/**
 * The teacher's name for an assignment, with an honest fallback for older records.
 *
 * New assignments carry `title`. Records created before that field existed still need a
 * stable heading, so the fallback uses the world or the objective that is actually stored.
 * It never invents "Assignment 1", because a number would hide which work this is.
 */
export function assignmentTitleForTeacher(assignment: Assignment): string {
  const named = (assignment as NamedAssignment).title?.trim();
  if (named) return named;
  const worlds = assignment.allowedWorldIds
    .map((worldId) => WORLD_REGISTRY[worldId]?.title)
    .filter((title): title is string => Boolean(title));
  if (assignment.format === "decision-challenge" && worlds.length > 0) return worlds.join(" or ");
  const objective = assignment.objectiveRef ? standardByRef(assignment.objectiveRef) : undefined;
  if (assignment.format === "quick-check") {
    return objective ? `Quick check · ${objective.shortLabel}` : "Quick check";
  }
  return objective?.shortLabel ?? "Decision challenge";
}

/** A legacy progress row is safe only while there is exactly one possible assignment. */
export function progressForAssignment(
  progress: readonly ProgressRow[],
  assignmentId: string,
  assignmentCount: number,
): ScopedProgress[] {
  return progress.filter((row) => {
    const named = (row as ScopedProgress).assignmentId;
    return named === assignmentId || (named === undefined && assignmentCount === 1);
  });
}

export function rosterForAssignment(assignment: Assignment, roster: readonly RosterRow[]): RosterRow[] {
  if (assignment.assignedStudentIds === null) return roster.filter((row) => !row.removedAt);
  const assigned = new Set(assignment.assignedStudentIds);
  const known = roster.filter((row) => !row.removedAt && assigned.has(row.seatCode));
  const seen = new Set(known.map((row) => row.seatCode));
  // A targeted assignment can outlive a roster edit. Keep its audience count truthful even if
  // a seat is no longer in the current list; its stored seat code remains the evidence join.
  return [
    ...known,
    ...assignment.assignedStudentIds
      .filter((seatCode) => !seen.has(seatCode))
      .map((seatCode) => ({ seatCode, displayName: `Seat ${seatCode}`, claimed: false, removedAt: null })),
  ];
}

function dueLabel(dueAt: number | undefined): string {
  if (!dueAt) return "No due date";
  return `Due ${new Date(dueAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

function elapsedLabel(now: number, then: number): string {
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 90) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function AssignmentHeader({ assignment, record, roster }: {
  assignment: Assignment;
  record: { code: string; label: string; challengeId: string };
  roster: readonly RosterRow[];
}) {
  const objective = assignment.objectiveRef ? standardByRef(assignment.objectiveRef) : undefined;
  const names = seatNames(roster);
  const audience = assignment.assignedStudentIds === null
    ? "Everyone in this class"
    : `${assignment.assignedStudentIds.length} ${assignment.assignedStudentIds.length === 1 ? "student" : "students"}: ${seatLabels(assignment.assignedStudentIds, names)}`;
  const worlds = assignment.allowedWorldIds
    .map((worldId) => WORLD_REGISTRY[worldId]?.title ?? worldId)
    .join(" · ") || challengeById(record.challengeId)?.title || "Decision challenge";
  const accentWorld = assignment.allowedWorldIds.length === 1 ? assignment.allowedWorldIds[0] : undefined;

  return (
    <>
      <p className="assignment-monitor__back"><Link to={`/educator/class/${record.code}`}>← {record.label} class center</Link></p>
      <header className="assignment-monitor__header surface-margin" data-world={accentWorld}>
        <p className="eyebrow">{worlds} · Assignment monitor</p>
        <h1>{assignmentTitleForTeacher(assignment)}</h1>
        <dl className="assignment-monitor__facts">
          <div><dt>Due</dt><dd>{dueLabel(assignment.dueAt)}</dd></div>
          <div><dt>Students</dt><dd>{audience}</dd></div>
          <div><dt>Set</dt><dd>{new Date(assignment.createdAt).toLocaleDateString()}</dd></div>
        </dl>
        <div className="assignment-monitor__brief">
          <div>
            <p className="field-label">Learning objective</p>
            {objective
              ? <p><strong>{objective.code} · {objective.shortLabel}</strong><br />{objective.text}</p>
              : <p>No framework objective was attached to this assignment.</p>}
          </div>
          {assignment.closingQuestion && (
            <div className="assignment-monitor__question">
              <p className="field-label">Your question · not scored</p>
              <blockquote>{assignment.closingQuestion.text}</blockquote>
              <p>Students answer this separately. It never changes BOW's skill evidence.</p>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

function SubmissionList({ submissions, feedback, code, roster }: {
  submissions: readonly AttributedSubmission[];
  feedback: readonly { sessionId: string; deletedAt?: number }[];
  code: string;
  roster: readonly RosterRow[];
}) {
  const names = seatNames(roster);
  const accentWorld = assignment.allowedWorldIds.length === 1 ? assignment.allowedWorldIds[0] : undefined;
  const ordered = [...submissions].sort((a, b) => {
    const unread = Number(a.reasoningPoints !== null) - Number(b.reasoningPoints !== null);
    return unread || b.submittedAt - a.submittedAt;
  });
  if (ordered.length === 0) return <p className="class-state">No work has been turned in for this assignment yet.</p>;

  return (
    <ol className="assignment-monitor__submissions">
      {ordered.map((submission) => {
        const notes = feedback.filter((note) => note.sessionId === submission.sessionId && !note.deletedAt).length;
        const target = `/educator/class/${code}/students/${submission.seatCode}?session=${encodeURIComponent(submission.sessionId)}`;
        return (
          <li key={submission.sessionId} data-reading={submission.reasoningPoints === null ? "unread" : "read"}>
            <div>
              <strong>{seatLabel(submission.seatCode, names)}</strong>
              <span>
                {submission.reasoningPoints === null ? "Writing still to read" : "Writing read"}
                {notes > 0 ? ` · ${notes} ${notes === 1 ? "feedback note" : "feedback notes"} sent` : " · no feedback yet"}
              </span>
            </div>
            <nav aria-label={`Actions for ${seatLabel(submission.seatCode, names)}`}>
              <Link to={target}>Open this session</Link>
              <Link to={`${target}#write-back`}>Write feedback</Link>
            </nav>
          </li>
        );
      })}
    </ol>
  );
}

export function AssignmentMonitor() {
  const { code, assignmentId } = useParams();
  const { state, reload } = useClassEvidence(code);

  if (state.status === "loading") {
    return <EducatorShell scale="teacher"><p className="class-state" aria-live="polite">Opening the assignment…</p></EducatorShell>;
  }
  if (state.status === "offline") return <ClassUnreachable where="Assignment monitor" onRetry={reload} />;
  if (state.status === "error") {
    return (
      <EducatorShell scale="teacher">
        <header className="page-header"><p className="eyebrow">Assignment monitor</p><h1>This assignment did not open.</h1><p>{state.message}</p></header>
        <Link className="button button--secondary" to="/educator/classes">My classes</Link>
      </EducatorShell>
    );
  }

  const assignment = state.assignments.find((entry) => entry.id === assignmentId);
  if (!assignment) {
    return (
      <EducatorShell scale="teacher">
        <header className="page-header page-header--with-back">
          <Link to={`/educator/class/${state.record.code}`}>← {state.record.label} class center</Link>
          <p className="eyebrow">Assignment monitor</p>
          <h1>That assignment is not in this class.</h1>
          <p>Choose it from this class's assignment history.</p>
        </header>
      </EducatorShell>
    );
  }

  const submissions = state.submissions.filter((entry) => entry.assignmentId === assignment.id);
  const progress = progressForAssignment(state.progress, assignment.id, state.assignments.length);
  const roster = rosterForAssignment(assignment, state.roster);
  const analysis = analyseClass(submissions);
  const roll = classRoll({ rows: analysis.rows, roster, progress, at: state.loadedAt });
  const waiting = roll.rows.filter((row) => row.reasoningPoints === null).length;
  const read = roll.rows.length - waiting;
  const names = seatNames(roster);

  return (
    <EducatorShell scale="teacher">
      <SeatNamesContext.Provider value={names}>
        <AssignmentHeader assignment={assignment} record={state.record} roster={roster} />

        <section className="surface-instrument assignment-monitor__instrument" data-world={accentWorld} aria-labelledby="assignment-triage">
          <div className="assignment-monitor__lead">
            <div>
              <p className="eyebrow">Needs your attention</p>
              <h2 id="assignment-triage">
                {waiting > 0 ? `${waiting} ${waiting === 1 ? "explanation" : "explanations"} still to read` : "No submitted writing is waiting"}
              </h2>
              <p>{read} read · {roll.turnedIn} of {roll.seats.length} students turned in.</p>
            </div>
            <Link className="button button--primary" to={`/educator/class/${state.record.code}/reading?assignmentId=${encodeURIComponent(assignment.id)}`}>
              Read this assignment
            </Link>
          </div>
          <dl className="assignment-monitor__counts">
            <div><dt>Turned in</dt><dd>{roll.turnedIn} of {roll.seats.length}</dd></div>
            <div><dt>Working now</dt><dd>{roll.stillWorking} of {roll.seats.length}</dd></div>
            {roll.startedQuiet > 0 && <div><dt>Started, not active</dt><dd>{roll.startedQuiet} of {roll.seats.length}</dd></div>}
            <div><dt>Not started</dt><dd>{roll.notStarted === null ? "—" : `${roll.notStarted} of ${roll.seats.length}`}</dd></div>
          </dl>
        </section>

        {progress.length > 0 && (
          <section className="surface-record assignment-monitor__live" data-world={accentWorld} aria-labelledby="assignment-live">
            <div className="record__head"><h2 id="assignment-live">Working on this assignment</h2><p>As at {new Date(state.loadedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div>
            <ul>
              {[...progress].sort((a, b) => a.updatedAt - b.updatedAt).map((row) => (
                <li key={row.seatCode}>
                  <strong>{seatLabel(row.seatCode, names)}</strong>
                  <span>{WORLD_REGISTRY[row.worldId]?.title ?? row.worldId} · {stageLabel(row.worldId, row.stage)}</span>
                  <span>{elapsedLabel(state.loadedAt, row.updatedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="surface-record assignment-monitor__submitted" data-world={accentWorld} aria-labelledby="assignment-submissions">
          <div className="record__head"><h2 id="assignment-submissions">Submitted work</h2><p>Unread first · every row belongs to this assignment</p></div>
          <SubmissionList submissions={submissions} feedback={state.feedback} code={state.record.code} roster={roster} />
        </section>
      </SeatNamesContext.Provider>
    </EducatorShell>
  );
}
