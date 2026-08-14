import type { PropsWithChildren } from "react";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { CONDITIONAL_INCOME_KEYS, incomeAmount, RELIABLE_INCOME_KEYS } from "../domain/scenario/expectations";
import { formatDollars } from "../domain/core/money";
import { PROGRESS_STEPS, progressIndexFor, seasonPositionFor } from "../domain/machine/stages";
import type { StageId } from "../domain/evidence/types";
import { AppMark } from "../components/primitives/AppMark";
import { SeasonStrip } from "../components/story/SeasonStrip";

const { numbers, incomeCopy, goalLabel } = BASKETBALL_SCENARIO;

// Read from the scenario so a second world needs no change here, and so no amount on this
// screen can drift from the amount the grader prices.
const MONEY_SHEET = [...RELIABLE_INCOME_KEYS, ...CONDITIONAL_INCOME_KEYS].map((key) => ({
  key,
  label: incomeCopy[key].label,
  note: incomeCopy[key].note,
  amount: incomeAmount(numbers, key),
}));

export function StageShell({ stage, title, kicker, children }: PropsWithChildren<{ stage: StageId; title: string; kicker?: string }>) {
  const chapter = progressIndexFor(stage);
  const position = seasonPositionFor(stage);
  const announcement = `${position.caption}. Part ${chapter + 1} of ${PROGRESS_STEPS.length}: ${PROGRESS_STEPS[chapter]?.label}.`;
  return (
    <div className="challenge-shell" data-world={BASKETBALL_SCENARIO.id}>
      <header className="challenge-topbar">
        <AppMark />
        <SeasonStrip position={position} announcement={announcement} />
        <details className="contract-drawer">
          <summary>Money sheet</summary>
          <div>
            <h2>Avery’s money</h2>
            <p><strong>Safe cash</strong> always arrives. <strong>Maybe money</strong> arrives only if its rule is met.</p>
            <dl>
              {MONEY_SHEET.map((item) => (
                <div key={item.key}>
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
