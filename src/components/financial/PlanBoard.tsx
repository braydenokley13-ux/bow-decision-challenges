import { useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import { dollars, formatDollars } from "../../domain/core/money";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { balanceOf, amountFreed, assigned, courseRowCapFor } from "../../domain/finance/formulas";
import { PLAN_MODES } from "../../domain/finance/modes";
import type { PlanAmounts, SnapshotInputs } from "../../domain/finance/types";
import { loadDemand, loadFor } from "../../domain/finance/load";
import { Button } from "../primitives/Button";
import { CHOICE_LABELS, CHOICE_ORDER } from "./choices";
import { MoneySplit } from "./MoneySplit";
import { AllocationControl } from "./AllocationControl";
import { WeekMeter } from "./WeekMeter";

/**
 * The two moments that earn the whole board.
 *
 * `build` is the first plan: the student has never split this money before and needs the
 * towers, the meter and three rows that move freely. `triage` is Week 5: the money is
 * already committed, a bill has landed on it, and the job is to decide what Avery gives
 * up. They share the towers because both are about the whole plan at once — everything
 * after them is an adjustment, and adjustments have their own, much smaller instrument.
 */
export type BoardVariant = "build" | "triage";

interface PlanBoardProps {
  input: SnapshotInputs;
  variant: BoardVariant;
  setupTitle: string;
  baseline?: PlanAmounts | undefined;
  reference?: PlanAmounts | undefined;
  attempts: number;
  /** What each row costs Avery at the amount it currently holds. Derived, never decorative. */
  notes: Record<CategoryId, string>;
  onAmountChange: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
  onLockedMoveAttempt: (id: string) => void;
  onCommit: (acknowledgedResidual?: ReturnType<typeof dollars>) => void;
  onApplyReference?: ((category?: CategoryId) => void) | undefined;
  onScaffold?: () => void;
  onShowAndContinue?: () => void;
  /** What moved since the student last saved, so a returning board reads as a response. */
  change?: { headline: string; items: readonly string[] } | undefined;
  commitLabel: string;
}

export function PlanBoard({
  input, variant, setupTitle, baseline, reference, attempts, notes,
  onAmountChange, onLockedMoveAttempt, onCommit, onApplyReference, onScaffold, onShowAndContinue, change, commitLabel,
}: PlanBoardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const residual = Math.max(0, -Number(balance));
  const freed = baseline ? amountFreed(baseline, input.amounts) : undefined;
  const mode = PLAN_MODES[input.mode];
  const courseCap = courseRowCapFor(input, SCENARIO_NUMBERS);
  const max = Math.max(courseCap, assigned(input.amounts) + Math.max(0, balance));
  const triage = variant === "triage";

  // Avery's week only starts costing more than the commute once rehab begins, so before
  // Week 5 the meter shows the choice the student has already made and its consequence.
  const load = loadFor(
    { setupId: input.setupId, rehabActive: input.week5Applied, clinicsAccepted: input.includeOptionalWork, timeMoney: input.amounts.flexibleCash },
    SCENARIO_NUMBERS,
  );
  const loadParts = [
    { id: "commute", label: "Getting there", blocks: SCENARIO_NUMBERS.load.commuteBlocks[input.setupId] },
    {
      id: "rehab",
      label: "Rehab",
      blocks: input.week5Applied ? SCENARIO_NUMBERS.load.rehabBlocks + SCENARIO_NUMBERS.load.rehabTravelBlocks[input.setupId] : 0,
    },
    {
      id: "clinics",
      label: "Clinics",
      blocks: input.week5Applied && input.includeOptionalWork ? SCENARIO_NUMBERS.load.clinicBlocks : 0,
    },
  ].map((part) => ({ ...part, blocks: Math.max(0, part.blocks) }));
  const demandNow = loadDemand(
    { setupId: input.setupId, rehabActive: input.week5Applied, clinicsAccepted: input.includeOptionalWork },
    SCENARIO_NUMBERS,
  );
  // Before rehab starts there is nothing at risk yet, so the meter is context, not a warning.
  const showMeter = demandNow > 0;

  // Triage takes money away rather than handing it out, so the row's one tap and the
  // running number are framed as a shortfall being cleared.
  const actionFor = (category: CategoryId) => {
    if (!triage || residual <= 0) return undefined;
    const value = input.amounts[category];
    const take = Math.min(value, residual);
    return take > 0
      ? { label: `Take ${formatDollars(take)}`, onPress: () => onAmountChange(category, dollars(value - take)) }
      : undefined;
  };

  return (
    <div className="plan-composition">
      <section className="plan-board" data-variant={variant} aria-labelledby="plan-board-title">
        {change && (
          <div className="change-banner" data-variant={variant}>
            <b id="plan-board-title">{change.headline}</b>
            <ul>{change.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {/* Where the banner already carries the headline, the header is only the two
            controls — a second full-height strip under it was empty space announcing
            nothing. */}
        <header className="plan-board__header" data-slim={Boolean(change)}>
          {!change && <h2 id="plan-board-title">Split what is left</h2>}
          <p className="plan-board__setup">{setupTitle}</p>
          {/* Only offered once the board differs from what the student saved; otherwise
              the control does nothing and reads as a step they have missed. */}
          {reference && onApplyReference && CHOICE_ORDER.some((category) => reference[category] !== input.amounts[category])
            && <Button variant="quiet" type="button" onClick={() => onApplyReference()}>Put my saved numbers back</Button>}
        </header>
        <div className="plan-board__body">
          <MoneySplit input={input} onLockedMoveAttempt={onLockedMoveAttempt} />
          <div className="choice-stack">
            <p className="field-label">{triage ? "Where the money comes from" : "Your choices"}</p>
            {CHOICE_ORDER.map((category) => (
              <AllocationControl
                key={category}
                id={category}
                label={CHOICE_LABELS[category]}
                description={notes[category]}
                value={input.amounts[category]}
                step={mode.increment}
                max={category === "goal" ? courseCap : max}
                originalValue={baseline?.[category]}
                action={actionFor(category)}
                {...(category === "goal" && input.depositTaken
                  ? { lockedNote: `Seat reserved for ${formatDollars(SCENARIO_NUMBERS.course.depositPrice)}. That money is already committed.` }
                  : {})}
                onChange={(amount) => onAmountChange(category, amount)}
              />
            ))}
            {showMeter && (
              <WeekMeter load={load} parts={loadParts} atStake={`the ${formatDollars(SCENARIO_NUMBERS.completionIncome)} attendance bonus`} />
            )}
            {/* Only where an earlier plan exists to compare against, and only once something
                has actually moved — a $0 here would read as a real measurement. */}
            {freed !== undefined && freed > 0 && (
              <div className="exposure-summary" aria-live="polite">
                <div><span>Cut from your earlier plan</span><strong className="money">{formatDollars(freed)}</strong></div>
              </div>
            )}
          </div>
        </div>
        {attempts >= 2 && balance !== 0 && (
          <section className="plan-help" aria-label="Step-by-step help">
            {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this board works</Button> : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number in the bar at the bottom.</li><li>Use − and + on any of the three rows above.</li><li>Keep going until that number reaches <b>$0</b>.</li></ol></div>}
            {attempts >= 3 && (
              <div className="plan-help__supply">
                <Button type="button" variant="quiet" onClick={onShowAndContinue}>Fill in one plan that balances</Button>
                <small>This spreads the money evenly. It is one plan that works, not the right answer.</small>
              </div>
            )}
          </section>
        )}
        <footer className={`plan-commit plan-commit--${balance === 0 ? "balanced" : balance < 0 ? "over" : "unassigned"}`}>
          <div className="plan-commit__state" aria-live="polite">
            <strong className="money">{formatDollars(Math.abs(balance))}</strong>
            <span>{balance === 0 ? "Every dollar has a job." : balance < 0 ? (triage ? "still to find." : "more than Avery has.") : "still needs a job."}</span>
          </div>
          <div className="plan-commit__actions">
            <Button type="button" onClick={() => onCommit()}>{balance === 0 ? commitLabel : "Check this plan"}</Button>
            {residual > 0 && attempts > 0 && <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>Save it, {formatDollars(residual)} still missing</Button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
