import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { CLASS_ERROR_MESSAGES, CLASS_RETENTION_DAYS, isClassError, type ClassCreation } from "../platform/classes/types";
import { durationLabel, PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { assessableStandards, FRAMEWORKS, labelsFor } from "../domain/standards";
import type { FrameworkId } from "../domain/standards";
import { forgetClass, rememberClass, rememberedClasses } from "./classMemory";

/**
 * Where a facilitator gets a class code.
 *
 * This is the whole setup step, and it is deliberately the whole setup step: no accounts,
 * no roster, no student names, no email addresses. A teacher names the class, gets a code
 * to read out and a private link to keep, and that is the pilot.
 *
 * The private link matters more than it looks. The class code goes on a whiteboard, so
 * every student in the room has it — which means it cannot be what opens the evidence. The
 * key in this link is, and it is stored in this browser and shown once.
 */
/**
 * The framework this deployment sets work against. One today.
 *
 * Named once, here, so the two strings a teacher reads — the word for an objective and the
 * attribution line — come from the framework rather than from this file. A second state is
 * then a row in `FRAMEWORKS`, not a rewrite of this screen.
 */
const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";

/** The value the picker uses for "no objective", which is not the same as none existing. */
const NO_OBJECTIVE = "";

export function ClassSetup() {
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<ClassCreation | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [known, setKnown] = useState(() => rememberedClasses());
  // Only objectives a built world can actually assess. An objective BOW has a mapping for
  // and no world would produce a class code, thirty submissions and no result — which is
  // the one thing §5.6 says the product may never let a teacher believe.
  const [objectives] = useState(() => assessableStandards(FRAMEWORK_ID));
  const [objectiveCode, setObjectiveCode] = useState(() => assessableStandards(FRAMEWORK_ID)[0]?.code ?? NO_OBJECTIVE);
  const framework = FRAMEWORKS[FRAMEWORK_ID];
  const labels = labelsFor(FRAMEWORK_ID);

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
          body: JSON.stringify({ objectiveRef: { frameworkId: FRAMEWORK_ID, code: objectiveCode } }),
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

  const evidencePath = (record: { code: string; teacherKey: string }) =>
    `/educator/class/${record.code}?key=${record.teacherKey}`;

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">Run it with a class</p>
        <h1>Create a class.</h1>
        <p>
          Name it so you recognise it later. You will get a code to read out and a private link that
          opens the evidence. Students need no account, no email address and no name — a seat number is
          how their work finds its way back to you.
        </p>
      </header>

      {created ? (
        <section className="class-created">
          <div className="class-created__code">
            <p className="field-label">Class code</p>
            <strong>{created.code}</strong>
            <p>Read this out, or write it on the board. It is not case sensitive.</p>
          </div>
          <div className="class-created__body">
            <h2>{created.label}</h2>
            <ol className="class-created__steps">
              <li>
                Send students to <code>{window.location.origin}{PLAN_UNDER_PRESSURE.route}</code> and give them
                the code above plus a seat number each.
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
            <Link className="button button--primary" to={evidencePath(created)}>Open the evidence room</Link>
          </div>
        </section>
      ) : (
        <section className="class-form">
          <label htmlFor="class-label">Class name</label>
          <input
            id="class-label"
            value={label}
            onChange={(event) => { setLabel(event.target.value); setProblem(null); }}
            onKeyDown={(event) => { if (event.key === "Enter") void create(); }}
            placeholder="Period 3 · Grade 7"
            maxLength={60}
            aria-describedby="class-form-status"
          />
          <label htmlFor="class-objective">{labels?.unitNounShort ?? "Objective"}</label>
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
          <Button type="button" aria-disabled={working} onClick={() => void create()}>
            {working ? "Creating…" : "Create the class"}
          </Button>
          <p id="class-form-status" className={`class-form__status${problem ? " class-form__status--problem" : ""}`} aria-live="polite">
            {problem ?? `Classes and their evidence are kept for ${CLASS_RETENTION_DAYS} days, then deleted.`}
          </p>
        </section>
      )}

      {known.length > 0 && (
        <section className="dashboard-section">
          <div className="section-heading">
            <p className="eyebrow">On this computer</p>
            <h2>Classes you have opened here</h2>
          </div>
          <div className="student-worklist">
            {known.map((record) => (
              <Link key={record.code} to={evidencePath(record)}>
                <div>
                  <span>{record.code}</span>
                  <h3>{record.label}</h3>
                  <p>Created {new Date(record.createdAt).toLocaleDateString()}</p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
          <Button
            variant="quiet"
            onClick={() => { known.forEach((record) => forgetClass(record.code)); setKnown([]); }}
          >
            Forget these on this computer
          </Button>
        </section>
      )}
    </EducatorShell>
  );
}
