import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { CalculationInput } from "../components/primitives/CalculationInput";
import { MoneyAmount } from "../components/primitives/MoneyAmount";
import { PlanBoard } from "../components/financial/PlanBoard";
import { dollars, formatDollars, type Dollars } from "../domain/core/money";
import type { CalcId, CategoryId } from "../domain/core/ids";
import type { PlanMode } from "../domain/finance/types";
import { availableFor, lockedFor, week5Change } from "../domain/finance/formulas";
import { PLAN_MODES } from "../domain/finance/modes";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { amountsFor, meaningfulAttempts, snapshotForMode } from "../domain/machine/selectors";
import { STUDENT_COPY } from "../content/studentCopy";

function submitCalculation(dispatch: ReturnType<typeof useChallenge>["dispatch"], calcId: CalcId, raw: string, value: Dollars | null, correct: boolean) {
  dispatch({ type: "CALCULATION_SUBMITTED", calcId, raw, value, correct });
}

function calculationSupport(dispatch: ReturnType<typeof useChallenge>["dispatch"], calcId: CalcId) {
  return {
    onScaffold: () => dispatch({ type: "SCAFFOLD_OPENED", interactionId: calcId }),
    onShowAndContinue: () => dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: calcId }),
  };
}

function JoinStage() {
  const { dispatch } = useChallenge();
  const [classCode, setClassCode] = useState("BOW301");
  const [seatCode, setSeatCode] = useState("14");
  const valid = /^[A-Z0-9]{4,8}$/i.test(classCode) && /^\d{1,2}$/.test(seatCode);
  return (
    <div className="entry-page" data-world="basketball">
      <div className="entry-page__panel">
        <p className="eyebrow">{STUDENT_COPY.join.eyebrow}</p>
        <h1>{STUDENT_COPY.join.title}</h1>
        <p>{STUDENT_COPY.join.body}</p>
        <div className="entry-page__codes">
          <label>Class code<input value={classCode} onChange={(event) => setClassCode(event.target.value.toUpperCase())} maxLength={8} /></label>
          <label>Seat<input value={seatCode} onChange={(event) => setSeatCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} /></label>
        </div>
        <Button type="button" aria-disabled={!valid} onClick={() => valid && dispatch({ type: "SESSION_STARTED", sessionId: crypto.randomUUID(), classCode, seatCode })}>Enter the challenge</Button>
        <p className="privacy-note">{STUDENT_COPY.join.privacy}</p>
      </div>
      <aside className="entry-page__stage" aria-hidden="true">
        <span>{BASKETBALL_SCENARIO.offer.team}</span>
        <strong>Avery<br />Reyes</strong>
        <b>Guard · 18 · eight weeks with the team</b>
      </aside>
    </div>
  );
}

/** Beat 1. What just happened to Avery, and what Avery wants out of it. */
function OfferStage() {
  const { dispatch } = useChallenge();
  const { offer, numbers } = BASKETBALL_SCENARIO;
  return (
    <StageShell stage="the-offer" kicker={offer.kicker} title={offer.headline}>
      <div className="offer-layout">
        <section className="offer-story">
          <p className="offer-story__lede">{offer.body}</p>
          <dl className="offer-story__facts">
            {offer.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>
        </section>
        <aside className="offer-want">
          <p className="eyebrow">What Avery wants out of it</p>
          <strong className="money">{formatDollars(numbers.goalCap)}</strong>
          <b>{offer.want}</b>
          <p>{offer.wantDetail}</p>
        </aside>
      </div>
      <div className="stage-action">
        <p><strong>Avery plays. You handle the money.</strong> Every call about what the money does for the next eight weeks is yours.</p>
        <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "role-contract" })}>See what it pays</Button>
      </div>
    </StageShell>
  );
}

/** Beat 2. The contract itself, with the difference between the two halves left visible. */
function DealStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="role-contract" kicker="The terms" title="What the eight weeks pay.">
      <p className="stage-deck">Two of these arrive on schedule. Two depend on something happening first. All four are in the same contract.</p>
      <div className="deal-sheet">
        <section className="deal-column" data-tone="safe">
          <p className="field-label">Avery will have this</p>
          {[
            ["Already saved", "$500", "Sitting in the account now."],
            ["Base pay after taxes", "$4,500", "Paid every week, win or lose."],
          ].map(([label, amount, condition]) => <div key={label}><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
        </section>
        <section className="deal-column" data-tone="maybe">
          <p className="field-label">Only if the rule is met</p>
          {[
            ["Perfect Attendance Bonus", "$800", "Every practice, every game. Miss one and it is gone."],
            ["Making the Cut Bonus", "$1,000", "Paid only if the Flight qualifies for the showcase."],
          ].map(([label, amount, condition]) => <div key={label}><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
        </section>
      </div>
      <div className="stage-action">
        <p>Nothing is spent yet. The first bill is the biggest one: eight weeks of somewhere to live.</p>
        <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "setup-comparison" })}>Find Avery a place</Button>
      </div>
    </StageShell>
  );
}

function SetupStage() {
  const { state, dispatch } = useChallenge();
  const middleCorrect = state.calculations["setup-middle-total"]?.correct === true;
  const lowCorrect = state.calculations["setup-lowest-total"]?.correct === true;
  const ready = middleCorrect && lowCorrect && state.setupId !== null;
  return (
    <StageShell stage="setup-comparison" kicker="Choice 1 · Where Avery stays" title="Cheaper rent costs something else.">
      <p className="stage-deck">Work out the true 8-week price of each place, then pick one. No option scores better than another — you are choosing what Avery pays <em>and</em> what Avery travels.</p>
      <div className="setup-grid">
        {BASKETBALL_SCENARIO.setups.map((setup, index) => (
          <article key={setup.id} className={`setup-card ${state.setupId === setup.id ? "is-selected" : ""}`}>
            <div className="setup-card__head"><span>Option {String.fromCharCode(65 + index)}</span><b>{setup.title}</b></div>
            <p className="setup-card__commute"><i aria-hidden="true" />{setup.commute}</p>
            <p className="setup-card__tradeoff">{setup.tradeoff}</p>
            {index === 0 ? (
              <div className="given-total"><span>Full 8-week price · already worked out</span><MoneyAmount value={setup.total} /></div>
            ) : (
              <CalculationInput
                calcId={index === 1 ? "setup-middle-total" : "setup-lowest-total"}
                label="Full eight-week cost"
                prompt={setup.terms}
                expected={setup.total}
                priorAttempts={state.calculations[index === 1 ? "setup-middle-total" : "setup-lowest-total"]?.attempts}
                onSubmit={(raw, value, correct) => submitCalculation(dispatch, index === 1 ? "setup-middle-total" : "setup-lowest-total", raw, value, correct)}
                scaffold={index === 1 ? "Step 1: $150 × 8 weeks = $1,200. Step 2: $1,200 + $200 for travel = your full price." : "Multiply $125 by 8 weeks. That answer is the full price."}
                {...calculationSupport(dispatch, index === 1 ? "setup-middle-total" : "setup-lowest-total")}
                compact
              />
            )}
            <Button variant={state.setupId === setup.id ? "primary" : "secondary"} type="button" onClick={() => dispatch({ type: "SETUP_SELECTED", setupId: setup.id })}>{state.setupId === setup.id ? "Selected" : "Choose this setup"}</Button>
          </article>
        ))}
      </div>
      <div className="stage-action">
        <p><strong>Your choice is not graded.</strong> Making the plan work with the place you picked is.</p>
        <Button aria-disabled={!ready} onClick={() => ready && dispatch({ type: "GO_TO_STAGE", stage: "working-plan" })}>{ready ? "Build the plan" : middleCorrect && lowCorrect ? "Pick a place to continue" : "Finish both prices to continue"}</Button>
      </div>
    </StageShell>
  );
}

function PlanBoardForMode({ mode }: { mode: PlanMode }) {
  const { state, dispatch } = useChallenge();
  const input = snapshotForMode(state, mode);
  if (!input || !state.setupId) return null;
  const setupTitle = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === state.setupId)?.title ?? "Selected setup";
  const baseline = mode === "fallback"
    ? amountsFor(state, "working")
    : mode === "week5-first-response"
      ? amountsFor(state, state.saved.fallback ? "fallback" : "working")
      : mode === "remaining-risk"
        ? amountsFor(state, "final")
        : undefined;
  const reference = mode === "week5-first-response" || mode === "remaining-risk" ? baseline : undefined;
  const applyReference = (category?: CategoryId) => {
    if (!reference) return;
    for (const key of category ? [category] : (["goal", "reserve", "flexibleCash"] as const)) dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category: key, amount: reference[key] });
  };
  /**
   * Supplies one balanced plan without expressing a preference between the three
   * categories: the money is split as evenly as the step size allows, and only the
   * course goal's own cap redirects anything. The student receives no credit for this
   * board, so the plan must not model a "correct" set of priorities.
   */
  const supplyOneBalancedPlan = () => {
    const step = PLAN_MODES[mode].increment;
    const spendable = Math.max(0, availableFor(input, SCENARIO_NUMBERS) - lockedFor(input, SCENARIO_NUMBERS));
    const caps: Record<CategoryId, number> = { goal: SCENARIO_NUMBERS.goalCap, reserve: Infinity, flexibleCash: Infinity };
    const amounts: Record<CategoryId, number> = { goal: 0, reserve: 0, flexibleCash: 0 };

    // Deal the money out one step at a time, always to whichever category currently
    // holds the least, so no category is favoured by the order of the loop.
    for (let left = spendable; left >= step; left -= step) {
      const target = (["goal", "reserve", "flexibleCash"] as const)
        .filter((category) => amounts[category] + step <= caps[category])
        .sort((a, b) => amounts[a] - amounts[b])[0];
      if (!target) break;
      amounts[target] += step;
    }
    const remainder = spendable - (amounts.goal + amounts.reserve + amounts.flexibleCash);
    if (remainder > 0) amounts.flexibleCash += remainder;

    dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: mode });
    for (const category of ["goal", "reserve", "flexibleCash"] as const) {
      dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amounts[category]) });
    }
    dispatch({ type: "PLAN_SAVE_REQUESTED", mode });
  };
  return (
      <PlanBoard
        input={input}
        setupTitle={setupTitle}
        baseline={baseline}
        reference={reference}
        attempts={meaningfulAttempts(state, mode)}
        onAmountChange={(category, amount) => dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount })}
        onLockedMoveAttempt={(lockedCardId) => dispatch({ type: "LOCKED_MOVE_ATTEMPTED", mode, lockedCardId })}
        onCommit={(acknowledgedResidual) => dispatch({ type: "PLAN_SAVE_REQUESTED", mode, ...(acknowledgedResidual !== undefined ? { acknowledgedResidual } : {}) })}
        onScaffold={() => dispatch({ type: "SCAFFOLD_OPENED", interactionId: mode })}
        onShowAndContinue={supplyOneBalancedPlan}
        {...(reference ? { onApplyReference: applyReference } : {})}
      />
  );
}

function PlanStage({ mode, title, kicker }: { mode: PlanMode; title: string; kicker: string }) {
  const { state } = useChallenge();
  return <StageShell stage={state.stage} kicker={kicker} title={title}><PlanBoardForMode mode={mode} /></StageShell>;
}

function WorkingStage() {
  const { state, dispatch } = useChallenge();
  const essentialsReady = state.calculations["essentials-total"]?.correct === true;
  const floorReady = state.calculations["reliable-floor"]?.correct === true;
  const input = snapshotForMode(state, "working");
  if (!input || !state.setupId) return null;
  return (
    <StageShell stage="working-plan" kicker={STUDENT_COPY.working.kicker} title={STUDENT_COPY.working.title}>
      <p className="stage-deck">{STUDENT_COPY.working.deck}</p>
      <div className="working-setup">
        <CalculationInput calcId="reliable-floor" label={STUDENT_COPY.working.safeMoney.title} prompt={STUDENT_COPY.working.safeMoney.prompt} terms={STUDENT_COPY.working.safeMoney.body} expected={5000} priorAttempts={state.calculations["reliable-floor"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "reliable-floor", raw, value, correct)} scaffold="Add the two safe amounts: $500 + $4,500. Do not add either bonus yet." {...calculationSupport(dispatch, "reliable-floor")} />
        <CalculationInput calcId="essentials-total" label={STUDENT_COPY.working.mustPay.title} prompt={STUDENT_COPY.working.mustPay.prompt} terms={STUDENT_COPY.working.mustPay.body} expected={1600} priorAttempts={state.calculations["essentials-total"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "essentials-total", raw, value, correct)} scaffold="Multiply $200 by 8 weeks. Think: $200 + $200 + $200 + $200 + $200 + $200 + $200 + $200." {...calculationSupport(dispatch, "essentials-total")} />
        <section className="income-switches" aria-labelledby="maybe-money-heading">
          <div><p className="field-label">{STUDENT_COPY.working.maybeMoney.title}</p><h2 id="maybe-money-heading">{STUDENT_COPY.working.maybeMoney.body}</h2></div>
          <button type="button" aria-pressed={state.income.includeCompletion} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: !state.income.includeCompletion })}>
            <span><b>{STUDENT_COPY.working.maybeMoney.attendance.title}</b><small>{STUDENT_COPY.working.maybeMoney.attendance.body}</small><em>{state.income.includeCompletion ? "Counting it" : "Not counting it"}</em></span><MoneyAmount value={800} />
          </button>
          <button type="button" aria-pressed={state.income.includeOutcome} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: !state.income.includeOutcome })}>
            <span><b>{STUDENT_COPY.working.maybeMoney.showcase.title}</b><small>{STUDENT_COPY.working.maybeMoney.showcase.body}</small><em>{state.income.includeOutcome ? "Counting it" : "Not counting it"}</em></span><MoneyAmount value={1000} />
          </button>
        </section>
      </div>
      {essentialsReady && floorReady ? <PlanBoardForMode mode="working" /> : <p className="board-gate">{STUDENT_COPY.working.locked}</p>}
    </StageShell>
  );
}

function IncomeCheckStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="income-check" kicker="Backup check" title="Your plan already survives a lost bonus.">
      <section className="state-message state-message--resolved"><span aria-hidden="true">✓</span><div><h2>You counted no maybe money.</h2><p>Nothing in this plan disappears if a bonus falls through, so there is no backup version to build.</p><p>Counting a bonus or leaving it out are both reasonable. Only whether the plan works is scored.</p></div></section>
      <div className="stage-action"><p>Avery reports Monday. The plan you just saved is what the next eight weeks run on.</p><Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "week5-transition" })}>Start the season</Button></div>
    </StageShell>
  );
}

/** The three amounts the student chose, as they stand in the plan they last committed. */
function PlanEcho({ mode, label, note }: { mode: PlanMode; label: string; note?: string }) {
  const { state } = useChallenge();
  const amounts = amountsFor(state, mode);
  return (
    <section className="plan-echo">
      <p className="field-label">{label}</p>
      <dl>
        <div><dt>Sports-media course</dt><dd className="money">{formatDollars(amounts.goal)}</dd></div>
        <div><dt>Backup money</dt><dd className="money">{formatDollars(amounts.reserve)}</dd></div>
        <div><dt>Anything else</dt><dd className="money">{formatDollars(amounts.flexibleCash)}</dd></div>
      </dl>
      {note && <p className="plan-echo__note">{note}</p>}
    </section>
  );
}

function Week5TransitionStage() {
  const { state, dispatch } = useChallenge();
  const savedMode: PlanMode = state.saved.fallback ? "fallback" : "working";
  return (
    <StageShell stage="week5-transition" kicker="Weeks 1 to 4" title="The season starts.">
      <div className="season-layout">
        <ol className="season-log">
          {BASKETBALL_SCENARIO.season.map((entry) => (
            <li key={entry.week}><b>{entry.week}</b><p>{entry.note}</p></li>
          ))}
          <li data-state="next"><b>Week 5</b><p>Not played yet.</p></li>
        </ol>
        <PlanEcho mode={savedMode} label="What Avery has been living on" note="Four weeks in, the plan you built is holding. Rent is paid. The bonuses are still open." />
      </div>
      <div className="stage-action">
        <p>Nothing you saved changes from here. Whatever Week 5 brings, it lands on the plan you already built.</p>
        <Button onClick={() => dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" })}>Play Week 5</Button>
      </div>
    </StageShell>
  );
}

function Week5EventStage() {
  const { state, dispatch } = useChallenge();
  if (!state.setupId) return null;
  const expected = week5Change({ includeOutcome: state.income.includeOutcome, setupId: state.setupId }, SCENARIO_NUMBERS);
  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === state.setupId)!;
  // Only changes that actually moved money appear. A setup with no extra travel cost
  // produces no card, so nothing here is worth $0.
  const changes = [
    ...(state.income.includeOutcome
      ? [{ id: "lost-outcome", kind: "lost" as const, label: "Making the Cut Bonus", detail: "You counted this. It is gone.", amount: 1000 }]
      : []),
    { id: "required-cost", kind: "bill" as const, label: "Brace and off-site rehab", detail: "Required. Not optional.", amount: 700 },
    ...(setup.eventCost > 0
      ? [{ id: "setup-cost", kind: "bill" as const, label: `Travel to rehab · ${setup.title}`, detail: setup.eventCostLabel, amount: setup.eventCost }]
      : []),
  ];
  const selectedTotal = changes
    .filter((change) => state.selectedGapTiles.includes(change.id))
    .reduce((sum, change) => sum + change.amount, 0);
  return (
    <StageShell stage="week5-event" kicker="Week 5" title={BASKETBALL_SCENARIO.disruption.title}>
      <section className="disruption-card">
        <span className="disruption-card__week" aria-hidden="true">W5</span>
        <div>
          <p className="disruption-card__source">{BASKETBALL_SCENARIO.disruption.source}</p>
          <p className="disruption-card__lede">{BASKETBALL_SCENARIO.disruption.body}</p>
        </div>
      </section>
      <PlanEcho mode={state.saved.fallback ? "fallback" : "working"} label="The plan Avery walked into this week with" note="It was built for a season that still had a showcase in it." />
      <section className="gap-builder">
        <div className="gap-builder__intro">
          <p className="field-label">What hit your plan</p>
          <h2>Pull out the pieces that changed Avery’s money.</h2>
          <p>Some of these are in your plan and some are not. Select the ones that hit <strong>the plan you built</strong>, then add them up.</p>
          <CalculationInput calcId="week5-change" label="Total change to Avery’s money" prompt="Money that disappeared + new bills that must be paid" terms="Count only what affects the plan you built." expected={expected} priorAttempts={state.calculations["week5-change"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "week5-change", raw, value, correct)} onCorrect={() => dispatch({ type: "GO_TO_STAGE", stage: "first-response" })} scaffold="Add the dollar amounts on the cards you selected. Money lost and new bills both count the same way here." {...calculationSupport(dispatch, "week5-change")} />
        </div>
        <div className="gap-tiles">
          {changes.map((change) => {
            const selected = state.selectedGapTiles.includes(change.id);
            return (
              <button key={change.id} type="button" data-kind={change.kind} aria-pressed={selected}
                onClick={() => dispatch({ type: "GAP_TILE_TOGGLED", tileId: change.id, selected: !selected })}>
                <span className="gap-tiles__kind">{change.kind === "lost" ? "Money gone" : "New bill"}</span>
                <span className="gap-tiles__label"><b>{change.label}</b><small>{change.detail}</small></span>
                <strong className="money">{formatDollars(change.amount)}</strong>
              </button>
            );
          })}
          <p className="gap-tiles__running" aria-live="polite">
            <span>Selected</span><strong className="money">{formatDollars(selectedTotal)}</strong>
          </p>
        </div>
      </section>
    </StageShell>
  );
}

function FinalRepairStage() {
  const { state, dispatch } = useChallenge();
  const { opportunity } = BASKETBALL_SCENARIO;
  const completionDecided = state.log.some((event) => event.type === "COMPLETION_INCOME_DECIDED");
  const ready = state.income.includeOptionalWork !== null && completionDecided;
  return (
    <StageShell stage="opportunity-final-repair" kicker="Week 5 · Two calls" title="Two calls, then land the plan.">
      <div className="decision-row">
        <section className="opportunity-card">
          <p className="eyebrow">Message · {opportunity.from}</p>
          <h2>{opportunity.title}</h2>
          <p>{opportunity.body}</p>
          <dl className="tradeoff-pair">
            <div><dt>Avery gains</dt><dd className="money">$500</dd></div>
            <div><dt>Avery gives up</dt><dd>{opportunity.timeCost}</dd></div>
          </dl>
          <div className="binary-choice">
            <button type="button" aria-pressed={state.income.includeOptionalWork === true} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: true })}>Take the clinics</button>
            <button type="button" aria-pressed={state.income.includeOptionalWork === false} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: false })}>Keep the Saturdays</button>
          </div>
          <p className="decision-note">Neither answer is worth points. More money can still cost something.</p>
        </section>
        <section className="opportunity-card">
          <p className="eyebrow">Your call · The $800 bonus</p>
          <h2>Is it still in the plan?</h2>
          <p>Avery has made every practice and every game so far. Three weeks left, and the brace does not change the rule: miss one and the bonus is gone.</p>
          <dl className="tradeoff-pair">
            <div><dt>Count it</dt><dd>More to work with, and one more thing that has to go right</dd></div>
            <div><dt>Leave it out</dt><dd>Less to work with, nothing left to lose</dd></div>
          </dl>
          <div className="binary-choice">
            <button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>Count the $800</button>
            <button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>Plan without it</button>
          </div>
          <p className="decision-note">Counting it means testing the plan once more without it.</p>
        </section>
      </div>
      {ready ? <PlanBoardForMode mode="final" /> : <p className="board-gate">Make both calls above to open the final board. Neither call is graded — only whether the money works afterward.</p>}
    </StageShell>
  );
}

function DefenseStage() {
  const { state, dispatch } = useChallenge();
  const [selected, setSelected] = useState<string[]>(state.defense.tileIds);
  const [text, setText] = useState(state.defense.text);
  const final = amountsFor(state, "final");
  const finalInput = snapshotForMode(state, "final");
  // Every tile is derived from the student's own saved plan, and any tile worth $0
  // is dropped rather than offered as misleading evidence.
  const tiles = [
    { id: "final-funds", label: "Cash in your final plan", value: finalInput ? availableFor(finalInput, SCENARIO_NUMBERS) : 0 },
    { id: "week5-cost", label: "New Week 5 bills", value: state.setupId ? SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[state.setupId] : SCENARIO_NUMBERS.requiredWeek5Cost },
    { id: "course", label: "Saved for the course", value: final.goal },
    { id: "reserve", label: "Backup money kept", value: final.reserve },
    { id: "flex", label: "Left for anything else", value: final.flexibleCash },
    ...(state.income.includeCompletionFinal ? [{ id: "completion", label: "$800 bonus you are still counting on", value: SCENARIO_NUMBERS.completionIncome as number }] : []),
    ...(state.income.includeOptionalWork ? [{ id: "clinic", label: "Earned from the weekend clinics", value: SCENARIO_NUMBERS.optionalWorkIncome as number }] : []),
  ].filter((tile) => tile.value > 0);
  const canSubmit = selected.length >= 2 && selected.length <= 3 && text.trim().length >= 40;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  return (
    <StageShell stage="defense" kicker="Final step" title="Make the case for your plan.">
      <div className="defense-layout">
        <section className="evidence-picker">
          <p className="field-label">1 · Your evidence</p>
          <h2>Pick 2 or 3 numbers.</h2>
          <p>These come straight from the plan you built. Choose the ones that back up what you are about to say.</p>
          {tiles.map((tile) => <button key={tile.id} type="button" aria-pressed={selected.includes(tile.id)} onClick={() => toggle(tile.id)}><span>{tile.label}</span><MoneyAmount value={tile.value} /></button>)}
        </section>
        <section className="defense-composer">
          <p className="field-label">2 · Your reasoning</p>
          <h2>Why does this plan hold up?</h2>
          <p>Say how it works after Week 5, what you protected, and what you gave up. Use your numbers.</p>
          <div className="sentence-starters">
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}My plan still works because `)}>My plan still works…</button>
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I protected `)}>I protected…</button>
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I gave up `)}>I gave up…</button>
          </div>
          <label htmlFor="defense-text">Two to four sentences</label>
          <textarea id="defense-text" value={text} onChange={(event) => setText(event.target.value)} rows={7} placeholder="My plan still works because…" />
          <p className="defense-progress" aria-live="polite">{selected.length < 2 ? `Pick ${2 - selected.length} more number${selected.length === 1 ? "" : "s"}. ` : "Numbers ready. "}{text.trim().length < 40 ? `${40 - text.trim().length} more character${40 - text.trim().length === 1 ? "" : "s"} to go.` : "Long enough to turn in."}</p>
          <Button aria-disabled={!canSubmit} onClick={() => canSubmit && dispatch({ type: "DEFENSE_SUBMITTED", tileIds: selected, text })}>Turn in my plan</Button>
        </section>
      </div>
    </StageShell>
  );
}

function SubmittedStage() {
  const { state, reset } = useChallenge();
  const navigate = useNavigate();
  const final = amountsFor(state, "final");
  const setupTitle = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === state.setupId)?.title;
  return (
    <StageShell stage="submitted" kicker="Week 8 · Turned in" title="Avery got through it.">
      <section className="submitted-card">
        <p className="submitted-card__lede">The showcase never happened, the brace was not optional, and the eight weeks still closed on a plan that works. Here is where Avery landed.</p>
        <dl className="submitted-card__record">
          <div><dt>Course fund</dt><dd><b className="money">{formatDollars(final.goal)}</b><span>of {formatDollars(SCENARIO_NUMBERS.goalCap)}</span></dd></div>
          <div><dt>Backup money</dt><dd><b className="money">{formatDollars(final.reserve)}</b><span>kept for a surprise</span></dd></div>
          <div><dt>Anything else</dt><dd><b className="money">{formatDollars(final.flexibleCash)}</b><span>Avery's to spend</span></dd></div>
        </dl>
        <ul className="submitted-card__ledger">
          {setupTitle && <li>Home for eight weeks: {setupTitle}.</li>}
          <li>{state.income.includeOptionalWork ? "Four Saturdays went to the clinics instead of rest." : "The Saturdays stayed Avery's."}</li>
          <li>{state.income.includeCompletionFinal ? "The plan still counts on the $800 attendance bonus, and you showed it works without it." : "Nothing in the plan depends on a bonus arriving."}</li>
        </ul>
        <p>Your explanation goes to a person, not a computer. Software can check whether the money works. It should not decide whether your thinking makes sense.</p>
        <div className="submitted-card__actions">
          <Button onClick={() => navigate("/educator/class/students/14")}>See what your teacher sees</Button>
          <Button variant="quiet" onClick={reset}>Start over</Button>
        </div>
      </section>
    </StageShell>
  );
}

export function StudentChallenge() {
  const { state } = useChallenge();
  return useMemo(() => {
    switch (state.stage) {
      case "entry": case "join": return <JoinStage />;
      // Restored only when a second world ships; the reducer routes past it today.
      case "choose-world": return <OfferStage />;
      case "the-offer": return <OfferStage />;
      case "role-contract": return <DealStage />;
      case "setup-comparison": return <SetupStage />;
      case "working-plan": return <WorkingStage />;
      case "fallback-version": return <PlanStage mode="fallback" kicker="Backup check" title="What if the bonus never shows up?" />;
      case "income-check": return <IncomeCheckStage />;
      case "week5-transition": return <Week5TransitionStage />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <PlanStage mode="week5-first-response" kicker="Week 5 · First response" title="Fix what you can with what Avery has." />;
      case "opportunity-final-repair": return <FinalRepairStage />;
      case "remaining-risk-preview": return <PlanStage mode="remaining-risk" kicker="Week 5 · Last check" title="Test the plan without the $800." />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
    }
  }, [state.stage]);
}
