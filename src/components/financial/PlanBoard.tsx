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
  goal: { label: "Sports-media course", description: "Avery’s goal after these eight weeks." },
  reserve: { label: "Reserve", description: "Money held for a cost Avery did not see coming." },
  flexibleCash: { label: "Flexible cash", description: "Money left open for smaller needs or another priority." },
};

const MODE_COPY = {
  working: { eyebrow: "THE FIRST PLAN", title: "Split what remains", body: "Housing and essentials are already in. Decide what belongs with the course, reserve, and flexible cash." },
  fallback: { eyebrow: "THE BACKUP PLAN", title: "Remove the money that might not arrive", body: "Revise the three open amounts. Housing and essentials stay where they are." },
  "week5-first-response": { eyebrow: "THE FIRST RESPONSE", title: "Answer Week 5 with the plan you had", body: "The new costs are in. Change only the open amounts, then save this first response—even if money is still missing." },
  final: { eyebrow: "THE FINAL PLAN", title: "Settle the Week 5 numbers", body: "The clinic decision and the $800 choice are now included. Make this version match what happened." },
  "remaining-risk": { eyebrow: "THE NO-$800 VIEW", title: "Examine the remaining risk", body: "This view removes the attendance payment. Revise the open amounts to see whether the plan can still work." },
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
  const hasReferenceDifference = reference ? (["goal", "reserve", "flexibleCash"] as const).some((category) => reference[category] !== input.amounts[category]) : false;

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
          {reference && onApplyReference && hasReferenceDifference && <Button variant="quiet" type="button" onClick={() => onApplyReference()}>Restore the saved amounts</Button>}
        </header>
        <div className="plan-board__body">
          <aside className="locked-stack" aria-label="Locked commitments">
            <p className="field-label">COSTS ALREADY COMMITTED</p>
            <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("setup")}>
              <span>Committed · {setupTitle}</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.setupCosts[input.setupId])}</strong>
            </button>
            <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("essentials")}>
              <span>Committed · Eight weeks of essentials</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.essentialsTotal)}</strong>
            </button>
            {input.week5Applied && <button type="button" aria-disabled="true" onClick={() => onLockedMoveAttempt("week5-cost")}>
              <span>Week 5 · Brace, rehab, and travel</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[input.setupId])}</strong>
            </button>}
            <p className="locked-stack__note">Avery already agreed to these costs. Only the three open amounts can change.</p>
          </aside>
          <div className="adjustable-grid">
            <p className="field-label adjustable-grid__label">AMOUNTS STILL OPEN</p>
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
            {input.mode === "fallback" && <div><span>Uncertain money removed</span><strong className="money">{formatDollars(exposureFor(input, SCENARIO_NUMBERS))}</strong></div>}
            <div><span>Amount reduced from the saved plan</span><strong className="money">{freed === undefined ? "—" : formatDollars(freed)}</strong></div>
            <div><span>{mode.residualLabel === "gapRemaining" ? "Week 5 amount still missing" : "Amount still missing"}</span><strong className="money">{formatDollars(residual)}</strong></div>
          </div>
        )}
        {attempts >= 2 && balance !== 0 && (
          <section className="plan-help" aria-label="Step-by-step help">
            {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show the controls one step at a time</Button> : <div role="note"><strong>Use the board in this order:</strong><ol><li>Read the amount that is missing or unassigned below.</li><li>Change the course, reserve, or flexible cash.</li><li>Save when the amount reaches $0, or record the exact amount still missing.</li></ol></div>}
            {attempts >= 3 && <Button type="button" variant="quiet" onClick={onShowAndContinue}>Build one working answer for me</Button>}
          </section>
        )}
        <footer className={`plan-commit plan-commit--${balance === 0 ? "balanced" : balance < 0 ? "over" : "unassigned"}`}>
          <div>
            <span>{balance === 0 ? "The plan balances." : balance < 0 ? `This version uses ${formatDollars(residual)} more than Avery has.` : `${formatDollars(unassigned)} is still unassigned.`}</span>
            <strong className="money">{formatDollars(Math.abs(balance))}</strong>
          </div>
          <div className="plan-commit__actions">
            <Button type="button" onClick={() => onCommit()}>{balance === 0 ? (input.mode === "final" ? "Save the final plan" : input.mode === "remaining-risk" ? "Save the no-$800 view" : "Save this plan") : "Check these numbers"}</Button>
            {residual > 0 && attempts > 0 && <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>Save this response with {formatDollars(residual)} still missing</Button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
