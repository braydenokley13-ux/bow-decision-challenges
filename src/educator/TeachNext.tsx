import { Link } from "react-router-dom";
import { MINIMUM_ASSESSED_FOR_A_STATE } from "../domain/competency/objectiveState";
import { GAP_THRESHOLD_PERCENT, type RequirementGap, type TeachNextReading } from "../domain/competency/teachNext";
import type { MisconceptionSpotlight } from "./misconceptions";
import { levelLabel, LEVEL_BUCKET_LABELS, studentsWho, TERMS } from "./labels";
import { useSeatLabel } from "./names";
import { disclosureEscape } from "../components/primitives/disclosureEscape";

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

/**
 * Which heading level this card's own headings sit at.
 *
 * The card renders on two pages at two depths. On the objective page it is inside one
 * class's block, under that class's `<h3>`; on the class overview it is a section of the
 * page, under an `<h2>`. A card that hard-coded one of those made the other skip a level,
 * and heading order is part of the accessibility contract rather than a detail — so the
 * page that owns the depth is the page that states it.
 */
export type TeachNextHeading = 3 | 4;

/** Nothing happened here: nobody fell short of it, and nobody went unasked. */
function nothingHappened(gap: RequirementGap): boolean {
  return gap.struggled === 0 && gap.notObserved === 0;
}

/**
 * How many rows of nothing it takes before they are worth saying once.
 *
 * Two is not a wall and folding two would cost a teacher two labels to save two lines. Ten
 * is a wall: a reviewer opened the sample class and met a thirteen-row table of which ten
 * read `0 of 12` and `0%`, directly under a banner that had already told them nothing stood
 * out. Seven hundred pixels of a screen a teacher opens between lessons, restating the
 * sentence above it.
 */
const FOLD_ROWS_OF_NOTHING_FROM = 3;

/**
 * The counts behind everything the work had to show. The audit trail for the card above it.
 *
 * The first column's header is Ladder 1's noun for the unit, and it is the phrase the rest
 * of the product was renamed onto: this table already used it when five other surfaces were
 * calling the same object a requirement, a criterion, a required part, an evidence
 * requirement or a micro-skill.
 *
 * The third column used to read "Never asked", one of eleven phrasings of a level improvised
 * in JSX. It is Ladder 2's `null`, read from the table, and it stays in its own column: an
 * opportunity the run never presented can never be read as a student who got it wrong.
 */
function GapTable({ gaps, assessed }: { gaps: readonly RequirementGap[]; assessed: number }) {
  // The reading sorts worst first, so the rows nothing happened on are the tail of it.
  const quiet = gaps.filter(nothingHappened);
  const folded = quiet.length >= FOLD_ROWS_OF_NOTHING_FROM;
  const rows = folded ? gaps.filter((gap) => !nothingHappened(gap)) : gaps;
  return (
    <table className="micro-table next-lesson__gaps">
      <thead>
        <tr>
          <th scope="col">{TERMS.Requirement}</th>
          <th scope="col">{LEVEL_BUCKET_LABELS.short}</th>
          <th scope="col">{levelLabel(null)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((gap) => (
          <tr key={gap.evidenceRequirementId}>
            <th scope="row">
              {gap.label}
              <small>{gap.observableRule}</small>
            </th>
            {/* The denominator travels with the count, everywhere, always. `data-label` is
                what the cell is called once the table reflows to definition rows on a narrow
                screen — the header row is off-screen there, and a bare "3 of 13" under a
                heading nobody can see is a number with its denominator and no subject. */}
            <td data-label={LEVEL_BUCKET_LABELS.short}>
              {gap.struggled} of {assessed}
              {gap.percentOfAssessed !== null && <small>{gap.percentOfAssessed}%</small>}
            </td>
            {/* An opportunity the run never presented is an absence. It is reported in its
                own column so it can never be read as a student who got it wrong. */}
            <td data-label={levelLabel(null)}>{gap.notObserved === 0 ? "—" : `${gap.notObserved} of ${assessed}`}</td>
          </tr>
        ))}
        {/* One row for every row that had nothing in it, in the same three columns and with
            the same denominator, and every one of them named underneath. This is a fold and
            not a deletion: an audit trail that quietly dropped ten of thirteen rows would be
            worse than the wall it replaced, and a district reading down this table can still
            find the one it came for. */}
        {folded && (
          <tr>
            <th scope="row">
              {rows.length === 0 ? "All" : "The other"} {quiet.length} things the work had to show
              <small>{quiet.map((gap) => gap.label).join(" · ")}</small>
            </th>
            <td data-label={LEVEL_BUCKET_LABELS.short}>
              0 of {assessed}
              {quiet.some((gap) => gap.percentOfAssessed !== null) && <small>0%</small>}
            </td>
            <td data-label={levelLabel(null)}>—</td>
          </tr>
        )}
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
function Spotlight({ spotlight, classCode, teacherKey, level }: { spotlight: MisconceptionSpotlight; classCode: string; teacherKey: string; level: TeachNextHeading }) {
  const H = level === 3 ? "h3" : "h4";
  // The teacher's own label for the seat, where the class has one. This block and the pull-out
  // group under it were the only two on the class page written in seat numbers, directly above
  // a list of real names — nine children a teacher had to look up to form a group tomorrow, off
  // a roster the product is already holding.
  const label = useSeatLabel();
  const shown = spotlight.evidenced.filter((example) => example.writing !== null).slice(0, 3);
  const unread = spotlight.missing.filter((absence) => absence.why === "writing-unread");
  const unasked = spotlight.missing.filter((absence) => absence.why === "not-observed");
  return (
    <section className="spotlight">
      <p className="eyebrow">What appears misunderstood</p>
      {spotlight.misconception
        ? <H>{spotlight.misconception}</H>
        : <H>No named misconception sits behind this one.</H>}
      <p className="spotlight__rule">{spotlight.observableRule}</p>

      {shown.length > 0 ? (
        <>
          <p className="field-label">In their own words</p>
          <ul className="spotlight__work">
            {shown.map((example) => (
              <li key={example.seatCode}>
                <blockquote>{example.writing}</blockquote>
                <cite>
                  {label(example.seatCode)} · {levelLabel(example.level).toLowerCase()}
                  {teacherKey && <> · <Link to={`/educator/class/${classCode}/students/${example.seatCode}`}>open the evidence</Link></>}
                </cite>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="spotlight__none">
          {/* What is actually true of *these* students. The sentence used to be "Nobody's
              writing has been read yet", which is a claim about the whole class — and a
              teacher-experience review read it on a fold where nine children's explanations
              had been read and marked. The guard here has never been about the class: it is
              `evidenced.filter(writing !== null)`, so the honest sentence is about the
              students in this spotlight. */}
          {spotlight.evidenced.length === 0
            ? "No student's work shows this."
            : "None of these students' writing has been read yet, so there is nothing to quote. The counts above come from what students did, not from what they wrote."}
        </p>
      )}

      {/* The product's epistemology, said in a sentence rather than as a two-word fragment in
          front of it. "Not evidence either way." was correct and important and nobody who had
          not already agreed with it could parse it; the sentence underneath was always doing
          the work. */}
      {(unread.length > 0 || unasked.length > 0) && (
        <p className="spotlight__absence">
          {unread.length > 0 && `${studentsWho(unread.length, "wrote", "wrote")} an explanation nobody has read yet. `}
          {unasked.length > 0 && `${studentsWho(unasked.length, "was", "were")} never asked this in their run. `}
          <strong>Neither is a student who got it wrong, and neither counts either way.</strong>
        </p>
      )}
    </section>
  );
}

/** §18.1 items 4 and 5: the action, why this class, and who needs support. */
function Action({ reading, spotlight, classCode, teacherKey, level }: {
  reading: TeachNextReading;
  spotlight: MisconceptionSpotlight | null;
  classCode: string;
  teacherKey: string;
  level: TeachNextHeading;
}) {
  const H = level === 3 ? "h3" : "h4";
  const label = useSeatLabel();
  const top = reading.top;
  if (!top) return null;
  const needing = spotlight?.evidenced ?? [];
  return (
    <>
      <section className="next-lesson__action">
        <p className="eyebrow">Teach next</p>
        {reading.reteach ? (
          <>
            <H>{reading.reteach.title}</H>
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
            <H>{top.label}</H>
            <p className="next-lesson__focus">
              BOW has no reteach topic for this one, because the model names no misconception behind it.
              {TERMS.Requirement} is: {top.observableRule.charAt(0).toLowerCase()}{top.observableRule.slice(1)}.
            </p>
          </>
        )}
        {/* Why this class, in counts a teacher can check against the table below. */}
        <p className="next-lesson__why">
          <strong>Why this class:</strong> {top.struggled} of {reading.assessed} assessed students
          ({top.percentOfAssessed}%) did not show “{top.label.toLowerCase()}”.
          {top.notObserved > 0 && ` A further ${top.notObserved === 1 ? "1 was" : `${top.notObserved} were`} never asked it.`}
        </p>
      </section>

      {needing.length > 0 && (
        <section className="next-lesson__students">
          <p className="field-label">Who needs it</p>
          <ul>
            {needing.map((example) => (
              <li key={example.seatCode}>
                {teacherKey
                  ? <Link to={`/educator/class/${classCode}/students/${example.seatCode}`}>{label(example.seatCode)}</Link>
                  : <span>{label(example.seatCode)}</span>}
                <small>{levelLabel(example.level)}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function TeachNext({ reading, spotlight, classCode, teacherKey, level = 4 }: {
  reading: TeachNextReading;
  spotlight: MisconceptionSpotlight | null;
  classCode: string;
  teacherKey: string;
  level?: TeachNextHeading;
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
      {spotlight && <Spotlight spotlight={spotlight} classCode={classCode} teacherKey={teacherKey} level={level} />}
      <Action reading={reading} spotlight={spotlight} classCode={classCode} teacherKey={teacherKey} level={level} />
      <details className="next-lesson__working" onKeyDown={disclosureEscape()}>
        {/* Named in plain English rather than in the vocabulary the table below exists to
            explain. A teacher clicking into an audit trail should not have to already know
            what BOW calls the rows in it. */}
        <summary>Show the counts behind this</summary>
        <GapTable gaps={reading.gaps} assessed={reading.assessed} />
      </details>
    </section>
  );
}
