import type { PropsWithChildren } from "react";
import type { StageId } from "../domain/evidence/types";
import { AppMark } from "../components/primitives/AppMark";

const PROGRESS: Array<{ label: string; stages: StageId[] }> = [
  { label: "Opportunity", stages: ["role-contract", "setup-comparison"] },
  { label: "First plan", stages: ["working-plan"] },
  { label: "Backup plan", stages: ["fallback-version", "income-check", "week5-transition"] },
  { label: "Week 5", stages: ["week5-event", "first-response", "opportunity-final-repair", "remaining-risk-preview"] },
  { label: "Final word", stages: ["defense", "submitted"] },
];

export function StageShell({ stage, title, kicker, children }: PropsWithChildren<{ stage: StageId; title: string; kicker?: string }>) {
  const current = Math.max(0, PROGRESS.findIndex((item) => item.stages.includes(stage)));
  return (
    <div className="challenge-shell" data-world="basketball">
      <header className="challenge-topbar">
        <AppMark />
        {current >= 0 && (
          <nav className="progress" aria-label="Challenge progress">
            <ol>
              {PROGRESS.map((item, index) => (
                <li key={item.label} className={index < current ? "is-done" : index === current ? "is-current" : ""} aria-current={index === current ? "step" : undefined}>
                  <span>{index + 1}</span><b>{item.label}</b>
                </li>
              ))}
            </ol>
            <p className="visually-hidden">Step {current + 1} of 5: {PROGRESS[current]?.label}</p>
          </nav>
        )}
        <details className="contract-drawer">
          <summary>The deal</summary>
          <div>
            <h2>Avery’s eight-week money</h2>
            <dl>
              <div><dt>Already saved · count on it</dt><dd>$500</dd></div>
              <div><dt>Base pay · count on it</dt><dd>$4,500</dd></div>
              <div><dt>Every practice and game · might earn</dt><dd>$800</dd></div>
              <div><dt>Flight reaches showcase · might earn</dt><dd>$1,000</dd></div>
            </dl>
            <p>Goal: save up to $1,200 for a sports-media course.</p>
          </div>
        </details>
      </header>
      <main className="stage-main">
        <header className="stage-heading" tabIndex={-1}>
          {kicker && <p className="eyebrow">{kicker}</p>}
          <h1>{title}</h1>
        </header>
        {children}
      </main>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
