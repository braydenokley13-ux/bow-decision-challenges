import { Link } from "react-router-dom";
import { MINIMUM_ASSESSED_FOR_A_STATE } from "../domain/competency/objectiveState";
import { GAP_THRESHOLD_PERCENT, type RequirementGap, type TeachNextReading } from "../domain/competency/teachNext";
import type { MisconceptionSpotlight } from "./misconceptions";

/**
 * "What should I teach next?" — §18, rendered in the order §18.1 fixes and in no other.
 *
 * 1. the number, with its denominator · 2. what the class could and could not do ·
 * 3. the misconception, named, with the class's own work under it · 4. the action, and why
 * this class · 5. the students, and what each of them specifically needs.
 *
 * *Never any of these without the ones above it.* That is why this component renders as one
 * ordered block rather than as cards a page could rearrange: the recommendation is only
 * safe to read after the evidence behind it, and a layout that let a teacher meet it first
 * would be a layout that let BOW skip its own reasoning.
 *
 * Nothing here is generated. Every sentence is a fixed template filled with a count that
 * came from real submissions, and every state that refuses to make a claim says why it is
 * refusing rather than going quiet.
 *
 * It takes a reading rather than a page's own data, because the class page and the objective
 * page render the same one. Two copies of this component would be two answers to "what
 * should I teach next?" for the same class.
 */

/** The counts behind every required requirement. The audit trail for the card above it. */
function GapTable({ gaps, assessed }: { gaps: readonly RequirementGap[]; assessed: number }) {
  return (
    <table className="micro-table next-lesson__gaps">
      <thead>
        <tr>
          <th scope="col">What the work had to show</th>
          <th scope="col">Did not show it</th>
          <th scope="col">Never asked</th>
        </tr>
      </thead>
      <tbody>
        {gaps.map((gap) => (
          <tr key={gap.evidenceRequirementId}>
            <th scope="row">
              {gap.label}
              <small>{gap.observableRule}</small>
            </th>
            {/* The denominator travels with the count, everywhere, always. */}
            <td>
              {gap.struggled} of {assessed}
              {gap.percentOfAssessed !== null && <small>{gap.percentOfAssessed}%</small>}
            </td>
            {/* An opportunity the run never presented is an absence. It is reported in its
                own column so it can never be read as a student who got it wrong. */}
            <td>{gap.notObserved === 0 ? "—" : `${gap.notObserved} of ${assessed}`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * §18.3. The wrong idea, named, and what it looked like in this class's own work.
 *
 * The two lists are deliberately not merged. Students whose run shows the shortfall are
 * evidence; students the run never asked, or whose writing nobody has read, are an absence.
 * A spotlight that added them together would report a marking backlog as a misconception.
 */
function Spotlight({ spotlight, classCode, teacherKey }: { spotlight: MisconceptionSpotlight; classCode: string; teacherKey: string }) {
  const shown = spotlight.evidenced.filter((example) => example.writing !== null).slice(0, 3);
  const unread = spotlight.missing.filter((absence) => absence.why === "writing-unread");
  const unasked = spotlight.missing.filter((absence) => absence.why === "not-observed");
  return (
    <section className="spotlight">
      <p className="eyebrow">What appears misunderstood</p>
      {spotlight.misconception
        ? <h4>{spotlight.misconception}</h4>
        : <h4>No named misconception sits behind this one.</h4>}
      <p className="spotlight__rule">{spotlight.observableRule}</p>

      {shown.length > 0 ? (
        <>
          <p className="field-label">In their own words</p>
          <ul className="spotlight__work">
            {shown.map((example) => (
              <li key={example.seatCode}>
                <blockquote>{example.writing}</blockquote>
                <cite>
                  Seat {example.seatCode} · {example.level === 0 ? "not demonstrated" : "partly there"}
                  {teacherKey && <> · <Link to={`/educator/class/${classCode}/students/${example.seatCode}?key=${teacherKey}`}>open the evidence</Link></>}
                </cite>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="spotlight__none">
          {spotlight.evidenced.length === 0
            ? "No student's work shows this."
            : "Nobody's writing has been read yet, so there is nothing to quote. The counts above come from what students did, not from what they wrote."}
        </p>
      )}

      {(unread.length > 0 || unasked.length > 0) && (
        <p className="spotlight__absence">
          <strong>Not evidence either way.</strong>{" "}
          {unread.length > 0 && `${unread.length} student${unread.length === 1 ? "" : "s"} wrote an explanation nobody has read yet. `}
          {unasked.length > 0 && `${unasked.length} student${unasked.length === 1 ? "" : "s"} were never asked this in their run. `}
          Neither is a student who got it wrong.
        </p>
      )}
    </section>
  );
}

/** §18.1 items 4 and 5: the action, why this class, and who needs support. */
function Action({ reading, spotlight, classCode, teacherKey }: {
  reading: TeachNextReading;
  spotlight: MisconceptionSpotlight | null;
  classCode: string;
  teacherKey: string;
}) {
  const top = reading.top;
  if (!top) return null;
  const needing = spotlight?.evidenced ?? [];
  return (
    <>
      <section className="next-lesson__action">
        <p className="eyebrow">Teach next</p>
        {reading.reteach ? (
          <>
            <h4>{reading.reteach.title}</h4>
            <p className="next-lesson__focus">{reading.reteach.focus}</p>
            <ol className="next-lesson__moves">
              {reading.reteach.moves.map((move) => <li key={move}>{move}</li>)}
            </ol>
            <p className="next-lesson__minutes">About {reading.reteach.minutes} minutes.</p>
          </>
        ) : (
          <>
            {/* No named misconception means no authored lesson, and BOW says so rather than
                inventing one. The requirement's own rule is what a teacher has to work from. */}
            <h4>{top.label}</h4>
            <p className="next-lesson__focus">
              BOW has no reteach topic for this one, because the model names no misconception behind it.
              What the work has to show is: {top.observableRule.charAt(0).toLowerCase()}{top.observableRule.slice(1)}.
            </p>
          </>
        )}
        {/* Why this class, in counts a teacher can check against the table below. */}
        <p className="next-lesson__why">
          <strong>Why this class:</strong> {top.struggled} of {reading.assessed} assessed students
          ({top.percentOfAssessed}%) did not show “{top.label.toLowerCase()}”.
          {top.notObserved > 0 && ` A further ${top.notObserved} were never asked it.`}
        </p>
      </section>

      {needing.length > 0 && (
        <section className="next-lesson__students">
          <p className="field-label">Who needs it</p>
          <ul>
            {needing.map((example) => (
              <li key={example.seatCode}>
                {teacherKey
                  ? <Link to={`/educator/class/${classCode}/students/${example.seatCode}?key=${teacherKey}`}>Seat {example.seatCode}</Link>
                  : <span>Seat {example.seatCode}</span>}
                <small>{example.level === 0 ? "did not show it" : "partly showed it"}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function TeachNext({ reading, spotlight, classCode, teacherKey }: {
  reading: TeachNextReading;
  spotlight: MisconceptionSpotlight | null;
  classCode: string;
  teacherKey: string;
}) {
  // Nothing to read. The headline above already said whether anybody has turned work in,
  // and repeating it here as a second empty state would be the page saying it twice.
  if (reading.state === "not-assessed") return null;

  if (reading.state === "too-few-assessed") {
    return (
      <section className="next-lesson" data-state={reading.state}>
        <p className="eyebrow">What should I teach next?</p>
        <p className="next-lesson__refusal">
          <strong>Not yet.</strong> {reading.assessed} student{reading.assessed === 1 ? " has" : "s have"} a usable
          result. BOW does not recommend a lesson from fewer than {MINIMUM_ASSESSED_FOR_A_STATE} — a gap in
          {" "}{reading.assessed} run{reading.assessed === 1 ? "" : "s"} is not a gap in a class. These are the counts it can stand behind.
        </p>
        <GapTable gaps={reading.gaps} assessed={reading.assessed} />
      </section>
    );
  }

  if (reading.state === "no-single-gap") {
    return (
      <section className="next-lesson" data-state={reading.state}>
        <p className="eyebrow">What should I teach next?</p>
        <p className="next-lesson__refusal">
          <strong>No single gap stands out.</strong> Nothing reached {GAP_THRESHOLD_PERCENT}% of the
          {" "}{reading.assessed} assessed students, so the class is spread across small issues rather than one
          shared misunderstanding. Review individual students.
        </p>
        <GapTable gaps={reading.gaps} assessed={reading.assessed} />
      </section>
    );
  }

  return (
    <section className="next-lesson" data-state={reading.state}>
      <p className="eyebrow">What should I teach next?</p>
      {spotlight && <Spotlight spotlight={spotlight} classCode={classCode} teacherKey={teacherKey} />}
      <Action reading={reading} spotlight={spotlight} classCode={classCode} teacherKey={teacherKey} />
      <details className="next-lesson__working">
        <summary>Every requirement behind this {reading.assessed}-student result</summary>
        <GapTable gaps={reading.gaps} assessed={reading.assessed} />
      </details>
    </section>
  );
}
