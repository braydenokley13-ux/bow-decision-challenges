import { useRef, useState } from "react";
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
  /**
   * Whether this is the opening plan — the one board that will not close until the student
   * has said something about every row.
   *
   * It is the only moment in the run where the student is dividing money nobody has claimed
   * yet, and it is the run's biggest decision. It used to be answerable in a single press: one
   * card offering the whole unassigned balance filled a row, disposed of every remaining
   * dollar and turned the commit button into *Save this version*, so the whole of the split
   * cost one click and two of the three rows were never read. Three rows are three decisions,
   * and a figure is not the only way to make one — a row can be given nothing on purpose, and
   * saying so is what tells this product's evidence apart from a default nobody touched.
   *
   * `spokenFor` is which rows the student has acted on. Rows outside it have had nothing said
   * about them, and the board answers a press of the commit button by saying so.
   */
  opening?: boolean;
  spokenFor?: readonly CategoryId[];
  onApplyReference?: ((category?: CategoryId) => void) | undefined;
  onScaffold?: () => void;
  onShowAndContinue?: () => void;
  /** What moved since the student last saved, so a returning board reads as a response. */
  change?: { headline: string; items: readonly string[] } | undefined;
  commitLabel: string;
}

export function PlanBoard({
  input, variant, baseline, reference, attempts, notes, lead,
  onAmountChange, onAssignRemainder, onCommit, opening = false, spokenFor = [],
  onApplyReference, onScaffold, onShowAndContinue, change, commitLabel,
}: PlanBoardProps) {
  const [showHelp, setShowHelp] = useState(false);
  // What the last press of the commit button did, when what it did was nothing. Pressing a
  // primary button and getting no response at all is the thing this is here to stop.
  const [refusal, setRefusal] = useState<"unbalanced" | "unspoken" | null>(null);
  const closerRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
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
   * The other end of the same idea: money with no job yet, and one press that sends all of
   * it to a row the student picks.
   *
   * It is a shortcut through the steppers and not a second way to build a plan. Everything
   * it reaches they reach, and it exists because a child who finds typing numbers hard
   * should not be locked out of finishing a plan — the ladder this product is proudest of
   * is built on exactly that principle.
   *
   * **It only ever offers the whole of what is unassigned.** It used to offer whatever a row
   * could hold, which on the capped course row meant a card reading "all it can hold" beside
   * the course's own price: BOW naming the exact figure for the savings line, on the screen
   * whose whole job is to find out whether the student can set that figure themselves. The
   * steppers still reach it; the difference is that reaching it is now something the student
   * did.
   */
  const putRestInto = (category: CategoryId) => {
    const value = input.amounts[category];
    const headroom = category === "goal" ? Math.max(0, courseCap - value) : balance;
    // A row that cannot take all of it is not offered. Three cards, two of them disposing of
    // the leftovers and one of them quietly doing something else, are three cards a student
    // has no reason to read as different.
    return balance > 0 && headroom >= balance
      ? { amount: balance, onPress: () => onAssignRemainder(category, dollars(balance)) }
      : undefined;
  };

  /**
   * The answer that is not an amount.
   *
   * A row can be given nothing on purpose — a season with no course money is a real plan, and
   * the world says as much everywhere else. Until this existed there was no way to say it: a
   * row left at its untouched `$0` looked exactly like a row somebody had decided about, and
   * the teacher's page told three students' teachers that they had *"set a figure"* on a line
   * none of them had opened.
   *
   * Offered only once the money is all placed, and only on a row still holding nothing that
   * nobody has spoken for — before that the row's one press is the shortcut above, and three
   * cards saying "nothing" on an empty board would be noise on the busiest screen in the run.
   */
  const nothingFor = (category: CategoryId) =>
    opening && balance === 0 && input.amounts[category] === 0 && !spokenFor.includes(category)
      ? {
          label: steps.rest.nothing,
          spoken: `${CHOICE_LABELS[category]} — nothing this season`,
          onPress: () => { setRefusal(null); onAmountChange(category, dollars(0)); },
        }
      : undefined;

  // Only while there is money looking for a job. Over, and the only honest next move is
  // taking some back out of a row; balanced, and there is nothing left to send anywhere.
  const closers = triage || balance <= 0
    ? []
    : CHOICE_ORDER.map((category) => ({ category, offer: putRestInto(category) })).filter((entry) => entry.offer);
  // Rows nobody has said anything about. The opening plan does not close over one of these:
  // three rows are three decisions, and a row at its untouched $0 is not one of them.
  const unspoken = opening ? CHOICE_ORDER.filter((category) => !spokenFor.includes(category)) : [];
  const restored = reference && onApplyReference && CHOICE_ORDER.some((category) => reference[category] !== input.amounts[category]);
  // How many rows this board actually lets the student move. A reserved course seat is
  // already paid and its row renders as "Paid", so on the Week 5 triage board there are two.
  const movable = CHOICE_ORDER.length - (input.depositTaken ? 1 : 0);

  /**
   * Committing, and saying so when it does not happen.
   *
   * Both refusals below are the board's, not the reducer's: an unbalanced plan is recorded as
   * a save the student asked for and did not get, and an opening plan with a row nobody has
   * answered for is not sent at all, because answering for each row is part of closing this
   * board rather than a thing to chase afterwards. Either way the student is told which of
   * the two it was, and where to look.
   */
  const commit = (acknowledgedResidual?: ReturnType<typeof dollars>) => {
    if (acknowledgedResidual === undefined && balance === 0 && unspoken.length > 0) {
      setRefusal("unspoken");
      rowsRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      return;
    }
    setRefusal(acknowledgedResidual === undefined && balance !== 0 ? "unbalanced" : null);
    onCommit(acknowledgedResidual);
  };

  /** The rows still waiting, named as the student reads them. */
  const nameList = (categories: readonly CategoryId[]) => {
    const labels = categories.map((category) => CHOICE_LABELS[category]);
    if (labels.length <= 1) return labels[0] ?? "";
    return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  };

  return (
    <section className="plan-board" data-variant={variant} aria-label="Avery’s plan">
      {change && (
        <div className="change-banner" data-variant={variant}>
          <b>{change.headline}</b>
          <ul>{change.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      <p className="plan-board__lead">{lead}</p>

      <div className="choice-stack" ref={rowsRef}>
        {CHOICE_ORDER.map((category) => {
          // One action slot per row, and the two never overlap: while money is unassigned the
          // row's press sends it here; once it is all placed, a row nobody has answered for
          // offers the answer that is not an amount.
          const action = triage ? takeFrom(category) : nothingFor(category);
          return (
            <AllocationControl
              key={category}
              id={category}
              label={CHOICE_LABELS[category]}
              description={notes[category]}
              value={input.amounts[category]}
              step={mode.increment}
              max={category === "goal" ? courseCap : max}
              originalValue={baseline?.[category]}
              {...(action ? { action } : {})}
              {...(category === "goal" && input.depositTaken
                ? { lockedNote: `Seat reserved for ${formatDollars(SCENARIO_NUMBERS.course.depositPrice)}. That money is already committed.` }
                : {})}
              onChange={(amount) => onAmountChange(category, amount)}
            />
          );
        })}
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

      {/* Only where an earlier plan exists to compare against, and only once something
          has actually moved — a $0 here would read as a real measurement.

          The announcement is a separate, permanent region rather than an attribute on the
          box. A live region that is inserted into the page with its text already inside it
          announces nothing at all: the region has to be there, empty, before the words
          arrive. This one always is, and the box it describes is hidden from assistive
          technology so the sentence is not read twice. */}
      <p className="visually-hidden" aria-live="polite">
        {freed !== undefined && freed > 0 ? `Cut from your earlier plan: ${formatDollars(freed)}.` : ""}
      </p>
      {freed !== undefined && freed > 0 && (
        <p className="exposure-summary" aria-hidden="true">
          <span>Cut from your earlier plan</span><strong className="money">{formatDollars(freed)}</strong>
        </p>
      )}

      {/* The one-press way to place what is still unassigned, and nothing more than that.
          It used to be the board's closing question as well — three cards under the heading
          "One of these takes what is left over. Which one?", shown at every balance including
          zero, where every card was captioned "Nothing is left over. Every dollar already has
          a job." That question is gone from here twice over: it contradicted its own screen at
          $0, and pressing one of these cards used to be the whole of the run's biggest
          decision, because a single press filled a row, disposed of every remaining dollar and
          turned the commit button straight into the save. The rows carry the decisions now;
          this is a shortcut through the typing, and it only appears while there is something
          to be short about. */}
      {closers.length > 0 && (
        <section ref={closerRef} className="closer" aria-labelledby="plan-rest">
          {/* `<h2>`, not `<h3>`: the stage headline above it is the `<h1>` and there is no
              level in between, so this skipped one — axe `heading-order`, and the substance is
              1.3.1, because a screen-reader user navigating by heading is told there is a
              section here that they have missed. */}
          {/* The section only exists while there is money looking for a job, so the heading
              is always the one sentence. It used to fall back to "One of these takes what is
              left over. Which one?" at a balance of zero — a question the same screen
              answered "Nothing is left over" three times underneath. */}
          <h2 id="plan-rest">{`Send the last ${formatDollars(balance)} to one row`}</h2>
          <div className="closer-choice">
            {closers.map(({ category, offer }) => (
              // Whatever the card says under its own name, said once and used twice: on the
              // card and inside the spoken name. A button whose accessible name does not
              // contain the words printed on it is a button a student using voice control can
              // see and cannot ask for.
              <button
                key={category}
                type="button"
                data-category={category}
                aria-label={`${CHOICE_LABELS[category]} — put ${formatDollars(offer!.amount)} in`}
                onClick={offer!.onPress}
              >
                {CHOICE_LABELS[category]}
              </button>
            ))}
          </div>
          <p>{steps.rest.shortcut}</p>
        </section>
      )}

      {/* The most patient moment in the product, and it used to be written for a board it was
          not always on. "Use − and + on any of the three rows above" was shown on the Week 5
          triage board, where a reserved course seat leaves *two* rows that move and one that
          reads "Paid" — so the hint that caps a student's credit told them to use a control
          that is not there. It counts what is on the screen it is on. */}
      {attempts >= 2 && balance !== 0 && (
        <section className="plan-help" aria-label="Step-by-step help">
          {!showHelp ? <Button type="button" variant="quiet" onClick={() => { setShowHelp(true); onScaffold?.(); }}>Show me how this works</Button> : <div role="note"><strong>One step at a time:</strong><ol><li>Read the number beside “{balance < 0 ? BALANCE_COPY.short : BALANCE_COPY.unassigned}” in Avery’s money.</li><li>Use − and + on {movable === 1 ? "the row that can still move" : `any of the ${movable} rows that can still move`}.</li><li>Keep going until that number reaches <b>$0</b>.</li></ol></div>}
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
        {/* A press that did nothing used to say nothing: the board re-rendered identically,
            the live region held the same words it already held, and a student who had just
            pressed the only primary button on the screen had no way to tell whether the
            application was broken or they were. Every refusal answers now, and it answers in
            an alert, because it is a response to something the student just did. */}
        {refusal !== null && (
          <p className="plan-commit__refusal" role="alert">
            {refusal === "unspoken"
              ? <><b>Not saved yet.</b> Nothing has been said about {nameList(unspoken)}. {steps.rest.unspoken}</>
              : balance > 0
                // Named against the board that is actually on screen. It used to say "one of
                // the three rows, or send it to one of them below" on a board with two movable
                // rows and nothing below it.
                ? <><b>Not saved yet.</b> <span className="money">{formatDollars(balance)}</span> {BALANCE_COPY.unassigned} Put it on {movable === 1 ? "the row that can still move" : `one of the ${movable} rows that can still move`}{closers.length > 0 ? ", or send it to one of them below" : ""}.</>
                : <><b>Not saved yet.</b> The plan holds <span className="money">{formatDollars(Math.abs(balance))}</span> {BALANCE_COPY.over} Take some back off a row.</>}
          </p>
        )}
        <div className="plan-commit__actions">
          {/* Only offered once the board differs from what the student saved; otherwise
              the control does nothing and reads as a step they have missed. */}
          {restored && <Button variant="quiet" type="button" onClick={() => onApplyReference?.()}>Put my saved numbers back</Button>}
          {residual > 0 && attempts > 0 && <Button type="button" variant="quiet" onClick={() => commit(dollars(residual))}>Save it, {formatDollars(residual)} still missing</Button>}
          {/* Not `aria-disabled`, deliberately. A student who presses this while no row has
              been named has done something reasonable, and the answer to it is a sentence
              saying what is missing and the cards brought into view — not a control that
              refuses to respond, which is the failure this whole bar was reported for. */}
          <Button type="button" onClick={() => commit()}>
            {balance !== 0 ? "Check this plan" : unspoken.length > 0 ? "Say what each row gets" : commitLabel}
          </Button>
        </div>
      </footer>
    </section>
  );
}
