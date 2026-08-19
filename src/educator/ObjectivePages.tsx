import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { EducatorShell, StateKey } from "./EducatorShell";
import { competencyById } from "../domain/competency/competencies";
import type { CompetencyId, CompetencyResultState } from "../domain/competency/types";
import {
  competenciesFor,
  FRAMEWORKS,
  demandFor,
  gradeBandLabel,
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
import { classStateKey, skillStateKey, skillStateInSentence, CLASS_STATE_LABELS, COVERAGE_LABELS, TERMS } from "./labels";
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

/**
 * Every place a teacher is told which framework this is composes it here, once — including
 * the grade band. NYSED's own document publishes 70 objectives across three bands (K–4: 14,
 * 5–8: 23, 9–12: 33); this deployment carries only 5–8, and a count or a framework name
 * printed without that band reads as the whole document to a reviewer who opens the source
 * and counts 70.
 */
function Attribution({ frameworkId }: { frameworkId: FrameworkId }) {
  const framework = FRAMEWORKS[frameworkId];
  if (!framework) return null;
  return (
    <p className="framework-attribution">
      {framework.labels.attribution}{" "}
      <a href={framework.sourceUrl} rel="noreferrer noopener" target="_blank">{framework.name}</a>{" "}
      · {gradeBandLabel(frameworkId)} · wording checked {framework.verifiedOn}
    </p>
  );
}

// ---------------------------------------------------------------------------
// /educator/objectives — the searchable list
// ---------------------------------------------------------------------------

/**
 * One list, one honest column, one page.
 *
 * There used to be four surfaces showing this same set of twenty-three objectives:
 * `/educator/objectives`, the objective detail page, `/educator/map`, and the guide's own
 * alignment block. The map was the largest of them — a nine-value status filter, a class
 * filter, a topic filter and a Map/Table toggle, built to report on two assessable objectives
 * and twenty-one that read *coming*, over a teacher-maintained "MARKED TAUGHT" flag. Asking a
 * teacher to keep a record inside BOW about instruction BOW did not deliver is a planbook, and
 * a planbook is the LMS this product has a rule against becoming. It is gone.
 *
 * What was worth keeping is the answer it existed to give, which is also the first question a
 * district asks: **which of these can BOW actually assess, and which can it not.** That did
 * not need a route of its own. It is a column.
 *
 * So this is every objective in the framework, in the framework's own order, with one column
 * that says yes or not yet — and the search filters the one list rather than one of two. The
 * split into "Ready to assign" and "BOW cannot see these yet" was two lists of the same thing
 * with the search box stranded inside the second one, which is how a teacher looking for an
 * objective they can set ended up typing into the section headed with what BOW cannot do.
 */
export function ObjectiveList() {
  const [query, setQuery] = useState("");
  const labels = labelsFor(FRAMEWORK_ID);
  // Not memoised: it is a lookup over twenty-three static rows, and a hand-written useMemo
  // here stops the React Compiler optimising the whole component for no measurable gain.
  const standards = standardsIn(FRAMEWORK_ID);
  const readyTotal = standards.filter((standard) => isAssessable(refOf(standard))).length;
  const unit = labels?.unitNounShort.toLowerCase() ?? "objective";
  // One list, and the ones a teacher can act on today at the top of it. Not two sections —
  // that was the shape that stranded the search box inside the half headed with what BOW
  // cannot do — but not framework order either, which would make a teacher's first click
  // wrong twenty-two times out of twenty-three. The framework's own code is on every row and
  // the search reaches all of them, so nothing is harder to find for being lower down.
  const found = standards.filter((standard) => matches(standard, query));
  const shown = [
    ...found.filter((standard) => isAssessable(refOf(standard))),
    ...found.filter((standard) => !isAssessable(refOf(standard))),
  ];

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">{labels?.frameworkShort} · {gradeBandLabel(FRAMEWORK_ID)} · {labels?.unitNoun}s</p>
        <h1>What do you want to assess?</h1>
        <p>
          BOW can assess {readyTotal} of the {standards.length} {gradeBandLabel(FRAMEWORK_ID)} {unit}s in
          this framework today, and {readyTotal === 1 ? "it leads" : "they lead"} the list below. The rest are
          matched to a {TERMS.skill} and waiting for a {TERMS.story} that can show it. They report as coming,
          never as nobody having shown them.
        </p>
      </header>

      <section className="dashboard-section">
        <div className="class-form">
          <label htmlFor="objective-search">Search {unit}s</label>
          <input
            id="objective-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="budget, credit, insurance…"
            aria-describedby="objective-search-count"
          />
          <p id="objective-search-count" className="class-state" aria-live="polite">
            {shown.length} of {standards.length} shown · {shown.filter((standard) => isAssessable(refOf(standard))).length} BOW can assess
          </p>
        </div>

        {/* The whole framework, in its own order, with the one thing a teacher and a district
            both need to know beside each row. An objective BOW cannot see yet is still a link:
            its page says which skill sits behind it and what is missing, which is the question
            a teacher asks next. */}
        <div className="row-list">
          {shown.map((standard) => {
            const assessable = isAssessable(refOf(standard));
            return (
              <Link key={standard.code} to={objectivePath(refOf(standard))}>
                <div>
                  <small>{standard.code} · {standard.topicName}</small>
                  <h3>{standard.shortLabel}</h3>
                  {/* The honest column, on the row it is about. It uses the same chip the
                      objective detail page already uses for the same fact, so a teacher who
                      opens the row does not meet a second vocabulary for it. */}
                  <div><span className="coverage-chip" data-coverage={assessable ? "full" : "none"}>
                    {assessable ? "BOW can assess this" : "Coming"}
                  </span></div>
                  <small>{standard.text}</small>
                </div>
              </Link>
            );
          })}
        </div>
        {shown.length === 0 && <p className="class-state">No {unit} matches “{query}”.</p>}
      </section>
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
        <strong>{CLASS_STATE_LABELS["not-assessed"]}</strong>
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
      {/* The share and Ladder 4's sentence for it, in the same block. "83% demonstrated" was
          the last place on this page where the roll-up register survived — a Ladder-3 word
          sitting where the claim is about a room. */}
      <strong>{result.percentDemonstrated}% showed it</strong>
      <span>{result.demonstrated} of {result.assessed} assessed · {CLASS_STATE_LABELS[result.state]}</span>
    </div>
  );
}

/** `unit` is the framework's own word for the thing being reported on, composed by the caller. */
function ClassResult({ entry, onThisObjective, unit }: { entry: ObjectiveClassResult; onThisObjective: readonly CompetencyId[]; unit: string }) {
  const keyQuery = `?key=${rememberedClasses().find((known) => known.code === entry.record.code)?.teacherKey ?? ""}`;
  const shownSkills = entry.competencies.filter((row) => onThisObjective.includes(row.competencyId));
  const statesShown = shownSkills.flatMap((row) =>
    (Object.entries(row.counts) as [CompetencyResultState, number][]).filter(([, count]) => count > 0).map(([state]) => state));
  return (
    <article className="objective-class">
      <header>
        <div>
          <p className="eyebrow">{entry.record.code}</p>
          <h3>{entry.record.label}</h3>
        </div>
        <ResultHeadline result={entry.result} submitted={entry.submitted} awaitingReading={entry.awaitingReading} />
      </header>
      {/* The second clause is about a pile of writing, so it waits until there is one. A class
          nobody has started read "0 turned in · every written explanation read." — a finished
          marking pile that does not exist, directly under a headline saying nobody has turned
          anything in.

          It also used to say that a student whose writing nobody has read "is not counted as
          assessed", which is a rule, and this is not one: a usable result needs a level for
          everything the objective asks for, and where the run itself supplies them all — a
          student who closed their opening plan by naming the row that takes the remainder —
          the reading is not what is missing. Measured on a real class: seven turned in, two
          explanations unread, seven assessed, with that sentence printed between the two
          numbers contradicting it. What is true is the direction: reading can add to the
          count and can never take from it. */}
      <p className="class-state">
        {entry.submitted} turned in
        {entry.submitted === 0
          ? ""
          : entry.awaitingReading > 0
            ? ` · ${entry.awaitingReading} written explanation${entry.awaitingReading === 1 ? "" : "s"} still to read. Reading them can only add to the assessed count: unread writing is the most common reason a result is not usable yet.`
            : " · every written explanation read."}
      </p>
      {shownSkills.length > 0 && (
        <>
          <table className="micro-table">
            {/* The denominator these rows are actually counted over, said on the table
                rather than left to be inferred from the headline above it — which counts a
                different population. Every student who turned in lands in exactly one state
                per skill, with the ones nobody has assessed yet named as an absence rather
                than dropped, so the rows add up to the students who turned in and the
                headline adds up to the ones with a usable result. Uncaptioned, this table
                sat under "9 of 12 assessed" with rows totalling eighteen, and a teacher had
                two true numbers on one screen and no way to tell they were about two
                different sets of children. The class page states the same two facts in the
                same order, because it is the same table about the same class. */}
            <caption>
              Counts across all {entry.submitted} who turned in. {entry.result.assessed} of them have a
              usable result — nothing this {unit} asks of them is still missing.
            </caption>
            <thead><tr><th scope="col">Skill</th><th scope="col">Where the class is</th></tr></thead>
            <tbody>
              {shownSkills.map((row) => (
                <tr key={row.competencyId}>
                  <th scope="row">{competencyById(row.competencyId)?.statement ?? row.competencyId}</th>
                  {/* Counts of students, so the state words are Ladder 3 — each one is a
                      claim about one child, added up. The lowercase form is the same table
                      read for the tail of a sentence, not a second table. */}
                  <td>
                    {Object.entries(row.counts)
                      .filter(([, count]) => count > 0)
                      .map(([state, count]) => `${count} ${skillStateInSentence(state as CompetencyResultState)}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Once for this class block, for the words in the table above and the one in the
              headline — a Ladder-3 word about a child and a Ladder-4 word about the room sit
              within one scroll here, which is exactly where "Developing" used to mean both. */}
          <StateKey title="What these words mean, student by student" entries={skillStateKey(statesShown)} />
          <StateKey title="And the one about the whole class" entries={classStateKey([entry.result.state])} />
        </>
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
    // Two different unknowns, and one sentence used to speak for both: an unrecognised
    // *framework* id in the URL — the only way this route is actually reached wrong, since
    // every in-product link supplies a code that exists — produced "Nothing in this
    // framework carries the code 1.3," which blames the code for a framework this page
    // never resolved. The framework in the URL is checked first, because a wrong framework
    // id needs a different sentence than a framework that simply has no such code.
    const framework = FRAMEWORKS[frameworkId];
    return (
      <EducatorShell>
        <header className="page-header page-header--with-back">
          <Link to="/educator/objectives">← All {labels?.unitNounShort.toLowerCase() ?? "objective"}s</Link>
          {framework ? (
            <>
              <h1>No such {labels?.unitNounShort.toLowerCase()}.</h1>
              <p>{framework.name} carries no code “{params.code}”.</p>
            </>
          ) : (
            <>
              <h1>No such framework.</h1>
              <p>BOW does not carry a framework called “{params.frameworkId}”.</p>
            </>
          )}
        </header>
      </EducatorShell>
    );
  }

  const covering = competenciesFor(frameworkId, standard.code);
  // Which skills this objective rests on that neither story can produce yet. Named, because
  // "coming" without a reason is a promise and this is a fact.
  const demand = demandFor(ref);
  const waiting = [...demand.allOf, ...demand.anyOf]
    .filter((competencyId) => !isCompetencyAvailable(competencyId))
    .flatMap((competencyId) => competencyById(competencyId) ?? []);

  /**
   * Every objective BOW cannot assess is here, and there is nothing to report about any of
   * them. The count is deliberately not written down: it was "twenty-two of the twenty-three"
   * and then briefly twenty-one, and a number in a comment that has to be edited whenever the
   * mapping moves is a number that will one day be wrong on screen. They used to render the whole detail page — a coverage table, a results section
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
                <p>It rests on {waiting.length === 1 ? `this ${TERMS.skill}, and neither ${TERMS.story} asks a student for everything it needs` : `these ${TERMS.skills}, and neither ${TERMS.story} asks a student for everything they need`}:</p>
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
                  unassessable objective show the word "full". A mapping says how much of this
                  objective the skill covers; a story is what can actually show it.

                  Both columns used to print a raw enum under a one-word header — `full` /
                  `partial` / `supporting` under "Covers", and `Built` / `None yet` under
                  "World". The distinction is load-bearing: it is the difference between "a
                  student who shows this has met the standard" and "they have met some of
                  it", and nothing on the page said so. */}
              <th scope="col">How much of this {labels?.unitNounShort.toLowerCase()} it covers</th>
              <th scope="col">Can BOW see it yet?</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {covering.map((entry) => (
              <tr key={entry.competency.id}>
                {/* No `BOW-B2` badge. It is BOW's own handle for a skill, it appears nowhere
                    else a teacher can reach, and no key for it exists anywhere in the product
                    — a code with no key is a thing a reader has to ignore, printed on a page
                    they were told to hand to a department head. The skill's own sentence is
                    the name. */}
                <th scope="row">{entry.competency.statement}</th>
                <td><span className="coverage-chip" data-coverage={entry.coverage}>{COVERAGE_LABELS[entry.coverage]}</span></td>
                <td>{isCompetencyAvailable(entry.competency.id) ? "Yes" : "Not yet"}</td>
                <td>{entry.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Said once, here, where a teacher reading a negative result for 1.3 would land to
            find out why. BOW's bar for 1.3 is higher than NYSED's own — "not yet
            shown it" is a fact about BOW's stricter bar, not about NYSED's objective,
            and nothing else on this page or the results below it makes that distinction. */}
        {standard.code === "1.3" && (
          <p className="objective-bar-note">
            BOW’s bar here is higher than {labels?.frameworkShort}'s own. {labels?.frameworkShort} 1.3 asks only for a budget
            that fits a hypothetical income and includes planned expenses and savings; the skill above additionally
            requires conditional money handled correctly, savings set before discretionary spending, and a trade-off
            explained with one of the student's own numbers. A class that has not yet shown this has not
            failed {labels?.frameworkShort}'s 1.3 — they have not yet cleared BOW's stricter bar for it.
          </p>
        )}
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
        {evidence.status === "ready" && evidence.results.map((entry) => (
          <ClassResult
            key={entry.record.code}
            entry={entry}
            onThisObjective={covering.map((row) => row.competency.id)}
            unit={labels?.unitNounShort.toLowerCase() ?? "objective"}
          />
        ))}
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
