import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { WorldArt } from "../components/primitives/WorldArt";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { educatorClassError, isClassError, type Assignment } from "../platform/classes/types";
import { ASSIGNMENT_TITLE_MAX, compatibleWorldsFor, CLOSING_QUESTION_MAX } from "../platform/classes/assignments";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";
import type { WorldId } from "../domain/core/ids";
import { isAssessable, labelsFor, standardByRef, standardsIn, type FrameworkId, type StandardRef } from "../domain/standards";
import { Attribution, matches, objectivePath, refOf, waitingCompetenciesFor } from "./ObjectivePages";
import { evidencePreviewFor } from "./evidencePreview";
import { SUGGESTED_CLOSING } from "./MyClasses";
import { useRememberedClasses } from "./useRememberedClasses";
import { teacherToken } from "./teacherSession";
import { TERMS } from "./labels";
import "./assignment-shell.css";

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
type TargetMode = "everyone" | "selected";

interface BuilderRosterRow {
  seatCode: string;
  displayName: string;
  removedAt: number | null;
}

type RosterState =
  | { status: "idle" | "loading" }
  | { status: "ready"; rows: BuilderRosterRow[] }
  | { status: "error"; message: string };

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
  const compatible = objectiveRef === null ? compatibleWorldsFor(null) : assessable ? compatibleWorldsFor(objectiveRef) : [];

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
  const [title, setTitle] = useState("");
  const [closingText, setClosingText] = useState("");
  const [closingRequired, setClosingRequired] = useState(false);
  const [targetMode, setTargetMode] = useState<TargetMode>("everyone");
  const [selectedSeats, setSelectedSeats] = useState<readonly string[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [rosterState, setRosterState] = useState<RosterState>({ status: "idle" });

  /**
   * The seat picker is a view of the live roster, not of names remembered by this page.
   * Changing classes starts a fresh read, and a row removed while the builder was open is
   * dropped from the selection as soon as the service answers.
   */
  useEffect(() => {
    if (!selectedClass) { setRosterState({ status: "idle" }); return; }
    let cancelled = false;
    setRosterState({ status: "loading" });
    void (async () => {
      try {
        const token = teacherToken();
        const response = await fetch(`${CLASS_API_BASE}/classes/${selectedClass.code}/roster`, {
          headers: {
            "X-BOW-Teacher-Key": selectedClass.teacherKey,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(isClassError(payload) ? educatorClassError(payload.error) : educatorClassError("unavailable"));
        const rows = Array.isArray((payload as { roster?: unknown })?.roster)
          ? ((payload as { roster: BuilderRosterRow[] }).roster).filter((row) => !row.removedAt)
          : [];
        if (cancelled) return;
        const active = new Set(rows.map((row) => row.seatCode));
        setSelectedSeats((current) => current.filter((seat) => active.has(seat)));
        setRosterState({ status: "ready", rows });
      } catch (error) {
        if (!cancelled) setRosterState({
          status: "error",
          message: error instanceof Error ? error.message : educatorClassError("unavailable"),
        });
      }
    })();
    return () => { cancelled = true; };
  }, [selectedClass?.code, selectedClass?.teacherKey]);

  function chooseClass(nextCode: string) {
    setClassCode(nextCode);
    setTargetMode("everyone");
    setSelectedSeats([]);
    setStudentQuery("");
  }

  function toggleSeat(seatCode: string) {
    setSelectedSeats((current) => current.includes(seatCode)
      ? current.filter((seat) => seat !== seatCode)
      : [...current, seatCode]);
  }

  function selectAllSeats() {
    if (rosterState.status !== "ready") return;
    setSelectedSeats(rosterState.rows.map((row) => row.seatCode));
  }

  const [publishing, setPublishing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [created, setCreated] = useState<{ assignment: Assignment; classCode: string; classLabel: string } | null>(null);

  const blockedReason = !selectedClass
    ? (classes.length === 0 ? `You need a class first.` : `Choose a class.`)
    : objectiveRef && !assessable
        ? `BOW cannot assess ${standard?.code ?? "this"} yet, so there is nothing to publish.`
        : compatible.length === 0
          ? `No ${TERMS.story} can prove it produces every part ${standard?.code ?? "this"} needs, so this cannot be published.`
          : selectedWorlds.length === 0
            ? `Keep at least one ${TERMS.story} checked.`
            : targetMode === "selected" && rosterState.status === "loading"
              ? "Getting the class list…"
              : targetMode === "selected" && rosterState.status === "error"
                ? "The class list did not load. Choose everyone or try again."
                : targetMode === "selected" && selectedSeats.length === 0
                  ? "Choose at least one student, or assign it to everyone."
            : null;
  const canPublish = blockedReason === null;

  async function publish() {
    if (!canPublish || publishing || !selectedClass) return;
    setPublishing(true);
    setProblem(null);
    try {
      const body: Record<string, unknown> = {
        objectiveRef,
        allowedWorldIds: selectedWorlds,
        studentChoosesWorld: mode === CHOOSE,
        assignedStudentIds: targetMode === "everyone" ? null : [...new Set(selectedSeats)],
        ...(title.trim().length > 0 ? { title: title.trim() } : {}),
        ...(dueLocal && !Number.isNaN(new Date(dueLocal).getTime()) ? { dueAt: new Date(dueLocal).getTime() } : {}),
        ...(closingText.trim().length > 0 ? { closingQuestion: { text: closingText.trim(), required: closingRequired } } : {}),
      };
      const token = teacherToken();
      const response = await fetch(`${CLASS_API_BASE}/classes/${selectedClass.code}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BOW-Teacher-Key": selectedClass.teacherKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
  const worldSummary = selectedWorlds
    .map((worldId) => PLAYABLE_WORLDS.find((entry) => entry.id === worldId)?.title ?? worldId)
    .join(", ");
  const targetSummary = targetMode === "everyone"
    ? "Everyone"
    : `${selectedSeats.length} selected ${selectedSeats.length === 1 ? "student" : "students"}`;
  const visibleRoster = rosterState.status === "ready"
    ? rosterState.rows.filter((row) => {
      const query = studentQuery.trim().toLowerCase();
      return query.length === 0 || row.displayName.toLowerCase().includes(query) || row.seatCode.includes(query);
    })
    : [];

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">New assignment</p>
        <h1>Choose the experience. Set the work.</h1>
        <p>The challenge comes first. Pick the class and students next; add teaching details only when they help.</p>
      </header>

      <ol className="builder-flow" aria-label="Assignment builder steps">
        <li><span>1</span><b>Challenge</b><small>Choose the experience</small></li>
        <li><span>2</span><b>Students</b><small>Choose the class and audience</small></li>
        <li><span>3</span><b>Teaching details</b><small>Add only what helps</small></li>
        <li><span>4</span><b>Review</b><small>Check and publish</small></li>
      </ol>

      <div className="builder-layout">
        <div className="builder-main">
          <fieldset className="builder-section builder-challenge">
            <legend>1. Challenge</legend>
            <p>Choose what students will enter. Start with one shared experience, or let them choose between compatible stories.</p>
            {compatible.length === 0 ? (
              <p className="builder-stories__empty">
                No {TERMS.story} in BOW can produce every part {standard?.code ?? "this learning goal"} needs.
                Choose another learning goal below, or set no learning goal.
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
                <div className="builder-mode">
                  {compatible.length > 1 ? (
                    <>
                      <label className="builder-mode__card" data-selected={mode === ONE}>
                        <input type="radio" name="builder-mode" checked={mode === ONE} onChange={() => setModeAndAdjust(ONE)} />
                        <span><b>Assign one {TERMS.story}</b>Every student plays the same one.</span>
                      </label>
                      <label className="builder-mode__card" data-selected={mode === CHOOSE}>
                        <input type="radio" name="builder-mode" checked={mode === CHOOSE} onChange={() => setModeAndAdjust(CHOOSE)} />
                        <span><b>Let students choose</b>Students choose from the {TERMS.stories} checked above.</span>
                      </label>
                    </>
                  ) : (
                    <p>Only this {TERMS.story} matches the selected learning goal, so everyone plays it.</p>
                  )}
                </div>
              </>
            )}
          </fieldset>

          <fieldset className="builder-section builder-class builder-targets">
            <legend>2. Class and students</legend>
            {classes.length === 0 ? (
              <p>
                {syncing ? "Getting your classes…" : (
                  <>You need a class first. <Link to="/educator/classes/new">Create one</Link>, then come back here.</>
                )}
              </p>
            ) : (
              <>
                <label htmlFor="builder-class-select">Class</label>
                <select id="builder-class-select" value={selectedClass?.code ?? ""} onChange={(event) => chooseClass(event.target.value)}>
                  {classes.map((entry) => <option key={entry.code} value={entry.code}>{entry.label} · {entry.code}</option>)}
                </select>
                <div className="builder-targets__choices" role="radiogroup" aria-label="Who gets this assignment">
                  <label className="builder-mode__card" data-selected={targetMode === "everyone"}>
                    <input type="radio" name="builder-target" checked={targetMode === "everyone"} onChange={() => setTargetMode("everyone")} />
                    <span><b>Everyone in {selectedClass?.label ?? "this class"}</b>New and existing students in this class get the assignment.</span>
                  </label>
                  <label className="builder-mode__card" data-selected={targetMode === "selected"}>
                    <input
                      type="radio"
                      name="builder-target"
                      checked={targetMode === "selected"}
                      disabled={rosterState.status === "ready" && rosterState.rows.length === 0}
                      onChange={() => setTargetMode("selected")}
                    />
                    <span><b>Selected students</b>Use the live class list to choose particular seats.</span>
                  </label>
                </div>
                {rosterState.status === "loading" && <p className="class-state" aria-live="polite">Getting the class list…</p>}
                {rosterState.status === "error" && <p className="builder-goal__warn">{rosterState.message}</p>}
                {rosterState.status === "ready" && rosterState.rows.length === 0 && (
                  <p className="class-state">This class has no active roster yet. Everyone still works; add a class list before targeting individual students.</p>
                )}
                {targetMode === "selected" && rosterState.status === "ready" && rosterState.rows.length > 0 && (
                  <div className="builder-targets__picker">
                    <div className="builder-targets__toolbar">
                      <label htmlFor="builder-student-search">Search students</label>
                      <input
                        id="builder-student-search"
                        type="search"
                        value={studentQuery}
                        placeholder="Name or seat"
                        onChange={(event) => setStudentQuery(event.target.value)}
                      />
                      <div className="builder-targets__bulk">
                        <Button type="button" variant="quiet" onClick={selectAllSeats}>Select all</Button>
                        <Button type="button" variant="quiet" onClick={() => setSelectedSeats([])}>Clear</Button>
                        <strong aria-live="polite">{selectedSeats.length} selected</strong>
                      </div>
                    </div>
                    <div className="builder-targets__roster" role="group" aria-label="Choose students">
                      {visibleRoster.map((row) => (
                        <label key={row.seatCode}>
                          <input
                            type="checkbox"
                            checked={selectedSeats.includes(row.seatCode)}
                            onChange={() => toggleSeat(row.seatCode)}
                          />
                          <span><b>{row.displayName}</b><small>Seat {row.seatCode}</small></span>
                        </label>
                      ))}
                      {visibleRoster.length === 0 && <p className="class-state">No student matches “{studentQuery}”.</p>}
                    </div>
                  </div>
                )}
              </>
            )}
          </fieldset>

          <details className="builder-options">
            <summary>3. Optional teaching details</summary>
            <p>Add a title, connect a learning goal, set a due date, or ask one closing question.</p>

            <fieldset className="builder-section builder-title">
              <legend>Assignment title</legend>
              <label htmlFor="builder-title">Title (optional)</label>
              <input
                id="builder-title"
                type="text"
                value={title}
                maxLength={ASSIGNMENT_TITLE_MAX}
                placeholder={worldSummary || "Decision challenge"}
                aria-describedby="builder-title-count"
                onChange={(event) => setTitle(event.target.value)}
              />
              <p id="builder-title-count" className="builder-closing__count" aria-live="polite">
                {title.length} / {ASSIGNMENT_TITLE_MAX}
              </p>
            </fieldset>

            <fieldset className="builder-section builder-goal">
              <legend>Learning goal</legend>
              <p>Optional. Without one, students still play and you still receive their decision evidence.</p>
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
              ) : <p className="builder-goal__empty">No learning goal. Decision evidence still comes back.</p>}
              <label htmlFor="builder-goal-search">Search {unit}s</label>
              <input
                id="builder-goal-search"
                type="search"
                value={goalQuery}
                onChange={(event) => setGoalQuery(event.target.value)}
                placeholder="budget, credit, insurance…"
              />
              <div className="builder-goal__list" role="radiogroup" aria-label={`Choose a ${unit}`}>
                <label className="builder-goal__row">
                  <input type="radio" name="builder-goal" value="" checked={objectiveCode === ""} onChange={() => setObjectiveCode("")} />
                  <span><b>No learning goal</b><small>Keep the assignment focused on the challenge.</small></span>
                </label>
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
                      <span><b>{entry.code} · {entry.shortLabel}</b>{!ok && <em>Coming</em>}</span>
                    </label>
                  );
                })}
                {shownStandards.length === 0 && <p className="class-state">No {unit} matches “{goalQuery}”.</p>}
              </div>
            </fieldset>

            <fieldset className="builder-section builder-class builder-due">
              <legend>Due date</legend>
              <label htmlFor="builder-due">Due date (optional)</label>
              <input id="builder-due" type="datetime-local" value={dueLocal} onChange={(event) => setDueLocal(event.target.value)} />
              <p className="builder-class__note">
                {dueLocal && dueDateSummary(dueLocal)
                  ? `Shown to you as due ${dueDateSummary(dueLocal)}. BOW does not lock the assignment at this time.`
                  : "Leave this empty for no due date."}
              </p>
            </fieldset>

            <fieldset className="builder-section builder-closing">
              <legend>Closing question</legend>
              <p>Optional. BOW stores the answer beside the work and never marks it.</p>
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
                  <Button key={suggestion} type="button" variant="quiet" aria-describedby="builder-closing-suggestions" onClick={() => setClosingText(suggestion)}>
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
          </details>

          <div className="builder-actions">
            <Button type="button" aria-disabled={!canPublish || publishing} onClick={() => void publish()}>
              {publishing ? "Publishing…" : "Publish assignment"}
            </Button>
            <p className={`builder-actions__status${problem ? " builder-actions__status--problem" : ""}`} aria-live="polite">
              {problem ?? blockedReason ?? "Ready to assign."}
            </p>
          </div>
        </div>

        <aside className="builder-preview" aria-label="Evidence preview and assignment review">
          <p className="eyebrow">4. Review</p>
          <h2>{title.trim() || worldSummary || "Assignment"}</h2>
          <dl className="builder-review">
            <div><dt>Challenge</dt><dd>{worldSummary || "Choose a challenge"}{mode === CHOOSE && selectedWorlds.length > 1 ? " · students choose" : ""}</dd></div>
            <div><dt>Class</dt><dd>{selectedClass?.label ?? "Choose a class"}</dd></div>
            <div><dt>Students</dt><dd>{targetSummary}</dd></div>
            <div><dt>Learning goal</dt><dd>{standard ? `${standard.code} · ${standard.shortLabel}` : "None"}</dd></div>
            <div><dt>Due</dt><dd>{dueLocal && dueDateSummary(dueLocal) ? dueDateSummary(dueLocal) : "No due date"}</dd></div>
            <div><dt>Closing question</dt><dd>{closingText.trim() || "None"}</dd></div>
          </dl>
          <details className="builder-evidence">
            <summary>Evidence preview</summary>
            {!objectiveRef && <p>No learning goal selected. BOW still returns the decisions and explanations from the challenge.</p>}
            {objectiveRef && !assessable && <p>BOW cannot assess {standard?.code ?? "this"} yet, so there is nothing to preview.</p>}
            {objectiveRef && assessable && compatible.length === 0 && <p>No {TERMS.story} produces this, so there is nothing to preview.</p>}
            {objectiveRef && assessable && compatible.length > 0 && (
              <>
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
                {preview.every((skill) => skill.requirements.every(
                  (row) => selectedWorlds.every((worldId) => row.producedBy.includes(worldId)),
                )) && (
                  <p className="builder-preview__every">
                    {selectedWorlds.length === 1
                      ? `The ${TERMS.story} you are offering raises every part above.`
                      : `${selectedWorlds.length === 2 ? "Both" : `All ${selectedWorlds.length}`} ${TERMS.stories} raise every part above.`}
                  </p>
                )}
                <p className="builder-preview__note">BOW reports each named requirement on its own; it never combines them into one score.</p>
              </>
            )}
          </details>
        </aside>
      </div>
    </EducatorShell>
  );
}
