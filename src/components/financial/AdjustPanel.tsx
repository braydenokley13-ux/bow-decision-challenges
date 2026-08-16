import { useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import { dollars, formatDollars } from "../../domain/core/money";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { assigned, availableFor, balanceOf, courseRowCapFor } from "../../domain/finance/formulas";
import { PLAN_MODES } from "../../domain/finance/modes";
import type { PlanAmounts, SnapshotInputs } from "../../domain/finance/types";
import { Button } from "../primitives/Button";
import { AllocationControl } from "./AllocationControl";
import { CHOICE_LABELS, CHOICE_ORDER } from "./choices";

/** One line of the strip above the rows: money that left the plan, or money that joined it. */
export interface SupplyChange {
  id: string;
  label: string;
  amount: number;
  direction: "in" | "out";
}

interface AdjustPanelProps {
  input: SnapshotInputs;
  /** The plan being adjusted, as the student last committed it. */
  baseline: PlanAmounts;
  /** What moved, named before any row is touched. */
  changes: readonly SupplyChange[];
  eyebrow: string;
  headline: string;
  lead: string;
  /** What each row costs Avery at its current amount. Derived, never decorative. */
  notes: Record<CategoryId, string>;
  commitLabel: string;
  attempts: number;
  onAmountChange: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
  onCommit: (acknowledgedResidual?: ReturnType<typeof dollars>) => void;
  onRestore: () => void;
  onScaffold?: (() => void) | undefined;
  onShowAndContinue?: (() => void) | undefined;
}

/**
 * The plan, adjusted — not the plan, rebuilt.
 *
 * Three of the five money moments used to hand the student the whole planning board back:
 * two towers, three steppers, a balance bar and the same headline shape. That was the same
 * interaction five times over, and by the third pass a student is no longer thinking about
 * Avery, they are operating a form.
 *
 * The decision at those three moments is not "how should this money be split" — the
 * student answered that on the board already. It is "the total just moved by this much;
 * which of your three commitments absorbs it". So that is what this asks: one number to
 * clear, the three amounts they chose, and one tap per row that takes or gives the whole
 * remainder. The steppers are the same control the board uses, so every split the board
 * could reach is still reachable and the arithmetic is unchanged — but the fast path
 * through the common answer is a single press, and the screen is a third of the height.
 */
export function AdjustPanel({
  input, baseline, changes, eyebrow, headline, lead, notes, commitLabel, attempts,
  onAmountChange, onCommit, onRestore, onScaffold, onShowAndContinue,
}: AdjustPanelProps) {
  const [showHelp, setShowHelp] = useState(false);
  const step = PLAN_MODES[input.mode].increment;
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const residual = Math.max(0, -Number(balance));
  const toPlace = Math.max(0, Number(balance));
  const courseCap = courseRowCapFor(input, SCENARIO_NUMBERS);
  const ceiling = Math.max(courseCap, assigned(input.amounts) + toPlace);
  const available = availableFor(input, SCENARIO_NUMBERS);
  const touched = CHOICE_ORDER.some((category) => input.amounts[category] !== baseline[category]);

  // The one tap each row offers: take the whole shortfall out of it, or put the whole
  // surplus into it. Both are clamped to what the row can actually give or hold, and every
  // amount in the model is a multiple of the step, so a tap can never leave an unreachable
  // number behind.
  const actionFor = (category: CategoryId) => {
    const value = input.amounts[category];
    if (residual > 0) {
      const take = Math.min(value, residual);
      return take > 0
        ? {
            label: `Take ${formatDollars(take)}`,
            spoken: `Take ${formatDollars(take)} out of ${CHOICE_LABELS[category]}`,
            onPress: () => onAmountChange(category, dollars(value - take)),
          }
        : undefined;
    }
    if (toPlace > 0) {
      const cap = category === "goal" ? courseCap : Number.POSITIVE_INFINITY;
      const put = Math.min(toPlace, Math.max(0, cap - value));
      return put > 0
        ? {
            label: `Add ${formatDollars(put)}`,
            spoken: `Add ${formatDollars(put)} to ${CHOICE_LABELS[category]}`,
            onPress: () => onAmountChange(category, dollars(value + put)),
          }
        : undefined;
    }
    return undefined;
  };

  const state = balance === 0 ? "balanced" : residual > 0 ? "over" : "unassigned";
  const countdown = balance === 0
    ? { label: "Every dollar has a job", amount: 0 }
    : residual > 0
      ? { label: "Still to take out", amount: residual }
      : { label: "Still to give a job", amount: toPlace };

  return (
    <section className="adjust" data-state={state} aria-labelledby="adjust-title">
      <header className="adjust__head">
        <div className="adjust__say">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="adjust-title">{headline}</h2>
          <p className="adjust__lead">{lead}</p>
        </div>
        <ul className="supply-change" aria-label="What changed">
          {changes.map((change) => (
            <li key={change.id} data-direction={change.direction}>
              <span className="supply-change__sign" aria-hidden="true">{change.direction === "out" ? "−" : "+"}</span>
              <span className="supply-change__label">{change.label}</span>
              <strong className="money">{formatDollars(change.amount)}</strong>
            </li>
          ))}
          <li data-direction="total">
            <span className="supply-change__sign" aria-hidden="true">=</span>
            <span className="supply-change__label">Avery has</span>
            <strong className="money">{formatDollars(available)}</strong>
          </li>
        </ul>
      </header>

      <p className="adjust__countdown" aria-live="polite">
        <span>{countdown.label}</span>
        <strong className="money">{formatDollars(countdown.amount)}</strong>
      </p>

      <div className="adjust__rows">
        {CHOICE_ORDER.map((category) => (
          <AllocationControl
            key={category}
            id={category}
            label={CHOICE_LABELS[category]}
            description={notes[category]}
            value={input.amounts[category]}
            step={step}
            max={category === "goal" ? courseCap : ceiling}
            originalValue={baseline[category]}
            action={actionFor(category)}
            {...(category === "goal" && input.depositTaken
              ? { lockedNote: `Seat reserved for ${formatDollars(SCENARIO_NUMBERS.course.depositPrice)}. That money is already committed.` }
              : {})}
            onChange={(amount) => onAmountChange(category, amount)}
          />
        ))}
      </div>

      {attempts >= 2 && balance !== 0 && (
        <section className="plan-help" aria-label="Step-by-step help">
          {!showHelp
            ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this works</Button>
            : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number beside “{countdown.label}”.</li><li>Press the button on whichever row you are willing to move.</li><li>Repeat until that number reaches <b>$0</b>.</li></ol></div>}
          {attempts >= 3 && (
            <div className="plan-help__supply">
              <Button type="button" variant="quiet" onClick={onShowAndContinue}>Fill in one plan that balances</Button>
              <small>This spreads the money evenly. It is one plan that works, not the right answer.</small>
            </div>
          )}
        </section>
      )}

      {/* The countdown above is already the number, so this bar says what it means rather
          than printing it a second time in a bigger font. */}
      <footer className={`plan-commit plan-commit--${state}`}>
        <p className="plan-commit__read">
          {balance === 0
            ? "Nothing left to move."
            : residual > 0
              ? "The plan still spends more than Avery has."
              : "Some of Avery’s money has nothing to do yet."}
        </p>
        <div className="plan-commit__actions">
          {touched && <Button type="button" variant="quiet" onClick={onRestore}>Start over</Button>}
          <Button type="button" onClick={() => onCommit()}>{balance === 0 ? commitLabel : "Check this plan"}</Button>
          {residual > 0 && attempts > 0 && (
            <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>
              Save it, {formatDollars(residual)} still missing
            </Button>
          )}
        </div>
      </footer>
    </section>
  );
}
