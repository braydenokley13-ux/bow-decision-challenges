import { useEffect, useMemo, useRef, useState } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CalculationInput } from "../components/primitives/CalculationInput";
import { MoneyAmount } from "../components/primitives/MoneyAmount";
import { PlanBoard, type BoardVariant } from "../components/financial/PlanBoard";
import { AdjustPanel, type SupplyChange } from "../components/financial/AdjustPanel";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { RosterCard } from "../components/story/RosterCard";
import { dollars, formatDollars, type Dollars } from "../domain/core/money";
import type { CalcId, CategoryId, SetupId } from "../domain/core/ids";
import type { PlanMode } from "../domain/finance/types";
import { availableFor, lockedFor, week5Change } from "../domain/finance/formulas";
import { planConsequences } from "../domain/finance/consequences";
import { PLAN_MODES } from "../domain/finance/modes";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { essentialsExpectation, incomeAmount, reliableFloorExpectation, setupCostOrder } from "../domain/scenario/expectations";
import { bonusWeeks, clinicWeeks } from "../domain/scenario/season";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { amountsFor, meaningfulAttempts, snapshotForMode } from "../domain/machine/selectors";
import { STUDENT_COPY } from "../content/studentCopy";
import { CODE_LENGTH, isWellFormedClassCode, isWellFormedSeatCode, normaliseSeatCode } from "../platform/classes/codes";
import { SeasonWeeks } from "./SeasonWeeks";
import { Week8Resolution } from "./Week8Resolution";

const BONUS_WEEKS = bonusWeeks(SCENARIO_NUMBERS);
const CLINIC_WEEKS = clinicWeeks(SCENARIO_NUMBERS);

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
function useRevealOnce<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const ref = useRef<T>(null);
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
  const { dispatch, transport } = useChallenge();
  const { offer, numbers } = BASKETBALL_SCENARIO;
  const [classCode, setClassCode] = useState("");
  const [seatCode, setSeatCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [joinedLabel, setJoinedLabel] = useState<string | null>(null);
  // The codes are checked for shape here and for existence by the transport. Neither is
  // prefilled: a default class code that happened to resolve would start a room of
  // students in somebody else's class.
  const valid = isWellFormedClassCode(classCode) && isWellFormedSeatCode(seatCode);

  const start = async () => {
    if (!valid || joining) return;
    setJoining(true);
    setProblem(null);
    const result = await transport.join(classCode);
    setJoining(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setJoinedLabel(result.joined.record?.label ?? null);
    // One assignment per class today, so there is nothing to choose between and no screen
    // asking a question with one answer. Which one this seat is doing still gets recorded,
    // because the class knows and the submission is where that has to survive.
    const assignment = result.joined.assignments.find((entry) => entry.allowedWorldIds.includes("basketball"))
      ?? result.joined.assignments[0];
    dispatch({
      type: "SESSION_STARTED",
      sessionId: crypto.randomUUID(),
      classCode: result.joined.classCode,
      seatCode: normaliseSeatCode(seatCode),
      ...(assignment ? { assignmentId: assignment.id } : {}),
    });
  };

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
              <label>
                Class code
                <input
                  value={classCode}
                  onChange={(event) => { setClassCode(event.target.value.toUpperCase()); setProblem(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter") void start(); }}
                  maxLength={CODE_LENGTH}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-describedby="join-status"
                />
              </label>
              <label>
                Seat
                <input
                  value={seatCode}
                  onChange={(event) => { setSeatCode(normaliseSeatCode(event.target.value)); setProblem(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter") void start(); }}
                  inputMode="numeric"
                  maxLength={2}
                  autoComplete="off"
                  aria-describedby="join-status"
                />
              </label>
            </div>
            <Button type="button" aria-disabled={!valid || joining} onClick={() => void start()}>
              {joining ? "Checking the code…" : "Start the eight weeks"}
            </Button>
            {/* One live region for every outcome, so a screen reader hears the result of
                joining rather than only sighted students seeing it. */}
            <p id="join-status" className={`join-status${problem ? " join-status--problem" : ""}`} aria-live="polite">
              {problem ?? joinedLabel ?? (transport.requiresClass
                ? "Your teacher gives you the class code and your seat number."
                : transport.promise)}
            </p>
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
  const { offer, incomeCopy, numbers } = BASKETBALL_SCENARIO;
  const weekly = Math.round(numbers.basePay / numbers.weeks / 10) * 10;
  const lines = [
    { tone: "safe", key: "savings" as const, rule: "In the account", detail: "Avery has it now." },
    { tone: "safe", key: "base" as const, rule: `Across the ${numbers.weeks} weeks`, detail: `About ${formatDollars(weekly)} a week, win or lose.` },
    { tone: "maybe", key: "completion" as const, rule: "Only if", detail: incomeCopy.completion.rule ?? "" },
    { tone: "maybe", key: "outcome" as const, rule: "Only if", detail: incomeCopy.outcome.rule ?? "" },
  ].map((line) => ({ ...line, label: incomeCopy[line.key].label, amount: formatDollars(incomeAmount(numbers, line.key)) }));
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
                <div key={line.key} className="contract__line">
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
          <p className="stage-deck">That is the order. Now pick where Avery lives, and work out what it costs.</p>
          <div className="setup-grid">
            {setups.map((setup, index) => (
              <article key={setup.id} className={`place-card ${state.setupId === setup.id ? "is-selected" : ""}`}>
                <div className="place-card__scene" data-place={setup.id}>
                  <CourtBackdrop variant={index === 0 ? "key" : "half"} />
                  <span className="place-card__option">Option {String.fromCharCode(65 + index)}</span>
                  <b className="place-card__name">{setup.title}</b>
                </div>
                {/* The eight-week totals stay off the cards until the student has worked one
                    out. They used to be printed here beside a box asking for the very same
                    number, which made the only question on this screen a copying exercise
                    and made the micro-skill behind it worth nothing. */}
                {totalEntered ? (
                  <div className="given-total">
                    <span>Eight weeks</span>
                    <MoneyAmount value={setup.total} />
                  </div>
                ) : (
                  <div className="given-total given-total--terms">
                    <span>The terms</span>
                    <b>{setup.terms}</b>
                  </div>
                )}
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

/** The plan a mode starts from: what the student last committed before this moment. */
function baselineFor(state: ReturnType<typeof useChallenge>["state"], mode: PlanMode) {
  switch (mode) {
    case "fallback": return amountsFor(state, "working");
    case "week5-first-response": return amountsFor(state, state.saved.fallback ? "fallback" : "working");
    case "final": return amountsFor(state, "week5-first-response");
    case "remaining-risk": return amountsFor(state, "final");
    case "working": return undefined;
  }
}

/**
 * Everything the five money moments share: the priced snapshot, the plan they started
 * from, and the four dispatches. What differs between them is the instrument, which is the
 * whole point of them being separate components.
 */
function usePlanWiring(mode: PlanMode) {
  const { state, dispatch } = useChallenge();
  const input = snapshotForMode(state, mode);
  const baseline = baselineFor(state, mode);

  const setAmount = (category: CategoryId, amount: Dollars) => dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount });
  const assignRemainder = (category: CategoryId, amount: Dollars) => dispatch({ type: "PLAN_REMAINDER_ASSIGNED", mode, category, amount });
  const restore = (category?: CategoryId) => {
    if (!baseline) return;
    for (const key of category ? [category] : CHOICE_KEYS) setAmount(key, baseline[key]);
  };

  /**
   * Supplies one balanced plan without expressing a preference between the three
   * categories: the money is split as evenly as the step size allows, and only the course
   * goal's own cap redirects anything. The student receives no credit for this plan, so it
   * must not model a "correct" set of priorities.
   */
  const supplyOneBalancedPlan = () => {
    if (!input) return;
    const step = PLAN_MODES[mode].increment;
    const spendable = Math.max(0, availableFor(input, SCENARIO_NUMBERS) - lockedFor(input, SCENARIO_NUMBERS));
    const caps: Record<CategoryId, number> = { goal: SCENARIO_NUMBERS.goalCap, reserve: Infinity, flexibleCash: Infinity };
    const amounts: Record<CategoryId, number> = { goal: 0, reserve: 0, flexibleCash: 0 };

    // Deal the money out one step at a time, always to whichever category currently holds
    // the least, so no category is favoured by the order of the loop.
    for (let left = spendable; left >= step; left -= step) {
      const target = CHOICE_KEYS
        .filter((category) => amounts[category] + step <= caps[category])
        .sort((a, b) => amounts[a] - amounts[b])[0];
      if (!target) break;
      amounts[target] += step;
    }
    const remainder = spendable - (amounts.goal + amounts.reserve + amounts.flexibleCash);
    if (remainder > 0) amounts.flexibleCash += remainder;

    dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: mode });
    for (const category of CHOICE_KEYS) setAmount(category, dollars(amounts[category]));
    dispatch({ type: "PLAN_SAVE_REQUESTED", mode });
  };

  return {
    state,
    input,
    baseline,
    attempts: meaningfulAttempts(state, mode),
    notes: input ? planConsequences(input, SCENARIO_NUMBERS) : null,
    setAmount,
    assignRemainder,
    restore,
    supplyOneBalancedPlan,
    commit: (acknowledgedResidual?: Dollars) =>
      dispatch({ type: "PLAN_SAVE_REQUESTED", mode, ...(acknowledgedResidual !== undefined ? { acknowledgedResidual } : {}) }),
    lockedMove: (lockedCardId: string) => dispatch({ type: "LOCKED_MOVE_ATTEMPTED", mode, lockedCardId }),
    scaffold: () => dispatch({ type: "SCAFFOLD_OPENED", interactionId: mode }),
  };
}

const CHOICE_KEYS = ["goal", "reserve", "flexibleCash"] as const;

/** The full board. Only the first plan and the Week 5 triage get one. */
function BoardForMode({ mode, variant, commitLabel, change }: {
  mode: PlanMode;
  variant: BoardVariant;
  commitLabel: string;
  change?: { headline: string; items: readonly string[] };
}) {
  const wiring = usePlanWiring(mode);
  const { input, notes, state } = wiring;
  if (!input || !notes || !state.setupId) return null;
  const setupTitle = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === state.setupId)?.title ?? "Selected setup";
  return (
    <PlanBoard
      input={input}
      variant={variant}
      setupTitle={setupTitle}
      baseline={wiring.baseline}
      reference={variant === "triage" ? wiring.baseline : undefined}
      attempts={wiring.attempts}
      notes={notes}
      commitLabel={commitLabel}
      onAmountChange={wiring.setAmount}
      onAssignRemainder={wiring.assignRemainder}
      onLockedMoveAttempt={wiring.lockedMove}
      onCommit={wiring.commit}
      onScaffold={wiring.scaffold}
      onShowAndContinue={wiring.supplyOneBalancedPlan}
      {...(change ? { change } : {})}
      {...(variant === "triage" ? { onApplyReference: wiring.restore } : {})}
    />
  );
}

/** The compact instrument. Every moment after the first plan that is only an adjustment. */
function AdjustForMode({ mode, eyebrow, headline, lead, changes, commitLabel }: {
  mode: PlanMode;
  eyebrow: string;
  headline: string;
  lead: string;
  changes: readonly SupplyChange[];
  commitLabel: string;
}) {
  const wiring = usePlanWiring(mode);
  const { input, notes, baseline } = wiring;
  if (!input || !notes || !baseline) return null;
  return (
    <AdjustPanel
      input={input}
      baseline={baseline}
      changes={changes}
      eyebrow={eyebrow}
      headline={headline}
      lead={lead}
      notes={notes}
      commitLabel={commitLabel}
      attempts={wiring.attempts}
      onAmountChange={wiring.setAmount}
      onCommit={wiring.commit}
      onRestore={() => wiring.restore()}
      onScaffold={wiring.scaffold}
      onShowAndContinue={wiring.supplyOneBalancedPlan}
    />
  );
}

/** The two conditional payments, as the cards the student either counted or did not. */
const BETS = [
  ["completion-800", "completion"],
  ["outcome-1000", "outcome"],
] as const;

/**
 * Beat 4 and 5, on one screen.
 *
 * Read the money, decide what to count, split what is left — and then, if any of it was
 * bonus money, watch that money leave and put the plan back together without it.
 *
 * The backup version used to be its own screen with its own copy of the whole board, which
 * made it the second of five near-identical planning passes. It is not a second plan. It
 * is the same plan with a hole in it, and the way to make a student feel that is to take
 * the money out of the plan they are looking at rather than hand them a fresh form. The
 * cards they pressed "Count it" on stay on screen and get struck through, the totals they
 * worked out stay where they were, and only the rows change. It is still a separate stage
 * — the evidence, the grader and the educator view all depend on that — but it is no
 * longer a separate screen.
 */
function WorkingStage() {
  const { state, dispatch } = useChallenge();
  const backup = state.stage === "fallback-version";
  const floorReady = state.calculations["reliable-floor"]?.correct === true;
  const essentialsReady = state.calculations["essentials-total"]?.correct === true;
  const counted = floorReady && essentialsReady;
  const revealRef = useRevealOnce(counted);
  // The screen does not change when the bonus is pulled, so the moment it happens has to
  // bring itself into view — otherwise a student who saved from the bottom of the board is
  // left staring at a footer while the drama happens above them.
  const pullRef = useRevealOnce<HTMLElement>(backup);
  const input = snapshotForMode(state, "working");
  if (!input || !state.setupId) return null;

  const removed: SupplyChange[] = ([
    ...(state.income.includeOutcome ? ["outcome" as const] : []),
    ...(state.income.includeCompletion ? ["completion" as const] : []),
  ]).map((key) => ({
    id: key,
    label: BASKETBALL_SCENARIO.incomeCopy[key].label,
    amount: incomeAmount(SCENARIO_NUMBERS, key),
    direction: "out" as const,
  }));

  return (
    <StageShell
      stage={backup ? "fallback-version" : "working-plan"}
      kicker={backup ? "The same plan, without the bonus" : "Build the plan"}
      title={backup ? "That money never arrives." : STUDENT_COPY.working.title}
    >
      {counted ? (
        <div className="counted-strip" aria-label="What you worked out">
          <div><span>Safe cash</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.reliableFloor)}</strong></div>
          <div><span>8-week essentials</span><strong className="money">{formatDollars(SCENARIO_NUMBERS.essentialsTotal)}</strong></div>
        </div>
      ) : (
        <>
          <p className="stage-deck">{STUDENT_COPY.working.deck}</p>
          <div className="working-setup">
            <CalculationInput
              calcId="reliable-floor"
              label={STUDENT_COPY.working.safeMoney.title}
              prompt={`${formatDollars(SCENARIO_NUMBERS.savings)} saved + ${formatDollars(SCENARIO_NUMBERS.basePay)} base pay`}
              terms={STUDENT_COPY.working.safeMoney.body}
              expected={reliableFloorExpectation(SCENARIO_NUMBERS)}
              priorAttempts={state.calculations["reliable-floor"]?.attempts}
              onSubmit={(raw, value, correct) => submitCalculation(dispatch, "reliable-floor", raw, value, correct)}
              scaffold={`Add the two safe amounts: ${formatDollars(SCENARIO_NUMBERS.savings)} + ${formatDollars(SCENARIO_NUMBERS.basePay)}. Do not add either bonus yet.`}
              {...calculationSupport(dispatch, "reliable-floor")}
            />
            <CalculationInput
              calcId="essentials-total"
              label={STUDENT_COPY.working.mustPay.title}
              prompt={`${formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)} a week × ${SCENARIO_NUMBERS.weeks} weeks`}
              terms={STUDENT_COPY.working.mustPay.body}
              expected={essentialsExpectation(SCENARIO_NUMBERS)}
              priorAttempts={state.calculations["essentials-total"]?.attempts}
              onSubmit={(raw, value, correct) => submitCalculation(dispatch, "essentials-total", raw, value, correct)}
              scaffold={`Multiply ${formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)} by ${SCENARIO_NUMBERS.weeks} weeks. Think: ${Array.from({ length: SCENARIO_NUMBERS.weeks }, () => formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)).join(" + ")}.`}
              {...calculationSupport(dispatch, "essentials-total")}
            />
          </div>
        </>
      )}
      {counted && (
        <div ref={revealRef} className="staged-reveal">
          <section ref={pullRef} className="bets" data-settled={backup} aria-labelledby="maybe-money-heading">
            <div className="bets__intro">
              <p className="field-label">{backup ? "Neither of these arrived" : STUDENT_COPY.working.maybeMoney.title}</p>
              <h2 id="maybe-money-heading">
                {backup
                  ? `${formatDollars(removed.reduce((sum, item) => sum + item.amount, 0))} leaves the plan.`
                  : STUDENT_COPY.working.maybeMoney.body}
              </h2>
            </div>
            {BETS.map(([sourceId, key]) => {
              const included = key === "completion" ? state.income.includeCompletion : state.income.includeOutcome;
              return (
                <article key={sourceId} className="bet" data-counted={included} data-struck={backup && included}>
                  <div className="bet__head">
                    <b>{BASKETBALL_SCENARIO.incomeCopy[key].label}</b>
                    <strong className="money">{formatDollars(incomeAmount(SCENARIO_NUMBERS, key))}</strong>
                  </div>
                  <p className="bet__rule">Only if {BASKETBALL_SCENARIO.incomeCopy[key].rule}</p>
                  {backup ? (
                    <p className="bet__verdict">{included ? "You counted it. Take it back out." : "You left it out. Nothing changes here."}</p>
                  ) : (
                    <div className="binary-choice">
                      <button type="button" aria-pressed={included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: true })}>Count it</button>
                      <button type="button" aria-pressed={!included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: false })}>Leave it out</button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
          {backup ? (
            <AdjustForMode
              mode="fallback"
              eyebrow="Backup plan"
              headline="Put the plan back together without it."
              lead="Rent, essentials and where Avery lives do not change. Only your three amounts can move."
              changes={removed}
              commitLabel="Save the backup plan"
            />
          ) : (
            <BoardForMode mode="working" variant="build" commitLabel="Save this version" />
          )}
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
      ? [{ id: "lost-outcome", kind: "lost" as const, label: BASKETBALL_SCENARIO.incomeCopy.outcome.label, detail: "You counted this. It is gone.", amount: SCENARIO_NUMBERS.outcomeIncome as number }]
      : []),
    { id: "required-cost", kind: "bill" as const, label: BASKETBALL_SCENARIO.disruption.requiredCostLabel, detail: "Required. Not optional.", amount: SCENARIO_NUMBERS.requiredWeek5Cost as number },
    ...(setup.eventCost > 0
      ? [{ id: "setup-cost", kind: "bill" as const, label: `Travel to rehab · ${setup.title}`, detail: setup.eventCostLabel, amount: setup.eventCost as number }]
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
          <h2>Pull out the pieces that hit your plan.</h2>
          <p>Not all of these are in it. Select the ones that are, then add them up.</p>
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

/**
 * Beat 8. The only other moment that earns the whole board.
 *
 * Everything in the plan is already committed and a bill has landed on top of it. There is
 * no new money and no new information — the only question left is what Avery gives up, and
 * that is a question about all three amounts at once, which is what the board is for. The
 * rows carry what each one currently buys, so cutting the course row says how far short of
 * the course it puts Avery and cutting the time row says how many hours a week Avery gets
 * back on the bus. This is the hardest screen in the product and it is meant to be.
 */
function TriageStage() {
  const { state } = useChallenge();
  if (!state.setupId) return null;
  const week5Bills = SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[state.setupId];
  const outcomeLabel = BASKETBALL_SCENARIO.incomeCopy.outcome.label;
  return (
    <StageShell stage="first-response" kicker="Week 5 · First response" title="Something has to give.">
      <p className="stage-deck">No new money is coming. Everything below is money you already promised somewhere else.</p>
      <BoardForMode
        mode="week5-first-response"
        variant="triage"
        commitLabel="Lock in what Avery gives up"
        change={{
          headline: "Week 5 landed on the plan you built.",
          items: [
            ...(state.income.includeOutcome ? [`The ${formatDollars(SCENARIO_NUMBERS.outcomeIncome)} ${outcomeLabel} is gone`] : []),
            `${formatDollars(week5Bills)} of brace, rehab and travel is now locked in`,
          ],
        }}
      />
    </StageShell>
  );
}

/** The last four Saturdays of the season, drawn, so the tradeoff is not only a sentence. */
function SaturdayBlocks({ decision }: { decision: boolean | null }) {
  return (
    <ol className="saturdays" aria-label={`Avery's last ${CLINIC_WEEKS.length} Saturdays`}>
      {CLINIC_WEEKS.map((week) => (
        <li key={week} data-state={decision === null ? "open" : decision ? "clinic" : "rest"}>
          <span>Sat · wk {week}</span>
          <b>{decision === null ? "Open" : decision ? "Clinic" : "Avery’s"}</b>
        </li>
      ))}
    </ol>
  );
}

/**
 * Beat 9, 10 and 11, on one screen.
 *
 * Two calls change what there is to work with; the plan absorbs the change; and if the
 * student is still counting on the attendance bonus, the same screen immediately takes it
 * away and asks them to show the plan holds without it.
 *
 * That last part used to be a fifth full planning board on its own screen, which is the
 * worst possible place for it: a student who has just committed to counting on the bonus
 * gets a screen change, a new headline and a rebuilt board before finding out what that
 * commitment costs them. Here the consequence arrives on the screen where the choice was
 * made, two seconds later, and their two calls stay visible above it as the reason.
 */
function FinalRepairStage() {
  const { state, dispatch } = useChallenge();
  const { opportunity, incomeCopy } = BASKETBALL_SCENARIO;
  const preview = state.stage === "remaining-risk-preview";
  const completionDecided = state.log.some((event) => event.type === "COMPLETION_INCOME_DECIDED");
  const ready = state.income.includeOptionalWork !== null && completionDecided;
  const revealRef = useRevealOnce(ready);
  // Same reason as the backup version: the screen stays, so the moment has to arrive.
  const checkRef = useRevealOnce<HTMLDListElement>(preview);
  const clinics = state.income.includeOptionalWork === true;
  const bonusLabel = incomeCopy.completion.label;

  // What the two calls actually did to the money, against the plan the student landed at
  // the first response. Only moves that happened are listed; nothing here is worth $0.
  const finalChanges: SupplyChange[] = [
    ...(state.income.includeCompletionFinal && !state.income.includeCompletion
      ? [{ id: "bonus-in", label: `${bonusLabel} back in the plan`, amount: Number(SCENARIO_NUMBERS.completionIncome), direction: "in" as const }] : []),
    ...(!state.income.includeCompletionFinal && state.income.includeCompletion
      ? [{ id: "bonus-out", label: `${bonusLabel} out of the plan`, amount: Number(SCENARIO_NUMBERS.completionIncome), direction: "out" as const }] : []),
    ...(clinics
      ? [
          { id: "clinic-fee", label: incomeCopy.optionalWork.label, amount: Number(SCENARIO_NUMBERS.optionalWorkIncome), direction: "in" as const },
          { id: "clinic-cost", label: "Getting there, and the physio a tired body needs", amount: Number(SCENARIO_NUMBERS.optionalWorkCost), direction: "out" as const },
        ] : []),
  ];

  return (
    <StageShell
      stage={preview ? "remaining-risk-preview" : "opportunity-final-repair"}
      kicker={preview ? "Week 5 · Last check" : "Week 5 · Two calls"}
      title={preview ? `Now show it works without the ${formatDollars(SCENARIO_NUMBERS.completionIncome)}.` : "Two calls, then land the plan."}
    >
      {preview ? (
        <dl ref={checkRef} className="settled-calls" aria-label="The two calls you made">
          <div>
            <dt>The Saturdays</dt>
            <dd>{clinics ? `Coaching. +${formatDollars(SCENARIO_NUMBERS.optionalWorkIncome)}, and the rest block is gone.` : "Kept. No extra money, no extra hours."}</dd>
          </div>
          <div data-alert="true">
            <dt>The {bonusLabel}</dt>
            <dd>Counted. Which means {formatDollars(SCENARIO_NUMBERS.completionIncome)} of this plan depends on Avery making every session.</dd>
          </div>
        </dl>
      ) : (
        <div className="decision-row">
          {/* Once a call is made the paragraph that helped make it is spent, so it goes and
              the panel that shows the consequence moves up the screen. */}
          <section className="opportunity-card" data-decided={state.income.includeOptionalWork !== null}>
            <p className="eyebrow">Message · {opportunity.from}</p>
            <h2>{opportunity.title}</h2>
            {state.income.includeOptionalWork === null && <p>{opportunity.body}</p>}
            <div className="scale">
              <div className="scale__side">
                <span>Avery gains</span>
                <b className="scale__money money">+{formatDollars(SCENARIO_NUMBERS.optionalWorkIncome)}</b>
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
            <p className="decision-note">The money is real and so is the tiredness.</p>
          </section>
          <section className="opportunity-card" data-decided={completionDecided}>
            <p className="eyebrow">Your call · The {bonusLabel}</p>
            <h2>Is it still in the plan?</h2>
            {!completionDecided && <p>Avery has made every session so far. The brace does not change the rule: miss one and the bonus is gone.</p>}
            <ol className="saturdays" aria-label="Weeks left to keep the attendance bonus">
              {BONUS_WEEKS.map((week) => <li key={week} data-state="pending"><span>Week {week}</span><b>Every session</b></li>)}
            </ol>
            <div className="binary-choice">
              <button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>Count the {formatDollars(SCENARIO_NUMBERS.completionIncome)}</button>
              <button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>Plan without it</button>
            </div>
            <p className="decision-note">Count it and you will be asked to show the plan still works if it never comes.</p>
          </section>
        </div>
      )}

      {preview ? (
        <AdjustForMode
          mode="remaining-risk"
          eyebrow="Last check"
          headline="Take it out and see."
          lead="Same plan, same bills, that money gone. If it never arrives, this is what Avery is living on."
          changes={[{ id: "bonus", label: `${bonusLabel} — never arrives`, amount: Number(SCENARIO_NUMBERS.completionIncome), direction: "out" }]}
          commitLabel="Save this check"
        />
      ) : ready ? (
        <div ref={revealRef}>
          <AdjustForMode
            mode="final"
            eyebrow="Final plan"
            headline={finalChanges.length > 0 ? "Your calls moved the money." : "Your calls moved no money."}
            lead={finalChanges.length > 0
              ? "Everything else is where you left it in Week 5. Decide where this lands."
              : "The plan you landed in Week 5 still balances exactly. Check it and turn the corner."}
            changes={finalChanges}
            commitLabel="Save final plan"
          />
        </div>
      ) : (
        <p className="board-gate">Make both calls above, and the money moves.</p>
      )}
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
    ...(state.income.includeCompletionFinal ? [{ id: "completion", label: `${BASKETBALL_SCENARIO.incomeCopy.completion.label} still counted on`, value: SCENARIO_NUMBERS.completionIncome as number }] : []),
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
 * Beat 13. Turned in.
 *
 * This screen used to replay the eight weeks, which was the right idea in the wrong place —
 * Week 8 now resolves the season properly, and a second recap directly after it was the
 * same story told twice with less detail. What is left is the only thing the resolution
 * cannot say: where the work went, who reads it, and that a different plan would have
 * produced a different season.
 */
function SubmittedStage() {
  const { state, reset, transport, delivery, deliver } = useChallenge();
  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === state.setupId);
  // Sent once on arrival. The attempt is already safe in local storage, so a failure here
  // is something to retry rather than work that has been lost.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void deliver();
  }, [deliver]);

  const title = delivery.status === "delivered"
    ? "Your plan is with your teacher."
    : delivery.status === "failed"
      ? "Your plan is saved, but not sent yet."
      : "Sending your plan…";

  return (
    <StageShell stage="submitted" kicker="Turned in" title={title}>
      <section className="handed-in scene">
        <CourtBackdrop />
        <div className="handed-in__grid">
          <RosterCard {...(setup ? { note: `Eight weeks at the ${setup.title}` } : {})} />
          <div className="handed-in__body">
            <dl className="handed-in__where">
              <div><dt>Class</dt><dd>{state.meta.classCode || "—"}</dd></div>
              <div><dt>Seat</dt><dd>{state.meta.seatCode || "—"}</dd></div>
            </dl>
            {/* A delivery that did not happen is never drawn as one. Everything an educator
                sees downstream treats a submission as a fact about a student. */}
            <p className={`delivery delivery--${delivery.status}`} aria-live="polite">
              {delivery.status === "delivered" && transport.promise}
              {delivery.status === "sending" && "Sending it to your class now…"}
              {delivery.status === "idle" && "Getting ready to send…"}
              {delivery.status === "failed" && `${delivery.message} Your work is safe on this computer — try again, or leave this page open and tell your teacher.`}
            </p>
            {delivery.status === "failed" && delivery.retryable && (
              <Button type="button" variant="secondary" onClick={() => void deliver()}>Try sending again</Button>
            )}
            <p>
              Your explanation goes to a person, not a computer. Software can check whether the money
              works. It should not decide whether your thinking makes sense.
            </p>
          </div>
        </div>
      </section>
      <div className="stage-action">
        <p>Avery’s eight weeks would have gone differently on a different plan. You can run them again.</p>
        <div className="stage-action__pair">
          <Button variant="quiet" aria-disabled={delivery.status !== "delivered"} onClick={() => delivery.status === "delivered" && reset()}>
            Try a different plan
          </Button>
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
      // The backup version is the working plan with its bonus money taken out, so it is the
      // same screen reacting rather than a second board.
      case "working-plan": case "fallback-version": return <WorkingStage />;
      // Retired as their own screens — a plan with no bonus money starts the season
      // directly, and the passive Weeks 1–4 feed is now a season the student plays.
      case "income-check": case "week5-transition": case "season-weeks": return <SeasonWeeks />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <TriageStage />;
      // The no-bonus check happens on the screen where the bonus was counted.
      case "opportunity-final-repair": case "remaining-risk-preview": return <FinalRepairStage />;
      case "week8-resolution": return <Week8Resolution />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
    }
  }, [state.stage]);
}
