import { useState } from "react";
import { Button } from "../components/primitives/Button";
import { competencyById } from "../domain/competency/competencies";
import { evidenceTrail, judgementsOf, type TrailJudgement } from "../domain/competency/trail";
import { isShortfall } from "../domain/competency/teachNext";
import { disclosureEscape } from "../components/primitives/disclosureEscape";
import { reteachFor } from "../domain/competency/reteach";
import type { RubricLevel } from "../domain/competency/types";
import type { SubmissionRecord, TeacherOverride } from "../platform/classes/types";
import { machineObservationsFor, worldOfSubmission } from "./objectiveResults";
import { eventLabel, stageLabel } from "../domain/scenario/registry";
import { levelDescription, levelKey, levelLabel, levelMark, levelReading, LEVEL_ORDER, SUPPORT_LABELS } from "./labels";
import { StateKey, WordKey } from "./EducatorShell";
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

/**
 * One thing the work had to show, what BOW read, what a teacher said about it — and the way
 * to disagree, on the row, behind a native disclosure.
 *
 * The override used to be a full-height panel per row: fourteen of them, unrolled, on a page
 * whose primary control sat under all of them. The control is the same control and every one
 * of the fourteen still has one — what changed is that a row a teacher agrees with costs a
 * line instead of a screen. The row that fell short opens by default, because that is the
 * row they came to argue with.
 *
 * `<details>` rather than a custom accordion, everywhere: keyboard-operable and announced
 * with no JavaScript, which is the accessibility contract rather than a preference.
 */
function JudgementRow({ judgement, overrides, onOverride, openByDefault }: {
  judgement: TrailJudgement;
  overrides: readonly TeacherOverride[];
  onOverride: ((override: OverrideRequest) => Promise<boolean>) | null;
  openByDefault: boolean;
}) {
  const [level, setLevel] = useState<RubricLevel | null>(judgement.level);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const mine = overrides.filter((entry) => entry.evidenceRequirementId === judgement.evidenceRequirementId);
  const standing = mine.at(-1);
  const short = isShortfall(judgement.level);
  // How this row reads: the rubric level where there is one, and otherwise the row's own
  // evidence deciding whether nothing was written or nothing has been read. The row used to
  // print *Never came up* over a reason sentence saying the writing was submitted.
  const reading = levelReading(judgement);

  return (
    <li data-short={short} data-level={reading === "awaiting-reading" ? "unread" : judgement.level === null ? "none" : judgement.level}>
      <div className="judgement-line">
        <b>{judgement.label}</b>
        {/* Word, mark and colour — three signals, so the state survives greyscale and a
            reader who has any one of them can still tell the seven apart. */}
        <span>
          <span className="mark-glyph" aria-hidden="true">{levelMark(reading)}</span>{"\u00a0"}
          {levelLabel(reading)}
        </span>
        <p className="judgement-rule">{judgement.observableRule} · {judgement.reason}</p>
        {/* The cap is the rubric's doing, not the student's, and saying which is which is the
            difference between "they needed a hint" and "they could not do it". */}
        {judgement.cappedBySupport && (
          <p className="judgement-rule">
            BOW read this as {levelLabel(judgement.claimed)}, and {SUPPORT_LABELS[judgement.supportLevel]} holds
            it at {levelLabel(judgement.level)}.
          </p>
        )}
        {/* Both readings, always. An override that hid the machine judgement would remove the
            only thing a second teacher could check the first one against. */}
        {standing && (
          <p className="judgement-mine judgement__override">
            <span>You read this as</span> <strong>{levelLabel(standing.level)}</strong>
            {mine.length > 1 ? ` · ${mine.length} readings recorded` : ""} — yours stands.
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
        <details open={openByDefault} onKeyDown={disclosureEscape()}>
          <summary>{standing ? "Record a different judgement" : "I read this differently"}</summary>
          <form
            className="override-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (note.trim().length === 0) return;
              void onOverride({ evidenceRequirementId: judgement.evidenceRequirementId, level, note: note.trim() })
                .then((ok) => {
                  setSaved(ok ? "Recorded beside BOW's." : "Could not record that.");
                  if (ok) setNote("");
                });
            }}
          >
            <fieldset>
              <legend>What you read it as</legend>
              {/* Named, described, and not numbered. Six labels are BOW's own distinctions
                  and nobody outside this codebase has agreed to them, so each one says what
                  it means beside the control that records it. */}
              <ul className="override-levels">
                {LEVELS.map((option) => (
                  <li key={String(option)}>
                    <button type="button" aria-pressed={level === option} onClick={() => setLevel(option)}>
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
              <Button type="submit" aria-disabled={note.trim().length === 0}>Record it</Button>
            </div>
          </form>
          <span aria-live="polite" className="judgement__saved">{saved}</span>
        </details>
      )}
    </li>
  );
}

/**
 * Every judgement on this attempt, grouped by skill, weakest group first.
 *
 * The ranking is the same one the class page's triage does, at this page's grain: the group
 * holding the shortfall is the group a teacher came for, so it is the group they meet.
 */
export function JudgementRecord({ submission, onOverride }: {
  submission: SubmissionRecord;
  onOverride: ((override: OverrideRequest) => Promise<boolean>) | null;
}) {
  const trail = evidenceTrail(submission.log, machineObservationsFor(submission));
  const overrides = submission.overrides ?? [];
  const standing = judgementsOf(trail).filter((judgement) => !judgement.superseded);
  const worst = (competencyId: string) =>
    standing.filter((judgement) => judgement.competencyId === competencyId && isShortfall(judgement.level)).length;
  const byCompetency = [...new Set(standing.map((judgement) => judgement.competencyId))]
    .sort((a, b) => worst(b) - worst(a));
  // The one row a teacher is most likely to want to argue with, opened for them. Exactly
  // one, so the page does not unroll fourteen panels again by another route.
  const firstShort = standing.find((judgement) => isShortfall(judgement.level))?.evidenceRequirementId ?? null;

  return (
    <div className="judgements">
      {/* The propagation promise, said on the screen that makes it rather than in a doc. */}
      <p className="judgements__propagates">
        Every row here is yours to disagree with, and an override stands everywhere this
        judgement appears — this page, the class overview, the objective standing, and anything
        the student sees.
      </p>
      {byCompetency.map((competencyId) => (
        <section className="judgement-block" key={competencyId}>
          <h3>{competencyById(competencyId)?.statement ?? competencyId}</h3>
          <ul className="judgement-rows">
            {standing
              .filter((judgement) => judgement.competencyId === competencyId)
              .map((judgement) => (
                <JudgementRow
                  key={judgement.evidenceRequirementId}
                  judgement={judgement}
                  overrides={overrides}
                  onOverride={onOverride}
                  openByDefault={judgement.evidenceRequirementId === firstShort}
                />
              ))}
          </ul>
        </section>
      ))}
      <WordKey title="What these words mean" entries={levelKey(standing.map(levelReading))} />
    </div>
  );
}

/**
 * Everything the student did, in the order it happened, behind one disclosure.
 *
 * The obligation is that every judgement can be traced to the moment that produced it — not
 * that thirty-four moments are unrolled on the page by default. So the trail is complete and
 * it is closed, and the compressed account above it is only honest because this is here.
 */
export function TrailRecord({ submission }: { submission: SubmissionRecord }) {
  const trail = evidenceTrail(submission.log, machineObservationsFor(submission));
  const worldId = worldOfSubmission(submission);
  return (
    <details className="trail-record" onKeyDown={disclosureEscape()}>
      <summary>Every moment of this run, in order — {trail.moments.length} of them</summary>
      {/* The timeline is the audit trail: each row is one moment from the log, and the
          judgements under it are the ones that moment settled. Named by the story the
          student was actually in — the stage ids and the event types are BOW's internal
          vocabulary, and a trail printed in that vocabulary is a log file with a heading. */}
      <ol className="trail">
        {trail.moments.map((moment, index) => (
          <li key={moment.eventId}>
            <div className="trail__when">
              <b>{stageLabel(worldId, moment.stage)}</b>
              <span>{eventLabel(worldId, moment.type)}</span>
              <span className="trail__step">Step {index + 1} of {trail.moments.length}</span>
            </div>
            <ul className="trail__judgements">
              {moment.judgements.map((judgement) => (
                <li key={`${judgement.evidenceRequirementId}-${judgement.reason}`} data-superseded={judgement.superseded}>
                  <b>{judgement.label}</b>
                  <span className="trail__level">{levelLabel(levelReading(judgement))}</span>
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
    </details>
  );
}

/**
 * The two records, together, for anywhere that wants the whole of §19's chain in one place.
 *
 * The student evidence page renders the two halves in their own regions now — the judgements
 * are what a teacher reads and argues with, the transcript is the audit trail behind them —
 * so this is the composition rather than the layout.
 */
export function EvidenceTrailPanel({ submission, onOverride }: {
  submission: SubmissionRecord;
  /** Absent where this teacher cannot write to the class. Reading never requires it. */
  onOverride: ((override: OverrideRequest) => Promise<boolean>) | null;
}) {
  return (
    <>
      <JudgementRecord submission={submission} onOverride={onOverride} />
      <TrailRecord submission={submission} />
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
        {/* Grouped by level rather than labelled row by row. Ten chips each ending "— Right
            first time" is the same word ten times and the eye stops reading it; the level is
            the heading, the count is beside it, and the chips are the work. */}
        <div className="student-summary__could">
          <p className="field-label">What they did</p>
          {did.length > 0 ? LEVEL_ORDER.flatMap((level) => {
            const group = did.filter((judgement) => (readAs(judgement) ?? "null") === level);
            if (group.length === 0) return [];
            return [(
              <div key={String(level)}>
                <p className="field-label">{levelLabel(level === "null" ? null : level)} · {group.length}</p>
                <ul className="student-summary__chips" data-tone="good">
                  {group.map((judgement) => <li key={judgement.evidenceRequirementId}>{judgement.label}</li>)}
                </ul>
              </div>
            )];
          }) : <p className="class-state">Nothing reached this bar on this attempt.</p>}
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
