import type { SnapshotInputs } from "../../domain/finance/types";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { assigned, availableFor, conditionalIn, lockedFor } from "../../domain/finance/formulas";
import { formatDollars } from "../../domain/core/money";
import { STUDENT_COPY } from "../../content/studentCopy";

const { ledger } = STUDENT_COPY.plan;

/**
 * What there is, read top to bottom like a receipt.
 *
 * This replaced a two-tower stacked chart. The chart was accurate and nobody could read it:
 * it asked a twelve-year-old to compare two vertical axes, decode a hatched band, find a
 * dashed line labelled "certain without the bonus", and hold all of that while operating
 * three steppers beside it. Every one of those was a relationship the student had to derive
 * from a picture.
 *
 * Two rules hold this component now, and both came from watching people read it:
 *
 * **Every line is named.** The committed costs used to be summed into one row reading
 * "Already promised". A student who had just worked out the weekly basics saw a bigger
 * number than the one they had entered, could not see where the difference came from, and
 * concluded their own arithmetic was wrong. Rent has a line. The seat has a line. Getting
 * to the clinics has a line. Nothing on this receipt is a total of things it does not show.
 *
 * **Every subtraction the screen performs is visible.** The plan's own spending is on the
 * receipt too, so the shortfall at the foot of the board is the last line of a sum the
 * student can follow rather than a penalty that arrives from nowhere.
 */
export function MoneyLedger({ input, setupTitle, onLockedMoveAttempt }: {
  input: SnapshotInputs;
  setupTitle: string;
  onLockedMoveAttempt: (id: string) => void;
}) {
  const n = SCENARIO_NUMBERS;
  const available = availableFor(input, n);
  const locked = lockedFor(input, n);
  const conditional = conditionalIn(input, n);
  // "Neither" was printed whether one bonus was being counted on or two. By Week 5 only one
  // is left, and a sentence that says "neither" about a list of one is a sentence a student
  // stops to re-read.
  const countedBonuses = (input.includeCompletion ? 1 : 0) + (input.includeOutcome ? 1 : 0);
  const certain = Math.max(0, available - conditional);
  const toDecide = available - locked;
  const withoutBonus = certain - locked;
  const spend = assigned(input.amounts);

  // The same components `lockedFor` adds up, each one named. If it ever stops matching,
  // the receipt is lying and a student doing the arithmetic will be the one who finds out.
  const lines = [
    { key: "certain", tone: "certain", sign: "+", label: ledger.arrives, amount: certain, locked: false },
    ...(conditional > 0 ? [{ key: "conditional", tone: "conditional", sign: "+", label: ledger.maybe, amount: conditional, locked: false }] : []),
    { key: "setup", tone: "locked", sign: "−", label: `Where Avery lives · ${setupTitle}`, amount: Number(n.setupCosts[input.setupId]), locked: true },
    { key: "essentials", tone: "locked", sign: "−", label: `Food, phone and laundry · ${n.weeks} weeks`, amount: Number(n.essentialsTotal), locked: true },
    ...(input.depositTaken ? [{ key: "deposit", tone: "locked", sign: "−", label: "Course seat, reserved and paid", amount: Number(n.course.depositPrice), locked: true }] : []),
    ...(input.includeOptionalWork ? [{ key: "clinic-cost", tone: "locked", sign: "−", label: "Getting to the Saturday clinics", amount: Number(n.optionalWorkCost), locked: true }] : []),
    ...(input.week5Applied
      ? [{ key: "week5-cost", tone: "event", sign: "−", label: ledger.week5, amount: Number(n.requiredWeek5Cost) + Number(n.setupEventCosts[input.setupId]), locked: true }]
      : []),
  ];

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <p className="stamp" id="ledger-title">{ledger.title}</p>
      <ul className="ledger__lines">
        {lines.map((line) => (
          <li key={line.key} data-tone={line.tone}>
            <span className="ledger__sign" aria-hidden="true">{line.sign}</span>
            {/* A promised cost is a thing a student will try to move, so it answers when
                they press it rather than sitting there inert. */}
            {line.locked ? (
              <button
                type="button"
                className="ledger__label ledger__label--locked"
                aria-label={`${line.label}. ${formatDollars(line.amount)}. Already promised — this cannot move.`}
                onClick={() => onLockedMoveAttempt(line.key)}
              >
                {line.label}
              </button>
            ) : (
              <span className="ledger__label">{line.label}</span>
            )}
            {line.tone === "conditional" && <span className="ledger__tag">might not arrive</span>}
            {line.locked && <span className="ledger__tag ledger__tag--locked">cannot move</span>}
            <strong className="money">{line.sign === "−" ? "−" : ""}{formatDollars(line.amount)}</strong>
          </li>
        ))}
      </ul>
      <hr className="perf-rule" />
      <p className="ledger__left">
        <span>{ledger.left}</span>
        <strong className="money">{formatDollars(Math.max(0, toDecide))}</strong>
      </p>
      {conditional > 0 && (
        <p className="ledger__warning">
          If {countedBonuses > 1 ? "neither bonus" : "that bonus never"} arrives, this drops to <strong className="money">{formatDollars(Math.max(0, withoutBonus))}</strong>.
        </p>
      )}
      {spend > 0 && (
        <p className="ledger__spend">
          <span>{ledger.spend}</span>
          <strong className="money">−{formatDollars(spend)}</strong>
        </p>
      )}
    </section>
  );
}
