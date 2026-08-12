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
    <div className="entry-page">
      <div className="entry-page__panel">
        <p className="eyebrow">{STUDENT_COPY.join.eyebrow}</p>
        <h1>{STUDENT_COPY.join.title}</h1>
        <p>{STUDENT_COPY.join.body}</p>
        <label>Class code<input value={classCode} onChange={(event) => setClassCode(event.target.value.toUpperCase())} maxLength={8} /></label>
        <label>Seat code<input value={seatCode} onChange={(event) => setSeatCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} /></label>
        <Button type="button" aria-disabled={!valid} onClick={() => {
          if (!valid) return;
          dispatch({ type: "SESSION_STARTED", sessionId: crypto.randomUUID(), classCode, seatCode });
          dispatch({ type: "WORLD_CONFIRMED", worldId: "basketball" });
        }}>Open the opportunity</Button>
        <p className="privacy-note">For this demo, the codes and challenge work stay on this computer.</p>
      </div>
    </div>
  );
}

function ChooseWorldStage() {
  const { dispatch } = useChallenge();
  return (
    <div className="world-page">
      <header><p className="eyebrow">{STUDENT_COPY.world.eyebrow}</p><h1>{STUDENT_COPY.world.title}</h1><p>{STUDENT_COPY.world.body}</p></header>
      <div className="world-grid world-grid--single">
        <article className="world-card world-card--basketball" data-world="basketball">
          <span className="world-card__number">08</span>
          <div><p className="eyebrow">Harbor City Flight</p><h2>{BASKETBALL_SCENARIO.title}</h2><p>{BASKETBALL_SCENARIO.subtitle}</p></div>
          <Button onClick={() => dispatch({ type: "WORLD_CONFIRMED", worldId: "basketball" })}>Meet Avery</Button>
        </article>
      </div>
    </div>
  );
}

function RoleStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="role-contract" kicker="THE OPPORTUNITY · WEEK 1" title="Avery Reyes has eight weeks to make the Flight.">
      <div className="role-layout">
        <section className="role-hero">
          <span className="role-hero__number">08</span>
          <p>Avery is an 18-year-old guard. The Harbor City Flight just offered a place on the roster for an eight-week showcase run.</p>
          <h2>The basketball chance is real. So is everything it costs.</h2>
          <p>Avery also wants to save up to $1,200 for a sports-media course after the run. The money can make that possible, but only if the plan survives all eight weeks.</p>
          <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "setup-comparison" })}>Compare the places to stay</Button>
        </section>
        <section className="contract-sheet">
          <header><p className="eyebrow">THE DEAL</p><span>Eight weeks · after-tax amounts</span></header>
          <div className="contract-group"><p>Money Avery can count on</p><div className="income-list">
            {[["Already saved", "$500", "This money is already Avery’s."], ["Base pay", "$4,500", "This arrives no matter how the team performs."]].map(([label, amount, condition]) => <div key={label}><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
          </div></div>
          <div className="contract-group contract-group--conditional"><p>Money Avery might earn</p><div className="income-list">
            {[["Every practice and game", "$800", "Miss one, and this payment is gone."], ["Flight reaches the showcase", "$1,000", "No showcase means no payment."]].map(([label, amount, condition]) => <div key={label}><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
          </div></div>
          <p className="course-goal"><span>WHAT AVERY WANTS TO SAVE FOR</span><b>A sports-media course after the season</b><strong className="money">up to $1,200</strong></p>
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
    <StageShell stage="setup-comparison" kicker="WHERE AVERY STAYS · WEEK 1" title="Three places solve one problem in different ways.">
      <p className="stage-deck">Avery needs somewhere to stay for all eight weeks. The closer place costs more. The longest commute costs less. Find each full price, then choose the situation you want to manage.</p>
      <div className="setup-grid">
        {BASKETBALL_SCENARIO.setups.map((setup, index) => (
          <article key={setup.id} className={`setup-card ${state.setupId === setup.id ? "is-selected" : ""}`}>
            <div className="setup-card__head"><span>Option {String.fromCharCode(65 + index)}</span><b>{setup.title}</b></div>
            <p>{setup.tradeoff}</p>
            <div className="setup-card__meta"><span>{index === 0 ? "5-minute trip" : index === 1 ? "30-minute trip" : "70-minute trip"}</span><span>{index === 0 ? "Private sublet" : index === 1 ? "Shared with teammate" : "Staying with family"}</span></div>
            {index === 0 ? (
              <div className="given-total"><span>One price covers all eight weeks.</span><MoneyAmount value={setup.total} /></div>
            ) : (
              <CalculationInput
                calcId={index === 1 ? "setup-middle-total" : "setup-lowest-total"}
                label="Eight-week total"
                prompt={setup.terms}
                expected={setup.total}
                priorAttempts={state.calculations[index === 1 ? "setup-middle-total" : "setup-lowest-total"]?.attempts}
                onSubmit={(raw, value, correct) => submitCalculation(dispatch, index === 1 ? "setup-middle-total" : "setup-lowest-total", raw, value, correct)}
                scaffold={index === 1 ? "Step 1: $150 × 8 weeks = $1,200. Step 2: $1,200 + $200 for travel = your full price." : "Multiply $125 by 8 weeks. That answer is the full price."}
                {...calculationSupport(dispatch, index === 1 ? "setup-middle-total" : "setup-lowest-total")}
                compact
              />
            )}
            <Button variant={state.setupId === setup.id ? "primary" : "secondary"} type="button" onClick={() => dispatch({ type: "SETUP_SELECTED", setupId: setup.id })}>{state.setupId === setup.id ? "Chosen" : `Choose ${setup.title}`}</Button>
          </article>
        ))}
      </div>
      <div className="stage-action">
        <p>The housing choice itself does not change the score. What matters is whether the plan works with the choice you make.</p>
        <Button aria-disabled={!ready} onClick={() => ready && dispatch({ type: "GO_TO_STAGE", stage: "working-plan" })}>Build the first plan</Button>
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
  const buildOneAnswer = () => {
    const moneyLeftAfterBills = Math.max(0, availableFor(input, SCENARIO_NUMBERS) - lockedFor(input, SCENARIO_NUMBERS));
    const goal = dollars(Math.min(SCENARIO_NUMBERS.goalCap, moneyLeftAfterBills));
    const reserve = dollars(Math.min(400, Math.max(0, moneyLeftAfterBills - goal)));
    const flexibleCash = dollars(Math.max(0, moneyLeftAfterBills - goal - reserve));
    dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: mode });
    dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category: "goal", amount: goal });
    dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category: "reserve", amount: reserve });
    dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category: "flexibleCash", amount: flexibleCash });
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
        onShowAndContinue={buildOneAnswer}
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
      <p className="stage-deck">Avery starts with $500 saved and will earn $4,500 no matter what. Another $1,800 depends on what happens. First, total the money that will be there and the essentials Avery must cover. Then decide whether either bonus belongs in the plan.</p>
      <div className="working-setup">
        <CalculationInput calcId="reliable-floor" label={STUDENT_COPY.working.safeMoney.title} prompt={STUDENT_COPY.working.safeMoney.prompt} terms={STUDENT_COPY.working.safeMoney.body} expected={5000} priorAttempts={state.calculations["reliable-floor"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "reliable-floor", raw, value, correct)} scaffold="Add the two safe amounts: $500 + $4,500. Do not add either bonus yet." {...calculationSupport(dispatch, "reliable-floor")} />
        <CalculationInput calcId="essentials-total" label={STUDENT_COPY.working.mustPay.title} prompt={STUDENT_COPY.working.mustPay.prompt} terms={STUDENT_COPY.working.mustPay.body} expected={1600} priorAttempts={state.calculations["essentials-total"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "essentials-total", raw, value, correct)} scaffold="Multiply $200 by 8 weeks. Think: $200 + $200 + $200 + $200 + $200 + $200 + $200 + $200." {...calculationSupport(dispatch, "essentials-total")} />
        <section className="income-switches" aria-labelledby="maybe-money-heading">
          <div><p className="field-label">{STUDENT_COPY.working.maybeMoney.title}</p><h2 id="maybe-money-heading">{STUDENT_COPY.working.maybeMoney.body}</h2></div>
          <button type="button" aria-pressed={state.income.includeCompletion} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: !state.income.includeCompletion })}>
            <span><b>{STUDENT_COPY.working.maybeMoney.attendance.title}</b><small>{STUDENT_COPY.working.maybeMoney.attendance.body}</small><em>{state.income.includeCompletion ? "IN THE PLAN" : "NOT IN THE PLAN"}</em></span><MoneyAmount value={800} />
          </button>
          <button type="button" aria-pressed={state.income.includeOutcome} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: !state.income.includeOutcome })}>
            <span><b>{STUDENT_COPY.working.maybeMoney.showcase.title}</b><small>{STUDENT_COPY.working.maybeMoney.showcase.body}</small><em>{state.income.includeOutcome ? "IN THE PLAN" : "NOT IN THE PLAN"}</em></span><MoneyAmount value={1000} />
          </button>
        </section>
      </div>
      {essentialsReady && floorReady ? <PlanBoardForMode mode="working" /> : <div className="board-gate"><span aria-hidden="true">01</span><p>{STUDENT_COPY.working.locked}</p></div>}
    </StageShell>
  );
}

function IncomeCheckStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="income-check" kicker="THE BACKUP PLAN · COMPLETE" title="No bonus money is holding up the first plan.">
      <section className="state-message state-message--resolved"><span>✓</span><div><h2>The first plan uses only money that will arrive.</h2><p>If either bonus disappears, Avery does not have to rewrite this version. That settles the opening risk.</p><p>Week 5 brings a different problem.</p></div></section>
      <div className="stage-action"><p>Using bonus money or leaving it out can both lead to a workable plan. The financial state—not the strategy—determines the result.</p><Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "week5-transition" })}>Move to Week 5</Button></div>
    </StageShell>
  );
}

function Week5TransitionStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="week5-transition" kicker="FOUR WEEKS LATER" title="The first plan is saved. Then the call comes.">
      <section className="time-jump"><div><span>Week 1</span><i /><strong>Week 5</strong></div><h2>The information has changed.</h2><p>Your first plan stays in the record. What Avery knew in Week 1 matters, and so does the response to what happens next.</p><Button onClick={() => dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" })}>Read the Week 5 update</Button></section>
    </StageShell>
  );
}

function Week5EventStage() {
  const { state, dispatch } = useChallenge();
  if (!state.setupId) return null;
  const expected = week5Change({ includeOutcome: state.income.includeOutcome, setupId: state.setupId }, SCENARIO_NUMBERS);
  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === state.setupId)!;
  const tiles = [
    ...(state.income.includeOutcome ? [{ id: "lost-outcome", label: "The $1,000 Making the Cut Bonus disappears", amount: 1000 }] : []),
    { id: "required-cost", label: "New bill: brace and off-site rehab", amount: 700 },
    { id: "setup-cost", label: `Extra travel bill for ${setup.title}`, amount: setup.eventCost },
  ];
  return (
    <StageShell stage="week5-event" kicker="WEEK 5 · TEAM UPDATE" title="The showcase is off. The costs are not.">
      <section className="disruption-card"><span className="disruption-card__week">W5</span><div><p className="eyebrow">HARBOR CITY FLIGHT · UPDATE</p><h2>{BASKETBALL_SCENARIO.disruption.title}</h2><p>{BASKETBALL_SCENARIO.disruption.body}</p></div></section>
      <section className="gap-builder">
        <div><p className="field-label">WHAT HITS THIS PLAN?</p><h2>Build the Week 5 change.</h2><p>Select every item that affects the plan you saved. Then find the total amount Avery must absorb.</p></div>
        <div className="gap-tiles">
          {tiles.map((tile) => <button key={tile.id} type="button" aria-pressed={state.selectedGapTiles.includes(tile.id)} onClick={() => dispatch({ type: "GAP_TILE_TOGGLED", tileId: tile.id, selected: !state.selectedGapTiles.includes(tile.id) })}><span>{tile.label}</span><strong className="money">+{formatDollars(tile.amount)}</strong></button>)}
        </div>
        <CalculationInput calcId="week5-change" label="WEEK 5 TOTAL CHANGE" prompt="Money removed from the plan + new required costs" terms="Use only the changes that apply to the plan you saved." expected={expected} priorAttempts={state.calculations["week5-change"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "week5-change", raw, value, correct)} onCorrect={() => dispatch({ type: "GO_TO_STAGE", stage: "first-response" })} scaffold="Add the selected amounts. Lost income and a new cost both make the total change larger." {...calculationSupport(dispatch, "week5-change")} />
      </section>
    </StageShell>
  );
}

function OpportunityStage() {
  const { state, dispatch } = useChallenge();
  const completionDecided = state.log.some((event) => event.type === "COMPLETION_INCOME_DECIDED");
  const ready = state.income.includeOptionalWork !== null && completionDecided;
  return (
    <StageShell stage="opportunity-final-repair" kicker="WEEK 5 · THE EXTRA $500" title={state.income.includeOptionalWork === null ? "Four clinics would help the plan—and take Avery’s only open time." : ready ? "The final plan now has all the information." : "One more payment could still change the final plan."}>
      <div className="decision-row">
        <section className="opportunity-card">
          <p className="eyebrow">THE OFFER</p><h2>{BASKETBALL_SCENARIO.opportunity.title}</h2><p>{BASKETBALL_SCENARIO.opportunity.body}</p><div className="decision-comparison"><p><span>Money</span><strong className="money">+$500</strong></p><p><span>Time</span><strong>Four weekends</strong></p></div><p className="time-cost"><strong>The tradeoff:</strong> Those clinics use {BASKETBALL_SCENARIO.opportunity.timeCost}</p>
          <div className="binary-choice"><button type="button" aria-pressed={state.income.includeOptionalWork === true} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: true })}>Take the clinics and add $500</button><button type="button" aria-pressed={state.income.includeOptionalWork === false} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: false })}>Keep the open time and add $0</button></div>
          {state.income.includeOptionalWork !== null && <p className="decision-note">Choice recorded: <strong>{state.income.includeOptionalWork ? "$500 added; four weekends committed." : "No money added; four weekends stay open."}</strong> The choice itself does not earn or remove points.</p>}
        </section>
        {state.income.includeOptionalWork !== null && <section className="opportunity-card opportunity-card--risk">
          <p className="eyebrow">THE RISK THAT REMAINS</p><h2>What about the $800 attendance payment?</h2><p>It can still arrive, but Avery must make every practice and game. If the final plan uses the $800, you will also test that plan without it.</p>
          <div className="binary-choice"><button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>Yes, count the $800</button><button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>No, plan without it</button></div>
        </section>}
      </div>
      {ready ? <PlanBoardForMode mode="final" /> : <div className="board-gate"><span aria-hidden="true">W5</span><p>{state.income.includeOptionalWork === null ? "Decide whether Avery takes the clinics. The next part of the situation will appear after the choice is recorded." : "Decide whether the final plan counts the $800 attendance payment."}</p></div>}
    </StageShell>
  );
}

function DefenseStage() {
  const { state, dispatch } = useChallenge();
  const [selected, setSelected] = useState<string[]>(state.defense.tileIds);
  const [text, setText] = useState(state.defense.text);
  const final = amountsFor(state, "final");
  const tiles = [
    { id: "final-funds", label: "Cash in your final plan", value: 5000 + (state.income.includeCompletionFinal ? 800 : 0) + (state.income.includeOptionalWork ? 500 : 0) },
    { id: "week5-cost", label: "New bills from Week 5", value: state.setupId ? 700 + SCENARIO_NUMBERS.setupEventCosts[state.setupId] : 700 },
    { id: "course", label: "Money saved for the course", value: final.goal },
    { id: "reserve", label: "Backup money left", value: final.reserve },
    { id: "flex", label: "Money for anything else", value: final.flexibleCash },
    { id: "completion", label: "$800 attendance bonus you are still counting", value: state.income.includeCompletionFinal ? 800 : 0 },
  ];
  const canSubmit = selected.length >= 2 && selected.length <= 3 && text.trim().length >= 40;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  return (
    <StageShell stage="defense" kicker="AVERY EXPLAINS THE PLAN" title="Why does this plan make sense after Week 5?">
      <div className="defense-layout">
        <section className="evidence-picker"><p className="field-label">NUMBERS FROM THE FINAL PLAN</p><h2>Choose two or three that matter to your explanation.</h2><p>Use the numbers that best show what the plan protects, what changed, or what the decision cost.</p>{tiles.map((tile) => <button key={tile.id} type="button" aria-pressed={selected.includes(tile.id)} onClick={() => toggle(tile.id)}><span>{tile.label}</span><MoneyAmount value={tile.value} /></button>)}</section>
        <section className="defense-composer"><p>Answer as Avery: <strong>Why does the plan work after Week 5? What did you protect? What did you give up?</strong> Use the numbers you selected.</p><label htmlFor="defense-text">Avery’s explanation · 2–4 short sentences</label><textarea id="defense-text" value={text} onChange={(event) => setText(event.target.value)} rows={8} placeholder="The final plan works because…" /><p className="defense-progress" aria-live="polite">{selected.length < 2 ? `Choose ${2 - selected.length} more number${selected.length === 1 ? "" : "s"}. ` : "Numbers selected. "}{text.trim().length < 40 ? `The explanation needs ${40 - text.trim().length} more character${40 - text.trim().length === 1 ? "" : "s"}.` : "The explanation is ready to submit."}</p><Button aria-disabled={!canSubmit} onClick={() => canSubmit && dispatch({ type: "DEFENSE_SUBMITTED", tileIds: selected, text })}>Submit Avery’s plan</Button></section>
      </div>
    </StageShell>
  );
}

function SubmittedStage() {
  const { state, reset } = useChallenge();
  const navigate = useNavigate();
  return (
    <StageShell stage="submitted" kicker="EIGHT WEEKS COMPLETE" title="Avery’s final plan is in.">
      <section className="submitted-card"><span>✓</span><h2>The record now shows how you handled the full story.</h2><p>Your calculations, saved plans, Week 5 response, decisions, and final explanation are recorded. Your teacher will review the explanation; the structured evidence has already been traced to the financial choices you made.</p><div><Button onClick={() => navigate("/educator/class/students/14")}>See the educator evidence view</Button><Button variant="quiet" onClick={reset}>Start over</Button></div><small>{state.log.length} recorded actions are saved on this computer.</small></section>
    </StageShell>
  );
}

export function StudentChallenge() {
  const { state } = useChallenge();
  return useMemo(() => {
    switch (state.stage) {
      case "entry": case "join": return <JoinStage />;
      case "choose-world": return <ChooseWorldStage />;
      case "role-contract": return <RoleStage />;
      case "setup-comparison": return <SetupStage />;
      case "working-plan": return <WorkingStage />;
      case "fallback-version": return <PlanStage mode="fallback" kicker="THE BACKUP PLAN · WEEK 1" title="You’re counting on money that might not arrive. What changes if it never does?" />;
      case "income-check": return <IncomeCheckStage />;
      case "week5-transition": return <Week5TransitionStage />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <PlanStage mode="week5-first-response" kicker="WEEK 5 · FIRST RESPONSE" title="What changes before Avery hears about any new opportunity?" />;
      case "opportunity-final-repair": return <OpportunityStage />;
      case "remaining-risk-preview": return <PlanStage mode="remaining-risk" kicker="THE RISK THAT REMAINS" title="The $800 still is not guaranteed. What happens without it?" />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
    }
  }, [state.stage]);
}
