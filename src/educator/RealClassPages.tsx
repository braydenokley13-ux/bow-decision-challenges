import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell, StateKey } from "./EducatorShell";
import { useClassEvidence, type ClassEvidenceState, type OverrideRequest } from "./useClassEvidence";
import { EvidenceTrailPanel, StudentSummary } from "./EvidenceTrailPanel";
import type { AttributedSubmission } from "../platform/classes/types";
import { attemptsFor, classRoll, worldSections, type ChoiceDistribution, type ClassAnalysis, type ClassRoll, type StudentRow } from "./analysis";
import { SeatNamesContext, endSentence, seatLabels, seatNames, useSeatLabel, useSeatNames, type RosterRow } from "./names";
import { gradebookLineFor, gradebookRows, gradebookTsv } from "./gradebook";
import { MAX_FEEDBACK_LENGTH, type TeacherFeedback } from "../platform/identity/types";
import type { ProgressRow } from "../platform/identity/types";
import { stageLabel } from "../domain/scenario/registry";
import type { WorldId } from "../domain/core/ids";
import { dollars, formatDollars } from "../domain/core/money";
import { planMovements, type RowMovement } from "../domain/finance/formulas";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { CHOICE_LABELS } from "../components/financial/choices";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import { POP_UP_SCENARIO } from "../domain/scenario/worlds/food-truck";
import { derivePopUpFacts } from "../domain/scenario/worlds/food-truck/facts";
import type { CompetencyResultState } from "../domain/competency/types";
import { levelBucketKey, levelLabel, skillStateKey, skillStateInSentence, LEVEL_BUCKET_LABELS, SKILL_STATE_LABELS, TERMS } from "./labels";
import { REASONING_MAXIMUM } from "../domain/evidence/grade";
import { REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import { MINIMUM_RESULTS_FOR_CLASS_NARRATION } from "../domain/competency/objectiveState";
import { classSpineFrom, type ClassSpine } from "./classSpine";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { keyForClass, rememberClass, rememberedClasses } from "./classMemory";
import { classLeadFor } from "./classLead";
import { studentSpineFor, type StudentSpine } from "./studentSpine";
import { TeachNext } from "./TeachNext";

/**
 * The educator's view of a real class.
 *
 * Everything below is a function of the evidence students submitted. There is no fixture
 * import in this file, no demo constant, and no placeholder row — a class with nothing in
 * it says so, and a class with four students in it reports four. That invariant is the one
 * thing the whole educator surface rests on: a teacher who cannot tell whether a
 * distribution is real cannot use any of it.
 *
 * Two rules shape what leads. **One spine on screen:** every heading, every row and every
 * count here is the competency reading — what the evidence requirements show. The points
 * total still exists, is still computed the same way, and appears once per student at the
 * bottom of their own page, labelled as the gradebook line it is. **Nothing about the class
 * below the minimum denominator:** a handful of runs is evidence about those students and
 * about nobody else, so under it this page shows counts and individual work and stops.
 */

type ReadyClass = Extract<ClassEvidenceState, { status: "ready" }>;

function ClassFrame({ state, children, title }: {
  state: ClassEvidenceState;
  title?: string;
  children: (ready: ReadyClass) => React.ReactNode;
}) {
  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">Class evidence</p>
          <h1>{title ?? "This class did not open."}</h1>
          <p>{state.message}</p>
        </header>
        <Link className="button button--secondary" to="/educator/classes">My classes</Link>
      </EducatorShell>
    );
  }
  return (
    <EducatorShell>
      <SeatNamesContext.Provider value={seatNames(state.roster)}>{children(state)}</SeatNamesContext.Provider>
    </EducatorShell>
  );
}

/**
 * A class nobody has finished yet.
 *
 * In a classroom this screen has one job, and it is to put the code where thirty students
 * can read it from their seats. So the code is the page, at the size a projector needs, with
 * the address they type beside it.
 */
function NothingYet({ code, label, keyQuery, teacherKey, hasRoster, roll, roster, progress, loadedAt, spine }: {
  code: string;
  label: string;
  keyQuery: string;
  teacherKey: string;
  hasRoster: boolean;
  roll: ClassRoll;
  roster: readonly RosterRow[];
  progress: readonly ProgressRow[];
  loadedAt: number;
  spine: ClassSpine;
}) {
  // A lesson that has started and finished nothing is not an empty class, and it is the exact
  // moment this page is most use. It used to answer "Nothing turned in yet · 0 turned in" to a
  // teacher standing in a room where twenty-eight students were working — the code poster,
  // which is the right screen five minutes earlier and the wrong one now.
  const working = progress.length > 0;
  return (
    <>
      <header className="page-header page-header--split">
        <div>
          <ClassName code={code} label={label} teacherKey={teacherKey} worlds={null} />
          {/* The same lead as every other moment of the lesson, and at this one it is the nine
              children who have not got in — the only thing on this screen a teacher can walk
              across the room and fix. It used to read "Nothing turned in yet · 0 turned in":
              a count of nobody, against nothing. */}
          <ClassLead spine={spine} roll={roll} code={code} keyQuery={keyQuery} />
        </div>
        <div className="page-header__meta">
          <span>{roll.seats.length} {roll.seats.length === 1 ? "student" : "students"} · 0 attempts</span>
        </div>
      </header>
      {working && <LiveState roll={roll} roster={roster} progress={progress} code={code} keyQuery={keyQuery} loadedAt={loadedAt} />}
      <section className="class-created">
        <div className="class-created__code class-created__code--projector">
          <p className="field-label">Class code</p>
          <strong>{code}</strong>
          <p>Not case sensitive.</p>
        </div>
        <div className="class-created__body">
          <h2>Students go here</h2>
          {/* The sign-in, not the run. A student typing the challenge route with no session is
              bounced to this address anyway, and an address a teacher reads to a room should be
              the one that works rather than the one that redirects. */}
          <p className="join-address"><code>{window.location.origin}/join</code></p>
          {/* What a student actually meets, which is no longer a seat number to pick: a class
              with a list hands out cards and the card decides the seat, and a class without
              one asks the student for the name their teacher will see. A launch instruction
              that describes neither sends a room of thirty looking for a control. */}
          {/* What BOW does not hold, said as what it does not hold. This used to promise "no
              accounts", which stopped being true when students got sessions, seats and a run
              that follows them to another machine — and it is the sentence a teacher would
              repeat to a parent. What was always the point of it is still true and is what it
              says now: no email address and no last name.

              What it does hold is said beside it, and it names both doors. This line ended
              "the only name it holds is the one you put on the list", which is false of any
              class that was open before the list was pasted: those seats were made when a
              child typed their own first name at `/join`, they are stored with `selfNamed`,
              and pasting a list appends beside them rather than replacing them. A teacher
              plans on this sentence, and `dataClaims.test.ts` is the authority on it. */}
          {hasRoster ? (
            <p>
              Each student types the code, then the code on their own card. BOW never asks a child for an
              email address or a last name. It holds the names on your list, and any a student typed for
              themselves before you made one.
            </p>
          ) : (
            <p>
              Each student types the code and the name you will see beside their work. BOW never asks a child
              for an email address or a last name.
            </p>
          )}
          <p>
            {hasRoster ? "Their cards are on the " : "Or hand out named cards instead — "}
            <Link to={`/educator/class/${code}/roster${keyQuery}`}>{hasRoster ? "class list" : "make the class list"}</Link>.
          </p>
          <Button variant="secondary" onClick={() => window.location.reload()}>Check again</Button>
        </div>
      </section>
    </>
  );
}

/**
 * The class's name, and the four seconds that used to make it permanent.
 *
 * A class could not be renamed. There was no control on any surface and no route that would
 * have accepted one — `POST /classes`, `DELETE`, and nothing in between — so a teacher who
 * typed "Perido 6" between periods carried it for a hundred and twenty days: on this page, on
 * every printed card, on the debrief read aloud to the room, and in the gradebook export. The
 * product's only answer to a typo was to delete the class and lose the work inside it.
 *
 * It belongs here because this is where a teacher reads the name — at the top of the page they
 * open every lesson — rather than on a settings screen nobody would look for. The name is the
 * only thing it can change; the code, the key and the evidence are not editable by anything.
 */
function ClassName({ code, label: given, teacherKey, worlds }: {
  code: string;
  label: string;
  teacherKey: string;
  worlds: string | null;
}) {
  const [label, setLabel] = useState(given);
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState(label);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const wanted = typed.trim();
    if (!wanted || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey || keyForClass(code) || "" },
        body: JSON.stringify({ label: wanted }),
      });
      if (!response.ok) {
        setSaid("That name was not saved.");
        return;
      }
      const body = (await response.json()) as { label?: string };
      const saved = typeof body.label === "string" ? body.label : wanted;
      setLabel(saved);
      // The browser's own list of classes carries a copy of the name, and a rename that left it
      // behind would put two names for one class on two screens.
      const remembered = rememberedClasses().find((entry) => entry.code === code);
      if (remembered) rememberClass({ ...remembered, label: saved });
      setEditing(false);
      setSaid("Renamed.");
    } catch {
      setSaid("That name was not saved.");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <p className="eyebrow">
        {[label, worlds].filter(Boolean).join(" · ")}{" "}
        <Button type="button" variant="quiet" onClick={() => { setTyped(label); setSaid(null); setEditing(true); }}>
          Rename
        </Button>
        {said && <span aria-live="polite"> · {said}</span>}
      </p>
    );
  }
  return (
    <div>
      <label className="field" htmlFor="class-rename">
        <span className="field-label">What this class is called</span>
        <input
          id="class-rename"
          value={typed}
          maxLength={60}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void save(); }}
        />
      </label>
      <div className="feedback__actions">
        <Button variant="primary" aria-disabled={busy || typed.trim().length === 0} onClick={() => void save()}>
          {busy ? "Saving…" : "Save the name"}
        </Button>
        <Button variant="quiet" aria-disabled={busy} onClick={() => { setTyped(label); setEditing(false); }}>Cancel</Button>
        <span aria-live="polite">{said}</span>
      </div>
    </div>
  );
}

/**
 * What this class actually played, named from the evidence rather than assumed.
 *
 * Every class used to be titled "Eight Weeks to the Showcase" whether or not a single
 * student had opened it. With two worlds in the product that is a false label on the first
 * line of the page, and a class where students chose differently has two worlds to name.
 */
function worldsPlayed(rows: readonly StudentRow[]): string | null {
  const titles = [...new Set(rows.map((row) => row.worldId))]
    .map((worldId) => WORLD_REGISTRY[worldId]?.title)
    .filter((title): title is string => title !== undefined);
  return titles.length > 0 ? titles.join(" · ") : null;
}

/** One decision, and who made each call. Counts, and the seats behind every count. */
function Distribution({ distribution }: { distribution: ChoiceDistribution }) {
  const names = useSeatNames();
  return (
    <article className="choice-dist">
      <h3>{distribution.question}</h3>
      <ul>
        {distribution.shares.map((share) => (
          <li key={share.id} data-empty={share.seats.length === 0}>
            <b>{share.seats.length}</b>
            <span>{share.label}</span>
            {/* Every count links back to the students inside it, so nothing here is a
                number a teacher has to take on faith. */}
            <span className="choice-dist__seats">{seatLabels(share.seats, names)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * The first ten seconds, and the rule that governs them.
 *
 * The largest text on this page used to be the assessment reading whatever the assessment
 * reading was worth. Mid-lesson, with twenty-two turned in and one explanation read, that was
 * **"1 of 1 assessed showed it."** in the display face — a fact about one child over a room of
 * twenty-eight — while the only actionable thing on the screen, *21 awaiting your reading*,
 * was the smallest type on it. The disclosure underneath was honest and the typography
 * contradicted it.
 *
 * So what leads is what a teacher does next, and the assessment earns the headline only once
 * every explanation has been read and there is a class-sized denominator behind it.
 * `classLead.ts` decides which of those it is and writes the sentence; this renders it and
 * puts the next step under it as something to press. Nothing here composes a count.
 */
function ClassLead({ spine, roll, code, keyQuery }: {
  spine: ClassSpine;
  roll: ClassRoll;
  code: string;
  keyQuery: string;
}) {
  const lead = classLeadFor({
    // The class as the roll counts it — one row per student still in the room — so the
    // headline's denominator is the same class the tiles and the list below are about.
    inClass: roll.seats.length,
    hasRoster: roll.hasRoster,
    turnedIn: roll.turnedIn,
    working: roll.stillWorking,
    notStarted: roll.notStarted,
    awaitingReading: roll.awaitingReading.length,
    assessed: spine.assessed,
    demonstrated: spine.reading?.result.demonstrated ?? 0,
    percentDemonstrated: spine.reading?.result.percentDemonstrated ?? null,
    state: spine.reading?.result.state ?? null,
    narratable: spine.narratable,
  });
  return (
    <>
      <h1>{lead.headline}</h1>
      <p>{lead.detail}</p>
      {/* The refusal, in the words §15.3 defines it by. It is a definition rather than a
          count, so it sits under the count it explains rather than inside it. */}
      {lead.note && <p className="class-state">{lead.note}</p>}
      {lead.action && (
        <p>
          <Link className="button button--primary" to={`/educator/class/${code}/${lead.action.route}${keyQuery}`}>
            {lead.action.label} →
          </Link>
        </p>
      )}
    </>
  );
}


/**
 * The last screen of a run, in both stories.
 *
 * A checkpoint is written at every stage transition and deleted by the service the moment a
 * submission from that seat arrives — so a checkpoint that is *still* sitting on the final
 * stage means the student reached the end and nothing came back. Two ways that happens: the
 * submission was refused, or the browser never sent it.
 */
const TERMINAL_STAGES = new Set(["submitted", "popup-submitted"]);

/**
 * What screen a student who has not turned in is on, said truthfully.
 *
 * Both stories name their last stage **"Turned in"**, which is the right word for a run that
 * arrived and the worst possible word for one that did not. A teacher's live panel printed
 * *"Clever Cam — Turned in — 6 min ago"* about a child whose work had been rejected and did not
 * exist, three inches above a list of who had turned in that did not contain him. She read the
 * row and left him alone.
 *
 * A row is only ever in this list because the roll put the seat in a state that is not
 * `turned-in`, so the stage cannot be allowed to say otherwise. What it says instead is the
 * fact a teacher can act on: their browser got to the end, and nothing reached this class.
 */
function startedStageLabel(worldId: WorldId, stage: string): string {
  return TERMINAL_STAGES.has(stage) ? "Reached the last screen — nothing arrived" : stageLabel(worldId, stage);
}

/**
 * How long ago, in the units a teacher would say it in.
 *
 * "142 min ago" is a number a person has to divide. Past an hour this reads in hours and past
 * a day in days, because by then the question is not whether to walk over — it is whether the
 * child needs Thursday.
 */
function sinceLabel(elapsed: number): string {
  const minutes = Math.max(0, Math.round(elapsed / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 90) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/**
 * Where the room is, right now.
 *
 * The class page could previously show a student in exactly two states: turned in, or not
 * present at all. Nothing was written to the service until the final screen, so a teacher
 * walking the room could not see who had not started, who was mid-run, or who had stopped on
 * Tuesday and not come back. This is the smallest thing that answers those questions: a
 * count per bucket, and — for anybody still working — which screen and how long since they
 * last did anything.
 *
 * There is no per-second tracking behind it and there is not going to be. A stage and a
 * last-touched time are what a teacher can act on; anything finer would be surveillance
 * bought with nothing.
 */
function LiveState({ roll, roster, progress, code, keyQuery, loadedAt }: {
  /** The class, counted once, by the same function every other number on this page reads. */
  roll: ClassRoll;
  roster: readonly RosterRow[];
  progress: readonly ProgressRow[];
  code: string;
  keyQuery: string;
  /** When this page was fetched. Elapsed time is measured from it so the render is a function of its input. */
  loadedAt: number;
}) {
  const label = useSeatLabel();
  if (roll.seats.length === 0) return null;
  // The tiles are states of the same list of seats, so they add up to the class by
  // construction. They used to be computed from three different lists — a set of seats that
  // had submitted, unfiltered by the roster, against a roster that was filtered — and a
  // teacher who removed one student got a panel reporting a class larger than the class.
  const notStarted = roll.seats.filter((seat) => seat.state === "not-started");
  const started = roll.seats.filter((seat) => seat.state === "still-working" || seat.state === "started-quiet");
  const startedRows = started.flatMap((seat) => progress.filter((row) => row.seatCode === seat.seatCode).slice(0, 1));
  const size = roll.seats.length;

  return (
    <section className="dashboard-section live-state">
      <div className="section-heading">
        <p className="eyebrow">Right now</p>
        <h2>Where the room is</h2>
      </div>
      {/* Every tile carries the class it is a count of. "Still working 3" was a number a
          teacher had to hold the class size in their head to read — and the morning after the
          lesson it was a number about nobody. */}
      <dl className="live-state__counts">
        <div><dt>Turned in</dt><dd>{roll.turnedIn} of {size}</dd></div>
        <div><dt>Working right now</dt><dd>{roll.stillWorking} of {size}</dd></div>
        {/* Only when there is one. A checkpoint quiet for longer than a lesson is a fact about
            a child who stopped rather than a child at a keyboard, and the heading over this
            panel says Right now. */}
        {roll.startedQuiet > 0 && (
          <div><dt>Started, not turned in</dt><dd>{roll.startedQuiet} of {size}</dd></div>
        )}
        <div><dt>Not started</dt><dd>{roll.notStarted === null ? "—" : `${roll.notStarted} of ${size}`}</dd></div>
      </dl>
      {/* First, because it is the only line on this screen a teacher acts on by standing up.
          It used to print under a list of nineteen working students, which at minute five of
          a lesson pushed it off a 1366×768 screen — the one minute it exists for. */}
      {notStarted.length > 0 && (
        // Every one of them, named. This line is a walking list — a teacher reads it and gets
        // up — so "and 3 more" is three children she has been told about and cannot find. The
        // six-name cap belongs on lines that summarise; this one does not summarise.
        <p className="live-state__waiting">
          {endSentence(`Not started: ${seatLabels(notStarted.map((seat) => seat.seatCode), seatNames(roster), notStarted.length)}`)}
        </p>
      )}
      {startedRows.length > 0 && (
        <ul className="live-state__list">
          {startedRows
            .slice()
            .sort((a, b) => a.updatedAt - b.updatedAt)
            .map((row) => (
              <li key={row.seatCode}>
                <Link to={`/educator/class/${code}/students/${row.seatCode}${keyQuery}`}>{label(row.seatCode)}</Link>
                <span>{startedStageLabel(row.worldId, row.stage)}</span>
                {/* Said as elapsed time rather than a clock, because what a teacher does with
                    it is decide whether to walk over — or, the next morning, whether to give
                    them Thursday. */}
                <span className="live-state__quiet">{sinceLabel(loadedAt - row.updatedAt)}</span>
              </li>
            ))}
        </ul>
      )}
      {/* Said out loud, because it is the one row on this panel that needs a teacher to walk
          over and it looks like the one that does not. The service deletes a checkpoint when a
          submission from that seat arrives, so a seat still sitting on the last screen is a run
          that ended with nothing reaching this class. */}
      {startedRows.some((row) => TERMINAL_STAGES.has(row.stage)) && (
        <p className="live-state__waiting">
          {startedRows.filter((row) => TERMINAL_STAGES.has(row.stage)).length === 1 ? "One student" : "Some students"} reached
          the end of the run and no work arrived here. Nothing of theirs is in this class — the work is still on the
          computer they used, and pressing Turn in again from that computer sends it.
        </p>
      )}
      {!roll.hasRoster && (
        <p className="class-state">
          This class has no student list, so BOW cannot say who has not started — only who has.
          {" "}<Link to={`/educator/class/${code}/roster${keyQuery}`}>Add one</Link> and every seat gets a name.
        </p>
      )}
      {/* Said out loud rather than left as a difference between two numbers. Work from a seat
          the teacher removed is kept and is not counted anywhere on this page, and a teacher
          who is not told that has to work it out from an arithmetic that no longer adds up. */}
      {roll.excluded.length > 0 && (
        <p className="live-state__waiting">
          {roll.excluded.length} {roll.excluded.length === 1 ? "attempt" : "attempts"} from{" "}
          {new Set(roll.excluded.map((row) => row.seatCode)).size === 1 ? "a seat" : "seats"} you removed
          {" "}from the list. Kept, and counted nowhere on this page.
        </p>
      )}
    </section>
  );
}


/**
 * The class, as something that can leave.
 *
 * A teacher's Friday used to be twenty-nine manual copy steps, because nothing in this
 * product could be exported. It is tab-separated and copied to the clipboard rather than
 * downloaded, because what a teacher does next is paste it into a column of a gradebook they
 * already have open — a file to find in a Downloads folder is a step further from that, not
 * closer.
 */
function ExportClass({ roll, submissions, roster, label }: {
  roll: ClassRoll;
  submissions: readonly AttributedSubmission[];
  roster: readonly RosterRow[];
  label: string;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const names = seatNames(roster);
  if (roll.seats.length === 0) return null;
  const copy = () => {
    // Built from the roll, so what leaves is the shape of the teacher's own list: a row per
    // seat in the class whether or not they turned anything in, a row per extra attempt, and
    // nothing at all from a seat that is no longer on it.
    const rows = gradebookRows(roll.seats.map((seat) => ({
      seatCode: seat.seatCode,
      displayName: names.get(seat.seatCode) ?? null,
      attempts: seat.attempts.flatMap((row) => {
        const submission = submissions.find((entry) => entry.sessionId === row.sessionId);
        return submission ? [submission] : [];
      }),
    })));
    const absent = rows.filter((row) => row.line === null).length;
    void navigator.clipboard
      .writeText(gradebookTsv(rows))
      .then(() => setSaid(
        `${rows.length} rows copied — every seat in the class${absent > 0 ? `, including ${absent} who turned nothing in` : ""}. Paste into a spreadsheet.`,
      ))
      .catch(() => setSaid("Could not reach the clipboard. Select the table and copy it instead."));
  };
  return (
    <div className="class-export">
      <Button variant="secondary" onClick={copy}>Copy {label} for a gradebook</Button>
      <p aria-live="polite">{said}</p>
    </div>
  );
}


/**
 * What the teacher says back, and the only thing in this product that travels that way.
 *
 * Four hundred characters, one message, no thread, no draft state, no send-later. The point
 * is that a student who wrote four sentences about why they protected the backup money hears
 * something from the person who read them. Anything more than that is a messaging system, and
 * a messaging system between adults and children in a school product is a different
 * conversation with a district than this one is.
 *
 * "Worth talking about in person" is a flag on the teacher's own list. It is never shown to
 * the student, because a child reading "your teacher flagged you" learns nothing and worries.
 */
function Feedback({ seatCode, sessionId, existing, onSend }: {
  seatCode: string;
  sessionId: string;
  existing: TeacherFeedback | undefined;
  onSend: (body: string, flagged: boolean) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [flagged, setFlagged] = useState(existing?.flagged ?? false);
  const [said, setSaid] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const trimmed = body.trim();

  const send = async () => {
    if (trimmed.length === 0 || sending) return;
    setSending(true);
    const ok = await onSend(trimmed, flagged);
    setSending(false);
    setSaid(ok ? "Sent. They will see it next time they open BOW." : "That did not send. Try again.");
    if (ok) setBody("");
  };

  return (
    <section className="feedback">
      <div className="section-heading">
        <p className="eyebrow">Write back</p>
        <h3>What they hear from you</h3>
      </div>
      {existing && (
        <blockquote className="feedback__sent">
          {existing.body}
          <cite>Sent {new Date(existing.at).toLocaleDateString()}</cite>
        </blockquote>
      )}
      <label className="field" htmlFor={`feedback-${seatCode}-${sessionId}`}>
        <span className="field-label">{existing ? "Say something else" : "One or two sentences"}</span>
        <textarea
          id={`feedback-${seatCode}-${sessionId}`}
          value={body}
          maxLength={MAX_FEEDBACK_LENGTH}
          rows={3}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Name one thing they did and one thing to try next time."
        />
      </label>
      <label className="checkline">
        <input type="checkbox" checked={flagged} onChange={(event) => setFlagged(event.target.checked)} />
        <span>Worth talking about in person — for your list, not theirs.</span>
      </label>
      <div className="feedback__actions">
        <Button variant="primary" aria-disabled={trimmed.length === 0 || sending} onClick={() => void send()}>
          {sending ? "Sending…" : "Send it"}
        </Button>
        <span>{MAX_FEEDBACK_LENGTH - body.length} left</span>
      </div>
      <p aria-live="polite">{said}</p>
    </section>
  );
}

export function RealClassOverview() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { state } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";
  const teacherKey = params.get("key") ?? "";

  return (
    <ClassFrame state={state}>
      {(ready) => {
        const { analysis, record, assignments, submissions } = ready;
        const names = seatNames(ready.roster);
        // One reading of who is in this class and what each of them turned in. Every count
        // below is taken from it — the headline, the live tiles, the table's denominator, the
        // student list and the export — so two of them cannot disagree about the same room.
        // They used to be computed five ways and three of them were on screen at once.
        // `at` is when the page was read, so "still working" is a claim about now rather than
        // about whenever a browser last said anything. A checkpoint quiet for longer than a
        // lesson stops counting as a child at a keyboard.
        const roll = classRoll({ rows: analysis.rows, roster: ready.roster, progress: ready.progress, at: ready.loadedAt });
        // The spine is read against the same class: one attempt per student still in the
        // room, so "turned in" in the headline is the same number as "turned in" in the tile.
        const counted = roll.rows.flatMap((row) => submissions.filter((entry) => entry.sessionId === row.sessionId));
        const spine = classSpineFrom({ record, assignments, submissions: counted });
        if (roll.rows.length === 0) {
          return (
            <NothingYet
              code={record.code}
              label={record.label}
              keyQuery={keyQuery}
              teacherKey={teacherKey}
              hasRoster={roll.hasRoster}
              roll={roll}
              roster={ready.roster}
              progress={ready.progress}
              loadedAt={ready.loadedAt}
              spine={spine}
            />
          );
        }
        const total = roll.turnedIn;
        const students = (
          <section className="dashboard-section">
            <div className="section-heading">
              <p className="eyebrow">Open these</p>
              <h2>Every student who turned in</h2>
            </div>
            <StudentRows
              rows={roll.rows}
              submissions={submissions}
              code={record.code}
              keyQuery={keyQuery}
              attempts={new Map(roll.seats.map((seat) => [seat.seatCode, seat.attempts.length]))}
            />
          </section>
        );

        return (
          <>
            <header className="page-header page-header--split">
              <div>
                <ClassName
                  code={record.code}
                  label={record.label}
                  teacherKey={teacherKey}
                  worlds={worldsPlayed(roll.rows)}
                />
                <ClassLead spine={spine} roll={roll} code={record.code} keyQuery={keyQuery} />
              </div>
              <div className="page-header__meta">
                {/* The unit, said out loud, on the surface a teacher reads a number off and
                    then says it to a room. One student who had two goes is one student and two
                    attempts, and the debrief, the queue and the export all count the first of
                    those — so the header names both rather than leaving a colleague to work out
                    which of two screens is lying. */}
                <span>{roll.seats.length} {roll.seats.length === 1 ? "student" : "students"} · {roll.attempts.length} {roll.attempts.length === 1 ? "attempt" : "attempts"}</span>
                {/* The largest single job this product creates, and it used to be a
                    sentence. It is the way into the queue that does it. */}
                {roll.awaitingReading.length > 0
                  ? <Link to={`/educator/class/${record.code}/reading${keyQuery}`}>{roll.awaitingReading.length} awaiting your reading</Link>
                  : <span>Every explanation read</span>}
              </div>
            </header>

            <LiveState
              roll={roll}
              roster={ready.roster}
              progress={ready.progress}
              code={record.code}
              keyQuery={keyQuery}
              loadedAt={ready.loadedAt}
            />

            {!spine.narratable && (
              <p className="class-guard">
                {total} turned in — individual work below. BOW does not describe a class from
                fewer than {MINIMUM_RESULTS_FOR_CLASS_NARRATION} runs.
              </p>
            )}

            {/* §18.1, at the top of the surface a teacher actually lands on. The objective
                page renders the same reading from the same module; neither owns it. */}
            {spine.reading && spine.narratable && (
              <section className="dashboard-section">
                <TeachNext
                  reading={spine.reading.teachNext}
                  spotlight={spine.reading.spotlight}
                  classCode={record.code}
                  teacherKey={teacherKey}
                />
              </section>
            )}

            {!spine.narratable && students}

            {spine.narratable && spine.reading && spine.reading.competencies.length > 0 && (
              <section className="dashboard-section">
                <div className="section-heading">
                  <p className="eyebrow">What the evidence shows</p>
                  <h2>Where the class is on each skill</h2>
                </div>
                <table className="micro-table">
                  {/* Two sentences because there are two numbers and only one of them is
                      this table's denominator. It read "Counts across the {assessed} of
                      {total} with a usable result", which claims the rows below are counted
                      over the assessed students — and they are not: `classResultFor` puts
                      every student who turned in into exactly one state per skill, naming the
                      unassessed ones as an absence rather than dropping them. Before a
                      teacher has marked anything that caption said "across the 0 of 10"
                      directly above rows totalling ten, one of which read "10 showed it".
                      The rows were right and the caption was the false one, so the caption
                      now says what it is counting and states the assessed figure as the
                      separate fact it is. */}
                  <caption>
                    Counts across all {total} who turned in. {spine.assessed} of them have a usable
                    result — one whose written explanation somebody has read.
                  </caption>
                  <thead><tr><th scope="col">Skill</th><th scope="col">Where the class is</th></tr></thead>
                  <tbody>
                    {spine.reading.competencies.map((row) => (
                      <tr key={row.competencyId}>
                        <th scope="row">{competencyStatement(row.competencyId, submissions)}</th>
                        {/* Counts of students, so the words are Ladder 3 — one claim about
                            one child, added up. Lowercased by the same table, not a second one. */}
                        <td>
                          {Object.entries(row.counts)
                            .filter(([, count]) => count > 0)
                            .map(([entry, count]) => `${count} ${skillStateInSentence(entry as CompetencyResultState)}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Once for the page. The class list further down leads every row with one of
                    these same six words, so a teacher meets the key before the rows. */}
                <StateKey
                  title="What these words mean"
                  entries={skillStateKey(spine.reading.competencies.flatMap((row) =>
                    (Object.entries(row.counts) as [CompetencyResultState, number][])
                      .filter(([, count]) => count > 0).map(([state]) => state)))}
                />
              </section>
            )}

            {/* Below the guard, nothing here describes the class. These two sections are
                distributions, so they wait until there is a class to distribute. */}
            {spine.narratable && (
              <>
                {/* One section per world, because the questions are the world's. A class
                    where students chose differently was asked two different sets of
                    questions, and each set has its own denominator. */}
                {/* One block per world, each with its own denominator. Nothing on this page
                    divides one world's question by the whole class any more. */}
                {worldSections(roll.rows).map((world) => (
                  <section className="dashboard-section" key={world.worldId}>
                    <div className="section-heading">
                      <p className="eyebrow">
                        {world.title} · {world.seats} {world.seats === 1 ? "student" : "students"}
                      </p>
                      <h2>What they decided</h2>
                    </div>
                    <div className="choice-grid">
                      {world.distributions.map((distribution) => (
                        <Distribution key={distribution.id} distribution={distribution} />
                      ))}
                    </div>
                    {world.adaptation && (
                      <div className="adaptation">
                        <div className="section-heading">
                          <p className="eyebrow">{world.adaptation.heading}</p>
                          <h3>What moved</h3>
                        </div>
                        {world.adaptation.cuts.length > 0 && (
                          <ul className="cut-list">
                            {world.adaptation.cuts.map((entry) => (
                              <li key={entry.label}>
                                <b>{entry.seats.length}</b>
                                <span>of {world.seats} cut <strong>{entry.label}</strong> first</span>
                                <span className="choice-dist__seats">{seatLabels(entry.seats, names)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <dl className="adaptation-lines">
                          {world.adaptation.lines.map((line) => (
                            <div key={line.label}><dt>{line.label}</dt><dd>{line.count} of {world.seats}</dd></div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </section>
                ))}
              </>
            )}

            {spine.narratable && students}

            <section className="dashboard-section">
              <ExportClass roll={roll} submissions={submissions} roster={ready.roster} label={record.label} />
            </section>

            <section className="card-grid class-foot">
              <div>
                <span>Next</span>
                <strong>Run the debrief</strong>
                <p>Two real plans, what changed after Week 5, and what to review — from this class's evidence.</p>
                <Link className="button button--primary" to={`/educator/class/${record.code}/debrief${keyQuery}`}>Open the debrief</Link>
                <Link className="button button--secondary" to={`/educator/class/${record.code}/share-out${keyQuery}`}>Pick what the room sees</Link>
              </div>
              <div>
                <span>This class</span>
                <strong>Who is in this class</strong>
                {/* The list is what turns every seat number on this page into a name, so the
                    way to it belongs beside the things a teacher does with the names. */}
                <p>Names, join cards, a card reissued for a student who lost theirs, and taking somebody off the list.</p>
                <Link className="button button--secondary" to={`/educator/class/${record.code}/roster${keyQuery}`}>Class list</Link>
              </div>
            </section>
          </>
        );
      }}
    </ClassFrame>
  );
}

/** The skill's own sentence, read from the first student who has a result for it. */
function competencyStatement(competencyId: string, submissions: readonly AttributedSubmission[]): string {
  for (const submission of submissions) {
    const line = studentSpineFor(submission).competencies.find((entry) => entry.competencyId === competencyId);
    if (line) return line.statement;
  }
  return competencyId;
}

/**
 * The class list, led by what each student showed.
 *
 * Every row used to open with `100/100`, which is the number that is the same for almost
 * everybody and says nothing about what to do next. It opens with the competency state and
 * the requirement that fell short, which is the sentence a teacher acts on.
 */
function StudentRows({ rows, submissions, code, keyQuery, attempts }: {
  rows: readonly StudentRow[];
  submissions: readonly AttributedSubmission[];
  code: string;
  keyQuery: string;
  /** How many attempts each seat turned in. One row per student either way; the row says so. */
  attempts: ReadonlyMap<string, number>;
}) {
  const label = useSeatLabel();
  return (
    <div className="row-list">
      {rows.map((row) => {
        const submission = submissions.find((entry) => entry.sessionId === row.sessionId);
        const spine = submission ? studentSpineFor(submission) : null;
        // A student who had a second go is one row here and was one row here before — the
        // difference is that the row now says which of their attempts it is describing.
        const count = attempts.get(row.seatCode) ?? 1;
        return (
          <Link key={row.sessionId} to={`/educator/class/${code}/students/${row.seatCode}${keyQuery}`}>
            <div>
              <small>{label(row.seatCode)}{count > 1 ? ` · attempt ${count} of ${count}` : ""}</small>
              <h3>{spine ? SKILL_STATE_LABELS[spine.lead] : "No result"}</h3>
              <small>{spine ? shortfallLine(spine, row) : "This attempt could not be read."}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The one thing a teacher would open this student for, said in their own words.
 *
 * Every verdict here is Ladder 2, read from the table. It used to improvise three of them —
 * "not shown", "partly shown" and "Showed every required part." — none of which appeared
 * anywhere else in the product, on the row a teacher clicks to reach a page that then said
 * the same fact two further ways.
 */
function shortfallLine(spine: StudentSpine, row: StudentRow): string {
  const [first, ...rest] = spine.shortfalls;
  if (first) {
    return `${first.label} — ${levelLabel(first.level)}${rest.length > 0 ? ` · ${rest.length} more` : ""}`;
  }
  if (row.reasoningPoints === null) return "Written explanation still to read.";
  if (spine.notObserved.length > 0) {
    const count = spine.notObserved.length;
    return `${count} ${count === 1 ? "thing" : "things"} the work had to show ${count === 1 ? "was" : "were"} never asked in this run.`;
  }
  return `${LEVEL_BUCKET_LABELS.met} — everything the work had to show.`;
}

export function RealStudentEvidence() {
  const { code, seatCode } = useParams();
  const [params] = useSearchParams();
  const { state, scoreReasoning, recordOverride, sendFeedback } = useClassEvidence(code);
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";

  return (
    <ClassFrame state={state} title="That student's work did not open.">
      {(ready) => {
        // Every attempt this seat turned in, oldest first. The page opens on their **latest**,
        // so the run a teacher lands on from a class row is the run that row described — and
        // an earlier attempt is one press away rather than invisible, which is what a parent
        // asking about "the first one they did" needs it to be. Read from every row this class
        // holds rather than from the roll, so a seat taken off the roster is still reachable
        // from a link somebody already has — it is simply not listed anywhere.
        const attempts = attemptsFor(ready.analysis.rows, seatCode ?? "");
        const asked = Number(params.get("attempt"));
        const index = Number.isInteger(asked) && asked >= 1 && asked <= attempts.length ? asked - 1 : attempts.length - 1;
        const row = attempts[index] ?? null;
        if (!row) {
          return (
            <header className="page-header page-header--with-back">
              <Link to={`/educator/class/${code}${keyQuery}`}>← Class evidence</Link>
              <p className="eyebrow">{`Seat ${seatCode}`}</p>
              <h1>Nothing from this seat.</h1>
              <p>No student has turned work in from seat {seatCode} in this class.</p>
            </header>
          );
        }
        // The raw submission, not the derived row: the trail is built from the student's own
        // events, and a summary of them cannot be audited against itself.
        const submission = ready.submissions.find((entry) => entry.seatCode === seatCode && entry.sessionId === row.sessionId);
        return (
          <StudentPanel
            row={row}
            code={code ?? ""}
            keyQuery={keyQuery}
            attempt={{ number: index + 1, of: attempts.length }}
            onScore={scoreReasoning}
            {...(submission ? { submission } : {})}
            onOverride={(override) => recordOverride(row.seatCode, row.sessionId, override)}
            onFeedback={(body, flagged) => sendFeedback(row.seatCode, row.sessionId, body, flagged)}
            {...(ready.feedback.filter((entry) => entry.seatCode === row.seatCode && entry.sessionId === row.sessionId).sort((a, b) => b.at - a.at)[0]
              ? { feedback: ready.feedback.filter((entry) => entry.seatCode === row.seatCode && entry.sessionId === row.sessionId).sort((a, b) => b.at - a.at)[0]! }
              : {})}
          />
        );
      }}
    </ClassFrame>
  );
}

/** §19.1's chain, cut into the four things a teacher opens a student to do. */
const TABS = [
  { id: "trail", label: "Evidence trail" },
  { id: "plan", label: "The plan" },
  { id: "explanation", label: "The explanation" },
  { id: "next", label: "What next" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * What this attempt shows, at the top of the page it is about.
 *
 * The header used to print `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100` two
 * hundred pixels above a red *Not demonstrated*, and reconciled the two nowhere. The states
 * are the assessment; the flags are the requirements behind them; the points are at the
 * bottom of the page with a sentence saying what they count.
 */
function StudentLead({ spine, awaitingReading }: { spine: StudentSpine; awaitingReading: boolean }) {
  return (
    <div className="student-lead" data-state={spine.lead}>
      <p className="field-label">What the evidence shows</p>
      <strong>{SKILL_STATE_LABELS[spine.lead]}</strong>
      <ul className="student-lead__skills">
        {spine.competencies.map((line) => (
          <li key={line.competencyId}>
            <span>{line.statement}</span>
            <b>{SKILL_STATE_LABELS[line.state]}</b>
          </li>
        ))}
      </ul>
      {spine.shortfalls.length > 0 && (
        <ul className="student-lead__flags">
          {spine.shortfalls.map((flag) => (
            <li key={flag.evidenceRequirementId}>
              {flag.label} — {levelLabel(flag.level)}
            </li>
          ))}
        </ul>
      )}
      {spine.lead === "incomplete" && awaitingReading && (
        <p className="student-lead__absence">Their written explanation has not been read yet, so the evidence is not all in.</p>
      )}
      {spine.notObserved.length > 0 && (
        <p className="student-lead__absence">
          {spine.notObserved.length} {spine.notObserved.length === 1 ? "thing" : "things"} the work had to
          show {spine.notObserved.length === 1 ? "was" : "were"} never asked in this run. Absences, not zeros.
        </p>
      )}
    </div>
  );
}

function StudentPanel({ row, code, keyQuery, onScore, submission, onOverride, onFeedback, feedback, attempt }: {
  row: StudentRow;
  code: string;
  keyQuery: string;
  /** Which of this seat's attempts is on screen, and how many there are. */
  attempt: { number: number; of: number };
  onScore: (seat: string, session: string, scores: ReasoningScores | null) => Promise<boolean>;
  submission?: AttributedSubmission;
  onOverride: (override: OverrideRequest) => Promise<boolean>;
  onFeedback: (body: string, flagged: boolean) => Promise<boolean>;
  feedback?: TeacherFeedback;
}) {
  // Opens on the trail, because the reason to open one student is to check a conclusion —
  // and because §19.1 says the chain is read in order, not picked from.
  const [tab, setTab] = useState<TabId>("trail");
  // Opens on whatever a person already recorded, so re-opening a scored student shows
  // their reading rather than a blank rubric that would overwrite it on the next save.
  const [scores, setScores] = useState<ReasoningScores>(() => row.reasoningCriteria ?? {});
  const [saved, setSaved] = useState<string | null>(null);
  const total = reasoningTotal(scores);
  // Every criterion has to have been answered before this is a reading rather than a blank.
  const complete = REASONING_CRITERIA.every((criterion) => scores[criterion.id] !== undefined);
  const spine = submission ? studentSpineFor(submission) : null;
  const label = useSeatLabel();

  return (
    <>
      <header className="page-header page-header--split">
        <div>
          <Link to={`/educator/class/${code}${keyQuery}`}>← Class evidence</Link>
          <p className="eyebrow">Turned in {new Date(row.submittedAt).toLocaleString()}</p>
          <h1>{label(row.seatCode)}</h1>
          {/* A student who turned in twice used to be shown their later attempt silently, on a
              page with no switcher and no mention of the first — while the export listed both
              and the queue listed neither. Which one is on screen, which one the class counts,
              and a way to the other. */}
          {attempt.of > 1 && (
            <p className="class-state">
              Attempt {attempt.number} of {attempt.of}.{" "}
              {attempt.number === attempt.of
                ? "Their latest, and the one every count on this class is made from."
                : `Every count on this class is made from attempt ${attempt.of}, their latest.`}{" "}
              {Array.from({ length: attempt.of }, (_, index) => index + 1)
                .filter((number) => number !== attempt.number)
                .map((number) => (
                  <Link key={number} to={`/educator/class/${code}/students/${row.seatCode}${keyQuery ? `${keyQuery}&` : "?"}attempt=${number}`}>
                    See attempt {number}
                  </Link>
                ))}
            </p>
          )}
          <p>{summarise(row)}</p>
        </div>
        {spine
          ? <StudentLead spine={spine} awaitingReading={row.reasoningPoints === null} />
          : <p className="class-state">This attempt could not be opened in full.</p>}
      </header>

      {/* The Ladder-3 words the panel above just used, each with its sentence, once — above
          the tabs, because the header stays put while the tabs swap under it. Ladder 2's key
          belongs to the trail, which is the tab every Ladder-2 word on this page appears on
          and the one this panel opens to. */}
      {spine && <StateKey title="What these words mean" entries={skillStateKey(spine.competencies.map((line) => line.state))} />}

      {/* §19.1 says the chain is read in an order. The four tabs are that order cut into the
          four things a teacher opens a student to do, and every one of them is one click from
          every other — a teacher checking a conclusion should never have to scroll past the
          rubric to reach the evidence, or the other way round. */}
      <div className="student-tabs" role="tablist" aria-label="This student's work">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`student-tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`student-panel-${entry.id}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="student-panel-trail" aria-labelledby="student-tab-trail" hidden={tab !== "trail"}>
        {submission
          ? <EvidenceTrailPanel submission={submission} onOverride={onOverride} />
          : <p className="class-state">This attempt could not be opened in full, so there is no trail to show.</p>}
      </div>

      <div role="tabpanel" id="student-panel-next" aria-labelledby="student-tab-next" hidden={tab !== "next"}>
        {submission
          ? <StudentSummary submission={submission} />
          : <p className="class-state">This attempt could not be opened in full.</p>}
      </div>

      <div role="tabpanel" id="student-panel-explanation" aria-labelledby="student-tab-explanation" hidden={tab !== "explanation"}>
      <section className="reasoning-layout">
        <div className="student-response">
          <p className="eyebrow">What they wrote</p>
          {row.defense && row.defense.text.trim() ? (
            <blockquote>{row.defense.text}</blockquote>
          ) : (
            <p className="class-state">This student turned in no written explanation.</p>
          )}
          <p className="response-note">
            Nothing about this writing is machine-scored, and it is never sent to a model. You read it
            and you score it — which is what the student was told would happen.
          </p>
          <p className="response-note">
            <Link to={`/educator/class/${code}/reading${keyQuery}`}>Read the whole class in one queue →</Link>
          </p>
        </div>
        <div className="rubric-panel">
          {/* Not "10-point reasoning rubric". That sentence introduced a second scale as a
              fact a teacher already knew, on the two surfaces where they meet it first — and
              the product has one rubric, the levels in `labels.ts`, which this is not. What
              this panel is, is four things a person marks by hand. The maximum is not
              asserted here because it is on screen twice already: on each row's own buttons
              and in the total underneath. */}
          <p className="eyebrow">Score the writing — four things, you decide</p>
          {REASONING_CRITERIA.map((criterion) => (
            <div className="rubric-row" key={criterion.id}>
              <div><b>{criterion.label}</b><span>{criterion.hint}</span></div>
              <div className="segmented">
                {Array.from({ length: criterion.max + 1 }, (_, value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${criterion.label}: ${value} of ${criterion.max}`}
                    aria-pressed={scores[criterion.id] === value}
                    onClick={() => setScores((current) => ({ ...current, [criterion.id]: value }))}
                  >{value}</button>
                ))}
              </div>
            </div>
          ))}
          <footer>
            <span>Reasoning total</span>
            {/* An unread paragraph and a paragraph a person read and scored zero are
                different facts, and the panel used to show both as "0/10" with nothing
                selected — one stray click away from saving a zero nobody meant. */}
            <strong>{complete ? `${total}/${REASONING_MAXIMUM}` : `—/${REASONING_MAXIMUM}`}</strong>
            <Button
              aria-disabled={!complete}
              onClick={() => complete && void onScore(row.seatCode, row.sessionId, scores).then((ok) => setSaved(ok ? "Saved." : "Could not save that."))}
            >
              Save review
            </Button>
            <span aria-live="polite">{saved || (complete ? "" : "Score all four to save.")}</span>
          </footer>
        </div>
      </section>
      </div>

      <div role="tabpanel" id="student-panel-plan" aria-labelledby="student-tab-plan" hidden={tab !== "plan"}>
      {/* The plan a teacher opened this tab to read, in whichever world the student built
          one. This tab used to render nothing at all for a market run — the one view of
          what the student actually made, silently blank. */}
      {row.worldId !== "basketball" && <PopUpPlanTab row={row} />}
      {row.resolution && (
        <section className="dashboard-section">
          <div className="section-heading">
            <p className="eyebrow">How the season ended</p>
            <h2>The consequences of this plan</h2>
          </div>
          <dl className="adaptation-lines">
            <div><dt>Attendance bonus</dt><dd>{row.resolution.attendanceHeld ? "Held" : `Lost in Week ${row.resolution.bonusLostWeek}`}</dd></div>
            <div><dt>Left uncovered</dt><dd>{formatDollars(row.resolution.uncovered)}</dd></div>
            <div><dt>Course</dt><dd>{row.resolution.courseFunded ? "Funded" : `${formatDollars(row.resolution.courseShort)} short`}</dd></div>
            <div><dt>Ends holding</dt><dd>{formatDollars(row.resolution.endCash)}</dd></div>
          </dl>
        </section>
      )}

      {row.opening && row.final && <WhatMoved row={row} />}
      </div>

      {/* The other model, once, at the bottom, saying what it is.
          BOW computes a points total because a gradebook needs a number, and the way it is
          computed has not changed. What changed is that it no longer sits at the top of the
          page contradicting the states above: it is one line, it says what it counts, and
          the working behind it is one disclosure away. */}
      {submission && <Gradebook submission={submission} displayName={label(row.seatCode) === `Seat ${row.seatCode}` ? null : label(row.seatCode)} />}

      <Feedback
        seatCode={row.seatCode}
        sessionId={row.sessionId}
        {...(feedback ? { existing: feedback } : { existing: undefined })}
        onSend={onFeedback}
      />
    </>
  );
}

/**
 * One student's board, opening to final, with the product's own edits kept out of the
 * column headed as theirs.
 *
 * This printed the two sets of figures side by side and nothing else, under a heading that
 * calls the difference between them the student's. The product edits these rows too:
 * pressing *Reserve it now* at the Week 4 deadline commits the course money, and
 * `courseRowCapFor` then holds that row's ceiling at zero — so a student who paid to protect
 * the seat read **$1,200 → $0** under *What this student moved*, on the page a teacher opens
 * to check what they did. It is the same defect that printed "5 of 11 cut sports-media course
 * first" four inches beneath the same five names listed as the ones who reserved it.
 *
 * `planMovements` is where that distinction lives and nothing here re-derives it: a movement
 * is measured against `reachable`, the opening amount clamped to the ceiling the final board
 * actually left the row, and every dollar off a row is either the student's `chosenReduction`
 * or the product's `forcedReduction`. The figures either side of it are unchanged — a teacher
 * reading a plan wants the real numbers — and what is new is the column that says which of
 * the two moved each one.
 */
function WhatMoved({ row }: { row: StudentRow }) {
  const movements = planMovements(row.opening!, row.final!, { depositTaken: row.reservedSeat === true }, SCENARIO_NUMBERS);
  const forced = movements.filter((movement) => movement.forcedReduction > 0);
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <p className="eyebrow">Before and after Week 5</p>
        <h2>What this student moved</h2>
      </div>
      <table className="resolve-changes-table">
        <thead>
          <tr>
            <th scope="col">Where the money went</th>
            <th scope="col">Opening</th>
            <th scope="col">Final</th>
            <th scope="col">Moved by the student</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.category}>
              <th scope="row">{CHOICE_LABELS[movement.category]}</th>
              <td className="money">{formatDollars(row.opening![movement.category])}</td>
              <td className="money">{formatDollars(row.final![movement.category])}</td>
              <td>{movedByStudent(movement, row.final![movement.category])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {forced.length > 0 && (
        <p>
          {forced.map((movement) => CHOICE_LABELS[movement.category]).join(" and ")}
          {forced.length === 1 ? " reads" : " read"} lower because this student reserved the course seat
          at Week 4: the money committed, and BOW held the row there. It is not money they gave up.
        </p>
      )}
    </section>
  );
}

/**
 * One row's change, said as what the student did rather than as a subtraction.
 *
 * Reads `planMovements`' split rather than doing arithmetic of its own: `chosenReduction` and
 * `forcedReduction` account for every dollar off a row exactly once, and `formulas.test.ts`
 * is what keeps that true.
 */
function movedByStudent(movement: RowMovement, final: number): string {
  if (movement.chosenReduction > 0) return `Cut ${formatDollars(movement.chosenReduction)}`;
  if (final > movement.reachable) return `Added ${formatDollars(dollars(final - movement.reachable))}`;
  if (movement.forcedReduction > 0) return "Not theirs to move";
  return "Nothing";
}

/** What a market student planned, and what the generator did to it. */
function PopUpPlanTab({ row }: { row: StudentRow }) {
  const saved = row.log.filter((event) => event.type === "POPUP_PLAN_SAVED");
  const boardOf = (board: string) =>
    saved.filter((event) => (event.payload as { board?: string }).board === board).at(-1);
  const planOf = (board: string) => {
    const payload = boardOf(board)?.payload as { snapshot?: { plan?: Record<string, number> } } | undefined;
    return payload?.snapshot?.plan ?? null;
  };
  const opening = planOf("opening");
  const repair = planOf("repair");
  if (!opening) {
    return (
      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">The plan</p>
          <h2>No plan was ever committed</h2>
        </div>
        <p className="class-state">This student did not save an opening plan, so there is nothing here to read.</p>
      </section>
    );
  }
  const lines: { id: string; label: string }[] = [
    { id: "stock", label: "Stock" },
    { id: "cushion", label: "Cushion" },
    { id: "cut", label: "Your cut" },
  ];
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <p className="eyebrow">{repair ? "Before and after the generator" : "The opening plan"}</p>
        <h2>What this student planned</h2>
      </div>
      <table className="resolve-changes-table">
        <thead>
          <tr>
            <th scope="col">Where the money went</th>
            <th scope="col">Opening</th>
            {repair && <th scope="col">After the swap</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <th scope="row">{line.label}</th>
              <td className="money">{formatDollars(dollars(opening[line.id] ?? 0))}</td>
              {repair && <td className="money">{formatDollars(dollars(repair[line.id] ?? 0))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!repair && <p className="class-state">The repair board was never settled, so there is no after.</p>}
    </section>
  );
}

/**
 * The points line, for the world that has one.
 *
 * The eighteen micro-skills this total is built from are Basketball's, and only Basketball's
 * screens can produce them. Printing "2 of 90 structured" under a market run stated a number
 * the world cannot earn as though the student had failed to earn it — a figure that would
 * have been copied into a real gradebook. A world without a points spine says so and lets
 * the states stand as the account, which is what they are on every world anyway.
 */
function Gradebook({ submission, displayName }: { submission: AttributedSubmission; displayName: string | null }) {
  const line = gradebookLineFor(submission, displayName);
  return (
    <section className="gradebook">
      <p className="field-label">Gradebook line · {TERMS.requirement}</p>
      <dl className="gradebook__counts">
        <div><dt>{LEVEL_BUCKET_LABELS.met}</dt><dd>{line.requirements.met}</dd></div>
        <div><dt>{LEVEL_BUCKET_LABELS.short}</dt><dd>{line.requirements.short}</dd></div>
        {/* Never folded into the one above it. A question nobody asked is not a question
            failed, and this is the one artefact that gets copied somewhere nothing can
            explain it — which is why the export names these three the same way. */}
        <div><dt>{LEVEL_BUCKET_LABELS.neverAsked}</dt><dd>{line.requirements.neverAsked}</dd></div>
        {/* What a mark on this student would be out of, worked out once here rather than by
            twenty-eight teachers with a calculator. It is `did it + fell short` and it varies
            per student, because the two stories ask different numbers of things and a run that
            stopped early asked fewer still. */}
        <div><dt>Asked of this run</dt><dd>{line.requirements.asked}</dd></div>
      </dl>
      <p className="gradebook__note">
        A mark on this attempt is out of {line.requirements.asked} — {LEVEL_BUCKET_LABELS.met.toLowerCase()} plus{" "}
        {LEVEL_BUCKET_LABELS.short.toLowerCase()}.
        {line.requirements.neverAsked > 0
          ? ` The ${line.requirements.neverAsked} this run never asked ${line.requirements.neverAsked === 1 ? "is" : "are"} not in it: absences, not zeros.`
          : ""}
      </p>
      {/* The same glossary rule as every other surface, applied to the one artefact that
          leaves the product. The three sentences are attached to their own labels rather than
          run together into a paragraph — a teacher copying three numbers into a district
          gradebook needs to know exactly which number is which. */}
      <StateKey title="What these three count" entries={levelBucketKey()} />
      <p className="gradebook__figure">
        <strong>
          {line.reasoning.total === null
            ? "Reasoning not read yet"
            : `Reasoning ${line.reasoning.total} of ${line.reasoning.maximum}`}
        </strong>
        <span>
          {line.reasoning.total === null
            ? "The only number that leaves BOW is the one a person records after reading the writing. Nobody has read this yet."
            : "Your own marks, criterion by criterion. BOW adds nothing to it."}
        </span>
      </p>
      {line.reasoning.total !== null && (
        <dl className="gradebook__criteria">
          {line.reasoning.criteria.map((criterion) => (
            <div key={criterion.id}>
              <dt>{criterion.label}</dt>
              <dd>{criterion.mark === null ? "—" : `${criterion.mark}/${criterion.maximum}`}</dd>
            </div>
          ))}
        </dl>
      )}
      {/* Overrules, named as overrules. This counted the same thing before and called it
          "readings", which is what a teacher does to every paragraph in the queue — so it read
          0 beside writing they had read and marked themselves. */}
      {line.overrules > 0 && (
        <p className="gradebook__note">
          You have read {line.overrules} {line.overrules === 1 ? "judgement" : "judgements"} on this attempt differently
          from BOW, and {line.overrules === 1 ? "yours stands" : "yours stand"}.
        </p>
      )}
    </section>
  );
}

/**
 * One line describing what this student actually did, never how well they did it.
 *
 * Read from the world the student was actually in. This used to name Avery's housing, the
 * course seat and the Saturday clinics whatever the log said — so a market run was described
 * to a teacher as "No place chosen · waited on the course · kept the Saturdays", three
 * sentences about decisions that student was never offered. A false fact on the first line a
 * teacher reads costs more trust than a missing one, so a world with nothing to say here says
 * nothing rather than borrowing the other world's.
 */
function summarise(row: StudentRow): string {
  if (row.worldId === "food-truck") return popUpSummary(row);
  const place = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === row.setupId)?.title ?? "No place chosen";
  const bits = [
    place,
    row.reservedSeat ? "reserved the seat" : "waited on the course",
    row.tookClinics ? "took the clinics" : "kept the Saturdays",
  ];
  if (row.resolution) bits.push(row.resolution.attendanceHeld ? "made every session" : "lost the bonus");
  return bits.join(" · ");
}

/** The same line for a market run, in the market's own nouns. */
function popUpSummary(row: StudentRow): string {
  const facts = derivePopUpFacts(row.log);
  const spot = POP_UP_SCENARIO.spots.find((entry) => entry.id === facts.spotId)?.title;
  const counted = [facts.counted.catering ? "the catering job" : null, facts.counted.rebate ? "the sell-out rebate" : null]
    .filter((entry): entry is string => entry !== null);
  const bits = [
    spot ?? "No booth taken",
    counted.length > 0 ? `counted ${counted.join(" and ")}` : "counted neither conditional payment",
  ];
  if (facts.repair.saved) bits.push(facts.repair.residual > 0 ? "finished the swap still short" : "covered the swap");
  return bits.join(" · ");
}

/**
 * The eighteen micro-skills, led by the ones that did not come out full.
 *
 * The obligation this page carries is that every structured point can be traced to the
 * moment it came from — not that all eighteen are on screen at once. So the exceptions are
 * open, the rest is summarised in a line, and the complete trail is one disclosure away.
 */

export type { ClassAnalysis };
