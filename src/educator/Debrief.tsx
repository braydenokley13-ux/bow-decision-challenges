import { Link, useParams, useSearchParams } from "react-router-dom";
import { EducatorShell } from "./EducatorShell";
import { useClassEvidence } from "./useClassEvidence";
import { seatList, type StudentRow } from "./analysis";
import { formatDollars } from "../domain/core/money";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { CONCEPTS } from "../domain/blueprint/concepts";
import { STATUS_LABELS } from "./labels";

/**
 * The debrief. What to say to the room after they have all finished.
 *
 * This is a first-class output rather than a report: a teacher should be able to open it,
 * read down it, and run twenty minutes of discussion from it without preparing anything.
 * Everything on it is drawn from this class — the two contrasting plans are two real
 * students, the prompts are earned by something the class actually disagreed about, and
 * the concepts flagged for review are the ones this class's evidence is short of.
 *
 * It prints. A teacher standing at the front of a room is not holding a laptop.
 */
export function Debrief() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { state } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell>
        <header className="page-header"><p className="eyebrow">Debrief</p><h1>This class did not open.</h1><p>{state.message}</p></header>
      </EducatorShell>
    );
  }

  const { analysis, record } = state;
  const total = analysis.rows.length;

  if (total === 0) {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">{record.label} · Debrief</p>
          <h1>There is nothing to debrief yet.</h1>
          <p>No student in class {record.code} has turned work in. A debrief built on no evidence would be a worksheet, so there is not one.</p>
        </header>
        <Link className="button button--secondary" to={`/educator/class/${record.code}${keyQuery}`}>Back to the class</Link>
      </EducatorShell>
    );
  }

  const needingReview = analysis.concepts.filter((concept) => concept.needsFollowUp.length > 0);

  return (
    <EducatorShell>
      <article className="debrief">
        <header className="debrief__head">
          <p className="eyebrow">{record.label} · {BASKETBALL_SCENARIO.title}</p>
          <h1>Debrief</h1>
          <p className="lede">
            {total} {total === 1 ? "student" : "students"} finished. Everything below comes from what they
            submitted — nothing here is a sample or an average of other classes.
          </p>
          <div className="debrief__actions no-print">
            <Link className="button button--secondary" to={`/educator/class/${record.code}${keyQuery}`}>Back to the class</Link>
            <button type="button" className="button button--primary" onClick={() => window.print()}>Print this debrief</button>
          </div>
        </header>

        <section className="debrief__section">
          <h2>1 · Open with the disagreement</h2>
          {analysis.prompts.length === 0 ? (
            <p>Not enough finished work yet to find a disagreement worth opening on.</p>
          ) : (
            <ol className="debrief__prompts">
              {analysis.prompts.map((prompt) => (
                <li key={prompt.id}>
                  <p className="debrief__ask">“{prompt.prompt}”</p>
                  <p className="debrief__because">{prompt.because}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="debrief__section">
          <h2>2 · Put two real plans side by side</h2>
          {analysis.contrast ? (
            <div className="debrief__contrast">
              {analysis.contrast.map((row) => <ContrastCard key={row.sessionId} row={row} />)}
            </div>
          ) : (
            <p>
              {total < 2
                ? "Only one student has finished, so there is no second plan to set beside it yet."
                : "Every finished plan made the same calls, so there is no contrast to draw. That is worth saying out loud — ask what would have made another plan the better one."}
            </p>
          )}
        </section>

        <section className="debrief__section">
          <h2>3 · What changed after Week 5</h2>
          {analysis.adaptation.cutFirst.length === 0 ? (
            <p>No student reduced any part of their plan after Week 5.</p>
          ) : (
            <>
              <p>When the money got tight, this is what went first:</p>
              <ul className="debrief__list">
                {analysis.adaptation.cutFirst.map((entry) => (
                  <li key={entry.category}>
                    <b>{entry.seats.length} of {total}</b> cut <strong>{entry.label.toLowerCase()}</strong> first
                    <span> — {seatList(entry.seats)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <ul className="debrief__list">
            <li><b>{analysis.adaptation.buffered.length} of {total}</b> had backup money that absorbed a loss they had planned for.</li>
            <li><b>{analysis.adaptation.leftUncovered.length} of {total}</b> finished with money still uncovered.</li>
            <li><b>{analysis.adaptation.unchanged.length} of {total}</b> landed a plan they never had to reduce.</li>
          </ul>
        </section>

        <section className="debrief__section">
          <h2>4 · What to review</h2>
          {needingReview.length === 0 ? (
            <p>Every concept is showing as demonstrated across this class. Nothing here needs reteaching.</p>
          ) : (
            <ul className="debrief__list">
              {needingReview.map((concept) => {
                const definition = CONCEPTS.find((item) => item.id === concept.conceptId);
                return (
                  <li key={concept.conceptId}>
                    <b>{concept.code} · {concept.label}</b>
                    <span> — {concept.needsFollowUp.length} of {total} still short ({seatList(concept.needsFollowUp)}).</span>
                    {definition && <span> Reteach hook: <code>{definition.reteachId}</code>.</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="debrief__section">
          <h2>5 · Read these explanations aloud</h2>
          {/* Real student writing, unedited, and never machine-scored. */}
          {analysis.rows.filter((row) => row.defense?.text.trim()).length === 0 ? (
            <p>No written explanations have come in yet.</p>
          ) : (
            <ul className="debrief__quotes">
              {analysis.rows
                .filter((row) => row.defense?.text.trim())
                .slice(0, 4)
                .map((row) => (
                  <li key={row.sessionId}>
                    <blockquote>{row.defense!.text}</blockquote>
                    <cite>Seat {row.seatCode}</cite>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </article>
    </EducatorShell>
  );
}

function ContrastCard({ row }: { row: StudentRow }) {
  const place = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === row.setupId);
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
      <p className="debrief__status">
        {row.result.concepts.map((concept) => `${concept.conceptId}: ${STATUS_LABELS[concept.status]}`).slice(0, 2).join(" · ")}
      </p>
    </article>
  );
}
