import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import { REASONING_MAXIMUM } from "../domain/evidence/grade";
import { useClassEvidence } from "./useClassEvidence";
import type { StudentRow } from "./analysis";

/**
 * Every written explanation in one class, in one place, in an order.
 *
 * This is the largest job the product creates and the one it says only a person can do. It
 * used to be one page load per student, reached by going back to the class list each time,
 * with no way to tell which were still unread. Twenty-eight students is twenty-eight
 * navigations and a tally kept on paper.
 *
 * So: one surface, unread first, next and previous, and the same four rubric criteria that
 * are on the student's own page — the same PATCH, the same marks, the same total. Nothing
 * new is stored and nothing here is scored by anything but a person.
 *
 * **The order is fixed when the queue opens.** Saving a review makes that student read, and
 * an order that re-sorted on every save would move the paragraph out from under the teacher
 * mid-sentence. That is why the queue is a separate component: it mounts once the class has
 * loaded, and takes its order from the rows it mounted with.
 */

function queueOrder(rows: readonly StudentRow[]): string[] {
  return [...rows]
    .sort((a, b) => {
      const unread = Number(a.reasoningPoints !== null) - Number(b.reasoningPoints !== null);
      if (unread !== 0) return unread;
      return Number(a.seatCode) - Number(b.seatCode) || a.seatCode.localeCompare(b.seatCode);
    })
    .map((row) => row.sessionId);
}

export function ReadingQueue() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { state, scoreReasoning } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">Reading queue</p>
          <h1>This class did not open.</h1>
          <p>{state.message}</p>
        </header>
      </EducatorShell>
    );
  }

  const rows = state.analysis.rows;
  const unread = rows.filter((entry) => entry.reasoningPoints === null).length;

  return (
    <EducatorShell>
      <header className="page-header page-header--with-back">
        <Link to={`/educator/class/${state.record.code}${keyQuery}`}>← Class evidence</Link>
        <p className="eyebrow">{state.record.label} · Reading queue</p>
        <h1>Read and score the explanations.</h1>
        <p>
          {rows.length === 0
            ? "Nothing turned in yet. The queue fills as work arrives."
            : `${rows.length} turned in · ${unread} still unread. You score the writing; nothing here is machine-scored.`}
        </p>
      </header>

      {rows.length > 0 && (
        <Queue rows={rows} code={state.record.code} keyQuery={keyQuery} onScore={scoreReasoning} />
      )}
    </EducatorShell>
  );
}

function Queue({ rows, code, keyQuery, onScore }: {
  rows: readonly StudentRow[];
  code: string;
  keyQuery: string;
  onScore: (seatCode: string, sessionId: string, scores: ReasoningScores | null) => Promise<boolean>;
}) {
  // Taken from the rows this mounted with. A save changes whether a student is unread, and
  // recomputing the sort from that would reorder the queue mid-pass.
  const [opened] = useState(() => queueOrder(rows));
  const queue = useMemo(() => {
    const known = new Set(opened);
    const arrivedSince = rows.filter((row) => !known.has(row.sessionId)).map((row) => row.sessionId);
    return [...opened, ...arrivedSince].flatMap((sessionId) => rows.filter((row) => row.sessionId === sessionId));
  }, [opened, rows]);

  const [index, setIndex] = useState(0);
  const position = Math.min(index, Math.max(0, queue.length - 1));
  const row = queue[position];

  // Moving through the queue moves the reader's focus with it. Without this a keyboard user
  // presses Next and stays on the button while the page underneath changes silently.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [position]);

  const goTo = (next: number) => {
    moved.current = true;
    setIndex(Math.max(0, Math.min(queue.length - 1, next)));
  };

  if (!row) return null;
  return (
    <ReadingCard
      key={row.sessionId}
      row={row}
      position={position}
      count={queue.length}
      code={code}
      keyQuery={keyQuery}
      headingRef={headingRef}
      onMove={goTo}
      onScore={(scores) => onScore(row.seatCode, row.sessionId, scores)}
    />
  );
}

function ReadingCard({ row, position, count, code, keyQuery, headingRef, onMove, onScore }: {
  row: StudentRow;
  position: number;
  count: number;
  code: string;
  keyQuery: string;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onMove: (index: number) => void;
  onScore: (scores: ReasoningScores) => Promise<boolean>;
}) {
  const [scores, setScores] = useState<ReasoningScores>(() => row.reasoningCriteria ?? {});
  const [saved, setSaved] = useState<string | null>(null);
  const complete = REASONING_CRITERIA.every((criterion) => scores[criterion.id] !== undefined);
  const total = reasoningTotal(scores);
  const last = position === count - 1;

  const save = async () => {
    if (!complete) return;
    const ok = await onScore(scores);
    setSaved(ok ? "Saved." : "Could not save that.");
    if (ok && !last) onMove(position + 1);
  };

  return (
    <section className="reading-queue">
      <div className="reading-queue__bar">
        <Button variant="quiet" aria-disabled={position === 0} onClick={() => position > 0 && onMove(position - 1)}>
          ← Previous
        </Button>
        <p aria-live="polite">
          {position + 1} of {count} · Seat {row.seatCode} · {row.reasoningPoints === null ? "unread" : `scored ${row.reasoningPoints}/${REASONING_MAXIMUM}`}
        </p>
        <Button variant="quiet" aria-disabled={last} onClick={() => !last && onMove(position + 1)}>
          Next →
        </Button>
      </div>

      <div className="reasoning-layout">
        <div className="student-response">
          {/* Focus lands here on every move, so a keyboard reader is told which seat they
              are on rather than left on a button while the page changes underneath. */}
          <h2 ref={headingRef} tabIndex={-1}>Seat {row.seatCode}</h2>
          {row.defense && row.defense.text.trim()
            ? <blockquote>{row.defense.text}</blockquote>
            : <p className="class-state">This student turned in no written explanation.</p>}
          <p className="response-note">
            <Link to={`/educator/class/${code}/students/${row.seatCode}${keyQuery}`}>Open this student’s evidence →</Link>
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
                    onClick={() => { setScores((current) => ({ ...current, [criterion.id]: value })); setSaved(null); }}
                  >{value}</button>
                ))}
              </div>
            </div>
          ))}
          <footer>
            <span>Reasoning total</span>
            {/* An unread paragraph and a paragraph somebody read and scored zero are
                different facts. Until all four are answered this refuses to be a number. */}
            <strong>{complete ? `${total}/${REASONING_MAXIMUM}` : `—/${REASONING_MAXIMUM}`}</strong>
            <Button aria-disabled={!complete} onClick={() => void save()}>
              {last ? "Save review" : "Save and read the next"}
            </Button>
            <span aria-live="polite">{saved || (complete ? "" : "Score all four to save.")}</span>
          </footer>
        </div>
      </div>
    </section>
  );
}
