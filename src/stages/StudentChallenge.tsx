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
import { WORLD_REGISTRY } from "../domain/scenario/registry";
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
        <Button type="button" aria-disabled={!valid} onClick={() => valid && dispatch({ type: "SESSION_STARTED", sessionId: crypto.randomUUID(), classCode, seatCode })}>Continue</Button>
        <p className="privacy-note"><strong>What happens to these codes?</strong> They stay on this computer for this demo.</p>
      </div>
    </div>
  );
}

function ChooseWorldStage() {
  const { dispatch } = useChallenge();
  return (
    <div className="world-page">
      <header><p className="eyebrow">{STUDENT_COPY.world.eyebrow}</p><h1>{STUDENT_COPY.world.title}</h1><p>{STUDENT_COPY.world.body}</p></header>
      <div className="world-grid">
        <article className="world-card world-card--basketball" data-world="basketball">
          <span className="world-card__number">01</span>
          <div><p className="eyebrow">Basketball · Available now</p><h2>{WORLD_REGISTRY.basketball.title}</h2><p>{WORLD_REGISTRY.basketball.subtitle}</p></div>
          <Button onClick={() => dispatch({ type: "WORLD_CONFIRMED", worldId: "basketball" })}>Play Basketball</Button>
        </article>
        <article className="world-card world-card--fashion" data-world="fashion" aria-label="Fashion world coming soon">
          <span className="world-card__number">02</span>
          <div><p className="eyebrow">Fashion · Coming soon</p><h2>{WORLD_REGISTRY.fashion.title}</h2><p>{WORLD_REGISTRY.fashion.subtitle}</p></div>
          <button type="button" aria-disabled="true" className="button button--secondary" onClick={(event) => event.currentTarget.blur()}>Coming soon</button>
        </article>
      </div>
    </div>
  );
}

function RoleStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="role-contract" kicker="YOUR PLAYER · AVERY REYES" title="You have 8 weeks to make this work.">
      <div className="role-layout">
        <section className="role-hero">
          <span className="role-hero__number">08</span>
          <p>Avery is an 18-year-old guard joining the Harbor City Flight for an 8-week run.</p>
          <h2><strong>Your job:</strong> Make a money plan for Avery. Then keep it working when the season goes sideways.</h2>
          <p>You will choose where Avery stays, decide what money to count, react to a surprise, and explain your final move.</p>
          <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "setup-comparison" })}>I’m ready. Show me the choices.</Button>
        </section>
        <section className="contract-sheet">
          <header><p className="eyebrow">AVERY’S 8-WEEK MONEY</p><span>Future goal · save up to $1,200</span></header>
          <div className="income-list">
            {[
              ["Money already saved", "$500", "Safe cash. Avery already has it."],
              ["Base pay after taxes", "$4,500", "Safe cash. Avery gets it no matter how the team plays."],
              ["Perfect Attendance Bonus", "$800", "Maybe money. Avery must show up to every practice and game."],
              ["Making the Cut Bonus", "$1,000", "Maybe money. The team must qualify for the big show."],
            ].map(([label, amount, condition]) => <div key={label}><span>{label}<small>{condition}</small></span><strong className="money">{amount}</strong></div>)}
          </div>
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
    <StageShell stage="setup-comparison" kicker="CHOICE 1 · PICK A PLACE TO STAY" title="Where should Avery live for 8 weeks?">
      <p className="stage-deck"><strong>First, find the true 8-week price.</strong> Then pick any option you think works. There is no secret “best” choice. A cheaper place takes more travel time, and your choice can change a cost later in the story.</p>
      <div className="setup-grid">
        {BASKETBALL_SCENARIO.setups.map((setup, index) => (
          <article key={setup.id} className={`setup-card ${state.setupId === setup.id ? "is-selected" : ""}`}>
            <div className="setup-card__head"><span>Option {String.fromCharCode(65 + index)}</span><b>{setup.title}</b></div>
            <p>{setup.tradeoff} <strong>You are choosing both the price and the travel time.</strong></p>
            {index === 0 ? (
              <div className="given-total"><span>Full 8-week price. The math is already done for you.</span><MoneyAmount value={setup.total} /></div>
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
        <p><strong>Your choice is not graded.</strong> Your job is to make the money plan work with whichever place you pick.</p>
        <Button aria-disabled={!ready} onClick={() => ready && dispatch({ type: "GO_TO_STAGE", stage: "working-plan" })}>Next: Build Avery’s Money Plan</Button>
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
      <p className="stage-deck"><strong>Cash flow</strong> means money coming in and money going out. Start by finding Avery’s safe cash and must-pay costs. Then choose whether to count any bonus cash.</p>
      <div className="working-setup">
        <CalculationInput calcId="reliable-floor" label={STUDENT_COPY.working.safeMoney.title} prompt={STUDENT_COPY.working.safeMoney.prompt} terms={STUDENT_COPY.working.safeMoney.body} expected={5000} priorAttempts={state.calculations["reliable-floor"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "reliable-floor", raw, value, correct)} scaffold="Add the two safe amounts: $500 + $4,500. Do not add either bonus yet." {...calculationSupport(dispatch, "reliable-floor")} />
        <CalculationInput calcId="essentials-total" label={STUDENT_COPY.working.mustPay.title} prompt={STUDENT_COPY.working.mustPay.prompt} terms={STUDENT_COPY.working.mustPay.body} expected={1600} priorAttempts={state.calculations["essentials-total"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "essentials-total", raw, value, correct)} scaffold="Multiply $200 by 8 weeks. Think: $200 + $200 + $200 + $200 + $200 + $200 + $200 + $200." {...calculationSupport(dispatch, "essentials-total")} />
        <section className="income-switches" aria-labelledby="maybe-money-heading">
          <div><p className="field-label">{STUDENT_COPY.working.maybeMoney.title}</p><h2 id="maybe-money-heading">{STUDENT_COPY.working.maybeMoney.body}</h2></div>
          <button type="button" aria-pressed={state.income.includeCompletion} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: !state.income.includeCompletion })}>
            <span><b>{STUDENT_COPY.working.maybeMoney.attendance.title}</b><small>{STUDENT_COPY.working.maybeMoney.attendance.body}</small><em>{state.income.includeCompletion ? "COUNTING THIS BONUS" : "NOT COUNTING IT"}</em></span><MoneyAmount value={800} />
          </button>
          <button type="button" aria-pressed={state.income.includeOutcome} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: !state.income.includeOutcome })}>
            <span><b>{STUDENT_COPY.working.maybeMoney.showcase.title}</b><small>{STUDENT_COPY.working.maybeMoney.showcase.body}</small><em>{state.income.includeOutcome ? "COUNTING THIS BONUS" : "NOT COUNTING IT"}</em></span><MoneyAmount value={1000} />
          </button>
        </section>
      </div>
      {essentialsReady && floorReady ? <PlanBoardForMode mode="working" /> : <div className="board-gate"><span>🔒</span><p>{STUDENT_COPY.working.locked}</p></div>}
    </StageShell>
  );
}

function IncomeCheckStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="income-check" kicker="BACKUP CHECK · DONE" title="Your first plan uses only safe cash.">
      <section className="state-message state-message--resolved"><span>✓</span><div><h2>You did not count either bonus.</h2><p>That means Avery’s first plan does not break if a bonus disappears. You can skip the bonus backup screen.</p><p><strong>You are not skipping the challenge.</strong> A surprise is still coming in Week 5, and you will have to fix the plan then.</p></div></section>
      <div className="stage-action"><p>Counting bonus cash or skipping it can both be smart. The game checks whether your plan works—not which style you choose.</p><Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "week5-transition" })}>Jump to Week 5</Button></div>
    </StageShell>
  );
}

function Week5TransitionStage() {
  const { dispatch } = useChallenge();
  return (
    <StageShell stage="week5-transition" kicker="CHECKPOINT SAVED" title="Fast-forward to Week 5.">
      <section className="time-jump"><div><span>Week 1</span><i /><strong>Week 5</strong></div><h2>Your first plan is saved. Now the story changes.</h2><p>Think of this like a game checkpoint. Your earlier choices stay saved, so you cannot pretend you made a different choice after seeing the surprise.</p><Button onClick={() => dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" })}>Show Me What Happened</Button></section>
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
    <StageShell stage="week5-event" kicker="WEEK 5 · SURPRISE UPDATE" title="Uh-oh. Avery’s money plan just changed.">
      <section className="disruption-card"><span className="disruption-card__week">W5</span><div><p className="eyebrow">STORM ALERT</p><h2>{BASKETBALL_SCENARIO.disruption.title}</h2><p>{BASKETBALL_SCENARIO.disruption.body}</p><p><strong>Translation:</strong> Avery may lose money that was in your plan, and Avery now has new bills that must be paid.</p></div></section>
      <section className="gap-builder">
        <div><p className="field-label">WHAT CHANGED?</p><h2>Find the size of the money problem.</h2><p>Tap every change that affects <strong>your</strong> plan. A plus sign here means the problem gets bigger—either money disappeared or a new bill appeared.</p></div>
        <div className="gap-tiles">
          {tiles.map((tile) => <button key={tile.id} type="button" aria-pressed={state.selectedGapTiles.includes(tile.id)} onClick={() => dispatch({ type: "GAP_TILE_TOGGLED", tileId: tile.id, selected: !state.selectedGapTiles.includes(tile.id) })}><span>{tile.label}</span><strong className="money">+{formatDollars(tile.amount)}</strong></button>)}
        </div>
        <CalculationInput calcId="week5-change" label="HOW BIG IS THE MONEY PROBLEM?" prompt="Bonus cash that disappeared + new bills Avery must pay" terms="Add only the changes that affect the plan you made." expected={expected} priorAttempts={state.calculations["week5-change"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "week5-change", raw, value, correct)} onCorrect={() => dispatch({ type: "GO_TO_STAGE", stage: "first-response" })} scaffold="Look at the cards you selected. Add their dollar amounts together. Money Avery lost and new bills both make the problem bigger." {...calculationSupport(dispatch, "week5-change")} />
      </section>
    </StageShell>
  );
}

function OpportunityStage() {
  const { state, dispatch } = useChallenge();
  const completionDecided = state.log.some((event) => event.type === "COMPLETION_INCOME_DECIDED");
  const ready = state.income.includeOptionalWork !== null && completionDecided;
  return (
    <StageShell stage="opportunity-final-repair" kicker="WEEK 5 · TWO LAST CHOICES" title="Make two choices. Then finish the plan.">
      <div className="decision-row">
        <section className="opportunity-card">
          <p className="eyebrow">CHOICE 1 · EXTRA JOB FOR $500</p><h2>{BASKETBALL_SCENARIO.opportunity.title}</h2><p>{BASKETBALL_SCENARIO.opportunity.body}</p><p className="time-cost"><strong>What Avery gives up:</strong> {BASKETBALL_SCENARIO.opportunity.timeCost}</p><p>Taking the job adds $500. Saying no protects Avery’s rest. <strong>Neither answer gets extra points.</strong></p>
          <div className="binary-choice"><button type="button" aria-pressed={state.income.includeOptionalWork === true} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: true })}>Take the job +$500</button><button type="button" aria-pressed={state.income.includeOptionalWork === false} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: false })}>Say no and keep the rest time</button></div>
        </section>
        <section className="opportunity-card">
          <p className="eyebrow">CHOICE 2 · $800 ATTENDANCE BONUS</p><h2>Will your final plan count this maybe money?</h2><p>Avery can still earn it, but only by making every practice and game. If you count it, the game will make you test the plan once more without it.</p>
          <div className="binary-choice"><button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>Yes, count the $800</button><button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>No, plan without it</button></div>
        </section>
      </div>
      {ready ? <PlanBoardForMode mode="final" /> : <div className="board-gate"><span>🔒</span><p>Make <strong>both choices</strong> above to unlock the final dashboard. There is no “correct” lifestyle choice. You only need to make the money work.</p></div>}
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
    <StageShell stage="defense" kicker="FINAL LEVEL · EXPLAIN YOUR CHOICE" title="Tell us why your plan makes sense.">
      <div className="defense-layout">
        <section className="evidence-picker"><p className="field-label">STEP 1 · PICK YOUR NUMBERS</p><h2>Choose 2 or 3 numbers that help tell your story.</h2><p>The numbers are proof. Pick the ones that show what worked, what you saved, or what your choice cost.</p>{tiles.map((tile) => <button key={tile.id} type="button" aria-pressed={selected.includes(tile.id)} onClick={() => toggle(tile.id)}><span>{tile.label}</span><MoneyAmount value={tile.value} /></button>)}</section>
        <section className="defense-composer"><p><strong>Step 2: Explain your move.</strong> Say how the plan works after Week 5, what mattered most to you, and what you had to give up. Use the numbers you picked on the left.</p><div className="sentence-starters"><button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}My plan still works because `)}>Start with “My plan still works…”</button><button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I protected `)}>Start with “I protected…”</button><button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I gave up `)}>Start with “I gave up…”</button></div><label htmlFor="defense-text">Write 2–4 short sentences</label><textarea id="defense-text" value={text} onChange={(event) => setText(event.target.value)} rows={8} placeholder="Example: My plan still works because…" /><p className="defense-progress" aria-live="polite">{selected.length < 2 ? `Pick ${2 - selected.length} more number${selected.length === 1 ? "" : "s"}. ` : "Numbers ready. "}{text.trim().length < 40 ? `Write ${40 - text.trim().length} more character${40 - text.trim().length === 1 ? "" : "s"}.` : "Your explanation is long enough."}</p><Button aria-disabled={!canSubmit} onClick={() => canSubmit && dispatch({ type: "DEFENSE_SUBMITTED", tileIds: selected, text })}>Turn In My Plan</Button></section>
      </div>
    </StageShell>
  );
}

function SubmittedStage() {
  const { state, reset } = useChallenge();
  const navigate = useNavigate();
  return (
    <StageShell stage="submitted" kicker="MISSION COMPLETE" title="Avery’s plan is turned in.">
      <section className="submitted-card"><span>✓</span><h2>You made it through all 8 weeks!</h2><p>Your choices, math, backup plans, fixes, and explanation are saved. Your teacher will read your final explanation because a computer should not decide whether your reasoning makes sense.</p><div><Button onClick={() => navigate("/educator/class/students/14")}>See What a Teacher Sees</Button><Button variant="quiet" onClick={reset}>Play Again</Button></div><small>{state.log.length} game moves saved on this computer.</small></section>
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
      case "fallback-version": return <PlanStage mode="fallback" kicker="BACKUP CHECK · BONUS CASH OFF" title="What if the bonus cash never shows up?" />;
      case "income-check": return <IncomeCheckStage />;
      case "week5-transition": return <Week5TransitionStage />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <PlanStage mode="week5-first-response" kicker="WEEK 5 · YOUR FIRST FIX" title="Try fixing the money problem with the plan you already made." />;
      case "opportunity-final-repair": return <OpportunityStage />;
      case "remaining-risk-preview": return <PlanStage mode="remaining-risk" kicker="WEEK 5 · LAST BACKUP CHECK" title="Now test your final plan without the $800 bonus." />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
    }
  }, [state.stage]);
}
