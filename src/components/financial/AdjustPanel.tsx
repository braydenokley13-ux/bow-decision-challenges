import { useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import { dollars, formatDollars } from "../../domain/core/money";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { assigned, balanceOf, courseRowCapFor } from "../../domain/finance/formulas";
import { loadDemand, loadFor } from "../../domain/finance/load";
import { PLAN_MODES } from "../../domain/finance/modes";
import type { PlanAmounts, SnapshotInputs } from "../../domain/finance/types";
import { STUDENT_COPY } from "../../content/studentCopy";
import { Button } from "../primitives/Button";
import { AllocationControl } from "./AllocationControl";
import { WeekMeter } from "./WeekMeter";
import { CHOICE_LABELS, CHOICE_ORDER } from "./choices";

const { balance: BALANCE_COPY } = STUDENT_COPY.plan;

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
 * which of your three commitments absorbs it". So that is what this asks: what moved, the
 * three amounts they chose, and one tap per row that takes or gives the whole remainder.
 * The steppers are the same control the board uses, so every split the board could reach is
 * still reachable and the arithmetic is unchanged.
 *
 * The live figure is not here. It is on the rail beside this panel, in the same place it
 * sits at every other planning moment, so a student learns one place to look rather than
 * five.
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
  const touched = CHOICE_ORDER.some((category) => input.amounts[category] !== baseline[category]);

  // The one tap each row offers: take the whole shortfall out of it, or put the whole
  // surplus into it. Both are clamped to what the row can actually give or hold, and every
  // amount in the model is a multiple of the step, so a tap can never leave an unreachable
  // number behind.
  const actionFor = (category: CategoryId) => {
    const value = input.amounts[category];
    if (residual > 0) {
      const take = Math.min(value, residual);
      // Named for the row it moves, like the board's. Two or three buttons carrying the same
      // amount and the same verb are a choice nobody can make from the labels alone.
      return take > 0
        ? {
            label: `Take ${formatDollars(take)} from ${CHOICE_LABELS[category]}`,
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
            label: `Add ${formatDollars(put)} to ${CHOICE_LABELS[category]}`,
            spoken: `Add ${formatDollars(put)} to ${CHOICE_LABELS[category]}`,
            onPress: () => onAmountChange(category, dollars(value + put)),
          }
        : undefined;
    }
    return undefined;
  };

  const state = balance === 0 ? "balanced" : residual > 0 ? "over" : "unassigned";

  // Avery's week, on the adjustments that actually move it. Taking the clinics adds hours
  // and the rides row buys them back, so the panel that decides both used to be the one
  // screen in the plan where the hours were named in the row copy and drawn nowhere.
  const load = loadFor(
    { setupId: input.setupId, rehabActive: input.week5Applied, clinicsAccepted: input.includeOptionalWork, timeMoney: input.amounts.flexibleCash },
    SCENARIO_NUMBERS,
  );
  const loadParts = [
    { id: "commute", label: "Travel to practice", blocks: SCENARIO_NUMBERS.load.commuteBlocks[input.setupId] },
    { id: "rehab", label: "Rehab", blocks: input.week5Applied ? SCENARIO_NUMBERS.load.rehabBlocks + SCENARIO_NUMBERS.load.rehabTravelBlocks[input.setupId] : 0 },
    { id: "clinics", label: "Clinics", blocks: input.week5Applied && input.includeOptionalWork ? SCENARIO_NUMBERS.load.clinicBlocks : 0 },
  ].map((part) => ({ ...part, blocks: Math.max(0, part.blocks) }));
  const showMeter = loadDemand(
    { setupId: input.setupId, rehabActive: input.week5Applied, clinicsAccepted: input.includeOptionalWork },
    SCENARIO_NUMBERS,
  ) > 0;

  return (
    <section className="adjust" data-state={state} aria-labelledby="adjust-title">
      <header className="adjust__head">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="adjust-title">{headline}</h2>
        <p className="adjust__lead">{lead}</p>
      </header>

      {changes.length > 0 && (
        <ul className="supply-change" aria-label="What changed">
          {changes.map((change) => (
            <li key={change.id} data-direction={change.direction}>
              <span className="supply-change__sign" aria-hidden="true">{change.direction === "out" ? "−" : "+"}</span>
              <span className="supply-change__label">{change.label}</span>
              <strong className="money">{formatDollars(change.amount)}</strong>
            </li>
          ))}
        </ul>
      )}

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

      {showMeter && (
        <WeekMeter load={load} parts={loadParts} rate={SCENARIO_NUMBERS.load.blockBuybackCost} atStake={`the ${formatDollars(SCENARIO_NUMBERS.completionIncome)} attendance bonus`} />
      )}

      {attempts >= 2 && balance !== 0 && (
        <section className="plan-help" aria-label="Step-by-step help">
          {!showHelp
            ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this works</Button>
            : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number at the bottom of Avery’s money.</li><li>Press the button on whichever row you are willing to move.</li><li>Repeat until that number reaches <b>$0</b>.</li></ol></div>}
          {attempts >= 3 && (
            <div className="plan-help__supply">
              <Button type="button" variant="quiet" onClick={onShowAndContinue}>Fill in one plan that balances</Button>
              <small>This spreads the money evenly. It is one plan that works, not the right answer.</small>
            </div>
          )}
        </section>
      )}

      <footer className={`plan-commit plan-commit--${state}`}>
        {/* The figure is its own element so the narrow layout can drop it: down there the
            money strip is pinned to the bottom of the screen holding the same number. */}
        <p className="plan-commit__read" aria-live="polite">
          {balance === 0
            ? BALANCE_COPY.balanced
            : <><span className="plan-commit__figure money">{formatDollars(residual > 0 ? residual : toPlace)}</span>{" "}
              {residual > 0 ? BALANCE_COPY.over : BALANCE_COPY.unassigned}</>}
        </p>
        <div className="plan-commit__actions">
          {touched && <Button type="button" variant="quiet" onClick={onRestore}>Put my saved numbers back</Button>}
          {residual > 0 && attempts > 0 && (
            <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>
              Save it, {formatDollars(residual)} still missing
            </Button>
          )}
          <Button type="button" onClick={() => onCommit()}>{balance === 0 ? commitLabel : "Check this plan"}</Button>
        </div>
      </footer>
    </section>
  );
}
