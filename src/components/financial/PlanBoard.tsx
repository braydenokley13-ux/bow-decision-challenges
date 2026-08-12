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
  working: { eyebrow: "YOUR FIRST PLAN", title: "Give every dollar a job", body: "The costs on the left cannot move. You choose how to split all the money that is left." },
  fallback: { eyebrow: "BACKUP PLAN", title: "Plan without the bonus cash", body: "Pretend the extra bonuses never arrive. Change only the three money choices on the right." },
  "week5-first-response": { eyebrow: "YOUR FIRST FIX", title: "Try to fix the Week 5 problem", body: "Start with your saved numbers. Change the money on the right until the missing amount is gone—or save it to show exactly how much is still missing." },
  final: { eyebrow: "YOUR FINAL PLAN", title: "Make the updated plan work", body: "Your two new choices are now included. Move the money on the right until every dollar has a job." },
  "remaining-risk": { eyebrow: "ONE LAST CHECK", title: "What if the $800 bonus disappears?", body: "This is a copy of your final plan. Remove the $800 bonus and change the money on the right so the plan still works." },
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
  const unassigned = Math.max(0, balance);
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
          <aside className="locked-stack" aria-label="Locked commitments">
            <p className="field-label">MONEY ALREADY PROMISED</p>
            <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("setup")}>
              <span>🔒 Cannot move · {setupTitle}</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.setupCosts[input.setupId])}</strong>
            </button>
            <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("essentials")}>
              <span>🔒 Cannot move · Food, phone, laundry, and other needs</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.essentialsTotal)}</strong>
            </button>
            {input.week5Applied && <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("week5-cost")}>
              <span>🔒 New must-pay cost · Brace, rehab, and travel</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[input.setupId])}</strong>
            </button>}
            <p className="locked-stack__note"><strong>Why can’t these move?</strong> Avery already agreed to pay them. You can only change the money choices on the right.</p>
          </aside>
          <div className="adjustable-grid">
            <p className="field-label adjustable-grid__label">MONEY YOU GET TO CHOOSE</p>
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
        {mode.baseline && (
          <div className="exposure-summary" aria-live="polite">
            {input.mode === "fallback" && <div><span>Bonus cash removed</span><strong className="money">{formatDollars(exposureFor(input, SCENARIO_NUMBERS))}</strong></div>}
            <div><span>Money cut from your earlier plan</span><strong className="money">{freed === undefined ? "—" : formatDollars(freed)}</strong></div>
            <div><span>{mode.residualLabel === "gapRemaining" ? "Money you still need" : "Money still missing"}</span><strong className="money">{formatDollars(residual)}</strong></div>
          </div>
        )}
        {attempts >= 2 && balance !== 0 && (
          <section className="plan-help" aria-label="Step-by-step help">
            {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this dashboard works</Button> : <div role="note"><strong>Do this one step at a time:</strong><ol><li>Find the amount that is <b>short</b> or <b>still unassigned</b> below.</li><li>Use the minus or plus buttons on the three cards above.</li><li>Keep changing those cards until the number below reaches <b>$0</b>.</li></ol></div>}
            {attempts >= 3 && <Button type="button" variant="quiet" onClick={onShowAndContinue}>Build one working answer for me</Button>}
          </section>
        )}
        <footer className={`plan-commit plan-commit--${balance === 0 ? "balanced" : balance < 0 ? "over" : "unassigned"}`}>
          <div>
            <span>{balance === 0 ? "Perfect! Every dollar has a job." : balance < 0 ? `You need ${formatDollars(residual)} more than you have.` : `You still need to give ${formatDollars(unassigned)} a job.`}</span>
            <strong className="money">{formatDollars(Math.abs(balance))}</strong>
          </div>
          <div className="plan-commit__actions">
            <Button type="button" onClick={() => onCommit()}>{balance === 0 ? (input.mode === "final" ? "Save final plan" : input.mode === "remaining-risk" ? "Save preview" : "Save this version") : "Check this plan"}</Button>
            {residual > 0 && attempts > 0 && <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>Save it and show that {formatDollars(residual)} is still missing</Button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
