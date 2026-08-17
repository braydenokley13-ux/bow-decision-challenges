import { useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import { dollars, formatDollars } from "../../domain/core/money";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { balanceOf, amountFreed, assigned, courseRowCapFor } from "../../domain/finance/formulas";
import { PLAN_MODES } from "../../domain/finance/modes";
import type { PlanAmounts, SnapshotInputs } from "../../domain/finance/types";
import { loadDemand, loadFor } from "../../domain/finance/load";
import { STUDENT_COPY } from "../../content/studentCopy";
import { Button } from "../primitives/Button";
import { CHOICE_LABELS, CHOICE_ORDER } from "./choices";
import { MoneyLedger } from "./MoneyLedger";
import { AllocationControl } from "./AllocationControl";
import { WeekMeter } from "./WeekMeter";

const { steps, balance: BALANCE_COPY, running: RUNNING_COPY } = STUDENT_COPY.plan;

/**
 * The two moments that earn the whole board.
 *
 * `build` is the first plan: the student has never split this money before. `triage` is
 * Week 5: the money is already committed, a bill has landed on it, and the job is to decide
 * what Avery gives up. Everything after them is an adjustment, and adjustments have their
 * own, much smaller instrument.
 *
 * The two variants no longer look alike, because they are not alike. `build` is a sequence
 * of numbered steps that only ever asks one question at a time; `triage` is a single
 * question asked of three rows at once, which is exactly what makes it hard.
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
  /** Where this board's steps sit in the screen's own numbering. Omitted where there is none. */
  stepFrom?: number | undefined;
  onAmountChange: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
  /**
   * The student says which row takes the money still unassigned. Only on `build`, because
   * only there is there money looking for a job rather than a bill looking for a payer.
   */
  onAssignRemainder: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
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
  input, variant, setupTitle, baseline, reference, attempts, notes, stepFrom,
  onAmountChange, onAssignRemainder, onLockedMoveAttempt, onCommit, onApplyReference, onScaffold, onShowAndContinue, change, commitLabel,
}: PlanBoardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const residual = Math.max(0, -Number(balance));
  const freed = baseline ? amountFreed(baseline, input.amounts) : undefined;
  const mode = PLAN_MODES[input.mode];
  const courseCap = courseRowCapFor(input, SCENARIO_NUMBERS);
  const max = Math.max(courseCap, assigned(input.amounts) + Math.max(0, balance));
  const triage = variant === "triage";
  const step = (offset: number) => (stepFrom === undefined ? undefined : `Step ${stepFrom + offset}`);

  // Avery's week only starts costing more than the commute once rehab begins, so before
  // Week 5 the meter shows the choice the student has already made and its consequence.
  const load = loadFor(
    { setupId: input.setupId, rehabActive: input.week5Applied, clinicsAccepted: input.includeOptionalWork, timeMoney: input.amounts.flexibleCash },
    SCENARIO_NUMBERS,
  );
  const loadParts = [
    { id: "commute", label: "Travel to practice", blocks: SCENARIO_NUMBERS.load.commuteBlocks[input.setupId] },
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
  const takeFrom = (category: CategoryId) => {
    const value = input.amounts[category];
    const take = Math.min(value, residual);
    return take > 0
      ? {
          label: `Take ${formatDollars(take)} out`,
          spoken: `Take ${formatDollars(take)} out of ${CHOICE_LABELS[category]}`,
          onPress: () => onAmountChange(category, dollars(value - take)),
        }
      : undefined;
  };

  /**
   * The other end of the same idea, and the one statement this world records about savings:
   * money with no job yet, and the student naming the row it belongs to.
   *
   * It is its own step rather than a button tucked into a row, because what it records is a
   * decision and a decision deserves to be asked. Everything the steppers can reach it can
   * reach, so it is a shortcut through the ordinary way a plan gets closed rather than a
   * different way of closing one — but it is a shortcut the student takes on purpose.
   *
   * The label states the amount rather than saying "the rest", because on the course row it
   * is not always the rest: that row is capped at what the course costs, so the offer there
   * is whatever will fit. Naming the figure keeps all three buttons the same shape and each
   * of them true, which matters twice over — a button that overstated what it would do would
   * mislead a student, and a course row that quietly behaved differently from the other two
   * would be this board expressing a preference.
   */
  const putRestInto = (category: CategoryId) => {
    const value = input.amounts[category];
    const headroom = category === "goal" ? Math.max(0, courseCap - value) : balance;
    const give = Math.min(balance, headroom);
    return give > 0 ? { amount: give, onPress: () => onAssignRemainder(category, dollars(give)) } : undefined;
  };

  const closers = triage || balance <= 0
    ? []
    : CHOICE_ORDER.map((category) => ({ category, offer: putRestInto(category) })).filter((entry) => entry.offer);

  return (
    <div className="plan-composition">
      <section className="plan-board" data-variant={variant} aria-labelledby="plan-board-title">
        {change && (
          <div className="change-banner" data-variant={variant}>
            <b id="plan-board-title">{change.headline}</b>
            <ul>{change.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {!change && (
          <header className="plan-board__header">
            <h2 id="plan-board-title" className="stamp">Avery’s plan</h2>
            {/* Only offered once the board differs from what the student saved; otherwise
                the control does nothing and reads as a step they have missed. */}
            {reference && onApplyReference && CHOICE_ORDER.some((category) => reference[category] !== input.amounts[category])
              && <Button variant="quiet" type="button" onClick={() => onApplyReference()}>Put my saved numbers back</Button>}
          </header>
        )}

        <MoneyLedger input={input} setupTitle={setupTitle} onLockedMoveAttempt={onLockedMoveAttempt} />

        <section className="plan-step" aria-labelledby="plan-step-decide">
          <header className="plan-step__head">
            {step(0) && <p className="stamp">{step(0)}</p>}
            <h3 id="plan-step-decide">{triage ? "Something has to come back out." : steps.decide.name}</h3>
            <p className="plan-step__why">{triage ? "Every amount below is money you already promised somewhere else. Take the shortfall out of whichever ones Avery can do without." : steps.decide.why}</p>
          </header>
          {/* The number the rows are being driven to, beside the rows. The bar at the foot
              of the board is the one that commits; on a long screen it is also the one that
              has scrolled away by the time a student is pressing the keys. */}
          <p className="plan-running" data-state={balance === 0 ? "balanced" : balance < 0 ? "over" : "unassigned"} aria-live="polite">
            <strong className="money">{formatDollars(Math.abs(balance))}</strong>
            <span>{balance === 0 ? RUNNING_COPY.balanced : balance < 0 ? (triage ? RUNNING_COPY.short : RUNNING_COPY.over) : RUNNING_COPY.unassigned}</span>
          </p>
          <div className="choice-stack">
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
                {...(triage ? { action: takeFrom(category) } : {})}
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
          {/* Only where an earlier plan exists to compare against, and only once something
              has actually moved — a $0 here would read as a real measurement. */}
          {freed !== undefined && freed > 0 && (
            <p className="exposure-summary" aria-live="polite">
              <span>Cut from your earlier plan</span><strong className="money">{formatDollars(freed)}</strong>
            </p>
          )}
        </section>

        {/* Step 5 keeps its place on the board even once there is nothing left to place.
            It used to disappear the moment the plan balanced, so a screen that had opened
            by promising six steps then showed four — and a student who had done everything
            right was left looking for the two that had gone missing. */}
        {!triage && (
          <section className="plan-step plan-step--closer" aria-labelledby="plan-step-rest">
            <header className="plan-step__head">
              {step(1) && <p className="stamp">{step(1)}</p>}
              {/* Naming the amount is what tells this step apart from the one above it. Both
                  offer the same three rows, and without the figure they read as the same
                  control twice. */}
              <h3 id="plan-step-rest">{closers.length > 0 ? `Where does the last ${formatDollars(balance)} go?` : steps.rest.name}</h3>
              <p className="plan-step__why">{closers.length > 0 ? steps.rest.ask : steps.rest.done}</p>
            </header>
            {closers.length > 0 && (
              <>
                <div className="closer-choice">
                  {closers.map(({ category, offer }) => (
                    <button
                      key={category}
                      type="button"
                      data-category={category}
                      aria-label={`Put ${formatDollars(offer!.amount)} into ${CHOICE_LABELS[category]}`}
                      onClick={offer!.onPress}
                    >
                      <span className="closer-choice__row">{CHOICE_LABELS[category]}</span>
                      <strong className="money">Put {formatDollars(offer!.amount)} here</strong>
                    </button>
                  ))}
                </div>
                <p className="plan-step__why">{steps.rest.why}</p>
              </>
            )}
          </section>
        )}

        {attempts >= 2 && balance !== 0 && (
          <section className="plan-help" aria-label="Step-by-step help">
            {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this works</Button> : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number in the bar at the bottom.</li><li>Use − and + on any of the three rows above.</li><li>Keep going until that number reaches <b>$0</b>.</li></ol></div>}
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
            {step(2) && <p className="stamp">{step(2)} · {steps.review.name}</p>}
            <strong className="money">{formatDollars(Math.abs(balance))}</strong>
            <span>{balance === 0 ? BALANCE_COPY.balanced : balance < 0 ? (triage ? BALANCE_COPY.short : BALANCE_COPY.over) : BALANCE_COPY.unassigned}</span>
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
