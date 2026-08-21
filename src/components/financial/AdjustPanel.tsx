import { useState, type CSSProperties, type ReactNode } from "react";
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

/**
 * The column the commit bar is allowed to travel in.
 *
 * `.plan-commit` is `position: sticky; bottom: 0`, and a sticky box can only travel inside
 * its containing block. While the bar was the last child of `<section className="adjust">`
 * that containing block was the panel card — and on the one screen where the panel is not
 * the first thing in the column, the card starts most of the way down the window and the bar
 * has nowhere to rise to.
 *
 * Measured on the safety check at 1024×600, the size of the older school Chromebook: the
 * deck and the two struck-through bonus cards stand 344px tall above the panel, so
 * `.adjust` began at `top: 532`, the bar clamped to the top of its own card at `536–612`,
 * and *Check this plan* sat **12px below the fold on arrival** — a student looking at a
 * screen with no next step on it. It is not a near miss that a shorter sentence would fix:
 * the bar cannot rise past its card whatever is above it, and at 1366×768 the same screen
 * clears the fold by nothing at all (`692–768`).
 *
 * So the panel and its bar are two children of one column now, and the bar's containing
 * block is the whole column — including whatever the screen puts above the card. This is the
 * same shape `.plan-board` already uses in `app.css` for the same reason, and its comment
 * makes the same point: "a column of flex items ... gives the last one the whole column to
 * travel in."
 *
 * It is written here rather than in a stylesheet because `src/design/*.css` is owned
 * elsewhere in this change; `gauntlet/v6/HANDOFF_CSS.md` carries the rule to lift it into
 * `scenes.css` as `.adjust-scene`, at which point this object and the `style` below go.
 */
const AS_A_COLUMN: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--s-5)" };

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
  /**
   * Whatever the screen says before the panel: the deck, and the cards naming what moved.
   *
   * It is a slot rather than a sibling because the commit bar's containing block is this
   * component's own column, and anything the screen puts above the panel outside that column
   * is height the bar cannot travel over. See `AS_A_COLUMN`.
   */
  scene?: ReactNode;
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
  input, baseline, changes, eyebrow, headline, lead, notes, commitLabel, attempts, scene,
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
    <div className="adjust-scene" style={AS_A_COLUMN}>
      {scene}
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
          <WeekMeter
            load={load}
            parts={loadParts}
            rate={SCENARIO_NUMBERS.load.blockBuybackCost}
            headroom={Math.max(0, balance)}
            atStake={input.includeCompletion ? `the ${formatDollars(SCENARIO_NUMBERS.completionIncome)} attendance bonus` : null}
          />
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
      </section>

      {/* Outside the card, and that is the whole of the fix described at `AS_A_COLUMN`: as a
          child of this column rather than of the panel, the bar can rise to the fold from
          wherever the card happens to start. */}
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
    </div>
  );
}
