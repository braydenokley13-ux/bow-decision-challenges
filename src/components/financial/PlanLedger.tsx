import { useId, useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import type { SnapshotInputs } from "../../domain/finance/types";
import { SCENARIO_NUMBERS } from "../../domain/scenario/numbers";
import { availableFor, balanceOf, conditionalIn, lockedFor } from "../../domain/finance/formulas";
import { formatDollars } from "../../domain/core/money";
import { STUDENT_COPY } from "../../content/studentCopy";
import { CHOICE_LABELS, CHOICE_ORDER } from "./choices";

const { ledger } = STUDENT_COPY.plan;

/**
 * Which of the three facts about the money the student has established for themselves.
 *
 * Only the first plan withholds anything: a rail that opened with the reliable floor already
 * printed at the top would be answering the first question of the challenge before asking
 * it. Every later moment knows all three, because the student worked them out.
 */
export interface LedgerKnown {
  certain: boolean;
  bonuses: boolean;
  essentials: boolean;
}

const ALL_KNOWN: LedgerKnown = { certain: true, bonuses: true, essentials: true };

/**
 * Avery's money, beside every decision rather than inside one of them.
 *
 * This began as a two-tower stacked chart, became a receipt at the head of the planning
 * board, and is now the one thing on the planning screens that never leaves. A student
 * mid-plan can answer all six questions off it: what Avery can count on, what might not
 * arrive, what is already promised, what is left to decide, where they have put it so far,
 * and how much still has no job.
 *
 * Four rules hold it, and all four came from watching people read it:
 *
 * **Every line is named.** The committed costs were once summed into one row reading
 * "Already promised". A student who had just worked out the weekly basics saw a bigger
 * number than the one they had entered, could not see where the difference came from, and
 * concluded their own arithmetic was wrong. Rent has a line. The seat has a line. Getting
 * to the clinics has a line. Nothing here is a total of things it does not show.
 *
 * **Every subtraction the screen performs is visible.** The plan's own spending is here too,
 * split by row, so the shortfall at the foot of the plan is the last line of a sum the
 * student can follow rather than a penalty that arrives from nowhere.
 *
 * **A line the student has not established yet says so.** It is drawn in its place, greyed,
 * marked "not worked out yet" — so the shape of the plan is visible from the first screen
 * and none of it is given away.
 *
 * **One figure is set large.** What is left to decide is the fact the whole plan is built
 * against. Everything else, including the live remainder, is a row — the first draft set
 * both at hero size and, before a dollar had been placed, printed the same number twice in
 * the same weight two inches apart.
 */
export function PlanLedger({ input, setupTitle, onLockedMoveAttempt, known = ALL_KNOWN, placing = true }: {
  input: SnapshotInputs;
  setupTitle: string;
  onLockedMoveAttempt: (id: string) => void;
  known?: LedgerKnown;
  /** Whether the student is placing money yet. Before that the rail has nothing to report. */
  placing?: boolean;
}) {
  // Where the rail cannot stand beside the decision it becomes a strip along the bottom of
  // it, and the receipt behind that strip is opened rather than scrolled to.
  const [open, setOpen] = useState(false);
  // Which promised cost the student last pressed. It dispatches evidence either way; this
  // is so the press also answers on screen instead of looking like a dead link.
  const [pressed, setPressed] = useState<string | null>(null);
  const bodyId = useId();
  const n = SCENARIO_NUMBERS;
  const available = availableFor(input, n);
  const locked = lockedFor(input, n);
  const conditional = conditionalIn(input, n);
  const certain = Math.max(0, available - conditional);
  const toDecide = available - locked;
  const withoutBonus = certain - locked;
  const balance = balanceOf(input, n);
  const complete = known.certain && known.bonuses && known.essentials;
  // "Neither" was printed whether one bonus was being counted on or two. By Week 5 only one
  // is left, and a sentence that says "neither" about a list of one is a sentence a student
  // stops to re-read.
  const countedBonuses = (input.includeCompletion ? 1 : 0) + (input.includeOutcome ? 1 : 0);

  // The same components `lockedFor` adds up, each one named. If it ever stops matching,
  // the rail is lying and a student doing the arithmetic will be the one who finds out.
  // The qualifier is a second line rather than more of the label: three lines of wrapped
  // underlined text is not a receipt line, it is a paragraph with a price beside it.
  const lines = [
    { key: "certain", tone: "certain", sign: "+", label: ledger.arrives, note: null, amount: certain, locked: false, known: known.certain },
    ...(known.bonuses && conditional > 0
      ? [{ key: "conditional", tone: "conditional", sign: "+", label: ledger.maybe, note: null, amount: conditional, locked: false, known: true }]
      : []),
    // A student who was asked about two bonuses and said no to both has made a real
    // decision, and a rail that simply omits it leaves them wondering where the question went.
    ...(known.bonuses && conditional === 0 && input.mode === "working"
      ? [{ key: "no-bonus", tone: "conditional", sign: "+", label: ledger.noBonus, note: null, amount: 0, locked: false, known: true }]
      : []),
    ...(!known.bonuses ? [{ key: "conditional", tone: "conditional", sign: "+", label: ledger.maybePending, note: null, amount: 0, locked: false, known: false }] : []),
    { key: "setup", tone: "locked", sign: "−", label: "Where Avery lives", note: `${setupTitle} · ${n.weeks} weeks`, amount: Number(n.setupCosts[input.setupId]), locked: true, known: true },
    { key: "essentials", tone: "locked", sign: "−", label: "Food, phone and laundry", note: `${n.weeks} weeks`, amount: Number(n.essentialsTotal), locked: true, known: known.essentials },
    ...(input.depositTaken ? [{ key: "deposit", tone: "locked", sign: "−", label: "Course seat", note: "reserved and paid", amount: Number(n.course.depositPrice), locked: true, known: true }] : []),
    ...(input.includeOptionalWork ? [{ key: "clinic-cost", tone: "locked", sign: "−", label: "Getting to the Saturday clinics", note: null, amount: Number(n.optionalWorkCost), locked: true, known: true }] : []),
    ...(input.week5Applied
      ? [{ key: "week5-cost", tone: "event", sign: "−", label: ledger.week5, note: null, amount: Number(n.requiredWeek5Cost) + Number(n.setupEventCosts[input.setupId]), locked: true, known: true }]
      : []),
  ];

  const placedRows = CHOICE_ORDER
    .map((category: CategoryId) => ({ category, amount: input.amounts[category] }))
    .filter((row) => row.amount > 0);
  const state = balance === 0 ? "settled" : balance < 0 ? "over" : "unplaced";
  const liveLabel = balance === 0 ? ledger.settled : balance < 0 ? ledger.overspent : ledger.unplaced;
  const showLive = placing && complete;

  return (
    <section className="ledger" aria-labelledby="ledger-title" data-state={state} data-open={open}>
      <div className="ledger__head">
        <p className="stamp" id="ledger-title">{ledger.title}</p>
        {/* What the strip says when the receipt behind it is closed. Never the only place
            a figure appears — the plan's own commit bar carries the live one too. */}
        <p className="ledger__glance">
          {complete
            ? <><span>{showLive ? liveLabel : ledger.left}</span><strong className="money">{formatDollars(showLive ? Math.abs(balance) : Math.max(0, toDecide))}</strong></>
            : <span>{ledger.leftPending}</span>}
        </p>
        <button type="button" className="ledger__toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          {open ? ledger.close : ledger.open}
        </button>
      </div>

      <div className="ledger__body" id={bodyId}>
        <ul className="ledger__lines">
          {lines.map((line) => (
            <li key={line.key} data-tone={line.tone} data-known={line.known}>
              <span className="ledger__sign" aria-hidden="true">{line.sign}</span>
              {/* A promised cost is a thing a student will try to move, so it answers when
                  they press it rather than sitting there inert. */}
              {line.locked && line.known ? (
                <button
                  type="button"
                  className="ledger__label ledger__label--locked"
                  aria-label={`${line.label}${line.note ? `, ${line.note}` : ""}. ${formatDollars(line.amount)}. Already promised — this cannot move.`}
                  onClick={() => { setPressed(pressed === line.key ? null : line.key); onLockedMoveAttempt(line.key); }}
                >
                  {line.label}
                </button>
              ) : (
                <span className="ledger__label">{line.label}</span>
              )}
              {line.known
                ? <strong className="money">{line.sign === "−" ? "−" : ""}{formatDollars(line.amount)}</strong>
                : <em className="ledger__waiting">{ledger.pending}</em>}
              {line.note && !(pressed === line.key) && <small className="ledger__note">{line.note}</small>}
              {pressed === line.key && <small className="ledger__note ledger__note--locked" role="status">Already promised. This one cannot move.</small>}
            </li>
          ))}
        </ul>

        <p className="ledger__left" data-known={complete}>
          <span>{ledger.left}</span>
          {complete
            ? <strong className="money">{formatDollars(Math.max(0, toDecide))}</strong>
            /* A dash, not a third copy of "not worked out yet" — the two lines it is waiting
               on already say so, directly above it. */
            : <em className="ledger__waiting" aria-label={ledger.leftPending}>—</em>}
        </p>

        {complete && conditional > 0 && (
          <p className="ledger__warning">
            {formatDollars(conditional)} of this might not arrive. If {countedBonuses > 1 ? "neither bonus comes" : "it does not"}, Avery has <strong className="money">{formatDollars(Math.max(0, withoutBonus))}</strong> to decide.
          </p>
        )}

        {/* What the student has protected, named row by row. The single "Your plan spends"
            total this replaced was the one line on the rail that could not be checked against
            anything: a student could see the money leaving and not which promise took it. */}
        {showLive && (
          <div className="ledger__placed">
            <p className="field-label">{ledger.placed}</p>
            {placedRows.length > 0 ? (
              <ul>
                {placedRows.map((row) => (
                  <li key={row.category} data-category={row.category}>
                    <span>{CHOICE_LABELS[row.category]}</span>
                    <strong className="money">{formatDollars(row.amount)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ledger__none">{ledger.placedNone}</p>
            )}
            {/* Withheld while it would say nothing new. Before a dollar is placed the money
                still looking for a job *is* the money left to decide, and printing it a
                second inch below the figure it equals reads as two different facts. */}
            {(placedRows.length > 0 || balance !== 0) && (
              <p className="ledger__live" data-state={state} aria-live="polite">
                <span>{liveLabel}</span>
                {balance !== 0 && <strong className="money">{formatDollars(Math.abs(balance))}</strong>}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
