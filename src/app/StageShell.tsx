import type { PropsWithChildren } from "react";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { formatDollars } from "../domain/core/money";
import { PROGRESS_STEPS, progressIndexFor } from "../domain/machine/stages";
import type { StageId } from "../domain/evidence/types";
import { AppMark } from "../components/primitives/AppMark";

const { numbers, incomeCopy, goalLabel } = BASKETBALL_SCENARIO;

// Read from the scenario so a second world needs no change here.
const SAFE_MONEY = [
  { label: "Already saved", amount: numbers.savings, note: incomeCopy.savings },
  { label: "Base pay", amount: numbers.basePay, note: incomeCopy.base },
];
const MAYBE_MONEY = [
  { label: "Perfect Attendance Bonus", amount: numbers.completionIncome, note: incomeCopy.completion },
  { label: "Making the Cut Bonus", amount: numbers.outcomeIncome, note: incomeCopy.outcome },
];

export function StageShell({ stage, title, kicker, children }: PropsWithChildren<{ stage: StageId; title: string; kicker?: string }>) {
  const current = progressIndexFor(stage);
  return (
    <div className="challenge-shell" data-world={BASKETBALL_SCENARIO.id}>
      <header className="challenge-topbar">
        <AppMark />
        <nav className="progress" aria-label="Challenge progress">
          <ol>
            {PROGRESS_STEPS.map((item, index) => (
              <li key={item.label} className={index < current ? "is-done" : index === current ? "is-current" : ""} aria-current={index === current ? "step" : undefined}>
                <span aria-hidden="true">{index + 1}</span><b>{item.label}</b>
              </li>
            ))}
          </ol>
          <p className="visually-hidden">Step {current + 1} of {PROGRESS_STEPS.length}: {PROGRESS_STEPS[current]?.label}</p>
        </nav>
        <details className="contract-drawer">
          <summary>Money sheet</summary>
          <div>
            <h2>Avery’s money</h2>
            <p><strong>Safe cash</strong> always arrives. <strong>Maybe money</strong> arrives only if its rule is met.</p>
            <dl>
              {[...SAFE_MONEY, ...MAYBE_MONEY].map((item) => (
                <div key={item.label}>
                  <dt>{item.label}<small>{item.note}</small></dt>
                  <dd className="money">{formatDollars(item.amount)}</dd>
                </div>
              ))}
            </dl>
            <p className="contract-drawer__goal">{goalLabel} · up to {formatDollars(numbers.goalCap)}</p>
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
    </div>
  );
}
