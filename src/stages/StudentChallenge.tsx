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
        <span>Plan Under Pressure</span>
        <strong>08</strong>
        <b>weeks to the showcase</b>
      </aside>
    </div>
  );
}

function RoleStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="role-contract" kicker="Your player · Avery Reyes" title="Eight weeks. One plan. No do-overs.">
      <div className="role-layout">
        <section className="role-hero">
          <span className="role-hero__number">08</span>
          <p className="role-hero__lede">Avery, 18, guard. Eight weeks with the Harbor City Flight.</p>
          <h2>You handle the money.</h2>
          <p>Pick where Avery stays. Decide which cash to count on. Then hold the plan together when Week 5 changes it.</p>
          <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "setup-comparison" })}>Show me the money</Button>
        </section>
        <section className="contract-sheet">
          <header><p className="eyebrow">Avery’s 8-week money</p></header>
          <div className="income-list">
            <p className="income-list__group">Safe — Avery will have this</p>
            {[
              ["Already saved", "$500", "Sitting in the account now."],
              ["Base pay after taxes", "$4,500", "Paid no matter how the team plays."],
            ].map(([label, amount, condition]) => <div key={label} data-tone="safe"><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
            <p className="income-list__group">Maybe — only if a rule is met</p>
            {[
              ["Perfect Attendance Bonus", "$800", "Every practice. Every game."],
              ["Making the Cut Bonus", "$1,000", "Only if the Flight qualifies."],
            ].map(([label, amount, condition]) => <div key={label} data-tone="maybe"><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
          </div>
          <p className="course-goal"><span>Saving toward</span><b>A sports-media course after the season</b><strong className="money">up to $1,200</strong></p>
        </section>
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
  const baseline = mode === "fallback" ? amountsFor(state, "working") : mode === "week5-first-response" ? amountsFor(state, "working") : mode === "remaining-risk" ? amountsFor(state, "final") : undefined;
  const reference = (mode === "week5-first-response" || mode === "remaining-risk") && state.saved.fallback ? amountsFor(state, "fallback") : undefined;
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
      {essentialsReady && floorReady ? <PlanBoardForMode mode="working" /> : <div className="board-gate"><span aria-hidden="true">🔒</span><p>{STUDENT_COPY.working.locked}</p></div>}
    </StageShell>
  );
}

function IncomeCheckStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="income-check" kicker="Backup check" title="Your plan already survives a lost bonus.">
      <section className="state-message state-message--resolved"><span aria-hidden="true">✓</span><div><h2>You counted no maybe money.</h2><p>Nothing in this plan disappears if a bonus falls through, so there is no backup version to build.</p><p>Counting a bonus or leaving it out are both reasonable. Only whether the plan works is scored.</p></div></section>
      <div className="stage-action"><p>Week 5 still has something waiting for you.</p><Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "week5-transition" })}>Go to Week 5</Button></div>
    </StageShell>
  );
}

function Week5TransitionStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="week5-transition" kicker="Checkpoint saved" title="Four weeks go by.">
      <section className="time-jump">
        <div className="time-jump__track"><span>Week 1</span><i /><strong>Week 5</strong></div>
        <h2>Your plan is locked in.</h2>
        <p>Everything you decided is saved exactly as you left it. What happens next does not let you go back and choose differently.</p>
        <Button onClick={() => dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" })}>Continue to Week 5</Button>
      </section>
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
    <StageShell stage="week5-event" kicker="Week 5" title="The showcase is off.">
      <section className="disruption-card">
        <span className="disruption-card__week" aria-hidden="true">W5</span>
        <div>
          <h2>{BASKETBALL_SCENARIO.disruption.title}</h2>
          <p>{BASKETBALL_SCENARIO.disruption.body}</p>
        </div>
      </section>
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

function OpportunityStage() {
  const { state, dispatch } = useChallenge();
  const completionDecided = state.log.some((event) => event.type === "COMPLETION_INCOME_DECIDED");
  const ready = state.income.includeOptionalWork !== null && completionDecided;
  return (
    <StageShell stage="opportunity-final-repair" kicker="Week 5 · Two calls to make" title="Two decisions, then land the plan.">
      <div className="decision-row">
        <section className="opportunity-card">
          <p className="eyebrow">Decision 1 · Weekend clinics</p>
          <h2>{BASKETBALL_SCENARIO.opportunity.title}</h2>
          <p>{BASKETBALL_SCENARIO.opportunity.body}</p>
          <dl className="tradeoff-pair">
            <div><dt>Avery gains</dt><dd className="money">$500</dd></div>
            <div><dt>Avery gives up</dt><dd>{BASKETBALL_SCENARIO.opportunity.timeCost}</dd></div>
          </dl>
          <div className="binary-choice">
            <button type="button" aria-pressed={state.income.includeOptionalWork === true} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: true })}>Take the clinics</button>
            <button type="button" aria-pressed={state.income.includeOptionalWork === false} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: false })}>Keep the rest block</button>
          </div>
          <p className="decision-note">Neither answer is worth points. More money can still cost something.</p>
        </section>
        <section className="opportunity-card">
          <p className="eyebrow">Decision 2 · The $800 bonus</p>
          <h2>Does your final plan count on it?</h2>
          <p>Avery can still earn the Perfect Attendance Bonus, but only by making every remaining practice and game.</p>
          <dl className="tradeoff-pair">
            <div><dt>Count it</dt><dd>More to work with, and one more check to pass</dd></div>
            <div><dt>Leave it out</dt><dd>Less to work with, nothing left to lose</dd></div>
          </dl>
          <div className="binary-choice">
            <button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>Count the $800</button>
            <button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>Plan without it</button>
          </div>
          <p className="decision-note">Counting it means testing the plan once more without it.</p>
        </section>
      </div>
      {ready ? <PlanBoardForMode mode="final" /> : <div className="board-gate"><span aria-hidden="true">🔒</span><p>Make both calls to open the final board. Neither one is graded — only whether the money works afterward.</p></div>}
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
  return (
    <StageShell stage="submitted" kicker="Turned in" title="You handled it.">
      <section className="submitted-card">
        <p className="submitted-card__lede">Avery finished the eight weeks on a plan you built and then repaired under pressure.</p>
        <dl className="submitted-card__record">
          <div><dt>Saved states</dt><dd>{state.snapshots.length}</dd></div>
          <div><dt>Decisions recorded</dt><dd>{state.log.length}</dd></div>
          <div><dt>Reasoning</dt><dd>With your teacher</dd></div>
        </dl>
        <p>A person reads your explanation, not a computer. Software can check whether the money works; it should not decide whether your thinking makes sense.</p>
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
      case "choose-world": return <RoleStage />;
      case "role-contract": return <RoleStage />;
      case "setup-comparison": return <SetupStage />;
      case "working-plan": return <WorkingStage />;
      case "fallback-version": return <PlanStage mode="fallback" kicker="Backup check" title="What if the bonus never shows up?" />;
      case "income-check": return <IncomeCheckStage />;
      case "week5-transition": return <Week5TransitionStage />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <PlanStage mode="week5-first-response" kicker="Week 5 · First response" title="Fix what you can with what Avery has." />;
      case "opportunity-final-repair": return <OpportunityStage />;
      case "remaining-risk-preview": return <PlanStage mode="remaining-risk" kicker="Week 5 · Last check" title="Test the plan without the $800." />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
    }
  }, [state.stage]);
}
