import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { WorldArt } from "../components/primitives/WorldArt";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { educatorClassError, isClassError, type Assignment } from "../platform/classes/types";
import { compatibleWorldsFor, CLOSING_QUESTION_MAX } from "../platform/classes/assignments";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";
import type { WorldId } from "../domain/core/ids";
import { isAssessable, labelsFor, standardByRef, standardsIn, type FrameworkId, type StandardRef } from "../domain/standards";
import { Attribution, matches, objectivePath, refOf, waitingCompetenciesFor } from "./ObjectivePages";
import { evidencePreviewFor } from "./evidencePreview";
import { SUGGESTED_CLOSING } from "./MyClasses";
import { useRememberedClasses } from "./useRememberedClasses";
import { TERMS } from "./labels";

/**
 * The assignment builder — a real route, built to the reference's six sections, with the
 * reference's own worst idea (four world cards shown as compatible with no visible basis) and
 * best idea (an evidence preview beside the builder, generated rather than authored) both
 * held to account against the code rather than against the mockup.
 *
 * Three sections the reference shows are not here, and each absence is a decision rather than
 * an oversight:
 *
 *   - **A due date exists, and "Save draft" does not.** `Assignment.dueAt` is a real,
 *     optional, round-tripping field (`readAssignmentRequest`) — a date picker was worth
 *     building because there is now something for it to write to. A draft is not: publishing
 *     is the only write this record has ever supported, and a button that looked like it saved
 *     a draft while silently discarding it on navigation would be worse than no button.
 *   - **No required-checkpoint section.** The reference's "Decision Debrief · After major
 *     decisions" is a mid-run gate no world's stage machine can honour today — neither
 *     `STAGE_ORDER` nor the market's own stages have a hook a teacher's setting could attach
 *     to. Drawing the control and quietly doing nothing with it is the exact failure this
 *     build is not allowed to ship, so the section is omitted rather than faked.
 *   - **No coverage percentage, no composite score, no authored evidence timeline.** The
 *     evidence preview is a table of this objective's own required parts against which
 *     offered story actually raises each one (`evidencePreview.ts`), because that is the
 *     furthest this data can honestly go.
 */

const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";

const CHOOSE = "choose" as const;
const ONE = "one" as const;
type Mode = typeof CHOOSE | typeof ONE;

/** "1 October 2026, 3:30 pm" from a `datetime-local` input's own value, read back for the summary line. */
function dueDateSummary(local: string): string {
  const ms = local ? new Date(local).getTime() : Number.NaN;
  if (!local || Number.isNaN(ms)) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(ms));
}

export function AssignmentBuilder() {
  const [params] = useSearchParams();
  const requestedObjective = params.get("objective");
  const requestedClass = params.get("classCode");

  const { classes, syncing } = useRememberedClasses();
  const standards = standardsIn(FRAMEWORK_ID);
  const labels = labelsFor(FRAMEWORK_ID);
  const unit = labels?.unitNounShort.toLowerCase() ?? "objective";

  const [goalQuery, setGoalQuery] = useState("");
  const [objectiveCode, setObjectiveCode] = useState(() => {
    if (requestedObjective && standardByRef({ frameworkId: FRAMEWORK_ID, code: requestedObjective })) return requestedObjective;
    return standards.find((standard) => isAssessable(refOf(standard)))?.code ?? "";
  });

  /**
   * The class a teacher has picked, or the honest default while their list is still arriving.
   *
   * `classes` loads asynchronously — the account-first merge in `useRememberedClasses` can
   * still be in flight on first paint — so this cannot be settled once at `useState`'s
   * initialiser and left alone. It is computed fresh every render instead of chased with an
   * effect: a teacher's own explicit pick (`classCode` state, once it names a real class) wins,
   * the class the URL arrived holding is next, and the first known class is the fallback. None
   * of that needs a second render to take effect, and nothing here calls `setState` outside an
   * event handler.
   */
  const [classCode, setClassCode] = useState(() => requestedClass ?? "");
  const selectedClass = classes.find((entry) => entry.code === classCode)
    ?? (requestedClass ? classes.find((entry) => entry.code === requestedClass) : undefined)
    ?? classes[0]
    ?? null;

  const objectiveRef: StandardRef | null = objectiveCode ? { frameworkId: FRAMEWORK_ID, code: objectiveCode } : null;
  const standard = objectiveRef ? standardByRef(objectiveRef) : undefined;
  const assessable = objectiveRef ? isAssessable(objectiveRef) : false;
  const waiting = objectiveRef && !assessable ? waitingCompetenciesFor(objectiveRef) : [];
  const compatible = assessable && objectiveRef ? compatibleWorldsFor(objectiveRef) : [];

  /**
   * Which stories are offered, and how — reset only when the chosen objective itself changes.
   *
   * This is "adjusting state when a prop changes" in React's own sense, done the way React's
   * docs ask for it: compared against a stored previous value **during render**, not inside a
   * `useEffect`. An effect here would run *after* the objective-changed render had already
   * committed with last objective's stories still checked, which is one extra paint of a
   * teacher looking at Food Truck's card checked under Basketball's own objective — small, and
   * exactly the kind of thing a screenshot review is supposed to catch and usually does not.
   */
  const [priorObjectiveCode, setPriorObjectiveCode] = useState(objectiveCode);
  const [mode, setMode] = useState<Mode>(compatible.length > 1 ? CHOOSE : ONE);
  const [selectedWorlds, setSelectedWorlds] = useState<readonly WorldId[]>(compatible);
  if (objectiveCode !== priorObjectiveCode) {
    setPriorObjectiveCode(objectiveCode);
    setSelectedWorlds(compatible);
    setMode(compatible.length > 1 ? CHOOSE : ONE);
  }

  function setModeAndAdjust(next: Mode) {
    setMode(next);
    setSelectedWorlds((current) => {
      if (next === CHOOSE) return compatible;
      if (current.length === 1 && compatible.includes(current[0]!)) return current;
      return compatible[0] ? [compatible[0]] : [];
    });
  }

  function toggleWorld(id: WorldId) {
    if (mode === ONE) { setSelectedWorlds([id]); return; }
    setSelectedWorlds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  const [dueLocal, setDueLocal] = useState("");
  const [closingText, setClosingText] = useState("");
  const [closingRequired, setClosingRequired] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [created, setCreated] = useState<{ assignment: Assignment; classCode: string; classLabel: string } | null>(null);

  const blockedReason = !selectedClass
    ? (classes.length === 0 ? `You need a class first.` : `Choose a class.`)
    : !objectiveRef
      ? `Choose a learning goal.`
      : !assessable
        ? `BOW cannot assess ${standard?.code ?? "this"} yet, so there is nothing to publish.`
        : compatible.length === 0
          ? `No ${TERMS.story} can prove it produces every part ${standard?.code ?? "this"} needs, so this cannot be published.`
          : selectedWorlds.length === 0
            ? `Keep at least one ${TERMS.story} checked.`
            : null;
  const canPublish = blockedReason === null;

  async function publish() {
    if (!canPublish || publishing || !selectedClass || !objectiveRef) return;
    setPublishing(true);
    setProblem(null);
    try {
      const body: Record<string, unknown> = {
        objectiveRef,
        allowedWorldIds: selectedWorlds,
        studentChoosesWorld: mode === CHOOSE,
        ...(dueLocal && !Number.isNaN(new Date(dueLocal).getTime()) ? { dueAt: new Date(dueLocal).getTime() } : {}),
        ...(closingText.trim().length > 0 ? { closingQuestion: { text: closingText.trim(), required: closingRequired } } : {}),
      };
      const response = await fetch(`${CLASS_API_BASE}/classes/${selectedClass.code}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": selectedClass.teacherKey },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setProblem(isClassError(payload) ? educatorClassError(payload.error) : educatorClassError("unavailable"));
        return;
      }
      setCreated({ assignment: payload as Assignment, classCode: selectedClass.code, classLabel: selectedClass.label });
    } catch {
      setProblem(educatorClassError("unavailable"));
    } finally {
      setPublishing(false);
    }
  }

  if (created) {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">{created.classLabel}</p>
          <h1>Assignment set.</h1>
          <p>
            Students in {created.classLabel} ({created.classCode}) can open it with the class code the moment
            you tell them to.
          </p>
        </header>
        <section className="dashboard-section builder-confirm">
          <Link className="button button--primary" to={`/educator/class/${created.classCode}`}>Open this class</Link>
          {/* A full navigation rather than a `Link` to the same route: this component's state
              is otherwise still holding the objective, the worlds and the closing question
              that were just published, and a teacher building a second assignment in the same
              class should start from a clean form, not from the one that just succeeded. */}
          <a className="button button--secondary" href={`/educator/assignments/new?classCode=${created.classCode}`}>
            Build another assignment
          </a>
        </section>
      </EducatorShell>
    );
  }

  const found = standards.filter((entry) => matches(entry, goalQuery));
  const shownStandards = [...found.filter((entry) => isAssessable(refOf(entry))), ...found.filter((entry) => !isAssessable(refOf(entry)))];
  const preview = objectiveRef && assessable ? evidencePreviewFor(objectiveRef, compatible) : [];

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">New assignment</p>
        <h1>Build an assignment.</h1>
        <p>Pick a learning goal, and BOW shows only the {TERMS.stories} that can actually prove it.</p>
      </header>

      <div className="builder-layout">
        <div className="builder-main">
          {/* 1. Learning goal */}
          <fieldset className="builder-section builder-goal">
            <legend>1. Learning goal</legend>
            {standard ? (
              <div className="builder-goal__selected">
                <span className="coverage-chip" data-coverage={assessable ? "full" : "none"}>{standard.code}</span>
                <p className="builder-goal__text">{standard.text}</p>
                <div className="builder-goal__meta">
                  <Attribution frameworkId={FRAMEWORK_ID} />
                  <Link to={objectivePath(refOf(standard))}>View this {unit} →</Link>
                </div>
                {!assessable && (
                  <p className="builder-goal__warn">
                    BOW cannot assess this {unit} yet.
                    {waiting.length > 0 && (
                      <> It rests on {waiting.length === 1 ? "a skill" : "skills"} no {TERMS.story} produces yet:
                        {" "}{waiting.map((competency) => competency.statement).join("; ")}.
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : <p className="builder-goal__empty">Choose a {unit} below.</p>}

            <label htmlFor="builder-goal-search">Search {unit}s</label>
            <input
              id="builder-goal-search"
              type="search"
              value={goalQuery}
              onChange={(event) => setGoalQuery(event.target.value)}
              placeholder="budget, credit, insurance…"
            />
            <div className="builder-goal__list" role="radiogroup" aria-label={`Choose a ${unit}`}>
              {shownStandards.map((entry) => {
                const ok = isAssessable(refOf(entry));
                return (
                  <label key={entry.code} className="builder-goal__row" data-unavailable={!ok}>
                    <input
                      type="radio"
                      name="builder-goal"
                      value={entry.code}
                      checked={objectiveCode === entry.code}
                      onChange={() => setObjectiveCode(entry.code)}
                    />
                    <span>
                      <b>{entry.code} · {entry.shortLabel}</b>
                      {!ok && <em>Coming</em>}
                    </span>
                  </label>
                );
              })}
              {shownStandards.length === 0 && <p className="class-state">No {unit} matches “{goalQuery}”.</p>}
            </div>
          </fieldset>

          {/* 2. Which story */}
          {objectiveRef && assessable && (
            <fieldset className="builder-section builder-mode">
              <legend>2. Which {TERMS.story}</legend>
              {compatible.length > 1 ? (
                <>
                  <label className="builder-mode__card" data-selected={mode === CHOOSE}>
                    <input type="radio" name="builder-mode" checked={mode === CHOOSE} onChange={() => setModeAndAdjust(CHOOSE)} />
                    <span>
                      <b>Let students choose</b>
                      Students pick from the {TERMS.stories} you keep checked below. Whichever one they pick, the
                      same skills come back to you.
                    </span>
                  </label>
                  <label className="builder-mode__card" data-selected={mode === ONE}>
                    <input type="radio" name="builder-mode" checked={mode === ONE} onChange={() => setModeAndAdjust(ONE)} />
                    <span>
                      <b>Assign one {TERMS.story}</b>
                      Every student plays the same one.
                    </span>
                  </label>
                </>
              ) : (
                <p>
                  Only one {TERMS.story} can prove it produces {standard?.code}'s evidence today, so every student
                  plays it.
                </p>
              )}
            </fieldset>
          )}

          {/* 3. Stories */}
          {objectiveRef && assessable && (
            <fieldset className="builder-section builder-stories">
              <legend>3. Stories</legend>
              {compatible.length === 0 ? (
                <p className="builder-stories__empty">
                  No {TERMS.story} in BOW can prove it produces every part {standard?.code} needs. This {unit}
                  cannot be published as an assignment yet.
                </p>
              ) : (
                <>
                  <div className="builder-stories__grid">
                    {compatible.map((worldId) => {
                      const entry = PLAYABLE_WORLDS.find((row) => row.id === worldId);
                      const checked = selectedWorlds.includes(worldId);
                      return (
                        <label key={worldId} className="builder-story-card" data-world={worldId} data-selected={checked}>
                          <input
                            type={mode === ONE ? "radio" : "checkbox"}
                            name={mode === ONE ? "builder-story" : undefined}
                            checked={checked}
                            onChange={() => toggleWorld(worldId)}
                          />
                          <span className="world-card">
                            <span className="world-card__art"><WorldArt world={worldId} variant="tile" /></span>
                            <span className="world-card__body">
                              <b>{entry?.title ?? worldId}</b>
                              <small>{entry?.role}</small>
                              <span className="builder-story-card__length">
                                {entry?.durationMinutes.min}–{entry?.durationMinutes.max} minutes
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="builder-stories__note">
                    Every {TERMS.story} shown here is proven, in code, to produce every part {standard?.code} needs
                    on its own.
                  </p>
                </>
              )}
            </fieldset>
          )}

          {/* 4. Class & due date */}
          <fieldset className="builder-section builder-class">
            <legend>4. Class & due date</legend>
            {classes.length === 0 ? (
              <p>
                {syncing ? "Getting your classes…" : (
                  <>You need a class first. <Link to="/educator/classes/new">Create one</Link>, then come back here.</>
                )}
              </p>
            ) : (
              <>
                <label htmlFor="builder-class-select">Class</label>
                <select id="builder-class-select" value={selectedClass?.code ?? ""} onChange={(event) => setClassCode(event.target.value)}>
                  {classes.map((entry) => <option key={entry.code} value={entry.code}>{entry.label} · {entry.code}</option>)}
                </select>
                <label htmlFor="builder-due">Due date (optional)</label>
                <input id="builder-due" type="datetime-local" value={dueLocal} onChange={(event) => setDueLocal(event.target.value)} />
                <p className="builder-class__note">
                  {dueLocal && dueDateSummary(dueLocal)
                    ? `Shown to you as due ${dueDateSummary(dueLocal)}. BOW does not lock the assignment at this time.`
                    : "Leave this empty for no due date."}
                </p>
              </>
            )}
          </fieldset>

          {/* 5. Closing question. The reference's own §5, "Required checkpoints", sits between
              this and the class picker and is not built — see the file-level comment for why —
              so the numbering here runs 1–5 rather than skipping a gap a teacher would have no
              way to explain. */}
          <fieldset className="builder-section builder-closing">
            <legend>5. Closing question</legend>
            <p>
              Asked once, after the {TERMS.story} is finished. It is your question — BOW stores the answer beside
              their work and never marks it, and it changes nothing about the skills reported.
            </p>
            <label htmlFor="builder-closing-text">Your question</label>
            <textarea
              id="builder-closing-text"
              value={closingText}
              maxLength={CLOSING_QUESTION_MAX}
              rows={3}
              placeholder="Leave this empty to ask nothing."
              aria-describedby="builder-closing-count"
              onChange={(event) => setClosingText(event.target.value)}
            />
            <p id="builder-closing-count" className="builder-closing__count" aria-live="polite">
              {closingText.length} / {CLOSING_QUESTION_MAX}
            </p>
            <p className="builder-closing__suggest">
              <span id="builder-closing-suggestions">Or take one of these and change it:</span>
              {SUGGESTED_CLOSING.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="quiet"
                  aria-describedby="builder-closing-suggestions"
                  onClick={() => setClosingText(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </p>
            <label className="builder-closing__required">
              <input
                type="checkbox"
                checked={closingRequired}
                disabled={closingText.trim().length === 0}
                onChange={(event) => setClosingRequired(event.target.checked)}
              />
              <span>They have to answer it before they can turn in</span>
            </label>
          </fieldset>

          <div className="builder-actions">
            <Button type="button" aria-disabled={!canPublish || publishing} onClick={() => void publish()}>
              {publishing ? "Publishing…" : "Publish assignment"}
            </Button>
            <p className={`builder-actions__status${problem ? " builder-actions__status--problem" : ""}`} aria-live="polite">
              {problem ?? blockedReason ?? "Ready to publish."}
            </p>
          </div>
        </div>

        {/* The evidence preview. Generated from `evidencePreview.ts` alone — the objective's
            own skills, their own required parts, and a real coverage row for every "Yes" a
            teacher sees here. Nothing below this line is a sample. */}
        <aside className="builder-preview" aria-label="Evidence preview">
          <h2>What this will produce</h2>
          {!objectiveRef && <p>Choose a learning goal to see what BOW will measure.</p>}
          {objectiveRef && !assessable && <p>BOW cannot assess {standard?.code ?? "this"} yet, so there is nothing to preview.</p>}
          {objectiveRef && assessable && compatible.length === 0 && <p>No {TERMS.story} produces this, so there is nothing to preview.</p>}
          {objectiveRef && assessable && compatible.length > 0 && (
            <>
              {/* A list, not a matrix.
                  It was a table with one column per offered story, and in a 320px rail that
                  set "Run the Pop-Up" over three lines and pushed the answers off the right
                  edge — so the one thing the panel exists to say was the thing you had to
                  scroll to find. It was also the least informative shape available: with the
                  stories BOW ships today every cell reads "Yes", and a wall of Yes teaches a
                  teacher to stop reading it.
                  So the common case is stated once, in a sentence, and the table's job is
                  taken over by an exception list. A story that does NOT raise a row is the
                  only thing a teacher has to act on, and it is now the only thing marked. */}
              <ul className="builder-preview__skills">
                {preview.map((skill) => (
                  <li key={skill.competencyId}>
                    <h3>{skill.statement}</h3>
                    <ul className="builder-preview__rows">
                      {skill.requirements.map((row) => {
                        const offeredMissing = selectedWorlds.filter((worldId) => !row.producedBy.includes(worldId));
                        return (
                          <li key={row.requirement.id} data-gap={offeredMissing.length > 0}>
                            <span className="builder-preview__row">
                              {row.requirement.label}
                              <small> · {row.requirement.kind === "decision" ? "from what they did" : "from what they wrote"}</small>
                            </span>
                            {offeredMissing.length > 0 && (
                              <span className="builder-preview__gap">
                                Not raised by {offeredMissing
                                  .map((worldId) => PLAYABLE_WORLDS.find((entry) => entry.id === worldId)?.title ?? worldId)
                                  .join(", ")}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              {/* The sentence the table used to make a teacher derive from a grid of "Yes" —
                  and it is only printed when it is true. A gap above is marked on its own row,
                  and claiming parity underneath it would be the whole panel lying. */}
              {preview.every((skill) => skill.requirements.every(
                (row) => selectedWorlds.every((worldId) => row.producedBy.includes(worldId)),
              )) && (
                <p className="builder-preview__every">
                  {selectedWorlds.length === 1
                    ? `The ${TERMS.story} you are offering raises every part above.`
                    : `${selectedWorlds.length === 2 ? "Both" : `All ${selectedWorlds.length}`} ${TERMS.stories} you are offering raise every part above, so a class that splits still comes back as one set of skills.`}
                </p>
              )}
              <p className="builder-preview__note">
                Every row above is {TERMS.requirement} of {standard?.code}, and only that. BOW never combines them
                into one score — each is reported to you on its own.
              </p>
            </>
          )}
        </aside>
      </div>
    </EducatorShell>
  );
}
