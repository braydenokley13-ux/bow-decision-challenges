import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { CLASS_ERROR_MESSAGES, CLASS_RETENTION_DAYS, isClassError, type ClassCreation } from "../platform/classes/types";
import { durationLabel, PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
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
export function ClassSetup() {
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<ClassCreation | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [known, setKnown] = useState(() => rememberedClasses());

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
