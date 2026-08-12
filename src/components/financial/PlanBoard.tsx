import { useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import { dollars, formatDollars } from "../../domain/core/money";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { balanceOf, amountFreed, assigned, exposureFor } from "../../domain/finance/formulas";
import { PLAN_MODES } from "../../domain/finance/modes";
import type { PlanAmounts, SnapshotInputs } from "../../domain/finance/types";
import { Button } from "../primitives/Button";
import { MoneyRail } from "./MoneyRail";
import { AllocationControl } from "./AllocationControl";

const CATEGORIES: Record<CategoryId, { label: string; description: string }> = {
  goal: { label: "Sports-media course", description: "Money Avery wants to save for the future." },
  reserve: { label: "Backup money", description: "Money kept for a surprise later." },
  flexibleCash: { label: "Money for anything else", description: "Money Avery can use for fun, small needs, or another goal." },
};

const MODE_COPY = {
  working: { eyebrow: "First plan", title: "Split what is left", body: "The costs on the left are already promised. You decide what happens to the rest." },
  fallback: { eyebrow: "Backup plan", title: "Now assume the bonus never arrives", body: "Same costs, less money. Change your three choices so the plan still holds." },
  "week5-first-response": { eyebrow: "First response", title: "Fix it with what Avery already has", body: "No new money yet. Move your own numbers as far as they go, then save what is left." },
  final: { eyebrow: "Final plan", title: "Land the plan", body: "Your two Week 5 decisions are in. Move the money until every dollar has a job." },
  "remaining-risk": { eyebrow: "Last check", title: "And if the $800 never comes?", body: "A copy of your final plan with the bonus removed. Make it work without that money." },
} as const;

interface PlanBoardProps {
  input: SnapshotInputs;
  setupTitle: string;
  baseline?: PlanAmounts | undefined;
  reference?: PlanAmounts | undefined;
  attempts: number;
  onAmountChange: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
  onLockedMoveAttempt: (id: string) => void;
  onCommit: (acknowledgedResidual?: ReturnType<typeof dollars>) => void;
  onApplyReference?: ((category?: CategoryId) => void) | undefined;
  onScaffold?: () => void;
  onShowAndContinue?: () => void;
}

export function PlanBoard({ input, setupTitle, baseline, reference, attempts, onAmountChange, onLockedMoveAttempt, onCommit, onApplyReference, onScaffold, onShowAndContinue }: PlanBoardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const residual = Math.max(0, -Number(balance));
  const freed = baseline ? amountFreed(baseline, input.amounts) : undefined;
  const mode = PLAN_MODES[input.mode];
  const copy = MODE_COPY[input.mode];
  const max = Math.max(1200, assigned(input.amounts) + Math.max(0, balance));

  return (
    <div className="plan-composition">
      <MoneyRail input={input} />
      <section className="plan-board" aria-labelledby="plan-board-title">
        <header className="plan-board__header">
          <div>
            <span className="eyebrow">{copy.eyebrow}</span>
            <h2 id="plan-board-title">{copy.title}</h2>
            <p className="plan-board__intro">{copy.body}</p>
          </div>
          {reference && onApplyReference && <Button variant="quiet" type="button" onClick={() => onApplyReference()}>Use my saved numbers</Button>}
        </header>
        <div className="plan-board__body">
          <aside className="locked-stack" aria-label="Money already promised">
            <p className="field-label">Already promised</p>
            <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("setup")}>
              <span><i aria-hidden="true">🔒</i>{setupTitle}</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.setupCosts[input.setupId])}</strong>
            </button>
            <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("essentials")}>
              <span><i aria-hidden="true">🔒</i>Food, phone, laundry, other needs</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.essentialsTotal)}</strong>
            </button>
            {input.week5Applied && <button type="button" aria-disabled="true" className="is-new" onClick={() => onLockedMoveAttempt("week5-cost")}>
              <span><i aria-hidden="true">🔒</i>New · brace, rehab, and travel</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[input.setupId])}</strong>
            </button>}
            <p className="locked-stack__note">Avery already agreed to pay these, so they cannot move.</p>
          </aside>
          <div className="adjustable-grid">
            <p className="field-label adjustable-grid__label">Your choices</p>
            {(["goal", "reserve", "flexibleCash"] as const).map((category) => (
              <AllocationControl
                key={category}
                id={category}
                label={CATEGORIES[category].label}
                description={CATEGORIES[category].description}
                value={input.amounts[category]}
                step={mode.increment}
                max={category === "goal" ? SCENARIO_NUMBERS.goalCap : max}
                originalValue={baseline?.[category]}
                referenceValue={reference?.[category]}
                onChange={(amount) => onAmountChange(category, amount)}
                {...(reference && onApplyReference ? { onApplyReference: () => onApplyReference(category) } : {})}
              />
            ))}
          </div>
        </div>
        {/* Only shown where an earlier plan exists to compare against. The final board
            has no such baseline, and a $0 there would read as a real measurement. */}
        {freed !== undefined && (
          <div className="exposure-summary" aria-live="polite">
            {input.mode === "fallback" && <div><span>Bonus cash removed</span><strong className="money">{formatDollars(exposureFor(input, SCENARIO_NUMBERS))}</strong></div>}
            <div><span>Cut from your earlier plan</span><strong className="money">{formatDollars(Math.max(0, freed))}</strong></div>
          </div>
        )}
        {attempts >= 2 && balance !== 0 && (
          <section className="plan-help" aria-label="Step-by-step help">
            {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this board works</Button> : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number at the bottom of the board.</li><li>Use − and + on any of the three cards above.</li><li>Keep going until that number reaches <b>$0</b>.</li></ol></div>}
            {attempts >= 3 && (
              <div className="plan-help__supply">
                <Button type="button" variant="quiet" onClick={onShowAndContinue}>Fill in one plan that balances</Button>
                <small>This spreads the money evenly. It is one plan that works, not the right answer — this board stops counting toward your score once you use it.</small>
              </div>
            )}
          </section>
        )}
        <footer className={`plan-commit plan-commit--${balance === 0 ? "balanced" : balance < 0 ? "over" : "unassigned"}`}>
          <div className="plan-commit__state">
            <strong className="money">{formatDollars(Math.abs(balance))}</strong>
            <span>{balance === 0 ? "Every dollar has a job." : balance < 0 ? "more than Avery has." : "still needs a job."}</span>
          </div>
          <div className="plan-commit__actions">
            <Button type="button" onClick={() => onCommit()}>{balance === 0 ? (input.mode === "final" ? "Save final plan" : input.mode === "remaining-risk" ? "Save preview" : "Save this version") : "Check this plan"}</Button>
            {residual > 0 && attempts > 0 && <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>Save it, {formatDollars(residual)} still missing</Button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
