import { useEffect, useMemo, useRef, useState } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CalculationInput } from "../components/primitives/CalculationInput";
import { MoneyAmount } from "../components/primitives/MoneyAmount";
import { PlanBoard } from "../components/financial/PlanBoard";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { RosterCard } from "../components/story/RosterCard";
import { dollars, formatDollars, type Dollars } from "../domain/core/money";
import type { CalcId, CategoryId, SetupId } from "../domain/core/ids";
import type { PlanMode } from "../domain/finance/types";
import { availableFor, lockedFor, week5Change } from "../domain/finance/formulas";
import { PLAN_MODES } from "../domain/finance/modes";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { setupCostOrder } from "../domain/scenario/expectations";
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

/** Brings a section that has just appeared into view without yanking the page around. */
function useRevealOnce(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (!active || done.current || !ref.current) return;
    done.current = true;
    ref.current.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }, [active]);
  return ref;
}

/**
 * Beat 1. The story and the check-in are the same screen: a student reads what happened
 * to Avery while entering the two codes, so nothing stands between the URL and the story.
 */
function OpeningStage() {
  const { dispatch } = useChallenge();
  const { offer, numbers } = BASKETBALL_SCENARIO;
  const [classCode, setClassCode] = useState("BOW301");
  const [seatCode, setSeatCode] = useState("14");
  const valid = /^[A-Z0-9]{4,8}$/i.test(classCode) && /^\d{1,2}$/.test(seatCode);
  return (
    <div className="opening scene" data-world="basketball">
      <CourtBackdrop />
      <div className="opening__bar">
        <AppMark />
        <span>Plan Under Pressure</span>
      </div>
      <div className="opening__grid">
        <section className="opening__story">
          <p className="eyebrow">{offer.kicker}</p>
          <h1>{offer.headline}</h1>
          <p className="opening__lede">{offer.body}</p>
          <ol className="opening__weeks" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <li key={index}><i />{index + 1}</li>)}
          </ol>
          <p>Eight weeks · ends at the regional showcase</p>
        </section>
        <aside className="opening__side">
          <RosterCard />
          <div className="goal-strip">
            <strong className="money">{formatDollars(numbers.goalCap)}</strong>
            <div><b>{offer.want}</b><span>{offer.wantDetail}</span></div>
          </div>
          <div className="opening__job">
            <p><strong>Avery plays. You handle the money.</strong> Eight weeks of decisions are yours.</p>
            <div className="opening__codes">
              <label>Class code<input value={classCode} onChange={(event) => setClassCode(event.target.value.toUpperCase())} maxLength={8} /></label>
              <label>Seat<input value={seatCode} onChange={(event) => setSeatCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={2} /></label>
            </div>
            <Button type="button" aria-disabled={!valid} onClick={() => valid && dispatch({ type: "SESSION_STARTED", sessionId: crypto.randomUUID(), classCode, seatCode })}>Start the eight weeks</Button>
            <p className="privacy-note">{STUDENT_COPY.join.privacy}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Beat 2. The contract itself, with the difference between the two halves left visible. */
function DealStage() {
  const { dispatch } = useChallenge();
  const { offer } = BASKETBALL_SCENARIO;
  const lines = [
    { tone: "safe", label: "Already saved", amount: "$500", rule: "In the account", detail: "Avery has it now." },
    { tone: "safe", label: "Base pay after taxes", amount: "$4,500", rule: "Across the 8 weeks", detail: "About $560 a week, win or lose." },
    { tone: "maybe", label: "Perfect Attendance Bonus", amount: "$800", rule: "Only if", detail: "Avery makes every practice and every game." },
    { tone: "maybe", label: "Making the Cut Bonus", amount: "$1,000", rule: "Only if", detail: "The Flight qualifies for the showcase." },
  ];
  return (
    <StageShell stage="role-contract" kicker="The terms" title="What the eight weeks pay.">
      <p className="stage-deck">Four payments, one contract. Two of them come with a condition attached.</p>
      <div className="contract">
        <div className="contract__head">
          <b>{offer.team} · 8-week terms</b>
          <span>Avery Reyes #{offer.jersey} · {offer.position}</span>
        </div>
        <div className="contract__columns">
          {(["safe", "maybe"] as const).map((tone) => (
            <section key={tone} className="contract__column" data-tone={tone}>
              <p className="contract__tag">{tone === "safe" ? "Avery will have this" : "Depends on something happening"}</p>
              {lines.filter((line) => line.tone === tone).map((line) => (
                <div key={line.label} className="contract__line">
                  <b>{line.label}</b>
                  <strong className="money">{line.amount}</strong>
                  <span className="contract__rule"><em>{line.rule}</em>{line.detail}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="contract__foot">
          <p><i data-tone="safe" aria-hidden="true" />Solid means the money arrives.</p>
          <p><i data-tone="maybe" aria-hidden="true" />Striped means it might not.</p>
        </div>
      </div>
      <div className="stage-action">
        <p>Nothing is spent yet. The first bill is the biggest one: eight weeks of somewhere to live.</p>
        <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "setup-comparison" })}>Find Avery a place</Button>
      </div>
    </StageShell>
  );
}

/**
 * Beat 3. Three places, priced in two currencies.
 *
 * Comparing full cost across time used to be two multiplication drills that gated the
 * screen. Here the comparison itself is the interaction: the student puts the three places
 * in order by what each really costs over eight weeks, working from the terms rather than
 * from totals the screen hands them. Only after that do the totals appear — and each card
 * also says what the place costs out of Avery's week, so the cheapest is not automatically
 * the best.
 */
function SetupStage() {
  const { state, dispatch } = useChallenge();
  const { setups } = BASKETBALL_SCENARIO;
  const [order, setOrder] = useState<SetupId[]>(() => state.setupRanking?.order ?? setups.map((setup) => setup.id));
  const ranked = state.setupRanking?.correct === true;
  const totalEntered = state.calculations["chosen-setup-total"]?.correct === true;
  const chosen = setups.find((setup) => setup.id === state.setupId);
  const ready = ranked && state.setupId !== null && totalEntered;
  const revealRef = useRevealOnce(ranked);
  const longest = Math.max(...setups.map((setup) => setup.commuteMinutes));
  const byId = (id: SetupId) => setups.find((setup) => setup.id === id)!;

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    setOrder(next);
  };
  const checkOrder = () => {
    const correct = order.every((id, index) => id === setupCostOrder(SCENARIO_NUMBERS)[index]);
    dispatch({ type: "SETUP_RANKED", order, correct });
  };

  return (
    <StageShell stage="setup-comparison" kicker="Where Avery stays" title="Cheaper rent costs something else.">
      {!ranked ? (
        <>
          <p className="stage-deck">
            Three places, three ways of paying. Put them in order from the cheapest to the most expensive
            <strong> across all eight weeks</strong> — the weekly price is not the whole story.
          </p>
          <ol className="rank-list">
            {order.map((id, index) => {
              const setup = byId(id);
              return (
                <li key={id}>
                  <span className="rank-list__place" aria-hidden="true">{index + 1}</span>
                  <div className="rank-list__body">
                    <b>{setup.title}</b>
                    <span>{setup.terms}</span>
                  </div>
                  <div className="rank-list__controls" role="group" aria-label={`Move ${setup.title}`}>
                    <button type="button" aria-label={`Move ${setup.title} earlier`} aria-disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                    <button type="button" aria-label={`Move ${setup.title} later`} aria-disabled={index === order.length - 1} onClick={() => move(index, 1)}>↓</button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="stage-action">
            {state.setupRanking && !state.setupRanking.correct
              ? <p aria-live="polite">Not yet. One of these costs less over eight weeks than its weekly price suggests.</p>
              : <p>Order them cheapest first.</p>}
            <Button type="button" onClick={checkOrder}>Check the order</Button>
          </div>
        </>
      ) : (
        <div ref={revealRef}>
          <p className="stage-deck">That is the order. Now pick where Avery lives — and what it costs out of the week.</p>
          <div className="setup-grid">
            {setups.map((setup, index) => (
              <article key={setup.id} className={`place-card ${state.setupId === setup.id ? "is-selected" : ""}`}>
                <div className="place-card__scene" data-place={setup.id}>
                  <CourtBackdrop variant={index === 0 ? "key" : "half"} />
                  <span className="place-card__option">Option {String.fromCharCode(65 + index)}</span>
                  <b className="place-card__name">{setup.title}</b>
                </div>
                <div className="given-total">
                  <span>Eight weeks</span>
                  <MoneyAmount value={setup.total} />
                </div>
                <div className="trip">
                  <div className="trip__map" aria-hidden="true">
                    <span className="trip__dot" />
                    <span className="trip__path"><i style={{ width: `${(setup.commuteMinutes / longest) * 100}%` }} /></span>
                    <span className="trip__dot trip__dot--gym" />
                  </div>
                  <p className="trip__read">
                    <span>{setup.commute}</span>
                    <b>{SCENARIO_NUMBERS.load.commuteBlocks[setup.id]} hours a week</b>
                  </p>
                </div>
                <p className="place-card__tradeoff">{setup.tradeoff}</p>
                <Button variant={state.setupId === setup.id ? "primary" : "secondary"} type="button" onClick={() => dispatch({ type: "SETUP_SELECTED", setupId: setup.id })}>{state.setupId === setup.id ? "Selected" : "Choose this setup"}</Button>
              </article>
            ))}
          </div>
          {chosen && (
            <div className="chosen-total">
              <CalculationInput
                calcId="chosen-setup-total"
                label={`What the ${chosen.title} costs Avery`}
                prompt={chosen.terms}
                terms="All eight weeks, before anything else is paid for."
                expected={chosen.total}
                priorAttempts={state.calculations["chosen-setup-total"]?.attempts}
                onSubmit={(raw, value, correct) => submitCalculation(dispatch, "chosen-setup-total", raw, value, correct)}
                scaffold={`Take the price in the terms and carry it across all ${SCENARIO_NUMBERS.weeks} weeks.`}
                {...calculationSupport(dispatch, "chosen-setup-total")}
              />
            </div>
          )}
          <div className="stage-action">
            {chosen
              ? <p aria-live="polite"><strong>{chosen.title}.</strong> {formatDollars(chosen.total)} of Avery’s money is spoken for, and {SCENARIO_NUMBERS.load.commuteBlocks[chosen.id]} hours of every week belong to the trip.</p>
              : <p>Each place asks for something different. Pick the one you want to build the plan around.</p>}
            <Button aria-disabled={!ready} onClick={() => ready && dispatch({ type: "GO_TO_STAGE", stage: "working-plan" })}>
              {ready ? "Build the plan" : chosen ? "Work out the eight-week cost to continue" : "Pick a place to continue"}
            </Button>
          </div>
        </div>
      )}
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
  // Named out loud, every pass after the first is a reaction to something that happened
  // rather than the same board handed back.
  const week5Bills = SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[state.setupId];
  const change = mode === "fallback"
    ? { headline: "Take the bonus money out.", items: [
        ...(state.income.includeOutcome ? [`The $1,000 showcase bonus leaves the plan`] : []),
        ...(state.income.includeCompletion ? [`The $800 attendance bonus leaves the plan`] : []),
        "Rent and essentials do not change",
      ] }
    : mode === "week5-first-response"
      ? { headline: "Week 5 landed on your plan.", items: [
          ...(state.income.includeOutcome ? ["The $1,000 showcase bonus is gone"] : []),
          `${formatDollars(week5Bills)} of brace, rehab and travel is now locked in`,
        ] }
      : mode === "final"
        ? { headline: "Your two calls are in.", items: [
            state.income.includeOptionalWork ? "Four Saturday clinics: +$500" : "No clinics. The Saturdays stay Avery’s",
            state.income.includeCompletionFinal ? "The $800 attendance bonus is back in the plan" : "The $800 attendance bonus stays out",
          ] }
        : mode === "remaining-risk"
          ? { headline: "The $800 never arrives.", items: ["A copy of your final plan with that money removed"] }
          : undefined;
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
        {...(change ? { change } : {})}
        {...(reference ? { onApplyReference: applyReference } : {})}
      />
  );
}

function PlanStage({ mode, title, kicker, deck }: { mode: PlanMode; title: string; kicker: string; deck?: string }) {
  const { state } = useChallenge();
  return (
    <StageShell stage={state.stage} kicker={kicker} title={title}>
      {deck && <p className="stage-deck">{deck}</p>}
      <PlanBoardForMode mode={mode} />
    </StageShell>
  );
}

/**
 * Beat 4. Read the money, decide what to count, then split what is left. Each part
 * only appears once the one before it is settled, so the screen never shows every
 * number at once.
 */
function WorkingStage() {
  const { state, dispatch } = useChallenge();
  const floorReady = state.calculations["reliable-floor"]?.correct === true;
  const essentialsReady = state.calculations["essentials-total"]?.correct === true;
  const counted = floorReady && essentialsReady;
  const revealRef = useRevealOnce(counted);
  const input = snapshotForMode(state, "working");
  if (!input || !state.setupId) return null;
  return (
    <StageShell stage="working-plan" kicker="Build the plan" title={STUDENT_COPY.working.title}>
      {counted ? (
        <div className="counted-strip" aria-label="What you worked out">
          <div><span>Safe cash</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.reliableFloor)}</strong></div>
          <div><span>8-week essentials</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.essentialsTotal)}</strong></div>
        </div>
      ) : (
        <>
          <p className="stage-deck">{STUDENT_COPY.working.deck}</p>
          <div className="working-setup">
            <CalculationInput calcId="reliable-floor" label={STUDENT_COPY.working.safeMoney.title} prompt={STUDENT_COPY.working.safeMoney.prompt} terms={STUDENT_COPY.working.safeMoney.body} expected={5000} priorAttempts={state.calculations["reliable-floor"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "reliable-floor", raw, value, correct)} scaffold="Add the two safe amounts: $500 + $4,500. Do not add either bonus yet." {...calculationSupport(dispatch, "reliable-floor")} />
            <CalculationInput calcId="essentials-total" label={STUDENT_COPY.working.mustPay.title} prompt={STUDENT_COPY.working.mustPay.prompt} terms={STUDENT_COPY.working.mustPay.body} expected={1600} priorAttempts={state.calculations["essentials-total"]?.attempts} onSubmit={(raw, value, correct) => submitCalculation(dispatch, "essentials-total", raw, value, correct)} scaffold="Multiply $200 by 8 weeks. Think: $200 + $200 + $200 + $200 + $200 + $200 + $200 + $200." {...calculationSupport(dispatch, "essentials-total")} />
          </div>
        </>
      )}
      {counted && (
        <div ref={revealRef} className="staged-reveal">
          {/* Committing early is cheaper and takes the money out of reach. This is the
              current-versus-future call, made before Week 5 is known. */}
          <section className="deposit-call" aria-labelledby="deposit-heading">
            <div className="deposit-call__intro">
              <p className="field-label">The course seat</p>
              <h2 id="deposit-heading">Reserve it now, or decide later?</h2>
              <p>The sports-media course starts the week the season ends. Avery can hold a seat now for less, or wait and pay the full price.</p>
            </div>
            <div className="deposit-call__options">
              <button type="button" aria-pressed={state.depositTaken === true} onClick={() => dispatch({ type: "COURSE_DEPOSIT_DECIDED", taken: true })}>
                <b>Reserve it now</b>
                <strong className="money">{formatDollars(SCENARIO_NUMBERS.course.depositPrice)}</strong>
                <span>Paid up front. It stops being money you can move.</span>
              </button>
              <button type="button" aria-pressed={state.depositTaken === false} onClick={() => dispatch({ type: "COURSE_DEPOSIT_DECIDED", taken: false })}>
                <b>Decide later</b>
                <strong className="money">{formatDollars(SCENARIO_NUMBERS.course.fullPrice)}</strong>
                <span>{formatDollars(SCENARIO_NUMBERS.course.fullPrice - SCENARIO_NUMBERS.course.depositPrice)} more, and you can still change your mind.</span>
              </button>
            </div>
          </section>
          <section className="bets" aria-labelledby="maybe-money-heading">
            <div className="bets__intro">
              <p className="field-label">{STUDENT_COPY.working.maybeMoney.title}</p>
              <h2 id="maybe-money-heading">{STUDENT_COPY.working.maybeMoney.body}</h2>
            </div>
            {([
              ["completion-800", 800, state.income.includeCompletion, STUDENT_COPY.working.maybeMoney.attendance],
              ["outcome-1000", 1000, state.income.includeOutcome, STUDENT_COPY.working.maybeMoney.showcase],
            ] as const).map(([sourceId, amount, included, copy]) => (
              <article key={sourceId} className="bet" data-counted={included}>
                <div className="bet__head">
                  <b>{copy.title}</b>
                  <strong className="money">{formatDollars(amount)}</strong>
                </div>
                <p className="bet__rule">{copy.body}</p>
                <div className="binary-choice">
                  <button type="button" aria-pressed={included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: true })}>Count it</button>
                  <button type="button" aria-pressed={!included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: false })}>Leave it out</button>
                </div>
              </article>
            ))}
          </section>
          {state.depositTaken === null
            ? <p className="board-gate">Make the call on the course seat to open the board.</p>
            : <PlanBoardForMode mode="working" />}
        </div>
      )}
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

/** One week of the season: what the team saw, and what Avery says about it. */
function WeekPost({ tag, note, voice, index }: { tag: string; note: string; voice: string; index: number }) {
  return (
    <article className="post" style={{ animationDelay: `${index * 140}ms` }}>
      <p className="post__tag">{tag}</p>
      <p className="post__note">{note}</p>
      <blockquote className="post__voice">
        <span className="post__who" aria-hidden="true">{BASKETBALL_SCENARIO.offer.jersey}</span>
        <p>{voice}</p>
      </blockquote>
    </article>
  );
}

/** Beat 6. Four weeks pass on screen so Week 5 lands on a season the student watched. */
function Week5TransitionStage() {
  const { state, dispatch } = useChallenge();
  const savedMode: PlanMode = state.saved.fallback ? "fallback" : "working";
  const setupId = state.setupId;
  const noConditional = !state.income.includeCompletion && !state.income.includeOutcome;
  return (
    <StageShell stage="week5-transition" kicker="Weeks 1 to 4" title="The season starts.">
      <div className="season-layout">
        <div className="feed">
          {BASKETBALL_SCENARIO.season.map((entry, index) => (
            <WeekPost key={entry.week} tag={entry.week} note={entry.note} voice={setupId ? entry.voice[setupId] : ""} index={index} />
          ))}
          <article className="post" data-state="next" style={{ animationDelay: "560ms" }}>
            <p className="post__tag">Week 5</p>
            <p className="post__note">Not played yet.</p>
          </article>
        </div>
        <PlanEcho
          mode={savedMode}
          label="What Avery has been living on"
          note={noConditional
            ? "Your plan counts on no bonus money, so there was no backup version to build."
            : "Rent is paid. The bonuses are still open."}
        />
      </div>
      <div className="stage-action">
        <p>Nothing you saved changes from here. Whatever Week 5 brings, it lands on the plan you already built.</p>
        <Button onClick={() => dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" })}>Play Week 5</Button>
      </div>
    </StageShell>
  );
}

/** Beat 7. Two pieces of news, then the student works out what they cost. */
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
      <div className="bulletins scene">
        <CourtBackdrop variant="key" />
        {BASKETBALL_SCENARIO.disruption.beats.map((beat, index) => (
          <section key={beat.tag} className="bulletin" style={{ animationDelay: `${index * 320}ms` }}>
            <span className="bulletin__day" aria-hidden="true">{beat.marker}</span>
            <div>
              <p className="bulletin__tag">{beat.tag}</p>
              <p className="bulletin__text">{beat.text}</p>
            </div>
          </section>
        ))}
        <blockquote className="post__voice post__voice--scene">
          <span className="post__who" aria-hidden="true">{BASKETBALL_SCENARIO.offer.jersey}</span>
          <p>{BASKETBALL_SCENARIO.disruption.voice[setup.id]}</p>
        </blockquote>
      </div>
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

/** The last four Saturdays of the season, drawn, so the tradeoff is not only a sentence. */
function SaturdayBlocks({ decision }: { decision: boolean | null }) {
  return (
    <ol className="saturdays" aria-label="Avery's last four Saturdays">
      {[5, 6, 7, 8].map((week) => (
        <li key={week} data-state={decision === null ? "open" : decision ? "clinic" : "rest"}>
          <span>Sat · wk {week}</span>
          <b>{decision === null ? "Open" : decision ? "Clinic" : "Avery’s"}</b>
        </li>
      ))}
    </ol>
  );
}

/** Beat 9 and 10. Two calls that change what there is to work with, then the last repair. */
function FinalRepairStage() {
  const { state, dispatch } = useChallenge();
  const { opportunity } = BASKETBALL_SCENARIO;
  const completionDecided = state.log.some((event) => event.type === "COMPLETION_INCOME_DECIDED");
  const ready = state.income.includeOptionalWork !== null && completionDecided;
  const revealRef = useRevealOnce(ready);
  return (
    <StageShell stage="opportunity-final-repair" kicker="Week 5 · Two calls" title="Two calls, then land the plan.">
      <div className="decision-row">
        <section className="opportunity-card">
          <p className="eyebrow">Message · {opportunity.from}</p>
          <h2>{opportunity.title}</h2>
          <p>{opportunity.body}</p>
          <div className="scale">
            <div className="scale__side">
              <span>Avery gains</span>
              <b className="scale__money money">+$500</b>
            </div>
            <div className="scale__side">
              <span>Avery gives up</span>
              <SaturdayBlocks decision={state.income.includeOptionalWork} />
              <small>{opportunity.timeCost}</small>
            </div>
          </div>
          <div className="binary-choice">
            <button type="button" aria-pressed={state.income.includeOptionalWork === true} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: true })}>Take the clinics</button>
            <button type="button" aria-pressed={state.income.includeOptionalWork === false} onClick={() => dispatch({ type: "OPTIONAL_WORK_DECIDED", accepted: false })}>Keep the Saturdays</button>
          </div>
          <p className="decision-note">Four Saturdays that were Avery’s. The money is real and so is the tiredness.</p>
        </section>
        <section className="opportunity-card">
          <p className="eyebrow">Your call · The $800 bonus</p>
          <h2>Is it still in the plan?</h2>
          <p>Avery has made every practice and every game so far. Three weeks left, and the brace does not change the rule: miss one and the bonus is gone.</p>
          <ol className="saturdays" aria-label="Weeks left to keep the attendance bonus">
            {[6, 7, 8].map((week) => <li key={week} data-state="pending"><span>Week {week}</span><b>Every session</b></li>)}
          </ol>
          <dl className="tradeoff-pair">
            <div><dt>Count it</dt><dd>More to work with, and one more thing that has to go right</dd></div>
            <div><dt>Leave it out</dt><dd>Less to work with, nothing left to lose</dd></div>
          </dl>
          <div className="binary-choice">
            <button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>Count the $800</button>
            <button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>Plan without it</button>
          </div>
          <p className="decision-note">Count it and you will be asked to show the plan still works if it never comes.</p>
        </section>
      </div>
      {ready ? <div ref={revealRef}><PlanBoardForMode mode="final" /></div> : <p className="board-gate">Make both calls above to open the final board.</p>}
    </StageShell>
  );
}

/** Beat 11. The season review: Avery's numbers, put to work as the student's argument. */
function DefenseStage() {
  const { state, dispatch } = useChallenge();
  const [selected, setSelected] = useState<string[]>(state.defense.tileIds);
  const [text, setText] = useState(state.defense.text);
  const final = amountsFor(state, "final");
  const finalInput = snapshotForMode(state, "final");
  // Every chip is derived from the student's own saved plan, and any chip worth $0
  // is dropped rather than offered as misleading evidence.
  const tiles = [
    { id: "final-funds", label: "Cash in your final plan", value: finalInput ? availableFor(finalInput, SCENARIO_NUMBERS) : 0 },
    { id: "week5-cost", label: "New Week 5 bills", value: state.setupId ? SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[state.setupId] : SCENARIO_NUMBERS.requiredWeek5Cost },
    { id: "course", label: "Saved for the course", value: final.goal },
    { id: "reserve", label: "Backup money kept", value: final.reserve },
    { id: "flex", label: "Left for anything else", value: final.flexibleCash },
    ...(state.income.includeCompletionFinal ? [{ id: "completion", label: "$800 bonus still counted on", value: SCENARIO_NUMBERS.completionIncome as number }] : []),
    ...(state.income.includeOptionalWork ? [{ id: "clinic", label: "Earned from the clinics", value: SCENARIO_NUMBERS.optionalWorkIncome as number }] : []),
  ].filter((tile) => tile.value > 0);
  const canSubmit = selected.length >= 2 && selected.length <= 3 && text.trim().length >= 40;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  return (
    <StageShell stage="defense" kicker="Week 8" title="Make the case for your plan.">
      <div className="interview">
        <section className="interview__ask scene">
          <CourtBackdrop variant="key" />
          <p className="eyebrow">Season review</p>
          <h2>Why does your plan hold up?</h2>
          <p>Say how it works after Week 5, what you protected, and what you gave up.</p>
          <div className="interview__stats">
            <p className="field-label">Pick 2 or 3 of your own numbers</p>
            {tiles.map((tile) => (
              <button key={tile.id} type="button" aria-pressed={selected.includes(tile.id)} onClick={() => toggle(tile.id)}>
                <span>{tile.label}</span><MoneyAmount value={tile.value} />
              </button>
            ))}
          </div>
        </section>
        <section className="interview__answer">
          <div className="sentence-starters">
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}My plan still works because `)}>My plan still works…</button>
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I protected `)}>I protected…</button>
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I gave up `)}>I gave up…</button>
          </div>
          <label htmlFor="defense-text">Two to four sentences</label>
          <textarea id="defense-text" value={text} onChange={(event) => setText(event.target.value)} rows={9} placeholder="My plan still works because…" />
          <footer>
            <p aria-live="polite">{selected.length < 2 ? `Pick ${2 - selected.length} more number${selected.length === 1 ? "" : "s"}. ` : "Numbers ready. "}{text.trim().length < 40 ? `${40 - text.trim().length} more character${40 - text.trim().length === 1 ? "" : "s"} to go.` : "Long enough to turn in."}</p>
            <Button aria-disabled={!canSubmit} onClick={() => canSubmit && dispatch({ type: "DEFENSE_SUBMITTED", tileIds: selected, text })}>Turn in my plan</Button>
          </footer>
        </section>
      </div>
    </StageShell>
  );
}

/**
 * Beat 12. The student's own version of the eight weeks, replayed. Two students who both
 * finished with a working plan should still see two different stories here.
 */
function SubmittedStage() {
  const { state, reset } = useChallenge();
  const final = amountsFor(state, "final");
  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === state.setupId);
  const goalShare = Math.min(100, Math.round((final.goal / SCENARIO_NUMBERS.goalCap) * 100));
  const clinics = state.income.includeOptionalWork === true;
  // Avery signs off with facts from the student's own run, in Avery's own voice. It
  // states what happened and never says whether it was the right way to play it.
  const closing = [
    setup ? `Eight weeks at the ${setup.title}, ${setup.commuteMinutes * 2} minutes of travel a day.` : null,
    clinics ? "Four Saturdays coaching instead of resting." : "I kept my Saturdays.",
    final.goal > 0 ? `${formatDollars(final.goal)} put away for the course.` : "Nothing left over for the course this time.",
  ].filter(Boolean).join(" ");
  const weeks = [
    { week: 1, tone: "played", text: setup ? `Avery moves into the ${setup.title}` : "Avery moves in" },
    { week: 2, tone: "played", text: "First start" },
    { week: 3, tone: "played", text: "Rent, food and phone clear" },
    { week: 4, tone: "played", text: "Most minutes on the roster" },
    { week: 5, tone: "shock", text: "Showcase cancelled · brace and rehab" },
    { week: 6, tone: clinics ? "work" : "played", text: clinics ? "Saturday clinic" : "Saturday kept for rehab" },
    { week: 7, tone: clinics ? "work" : "played", text: clinics ? "Saturday clinic" : "Saturday kept for rehab" },
    { week: 8, tone: "end", text: clinics ? "Last clinic · season closes" : "Season closes" },
  ];
  return (
    <StageShell stage="submitted" kicker="Turned in" title="Avery’s eight weeks, your version.">
      <section className="recap scene">
        <CourtBackdrop />
        <div className="recap__grid">
          <div>
            <RosterCard {...(setup ? { note: `Lived at the ${setup.title} · ${setup.commuteMinutes * 2} min a day` } : {})} />
            <div className="recap__goal">
              <p className="field-label">Sports-media course</p>
              <strong className="money">{formatDollars(final.goal)}</strong>
              <span>of {formatDollars(SCENARIO_NUMBERS.goalCap)}</span>
              {/* The meter states the amount and stops there. A percentage would read as a
                  score, and how much a student put toward the course is a strategy. */}
              <span className="recap__meter" aria-hidden="true"><i style={{ width: `${goalShare}%` }} /></span>
            </div>
            <dl className="recap__numbers">
              <div><dt>Backup money</dt><dd className="money">{formatDollars(final.reserve)}</dd></div>
              <div><dt>Anything else</dt><dd className="money">{formatDollars(final.flexibleCash)}</dd></div>
            </dl>
          </div>
          <div>
            <ol className="recap__timeline">
              {weeks.map((entry) => <li key={entry.week} data-tone={entry.tone}><b>Week {entry.week}</b><span>{entry.text}</span></li>)}
            </ol>
            <blockquote className="post__voice post__voice--scene recap__closing">
              <span className="post__who" aria-hidden="true">{BASKETBALL_SCENARIO.offer.jersey}</span>
              <p>{closing}</p>
            </blockquote>
            <ul className="recap__decisions">
              <li><span>Saturdays</span>{clinics ? "Four clinics, +$500" : "Kept for rest and rehab"}</li>
              <li><span>$800 bonus</span>{state.income.includeCompletionFinal ? "Still counted, and shown to work without it" : "Left out of the plan"}</li>
            </ul>
          </div>
        </div>
      </section>
      <div className="stage-action">
        <p>Your explanation goes to a person, not a computer. Software can check whether the money works. It should not decide whether your thinking makes sense.</p>
        <div className="stage-action__pair">
          <Button variant="quiet" onClick={reset}>Start over</Button>
        </div>
      </div>
    </StageShell>
  );
}

export function StudentChallenge() {
  const { state } = useChallenge();
  return useMemo(() => {
    switch (state.stage) {
      case "entry": case "join": return <OpeningStage />;
      // Restored only when a second world ships; the reducer routes past it today.
      case "choose-world": return <OpeningStage />;
      // Retired as its own screen — resumed sessions saved on it land on the deal.
      case "the-offer": return <DealStage />;
      case "role-contract": return <DealStage />;
      case "setup-comparison": return <SetupStage />;
      case "working-plan": return <WorkingStage />;
      case "fallback-version": return <PlanStage mode="fallback" kicker="Before the season" title="What if the bonus never shows up?" deck="Your plan counts on money Avery does not have yet. Build the version that works without it." />;
      // Retired as its own screen — a plan with no bonus money now starts the season directly.
      case "income-check": return <Week5TransitionStage />;
      case "week5-transition": return <Week5TransitionStage />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <PlanStage mode="week5-first-response" kicker="Week 5 · First response" title="Fix what you can with what Avery has." deck="No new money. Move your own numbers as far as they go." />;
      case "opportunity-final-repair": return <FinalRepairStage />;
      case "remaining-risk-preview": return <PlanStage mode="remaining-risk" kicker="Week 5 · Last check" title="Test the plan without the $800." deck="Same plan, bonus removed. If it never arrives, this is what Avery is living on." />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
    }
  }, [state.stage]);
}
