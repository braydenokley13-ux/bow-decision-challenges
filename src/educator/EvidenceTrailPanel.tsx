import { useState } from "react";
import { Button } from "../components/primitives/Button";
import { competencyById } from "../domain/competency/competencies";
import { evidenceTrail, judgementsOf, type TrailJudgement } from "../domain/competency/trail";
import { reteachFor } from "../domain/competency/reteach";
import type { RubricLevel } from "../domain/competency/types";
import type { SubmissionRecord, TeacherOverride } from "../platform/classes/types";
import { machineObservationsFor } from "./objectiveResults";
import { levelDescription, levelKey, levelLabel, LEVEL_ORDER, SUPPORT_LABELS, MOMENT_LABELS } from "./labels";
import { StateKey } from "./EducatorShell";
import type { OverrideRequest } from "./useClassEvidence";

/**
 * §19 — the chain a teacher can follow, and the place they can disagree with it.
 *
 * Everything on this panel is derived from one student's own event log. Nothing is summarised
 * into a number without the moment that produced it sitting next to it, because the promise
 * §19.2 makes is not "here is the score" — it is *a teacher who disagrees can see what BOW
 * saw*, and a conclusion whose evidence is one screen away is a conclusion that gets taken on
 * trust or not at all.
 *
 * The override is on the same panel, on the same row, for the same reason. Disagreement
 * happens while reading, and a teacher who has to leave the evidence to record it is a
 * teacher who records it from memory.
 */

/**
 * The five levels the shared rubric allows, strongest first. There is deliberately no 1.
 *
 * The order is Ladder 2's own, read from `labels.ts` rather than restated, so the control a
 * teacher picks from and the trail they read cannot offer the levels in different orders.
 */
const LEVELS: readonly (RubricLevel | null)[] = LEVEL_ORDER.map((level) => (level === "null" ? null : level));

/** One thing the work had to show, what a teacher said about it, and the two together. */
function JudgementRow({ judgement, overrides, onOverride }: {
  judgement: TrailJudgement;
  overrides: readonly TeacherOverride[];
  onOverride: ((override: OverrideRequest) => Promise<boolean>) | null;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<RubricLevel | null>(judgement.level);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const mine = overrides.filter((entry) => entry.evidenceRequirementId === judgement.evidenceRequirementId);
  const standing = mine.at(-1);

  return (
    <li className="judgement" data-level={judgement.level === null ? "none" : judgement.level}>
      <div className="judgement__say">
        <b>{judgement.label}</b>
        <span className="judgement__rule">{judgement.observableRule}</span>
        <p className="judgement__reason">{judgement.reason}</p>
        {/* The cap is the rubric's doing, not the student's, and saying which is which is the
            difference between "they needed a hint" and "they could not do it".

            It used to name the cap twice — "BOW saw Independently, held to After a hint: a
            hint that named the problem caps this at After a hint" — which it could not help
            doing, because a capped level *is* the cap: `levelUnderRubric` is `min(claimed,
            cap)`, so whenever `cappedBySupport` is true the held level and the cap are the
            same value. Four level words in eighteen, two of them the same word twice. Said
            once, it is two clauses: what BOW read, and what holds it there.

            No emphasis on the two level words, deliberately: `.judgement__say b` is a display
            block one level up, so a `<b>` here breaks the sentence into four lines with the
            comma and the full stop orphaned on their own. */}
        {judgement.cappedBySupport && (
          <p className="judgement__cap">
            BOW read this as {levelLabel(judgement.claimed)}, and {SUPPORT_LABELS[judgement.supportLevel]} holds
            it at {levelLabel(judgement.level)}.
          </p>
        )}
      </div>

      <div className="judgement__verdicts">
        <p className="judgement__machine">
          <span>BOW</span>
          <strong>{levelLabel(judgement.level)}</strong>
        </p>
        {/* Both, always. An override that hid the machine judgement would remove the only
            thing a second teacher could check the first one against. */}
        {standing && (
          <p className="judgement__override">
            <span>You</span>
            <strong>{levelLabel(standing.level)}</strong>
          </p>
        )}
      </div>

      {mine.length > 0 && (
        <ol className="judgement__history">
          {mine.map((entry) => (
            <li key={`${entry.at}-${entry.note}`}>
              <b>{levelLabel(entry.level)}</b>
              <q>{entry.note}</q>
              <time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleDateString()}</time>
            </li>
          ))}
        </ol>
      )}

      {onOverride && (
        <div className="judgement__act">
          {!open ? (
            <Button type="button" variant="quiet" onClick={() => setOpen(true)}>
              {standing ? "Record a different judgement" : "I read this differently"}
            </Button>
          ) : (
            <form
              className="override-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (note.trim().length === 0) return;
                void onOverride({ evidenceRequirementId: judgement.evidenceRequirementId, level, note: note.trim() })
                  .then((ok) => {
                    setSaved(ok ? "Recorded beside BOW's." : "Could not record that.");
                    if (ok) { setOpen(false); setNote(""); }
                  });
              }}
            >
              <fieldset>
                <legend>What you read it as</legend>
                {/* Named, described, and not numbered. Six labels are BOW's own distinctions
                    and nobody outside this codebase has agreed to them, so each one says what
                    it means beside the control that records it. This is where the glossary
                    rule started, and `StateKey` is the same rule applied to pages that only
                    read the words rather than asking a person to pick one. */}
                <ul className="override-levels">
                  {LEVELS.map((option) => (
                    <li key={String(option)}>
                      <button
                        type="button"
                        aria-pressed={level === option}
                        onClick={() => setLevel(option)}
                      >
                        {levelLabel(option)}
                      </button>
                      <span>{levelDescription(option)}</span>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <label>
                Why — this is kept with the judgement
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={600} required />
              </label>
              {/* Above the actions, because a rule explained under a disabled button is a
                  rule a teacher meets after it has already refused them. */}
              <p className="override-form__note" aria-live="polite">
                {note.trim().length === 0 ? "A judgement with no reason is a number nobody can check later." : "BOW keeps both readings."}
              </p>
              <div className="override-form__act">
                <Button type="button" variant="quiet" onClick={() => { setOpen(false); setNote(""); }}>Cancel</Button>
                <Button type="submit" aria-disabled={note.trim().length === 0}>Record it</Button>
              </div>
            </form>
          )}
          <span aria-live="polite" className="judgement__saved">{saved}</span>
        </div>
      )}
    </li>
  );
}

export function EvidenceTrailPanel({ submission, onOverride }: {
  submission: SubmissionRecord;
  /** Absent where this teacher cannot write to the class. Reading never requires it. */
  onOverride: ((override: OverrideRequest) => Promise<boolean>) | null;
}) {
  const trail = evidenceTrail(submission.log, machineObservationsFor(submission));
  const overrides = submission.overrides ?? [];
  const standing = judgementsOf(trail).filter((judgement) => !judgement.superseded);
  const byCompetency = [...new Set(standing.map((judgement) => judgement.competencyId))];

  return (
    <>
      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">What BOW concluded, and why</p>
          <h2>Every judgement on this attempt</h2>
        </div>
        {/* Once, at the top, for the words actually on this page — not once per row, and
            never for a word this attempt did not produce. */}
        <StateKey title="What these words mean" entries={levelKey(standing.map((judgement) => judgement.level))} />
        {byCompetency.map((competencyId) => (
          <section className="judgement-group" key={competencyId}>
            <h3>{competencyById(competencyId)?.statement ?? competencyId}</h3>
            <ul className="judgement-list">
              {standing
                .filter((judgement) => judgement.competencyId === competencyId)
                .map((judgement) => (
                  <JudgementRow
                    key={judgement.evidenceRequirementId}
                    judgement={judgement}
                    overrides={overrides}
                    onOverride={onOverride}
                  />
                ))}
            </ul>
          </section>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">In the order it happened</p>
          <h2>What this student did</h2>
        </div>
        {/* The timeline is the audit trail: each row is one moment from the log, and the
            judgements under it are the ones that moment settled. */}
        <ol className="trail">
          {trail.moments.map((moment) => (
            <li key={moment.eventId}>
              <div className="trail__when">
                <b>{MOMENT_LABELS.stage[moment.stage] ?? moment.stage}</b>
                <span>{MOMENT_LABELS.event[moment.type] ?? moment.type}</span>
                <code>{moment.eventId}</code>
              </div>
              <ul className="trail__judgements">
                {moment.judgements.map((judgement) => (
                  <li key={`${judgement.evidenceRequirementId}-${judgement.reason}`} data-superseded={judgement.superseded}>
                    <b>{judgement.label}</b>
                    <span className="trail__level">{levelLabel(judgement.level)}</span>
                    <span>{judgement.reason}</span>
                    {judgement.superseded && <em>Revisited later. The reading below stands.</em>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {trail.notObserved.length > 0 && (
          <div className="trail__absent">
            <p className="field-label">{levelLabel(null)}</p>
            <ul>
              {trail.notObserved.map((judgement) => (
                <li key={judgement.evidenceRequirementId}>
                  <b>{judgement.label}</b>
                  <span>{judgement.reason}</span>
                </li>
              ))}
            </ul>
            <p>These are absences, not zeros. Nothing here counted against this student.</p>
          </div>
        )}
      </section>
    </>
  );
}

/** §19.3 — the summary block, and the one thing to do about it. */
export function StudentSummary({ submission }: { submission: SubmissionRecord }) {
  const trail = evidenceTrail(submission.log, machineObservationsFor(submission));
  const standing = judgementsOf(trail).filter((judgement) => !judgement.superseded);
  const overrides = submission.overrides ?? [];
  // A standing override replaces the machine level even when it says `null` — a teacher
  // recording "the run never really showed this" has withdrawn the judgement, and folding
  // that back to BOW's number would put the summary at odds with the trail one tab over.
  const readAs = (judgement: TrailJudgement) => {
    const standing = overrides.filter((entry) => entry.evidenceRequirementId === judgement.evidenceRequirementId).at(-1);
    return standing ? standing.level : judgement.level;
  };

  const did = standing.filter((judgement) => { const level = readAs(judgement); return level !== null && level >= 3; });
  const needs = standing.filter((judgement) => { const level = readAs(judgement); return level === 0 || level === 2; });
  // The same table the class-level card uses. One student's gap and a class's gap are the
  // same wrong idea, so they get the same lesson rather than two different ones.
  const next = needs.map((judgement) => ({ judgement, reteach: reteachFor(judgement.misconception) })).find((entry) => entry.reteach);

  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <p className="eyebrow">Where this student is</p>
        <h2>What to do next</h2>
      </div>
      {/* What to work on leads and owns the width. Nine green ticks under "Could do" used to
          fill this tab while the one line that is the reason to open it sat in a column on
          the right.

          The two headings used to be "Needs support" and "Could do" — a seventh and eighth
          wording for a fact the trail one tab away already had three words for, and "support"
          in a sense the rubric uses for something else. Every row now carries its own Ladder
          2 word, so the headings say what the lists are for and nothing about a level. */}
      <div className="student-summary">
        <div className="student-summary__needs">
          <p className="field-label">What to work on</p>
          {needs.length > 0 ? (
            <ul className="student-summary__list" data-tone="gap">
              {needs.map((judgement) => (
                <li key={judgement.evidenceRequirementId}>
                  {judgement.label} — {levelLabel(readAs(judgement))}
                  <span>{judgement.reason}</span>
                </li>
              ))}
            </ul>
          ) : <p className="class-state">Nothing on this attempt came out short.</p>}
        </div>
        <div className="student-summary__could">
          <p className="field-label">What they did · {did.length}</p>
          {did.length > 0 ? (
            <ul className="student-summary__chips" data-tone="good">
              {did.map((judgement) => (
                <li key={judgement.evidenceRequirementId}>{judgement.label} — {levelLabel(readAs(judgement))}</li>
              ))}
            </ul>
          ) : <p className="class-state">Nothing reached this bar on this attempt.</p>}
        </div>
      </div>
      {/* The same rule as the trail: the words on this page, each with its sentence, once. */}
      <StateKey title="What these words mean" entries={levelKey([...needs, ...did].map(readAs))} />
      {next?.reteach && (
        <div className="next-lesson__action">
          <p className="eyebrow">Reinforce</p>
          <h4>{next.reteach.title}</h4>
          <p className="next-lesson__focus">{next.reteach.focus}</p>
          <p className="next-lesson__why">
            <strong>Why for this student:</strong> {next.judgement.reason}
          </p>
        </div>
      )}
    </section>
  );
}
