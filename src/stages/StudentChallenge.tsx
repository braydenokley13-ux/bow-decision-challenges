import { useEffect, useMemo, useRef, useState } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CalculationInput } from "../components/primitives/CalculationInput";
import { MoneyAmount } from "../components/primitives/MoneyAmount";
import { PlanBoard, type BoardVariant } from "../components/financial/PlanBoard";
import { PlanScene } from "../components/financial/PlanScene";
import { PlanLedger, type LedgerKnown } from "../components/financial/PlanLedger";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { AdjustPanel, type SupplyChange } from "../components/financial/AdjustPanel";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { RosterCard } from "../components/story/RosterCard";
import { dollars, formatDollars, type Dollars } from "../domain/core/money";
import { hours, hoursPerWeek } from "../domain/core/units";
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
import { planPosition, railStop, seedVisited, type PlanPosition } from "./planNavigation";
import { DepositDeadline, SeasonWeeks } from "./SeasonWeeks";
import { Week8Resolution } from "./Week8Resolution";
import { WorldChoice } from "./WorldChoice";
import { worldOffer } from "./worldOffer";
import { DEFAULT_WORLD_ID, PLAYABLE_WORLDS, WORLD_CHOICE_UI_READY } from "../domain/scenario/registry";
import { PopUpChallenge } from "./popup/PopUpChallenge";
import type { StageId } from "../domain/evidence/types";

const BONUS_WEEKS = bonusWeeks(SCENARIO_NUMBERS);
const CLINIC_WEEKS = clinicWeeks(SCENARIO_NUMBERS);
const PLAN_COPY = STUDENT_COPY.plan;

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
  const { state, dispatch, transport, setOffer } = useChallenge();
  const { offer, invitation, numbers } = BASKETBALL_SCENARIO;
  const [classCode, setClassCode] = useState("");
  const [seatCode, setSeatCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [joinedLabel, setJoinedLabel] = useState<string | null>(null);
  // The codes are checked for shape here and for existence by the transport. Neither is
  // prefilled: a default class code that happened to resolve would start a room of
  // students in somebody else's class.
  const valid = isWellFormedClassCode(classCode) && isWellFormedSeatCode(seatCode);
  // Whether a picker exists at all. The class decides whether it is offered, and that is not
  // known until the code is checked — but a build with one world can never show one, and a
  // build with two should not promise either before the student has chosen.
  const choosing = WORLD_CHOICE_UI_READY && PLAYABLE_WORLDS.length > 1;

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
    // The oldest assignment the class holds, which is the same one the service attributes a
    // submission to when a client names none. It used to be whichever assignment mentioned
    // Basketball — a rule that quietly answered the world question before the student had
    // been asked it.
    const assignment = result.joined.assignments[0];
    // What this class was set, carried to the picker so it does not have to ask again.
    setOffer(worldOffer({
      allowedWorldIds: assignment?.allowedWorldIds ?? [],
      assignmentAllowsChoice: assignment?.studentChoosesWorld ?? true,
      playableWorldIds: PLAYABLE_WORLDS.map((world) => world.id),
      pickerReady: WORLD_CHOICE_UI_READY,
      defaultWorldId: DEFAULT_WORLD_ID,
    }));
    dispatch({
      type: "SESSION_STARTED",
      sessionId: crypto.randomUUID(),
      classCode: result.joined.classCode,
      seatCode: normaliseSeatCode(seatCode),
      ...(assignment ? { assignmentId: assignment.id } : {}),
    });
  };

  return (
    <div className="opening" data-world={state.meta.worldId}>
      <div className="opening__bar">
        <AppMark />
        <span>Plan Under Pressure</span>
      </div>
      {/* The join card comes first in the source and stays on the right at laptop widths.
          Below 760px the columns stack in source order, which is the fix for the one screen
          where the thing a student has to do was entirely below the fold. */}
      <div className="opening__grid">
        {/* Avery, and the one thing Avery is playing for — but only where Avery is what the
            student is about to play. With a picker one screen away, this panel sold one of
            the two worlds before the student had been offered either, and a student who
            went on to choose the market had pressed a button promising eight weeks of
            basketball. Where there is a choice to make, the code is the story. */}
        <aside className="opening__side scene">
          {choosing ? (
            <p className="opening__span">{PLAYABLE_WORLDS.map((world) => world.title).join(" · ")}</p>
          ) : (
            <>
              <CourtBackdrop />
              <RosterCard />
              <div className="goal-strip">
                <strong className="money">{formatDollars(numbers.goalCap)}</strong>
                <div><b>{offer.want}</b><span>{offer.wantDetail}</span></div>
              </div>
              <p className="opening__span">Eight weeks · ends at the regional showcase</p>
            </>
          )}
          <div className="opening__job">
            <p className="stamp">Your class code gets you in</p>
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
              {joining ? "Checking the code…" : choosing ? "Go in" : "Start the eight weeks"}
            </Button>
            <hr className="perf-rule" />
            {/* One live region for every outcome, so a screen reader hears the result of
                joining rather than only sighted students seeing it. */}
            <p id="join-status" className={`join-status${problem ? " join-status--problem" : ""}`} aria-live="polite">
              {problem ?? joinedLabel ?? (transport.requiresClass
                ? "Your teacher gives you the class code and your seat number."
                : transport.promise)}
            </p>
            {/* A student who found BOW without a code used to meet a form they could not
                fill in and nothing else. One line, and it says where the code comes from. */}
            <p className="no-code">{STUDENT_COPY.join.noCode}</p>
            <p className="privacy-note">{STUDENT_COPY.join.privacy}</p>
          </div>
        </aside>
        {/* The story. It used to open with an 01/02/03 list of the decisions ahead — a
            syllabus handed over before any of it meant anything, and the thing that pushed
            the join card off a 640px screen. The card above says what the student is being
            asked to do; this says who they are doing it for. */}
        <section className="opening__story">
          {choosing ? (
            <>
              <p className="eyebrow">{STUDENT_COPY.join.chooseKicker}</p>
              <h1>{STUDENT_COPY.join.chooseHeadline}</h1>
              <p className="opening__lede">{STUDENT_COPY.join.chooseLede}</p>
            </>
          ) : (
            <>
              <p className="eyebrow">{invitation.kicker}</p>
              <h1>{invitation.headline}</h1>
              <p className="opening__lede"><strong>{offer.headline}</strong> {offer.body}</p>
              <p className="opening__role">{invitation.role}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Beat 2. The contract, and the two payments that come with a rule attached.
 *
 * This screen used to be a slide: four payments in two columns, every one of them already
 * available from "The four payments" in the top bar at any moment of the run, plus a legend
 * explaining a texture the eye could barely see. There was nothing on it a student could not
 * read somewhere else, which is the definition of a corridor.
 *
 * What the top bar cannot carry is the half of a conditional payment that matters: what has
 * to happen, and what it means for the season if it does not. So that is what this screen is
 * now — the certain money in one line, and the two conditions with their consequences stated,
 * which is the thing Question 2 will ask the student to take a position on.
 */
function DealStage() {
  const { dispatch } = useChallenge();
  const { offer, incomeCopy, numbers } = BASKETBALL_SCENARIO;
  const weekly = Math.round(numbers.basePay / numbers.weeks / 10) * 10;
  const certain = [
    { key: "savings" as const, when: "In the account", detail: "Avery has it now." },
    { key: "base" as const, when: `Across the ${numbers.weeks} weeks`, detail: `About ${formatDollars(weekly)} a week, win or lose.` },
  ].map((line) => ({ ...line, label: incomeCopy[line.key].label, amount: formatDollars(incomeAmount(numbers, line.key)) }));
  const conditional = (["completion", "outcome"] as const).map((key) => ({
    key,
    label: incomeCopy[key].label,
    amount: formatDollars(incomeAmount(numbers, key)),
    rule: incomeCopy[key].rule ?? "",
    ifNot: incomeCopy[key].ifNot ?? "",
  }));
  return (
    <StageShell stage="role-contract" kicker="The terms" title="Two of these payments have a rule.">
      <p className="stage-deck">
        Four payments in the contract. Two arrive whatever happens on the court. Two only arrive
        if something else does.
      </p>
      <div className="contract">
        <div className="contract__head">
          <b>{offer.team} · {numbers.weeks}-week terms</b>
          <span>Avery Reyes #{offer.jersey} · {offer.position}</span>
        </div>
        <div className="contract__columns">
          {/* The certain money, stated once and briefly. It is the base the whole plan is
              built on and the student works out its total two screens from here, so the
              screen names the two payments and never adds them up. */}
          <section className="contract__column" data-tone="safe">
            <p className="contract__tag">Avery will have this</p>
            {certain.map((line) => (
              <div key={line.key} className="contract__line">
                <b>{line.label}</b>
                <strong className="money">{line.amount}</strong>
                <span className="contract__rule"><em>{line.when}</em>{line.detail}</span>
              </div>
            ))}
          </section>
          {/* The conditions, and what each one costs the season when it is not met. This is
              the only place either sentence appears. */}
          <section className="contract__column" data-tone="maybe">
            <p className="contract__tag">Depends on something happening</p>
            {conditional.map((line) => (
              <div key={line.key} className="contract__line">
                <b>{line.label}</b>
                <strong className="money">{line.amount}</strong>
                <span className="contract__rule"><em>Only if</em>{line.rule}</span>
                <span className="contract__ifnot"><em>If it does not</em>{line.ifNot}</span>
              </div>
            ))}
          </section>
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
    <StageShell
      stage="setup-comparison"
      kicker="Where Avery stays"
      // One screen, two jobs, and they used to share a headline — so the page looked
      // identical before and after the only thing that had happened on it.
      title={ranked ? "Now pick where Avery lives." : "Which place costs the least?"}
    >
      {!ranked ? (
        <>
          <p className="stage-deck">
            Three places, three ways of paying. Put them in order, cheapest first —
            <strong> over all eight weeks</strong>, not per week.
          </p>
          <ol className="rank-list" data-checked={state.setupRanking ? (state.setupRanking.correct ? "right" : "wrong") : "unchecked"}>
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
          {/* A wrong order used to answer with the same bar, the same colour and the same
              position as the neutral hint it replaced — a twelve-year-old would not notice
              anything had happened. The panel changes state, the list is marked as needing
              another look, and the line says something true without naming the row. */}
          <div className="stage-action" data-state={state.setupRanking && !state.setupRanking.correct ? "wrong" : "neutral"}>
            {state.setupRanking && !state.setupRanking.correct
              ? (
                <p aria-live="assertive">
                  <b>Not that order.</b> One of these prices is for the whole eight weeks, not
                  for one week. Work out what each place costs across all {SCENARIO_NUMBERS.weeks} of them.
                </p>
              )
              : <p>Cheapest over eight weeks goes first.</p>}
            <Button type="button" onClick={checkOrder}>{state.setupRanking && !state.setupRanking.correct ? "Check it again" : "Check the order"}</Button>
          </div>
        </>
      ) : (
        <div ref={revealRef}>
          <p className="stage-deck">That is the order. Pick one, then add up what it costs Avery over the eight weeks.</p>
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
                    {/* The Gym District Sublet costs exactly one hour a week, so a hard-coded
                        "hours" here is a bug with a specific option's name on it. */}
                    <b>{hoursPerWeek(SCENARIO_NUMBERS.load.commuteBlocks[setup.id])}</b>
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
              ? <p aria-live="polite"><strong>{chosen.title}.</strong> {formatDollars(chosen.total)} of Avery’s money is spoken for, and {hours(SCENARIO_NUMBERS.load.commuteBlocks[chosen.id])} of every week belong to the trip.</p>
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
    scaffold: () => dispatch({ type: "SCAFFOLD_OPENED", interactionId: mode }),
  };
}

const CHOICE_KEYS = ["goal", "reserve", "flexibleCash"] as const;

/**
 * Avery's money, standing beside whatever is being decided.
 *
 * Every planning moment gets the same rail in the same place. It used to live inside two of
 * the five boards, which meant three of them asked a student to move money without showing
 * them any, and the two that did show it put it behind two thousand pixels of form.
 */
function PlanLedgerFor({ mode, known, placing }: { mode: PlanMode; known?: LedgerKnown; placing?: boolean }) {
  const { state, dispatch } = useChallenge();
  const input = snapshotForMode(state, mode);
  if (!input || !state.setupId) return null;
  const setupTitle = BASKETBALL_SCENARIO.setups.find((setup) => setup.id === state.setupId)?.title ?? "Selected setup";
  return (
    <PlanLedger
      input={input}
      setupTitle={setupTitle}
      onLockedMoveAttempt={(lockedCardId) => dispatch({ type: "LOCKED_MOVE_ATTEMPTED", mode, lockedCardId })}
      {...(known ? { known } : {})}
      {...(placing !== undefined ? { placing } : {})}
    />
  );
}

/** The full board. Only the first plan and the Week 5 triage get one. */
function BoardForMode({ mode, variant, commitLabel, lead, change }: {
  mode: PlanMode;
  variant: BoardVariant;
  commitLabel: string;
  lead: string;
  change?: { headline: string; items: readonly string[] };
}) {
  const wiring = usePlanWiring(mode);
  const { input, notes, state } = wiring;
  if (!input || !notes || !state.setupId) return null;
  return (
    <PlanBoard
      input={input}
      variant={variant}
      lead={lead}
      baseline={wiring.baseline}
      reference={variant === "triage" ? wiring.baseline : undefined}
      attempts={wiring.attempts}
      notes={notes}
      commitLabel={commitLabel}
      onAmountChange={wiring.setAmount}
      onAssignRemainder={wiring.assignRemainder}
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
/** The four questions, as a rail a student can read their position off and walk back down.
 *  Only questions they have opened read as done or clickable, plus the one real next
 *  question — a rail that marked unreached questions finished would be lying about where
 *  the student is, in the one place they look to find out. */
function PlanProgress({ position, onGo }: { position: PlanPosition; onGo: (index: number) => void }) {
  return (
    <ol className="plan-progress" aria-label="The four questions in this plan">
      {PLAN_COPY.map.map((name, index) => {
        const stop = railStop(index, position);
        const body = <><span className="plan-progress__number" aria-hidden="true">{index + 1}</span>{name}</>;
        return (
          <li key={name} data-state={stop.state} {...(index === position.at ? { "aria-current": "step" as const } : {})}>
            {stop.open
              ? <button type="button" onClick={() => onGo(index)}>{body}</button>
              : <span>{body}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function WorkingStage() {
  const { state, dispatch } = useChallenge();
  const backup = state.stage === "fallback-version";
  const floorReady = state.calculations["reliable-floor"]?.correct === true;
  const essentialsReady = state.calculations["essentials-total"]?.correct === true;
  // Where the student has got to, read off their own answers rather than off a counter, so
  // a refresh lands them back on the question they were actually looking at. From there,
  // `visited` grows only by actually opening a question — the answers open the door to the
  // next one, they do not walk through it.
  const bonusesAnswered = state.log.some((event) => event.type === "INCOME_SOURCE_TOGGLED");
  const seed = seedVisited({ floorReady, essentialsReady, bonusesAnswered });
  const [visited, setVisited] = useState(seed);
  const [wanted, setWanted] = useState(seed);
  const gates = { floorReady, essentialsReady };
  const position = planPosition({ wanted, visited, gates, questions: PLAN_COPY.map.length });
  const at = position.at;
  const go = (index: number) => {
    const target = Math.max(0, Math.min(index, position.reachable));
    setWanted(target);
    setVisited((current) => Math.max(current, target));
  };
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

  /**
   * The two conditional payments, as a question with two answers rather than a pair of
   * verbs. "Count it / Leave it out" asked a student to work out what counting meant; the
   * question names the consequence in the asking.
   */
  const bonusCards = (
    <section ref={pullRef} className="bets" data-settled={backup} aria-label={backup ? "Neither bonus arrived" : PLAN_COPY.steps.bonuses.name}>
      {BETS.map(([sourceId, key]) => {
        const included = key === "completion" ? state.income.includeCompletion : state.income.includeOutcome;
        return (
          <article key={sourceId} className="bet" data-counted={included} data-struck={backup && included}>
            <div className="bet__head">
              <b>{BASKETBALL_SCENARIO.incomeCopy[key].label}</b>
              <strong className="money">{formatDollars(incomeAmount(SCENARIO_NUMBERS, key))}</strong>
            </div>
            <p className="bet__rule">Avery only gets this if {BASKETBALL_SCENARIO.incomeCopy[key].rule}</p>
            {backup ? (
              <p className="bet__verdict">{included ? "You counted on it. Take it back out of the plan." : "You left it out, so nothing here changes."}</p>
            ) : (
              /* The question is asked once, at the head of the screen. It used to be printed
                 again inside each card, and a chip repeated whichever button was already
                 pressed — one question and one answer, said three times each. The pressed
                 button carries the state, which is what a pressed button is for. */
              <div className="binary-choice">
                <button type="button" aria-pressed={included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: true })}>{PLAN_COPY.steps.bonuses.yes}</button>
                <button type="button" aria-pressed={!included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: false })}>{PLAN_COPY.steps.bonuses.no}</button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );

  if (backup) {
    return (
      <StageShell stage="fallback-version" kicker={`The same plan, without ${removed.length > 1 ? "the bonuses" : "the bonus"}`} title="That money never arrives.">
        <PlanScene ledger={<PlanLedgerFor mode="fallback" />}>
          <p className="stage-deck">
            {formatDollars(removed.reduce((sum, item) => sum + item.amount, 0))} you were counting on is gone. Everything Avery
            owes is exactly where it was. Only your three amounts can move.
          </p>
          {bonusCards}
          <AdjustForMode
            mode="fallback"
            eyebrow="Backup plan"
            headline="Put the plan back together without it."
            lead="Rent, the weekly basics and where Avery lives do not change. Only your three amounts can move."
            changes={removed}
            commitLabel="Save the backup plan"
          />
        </PlanScene>
      </StageShell>
    );
  }

  const question = PLAN_COPY.steps;
  // A question whose total is not worked out yet offers no onward button at all. It used to
  // offer a greyed one, which a cold reader read as an application that had stopped working
  // rather than as their turn — and under a cursor it painted its own label in its own
  // background and vanished entirely.
  const ready = at === 0 ? floorReady : at === 2 ? essentialsReady : true;
  const nextLabel = at === 0 ? question.countOn.next : at === 1 ? question.bonuses.next : question.committed.next;
  const titled = [question.countOn.title, question.bonuses.title, question.committed.title, question.decide.title][at]!;
  const asked = [question.countOn.ask, question.bonuses.ask, question.committed.ask, question.decide.ask][at]!;

  return (
    <StageShell
      stage="working-plan"
      kicker={`${PLAN_COPY.title.replace(/\.$/, "")} · Question ${at + 1} of ${PLAN_COPY.map.length}`}
      title={titled}
      focusKey={at}
    >
      <PlanScene
        ledger={(
          <PlanLedgerFor
            mode="working"
            known={{ certain: floorReady, bonuses: at >= 1, essentials: essentialsReady }}
            placing={at >= 3}
          />
        )}
      >
        <PlanProgress position={position} onGo={go} />
        <p className="question__ask">{asked}</p>

        {at === 0 && (
          <div className="question">
            <p className="question__why">{question.countOn.why}</p>
            {floorReady ? (
              <p className="question__settled">
                {question.countOn.settled} Avery can count on <b className="money">{formatDollars(reliableFloorExpectation(SCENARIO_NUMBERS))}</b> whatever
                happens on the court. It is the first line of Avery’s money.
              </p>
            ) : (
              /* The prompt used to print the two amounts with a plus sign between them,
                 directly above the box asking for their total, which left the question with
                 no arithmetic in it. Both amounts are reachable from this screen — the
                 contract opens from the top bar at every moment — so the prompt names the two
                 payments and the student finds them. The step-by-step hint still assembles
                 the sum, and opening it is recorded as help. */
              <CalculationInput
                calcId="reliable-floor"
                label={question.countOn.name}
                labelHidden
                prompt="Avery’s savings, plus base pay for every week of the season."
                terms="Do not add either bonus yet. Those are not certain."
                expected={reliableFloorExpectation(SCENARIO_NUMBERS)}
                priorAttempts={state.calculations["reliable-floor"]?.attempts}
                onSubmit={(raw, value, correct) => submitCalculation(dispatch, "reliable-floor", raw, value, correct)}
                low="Too low. Both payments count — the money already saved and the base pay."
                high="Too high. Only two payments are certain. A bonus has gone into this total."
                scaffold={`Open “The four payments” at the top of the screen. Add the two that arrive no matter what: ${formatDollars(SCENARIO_NUMBERS.savings)} + ${formatDollars(SCENARIO_NUMBERS.basePay)}.`}
                {...calculationSupport(dispatch, "reliable-floor")}
              />
            )}
          </div>
        )}

        {at === 1 && (
          <div className="question">
            <p className="question__why">{question.bonuses.why}</p>
            {bonusCards}
          </div>
        )}

        {at === 2 && (
          <div className="question">
            <p className="question__why">{question.committed.why}</p>
            {essentialsReady ? (
              <p className="question__settled">
                {question.committed.settled} <b className="money">{formatDollars(essentialsExpectation(SCENARIO_NUMBERS))}</b> of Avery’s
                money is gone on food, phone and laundry before Avery chooses anything. Rent is on top of it, and both are on the right.
              </p>
            ) : (
              /* Same fix as question one: the weekly amount is on the rail beside this
                 question, on the food, phone and laundry line. The multiplication is the
                 question, so the question no longer shows it done. */
              <CalculationInput
                calcId="essentials-total"
                label={question.committed.name}
                labelHidden
                prompt={`What food, phone and laundry cost each week, for all ${SCENARIO_NUMBERS.weeks} weeks.`}
                terms="Rent is on top of this. It comes out of the plan automatically."
                expected={essentialsExpectation(SCENARIO_NUMBERS)}
                priorAttempts={state.calculations["essentials-total"]?.attempts}
                onSubmit={(raw, value, correct) => submitCalculation(dispatch, "essentials-total", raw, value, correct)}
                low={`Too low. That is fewer than ${SCENARIO_NUMBERS.weeks} weeks of it.`}
                high="Too high. Rent is not part of this one — the plan takes rent out on its own."
                scaffold={`The weekly amount is on Avery’s money, on the food, phone and laundry line. Multiply ${formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)} by ${SCENARIO_NUMBERS.weeks} weeks. Think: ${Array.from({ length: SCENARIO_NUMBERS.weeks }, () => formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)).join(" + ")}.`}
                {...calculationSupport(dispatch, "essentials-total")}
              />
            )}
          </div>
        )}

        {at === 3 && (
          <BoardForMode mode="working" variant="build" commitLabel="Save this version" lead={question.decide.why} />
        )}

        <div className="question-nav">
          {at > 0 ? <Button variant="quiet" type="button" onClick={() => go(at - 1)}>{question.back}</Button> : <span />}
          {at < PLAN_COPY.map.length - 1 && ready && (
            <Button type="button" onClick={() => go(at + 1)}>{nextLabel}</Button>
          )}
        </div>
      </PlanScene>
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
      {/* Named from the same place the board names them. Two of these rows used to be
          spelled out here and one of them, "Anything else", was a label the board had
          stopped using — so the plan a student was shown mid-story disagreed with the plan
          they had built. */}
      <dl>
        {CHOICE_ORDER.map((category) => (
          <div key={category}><dt>{CHOICE_LABELS[category]}</dt><dd className="money">{formatDollars(amounts[category])}</dd></div>
        ))}
      </dl>
      {note && <p className="plan-echo__note">{note}</p>}
    </section>
  );
}

/**
 * Beat 7. Two pieces of news, then the student works out what they cost.
 *
 * The cards used to be a transcription exercise wearing the best screen in the product: three
 * tiles, all three belonging, the app printing their running sum, and a box beside the sum
 * asking for it. There was nothing on the screen to judge.
 *
 * Now the card set is built from the whole of *this* student's season, not only from the parts
 * of it Week 5 moved. Rent, the weekly basics, a seat already reserved and a bonus they chose
 * to leave out are all real amounts out of their own plan that Week 5 does not touch — so
 * tapping is a reading of their plan rather than tapping everything on screen. The app no
 * longer adds anything up: the student assembles the total themselves and the existing attempt
 * flow handles a miss.
 *
 * The calculation id, the expected value and the applicable set are all unchanged, so a log
 * written before the decoys existed scores exactly as it did — and a decoy tapped now is a
 * component selection this world already scores as incomplete, with no new event and no new
 * rule.
 */
function Week5EventStage() {
  const { state, dispatch } = useChallenge();
  if (!state.setupId) return null;
  const expected = week5Change({ includeOutcome: state.income.includeOutcome, setupId: state.setupId }, SCENARIO_NUMBERS);
  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === state.setupId)!;
  const outcomeLabel = BASKETBALL_SCENARIO.incomeCopy.outcome.label;
  // What Week 5 actually did to this plan. Only changes that moved money appear, so a setup
  // with no extra travel cost produces no card and nothing here is worth $0. These three ids
  // are the ones the component-selection observation has always read.
  const moved = [
    ...(state.income.includeOutcome
      ? [{ id: "lost-outcome", kind: "lost" as const, tag: "Money gone", label: outcomeLabel, detail: "Your plan counted on this money. It is not coming.", amount: SCENARIO_NUMBERS.outcomeIncome as number }]
      : []),
    { id: "required-cost", kind: "bill" as const, tag: "New bill", label: BASKETBALL_SCENARIO.disruption.requiredCostLabel, detail: "A new bill. Avery has to pay it either way.", amount: SCENARIO_NUMBERS.requiredWeek5Cost as number },
    ...(setup.eventCost > 0
      ? [{ id: "setup-cost", kind: "bill" as const, tag: "New bill", label: "Extra travel to rehab", detail: `A new bill, because Avery lives at the ${setup.title}.`, amount: setup.eventCost as number }]
      : []),
  ];
  // Real amounts out of this student's own season that Week 5 leaves exactly where they were.
  // Each one is a line they set or agreed themselves, stated as what it is rather than as a
  // verdict on whether it belongs — working that out is the whole of the task.
  const held = [
    { id: "decoy-rent", kind: "committed" as const, tag: "Already promised", label: "Where Avery lives", detail: `${SCENARIO_NUMBERS.weeks} weeks at the ${setup.title}, agreed before the season.`, amount: Number(SCENARIO_NUMBERS.setupCosts[state.setupId]) },
    ...(state.income.includeOutcome
      ? []
      : [{ id: "decoy-outcome", kind: "uncounted" as const, tag: "Never counted", label: outcomeLabel, detail: "You left this out when you built the plan.", amount: SCENARIO_NUMBERS.outcomeIncome as number }]),
    ...(state.depositTaken
      ? [{ id: "decoy-deposit", kind: "committed" as const, tag: "Already paid", label: "Course seat", detail: `Paid at the Week ${SCENARIO_NUMBERS.course.depositDeadlineWeek} deadline to hold the place.`, amount: Number(SCENARIO_NUMBERS.course.depositPrice) }]
      : []),
    { id: "decoy-essentials", kind: "committed" as const, tag: "Already promised", label: "Food, phone and laundry", detail: `${formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)} a week, all ${SCENARIO_NUMBERS.weeks} weeks.`, amount: Number(SCENARIO_NUMBERS.essentialsTotal) },
  ];
  // Interleaved to a fixed order rather than shuffled: the run has to be reproducible from the
  // log, and a set where every card that counts sits at the top is a set nobody has to read.
  const ORDER = ["decoy-rent", "lost-outcome", "decoy-outcome", "required-cost", "decoy-deposit", "setup-cost", "decoy-essentials"];
  const changes = [...moved, ...held].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  return (
    <StageShell
      stage="week5-event"
      kicker="Week 5"
      title={BASKETBALL_SCENARIO.disruption.title}
      tone="dark"
      banner={
        <div className="bulletins">
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
            <span className="post__who" aria-hidden="true">#{BASKETBALL_SCENARIO.offer.jersey}</span>
            <cite>Avery</cite>
            <p>{BASKETBALL_SCENARIO.disruption.voice[setup.id]}</p>
          </blockquote>
        </div>
      }
    >
      <PlanEcho mode={state.saved.fallback ? "fallback" : "working"} label="The plan Avery walked into this week with" note="It was built for a season that still had a showcase in it." />
      {/* The cards come before the box that totals them. They used to sit beside it, which
          on a narrow screen put the answer above the evidence — a student met the question
          before they had seen a single thing they were meant to be adding up. */}
      <section className="gap-builder">
        <div className="gap-builder__intro">
          <p className="eyebrow">What this costs Avery</p>
          <h2>Work out what Week 5 just did to the plan.</h2>
          <p>Some of these changed this week. Some of them did not. Tap the ones that changed, add them up, and type the total.</p>
        </div>
        <div className="gap-tiles">
          {changes.map((change) => {
            const selected = state.selectedGapTiles.includes(change.id);
            return (
              <button key={change.id} type="button" data-kind={change.kind} aria-pressed={selected}
                onClick={() => dispatch({ type: "GAP_TILE_TOGGLED", tileId: change.id, selected: !selected })}>
                {/* A card with no mark on it is a card nobody knows they can press. */}
                <span className="gap-tiles__mark" aria-hidden="true" />
                <span className="gap-tiles__kind">{change.tag}</span>
                <span className="gap-tiles__label"><b>{change.label}</b><small>{change.detail}</small></span>
                <strong className="money">{formatDollars(change.amount)}</strong>
              </button>
            );
          })}
        </div>
        <div className="gap-builder__sum">
          {/* No running sum. The app used to print the total of the tapped cards an inch from
              the box asking for it, which made the only question on the screen a copying
              exercise. The step-by-step hint below carries the method and how many cards
              moved, and opening it is recorded as help, as it is everywhere else. */}
          <CalculationInput
            calcId="week5-change"
            label="Total change to Avery’s money"
            prompt="Everything Week 5 took away, plus every new bill it added."
            terms="Type it as a plain amount — no minus sign."
            expected={expected}
            priorAttempts={state.calculations["week5-change"]?.attempts}
            onSubmit={(raw, value, correct) => submitCalculation(dispatch, "week5-change", raw, value, correct)}
            onCorrect={() => dispatch({ type: "GO_TO_STAGE", stage: "first-response" })}
            low="Too low. One of the cards that changed this week is missing from your total."
            high="Too high. Something in your total was already promised before Week 5, so it did not change."
            scaffold={`Take one card at a time and ask whether Week 5 changed that number. ${moved.length} of the ${changes.length} cards changed; money lost and a new bill make the same size hole, so add them together.`}
            {...calculationSupport(dispatch, "week5-change")}
          />
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
      <PlanScene ledger={<PlanLedgerFor mode="week5-first-response" />}>
        <BoardForMode
          mode="week5-first-response"
          variant="triage"
          commitLabel="Lock in what Avery gives up"
          lead="Every amount below is money you already promised somewhere else. The bar at the bottom says how much is missing. Take it out of whichever ones Avery can do without."
          change={{
            headline: "Week 5 landed on the plan you built.",
            items: [
              ...(state.income.includeOutcome ? [`The ${formatDollars(SCENARIO_NUMBERS.outcomeIncome)} ${outcomeLabel} is gone`] : []),
              `${BASKETBALL_SCENARIO.disruption.requiredCostLabel}, and the travel it takes: ${formatDollars(week5Bills)}, now locked in`,
            ],
          }}
        />
      </PlanScene>
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
      title={preview ? `Now show it works without the ${formatDollars(SCENARIO_NUMBERS.completionIncome)}.` : "Two more calls to make."}
    >
      <PlanScene ledger={<PlanLedgerFor mode={preview ? "remaining-risk" : "final"} placing={preview || ready} />}>
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
                <span>What happens to Avery’s Saturdays</span>
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
              <button type="button" aria-pressed={completionDecided && state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: true })}>{PLAN_COPY.steps.bonuses.yes}</button>
              <button type="button" aria-pressed={completionDecided && !state.income.includeCompletionFinal} onClick={() => dispatch({ type: "COMPLETION_INCOME_DECIDED", included: false })}>No — plan without it</button>
            </div>
            <p className="decision-note">Say yes and you will be asked to show the plan still works if it never comes.</p>
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
        /* A dashed outline around a sentence reads as a control that has stopped working.
           It is a status, so it is written as one. */
        <p className="board-waiting" aria-live="polite">
          {state.income.includeOptionalWork === null && !completionDecided
            ? "Two calls still to make. The plan moves once both are answered."
            : "One call still to make. The plan moves once both are answered."}
        </p>
      )}
      </PlanScene>
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
    { id: "final-funds", label: "Money your plan was built on", value: finalInput ? availableFor(finalInput, SCENARIO_NUMBERS) : 0 },
    { id: "week5-cost", label: "New bills from Week 5", value: state.setupId ? SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[state.setupId] : SCENARIO_NUMBERS.requiredWeek5Cost },
    { id: "course", label: "Saved for the course", value: final.goal },
    { id: "reserve", label: "Backup money kept", value: final.reserve },
    { id: "flex", label: "Spent on rides and rest", value: final.flexibleCash },
    ...(state.income.includeCompletionFinal ? [{ id: "completion", label: `${BASKETBALL_SCENARIO.incomeCopy.completion.label} your plan was counting on`, value: SCENARIO_NUMBERS.completionIncome as number }] : []),
    ...(state.income.includeOptionalWork ? [{ id: "clinic", label: "Earned from the clinics", value: SCENARIO_NUMBERS.optionalWorkIncome as number }] : []),
  ].filter((tile) => tile.value > 0);
  const canSubmit = selected.length >= 2 && selected.length <= 3 && text.trim().length >= 40;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  const stillToPick = Math.max(0, 2 - selected.length);
  return (
    <StageShell stage="defense" kicker="Week 8" title="Explain your plan.">
      <div className="interview">
        <section className="interview__ask scene">
          <CourtBackdrop variant="key" />
          <p className="eyebrow">Season review</p>
          <h2>Why does your plan hold up?</h2>
          <p>Say how it worked after Week 5, what you protected, and what you gave up.</p>
          {/* The numbers are the interaction, so they carry a mark. Without one they read
              as a list of facts and a student can sit in front of the screen never
              discovering that the core control of the page is a control at all. */}
          <div className="interview__stats">
            <p className="field-label">Tap 2 or 3 of your own numbers</p>
            {/* Named where they are, not where the layout happens to put them. */}
            {tiles.map((tile) => (
              <button key={tile.id} type="button" aria-pressed={selected.includes(tile.id)} onClick={() => toggle(tile.id)}>
                <span className="interview__mark" aria-hidden="true" />
                <span>{tile.label}</span><MoneyAmount value={tile.value} />
              </button>
            ))}
          </div>
        </section>
        <section className="interview__answer">
          <p className="field-label">Start a sentence</p>
          <div className="sentence-starters">
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}My plan still works because `)}>My plan still works…</button>
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I protected `)}>I protected…</button>
            <button type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}I gave up `)}>I gave up…</button>
          </div>
          <label htmlFor="defense-text">Two to four sentences</label>
          <textarea id="defense-text" value={text} onChange={(event) => setText(event.target.value)} rows={6} placeholder="My plan still works because…" />
          {/* Two rules, said the same way. It used to count characters at a student who had
              just been told to write sentences, and start that count at "2 more" when they
              had picked none. */}
          <footer>
            {/* "On the left" was true at a laptop width and false at 640, where the numbers
                stack above the box. The instruction names what to tap, not where it sits. */}
            <p aria-live="polite">
              {stillToPick > 0 ? `Tap ${stillToPick} more of Avery’s number${stillToPick === 1 ? "" : "s"}. ` : "Numbers ready. "}
              {text.trim().length < 40 ? "Then write two to four sentences." : "Long enough to turn in."}
            </p>
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
  const finalAmounts = amountsFor(state, "final");
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
          </div>
        </div>
      </section>

      {/* What was actually sent, in one block. A confirmation screen that shows nothing of the
          work is a receipt with no items on it, and this is the last chance a student has to
          read back their own answer. It says what went, where it went, and who reads which
          part — and it says nothing about how any of it did, because nothing has been read
          yet and a number here would be an answer to a question nobody has asked. */}
      <section className="handed-in__record">
        <p className="stamp">What you turned in</p>
        <ul className="handed-in__numbers">
          {setup && <li><span>Where Avery lived</span><strong>{setup.title}</strong></li>}
          {CHOICE_ORDER.map((category) => (
            <li key={category}><span>{CHOICE_LABELS[category]}</span><strong className="money">{formatDollars(finalAmounts[category])}</strong></li>
          ))}
        </ul>
        <p className="handed-in__said">Your {state.defense.tileIds.length} numbers, and what you said about them:</p>
        <blockquote>{state.defense.text}</blockquote>
        <p className="handed-in__reader">
          A person reads the writing. Software can check whether the money works; it should not
          decide whether your thinking makes sense. Nothing here has been read yet.
        </p>
      </section>

      <div className="stage-action">
        <p>
          Avery’s eight weeks would have gone differently on a different plan. Starting again does not
          take this one back — what you turned in stays with your teacher.
        </p>
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
  const { state, activeWorldId } = useChallenge();
  // A second world means a second machine, and the shell picks between them before it picks
  // a screen. Basketball's stage ids and the pop-up's do not overlap, but reading them off
  // one switch would still mean one reducer's state deciding what another reducer draws.
  if (activeWorldId === "food-truck") return <PopUpChallenge />;
  return <BasketballStages stage={state.stage} />;
}

function BasketballStages({ stage }: { stage: StageId }) {
  return useMemo(() => {
    switch (stage) {
      case "entry": case "join": return <OpeningStage />;
      case "choose-world": return <WorldChoice />;
      // Retired as its own screen — resumed sessions saved on it land on the deal.
      case "the-offer": return <DealStage />;
      case "role-contract": return <DealStage />;
      case "setup-comparison": return <SetupStage />;
      // The backup version is the working plan with its bonus money taken out, so it is the
      // same screen reacting rather than a second board.
      case "working-plan": case "fallback-version": return <WorkingStage />;
      // Retired as its own screen — a plan with no bonus money starts the season directly.
      case "income-check": case "season-weeks": return <SeasonWeeks />;
      // The course deposit is the pivot of the design, so it gets the screen it was buried at
      // the bottom of. The stage id already existed and already meant "Weeks 1–4 played".
      case "week5-transition": return <DepositDeadline />;
      case "week5-event": return <Week5EventStage />;
      case "first-response": return <TriageStage />;
      // The no-bonus check happens on the screen where the bonus was counted.
      case "opportunity-final-repair": case "remaining-risk-preview": return <FinalRepairStage />;
      case "week8-resolution": return <Week8Resolution />;
      case "defense": return <DefenseStage />;
      case "submitted": return <SubmittedStage />;
      // Run the Pop-Up's own screens. Reached through its own machine, never through this one.
      default: return null;
    }
  }, [stage]);
}
