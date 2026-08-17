import { useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { EducatorShell } from "./EducatorShell";
import { competencyById } from "../domain/competency/competencies";
import type { CompetencyId } from "../domain/competency/types";
import {
  competenciesFor,
  FRAMEWORKS,
  demandFor,
  isAssessable,
  isCompetencyAvailable,
  labelsFor,
  standardByRef,
  standardsIn,
  type FrameworkId,
  type Standard,
  type StandardRef,
} from "../domain/standards";
import { MINIMUM_ASSESSED_FOR_A_STATE, type ObjectiveResult } from "../domain/competency/objectiveState";
import { rememberedClasses } from "./classMemory";
import { useObjectiveEvidence } from "./useObjectiveEvidence";
import type { ObjectiveClassResult } from "./objectiveResults";
import { COMPETENCY_STATE_LABELS, OBJECTIVE_STATE_LABELS } from "./labels";
import { TeachNext } from "./TeachNext";

/**
 * The teacher's way in: find the objective, see what it would assess, set it, read it back.
 *
 * Three screens and no fourth. Everything a teacher can be told about a framework is
 * composed from `FrameworkLabels`, so a New York teacher reads New York's words because New
 * York's framework supplies them and not because this file knows who they are. Students
 * never reach any of it; nothing under `/educator` is on a student route.
 */

/** The framework this deployment sets work against. One today; a second is a row in FRAMEWORKS. */
const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";

function refOf(standard: Standard): StandardRef {
  return { frameworkId: standard.frameworkId, code: standard.code };
}

function objectivePath(ref: StandardRef): string {
  return `/educator/objectives/${ref.frameworkId}/${ref.code}`;
}

/** Matches on the code, BOW's handle, the official wording and the topic — whichever a teacher types. */
function matches(standard: Standard, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [standard.code, standard.shortLabel, standard.text, standard.topicName]
    .some((field) => field.toLowerCase().includes(needle));
}

function Attribution({ frameworkId }: { frameworkId: FrameworkId }) {
  const framework = FRAMEWORKS[frameworkId];
  if (!framework) return null;
  return (
    <p className="framework-attribution">
      {framework.labels.attribution}{" "}
      <a href={framework.sourceUrl} rel="noreferrer noopener" target="_blank">{framework.name}</a>{" "}
      · wording checked {framework.verifiedOn}
    </p>
  );
}

// ---------------------------------------------------------------------------
// /educator/objectives — the searchable list
// ---------------------------------------------------------------------------

export function ObjectiveList() {
  const [query, setQuery] = useState("");
  const labels = labelsFor(FRAMEWORK_ID);
  const standards = useMemo(() => standardsIn(FRAMEWORK_ID), []);
  const shown = standards.filter((standard) => matches(standard, query));
  const ready = shown.filter((standard) => isAssessable(refOf(standard)));
  const coming = shown.filter((standard) => !isAssessable(refOf(standard)));
  const readyTotal = standards.filter((standard) => isAssessable(refOf(standard))).length;

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">{labels?.frameworkShort} · {labels?.unitNoun}s</p>
        <h1>What do you want to assess?</h1>
        <p>
          BOW can assess {readyTotal} of the {standards.length} in this framework today. The rest are matched to a
          skill and waiting for a challenge that can observe it.
        </p>
      </header>

      {/* What a teacher can actually do, first and in full. A search box over twenty-three
          entries of which one is usable puts the product's coverage above the teacher's job. */}
      <section className="dashboard-section">
        <div className="section-head">
          <h2>Ready to assign</h2>
        </div>
        <div className="row-list">
          {ready.map((standard) => (
            <Link key={standard.code} to={objectivePath(refOf(standard))}>
              <div>
                <small>{standard.code} · {standard.topicName}</small>
                <h3>{standard.shortLabel}</h3>
                <small>{standard.text}</small>
              </div>
            </Link>
          ))}
        </div>
        {ready.length === 0 && <p className="class-state">Nothing you can assign matches “{query}”.</p>}
      </section>

      {/* The rest are mapped and waiting for a world. They are listed, because a teacher
          planning a year needs to know what is not here — quietly, because a list of what a
          product cannot do is not the first thing it should say about itself. */}
      {(coming.length > 0 || query.trim().length > 0) && (
        <section className="dashboard-section">
          <div className="section-head">
            <h2>Mapped, not yet assessable</h2>
            <p>
              BOW knows which skill sits behind each of these and cannot observe {coming.length === 1 ? "it" : "them"} yet.
              {" "}{coming.length === 1 ? "It reports" : "They report"} as coming, never as nobody having
              demonstrated {coming.length === 1 ? "it" : "them"}.
            </p>
          </div>
          <div className="class-form">
            <label htmlFor="objective-search">Search {labels?.unitNounShort.toLowerCase()}s</label>
            <input
              id="objective-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="budget, credit, insurance…"
              aria-describedby="objective-search-count"
            />
            <p id="objective-search-count" className="class-state" aria-live="polite">
              {shown.length} of {standards.length} shown · {ready.length} ready to assign
            </p>
          </div>
          <ul className="coming-list">
            {coming.map((standard) => (
              <li key={standard.code}>
                <Link to={objectivePath(refOf(standard))}>
                  <span className="coming-list__code">{standard.code}</span>{standard.shortLabel}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="dashboard-section"><Attribution frameworkId={FRAMEWORK_ID} /></section>
    </EducatorShell>
  );
}

// ---------------------------------------------------------------------------
// /educator/objectives/:frameworkId/:code — detail, Results only
// ---------------------------------------------------------------------------

/**
 * The one number, and what §10.7 says must sit beside it.
 *
 * The denominator is never optional and the state is refused below the minimum: "3 of 3
 * assessed" is a true sentence and "Needs attention" derived from those three is a claim
 * about the twenty-five nobody assessed. Zero submissions reads *not yet assessed* rather
 * than 0%, because nobody failed anything.
 */
function ResultHeadline({ result, submitted, awaitingReading }: { result: ObjectiveResult; submitted: number; awaitingReading: number }) {
  if (result.state === "not-assessed") {
    // Two different silences, and telling a teacher the wrong one is worse than saying
    // nothing. Nobody has started, or everybody has and their writing is still on the
    // teacher's desk — this used to print the first sentence in both cases, directly above
    // a count of three submissions.
    return (
      <div className="objective-result">
        <strong>Not yet assessed</strong>
        <span>
          {submitted === 0
            ? "Nobody has turned work in for this yet."
            : awaitingReading > 0
              ? `${submitted} turned in. Nobody is assessed until their writing has been read.`
              : `${submitted} turned in, and none of it reached this ${"objective"} yet.`}
        </span>
      </div>
    );
  }
  if (result.percentDemonstrated === null) {
    return (
      <div className="objective-result">
        <strong>{result.demonstrated} of {result.assessed} assessed</strong>
        <span>
          Under {MINIMUM_ASSESSED_FOR_A_STATE} students assessed, so BOW shows the count and not a
          class state — a share of {result.assessed} would read as a fact about the whole class.
        </span>
      </div>
    );
  }
  return (
    <div className="objective-result" data-state={result.state}>
      <strong>{result.percentDemonstrated}% demonstrated</strong>
      <span>{result.demonstrated} of {result.assessed} assessed · {OBJECTIVE_STATE_LABELS[result.state]}</span>
    </div>
  );
}

function ClassResult({ entry, onThisObjective }: { entry: ObjectiveClassResult; onThisObjective: readonly CompetencyId[] }) {
  const keyQuery = `?key=${rememberedClasses().find((known) => known.code === entry.record.code)?.teacherKey ?? ""}`;
  return (
    <article className="objective-class">
      <header>
        <div>
          <p className="eyebrow">{entry.record.code}</p>
          <h3>{entry.record.label}</h3>
        </div>
        <ResultHeadline result={entry.result} submitted={entry.submitted} awaitingReading={entry.awaitingReading} />
      </header>
      <p className="class-state">
        {entry.submitted} turned in
        {entry.awaitingReading > 0
          ? ` · ${entry.awaitingReading} written explanation${entry.awaitingReading === 1 ? "" : "s"} still to read. A student whose writing nobody has read yet is not counted as assessed.`
          : " · every written explanation read."}
      </p>
      {entry.competencies.length > 0 && (
        <table className="micro-table">
          <thead><tr><th scope="col">Skill</th><th scope="col">Where the class is</th></tr></thead>
          <tbody>
            {entry.competencies.filter((row) => onThisObjective.includes(row.competencyId)).map((row) => (
              <tr key={row.competencyId}>
                <th scope="row">{competencyById(row.competencyId)?.statement ?? row.competencyId}</th>
                <td>
                  {Object.entries(row.counts)
                    .filter(([, count]) => count > 0)
                    .map(([state, count]) => `${count} ${COMPETENCY_STATE_LABELS[state as keyof typeof COMPETENCY_STATE_LABELS]}`)
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* §18.1, in order: the number, then what the class could do, then the misconception,
          then the action, then the students. Never any of them without the ones above. */}
      <TeachNext
        reading={entry.teachNext}
        spotlight={entry.spotlight}
        classCode={entry.record.code}
        teacherKey={rememberedClasses().find((known) => known.code === entry.record.code)?.teacherKey ?? ""}
      />
      <Link className="button button--quiet" to={`/educator/class/${entry.record.code}${keyQuery}`}>Open this class’s evidence</Link>
    </article>
  );
}

export function ObjectiveDetail() {
  const params = useParams();
  const frameworkId = (params.frameworkId ?? FRAMEWORK_ID) as FrameworkId;
  const ref: StandardRef = { frameworkId, code: params.code ?? "" };
  const standard = standardByRef(ref);
  const labels = labelsFor(frameworkId);
  const assessable = standard ? isAssessable(ref) : false;
  const evidence = useObjectiveEvidence(standard ? ref : null);

  if (!standard) {
    return (
      <EducatorShell>
        <header className="page-header page-header--with-back">
          <Link to="/educator/objectives">← All {labels?.unitNounShort.toLowerCase() ?? "objective"}s</Link>
          <h1>No such {labels?.unitNounShort.toLowerCase() ?? "objective"}.</h1>
          <p>Nothing in this framework carries the code “{params.code}”.</p>
        </header>
      </EducatorShell>
    );
  }

  const covering = competenciesFor(frameworkId, standard.code);
  // Which skills this objective rests on that no built world can produce yet. Named, because
  // "coming" without a reason is a promise and this is a fact.
  const demand = demandFor(ref);
  const waiting = [...demand.allOf, ...demand.anyOf]
    .filter((competencyId) => !isCompetencyAvailable(competencyId))
    .flatMap((competencyId) => competencyById(competencyId) ?? []);

  /**
   * Twenty-two of the twenty-three are here, and there is nothing to report about any of
   * them. They used to render the whole detail page — a coverage table, a results section
   * and a line explaining that no class had been set an objective that cannot be set. This
   * is what is actually true about them: what it is, its own framework's sentence, and the
   * fact that BOW cannot assess it yet.
   */
  if (!assessable) {
    return (
      <EducatorShell>
        <header className="page-header page-header--with-back">
          <Link to="/educator/objectives">← All {labels?.unitNounShort.toLowerCase()}s</Link>
          <p className="eyebrow">{labels?.frameworkShort} {standard.code} · {standard.topicName}</p>
          <h1>{standard.shortLabel}</h1>
          {/* The official sentence, verbatim. `nysedWording.test.ts` asserts it character by
              character, and it is shown as a quotation because it is one. */}
          <blockquote className="objective-wording">{standard.text}</blockquote>
          <Attribution frameworkId={frameworkId} />
        </header>
        <section className="dashboard-section">
          <div className="objective-coming">
            {/* Authored prose, not a sentence concatenated around a statement that ends in
                its own full stop — which is what produced "…for that situation. — and no
                built world…" on every unavailable objective. */}
            <p>BOW cannot assess this {labels?.unitNounShort.toLowerCase()} yet.</p>
            {waiting.length > 0 && (
              <>
                <p>It rests on {waiting.length === 1 ? "this skill, and no world has been built that produces everything it asks for" : "these skills, and no world has been built that produces everything they ask for"}:</p>
                <ul>{waiting.map((competency) => <li key={competency.id}>{competency.statement}</li>)}</ul>
              </>
            )}
            <p className="objective-coming__exit">
              <Link className="button button--secondary" to="/educator/objectives">See what BOW can assess</Link>
            </p>
          </div>
        </section>
      </EducatorShell>
    );
  }

  return (
    <EducatorShell>
      <header className="page-header page-header--with-back">
        <Link to="/educator/objectives">← All {labels?.unitNounShort.toLowerCase()}s</Link>
        <p className="eyebrow">{labels?.frameworkShort} {standard.code} · {standard.topicName}</p>
        <h1>{standard.shortLabel}</h1>
        <blockquote className="objective-wording">{standard.text}</blockquote>
        <Attribution frameworkId={frameworkId} />
        {/* Wrapped rather than sitting directly under the header: `.page-header--with-back > a`
            paints its back-link in muted ink, and a primary button that inherited it failed
            contrast against its own dark fill. */}
        <p className="objective-actions">
          <Link className="button button--primary" to={`/educator/classes?objective=${standard.code}`}>Assign this</Link>
        </p>
      </header>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">What BOW measures for this</p>
          <h2>{covering.length} skill{covering.length === 1 ? "" : "s"} behind this {labels?.unitNounShort.toLowerCase()}</h2>
        </div>
        <table className="micro-table">
          <thead>
            <tr>
              <th scope="col">Skill</th>
              {/* Two different claims, and printing only the first is what made an
                  unassessable objective show the word "full". A mapping says how much of
                  this objective the skill covers; a world is what can actually observe it. */}
              <th scope="col">Covers</th>
              <th scope="col">World</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {covering.map((entry) => (
              <tr key={entry.competency.id}>
                <th scope="row"><code>{entry.competency.displayCode}</code> {entry.competency.statement}</th>
                <td><span className="coverage-chip" data-coverage={entry.coverage}>{entry.coverage}</span></td>
                <td>{isCompetencyAvailable(entry.competency.id) ? "Built" : "None yet"}</td>
                <td>{entry.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">Results</p>
          <h2>Your classes</h2>
        </div>
        {evidence.status === "loading" && <p className="class-state">Opening your classes…</p>}
        {evidence.status === "ready" && evidence.results.length === 0 && (
          <p className="class-state">
            No class opened on this computer has been set this {labels?.unitNounShort.toLowerCase()}.
            {evidence.classesRead === 0
              ? " There are no classes saved in this browser — create one, or open a class from its private link once."
              : ""}
          </p>
        )}
        {evidence.status === "ready" && evidence.results.map((entry) => <ClassResult key={entry.record.code} entry={entry} onThisObjective={covering.map((row) => row.competency.id)} />)}
      </section>
    </EducatorShell>
  );
}

// ---------------------------------------------------------------------------
// /educator/assign — the route that used to be a second way to do this
// ---------------------------------------------------------------------------

/**
 * There is one path to assigning work, and it is the classes page.
 *
 * The assign flow was a screen that named an objective, offered a class, and — if there was
 * no class — created one, which is what "Create a class" is. Two screens that both create a
 * class and set it an objective are two places for that to go wrong and two places a teacher
 * has to be told about. The objective travels in the URL; the classes page picks it up.
 */
export function AssignFlow() {
  const [params] = useSearchParams();
  const code = params.get("code");
  return <Navigate replace to={code ? `/educator/classes?objective=${code}` : "/educator/classes"} />;
}
