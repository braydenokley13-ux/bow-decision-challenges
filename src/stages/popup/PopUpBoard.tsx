import { useState } from "react";
import { AllocationControl } from "../../components/financial/AllocationControl";
import { Button } from "../../components/primitives/Button";
import { dollars, formatDollars } from "../../domain/core/money";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { POP_UP_LINES, type PopUpLineId, type PopUpPlan } from "../../domain/scenario/worlds/food-truck/types";

const COPY = POP_UP_SCENARIO.screens;

export interface LockedLine {
  id: string;
  label: string;
  amount: number;
  /** Why this money cannot move. Stated, never implied by a grey colour. */
  reason: string;
}

interface PopUpBoardProps {
  variant: "opening" | "repair";
  /** What the three lines hold right now. */
  plan: PopUpPlan;
  /** The most any one line may hold, per line. */
  ceiling: Record<PopUpLineId, number>;
  /** What each line currently buys, in this world's own terms. Derived, never decorative. */
  notes: Record<PopUpLineId, string>;
  /** What the board is against: money to place, or a bill to clear. */
  target: { label: string; amount: number };
  /** Zero when the board is settled; positive when there is still work. */
  outstanding: number;
  /** Money taken off a line and left with no job. Repair only. */
  spare: number;
  /** What the lines held before this board opened, so a moved line says where it came from. */
  baseline?: PopUpPlan | undefined;
  locked?: readonly LockedLine[] | undefined;
  /** Saves the board has already refused. Two of them open the step-by-step help. */
  attempts: number;
  commitLabel: string;
  onLineChange: (line: PopUpLineId, amount: number) => void;
  onAssignRemainder?: ((line: PopUpLineId, amount: number) => void) | undefined;
  onCommit: (acknowledgedResidual?: number) => void;
  onLockedMoveAttempt?: ((lockedId: string) => void) | undefined;
  onScaffold: () => void;
  onShowAndContinue?: (() => void) | undefined;
}

/**
 * The two boards where money moves, and the promise both of them keep.
 *
 * A board never commits a plan that does not add up. Asking to save one is recorded and
 * refused, which is what makes "the plan balances" a fact about the student's arithmetic
 * rather than a fact about the screen. The repair is the one exception the world allows: a
 * student who genuinely cannot find the whole bill may save it *and say what is missing*,
 * because "I am short and I know it" is a real answer and pretending otherwise would make the
 * only honest response unavailable.
 *
 * The other half is the remainder declaration. Every amount here is reachable with the two
 * keys on a row, so naming the line that takes the rest is a shortcut through the same money —
 * what it adds is a record of which line the student *chose* to let the arithmetic decide,
 * which is the only difference between a planned figure and a leftover.
 */
export function PopUpBoard({
  variant, plan, ceiling, notes, target, outstanding, spare, baseline, locked, attempts,
  commitLabel, onLineChange, onAssignRemainder, onCommit, onLockedMoveAttempt, onScaffold, onShowAndContinue,
}: PopUpBoardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [reasonShown, setReasonShown] = useState<string | null>(null);
  const step = variant === "opening" ? N.planIncrement : N.repairIncrement;
  const opening = variant === "opening";
  const settled = outstanding === 0 && spare === 0;
  const closers = opening && outstanding > 0 && onAssignRemainder
    ? POP_UP_LINES.map((line) => ({ line, give: Math.min(outstanding, Math.max(0, ceiling[line] - plan[line])) })).filter((entry) => entry.give > 0)
    : [];

  return (
    <section className="popup-board" data-variant={variant} aria-label={target.label}>
      <div className="popup-board__lines">
        {POP_UP_LINES.map((line) => (
          <AllocationControl
            key={line}
            id={line}
            label={POP_UP_SCENARIO.lines[line].label}
            description={notes[line]}
            value={plan[line]}
            step={step}
            max={ceiling[line]}
            {...(baseline ? { originalValue: baseline[line] } : {})}
            onChange={(amount) => onLineChange(line, amount)}
          />
        ))}
        {/* Money that is already gone, drawn as rows that look like the ones above and do not
            behave like them. Pressing one is a real thing a student does — it says they went
            looking for money there — so it is recorded rather than swallowed. */}
        {locked?.map((row) => (
          <div key={row.id} className="popup-locked">
            <button
              type="button"
              onClick={() => { setReasonShown(row.id); onLockedMoveAttempt?.(row.id); }}
              aria-describedby={reasonShown === row.id ? `locked-${row.id}` : undefined}
            >
              <span className="popup-locked__mark" aria-hidden="true" />
              <span className="popup-locked__id">
                <b>{row.label}</b>
                <small>{COPY.repair.locked}</small>
              </span>
              <strong className="money">{formatDollars(row.amount)}</strong>
            </button>
            {reasonShown === row.id && <p id={`locked-${row.id}`} className="popup-locked__reason" aria-live="polite">{row.reason}</p>}
          </div>
        ))}
      </div>

      {closers.length > 0 && (
        <section className="popup-closer" aria-labelledby="popup-rest">
          <h3 id="popup-rest">{COPY.plan.closer.title}</h3>
          <p>{COPY.plan.closer.note}</p>
          <div className="popup-closer__choice">
            {closers.map(({ line, give }) => (
              <button
                key={line}
                type="button"
                data-line={line}
                aria-label={`${POP_UP_SCENARIO.lines[line].label} takes ${formatDollars(give)}`}
                onClick={() => onAssignRemainder?.(line, dollars(give))}
              >
                <span aria-hidden="true">→</span>
                <strong>{POP_UP_SCENARIO.lines[line].label}</strong>
                <span className="money">{formatDollars(give)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {attempts >= 2 && !settled && (
        <section className="popup-help" aria-label={COPY.plan.help.open}>
          {!showHelp
            ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold(); }}>{COPY.plan.help.open}</Button>
            : <p role="note">{COPY.plan.help.steps}</p>}
          {attempts >= 3 && onShowAndContinue && (
            <div className="popup-help__supply">
              <Button type="button" variant="quiet" onClick={onShowAndContinue}>{COPY.plan.help.supply}</Button>
              <small>{COPY.plan.help.supplyNote}</small>
            </div>
          )}
        </section>
      )}

      <footer className={`popup-commit popup-commit--${settled ? "settled" : spare > 0 ? "spare" : "open"}`}>
        <p className="popup-commit__read" aria-live="polite">
          {settled
            ? (opening ? COPY.plan.balanced : COPY.repair.settled)
            : spare > 0
              ? <><span className="money">{formatDollars(spare)}</span> {COPY.repair.spare}</>
              : <><span className="money">{formatDollars(Math.abs(outstanding))}</span> {opening
                ? (outstanding > 0 ? COPY.plan.unassigned : COPY.plan.over)
                : COPY.repair.stillLabel.toLowerCase()}</>}
        </p>
        <div className="popup-commit__actions">
          {/* The one place a shortfall may be committed, and only out loud. */}
          {!opening && outstanding > 0 && spare === 0 && attempts > 0 && (
            <Button type="button" variant="quiet" onClick={() => onCommit(outstanding)}>{COPY.repair.acknowledge}</Button>
          )}
          <Button type="button" onClick={() => onCommit()}>{settled ? commitLabel : COPY.plan.check}</Button>
        </div>
      </footer>
    </section>
  );
}
