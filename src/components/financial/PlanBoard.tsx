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
import { AllocationControl } from "./AllocationControl";
import { WeekMeter } from "./WeekMeter";

const { steps, balance: BALANCE_COPY } = STUDENT_COPY.plan;

/**
 * The two moments that earn the whole board.
 *
 * `build` is the first plan: the student has never split this money before. `triage` is
 * Week 5: the money is already committed, a bill has landed on it, and the job is to decide
 * what Avery gives up. Everything after them is an adjustment, and adjustments have their
 * own, much smaller instrument.
 *
 * Neither variant carries the money any more — the rail beside them does, at every moment
 * of planning rather than only inside the two boards. What is left here is the decision
 * itself: three amounts, what each one currently buys, and the bar that commits them.
 */
export type BoardVariant = "build" | "triage";

interface PlanBoardProps {
  input: SnapshotInputs;
  variant: BoardVariant;
  baseline?: PlanAmounts | undefined;
  reference?: PlanAmounts | undefined;
  attempts: number;
  /** What each row costs Avery at the amount it currently holds. Derived, never decorative. */
  notes: Record<CategoryId, string>;
  /** The one sentence above the rows saying what is being decided and on what terms. */
  lead: string;
  onAmountChange: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
  /**
   * The student says which row takes the money still unassigned. Only on `build`, because
   * only there is there money looking for a job rather than a bill looking for a payer.
   */
  onAssignRemainder: (category: CategoryId, amount: ReturnType<typeof dollars>) => void;
  onCommit: (acknowledgedResidual?: ReturnType<typeof dollars>) => void;
  onApplyReference?: ((category?: CategoryId) => void) | undefined;
  onScaffold?: () => void;
  onShowAndContinue?: () => void;
  /** What moved since the student last saved, so a returning board reads as a response. */
  change?: { headline: string; items: readonly string[] } | undefined;
  commitLabel: string;
}

export function PlanBoard({
  input, variant, baseline, reference, attempts, notes, lead,
  onAmountChange, onAssignRemainder, onCommit, onApplyReference, onScaffold, onShowAndContinue, change, commitLabel,
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
    // The row is named in the label, not only in the spoken one. Three buttons carrying the
    // same verb and the same amount are three buttons a student has to tell apart by where
    // they happen to sit on the page.
    return take > 0
      ? {
          label: `Take ${formatDollars(take)} from ${CHOICE_LABELS[category]}`,
          spoken: `Take ${formatDollars(take)} out of ${CHOICE_LABELS[category]}`,
          onPress: () => onAmountChange(category, dollars(value - take)),
        }
      : undefined;
  };

  /**
   * The other end of the same idea, and the one statement this world records about savings:
   * money with no job yet, and the student naming the row it belongs to.
   *
   * It stays its own question rather than a button tucked into a row, because what it
   * records is a decision and a decision deserves to be asked. Everything the steppers can
   * reach it can reach, so it is a shortcut through the ordinary way a plan gets closed
   * rather than a different way of closing one — but it is a shortcut taken on purpose.
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
    // A row that cannot hold the whole remainder says so. Three cards, two offering the
    // whole leftover and one offering the course's own price, read as one of them being
    // wrong until the capped one explains itself.
    return give > 0
      ? { amount: give, capped: give < balance, onPress: () => onAssignRemainder(category, dollars(give)) }
      : undefined;
  };

  const closers = triage || balance <= 0
    ? []
    : CHOICE_ORDER.map((category) => ({ category, offer: putRestInto(category) })).filter((entry) => entry.offer);
  const restored = reference && onApplyReference && CHOICE_ORDER.some((category) => reference[category] !== input.amounts[category]);

  return (
    <section className="plan-board" data-variant={variant} aria-label="Avery’s plan">
      {change && (
        <div className="change-banner" data-variant={variant}>
          <b>{change.headline}</b>
          <ul>{change.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      <p className="plan-board__lead">{lead}</p>

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

      {/* The one-tap close, offered only while there is money with no job. It used to hold
          its place on the board once the plan balanced, printing a heading over nothing so
          a screen that promised six steps could still show six. The rail says the plan
          balances; a second empty section saying it too was a box for the sake of a box.
          It is also deliberately quiet now: three tall cards restating the three row names in
          title type made this read as a second, competing way to do the same job. The rows
          above are the way a plan gets built; this is one press that closes it, and the press
          it records is the only statement this world makes about savings. */}
      {closers.length > 0 && (
        <section className="closer" aria-labelledby="plan-rest">
          <h3 id="plan-rest">{`Or send the last ${formatDollars(balance)} to one row`}</h3>
          <div className="closer-choice">
            {closers.map(({ category, offer }) => (
              <button
                key={category}
                type="button"
                data-category={category}
                aria-label={`Put ${formatDollars(offer!.amount)} into ${CHOICE_LABELS[category]}`}
                onClick={offer!.onPress}
              >
                {CHOICE_LABELS[category]}
                {offer!.capped && <small>{formatDollars(offer!.amount)} — all it can hold</small>}
              </button>
            ))}
          </div>
          <p>{steps.rest.shortcut}</p>
        </section>
      )}

      {attempts >= 2 && balance !== 0 && (
        <section className="plan-help" aria-label="Step-by-step help">
          {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this works</Button> : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number beside “{balance < 0 ? BALANCE_COPY.short : BALANCE_COPY.unassigned}” in Avery’s money.</li><li>Use − and + on any of the three rows above.</li><li>Keep going until that number reaches <b>$0</b>.</li></ol></div>}
          {attempts >= 3 && (
            <div className="plan-help__supply">
              <Button type="button" variant="quiet" onClick={onShowAndContinue}>Fill in one plan that balances</Button>
              <small>This spreads the money evenly. It is one plan that works, not the right answer.</small>
            </div>
          )}
        </section>
      )}

      {/* The rail carries the live figure, so this bar says what it means and offers the
          action. It used to print the same number a second time in a bigger font, which is
          how one screen came to carry three bands of alarm colour saying one thing. */}
      <footer className={`plan-commit plan-commit--${balance === 0 ? "balanced" : balance < 0 ? "over" : "unassigned"}`}>
        {/* The figure is its own element so the narrow layout can drop it: down there the
            money strip is pinned to the bottom of the screen holding the same number, and
            two copies of it an inch apart is the screen saying one thing twice. */}
        <p className="plan-commit__read" aria-live="polite">
          {balance === 0
            ? BALANCE_COPY.balanced
            : <><span className="plan-commit__figure money">{formatDollars(Math.abs(balance))}</span>{" "}
              {balance < 0 ? (triage ? BALANCE_COPY.short : BALANCE_COPY.over) : BALANCE_COPY.unassigned}</>}
        </p>
        <div className="plan-commit__actions">
          {/* Only offered once the board differs from what the student saved; otherwise
              the control does nothing and reads as a step they have missed. */}
          {restored && <Button variant="quiet" type="button" onClick={() => onApplyReference?.()}>Put my saved numbers back</Button>}
          {residual > 0 && attempts > 0 && <Button type="button" variant="quiet" onClick={() => onCommit(dollars(residual))}>Save it, {formatDollars(residual)} still missing</Button>}
          <Button type="button" onClick={() => onCommit()}>{balance === 0 ? commitLabel : "Check this plan"}</Button>
        </div>
      </footer>
    </section>
  );
}
