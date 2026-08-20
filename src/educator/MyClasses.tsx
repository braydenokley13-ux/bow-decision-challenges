import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { CLASS_RETENTION_DAYS, educatorClassError, isClassError, type ClassCreation } from "../platform/classes/types";
import { durationLabel, PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";
import { CLOSING_QUESTION_MAX } from "../platform/classes/assignments";
import type { WorldId } from "../domain/core/ids";
import { assessableStandards, FRAMEWORKS, labelsFor, standardByRef } from "../domain/standards";
import type { FrameworkId } from "../domain/standards";
import { forgetEveryClass, rememberClass } from "./classMemory";
import { useRememberedClasses } from "./useRememberedClasses";
import { teacherToken } from "./teacherSession";
import { TERMS } from "./labels";

/**
 * My classes — the first thing an educator sees, and the only place work is set.
 *
 * A teacher opens this product to look at the class they are running. It used to open on a
 * map of twenty-three objectives, twenty-two of which BOW cannot assess, above a line saying
 * no class was saved in this browser; and the nav item called "My classes" landed on a page
 * headed "Create a class." with the list of classes halfway down it. So: the classes lead,
 * and creating one is the block underneath — unless there are none, in which case creating
 * one is the page.
 *
 * There is also exactly one path to assigning work now. A class is created *with* the
 * objective it is for, and an existing class is set one from the same screen. The separate
 * assign flow was a third of this page on its own page, and it could create classes too.
 *
 * The setup step is deliberately the whole setup step: a teacher names the class, gets a code
 * to read out and a private link to keep, and pastes their class list on the next screen to
 * get one card per student. A student signs in with the class code and the code on their card;
 * nothing asks a child for an email address, a password or a birthday. The private link
 * matters more than it looks:
 * the class code goes on a whiteboard, so every student in the room has it — which means it
 * cannot be what opens the evidence. The key in this link is, and it is stored in this
 * browser and shown once.
 */
const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";

/** The value the picker uses for "no objective", which is not the same as none existing. */
const NO_OBJECTIVE = "";

/** The value the story picker uses for "the students choose", which is not a story. */
/**
 * The closing questions BOW offers, which are §37's own examples and not a rubric.
 *
 * They exist because a blank box at the end of a setup flow is a question most teachers will
 * skip on a Tuesday, and the ones worth asking have a shape: they point at a decision the
 * student actually made rather than at the topic. A teacher can take one, edit it, or ignore
 * the list entirely — none of them is BOW's question once it is sent, and the text stored on
 * the assignment is whatever is in the box.
 */
export const SUGGESTED_CLOSING: readonly string[] = [
  "Which decision would you change if you played again?",
  "Which piece of information changed your decision most?",
  "Where did your plan become vulnerable?",
  "Connect one decision to today's lesson.",
];

const STUDENTS_PICK = "students-pick";

export function MyClasses() {
  const [params] = useSearchParams();
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<ClassCreation | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  // The account first where there is one, this browser otherwise. A list that was only ever
  // this browser's is a wiped laptop away from a term of assessed work.
  const { classes: known, syncing, reload: reloadKnown } = useRememberedClasses();
  // Only objectives a story can actually produce evidence for. An objective BOW has a
  // mapping for and no story would produce a class code, thirty submissions and no result — which is
  // the one thing §5.6 says the product may never let a teacher believe.
  const [objectives] = useState(() => assessableStandards(FRAMEWORK_ID));
  // Arriving from an objective carries the objective. That is the whole of the old assign
  // flow: the thing being set is already chosen, and what is left is which class.
  const requested = params.get("objective");
  const [objectiveCode, setObjectiveCode] = useState(
    () => (requested && objectives.some((entry) => entry.code === requested) ? requested : objectives[0]?.code ?? NO_OBJECTIVE),
  );
  // §17.2 step 2: student choice, every playable story selected. A teacher who wants one story
  // for everyone says so; a teacher who does nothing gets the promise the product makes to
  // students on the front of the box.
  //
  // Which story, or that the students choose — one value rather than a boolean, because
  // "one for everyone" was a boolean and a boolean can only name the story somebody wired
  // into it. It named `DEFAULT_WORLD_ID`, so the only class a teacher could set was a
  // basketball class, on the screen that had just told them the two stories are equals whose
  // results pool. A teacher who wanted the whole room on the market — which is the setting
  // that makes a debrief compare like with like — had no control for it at all.
  const [story, setStory] = useState<WorldId | typeof STUDENTS_PICK>(STUDENTS_PICK);
  const [closing, setClosing] = useState("");
  const [closingRequired, setClosingRequired] = useState(false);
  const studentPicks = story === STUDENTS_PICK;
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<string | null>(null);
  // Whether "Forget these classes" has been asked and is one press from happening. Same shape
  // as the roster's erase confirmation, for the same reason: it is the one control on this page
  // that destroys something, and it sat unguarded next to "Start another class".
  const [forgetting, setForgetting] = useState(false);
  /**
   * The safe button, held by identity rather than found by position — the reasoning is written
   * out in full over `keepIt` in `Roster.tsx`. A raw `<button>` because `Button` is not a
   * `forwardRef` component and would drop the ref.
   */
  const keepThem = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (forgetting) keepThem.current?.focus();
  }, [forgetting]);
  const framework = FRAMEWORKS[FRAMEWORK_ID];
  const labels = labelsFor(FRAMEWORK_ID);
  const unit = labels?.unitNounShort ?? "Objective";
  const arriving = requested ? standardByRef({ frameworkId: FRAMEWORK_ID, code: requested }) : undefined;

  /**
   * What the assignment says about the story. Both calls below send it, and both used to
   * build it themselves — which is how one of them could have been given the second story
   * and the other left on the first.
   */
  const storySetting = () => ({
    allowedWorldIds: story === STUDENTS_PICK ? PLAYABLE_WORLDS.map((world) => world.id) : [story],
    studentChoosesWorld: story === STUDENTS_PICK,
  });

  /**
   * The teacher's own closing question, built once for the same reason `storySetting` is: two
   * call sites send an assignment and one of them being given a field the other was not is how
   * a class ends up set differently from the one beside it.
   *
   * An untouched box sends nothing at all rather than an empty string — the service reads a
   * blank as "no question", and sending one would be asking it to make that call twice.
   */
  const closingSetting = () => (closing.trim().length === 0
    ? {}
    : { closingQuestion: { text: closing.trim(), required: closingRequired } });

  const create = async () => {
    if (working) return;
    // A class with no name was accepted and became "Untitled class" — which is what a teacher
    // setting up between periods gets by pressing the button with the field untouched, and a
    // five-period day could end with three of them, told apart only by a five-letter code and
    // a date. The name is one line of typing and it is the only thing that will distinguish
    // this class on the list, on the printed cards, in the debrief and in the export, so it is
    // asked for rather than invented. The default that used to live here is gone; the service
    // keeps one for callers that are not this screen, and that is now the only one.
    if (label.trim().length === 0) {
      setProblem("Give the class a name — it is what tells it apart from your other classes on every screen and every printed card.");
      return;
    }
    setWorking(true);
    setProblem(null);
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), challengeId: PLAN_UNDER_PRESSURE.id }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setProblem(isClassError(body) ? educatorClassError(body.error) : educatorClassError("unavailable"));
        return;
      }
      const record = body as ClassCreation;
      // The assignment is a second call because the class is the thing that must exist:
      // a code on a whiteboard with nothing behind it is recoverable, and a class that
      // failed to be created is a room of students who cannot start. If this call fails
      // the class still opens and reads as the one thing it was implicitly set.
      //
      // It is sent however the objective picker was left, because the two settings on this
      // form are not one setting. It used to be skipped entirely for "run the challenge
      // without one" — and a class with no stored assignment is read as the one the service
      // synthesises for classes made before any of this existed: one story, no choice. So
      // the story a teacher had just picked was thrown away by their choice about
      // *objectives*, silently, and a room promised a choice on the front of the box was
      // sent into the season with no picker at all. What a teacher opts out of there is an
      // objective, which is what `objectiveRef: null` says.
      await fetch(`${CLASS_API_BASE}/classes/${record.code}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": record.teacherKey },
        body: JSON.stringify({
          objectiveRef: objectiveCode === NO_OBJECTIVE ? null : { frameworkId: FRAMEWORK_ID, code: objectiveCode },
          ...storySetting(),
          ...closingSetting(),
        }),
      });
      rememberClass(record);
      reloadKnown();
      setCreated(record);
    } catch {
      setProblem(educatorClassError("unavailable"));
    } finally {
      setWorking(false);
    }
  };

  /** Setting an existing class the objective a teacher arrived holding. */
  const assignTo = async (record: { code: string; teacherKey: string }) => {
    if (assigning || objectiveCode === NO_OBJECTIVE) return;
    setAssigning(record.code);
    setAssigned(null);
    setProblem(null);
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes/${record.code}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": record.teacherKey },
        body: JSON.stringify({ objectiveRef: { frameworkId: FRAMEWORK_ID, code: objectiveCode }, ...storySetting(), ...closingSetting() }),
      });
      if (!response.ok) {
        const body: unknown = await response.json();
        setProblem(isClassError(body) ? educatorClassError(body.error) : educatorClassError("unavailable"));
        return;
      }
      setAssigned(record.code);
    } catch {
      setProblem(educatorClassError("unavailable"));
    } finally {
      setAssigning(null);
    }
  };

  /**
   * Where a class opens from inside the product — the code, and nothing else.
   *
   * This used to be `?key=${record.teacherKey}`, which put the one credential that opens
   * every child's name and every child's writing into the address bar of the roster and the
   * evidence pages, and into the browser history of whatever machine a teacher was on. The
   * key is already in this browser (that is what `rememberClass` is for) and the service has
   * always taken it as a header, so a link from here does not need to carry it.
   */
  const evidencePath = (record: { code: string }) => `/educator/class/${record.code}`;

  /** Where the class list and the cards live. The first thing to do with a class that has just been made. */
  const rosterPath = (record: { code: string }) => `/educator/class/${record.code}/roster`;

  /**
   * The one link that still carries the key, and the only one that should.
   *
   * It is a hand-over rather than navigation: the thing a teacher copies to open this class on
   * a second machine, or keeps because they have no account and this browser is the only place
   * the key exists. `useTeacherKey` takes it back out of the address bar on arrival, so
   * following it does not leave the key on screen.
   */
  const handoverLink = (record: { code: string; teacherKey: string }) =>
    `${window.location.origin}/educator/class/${record.code}?key=${record.teacherKey}`;

  const createBlock = (
    <section className="class-form">
      <label htmlFor="class-label">Name this class</label>
      <input
        id="class-label"
        value={label}
        onChange={(event) => { setLabel(event.target.value); setProblem(null); }}
        onKeyDown={(event) => { if (event.key === "Enter") void create(); }}
        placeholder="Period 3 · Grade 7"
        maxLength={60}
        aria-describedby="class-form-status"
      />
      <label htmlFor="class-objective">{unit}</label>
      <select
        id="class-objective"
        value={objectiveCode}
        onChange={(event) => setObjectiveCode(event.target.value)}
        aria-describedby="class-objective-note"
      >
        {objectives.map((standard) => (
          <option key={standard.code} value={standard.code}>{standard.code} · {standard.shortLabel}</option>
        ))}
        <option value={NO_OBJECTIVE}>Run the challenge without one</option>
      </select>
      <p id="class-objective-note" className="class-form__note">
        {objectiveCode === NO_OBJECTIVE
          ? "Students still play the challenge and you still see everything they did. Nothing is reported against a state objective."
          : framework?.labels.attribution}
      </p>
      {/* "Which challenge" named the two stories with the word the product uses for the
          thing they are both inside — Plan Under Pressure is the challenge, and these are the
          two situations in it. A teacher who set "which challenge" and then read "the
          challenge" on the guide had two meanings for one word, one screen apart.

          One row per playable story, read off the registry rather than written out here.
          "One for everyone" was a single row wired to whichever story the registry calls the
          default, so the season was the only story a whole class could be set: the market was
          an equal on the row above it and unassignable on this one, and a teacher who wanted
          the room on the market — the setting that makes a debrief compare like with like —
          had to send thirty students to choose it one at a time and hope. A third story
          arrives here as a row rather than as a rewrite.

          The first row's sentence says which half of a mixed class pools, because only one
          half does and this is the moment a teacher decides. It promised that "the results
          pool either way", which is the half that is true said as though it were all of it:
          the rubric does pool — both stories are observed against the same named parts of
          the work and `classResultFor` counts them into one denominator — and the decisions
          do not, by design, because `worldSections` splits them per story with its own count
          each. A teacher who read the old sentence planned one discussion and found two
          half-classes. `whatPools.test.tsx` is what keeps every teacher surface saying it. */}
      <fieldset className="class-form__worlds">
        <legend>Which {TERMS.story}</legend>
        <label>
          <input
            type="radio"
            name="class-worlds"
            checked={studentPicks}
            onChange={() => setStory(STUDENTS_PICK)}
          />
          <span>
            <b>Students pick</b>
            {PLAYABLE_WORLDS.map((world) => world.title).join(" or ")}. Both are judged against the same
            named parts of the work, so a class that chose differently still gets one set of skill results.
            What the room decided comes back one {TERMS.story} at a time — plan the debrief as two groups.
          </span>
        </label>
        {PLAYABLE_WORLDS.map((world) => (
          <label key={world.id}>
            <input
              type="radio"
              name="class-worlds"
              checked={story === world.id}
              onChange={() => setStory(world.id)}
            />
            <span>
              <b>Everyone: {world.title}</b>
              {world.subtitle}
            </span>
          </label>
        ))}
      </fieldset>

      {/* §37. One question of the teacher's own, at the end, and deliberately nothing more.
          It belongs to the assignment and never to the challenge version — two teachers may
          set the same story with different questions and both classes stay comparable,
          because nothing BOW measures can reach this text.

          The suggestions are here because a blank box at the end of a setup flow is a field
          most teachers skip between periods, and the questions worth asking have a shape:
          they point at a decision the student made rather than at the topic. Pressing one
          fills the box and the box is what gets sent, so an edited suggestion is the
          teacher's question and BOW has no claim on it. */}
      <fieldset className="class-form__closing">
        <legend>Ask them one more thing (optional)</legend>
        <p className="class-form__closing-note">
          Asked once, after the {TERMS.story} is finished. It is your question — BOW stores the answer
          beside their work and never marks it, and it changes nothing about the skills reported.
        </p>
        <label htmlFor="closing-question">Your question</label>
        <textarea
          id="closing-question"
          value={closing}
          maxLength={CLOSING_QUESTION_MAX}
          rows={2}
          placeholder="Leave this empty to ask nothing."
          onChange={(event) => setClosing(event.target.value)}
        />
        <p className="class-form__closing-suggest">
          <span id="closing-suggestions">Or take one of these and change it:</span>
          {SUGGESTED_CLOSING.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="quiet"
              aria-describedby="closing-suggestions"
              onClick={() => setClosing(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </p>
        <label className="class-form__closing-required">
          <input
            type="checkbox"
            checked={closingRequired}
            disabled={closing.trim().length === 0}
            onChange={(event) => setClosingRequired(event.target.checked)}
          />
          <span>They have to answer it before they can turn in</span>
        </label>
      </fieldset>

      <Button type="button" aria-disabled={working || label.trim().length === 0} onClick={() => void create()}>
        {working ? "Creating…" : "Create the class"}
      </Button>
      <p id="class-form-status" className={`class-form__status${problem ? " class-form__status--problem" : ""}`} aria-live="polite">
        {problem ?? `Students need the class code and the card you print for them. They never type an email address or a password. Classes and their evidence are kept for ${CLASS_RETENTION_DAYS} days, then deleted.`}
      </p>
    </section>
  );

  if (created) {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">{created.label}</p>
          <h1>Here is the code.</h1>
        </header>
        <section className="class-created">
          <div className="class-created__code class-created__code--projector">
            <p className="field-label">Class code</p>
            <strong>{created.code}</strong>
            <p>Not case sensitive.</p>
          </div>
          <div className="class-created__body">
            <h2>{created.label}</h2>
            {/* What a teacher and a student actually do, in the order they do it. This used to
                read "give them the code above plus a seat number each" — and there is no seat
                number anywhere in the student flow to give. A teacher who read that out handed
                thirty students a number to type into a box that does not exist, in the first
                two minutes of the lesson, in front of the room. */}
            <ol className="class-created__steps">
              <li>
                <Link to={rosterPath(created)}>Paste your class list</Link> and print the cards — one per
                student, with their name and their own code on it.
              </li>
              <li>
                Put the code above on the board and send students to <code>{window.location.origin}/join</code>.
                They type the class code, then the code on their card. Nothing asks them for an email
                address or a password.
              </li>
              <li>Allow about {durationLabel(PLAN_UNDER_PRESSURE)}. Do not coach a financial strategy.</li>
              <li>Open the evidence with your private link when they are finished.</li>
            </ol>
            {/* The teacher who has four minutes and no list. Named as the fallback rather than
                the default, because a class with a list is the one whose evidence has names on
                it — which is the difference between marking a class and marking seat 17. */}
            <p className="class-created__fallback">
              No list to hand? Skip the cards: students type the class code and their own first name,
              and BOW files their work under that.
            </p>
            {/* Every clause here used to be false at once. It said the link "is not shown again",
                and the very next screen — /educator/classes, one link away — renders each class as
                an anchor whose href carries the key. It said the link "is saved in this browser"
                in the same breath, which cannot both hold. And it said all of that identically to
                a teacher who has an account, for whom the key is on the account and a wiped laptop
                costs nothing. What is actually true is narrower and more useful: the key is the
                thing that opens the evidence, it is already filed for you, and whether losing this
                browser matters depends on whether you signed in. */}
            <div className="class-created__key">
              <p className="field-label">Your private link</p>
              <code>{handoverLink(created)}</code>
              <p>
                This link is what opens this class’s evidence — the class code alone will not, which is
                what stops students reading each other’s work. It is already in your class list, so you do
                not have to copy it down.{" "}
                {teacherToken()
                  ? "It is on your account too, so it is on any computer you sign in on."
                  : "It is kept in this browser only. With no account, a wiped laptop takes it, " +
                    "and nothing here can bring it back."}
              </p>
            </div>
            <Link className="button button--primary" to={evidencePath(created)}>Open this class</Link>
          </div>
        </section>
      </EducatorShell>
    );
  }

  // "Create your first class" to a teacher whose classes are still arriving from their account
  // is the product telling them their work is gone. It is the same sentence and it is false for
  // the two seconds it takes to ask.
  if (known.length === 0 && syncing) {
    return <EducatorShell><p className="class-state" aria-live="polite">Getting your classes…</p></EducatorShell>;
  }

  if (known.length === 0) {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">My classes</p>
          <h1>Create your first class.</h1>
          <p>
            You get a code to read out and a private link that opens the evidence. Paste your class list and
            BOW prints one card per student; they sign in with the class code and the code on their card, and
            never with an email address or a password.
          </p>
        </header>
        {createBlock}
        <section className="dashboard-section">
          <p className="class-state">
            Nothing to read yet. <Link to="/educator/demo">See a sample class</Link> to know what comes back.
          </p>
        </section>
      </EducatorShell>
    );
  }

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">My classes</p>
        <h1>{known.length === 1 ? "Your class." : `Your ${known.length} classes.`}</h1>
        {/* What is actually true of where these live, which changed the day accounts arrived and
            is the difference between losing a term of work to a wiped laptop and not. */}
        <p>
          {teacherToken()
            ? "On your account, so they are here on any computer you sign in on."
            : "Saved in this browser only. "}
          {!teacherToken() && <Link to="/educator/sign-in">Make an account</Link>}
          {!teacherToken() && " and they follow you to any computer — a wiped laptop takes them otherwise."}
        </p>
      </header>

      <section className="dashboard-section">
        <div className="row-list">
          {known.map((record) => (
            <Link key={record.code} to={evidencePath(record)}>
              <div>
                <small>{record.code} · created {new Date(record.createdAt).toLocaleDateString()}</small>
                {/* An `<h2>`, not the `<h3>` this was: the only heading above it on this page
                    is the `<h1>`, so the level skipped one and axe said so — the last
                    `heading-order` finding left in the product. It looks exactly the same,
                    because `.row-list :is(h2, h3)` in `app.css` styles the row rather than
                    the tag. A class is a section of this page and reads as one. */}
                <h2>{record.label}</h2>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* The old assign flow, where a teacher already is. Only shown when they arrived
          holding an objective, because otherwise there is nothing to set. */}
      {arriving && (
        <section className="dashboard-section">
          <div className="section-head">
            <h2>Set {arriving.code} {arriving.shortLabel} for a class you already have</h2>
            <p>{framework?.labels.attribution}</p>
          </div>
          <ul className="assign-list">
            {known.map((record) => (
              <li key={record.code}>
                <span>{record.label} · {record.code}</span>
                <Button
                  variant="secondary"
                  aria-disabled={assigning === record.code}
                  onClick={() => void assignTo(record)}
                >
                  {assigning === record.code ? "Setting…" : "Set it"}
                </Button>
                {assigned === record.code && <span className="assign-list__done">Set. Students use code {record.code}.</span>}
              </li>
            ))}
          </ul>
          <p className="class-form__status" aria-live="polite">{problem ?? ""}</p>
        </section>
      )}

      <section className="dashboard-section">
        <div className="section-head">
          <h2>{arriving ? "Or start a new class" : "Start another class"}</h2>
        </div>
        {createBlock}
        {/* This fired on one press, with no confirmation and nothing to undo it from.
            "on this computer" reads like a tidy-up — as if a copy survives somewhere — and for a
            teacher with an account it is exactly that. For a teacher without one, on the screen
            that says "Saved in this browser only." four inches higher, it was the single most
            destructive control in the product: the teacher keys are the only thing that opens a
            class, they exist nowhere else, and the classes and every student's work stay on the
            server for the full retention window afterwards, unreachable by anyone. The roster
            has asked before erasing a child since the day it shipped. This is the same question
            about thirty of them at once, and it was not asking. */}
        <div className="classes-forget">
          {forgetting ? (
            <>
              <p className="classes-forget__warn" id="classes-forget-warn">
                {teacherToken()
                  ? `Forget ${known.length === 1 ? "this class" : `all ${known.length} classes`} on this computer? They are on your account, so signing in here again brings them back.`
                  : `Forget ${known.length === 1 ? "this class" : `all ${known.length} classes`} on this computer? You have no account, so the links saved here are the only way in. The ${known.length === 1 ? "class" : "classes"} and everything your students turned in stay on the server for ${CLASS_RETENTION_DAYS} days and nothing will be able to open them. It cannot be undone.`}
              </p>
              <Button
                variant="primary"
                aria-describedby="classes-forget-warn"
                onClick={() => {
                  forgetEveryClass();
                  reloadKnown();
                  setForgetting(false);
                }}
              >
                {teacherToken() ? "Forget them here" : "Forget them"}
              </Button>
              <button
                type="button"
                className="button button--quiet"
                ref={keepThem}
                aria-describedby="classes-forget-warn"
                onClick={() => setForgetting(false)}
              >
                Keep them
              </button>
            </>
          ) : (
            <Button variant="quiet" onClick={() => setForgetting(true)}>
              Forget these classes on this computer
            </Button>
          )}
        </div>
      </section>
    </EducatorShell>
  );
}
