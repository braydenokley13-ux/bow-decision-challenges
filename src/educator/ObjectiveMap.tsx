import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EducatorShell } from "./EducatorShell";
import {
  districtProfile,
  FRAMEWORKS,
  labelsFor,
  NYSED_2026_TOPICS,
  type FrameworkId,
  type Standard,
} from "../domain/standards";
import { MINIMUM_ASSESSED_FOR_A_STATE, isResultState, type ObjectiveMapState } from "../domain/competency/objectiveState";
import { applyMapFilters, displayNameFor, NO_FILTERS, objectiveMapRows, type MapFilters, type ObjectiveMapRow } from "./objectiveMap";
import { useTeacherClasses } from "./useTeacherClasses";
import { MAP_STATE_LABELS, MAP_STATE_ORDER } from "./labels";

/**
 * The Objective Map — where a teacher stands against the whole requirement.
 *
 * It answers four questions and it is laid out in that order: what can BOW not assess yet,
 * what have I covered, what have students demonstrated, and what needs attention. Two views
 * of one dataset, and the choice is remembered because a teacher who prefers the table is
 * not asked again every Monday.
 *
 * **State is never carried by colour alone.** Every objective shows a mark whose *geometry*
 * differs — an open ring, a half-filled ring, a full disc — and the state word beside it.
 * A teacher printing the table in greyscale, or reading it with a colour vision difference,
 * loses nothing.
 */

const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";
const VIEW_KEY = "bow.educator.v1.map-view";

type MapView = "map" | "table";

function storedView(): MapView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "table" ? "table" : "map";
  } catch {
    return "map";
  }
}

/**
 * The state mark: one element, four geometries, and the word always beside it.
 *
 * `data-fill` drives how much of the ring is inked, which is what makes *strong* and
 * *developing* tell each other apart on a monochrome printout. The dashed ring is reserved
 * for the one state that is not about students at all.
 */
function StateMark({ state }: { state: ObjectiveMapState }) {
  return <span className="state-mark" data-state={state} aria-hidden="true" />;
}

function lastAssessedLabel(row: ObjectiveMapRow): string {
  if (row.lastAssessedAt === null) return "—";
  const when = new Date(row.lastAssessedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return row.stale ? `${when} · out of date` : when;
}

/** The count, or the share, or a dash — and never a share the denominator cannot carry. */
function demonstratedLabel(row: ObjectiveMapRow): string {
  if (!row.available) return "—";
  if (row.result.assessed === 0) return "—";
  if (row.result.percentDemonstrated === null) return `${row.result.demonstrated} of ${row.result.assessed}`;
  return `${row.result.percentDemonstrated}%`;
}

function assessedLabel(row: ObjectiveMapRow): string {
  if (row.submitted === 0) return "—";
  return `${row.result.assessed} of ${row.submitted}`;
}

// ---------------------------------------------------------------------------

export function ObjectiveMap() {
  const labels = labelsFor(FRAMEWORK_ID);
  const framework = FRAMEWORKS[FRAMEWORK_ID];
  const district = districtProfile();
  const { state, markTaught } = useTeacherClasses();

  const [view, setView] = useState<MapView>(storedView);
  // Read once, at mount. Staleness is a ninety-day line, so re-reading the clock on every
  // render buys nothing and makes the rows a moving target between paints.
  const [now] = useState(() => Date.now());
  const [classCode, setClassCode] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS);

  useEffect(() => {
    try { window.localStorage.setItem(VIEW_KEY, view); } catch { /* a locked-down browser is not a reason to fail */ }
  }, [view]);

  const classes = useMemo(() => (state.status === "ready" ? state.classes : []), [state]);
  const rows = useMemo(
    () => objectiveMapRows({ frameworkId: FRAMEWORK_ID, classes, classCode, now, ...(district ? { district } : {}) }),
    [classes, classCode, now, district],
  );
  const shown = applyMapFilters(rows, filters, district);
  const byCode = new Map(shown.map((row) => [row.standard.code, row]));
  // What a teacher can act on, and what is only on the list. The map leads with the first.
  const working = shown.filter((row) => row.available || row.markedTaught || row.submitted > 0);
  const waiting = shown.filter((row) => !working.includes(row));

  const taught = rows.filter((row) => row.markedTaught).length;
  const assessed = rows.filter((row) => row.result.assessed > 0).length;
  const needing = rows.filter((row) => row.state === "needs-attention").length;
  const assessable = rows.filter((row) => row.available).length;

  const unit = labels?.unitNounShort.toLowerCase() ?? "objective";

  return (
    <EducatorShell>
      {/* The hero used to open with COVERED 0 of 23 and BOW CANNOT ASSESS YET 22 — a
          product's coverage gap, in the largest type on the first screen a teacher saw. What
          belongs here is their own record: what they have taught, and what has come back. */}
      <header className="map-header">
        <div>
          <p className="eyebrow">{labels?.frameworkShort} · {framework?.version}</p>
          <h1>What your classes have covered.</h1>
        </div>
        <dl className="map-tally">
          <div><dt>Marked taught</dt><dd>{taught} of {rows.length}</dd></div>
          <div><dt>Assessed</dt><dd>{assessed} of {assessable}</dd></div>
          <div><dt>Need attention</dt><dd>{needing}</dd></div>
        </dl>
      </header>

      <div className="map-controls">
        <div className="map-filters">
          <label htmlFor="map-class">Class</label>
          <select id="map-class" value={classCode ?? ""} onChange={(event) => setClassCode(event.target.value || null)}>
            <option value="">All my classes</option>
            {classes.map((entry) => (
              <option key={entry.record.code} value={entry.record.code}>{entry.record.label} · {entry.record.code}</option>
            ))}
          </select>

          <label htmlFor="map-topic">{labels?.groupNoun}</label>
          <select id="map-topic" value={filters.topicCode ?? ""} onChange={(event) => setFilters({ ...filters, topicCode: event.target.value || null })}>
            <option value="">All</option>
            {NYSED_2026_TOPICS.map((topic) => <option key={topic.code} value={topic.code}>{topic.code}. {topic.name}</option>)}
          </select>

          <label htmlFor="map-state">Status</label>
          <select id="map-state" value={filters.state ?? ""} onChange={(event) => setFilters({ ...filters, state: (event.target.value || null) as ObjectiveMapState | null })}>
            <option value="">All</option>
            {MAP_STATE_ORDER.map((entry) => <option key={entry} value={entry}>{MAP_STATE_LABELS[entry]}</option>)}
          </select>

          {/* Term and required-subset come from a district profile. None is configured, so
              neither control is offered — a filter with nothing behind it is a dead end. */}
          {district && (
            <>
              <label htmlFor="map-term">Marking period</label>
              <select id="map-term" value={filters.term ?? ""} onChange={(event) => setFilters({ ...filters, term: event.target.value || null })}>
                <option value="">All</option>
                {[...new Set(district.sequence.map((entry) => entry.term))].map((term) => <option key={term} value={term}>{term}</option>)}
              </select>
              <label className="map-required">
                <input type="checkbox" checked={filters.requiredOnly} onChange={(event) => setFilters({ ...filters, requiredOnly: event.target.checked })} />
                Only what we require
              </label>
            </>
          )}
        </div>

        <div className="view-switch" role="group" aria-label="View">
          {(["map", "table"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)}>
              {option === "map" ? "Map" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && <p className="class-state map-note">Opening your classes…</p>}
      {state.status === "ready" && classes.length === 0 && (
        <p className="class-state map-note">
          No class is saved in this browser yet, so every {unit} below reads as untaught. Create a class,
          or open one from its private link once on this computer.
        </p>
      )}

      {view === "map" ? (
        <>
          <section className="topic-bands" aria-label={`${labels?.unitNounShort} map`}>
            {NYSED_2026_TOPICS.map((topic) => {
              const inTopic = working.filter((row) => row.standard.topicCode === topic.code);
              if (inTopic.length === 0) return null;
              return (
                <section key={topic.code} className="topic-band">
                  <h2><span className="topic-band__number">{topic.code}</span>{topic.name}</h2>
                  <ul>
                    {inTopic.map((row) => (
                      <li key={row.standard.code}>
                        <Link to={`/educator/objectives/${row.standard.frameworkId}/${row.standard.code}`} data-state={row.state}>
                          <span className="chip-code">{row.standard.code}</span>
                          <span className="chip-name">{displayNameFor(row.standard, district)}</span>
                          <span className="chip-state"><StateMark state={row.state} />{MAP_STATE_LABELS[row.state]}</span>
                          {isResultState(row.state) && row.result.percentDemonstrated !== null && (
                            <span className="chip-figure money">{row.result.percentDemonstrated}%<small>{row.result.demonstrated} of {row.result.assessed}</small></span>
                          )}
                          {row.state === "too-few-assessed" && (
                            <span className="chip-figure money">{row.result.demonstrated} of {row.result.assessed}<small>under {MINIMUM_ASSESSED_FOR_A_STATE} assessed</small></span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {working.length === 0 && <p className="class-state">No {unit} matches those filters.</p>}
          </section>

          {/* Mapped, and nothing can observe them yet. A teacher planning a year needs to
              know what is not here; it is not what the page is about. */}
          {waiting.length > 0 && (
            <section className="dashboard-section map-waiting">
              <div className="section-head">
                <h2>Not yet assessable</h2>
                <p>
                  {waiting.length} {waiting.length === 1 ? `${unit} is` : `${unit}s are`} matched to a skill BOW cannot
                  observe yet. {waiting.length === 1 ? "It reports" : "They report"} as coming, never as nobody having
                  demonstrated {waiting.length === 1 ? "it" : "them"}.
                </p>
              </div>
              <ul className="coming-list">
                {waiting.map((row) => (
                  <li key={row.standard.code}>
                    <Link to={`/educator/objectives/${row.standard.frameworkId}/${row.standard.code}`} data-state={row.state}>
                      <span className="coming-list__code">{row.standard.code}</span>
                      {displayNameFor(row.standard, district)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <section className="dashboard-section map-table-wrap">
          <table className="map-table">
            <caption>
              {labels?.frameworkShort} {labels?.unitNoun}s ·{" "}
              {classCode ? classes.find((entry) => entry.record.code === classCode)?.record.label : "All classes"}
            </caption>
            <thead>
              <tr>
                <th scope="col">{labels?.unitNounShort}</th>
                <th scope="col">Status</th>
                <th scope="col">Assessed</th>
                <th scope="col">Demonstrated</th>
                <th scope="col">Worlds</th>
                <th scope="col">Last assessed</th>
                <th scope="col">Next</th>
                <th scope="col">Taught</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <TableRow
                  key={row.standard.code}
                  row={row}
                  classCode={classCode}
                  onTaught={(taught) => (classCode ? markTaught(classCode, { frameworkId: row.standard.frameworkId, code: row.standard.code }, taught) : Promise.resolve(false))}
                />
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="class-state">No {unit} matches those filters.</p>}
        </section>
      )}

      <p className="framework-attribution map-note">
        {framework?.labels.attribution}{" "}
        <a href={framework?.sourceUrl} rel="noreferrer noopener" target="_blank">{framework?.name}</a>{" "}
        · wording checked {framework?.verifiedOn} · {byCode.size} of {rows.length} shown
      </p>
    </EducatorShell>
  );
}

/**
 * One printable row: the code, the framework's own sentence, and what happened.
 *
 * The official wording is in the row rather than behind a click because this table is meant
 * to be printed and handed to somebody — a code and a three-word handle is not a document a
 * department head can read.
 */
function TableRow({ row, classCode, onTaught }: {
  row: ObjectiveMapRow;
  classCode: string | null;
  onTaught: (taught: boolean) => Promise<boolean>;
}) {
  const standard: Standard = row.standard;
  const [pending, setPending] = useState<boolean | null>(null);
  // The tap wins until the record catches up with it, and the record wins from then on.
  // Nothing has to be cleared on a timer: once the two agree there is nothing to override.
  const taught = pending === null || pending === row.markedTaught ? row.markedTaught : pending;
  return (
    <tr data-state={row.state} data-stale={row.stale || undefined}>
      <th scope="row">
        <Link to={`/educator/objectives/${standard.frameworkId}/${standard.code}`}>
          <span className="map-table__code">{standard.code}</span> {standard.shortLabel}
        </Link>
        <span className="map-table__wording">{standard.text}</span>
      </th>
      <td><span className="map-table__status"><StateMark state={row.state} />{MAP_STATE_LABELS[row.state]}</span></td>
      <td className="money">{assessedLabel(row)}</td>
      <td className="money">{demonstratedLabel(row)}</td>
      <td className="money">{row.worlds}</td>
      <td>{lastAssessedLabel(row)}</td>
      {/* The map says where the class stands; the objective says what to do about it. A row
          that has a result carries the way through, so "needs attention" is a link to a
          lesson rather than a colour a teacher is left holding. */}
      <td>
        {isResultState(row.state) || row.state === "too-few-assessed"
          ? <Link className="map-table__next" to={`/educator/objectives/${standard.frameworkId}/${standard.code}`}>What to teach next →</Link>
          : <span className="map-table__none">—</span>}
      </td>
      <td>
        {/* Per class, so it is meaningless without one — and it is a teacher's own record,
            never derived from anything a student did (§15.3).

            It answers on the tap rather than after the round trip. A tick that springs back
            for a second while the service is asked reads as a control that did not work,
            and a teacher marking off a term's coverage taps this twenty times. */}
        <label className="taught-toggle">
          <input
            type="checkbox"
            checked={taught}
            disabled={!classCode}
            onChange={(event) => {
              const next = event.target.checked;
              setPending(next);
              // A service that refused takes the tick straight back, rather than leaving a
              // teacher's coverage record showing something that was never stored.
              void onTaught(next).then((ok) => { if (!ok) setPending(null); });
            }}
          />
          <span>{classCode ? (taught ? "Taught" : "Not taught") : "Pick a class"}</span>
        </label>
      </td>
    </tr>
  );
}
