import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { CLASS_ERROR_MESSAGES, CLASS_RETENTION_DAYS, isClassError, type ClassCreation } from "../platform/classes/types";
import { durationLabel, PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { DEFAULT_WORLD_ID, PLAYABLE_WORLDS, WORLD_REGISTRY } from "../domain/scenario/registry";
import { assessableStandards, FRAMEWORKS, labelsFor, standardByRef } from "../domain/standards";
import type { FrameworkId } from "../domain/standards";
import { forgetClass, rememberClass, rememberedClasses } from "./classMemory";

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
 * The setup step is deliberately the whole setup step: no accounts to make for anybody, no
 * email addresses, no passwords. A teacher names the class, gets a code to read out and a
 * private link to keep, and that is the pilot. A student types the code at /join and the name
 * their teacher will see their work under; nothing on the student's side is an account BOW
 * asks a child to create. The private link matters more than it looks:
 * the class code goes on a whiteboard, so every student in the room has it — which means it
 * cannot be what opens the evidence. The key in this link is, and it is stored in this
 * browser and shown once.
 */
const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";

/** The value the picker uses for "no objective", which is not the same as none existing. */
const NO_OBJECTIVE = "";

export function MyClasses() {
  const [params] = useSearchParams();
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<ClassCreation | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [known, setKnown] = useState(() => rememberedClasses());
  // Only objectives a built world can actually assess. An objective BOW has a mapping for
  // and no world would produce a class code, thirty submissions and no result — which is
  // the one thing §5.6 says the product may never let a teacher believe.
  const [objectives] = useState(() => assessableStandards(FRAMEWORK_ID));
  // Arriving from an objective carries the objective. That is the whole of the old assign
  // flow: the thing being set is already chosen, and what is left is which class.
  const requested = params.get("objective");
  const [objectiveCode, setObjectiveCode] = useState(
    () => (requested && objectives.some((entry) => entry.code === requested) ? requested : objectives[0]?.code ?? NO_OBJECTIVE),
  );
  // §17.2 step 2: student choice, every built world selected. A teacher who wants one world
  // for everyone says so; a teacher who does nothing gets the promise the product makes to
  // students on the front of the box.
  const [studentPicks, setStudentPicks] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<string | null>(null);
  const framework = FRAMEWORKS[FRAMEWORK_ID];
  const labels = labelsFor(FRAMEWORK_ID);
  const unit = labels?.unitNounShort ?? "Objective";
  const arriving = requested ? standardByRef({ frameworkId: FRAMEWORK_ID, code: requested }) : undefined;

  const create = async () => {
    if (working) return;
    setWorking(true);
    setProblem(null);
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "Untitled class", challengeId: PLAN_UNDER_PRESSURE.id }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setProblem(isClassError(body) ? CLASS_ERROR_MESSAGES[body.error] : CLASS_ERROR_MESSAGES.unavailable);
        return;
      }
      const record = body as ClassCreation;
      // The assignment is a second call because the class is the thing that must exist:
      // a code on a whiteboard with nothing behind it is recoverable, and a class that
      // failed to be created is a room of students who cannot start. If this call fails
      // the class still opens and reads as the one thing it was implicitly set.
      if (objectiveCode !== NO_OBJECTIVE) {
        await fetch(`${CLASS_API_BASE}/classes/${record.code}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": record.teacherKey },
          body: JSON.stringify({
            objectiveRef: { frameworkId: FRAMEWORK_ID, code: objectiveCode },
            allowedWorldIds: studentPicks ? PLAYABLE_WORLDS.map((world) => world.id) : [DEFAULT_WORLD_ID],
            studentChoosesWorld: studentPicks,
          }),
        });
      }
      rememberClass(record);
      setKnown(rememberedClasses());
      setCreated(record);
    } catch {
      setProblem(CLASS_ERROR_MESSAGES.unavailable);
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
        body: JSON.stringify({
            objectiveRef: { frameworkId: FRAMEWORK_ID, code: objectiveCode },
            allowedWorldIds: studentPicks ? PLAYABLE_WORLDS.map((world) => world.id) : [DEFAULT_WORLD_ID],
            studentChoosesWorld: studentPicks,
          }),
      });
      if (!response.ok) {
        const body: unknown = await response.json();
        setProblem(isClassError(body) ? CLASS_ERROR_MESSAGES[body.error] : CLASS_ERROR_MESSAGES.unavailable);
        return;
      }
      setAssigned(record.code);
    } catch {
      setProblem(CLASS_ERROR_MESSAGES.unavailable);
    } finally {
      setAssigning(null);
    }
  };

  const evidencePath = (record: { code: string; teacherKey: string }) =>
    `/educator/class/${record.code}?key=${record.teacherKey}`;

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
      <fieldset className="class-form__worlds">
        <legend>Which challenge</legend>
        <label>
          <input
            type="radio"
            name="class-worlds"
            checked={studentPicks}
            onChange={() => setStudentPicks(true)}
          />
          <span>
            <b>Students pick</b>
            {PLAYABLE_WORLDS.map((world) => world.title).join(" or ")}. Both collect the same evidence,
            so the results pool either way.
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="class-worlds"
            checked={!studentPicks}
            onChange={() => setStudentPicks(false)}
          />
          <span>
            <b>One for everyone</b>
            {WORLD_REGISTRY[DEFAULT_WORLD_ID]?.title}.
          </span>
        </label>
      </fieldset>
      <Button type="button" aria-disabled={working} onClick={() => void create()}>
        {working ? "Creating…" : "Create the class"}
      </Button>
      <p id="class-form-status" className={`class-form__status${problem ? " class-form__status--problem" : ""}`} aria-live="polite">
        {problem ?? `Students need the code and nothing else. Classes and their evidence are kept for ${CLASS_RETENTION_DAYS} days, then deleted.`}
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
            <ol className="class-created__steps">
              {/* What a student actually does, in the order they do it. This used to read
                  "give them the code above plus a seat number each" — and there is no seat
                  number anywhere in the student flow to give. A teacher who read that out
                  handed thirty students a number to type into a box that does not exist. */}
              <li>
                Send students to <code>{window.location.origin}/join</code> and read out the code above.
                They type the code, then the name you will see their work under.
              </li>
              <li>Allow about {durationLabel(PLAN_UNDER_PRESSURE)}. Do not coach a financial strategy.</li>
              <li>Open the evidence with your private link when they are finished.</li>
            </ol>
            {/* Shown once, and kept in this browser. There is no account to recover it from,
                so the page says so rather than letting a teacher find out in a week. */}
            <div className="class-created__key">
              <p className="field-label">Your private link</p>
              <code>{window.location.origin}{evidencePath(created)}</code>
              <p>
                Bookmark this. It is saved in this browser, it is the only thing that opens this class’s
                evidence, and it is not shown again — the class code alone will not open it, which is what
                stops students reading each other’s work.
              </p>
            </div>
            <Link className="button button--primary" to={evidencePath(created)}>Open this class</Link>
          </div>
        </section>
      </EducatorShell>
    );
  }

  if (known.length === 0) {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">My classes</p>
          <h1>Create your first class.</h1>
          <p>
            You get a code to read out and a private link that opens the evidence. Students make no account
            and give no email address — they type the code at <code>/join</code> and the name their work
            comes back under.
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
        <p>Saved in this browser. Opening a class from its private link on another computer adds it there too.</p>
      </header>

      <section className="dashboard-section">
        <div className="row-list">
          {known.map((record) => (
            <Link key={record.code} to={evidencePath(record)}>
              <div>
                <small>{record.code} · created {new Date(record.createdAt).toLocaleDateString()}</small>
                <h3>{record.label}</h3>
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
        <p className="classes-forget">
          <Button
            variant="quiet"
            onClick={() => { known.forEach((record) => forgetClass(record.code)); setKnown([]); }}
          >
            Forget these classes on this computer
          </Button>
        </p>
      </section>
    </EducatorShell>
  );
}
