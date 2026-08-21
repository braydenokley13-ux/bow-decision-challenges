import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { ClassUnreachable, EducatorShell, StateKey, WordKey } from "./EducatorShell";
import { useClassEvidence, type ClassEvidenceState, type OverrideRequest } from "./useClassEvidence";
import { JudgementRecord, TrailRecord } from "./EvidenceTrailPanel";
import type { AttributedSubmission } from "../platform/classes/types";
import { attemptsFor, classRoll, worldSections, type ChoiceDistribution, type ClassAnalysis, type ClassRoll, type ClassSeat, type StudentRow } from "./analysis";
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
import { levelBucketKey, levelLabel, levelMark, skillStateKey, skillStateInSentence, LEVEL_BUCKET_LABELS, SKILL_STATE_LABELS, SKILL_STATE_MARKS, SKILL_STATE_ORDER, TERMS } from "./labels";
import { REASONING_MAXIMUM } from "../domain/evidence/grade";
import { REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import { MINIMUM_RESULTS_FOR_CLASS_NARRATION } from "../domain/competency/objectiveState";
import { classSpineFrom, type ClassSpine } from "./classSpine";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { keyForClass, rememberClass, rememberedClasses } from "./classMemory";
import { classLeadFor, classStateLabel, type ClassLeadReading } from "./classLead";
import { queuePlaceFor, triageFor, writtenBackCount, type QueuePlace, type TriageBand, type TriageCluster, type TriageGroup, type TriageSeat } from "./triage";
import type { CompetencyBreakdownRow } from "./objectiveResults";
import { standardByRef } from "../domain/standards";
import { studentSpineFor } from "./studentSpine";
import { DEMO_CLASS_CODE } from "../fixtures/demoClass";
import { ObjectiveStanding } from "./ObjectiveStanding";
import type { StandardRef } from "../domain/standards/types";
import { TeachNext } from "./TeachNext";
import { decisionStepsFor } from "./decisionSteps";
import { disclosureEscape } from "../components/primitives/disclosureEscape";

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

function ClassFrame({ state, children, title, onRetry }: {
  state: ClassEvidenceState;
  title?: string;
  onRetry?: () => void;
  children: (ready: ReadyClass) => React.ReactNode;
}) {
  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  // The network, said as the network. A dead service is not a wrong link and not a signed-out
  // teacher, and this page must never say either of those about a class that is intact.
  if (state.status === "offline") {
    return <ClassUnreachable where="Class evidence" {...(onRetry ? { onRetry } : {})} />;
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
    <EducatorShell scale="teacher">
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
function NothingYet({ code, label, teacherKey, hasRoster, roll, roster, progress, loadedAt, spine, onCheckAgain }: {
  code: string;
  label: string;
  teacherKey: string;
  onCheckAgain: () => void;
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
          <ClassLead spine={spine} roll={roll} code={code} />
        </div>
        <div className="page-header__meta">
          <span>{roll.seats.length} {roll.seats.length === 1 ? "student" : "students"} · 0 attempts</span>
        </div>
      </header>
      {working && <LiveState roll={roll} roster={roster} progress={progress} code={code} loadedAt={loadedAt} onCheckAgain={onCheckAgain} />}
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
          {/* Not offered on the sample, which structurally cannot have a class list — see
              `NoRosterRefusal`. A link a class cannot follow is not a repair. */}
          {code !== DEMO_CLASS_CODE && (
            <p>
              {hasRoster ? "Their cards are on the " : "Or hand out named cards instead — "}
              <Link to={`/educator/class/${code}/roster`}>{hasRoster ? "class list" : "make the class list"}</Link>.
            </p>
          )}
          <Button variant="secondary" onClick={onCheckAgain}>Check again</Button>
        </div>
      </section>
    </>
  );
}

/**
 * The no-roster refusal, and a repair the class it is on can actually perform.
 *
 * The sentence is the one `RULING.md` §2 R2 singles out — the proof the page will not invent
 * a room it cannot see. Its repair link was `/educator/class/<code>/roster` on every class,
 * including the sample, where that route can never work: `DEMO` is four characters precisely
 * so no real class code can equal it, and its runs were never posted to anything. So the one
 * control the refusal offered, in the first viewport, was a dead end (`DEFECTS.md` D20).
 *
 * A refusal that offers a repair it cannot perform is a second false statement bolted to a
 * true one. On the sample the repair is the real one: make a class that can have a list.
 */
function NoRosterRefusal({ code, className }: { code: string; className: string }) {
  if (code === DEMO_CLASS_CODE) {
    return (
      <p className={className}>
        This class has no student list, so BOW cannot say who has not started — only who has.
        The sample class cannot have one.{" "}
        <Link to="/educator/classes">Make a class of your own</Link> and every seat gets a name.
      </p>
    );
  }
  return (
    <p className={className}>
      This class has no student list, so BOW cannot say who has not started — only who has.
      {" "}<Link to={`/educator/class/${code}/roster`}>Add one</Link> and every seat gets a name.
    </p>
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
    // A span rather than a paragraph: on the class overview this sits in the identity line
    // beside the counts and the timestamp, and a block element there would break one line
    // into three. `.eyebrow` carries the type either way.
    return (
      <span className="eyebrow">
        {[label, worlds].filter(Boolean).join(" · ")}{" "}
        <Button type="button" variant="quiet" onClick={() => { setTyped(label); setSaid(null); setEditing(true); }}>
          Rename
        </Button>
        {said && <span aria-live="polite"> · {said}</span>}
      </span>
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

/**
 * One decision, and who made each call. Counts, and the seats behind every count.
 *
 * The seats moved behind a native disclosure rather than off the page. Printed inline under
 * every share of every question, they were the single largest block of repeated text on the
 * class overview — and they are the thing that makes a count checkable, so they cannot go.
 * `<details>` is the whole mechanism: keyboard-operable, announced, no JavaScript.
 */
function Distribution({ distribution, seats }: { distribution: ChoiceDistribution; seats: number }) {
  const names = useSeatNames();
  return (
    <article className="dist">
      <h3>{distribution.question}</h3>
      <ul>
        {distribution.shares.map((share) => (
          <li key={share.id} data-empty={share.seats.length === 0}>
            <b data-count="">{share.seats.length}</b>
            <span>
              of {seats} — {share.label}
              {share.seats.length > 0 && (
                <details onKeyDown={disclosureEscape()}>
                  <summary>Which seats</summary>
                  <p>{seatLabels(share.seats, names)}</p>
                </details>
              )}
            </span>
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
/**
 * What this class was asked to show, as the tail of "…showed ___".
 *
 * The objective a teacher set, in their framework's own code, or the work itself where they
 * set none. Short on purpose: it lands in the largest type on the page, which is the sentence
 * a teacher screenshots into a department report.
 */
function demandLabelFor(spine: ClassSpine): string {
  const objective = spine.objectiveRef ? standardByRef(spine.objectiveRef) : undefined;
  return objective ? `everything ${objective.code} asks for` : "everything the work asked for";
}

/**
 * The reading, computed once, wherever the lead is rendered.
 *
 * The class page lays the four parts of it out itself — headline, detail, refusal and the
 * one control — because on the instrument they are four things in three positions rather
 * than a stack. `NothingYet` still renders the stack, and both read this, so the two screens
 * cannot come to say different things about the same class.
 */
export function classLeadReading(spine: ClassSpine, roll: ClassRoll): ClassLeadReading {
  return classLeadFor({
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
    demandLabel: demandLabelFor(spine),
    narratable: spine.narratable,
  });
}

function ClassLead({ spine, roll, code }: {
  spine: ClassSpine;
  roll: ClassRoll;
  code: string;
}) {
  const lead = classLeadReading(spine, roll);
  return (
    <>
      <h1>{lead.headline}</h1>
      <p>{lead.detail}</p>
      {/* The refusal, in the words §15.3 defines it by. It is a definition rather than a
          count, so it sits under the count it explains rather than inside it. */}
      {lead.note && <p className="class-state">{lead.note}</p>}
      {lead.action && (
        <p>
          <Link className="button button--primary" to={`/educator/class/${code}/${lead.action.route}`}>
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
function LiveState({ roll, roster, progress, code, loadedAt, onCheckAgain, compact = false }: {
  /** The class, counted once, by the same function every other number on this page reads. */
  roll: ClassRoll;
  roster: readonly RosterRow[];
  progress: readonly ProgressRow[];
  code: string;
  /** When this page was fetched. Elapsed time is measured from it so the render is a function of its input. */
  loadedAt: number;
  /** Ask the service again. The panel says when it last did, so this is a control and not a hope. */
  onCheckAgain: () => void;
  /**
   * On the class overview, where three of the five things this panel used to say are now
   * said better somewhere else.
   *
   * The counts are the instrument's foot, the seats nobody has heard from are chips in the
   * triage, the timestamp and the way to take another reading are on the identity line, and
   * the no-list refusal is beside the headline it explains. What is left is the part with
   * nowhere else to be: which children are mid-run, on which screen, and how long since
   * their browser last said anything — plus the two facts about this class that are neither
   * a count nor a judgement. With none of those true, this renders nothing rather than an
   * empty card.
   */
  compact?: boolean;
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
  if (compact && startedRows.length === 0 && roll.excluded.length === 0) return null;

  return (
    <section className={compact ? "surface-record live-state" : "dashboard-section live-state"}>
      <div className={compact ? "record__head" : "section-heading"}>
        {!compact && <p className="eyebrow">Right now</p>}
        <h2>{compact ? "Who is mid-run right now" : "Where the room is"}</h2>
        {/* When this was taken, and a way to take it again.
            "Right now" was a snapshot: two API calls, both at load, no refresh anywhere on a
            class that has data. A teacher-experience review opened this page, started a student
            in another browser, waited sixty seconds without touching anything, and the counts
            never moved — on the one section of the product that tells her who is stuck. The
            honest fix is not to make the heading quieter: it is to say when the reading was
            taken and let her take another. Auto-polling is deliberately not it — a panel that
            renumbers itself under a teacher who is reading a name off it is worse than one that
            is plainly a minute old. */}
        {!compact && (
          <p className="live-state__taken">
            <span>As at {new Date(loadedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            <Button variant="quiet" onClick={onCheckAgain}>Check again</Button>
          </p>
        )}
      </div>
      {/* Every tile carries the class it is a count of. "Still working 3" was a number a
          teacher had to hold the class size in their head to read — and the morning after the
          lesson it was a number about nobody. */}
      {!compact && (
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
      )}
      {/* First, because it is the only line on this screen a teacher acts on by standing up.
          It used to print under a list of nineteen working students, which at minute five of
          a lesson pushed it off a 1366×768 screen — the one minute it exists for. */}
      {!compact && notStarted.length > 0 && (
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
                <Link to={`/educator/class/${code}/students/${row.seatCode}`}>{label(row.seatCode)}</Link>
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
      {!compact && !roll.hasRoster && <NoRosterRefusal code={code} className="class-state" />}
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
function Feedback({ seatCode, sessionId, notes, onSend, onRevise, onWithdraw }: {
  seatCode: string;
  sessionId: string;
  /** Every note on this attempt, oldest first, tombstoned ones included. */
  notes: readonly TeacherFeedback[];
  onSend: (body: string, flagged: boolean) => Promise<boolean>;
  onRevise: (id: string, body: string, flagged: boolean) => Promise<boolean>;
  onWithdraw: (id: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  /** The note being rewritten in place, if any. Editing borrows the one composer. */
  const [editing, setEditing] = useState<string | null>(null);
  /** The note one press from being taken back. Same shape as the roster's erase confirmation. */
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const trimmed = body.trim();

  const heard = notes.filter((note) => !note.deletedAt);
  const takenBack = notes.filter((note) => note.deletedAt);

  const send = async () => {
    if (trimmed.length === 0 || sending) return;
    setSending(true);
    const ok = editing ? await onRevise(editing, trimmed, flagged) : await onSend(trimmed, flagged);
    setSending(false);
    setSaid(ok
      ? editing ? "Changed. That is what they see now." : "Sent. They will see it next time they open BOW."
      : "That did not send. Try again.");
    if (ok) { setBody(""); setEditing(null); }
  };

  const startEditing = (note: TeacherFeedback) => {
    setEditing(note.id);
    setBody(note.body);
    setFlagged(note.flagged);
    setWithdrawing(null);
    setSaid(null);
  };

  const withdraw = async (id: string) => {
    const ok = await onWithdraw(id);
    setWithdrawing(null);
    setSaid(ok ? "Taken back. They no longer see it." : "That did not send. Try again.");
    if (ok && editing === id) { setEditing(null); setBody(""); }
  };

  return (
    <section className="feedback">
      {/* An `h2`: on the student's page this is one of the page's own records, and it is the
          one thing on the screen only a person can do. It used to be an `h3` inside a stack
          at the bottom of a 7,500px document. */}
      <div className="record__head">
        <h2>What they hear from you</h2>
        <p>Write back</p>
      </div>
      {/* The whole sequence, oldest first, because that is the order it is read in on the
          student's own home page — a correction printed above the sentence it corrects is
          unreadable. This used to render `[0]` of the same list sorted the other way, so a
          teacher who wrote twice saw one note under a heading that says it is what the child
          hears, while the child had both.

          The class names below are doubled on purpose. `feedback__sequence`,
          `feedback__row-actions` and `feedback__confirm` are the hooks this block wants and
          `app.css` does not have yet; the second name on each is an existing rule that already
          carries the right visual role (a stacked list of records; a wrapped row of quiet
          controls with a warning sentence above them). So this renders correctly today and the
          rules can be written under their own names later without touching this file. */}
      {heard.length === 0
        ? <p className="feedback__none">Nothing has been written back about this run yet.</p>
        : (
          <ol className="feedback__sequence judgement-list">
            {heard.map((note) => (
              <li key={note.id}>
                <blockquote className="feedback__sent">
                  {note.body}
                  <cite>
                    Sent {new Date(note.at).toLocaleDateString()}
                    {note.editedAt ? ` · changed ${new Date(note.editedAt).toLocaleDateString()}` : ""}
                  </cite>
                </blockquote>
                {withdrawing === note.id ? (
                  <p className="feedback__confirm classes-forget">
                    <span className="classes-forget__warn">They may already have read this. Taking it back stops them seeing it from now on; it does not unsay it.</span>
                    <Button variant="primary" onClick={() => void withdraw(note.id)}>Take it back from them</Button>
                    <button type="button" className="button button--quiet" onClick={() => setWithdrawing(null)}>Leave it</button>
                  </p>
                ) : (
                  <p className="feedback__row-actions classes-forget">
                    <button type="button" className="button button--quiet" onClick={() => startEditing(note)}>Change it</button>
                    <button type="button" className="button button--quiet" onClick={() => { setWithdrawing(note.id); setSaid(null); }}>Take it back</button>
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      {/* Kept, and said plainly. A teacher who takes back the wrong sentence has to be able to
          see what they took back — the same reason removing a student from a roster keeps what
          that student did. */}
      {takenBack.length > 0 && (
        <div className="feedback__withdrawn">
          <p className="field-label">Taken back — they no longer see {takenBack.length === 1 ? "this" : "these"}</p>
          {takenBack.map((note) => (
            <blockquote key={note.id}>
              {note.body}
              <cite>Sent {new Date(note.at).toLocaleDateString()} · taken back {new Date(note.deletedAt!).toLocaleDateString()}</cite>
            </blockquote>
          ))}
        </div>
      )}
      <label className="field" htmlFor={`feedback-${seatCode}-${sessionId}`}>
        <span className="field-label">
          {editing ? "Change what this note says" : heard.length > 0 ? "Say something else" : "One or two sentences"}
        </span>
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
          {sending ? "Sending…" : editing ? "Save the change" : "Send it"}
        </Button>
        {editing && (
          <button type="button" className="button button--quiet" onClick={() => { setEditing(null); setBody(""); }}>
            Leave it as it was
          </button>
        )}
        <span>{MAX_FEEDBACK_LENGTH - body.length} left</span>
      </div>
      <p aria-live="polite">{said}</p>
    </section>
  );
}

/**
 * The class overview, as an instrument rather than a document.
 *
 * Six regions, and they are three materials rather than seven identical cards. What
 * changed is not what this page knows — nothing left the DOM — it is that the page now
 * ranks itself, because a demotion is expressible: the thing a teacher acts on is raised,
 * the reference is flat, and the furniture is neither.
 *
 * R1 · the identity line — margin. Which class, and when this reading was taken.
 * R2 · the instrument — the page's one raised surface: the lead, and the triage, which is
 *      the class list. Every seat in the room, ranked by what their evidence shows, with
 *      the room-state counts on its foot.
 * R3 · what to teach next — record.
 * R4 · where the class is on each skill — record.
 * R5 · what each story's students decided — record.
 * R6 · the key and the ways out — margin.
 *
 * The `1 · 2 · 3 · 4 · 5` numbering is gone with the flat sequence it was numbering. The
 * counts that were a section called "Where the room is" are the instrument's foot, because
 * they are context for the triage rather than a question of their own. The eighteen
 * identical rows under "Every student who turned in" are the same eighteen students, ranked,
 * inside the instrument. Nothing was deleted to make it shorter.
 */
export function RealClassOverview() {
  const { code } = useParams();
  const { state, teacherKey, reload } = useClassEvidence(code);

  return (
    <ClassFrame state={state} onRetry={reload}>
      {(ready) => {
        const { analysis, record, assignments, submissions } = ready;
        const names = seatNames(ready.roster);
        // One reading of who is in this class and what each of them turned in. Every count
        // below is taken from it — the headline, the foot, the table's denominator, the
        // triage and the export — so two of them cannot disagree about the same room.
        // They used to be computed five ways and three of them were on screen at once.
        // `at` is when the page was read, so "still working" is a claim about now rather than
        // about whenever a browser last said anything.
        const roll = classRoll({ rows: analysis.rows, roster: ready.roster, progress: ready.progress, at: ready.loadedAt });
        // The reading is against the same class: one attempt per student still in the room,
        // so "turned in" in the headline is the same number as "turned in" on the foot.
        const counted = roll.rows.flatMap((row) => submissions.filter((entry) => entry.sessionId === row.sessionId));
        const spine = classSpineFrom({ record, assignments, submissions: counted });
        if (roll.rows.length === 0) {
          return (
            <NothingYet
              code={record.code}
              label={record.label}
              teacherKey={teacherKey ?? ""}
              hasRoster={roll.hasRoster}
              roll={roll}
              roster={ready.roster}
              progress={ready.progress}
              loadedAt={ready.loadedAt}
              spine={spine}
              onCheckAgain={reload}
            />
          );
        }
        const total = roll.turnedIn;
        const lead = classLeadReading(spine, roll);
        const stateWord = classStateLabel(spine.reading?.result.state ?? null);
        const groups = triageFor({ seats: roll.seats, submissions, feedback: ready.feedback });
        const answered = writtenBackCount(groups);
        const size = roll.seats.length;
        const words = new Set(groups.flatMap((group) => (group.state ? [group.state] : [])));

        return (
          <>
            {/* R1 · margin. One line: which class this is, what it played, and when this
                reading was taken. It used to be a bordered header with a 40px headline in
                it; the headline belongs to the instrument and this is furniture. */}
            <header className="class-identity surface-margin">
              <ClassName
                code={record.code}
                label={record.label}
                teacherKey={teacherKey ?? ""}
                worlds={worldsPlayed(roll.rows)}
              />
              {/* The unit, said out loud, on the surface a teacher reads a number off and
                  then says it to a room. One student who had two goes is one student and two
                  attempts, so this names both rather than leaving a colleague to work out
                  which of two screens is lying. And when the reading was taken, with the way
                  to take another — the counts below do not renumber themselves under a
                  teacher who is reading a name off them. */}
              <p className="class-identity__facts">
                <span data-count="">{size} {size === 1 ? "student" : "students"} · {roll.attempts.length} {roll.attempts.length === 1 ? "attempt" : "attempts"}</span>
                <span>As at {new Date(ready.loadedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                <Button variant="quiet" onClick={reload}>Check again</Button>
              </p>
            </header>

            {/* R2 · THE INSTRUMENT. The one raised surface on this page, and the only one
                there may ever be — `oneInstrument.test.tsx` fails the build on a second. */}
            <section className="surface-instrument instrument" aria-labelledby="class-lead">
              <div className="instrument__grid">
                <div className="instrument__lead">
                  <h1 id="class-lead">{lead.headline}</h1>
                  <p className="instrument__detail">{lead.detail}</p>
                  {stateWord && spine.reading && (
                    <p className="instrument__state" data-count="">
                      {stateWord} · {spine.reading.result.demonstrated} of {spine.assessed}
                    </p>
                  )}
                  <div className="instrument__actions">
                    {lead.action && (
                      <Link className="button button--primary" to={`/educator/class/${record.code}/${lead.action.route}`}>
                        {lead.action.label} →
                      </Link>
                    )}
                    {/* One purple control on the page. The debrief is the second thing to do,
                        so it is drawn as the second thing to do. */}
                    {spine.narratable && lead.action?.route !== "debrief" && (
                      <Link className="button button--secondary" to={`/educator/class/${record.code}/debrief`}>Run the debrief</Link>
                    )}
                  </div>
                  {/* The refusal, in the words §15.3 defines it by, and the repair beside it.
                      An em dash with a reason beats a fabricated zero: this is the sentence
                      that proves the page will not invent a room it cannot see. */}
                  {lead.note && <p className="instrument__refusal">{lead.note}</p>}
                  {!roll.hasRoster && <NoRosterRefusal code={record.code} className="instrument__refusal" />}
                </div>
                <Triage groups={groups} code={record.code} size={size} />
              </div>
              {/* The foot. These four counts were a whole section with a heading of their
                  own; they are context for the triage above them, not a question of their
                  own, and every one of them carries the class it is a count of. */}
              <dl className="instrument__foot">
                <div><dt>Turned in</dt><dd data-count="">{roll.turnedIn} of {size}</dd></div>
                <div><dt>Working right now</dt><dd data-count="">{roll.stillWorking} of {size}</dd></div>
                {roll.startedQuiet > 0 && (
                  <div><dt>Started, not turned in</dt><dd data-count="">{roll.startedQuiet} of {size}</dd></div>
                )}
                <div><dt>Not started</dt><dd data-count="">{roll.notStarted === null ? "—" : `${roll.notStarted} of ${size}`}</dd></div>
                {/* The half of the loop only a person can close, which no surface in this
                    product carried before. It is a count rather than a group for the reason
                    `triage.ts` gives: an empty one would swallow the room. */}
                <div><dt>Written back</dt><dd data-count="">{answered.writtenBack} of {answered.read} read</dd></div>
              </dl>
            </section>

            {/* Who is mid-run, and the two things about this class that are neither a count
                nor a judgement. A record: it is what a teacher checks, not what they act on. */}
            <LiveState
              compact
              roll={roll}
              roster={ready.roster}
              progress={ready.progress}
              code={record.code}
              loadedAt={ready.loadedAt}
              onCheckAgain={reload}
            />

            {!spine.narratable && (
              <p className="class-guard surface-margin">
                {total} turned in — individual work above. BOW does not describe a class from
                fewer than {MINIMUM_RESULTS_FOR_CLASS_NARRATION} runs.
              </p>
            )}

            {/* R3 · record. §18.1, on the surface a teacher actually lands on. The objective
                page renders the same reading from the same module; neither owns it. */}
            {spine.reading && spine.narratable && (
              <section className="surface-record" aria-labelledby="teach-next">
                <div className="record__head">
                  <h2 id="teach-next">What should I teach next?</h2>
                  <p>From this class's own evidence</p>
                </div>
                <TeachNext
                  reading={spine.reading.teachNext}
                  spotlight={spine.reading.spotlight}
                  classCode={record.code}
                  teacherKey={teacherKey ?? ""}
                  level={3}
                />
              </section>
            )}

            {/* R4 · record. Weakest first, so the row a teacher would act on is the row they
                meet — the same ranking the triage above does, at skill grain. */}
            {spine.narratable && spine.reading && spine.reading.competencies.length > 0 && (
              <section className="surface-record" aria-labelledby="class-skills">
                <div className="record__head">
                  <h2 id="class-skills">Where the class is on each skill</h2>
                  <p>Weakest first</p>
                </div>
                <table className="micro-table">
                  {/* Two sentences because there are two numbers and only one of them is
                      this table's denominator. It read "Counts across the {assessed} of
                      {total} with a usable result", which claims the rows below are counted
                      over the assessed students — and they are not: every student who turned
                      in lands in exactly one state per skill, and the unassessed are named as
                      an absence rather than dropped. */}
                  <caption>
                    Counts across all {total} who turned in. {spine.assessed} of them have a usable
                    result — nothing the work had to show is missing from their run. The rest are
                    still short of something, and the rows below name that as an absence rather
                    than a zero.
                  </caption>
                  <thead><tr><th scope="col">Skill</th><th scope="col">Where the class is</th></tr></thead>
                  <tbody>
                    {weakestFirst(spine.reading.competencies).map((row) => (
                      <tr key={row.competencyId}>
                        <th scope="row">{competencyStatement(row.competencyId, submissions)}</th>
                        {/* Counts of students, so the words are Ladder 3 — one claim about
                            one child, added up. The bar beside them is decoration and says
                            so: it is `aria-hidden`, and every number it draws is in the
                            sentence under it with its denominator attached. */}
                        <td data-label="Where the class is">
                          <span className="skill-bar" aria-hidden="true">
                            {SKILL_STATE_ORDER.filter((entry) => row.counts[entry] > 0).map((entry) => (
                              <span key={entry} data-state={entry} style={{ flex: row.counts[entry] }} />
                            ))}
                          </span>
                          <span className="skill-rows__counts">
                            {Object.entries(row.counts)
                              .filter(([, count]) => count > 0)
                              .map(([entry, count]) => `${count} ${skillStateInSentence(entry as CompetencyResultState)}`)
                              .join(" · ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* R5 · record. Below the guard nothing here describes the class: these are
                distributions, so they wait until there is a class to distribute. Kept and
                demoted rather than cut — a teacher mid-lesson who wants "how many chose the
                sublet" has to have a path to it, and the seats behind every count are one
                native disclosure away rather than inline under every row. */}
            {spine.narratable && (
            <div className="record-pair">
            {worldSections(roll.rows).map((world) => (
              // Both regions are headed "What they decided", and on a mixed class that gave
              // two landmarks one accessible name — visually distinct, programmatically
              // identical (axe `landmark-unique`). The line that disambiguates them on screen
              // is the world's title beside the heading, so it is in the name too.
              <section
                className="surface-record"
                key={world.worldId}
                aria-labelledby={`decided-${world.worldId} decided-${world.worldId}-which`}
              >
                <div className="record__head">
                  <h2 id={`decided-${world.worldId}`}>What they decided</h2>
                  <p id={`decided-${world.worldId}-which`}>{world.title} · {world.seats} {world.seats === 1 ? "student" : "students"}</p>
                </div>
                <div className="record-columns">
                  {world.distributions.map((distribution) => (
                    <Distribution key={distribution.id} distribution={distribution} seats={world.seats} />
                  ))}
                </div>
                {world.adaptation && (
                  <div className="record-columns" style={{ marginTop: "var(--s-5)" }}>
                    <div className="dist">
                      <h3>{world.adaptation.heading} · what moved</h3>
                      {world.adaptation.cuts.length > 0 && (
                        <ul>
                          {world.adaptation.cuts.map((entry) => (
                            <li key={entry.label}>
                              <b>{entry.seats.length}</b>
                              <span>
                                of {world.seats} cut <strong>{entry.label}</strong> first
                                <details onKeyDown={disclosureEscape()}>
                                  <summary>Which seats</summary>
                                  <p>{seatLabels(entry.seats, names)}</p>
                                </details>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <ul>
                        {world.adaptation.lines.map((line) => (
                          <li key={line.label}>
                            <b>{line.count}</b>
                            <span>of {world.seats} — {line.label.toLowerCase()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            ))}
            </div>
            )}

            {/* R6 · margin. The key once, behind one disclosure, and the ways out of the
                page. Three boxed keys at section weight used to be repeated down the page. */}
            <div className="surface-margin">
              <WordKey title="What these words mean" entries={skillStateKey(words)} />
              <div className="teacher-foot">
                <ExportClass roll={roll} submissions={submissions} roster={ready.roster} label={record.label} />
                <Link className="button button--secondary" to={`/educator/class/${record.code}/share-out`}>Pick what the room sees</Link>
                {/* The class list, except on a class that structurally cannot have one.
                    `/educator/class/DEMO/roster` renders "This class did not open." — a link
                    to a dead end is worse than no link. */}
                {roll.hasRoster && (
                  <Link className="button button--secondary" to={`/educator/class/${record.code}/roster`}>Class list</Link>
                )}
              </div>
            </div>
          </>
        );
      }}
    </ClassFrame>
  );
}

/**
 * The skills, ranked by how much of the class is still short of them.
 *
 * The order used to be whatever `classResultFor` produced, which is the order the skills are
 * declared in — so the row a teacher would act on was wherever it happened to fall. Weakest
 * first is the same ranking the triage above it does, at skill grain, and it is computed
 * rather than authored: the share of this skill's students who have shown it, ascending.
 */
function weakestFirst(rows: readonly CompetencyBreakdownRow[]): CompetencyBreakdownRow[] {
  const shown = (row: CompetencyBreakdownRow) => {
    const total = Object.values(row.counts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 1;
    return (row.counts.demonstrated + row.counts["demonstrated-with-support"]) / total;
  };
  return [...rows].sort((a, b) => shown(a) - shown(b));
}

/**
 * Who needs you, ranked — and the same shortfall said once.
 *
 * This *is* the class list. It replaces a section of eighteen identical rows headed "Every
 * student who turned in", which answered "what does this class contain" to a teacher who
 * asked "who needs me". Every seat in the room is here, in a band named by what their own
 * evidence shows, worst band first.
 *
 * The cost is real and is worth naming: there is no flat, seat-ordered view of the class on
 * this page any more. Grouping wins because the page's job is *who needs you*, and the class
 * list — in seat order, with names and cards — is one link away at the foot.
 */
function Triage({ groups, code, size }: { groups: readonly TriageGroup[]; code: string; size: number }) {
  const label = useSeatLabel();
  return (
    <div className="triage">
      <h2>Who needs you — all {size}, ranked</h2>
      {groups.map((group) => (
        <div className="triage__group" key={group.band} data-state={group.state ?? "not-in"}>
          <p className="triage__head">
            <span className="triage__count" data-count="">{group.seats.length}</span>
            <span className="triage__state">
              <span className="mark-glyph" aria-hidden="true">{group.state ? SKILL_STATE_MARKS[group.state] : "◌"}</span>
              <span>{group.state ? SKILL_STATE_LABELS[group.state] : "Not turned in"}</span>
            </span>
            <span className="triage__hint">{bandHint(group)}</span>
          </p>
          {group.band === "short"
            ? group.clusters.map((cluster) => (
              cluster.seats.length > 1
                ? <Cluster key={cluster.key} cluster={cluster} code={code} label={label} />
                : cluster.seats.map((seat) => <TriageRow key={seat.seatCode} seat={seat} code={code} label={label} />)
            ))
            : (
              <ul className="triage-seats">
                {group.seats.map((seat) => (
                  <li key={seat.seatCode}><SeatChip seat={seat} code={code} label={label} /></li>
                ))}
              </ul>
            )}
        </div>
      ))}
    </div>
  );
}

/** What this band is, in one clause, so the words above it never stand alone. */
function bandHint(group: TriageGroup): string {
  if (group.band === "not-in") return "Nothing has arrived from these seats.";
  if (group.band === "short") {
    return group.seats.some((seat) => seat.reading !== null)
      ? "Open these first — every row names the gap and what you read in the writing, weakest reading first."
      : "Open these first — every row names the gap.";
  }
  if (group.band === "incomplete") {
    return group.seats.some((seat) => seat.gapShowing)
      ? "Their writing is unread. A seat marked read first already shows a gap, so it is worth reading before the rest."
      : "Their writing is unread, so nothing about them is settled yet.";
  }
  if (group.band === "never") return "This run never asked for any of it.";
  return group.seats.some((seat) => seat.afterAHint)
    ? "Everything the work had to show — one of them after a hint."
    : "Everything the work had to show.";
}

/** One child, one gap, one way in. The four rows this page exists to put on a screen. */
function TriageRow({ seat, code, label }: { seat: TriageSeat; code: string; label: (seat: string) => string }) {
  return (
    <Link className="triage__row" data-seat={seat.seatCode} to={`/educator/class/${code}/students/${seat.seatCode}`}>
      <b>{label(seat.seatCode)}</b>
      <span>
        {seat.gap ? `${seat.gap.label} — ${seat.gap.verdict}` : "Still short of something the work had to show"}
        {seat.gap && seat.gap.more > 0 ? ` · ${seat.gap.more} more` : ""}
        {/* The other half of the pair, on the row, in the same breath as BOW's half. A row
            that printed only the machine's word put the best writer in the class at the top
            of the triage and the weakest three rows below her. */}
        {seat.reading && <> · <span className="mark-reading">you read the writing {seat.reading.points} of {seat.reading.of}</span></>}
        {seat.writtenBack && <> · <span className="mark-written">written back</span></>}
      </span>
      <span className="triage__arrow" aria-hidden="true">→</span>
    </Link>
  );
}

/**
 * One shortfall, and every child showing it.
 *
 * Three rows reading "Savings is a planned amount — Did not do it" are one shortfall printed
 * three times, which is the defect this page exists to cure appearing inside the cure. The
 * gap heads the row, the children are chips through to their own evidence, and the lesson
 * for the wrong idea behind it is the thing to do about all three at once.
 */
function Cluster({ cluster, code, label }: { cluster: TriageCluster; code: string; label: (seat: string) => string }) {
  return (
    <div className="triage__cluster">
      <p className="triage__gap">
        {cluster.gap ? `${cluster.gap.label} — ${cluster.gap.verdict}` : "Short of something the work had to show"}
        <span className="triage__same">Same gap, {cluster.seats.length} students</span>
      </p>
      <ul className="triage-seats">
        {cluster.seats.map((seat) => (
          <li key={seat.seatCode}><SeatChip seat={seat} code={code} label={label} /></li>
        ))}
      </ul>
      {cluster.reteach && (
        <p className="triage__reteach">
          Teach it once: <strong>{cluster.reteach.title}</strong> · about {cluster.reteach.minutes} minutes.
        </p>
      )}
    </div>
  );
}

/** One seat, as a chip through to their own evidence, with whatever rides on it. */
function SeatChip({ seat, code, label }: { seat: TriageSeat; code: string; label: (seat: string) => string }) {
  if (seat.state === null) {
    // A link, now that the destination is a person: the seat's own page renders their name,
    // their state and the screen they are on rather than "Nothing from this seat."
    return (
      <Link className="triage-seat" data-seat-waiting={seat.seatCode} to={`/educator/class/${code}/students/${seat.seatCode}`}>
        {label(seat.seatCode)}
        <small>{seat.roll === "not-started" ? "not started" : "still working"}</small>
      </Link>
    );
  }
  return (
    <Link className="triage-seat" data-seat={seat.seatCode} to={`/educator/class/${code}/students/${seat.seatCode}`}>
      {label(seat.seatCode)}
      {seat.afterAHint && (
        <small><span className="mark-glyph" aria-hidden="true">{SKILL_STATE_MARKS["demonstrated-with-support"]}</span>{"\u00a0"}after a hint</small>
      )}
      {seat.gapShowing && seat.awaitingReading && <small className="mark-first">read first</small>}
      {seat.reading && <small className="mark-reading">you read {seat.reading.points} of {seat.reading.of}</small>}
      {seat.writtenBack && <small className="mark-written">written back</small>}
    </Link>
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
 * The class list used to be a section of its own — eighteen identical rows headed *Every
 * student who turned in*, each one leading with a state word and none of them ranked. It is
 * the triage inside the instrument now: the same eighteen students, the same evidence, in
 * bands worst-first with the shortfall named on the row and identical shortfalls said once.
 * `StudentRows` and the line it composed went with the section, because both existed to
 * render a flat list that no longer exists — and a helper kept for a surface that is gone is
 * how the surface comes back.
 */

export function RealStudentEvidence() {
  const { code, seatCode } = useParams();
  const [params] = useSearchParams();
  const { state, reload, scoreReasoning, recordOverride, sendFeedback, reviseFeedback, withdrawFeedback } = useClassEvidence(code);

  return (
    <ClassFrame state={state} title="That student's work did not open." onRetry={reload}>
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
        // Read once, before the branch, because a seat with nothing turned in is still a
        // child if the roll knows about them — and the page that linked here named them.
        const roll = classRoll({ rows: ready.analysis.rows, roster: ready.roster, progress: ready.progress, at: ready.loadedAt });
        const groups = triageFor({ seats: roll.seats, submissions: ready.submissions, feedback: ready.feedback });
        if (!row) {
          const seat = roll.seats.find((entry) => entry.seatCode === seatCode) ?? null;
          return (
            <NotTurnedIn
              seat={seat}
              seatCode={seatCode ?? ""}
              code={code ?? ""}
              progress={ready.progress}
              loadedAt={ready.loadedAt}
              queue={seat ? queuePlaceFor(groups, seat.seatCode) : null}
            />
          );
        }
        // The raw submission, not the derived row: the trail is built from the student's own
        // events, and a summary of them cannot be audited against itself.
        const submission = ready.submissions.find((entry) => entry.seatCode === seatCode && entry.sessionId === row.sessionId);
        // The objective the teacher actually set, for the block that joins this student's
        // evidence to it. Read off the assignment the submission was attributed to rather
        // than off the class, because a class can hold several and only one of them is what
        // this attempt was for. A legacy assignment carries `null` and the block draws nothing.
        const setFor = ready.assignments.find((entry) => entry.id === submission?.assignmentId);
        // Where this child sits in the pile the teacher is working through, computed from the
        // same triage the class page ranks — so "next" is the next child in the band they are
        // already in, and a teacher never has to go back to the class page to reach them.
        const queue = queuePlaceFor(groups, row.seatCode);
        return (
          <StudentPanel
            row={row}
            code={code ?? ""}
            objectiveRef={setFor?.objectiveRef ?? null}
            attempt={{ number: index + 1, of: attempts.length }}
            queue={queue}
            onScore={scoreReasoning}
            {...(submission ? { submission } : {})}
            onOverride={(override) => recordOverride(row.seatCode, row.sessionId, override)}
            onFeedback={(body, flagged) => sendFeedback(row.seatCode, row.sessionId, body, flagged)}
            onRevise={reviseFeedback}
            onWithdraw={withdrawFeedback}
            // Every note on this attempt, oldest first — the order the student reads them in.
            // This used to pass the newest one and nothing else, under a heading that tells the
            // teacher it is what the child hears.
            notes={ready.feedback
              .filter((entry) => entry.seatCode === row.seatCode && entry.sessionId === row.sessionId)
              .sort((a, b) => a.at - b.at)}
          />
        );
      }}
    </ClassFrame>
  );
}

/**
 * A seat on the roll with nothing turned in — which is a person, not an absence.
 *
 * The class page names these children twice on its first screen: in the triage, and in
 * *Who is mid-run right now*. Both were links, and both landed on **"Nothing from this
 * seat. No student has turned work in from seat 11 in this class."** — no name, no state,
 * no screen they are on, no way to the next child. The page contradicted the page that
 * linked to it, one click earlier, on a class where the teacher had pasted the name herself
 * (`DEFECTS.md` D19).
 *
 * A seat with no roster row at all keeps the old refusal, because then it is true: nothing
 * in this class knows who sits there.
 */
function NotTurnedIn({ seat, seatCode, code, progress, loadedAt, queue }: {
  seat: ClassSeat | null;
  seatCode: string;
  code: string;
  progress: readonly ProgressRow[];
  loadedAt: number;
  queue: QueuePlace | null;
}) {
  const label = useSeatLabel();
  const live = progress.find((entry) => entry.seatCode === seatCode) ?? null;
  if (!seat) {
    return (
      <header className="page-header page-header--with-back">
        <Link to={`/educator/class/${code}`}>← Class evidence</Link>
        <p className="eyebrow">{`Seat ${seatCode}`}</p>
        <h1>Nothing from this seat.</h1>
        <p>There is no seat {seatCode} on this class list, and nothing has been turned in from it.</p>
      </header>
    );
  }
  const state = seat.state === "still-working"
    ? "Still working"
    : seat.state === "started-quiet"
      ? "Started, not turned in"
      : "Not started";
  return (
    <>
      {queue && <QueueBar queue={queue} code={code} />}
      <header className="student-identity surface-margin">
        {!queue && <p className="student-identity__facts"><Link to={`/educator/class/${code}`}>← Class evidence</Link></p>}
        <h1>{label(seatCode)}</h1>
        <span className="student-identity__facts">
          <span>{`Seat ${seatCode}`}</span>
          <span>{state}</span>
          {live && <span>{WORLD_REGISTRY[live.worldId]?.title ?? ""}</span>}
        </span>
      </header>
      {/* A record rather than the page's raised surface, and deliberately: there is nothing
          here for a teacher to act on. A seat that has turned nothing in has no evidence, so
          it gets no instrument — the weight says that before the words do. */}
      <section className="surface-record" aria-labelledby="not-in">
        <div className="verdict__lead">
          <h2 id="not-in">What the evidence shows</h2>
          <p className="verdict__state" data-state="unread"><span>Nothing turned in yet</span></p>
          {live
            ? (
              <p className="verdict__absence">
                {startedStageLabel(live.worldId, live.stage)} · last moved {sinceLabel(loadedAt - live.updatedAt)}.
                Nothing is judged until they turn in, so there is no state to report and BOW will not
                guess one.
              </p>
            )
            : (
              <p className="verdict__absence">
                No browser has said this seat has opened the work, and nothing has arrived from it.
                An absence, not a zero.
              </p>
            )}
          <p className="verdict__absence">
            Their card and the way to reissue it are on the <Link to={`/educator/class/${code}/roster`}>class list</Link>.
          </p>
        </div>
      </section>
    </>
  );
}

/**
 * What the teacher is in the middle of, and the two children either side of it.
 *
 * A class page that ranks four children with the same gap and then makes a teacher go back to
 * it between each one has ranked them and not helped. This is the reading queue's own pattern,
 * on the page where the work actually gets done.
 */
function QueueBar({ queue, code }: { queue: QueuePlace; code: string }) {
  const label = useSeatLabel();
  const to = (seat: string) => `/educator/class/${code}/students/${seat}`;
  return (
    <nav className="queue-bar surface-margin" aria-label="This pile">
      <p className="queue-bar__what">
        <b>{QUEUE_BAND_LABELS[queue.band]}</b>
        <span data-count="">{queue.index} of {queue.of}</span>
      </p>
      <div className="queue-bar__moves">
        {/* The same name this destination has everywhere else in the product. A second word
            for one place is a second thing a teacher has to learn. */}
        <Link to={`/educator/class/${code}`}>← Class evidence</Link>
        {queue.previous
          ? <Link to={to(queue.previous)}>← {label(queue.previous)}</Link>
          : <span aria-disabled="true">← First in this pile</span>}
        {queue.next
          ? <Link to={to(queue.next)}>{label(queue.next)} →</Link>
          : <span aria-disabled="true">Last in this pile →</span>}
      </div>
    </nav>
  );
}

/**
 * What each pile is called, in the queue bar's own words.
 *
 * Deliberately not Ladder 3's labels for two of the five. A pile is a thing a teacher is
 * working through, and "Fell short of something" says what the pile is *for* in a way that
 * "Not yet" — which is a claim about one child on one skill — does not.
 */
const QUEUE_BAND_LABELS: Record<TriageBand, string> = {
  "not-in": "Nothing turned in",
  short: "Fell short of something",
  incomplete: "Writing still to read",
  shown: "Nothing outstanding",
  never: "The run never asked for it",
};

/**
 * One student's evidence, in seven regions, ranked rather than tabbed.
 *
 * The four tabs are gone, and that is the whole argument of this page: a tab bar is a ranking
 * abdicated. The reading order was the teacher's to guess, and the tab it opened on was BOW's
 * judgement — so the child's own writing, the thing that most needs a person, was rendered
 * `display: none` by default, and *Write back*, the one thing only a teacher can do, was the
 * last element on a 7,526px page under fourteen unrolled override panels.
 *
 * R0 · the pile, and the two children either side of this one — margin.
 * R1 · who this is — margin.
 * R2 · the verdict — the page's one raised surface.
 * R3 · what they wrote, and what you write back — two records, side by side.
 * R4 · what they decided, in six steps — record.
 * R5 · every judgement, and the way to disagree with each — record.
 * R6 · the opening figures and the full transcript — record.
 * R7 · the key and the gradebook line — margin.
 *
 * Nothing left the page. Every removal is a demotion, and every demoted thing is on screen or
 * one native disclosure away.
 */
function StudentPanel({ row, code, objectiveRef, onScore, submission, onOverride, onFeedback, onRevise, onWithdraw, notes, attempt, queue }: {
  row: StudentRow;
  code: string;
  /** The objective this attempt was set for, or `null` where the teacher chose none. */
  objectiveRef: StandardRef | null;
  /** Which of this seat's attempts is on screen, and how many there are. */
  attempt: { number: number; of: number };
  /** Where this child sits in the pile a teacher is working through. `null` off the roll. */
  queue: QueuePlace | null;
  onScore: (seat: string, session: string, scores: ReasoningScores | null) => Promise<boolean>;
  submission?: AttributedSubmission;
  onOverride: (override: OverrideRequest) => Promise<boolean>;
  onFeedback: (body: string, flagged: boolean) => Promise<boolean>;
  onRevise: (id: string, body: string, flagged: boolean) => Promise<boolean>;
  onWithdraw: (id: string) => Promise<boolean>;
  notes: readonly TeacherFeedback[];
}) {
  // Opens on whatever a person already recorded, so re-opening a scored student shows
  // their reading rather than a blank rubric that would overwrite it on the next save.
  const [scores, setScores] = useState<ReasoningScores>(() => row.reasoningCriteria ?? {});
  const [saved, setSaved] = useState<string | null>(null);
  const total = reasoningTotal(scores);
  // Every one of the four has to have been answered before this is a reading rather than a blank.
  const complete = REASONING_CRITERIA.every((criterion) => scores[criterion.id] !== undefined);
  const spine = submission ? studentSpineFor(submission) : null;
  const label = useSeatLabel();
  const steps = decisionStepsFor(row);

  return (
    <>
      {queue && <QueueBar queue={queue} code={code} />}

      {/* R1 · margin. Who this is, when it arrived, and what they did — never how well. */}
      <header className="student-identity surface-margin">
        {/* No second back link. The pile bar above already carries the way out, and two links
            to one place on one screen is the same defect as two doors to one act. */}
        {!queue && <p className="student-identity__facts"><Link to={`/educator/class/${code}`}>← Class evidence</Link></p>}
        {/* Name and facts on one baseline row. Two rows of furniture above the instrument is
            two rows the evidence below has to give up. */}
        <h1>{label(row.seatCode)}</h1>
        <span className="student-identity__facts">
          <span>Turned in {new Date(row.submittedAt).toLocaleString()}</span>
          <span>{WORLD_REGISTRY[row.worldId]?.title ?? ""}</span>
          <span>{summarise(row)}</span>
        </span>
        {/* A student who turned in twice used to be shown their later attempt silently, on a
            page with no switcher and no mention of the first — while the export listed both
            and the queue listed neither. Which one is on screen, which one the class counts,
            and a way to the other. */}
        {attempt.of > 1 && (
          <p className="student-identity__facts">
            <span>
              Attempt {attempt.number} of {attempt.of}.{" "}
              {attempt.number === attempt.of
                ? "Their latest, and the one every count on this class is made from."
                : `Every count on this class is made from attempt ${attempt.of}, their latest.`}
            </span>
            {Array.from({ length: attempt.of }, (_, index) => index + 1)
              .filter((number) => number !== attempt.number)
              .map((number) => (
                <Link key={number} to={`/educator/class/${code}/students/${row.seatCode}?attempt=${number}`}>
                  See attempt {number}
                </Link>
              ))}
          </p>
        )}
      </header>

      {/* R2 · THE INSTRUMENT. What this attempt shows, and the one thing that fell short.
          The header used to print `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100`
          two hundred pixels above a red *Not demonstrated* and reconcile the two nowhere.
          The states are the assessment; the flag row is the shortfall behind them; the points
          are at the foot of the page with a sentence saying what they count. */}
      {spine
        ? (
          <section className="surface-instrument" aria-labelledby="verdict">
            <div className="verdict__grid">
              <div className="verdict__lead">
                <h2 id="verdict">What the evidence shows</h2>
                {/* Two statements, side by side, because the product's whole claim is that
                    the decisions and the writing are reported separately and never rolled
                    into one number. One Ladder-4 word standing alone as the page's verdict
                    was doing exactly that rolling-up in the reader's head — and doing it
                    backwards on the pair the demonstration turns on: the best explanation in
                    the class led with the worst word on Ladder 3 while the weakest led one
                    rung above her, and the human marks that say so were 555px below the fold
                    (`DEFECTS.md` D18). The datum was already on the page. It is up here now. */}
                <div className="verdict__pair">
                  <div className="verdict__half">
                    <p className="field-label">What the decisions showed</p>
                    <p className="verdict__state" data-state={spine.lead}>
                      <span className="mark-glyph" aria-hidden="true">{SKILL_STATE_MARKS[spine.lead]}</span>
                      <span>{SKILL_STATE_LABELS[spine.lead]}</span>
                    </p>
                    <p className="verdict__half-note">BOW read the run. It never reads the writing.</p>
                  </div>
                  <div className="verdict__half">
                    <p className="field-label">What a person read in the writing</p>
                    {row.reasoningPoints === null
                      ? (
                        <p className="verdict__state" data-state="unread">
                          <span>Nobody has read it yet</span>
                        </p>
                      )
                      : (
                        <p className="verdict__state verdict__state--read" data-count="">
                          <span>{row.reasoningPoints} of {REASONING_MAXIMUM}</span>
                        </p>
                      )}
                    <p className="verdict__half-note">
                      {row.reasoningPoints === null
                        ? "Your reading, when you make it. It is never added to the state beside it."
                        : "Your own mark, not BOW's. It is never added to the state beside it."}
                      {" "}<a href="#your-marks">{row.reasoningPoints === null ? "Read it and mark it" : "Your marks"} ↓</a>
                    </p>
                  </div>
                </div>
                {spine.shortfalls.length > 0 && (
                  <ul className="verdict__flags">
                    {spine.shortfalls.map((flag) => (
                      <li className="surface-record__flag" key={flag.evidenceRequirementId}>
                        <b>{flag.label}</b>
                        <span>
                          <span className="mark-glyph" aria-hidden="true">{levelMark(flag.level)}</span>{" "}
                          {levelLabel(flag.level)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {spine.lead === "incomplete" && row.reasoningPoints === null && (
                  <p className="verdict__absence">Their written explanation has not been read yet, so the evidence is not all in.</p>
                )}
                {spine.notObserved.length > 0 && (
                  <p className="verdict__absence">
                    {spine.notObserved.length} {spine.notObserved.length === 1 ? "thing" : "things"} the work had to
                    show {spine.notObserved.length === 1 ? "was" : "were"} never asked in this run. Absences, not zeros.
                  </p>
                )}
              </div>
              {/* Where this evidence leaves the objective the work was set for. Its own
                  column, because the skills and the objective were always two clicks apart
                  and a teacher had to do the join in their head — and because stacked under
                  the skills it pushed the child's own writing off the first screen, which is
                  the defect this page was rebuilt to fix. It uses `resolveObjectiveCoverage`,
                  the same function the class page uses, so the two cannot disagree. */}
              <ObjectiveStanding objectiveRef={objectiveRef} results={spine.results} />
              <div className="verdict__skills-col">
                {/* Named on the list rather than above it. A 32px label over three rows that
                    already say what they are is 32px of the first screen, and the first screen
                    is where the child's own writing has to start. */}
                <ul className="verdict__skills" aria-label="Each skill, on this attempt">
                  {spine.competencies.map((line) => (
                    <li key={line.competencyId}>
                      <b>
                        <span className="mark-glyph" aria-hidden="true">{SKILL_STATE_MARKS[line.state]}</span>{" "}
                        {SKILL_STATE_LABELS[line.state]}
                      </b>
                      <span>{line.statement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )
        : <p className="class-state surface-margin">This attempt could not be opened in full.</p>}

      {/* R3 · two records, side by side. This is where the two worst findings on this page
          die — the child's writing behind a tab, and the teacher's reply 7,000px down —
          and they die by ranking rather than by tabs. */}
      <div className="record-pair">
        <section className="surface-record written" aria-labelledby="wrote">
          <div className="record__head">
            <h2 id="wrote">What they wrote</h2>
          </div>
          {row.defense && row.defense.text.trim() ? (
            <blockquote>{row.defense.text}</blockquote>
          ) : (
            <p className="class-state">This student turned in no written explanation.</p>
          )}
          <p className="written__promise">
            Nothing about this writing is machine-scored, and it is never sent to a model. You read it
            and you score it — which is what the student was told would happen.
          </p>
          <p className="written__promise">
            <Link to={`/educator/class/${code}/reading`}>Read the whole class in one queue →</Link>
          </p>

          {/* The teacher's own marks, on the writing they are marks about, as the control a
              teacher actually uses rather than a read-only inset two screens away. It is
              deliberately not part of what BOW claims about this child: §37 — a mark one
              teacher records may not move what BOW says, or two classes set the same
              challenge would mean different things and nothing on any screen would say so. */}
          <div className="written__own" id="your-marks">
            <p className="field-label">Your own marks — BOW adds nothing to it</p>
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
            <p className="feedback__actions">
              {/* An unread paragraph and a paragraph a person read and scored zero are
                  different facts, and this used to show both as "0/10" with nothing
                  selected — one stray click from saving a zero nobody meant. */}
              <strong>{complete ? `${total}/${REASONING_MAXIMUM}` : `—/${REASONING_MAXIMUM}`}</strong>
              <Button
                aria-disabled={!complete}
                onClick={() => complete && void onScore(row.seatCode, row.sessionId, scores).then((ok) => setSaved(ok ? "Saved." : "Could not save that."))}
              >
                Save review
              </Button>
              <span aria-live="polite">{saved || (complete ? "" : "Score all four to save.")}</span>
            </p>
          </div>

          {/* The teacher's own closing question, and the answer to it — under the canonical
              writing, in its own block, said as theirs. Absent for every attempt whose
              assignment carried no question, which is most. */}
          {submission?.closingAnswer && (
            <div className="closing-answer">
              <p className="eyebrow">Your own question</p>
              <blockquote className="closing-answer__asked">{submission.closingAnswer.questionText}</blockquote>
              <blockquote className="closing-answer__given">{submission.closingAnswer.answer}</blockquote>
              <p className="written__promise">
                You asked this, not BOW. It is not scored, it is not part of the skills reported above,
                and it does not appear in the export.
              </p>
            </div>
          )}
        </section>

        <section className="surface-record" aria-labelledby="write-back">
          <Feedback
            seatCode={row.seatCode}
            sessionId={row.sessionId}
            notes={notes}
            onSend={onFeedback}
            onRevise={onRevise}
            onWithdraw={onWithdraw}
          />
        </section>
      </div>

      {/* R4 · record. What the child actually did, in six steps, from their own events. It
          is set at the reading size because it is prose a teacher reads aloud, and it is only
          an honest compression because R6 below keeps every moment of the run. */}
      <section className="surface-record" aria-labelledby="decided">
        <div className="record__head">
          <h2 id="decided">What they decided</h2>
          <p>Read from their own run, step by step</p>
        </div>
        <ol className="decision-steps">
          {steps.map((step) => (
            <li key={step.label}>
              <p className="decision-steps__what">
                <span className="decision-steps__label">{step.label}</span>
                {step.what}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* R5 · record. Every judgement on this attempt, weakest group first, each one
          overridable on its own row. */}
      <section className="surface-record" aria-labelledby="judgements">
        <div className="record__head">
          <h2 id="judgements">Every judgement on this attempt</h2>
          <p>What BOW concluded, and why</p>
        </div>
        {submission
          ? <JudgementRecord submission={submission} onOverride={onOverride} />
          : <p className="class-state">This attempt could not be opened in full, so there is nothing to check.</p>}
      </section>

      {/* R6 · record. The figures behind the account above, and the whole run in order. */}
      <section className="surface-record" aria-labelledby="record">
        <div className="record__head">
          <h2 id="record">The full record</h2>
          <p>Everything the six steps above were read from</p>
        </div>
        {row.worldId !== "basketball" && <PopUpPlanTab row={row} />}
        {/* The figures the account above was read from, as one row. A run that never saved a
            final board has no after, and that is said rather than left as an empty column. */}
        {row.worldId === "basketball" && row.opening && (
          <dl className="adaptation-lines">
            <div><dt>{CHOICE_LABELS.goal}</dt><dd>{formatDollars(row.opening.goal)}</dd></div>
            <div><dt>{CHOICE_LABELS.reserve}</dt><dd>{formatDollars(row.opening.reserve)}</dd></div>
            <div><dt>{CHOICE_LABELS.flexibleCash}</dt><dd>{formatDollars(row.opening.flexibleCash)}</dd></div>
          </dl>
        )}
        {row.worldId === "basketball" && row.opening && !row.final && (
          <p className="class-state">
            No final plan was ever saved, so there is no after to compare this with — and the three
            things the work had to show after Week {SCENARIO_NUMBERS.disruptionWeek} were never asked.
            Absences, not zeros.
          </p>
        )}
        {row.resolution && (
          <dl className="adaptation-lines">
            <div><dt>Attendance bonus</dt><dd>{row.resolution.attendanceHeld ? "Held" : `Lost in Week ${row.resolution.bonusLostWeek}`}</dd></div>
            <div><dt>Left uncovered</dt><dd>{formatDollars(row.resolution.uncovered)}</dd></div>
            <div><dt>Course</dt><dd>{row.resolution.courseFunded ? "Funded" : `${formatDollars(row.resolution.courseShort)} short`}</dd></div>
            <div><dt>Ends holding</dt><dd>{formatDollars(row.resolution.endCash)}</dd></div>
          </dl>
        )}
        {row.opening && row.final && <WhatMoved row={row} />}
        {submission && <TrailRecord submission={submission} />}
      </section>

      {/* R7 · margin. The key, then the other model — once, at the foot, saying what it is.
          BOW computes a points total because a gradebook needs a number, and how it is
          computed has not changed. What changed is that it no longer sits at the top of the
          page contradicting the states above. */}
      <div className="surface-margin">
        {spine && <WordKey title="What the three skill words mean" entries={skillStateKey(spine.competencies.map((line) => line.state))} />}
        {submission && <Gradebook submission={submission} displayName={label(row.seatCode) === `Seat ${row.seatCode}` ? null : label(row.seatCode)} />}
      </div>
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
  // `null` is a student who never reached the question, and it is not a student who answered
  // no. This line read "waited on the course · kept the Saturdays" about a run that stopped
  // before either was asked — two decisions attributed to a child who was never offered them,
  // on the first line a teacher reads. It is the same defect `choiceDistributions` was fixed
  // for, in the one place that was still building its sentence with a bare ternary.
  const bits = [
    place,
    row.reservedSeat === null ? "never reached the course deadline" : row.reservedSeat ? "reserved the seat" : "waited on the course",
    row.tookClinics === null ? "never reached the Saturdays" : row.tookClinics ? "took the clinics" : "kept the Saturdays",
  ];
  if (row.resolution) bits.push(row.resolution.attendanceHeld ? "made every session" : "lost the bonus");
  // How it came out, on the line a teacher reads first. These two facts — did Avery get the
  // course, and what is she left holding — are what the whole demonstration turns on, and they
  // sat at 85% page depth with nothing above them saying either (`DEFECTS.md` D24). They are
  // facts about the run and not a judgement of the student, which is the rule this line keeps.
  if (row.resolution) {
    bits.push(row.resolution.courseFunded
      ? "got the course"
      : `${formatDollars(row.resolution.courseShort)} short of the course`);
    bits.push(`ends holding ${formatDollars(row.resolution.endCash)}`);
  }
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
