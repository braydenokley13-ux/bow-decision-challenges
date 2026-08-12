import type { SnapshotInputs } from "../../domain/finance/types";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { availableFor, assigned, exposureFor, lockedFor, balanceOf } from "../../domain/finance/formulas";
import { formatDollars } from "../../domain/core/money";
import { CHOICE_LABELS, CHOICE_ORDER } from "./choices";

interface Segment {
  key: string;
  label: string;
  amount: number;
  tone: string;
}

/**
 * Two towers on one scale: what Avery has, and where it is going. Every dollar is a
 * height, so "the plan costs more than Avery has" is a picture before it is a number,
 * and money the plan only gets if a bonus lands sits in its own hatched band above the
 * line marked "certain". Nothing here is a new calculation — it draws state the plan
 * already holds.
 */
export function MoneySplit({ input, onLockedMoveAttempt }: { input: SnapshotInputs; onLockedMoveAttempt: (id: string) => void }) {
  const available = availableFor(input, SCENARIO_NUMBERS);
  const locked = lockedFor(input, SCENARIO_NUMBERS);
  const week5Bills = input.week5Applied ? SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[input.setupId] : 0;
  const committed = locked - week5Bills;
  const assignedTotal = assigned(input.amounts);
  const balance = balanceOf(input, SCENARIO_NUMBERS);
  const conditional = input.mode === "working"
    ? exposureFor(input, SCENARIO_NUMBERS)
    : (input.mode === "week5-first-response" || input.mode === "final") && input.includeCompletion
      ? SCENARIO_NUMBERS.completionIncome
      : 0;
  const certain = Math.max(0, available - conditional);
  const shortfall = Math.max(0, -Number(balance));
  const spare = Math.max(0, Number(balance));

  // One scale for both towers, tall enough that an overspend visibly clears the line.
  const scale = Math.max(available, locked + assignedTotal, 1);
  const height = (amount: number) => `${Math.max(0, (amount / scale) * 100)}%`;
  // A slice too short to hold its own words drops them rather than spilling into the
  // slice below: name first, then the amount, then nothing but the colour.
  const density = (amount: number) => (amount / scale < 0.05 ? "bare" : amount / scale < 0.11 ? "tight" : "full");

  const supply: Segment[] = [
    { key: "certain", label: "Certain", amount: certain, tone: "reliable" },
    ...(conditional > 0 ? [{ key: "conditional", label: "If a bonus lands", amount: conditional, tone: "conditional" }] : []),
  ];
  const going: Segment[] = [
    { key: "committed", label: "Must pay", amount: committed, tone: "locked" },
    ...(week5Bills > 0 ? [{ key: "week5-cost", label: "New Week 5 bills", amount: week5Bills, tone: "event" }] : []),
    ...CHOICE_ORDER.filter((category) => input.amounts[category] > 0)
      .map((category) => ({ key: category, label: CHOICE_LABELS[category], amount: input.amounts[category], tone: `choice-${category}` })),
  ];

  const state = balance === 0
    ? { tone: "balanced", headline: "Every dollar has a job", amount: 0 }
    : spare > 0
      ? { tone: "unassigned", headline: "Still needs a job", amount: spare }
      : { tone: "over", headline: "More than Avery has", amount: shortfall };

  return (
    <section className="split" aria-label="Avery’s money" data-state={state.tone}>
      <header className="split__head">
        <div className="split__total">
          <span>Avery has</span>
          <strong className="money">{formatDollars(available)}</strong>
        </div>
        <p className="split__legend">{conditional > 0 ? "The hatched band only arrives if a bonus rule is met." : "All of it is money Avery will definitely have."}</p>
      </header>

      <div className="split__caps" aria-hidden="true">
        <span className="split__cap">Has</span>
        <span className="split__cap">Goes to</span>
      </div>

      <div className="split__plot">
        <div className="split__tower" aria-hidden="true">
          <div className="split__stack">
            {supply.slice().reverse().map((segment) => (
              <span key={segment.key} className="split__seg" data-tone={segment.tone} data-density={density(segment.amount)} style={{ height: height(segment.amount) }}>
                <i>{segment.label}</i><b className="money">{formatDollars(segment.amount)}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="split__tower">
          <div className="split__stack">
            {spare > 0 && (
              <span className="split__seg split__seg--open" data-density={density(spare)} style={{ height: height(spare) }} aria-hidden="true">
                <i>Still to assign</i><b className="money">{formatDollars(spare)}</b>
              </span>
            )}
            {going.slice().reverse().map((segment) => (
              segment.tone === "locked" || segment.tone === "event" ? (
                <button
                  key={segment.key}
                  type="button"
                  className="split__seg"
                  data-tone={segment.tone}
                  data-density={density(segment.amount)}
                  style={{ height: height(segment.amount) }}
                  aria-disabled="true"
                  aria-label={`${segment.label}, ${formatDollars(segment.amount)}. Already promised — this cannot move.`}
                  onClick={() => onLockedMoveAttempt(segment.key)}
                >
                  <i>{segment.label}</i><b className="money">{formatDollars(segment.amount)}</b>
                </button>
              ) : (
                <span key={segment.key} className="split__seg" data-tone={segment.tone} data-density={density(segment.amount)} style={{ height: height(segment.amount) }} aria-hidden="true">
                  <i>{segment.label}</i><b className="money">{formatDollars(segment.amount)}</b>
                </span>
              )
            ))}
          </div>
        </div>

        {/* The line the plan has to stay under, and — when a bonus is being counted — the
            lower line the plan stays under if that bonus never arrives. */}
        <span className="split__line split__line--has" style={{ bottom: height(available) }} aria-hidden="true"><i>Avery has</i></span>
        {conditional > 0 && <span className="split__line split__line--certain" style={{ bottom: height(certain) }} aria-hidden="true"><i>Certain without the bonus</i></span>}
        {shortfall > 0 && <span className="split__over" style={{ bottom: height(available), height: height(shortfall) }} aria-hidden="true" />}
      </div>

      {/* A table sizes to its content and ignores the utility's 1px width, so the
          clipping wrapper is what actually keeps it out of the layout. */}
      <div className="visually-hidden">
        <table>
          <caption>Avery’s money in this plan</caption>
          <thead><tr><th scope="col">Part of the plan</th><th scope="col">Amount</th><th scope="col">What it means</th></tr></thead>
          <tbody>
            <tr><th scope="row">Certain</th><td>{formatDollars(certain)}</td><td>Avery will definitely have this money.</td></tr>
            {conditional > 0 && <tr><th scope="row">If a bonus lands</th><td>{formatDollars(conditional)}</td><td>Only arrives if the bonus rule is met.</td></tr>}
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
