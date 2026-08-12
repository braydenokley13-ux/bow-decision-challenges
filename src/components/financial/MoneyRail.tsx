import type { SnapshotInputs } from "../../domain/finance/types";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { availableFor, assigned, exposureFor, lockedFor, balanceOf } from "../../domain/finance/formulas";
import { formatDollars } from "../../domain/core/money";

interface Band {
  key: string;
  label: string;
  amount: number;
  tone: string;
}

/**
 * Two stacked bars share one scale so their lengths can be compared directly:
 * what Avery has on top, what it is already doing underneath. Every band carries its
 * own amount, and the state readout never depends on colour alone.
 */
export function MoneyRail({ input }: { input: SnapshotInputs }) {
  const available = availableFor(input, SCENARIO_NUMBERS);
  const locked = lockedFor(input, SCENARIO_NUMBERS);
  // The Week 5 bills get their own band rather than disappearing into "must pay", so the
  // reason the plan stopped balancing is visible in the plan's own picture of itself.
  const week5Bills = input.week5Applied ? SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[input.setupId] : 0;
  const committed = locked - week5Bills;
  const assignedTotal = assigned(input.amounts);
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const conditional = input.mode === "working"
    ? exposureFor(input, SCENARIO_NUMBERS)
    : (input.mode === "week5-first-response" || input.mode === "final") && input.includeCompletion
      ? SCENARIO_NUMBERS.completionIncome
      : 0;
  const dependable = Math.max(0, available - conditional);
  const shortfall = Math.max(0, -Number(balance));
  const spare = Math.max(0, Number(balance));

  // One scale for both rows, wide enough to show an overspend running past the money.
  const scale = Math.max(available, locked + assignedTotal, 1);
  const width = (amount: number) => `${Math.max(0, (amount / scale) * 100)}%`;

  const supply: Band[] = [
    { key: "dependable", label: "Safe cash", amount: dependable, tone: "reliable" },
    ...(conditional > 0 ? [{ key: "conditional", label: "Maybe money", amount: conditional, tone: "conditional" }] : []),
  ];
  const demand: Band[] = [
    { key: "locked", label: "Must pay", amount: committed, tone: "locked" },
    ...(week5Bills > 0 ? [{ key: "week5", label: "New Week 5 bills", amount: week5Bills, tone: "event" }] : []),
    ...(assignedTotal > 0 ? [{ key: "assigned", label: "Your choices", amount: assignedTotal, tone: "assigned" }] : []),
  ];

  const state = balance === 0
    ? { tone: "balanced", headline: "Every dollar has a job", amount: 0 }
    : spare > 0
      ? { tone: "unassigned", headline: "Still needs a job", amount: spare }
      : { tone: "over", headline: "More than Avery has", amount: shortfall };

  return (
    <section className="rail" aria-label="Money Rail" data-state={state.tone}>
      <div className="rail__head">
        <div className="rail__total">
          <span>Cash in this plan</span>
          <strong className="money">{formatDollars(available)}</strong>
        </div>
        <p className="rail__state" aria-live="polite">
          <b>{state.headline}</b>
          {state.amount > 0 && <strong className="money">{formatDollars(state.amount)}</strong>}
        </p>
        <span className="rail__week">{input.week5Applied ? "Week 5" : "Week 1"}</span>
      </div>

      <div className="rail__plot" aria-hidden="true">
        <div className="rail__row">
          {supply.map((band) => (
            <span key={band.key} className="rail__band" data-tone={band.tone} style={{ width: width(band.amount) }}>
              <i>{band.label}</i>
              <b className="money">{formatDollars(band.amount)}</b>
            </span>
          ))}
        </div>
        <div className="rail__row">
          {demand.map((band) => (
            <span key={band.key} className="rail__band" data-tone={band.tone} style={{ width: width(band.amount) }}>
              <i>{band.label}</i>
              <b className="money">{formatDollars(band.amount)}</b>
            </span>
          ))}
          {spare > 0 && <span className="rail__band rail__band--open" style={{ width: width(spare) }}><i>Unassigned</i><b className="money">{formatDollars(spare)}</b></span>}
          {shortfall > 0 && <span className="rail__band rail__band--over" style={{ width: width(shortfall) }}><i>Over</i><b className="money">{formatDollars(shortfall)}</b></span>}
        </div>
        {conditional > 0 && <span className="rail__marker" style={{ left: width(dependable) }} />}
      </div>

      {/* A table sizes to its content and ignores the utility's 1px width, so the
          clipping wrapper is what actually keeps it out of the layout. */}
      <div className="visually-hidden">
        <table>
          <caption>Money Rail summary</caption>
          <thead><tr><th scope="col">Part of the plan</th><th scope="col">Amount</th><th scope="col">What it means</th></tr></thead>
          <tbody>
            <tr><th scope="row">Safe cash</th><td>{formatDollars(dependable)}</td><td>Avery will definitely have this money.</td></tr>
            {conditional > 0 && <tr><th scope="row">Maybe money</th><td>{formatDollars(conditional)}</td><td>Only arrives if the bonus rule is met.</td></tr>}
            <tr><th scope="row">Must pay</th><td>{formatDollars(committed)}</td><td>Already promised. These costs cannot move.</td></tr>
            {week5Bills > 0 && <tr><th scope="row">New Week 5 bills</th><td>{formatDollars(week5Bills)}</td><td>Required after Week 5. These costs cannot move either.</td></tr>}
            <tr><th scope="row">Your choices</th><td>{formatDollars(assignedTotal)}</td><td>Amounts you can change.</td></tr>
            <tr><th scope="row">{state.headline}</th><td>{formatDollars(state.amount)}</td><td>{balance === 0 ? "The plan balances." : balance > 0 ? "Give this money a job to balance the plan." : "Reduce your choices by this much to balance the plan."}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
