import { Link, useParams, useSearchParams } from "react-router-dom";
import { EducatorShell, StateKey } from "./EducatorShell";
import { useClassEvidence } from "./useClassEvidence";
import { classRoll, seatList, type StudentRow } from "./analysis";
import { seatLabel, seatNames } from "./names";
import { formatDollars } from "../domain/core/money";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { MINIMUM_RESULTS_FOR_CLASS_NARRATION } from "../domain/competency/objectiveState";
import { GAP_THRESHOLD_PERCENT, type TeachNextReading } from "../domain/competency/teachNext";
import type { AttributedSubmission } from "../platform/classes/types";
import { classSpineFrom, type ClassSpine } from "./classSpine";
import { studentSpineFor } from "./studentSpine";
import { levelLabel, skillStateKey, SKILL_STATE_LABELS, TERMS } from "./labels";

/**
 * The debrief. What to say to the room after they have all finished.
 *
 * This is a first-class output rather than a report: a teacher should be able to open it,
 * read down it, and run twenty minutes of discussion from it without preparing anything.
 * Everything on it is drawn from this class — the two contrasting plans are two real
 * students, the prompts are earned by something the class actually disagreed about, and
 * what it says to review is the same requirement reading the objective page prescribes from.
 *
 * That last point is the whole of §4 below. This page used to roll the evidence up to
 * concept level and print "nothing here needs reteaching" for a class the objective page was
 * prescribing a twelve-minute reteach for, because a failed required requirement disappears
 * inside a concept that passed on the others. Both surfaces now read `classSpineFrom`, so
 * disagreeing is no longer something they can do.
 *
 * It prints. A teacher standing at the front of a room is not holding a laptop.
 */
export function Debrief() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { state } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  if (state.status === "loading") {
    return <EducatorShell measure="read"><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell measure="read">
        <header className="page-header"><p className="eyebrow">Debrief</p><h1>This class did not open.</h1><p>{state.message}</p></header>
      </EducatorShell>
    );
  }

  const { analysis, record, assignments, submissions, roster } = state;
  const names = seatNames(roster);
  const nameFor = (seatCode: string) => seatLabel(seatCode, names);
  // The class, counted the way every other surface counts it. This was `analysis.rows.length`
  // — one per submission record — so the page a teacher prints and reads aloud told a room of
  // twenty-two that twenty-three of them had finished.
  const roll = classRoll({ rows: analysis.rows, roster: state.roster, progress: state.progress });
  const total = roll.rows.length;

  if (total === 0) {
    return (
      <EducatorShell measure="read">
        <header className="page-header">
          <p className="eyebrow">{record.label} · Debrief</p>
          <h1>Nothing to debrief yet.</h1>
          <p>No runs turned in yet. The debrief opens when work arrives.</p>
        </header>
        <Link className="button button--secondary" to={`/educator/class/${record.code}${keyQuery}`}>Back to the class</Link>
      </EducatorShell>
    );
  }

  const spine = classSpineFrom({ record, assignments, submissions });
  // The Ladder-3 words this debrief actually prints, for the key at the foot of §2. A
  // printed page is the one surface a teacher cannot click for a definition.
  const contrastStates = analysis.worlds
    .flatMap((world) => world.contrast ?? [])
    .flatMap((row) => {
      const submission = submissions.find((entry) => entry.sessionId === row.sessionId);
      return submission ? [studentSpineFor(submission).lead] : [];
    });

  return (
    <EducatorShell measure="read">
      <article className="debrief">
        <header className="debrief__head">
          <p className="eyebrow">{[record.label, ...analysis.worlds.map((world) => world.title)].join(" · ")}</p>
          <h1>Debrief</h1>
          <p className="lede">
            {total} {total === 1 ? "student" : "students"} finished. <DebriefLead spine={spine} />
          </p>
          <div className="debrief__actions no-print">
            <Link className="button button--secondary" to={`/educator/class/${record.code}${keyQuery}`}>Back to the class</Link>
            <button type="button" className="button button--primary" onClick={() => window.print()}>Print this debrief</button>
          </div>
        </header>

        <section className="debrief__section">
          <h2>1 · Open with the disagreement</h2>
          {!spine.narratable ? (
            <p>
              Under {MINIMUM_RESULTS_FOR_CLASS_NARRATION} results, this opens on the plans below rather than on
              anything about the class.
            </p>
          ) : analysis.worlds.every((world) => world.prompts.length === 0) ? (
            <p>Nothing this class did splits it, so there is no disagreement to open on.</p>
          ) : (
            /* One list per world, because the questions are the world's own. A class where
               students chose differently disagreed about two different sets of things, and
               printing one set under both names was how seven market students came to be
               told they had all made the same call. */
            analysis.worlds.map((world) => (
              <div key={world.worldId} className="debrief__world">
                {analysis.worlds.length > 1 && <p className="eyebrow">{world.title} · {world.seats} {world.seats === 1 ? "student" : "students"}</p>}
                {world.prompts.length === 0
                  ? <p>Nothing these {world.seats} did splits them.</p>
                  : (
                    <ol className="debrief__prompts">
                      {world.prompts.map((prompt) => (
                        <li key={prompt.id}>
                          <p className="debrief__ask">“{prompt.prompt}”</p>
                          <p className="debrief__because">{prompt.because}</p>
                        </li>
                      ))}
                    </ol>
                  )}
              </div>
            ))
          )}
        </section>

        <section className="debrief__section">
          <h2>2 · Put two real plans side by side</h2>
          {analysis.worlds.map((world) => (
            <div key={world.worldId}>
              {analysis.worlds.length > 1 && <p className="eyebrow">{world.title}</p>}
              {world.contrast ? (
                <div className="debrief__contrast">
                  {world.contrast.map((row) => (
                    <ContrastCard key={row.sessionId} row={row} submissions={submissions} />
                  ))}
                </div>
              ) : (
                <p>
                  {world.seats < 2
                    ? `One student ran ${world.title}, so there is no second plan to set beside it yet.`
                    : world.worldId === "food-truck"
                      ? "Take two market plans off the class page and read them side by side — the decisions are there and their own words are below."
                      : "Every finished plan made the same calls. Ask what would have made another plan the better one."}
                </p>
              )}
            </div>
          ))}
          <StateKey title="What these words mean" entries={skillStateKey(contrastStates)} />
        </section>

        <section className="debrief__section">
          <h2>3 · What changed when it went wrong</h2>
          {analysis.worlds.map((world) => (
            <div key={world.worldId}>
              {analysis.worlds.length > 1 && <p className="eyebrow">{world.title} · {world.seats} {world.seats === 1 ? "student" : "students"}</p>}
              {!world.adaptation ? <p>Nothing to report for {world.title} yet.</p> : (
                <>
                  <p className="debrief__because">{world.adaptation.heading}</p>
                  {world.adaptation.cuts.length > 0 && (
                    <ul className="debrief__list">
                      {world.adaptation.cuts.map((entry) => (
                        <li key={entry.label}>
                          <b>{entry.seats.length} of {world.seats}</b> cut <strong>{entry.label}</strong> first
                          <span> — {seatList(entry.seats)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <ul className="debrief__list">
                    {world.adaptation.lines.map((line) => (
                      <li key={line.label}><b>{line.count} of {world.seats}</b> {line.label.toLowerCase()}.</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </section>

        <section className="debrief__section">
          <h2>4 · What to review</h2>
          <WhatToReview spine={spine} classCode={record.code} keyQuery={keyQuery} />
        </section>

        <section className="debrief__section">
          <h2>5 · Read these explanations aloud</h2>
          {/* Real student writing, unedited, and never machine-scored. Taken per world and
              capped per world: this used to be the first four rows in seat order, and market
              seats sort last, so in a mixed class half the room's writing could never appear
              on the one page a teacher reads out. */}
          {analysis.worlds.every((world) => world.quotes.length === 0) ? (
            <p>No written explanations have come in yet.</p>
          ) : (
            analysis.worlds.map((world) => (
              <div key={world.worldId}>
                {analysis.worlds.length > 1 && <p className="eyebrow">{world.title}</p>}
                {world.quotes.length === 0 ? <p>Nobody who ran {world.title} has written yet.</p> : (
                  <ul className="debrief__quotes">
                    {world.quotes.slice(0, 4).map((quote) => (
                      <li key={quote.seatCode}>
                        <blockquote>{quote.text}</blockquote>
                        <cite>{nameFor(quote.seatCode)}</cite>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </section>
      </article>
    </EducatorShell>
  );
}

/** The same figure the class page leads with, and never a share the denominator cannot carry. */
function DebriefLead({ spine }: { spine: ClassSpine }) {
  if (!spine.reading || spine.assessed === 0) {
    return <>Nobody has a usable result yet{spine.awaitingReading > 0 ? `, because ${spine.awaitingReading} of the written explanations have not been read` : ""}.</>;
  }
  if (spine.reading.result.percentDemonstrated === null) {
    return <>{spine.reading.result.demonstrated} of {spine.assessed} assessed showed it.</>;
  }
  return <>{spine.reading.result.percentDemonstrated}% of the {spine.assessed} assessed students showed it.</>;
}

/**
 * §18, said to a room instead of to a dashboard.
 *
 * Same module, same denominator, same requirement, same counts as the objective page and the
 * class page. Where those two render the lesson in full, this renders the sentence a teacher
 * says out loud and links to the rest.
 */
function WhatToReview({ spine, classCode, keyQuery }: { spine: ClassSpine; classCode: string; keyQuery: string }) {
  const reading: TeachNextReading | null = spine.reading?.teachNext ?? null;
  if (!reading || reading.state === "not-assessed") {
    return (
      <p>
        Nobody has a usable result yet, so there is nothing to review from.
        {spine.awaitingReading > 0 && ` ${spine.awaitingReading} written ${spine.awaitingReading === 1 ? "explanation is" : "explanations are"} still to read.`}
      </p>
    );
  }
  if (reading.state === "too-few-assessed") {
    return (
      <p>
        {reading.assessed} {reading.assessed === 1 ? "student has" : "students have"} a usable result. Under
        {" "}{MINIMUM_RESULTS_FOR_CLASS_NARRATION}, BOW does not name a lesson for the class.{" "}
        <Link to={`/educator/class/${classCode}${keyQuery}`}>The counts are on the class page.</Link>
      </p>
    );
  }
  if (reading.state === "no-single-gap") {
    return (
      <p>
        Nothing the work had to show reached {GAP_THRESHOLD_PERCENT}% of the {reading.assessed} assessed
        students. The class is spread across small issues rather than one shared misunderstanding — review
        individual students.
      </p>
    );
  }
  const top = reading.top!;
  return (
    <>
      <p>
        <b>{top.struggled} of {reading.assessed}</b> assessed students did not show “{top.label.toLowerCase()}”.
        {top.notObserved > 0 && ` A further ${top.notObserved} were never asked it.`}
      </p>
      {reading.reteach ? (
        <>
          <p><b>{reading.reteach.title}.</b> {reading.reteach.focus}</p>
          <ol className="debrief__list">
            {reading.reteach.moves.map((move) => <li key={move}>{move}</li>)}
          </ol>
          <p>About {reading.reteach.minutes} minutes.</p>
        </>
      ) : (
        <p>
          BOW names no misconception behind this one, so there is no reteach to hand you.
          {" "}{TERMS.Requirement} is: {top.observableRule.charAt(0).toLowerCase()}{top.observableRule.slice(1)}.
        </p>
      )}
      <p className="no-print">
        <Link to={`/educator/class/${classCode}${keyQuery}`}>The students who need it are on the class page.</Link>
      </p>
    </>
  );
}

function ContrastCard({ row, submissions }: { row: StudentRow; submissions: readonly AttributedSubmission[] }) {
  const place = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === row.setupId);
  const submission = submissions.find((entry) => entry.sessionId === row.sessionId);
  const spine = submission ? studentSpineFor(submission) : null;
  return (
    <article className="debrief__plan">
      <p className="eyebrow">Seat {row.seatCode}</p>
      <h3>{place?.title ?? "No place chosen"}</h3>
      <dl>
        <div><dt>Course seat</dt><dd>{row.reservedSeat ? "Reserved early" : "Waited"}</dd></div>
        <div><dt>Saturdays</dt><dd>{row.tookClinics ? "Coached the clinics" : "Kept them"}</dd></div>
        <div><dt>Counted the bonus</dt><dd>{row.countedBonusInPlan ? "Yes" : "No"}</dd></div>
        {CHOICE_ORDER.map((category) => (
          <div key={category}>
            <dt>{CHOICE_LABELS[category]}</dt>
            <dd className="money">{row.final ? formatDollars(row.final[category]) : "—"}</dd>
          </div>
        ))}
      </dl>
      {row.resolution && (
        <p className="debrief__outcome">
          {row.resolution.attendanceHeld ? "Made every session." : `Lost the bonus in Week ${row.resolution.bonusLostWeek}.`}
          {" "}
          {row.resolution.courseFunded ? "Course paid." : `${formatDollars(row.resolution.courseShort)} short of the course.`}
          {" Ends holding "}{formatDollars(row.resolution.endCash)}.
        </p>
      )}
      {/* The same reading as the class list and this student's own page. */}
      {spine && (
        <p className="debrief__status">
          {SKILL_STATE_LABELS[spine.lead]}
          {spine.shortfalls[0] && ` · ${spine.shortfalls[0].label} — ${levelLabel(spine.shortfalls[0].level)}`}
        </p>
      )}
    </article>
  );
}
