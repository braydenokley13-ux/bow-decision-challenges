import type { SnapshotInputs } from "../../domain/finance/types";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { availableFor, assigned, exposureFor, lockedFor, balanceOf } from "../../domain/finance/formulas";
import { formatDollars } from "../../domain/core/money";

export function MoneyRail({ input }: { input: SnapshotInputs }) {
  const available = availableFor(input, SCENARIO_NUMBERS);
  const locked = lockedFor(input, SCENARIO_NUMBERS);
  const assignedTotal = assigned(input.amounts);
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const exposure = input.mode === "working" ? exposureFor(input, SCENARIO_NUMBERS) : input.mode === "final" && input.includeCompletion ? SCENARIO_NUMBERS.completionIncome : 0;
  const scale = Math.max(available, locked + assignedTotal, 1);
  const reliable = SCENARIO_NUMBERS.reliableFloor + (input.includeOptionalWork && input.mode !== "working" && input.mode !== "fallback" ? SCENARIO_NUMBERS.optionalWorkIncome : 0);
  const dependablePercent = Math.min(100, (reliable / scale) * 100);
  const conditionalPercent = Math.max(0, (exposure / scale) * 100);
  const lockedPercent = Math.min(100, (locked / scale) * 100);
  const assignedPercent = Math.max(0, (assignedTotal / scale) * 100);

  return (
    <section className="rail" aria-label="Money Rail">
      <div className="rail__heading">
        <div><span>Money in this version</span><strong className="money">{formatDollars(available)}</strong></div>
        <span className="rail__week">{input.week5Applied ? "Week 5" : "Week 1"}</span>
      </div>
      <div className="rail__plot" aria-hidden="true">
        <div className="rail__row rail__row--supply">
          <span className="rail__segment rail__segment--reliable" style={{ width: `${dependablePercent}%` }}>Counted money</span>
          {conditionalPercent > 0 && <span className="rail__segment rail__segment--conditional" style={{ width: `${conditionalPercent}%` }}><b>CONDITIONAL</b> {formatDollars(exposure)}</span>}
        </div>
        <div className="rail__row rail__row--demand">
          <span className="rail__segment rail__segment--locked" style={{ width: `${lockedPercent}%` }}>Committed {formatDollars(locked)}</span>
          <span className="rail__segment rail__segment--assigned" style={{ width: `${assignedPercent}%` }}>Open amounts {formatDollars(assignedTotal)}</span>
          {balance < 0 && <span className="rail__overrun" style={{ width: `${Math.min(25, Math.abs(balance / scale) * 100)}%` }} />}
        </div>
        {exposure > 0 && <span className="rail__exposure-line" style={{ left: `${dependablePercent}%` }} />}
      </div>
      <div className="rail__legend">
        <span>Counted without remaining bonus risk <b className="money">{formatDollars(reliable)}</b></span>
        <span>Committed <b className="money">{formatDollars(locked)}</b></span>
        <span>Open amounts <b className="money">{formatDollars(assignedTotal)}</b></span>
        <span>{balance === 0 ? "Plan balances" : balance > 0 ? `${formatDollars(balance)} unassigned` : `${formatDollars(Math.abs(balance))} over available money`}</span>
      </div>
      <table className="visually-hidden">
        <caption>Money Rail financial summary</caption>
        <thead><tr><th scope="col">Area</th><th scope="col">Amount</th><th scope="col">State</th></tr></thead>
        <tbody>
          <tr><th scope="row">Money not tied to a remaining bonus</th><td>{formatDollars(reliable)}</td><td>Counted in this version</td></tr>
          {exposure > 0 && <tr><th scope="row">Conditional money</th><td>{formatDollars(exposure)}</td><td>Arrives only if the condition is met</td></tr>}
          <tr><th scope="row">Committed costs</th><td>{formatDollars(locked)}</td><td>These costs cannot move</td></tr>
          <tr><th scope="row">Open amounts</th><td>{formatDollars(assignedTotal)}</td><td>These amounts can change</td></tr>
          <tr><th scope="row">Difference</th><td>{formatDollars(Math.abs(balance))}</td><td>{balance === 0 ? "Plan balances" : balance > 0 ? "Money is unassigned" : "Plan exceeds available money"}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
