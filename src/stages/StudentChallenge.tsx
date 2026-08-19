import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChallenge } from "../app/ChallengeContext";
import { useDraft } from "../app/attemptStore";
import { StageShell } from "../app/StageShell";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CalculationInput } from "../components/primitives/CalculationInput";
import { useInPlaceArrival } from "../components/primitives/useInPlaceArrival";
import { MoneyAmount } from "../components/primitives/MoneyAmount";
import { PlanBoard, type BoardVariant } from "../components/financial/PlanBoard";
import { PlanScene } from "../components/financial/PlanScene";
import { PlanLedger, type LedgerKnown } from "../components/financial/PlanLedger";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { AdjustPanel, type SupplyChange } from "../components/financial/AdjustPanel";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { RosterCard } from "../components/story/RosterCard";
import { dollars, formatDollars, type Dollars } from "../domain/core/money";
import { hoursOfEveryWeek, hoursPerWeek } from "../domain/core/units";
import type { CalcId, CategoryId, SetupId } from "../domain/core/ids";
import type { PlanMode } from "../domain/finance/types";
import { availableFor, lockedFor, week5Change } from "../domain/finance/formulas";
import { planConsequences } from "../domain/finance/consequences";
import { PLAN_MODES } from "../domain/finance/modes";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { essentialsExpectation, incomeAmount, reliableFloorExpectation, setupCostOrder } from "../domain/scenario/expectations";
import { bonusWeeks, clinicWeeks } from "../domain/scenario/season";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { amountsFor, meaningfulAttempts, rankingAttempts, snapshotForMode } from "../domain/machine/selectors";
import { STUDENT_COPY } from "../content/studentCopy";
import type { Assignment } from "../platform/classes/types";
import { forgetStudent, readMyClasses, studentToken } from "../student/session";
import { planPosition, railStop, seedVisited, type PlanPosition } from "./planNavigation";
import { DepositDeadline, SeasonWeeks } from "./SeasonWeeks";
import { Week8Resolution } from "./Week8Resolution";
import { WorldChoice } from "./WorldChoice";
import { worldOffer } from "./worldOffer";
import { DEFAULT_WORLD_ID, PLAYABLE_WORLDS, WORLD_CHOICE_UI_READY } from "../domain/scenario/registry";
import { PopUpChallenge } from "./popup/PopUpChallenge";
import type { StageId } from "../domain/evidence/types";
import { checkWriting, NUMBERS_WANTED } from "../domain/evidence/writingGate";
import { closingAnswerOutstanding, rememberClosingQuestion } from "../student/closingQuestion";
import { ClosingQuestionCard } from "../student/ClosingQuestionCard";

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

/**
 * Brings a section that has just *appeared* into view, and never a section that was there
 * when the screen opened.
 *
 * The second half is the whole of it. `useStageArrival` puts a new screen at the top and
 * moves focus to its heading; this used to fire on its own first run as well, so on any
 * screen whose revealed section was already open on arrival the two ran on the same tick and
 * this one won. The result was measured in a real page: the new `<h1>` at `top: -11`, eighty-
 * three pixels of it behind the sticky bar, and on the next transition `top: -83`. Identical
 * under `prefers-reduced-motion: reduce`, because it was never an animation — it was two
 * hooks arguing about where the page starts, and the one that should not care winning.
 *
 * So the ref remembers what `active` was on the first run and only ever scrolls on a
 * false→true transition after that. A section that is already open when the screen arrives is
 * part of the screen, and where a screen starts is `useStageArrival`'s to say.
 */
function useRevealOnce<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const ref = useRef<T>(null);
  const done = useRef(false);
  const wasActive = useRef<boolean | null>(null);
  useEffect(() => {
    const first = wasActive.current === null;
    const appeared = !first && wasActive.current === false && active;
    wasActive.current = active;
    if (!appeared || done.current || !ref.current) return;
    done.current = true;
    ref.current.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }, [active]);
  return ref;
}

/**
 * The seat a build with no class service plays from. No service means no session and no
 * roster to be on — nothing to resolve, and nothing this student could type that would make
 * it truer, which is why the old screen's two required boxes were unfillable here.
 */
const OFFLINE_SEAT: StartingSeat = { classCode: "", seatCode: "", label: "", displayName: null, assignment: null };

/** Who is about to play, as the session answered it. Every field comes from the service. */
interface StartingSeat {
  classCode: string;
  seatCode: string;
  label: string;
  displayName: string | null;
  assignment: Assignment | null;
}

/**
 * Beat 1. Arrival — and the only door.
 *
 * This screen used to *be* the sign-in: two boxes, a class code and a seat number, typed by
 * hand. That was the whole identity system, and it produced work signed by whatever number a
 * student typed. It cannot survive accounts, and not for tidiness — a class with a roster now
 * refuses work that cannot say who sent it, so the old door led a student through twenty-five
 * minutes of real decisions to a submission the service was right to reject. Two doors, one
 * of which throws the lesson away.
 *
 * So there is one door, and it is not this screen. A student signs in at `/join` — class code,
 * their own name off their teacher's list, the code on their card — and arrives here already
 * known. What is left here is the job the codes were standing in front of: who this run
 * belongs to, whose story it is, and one press to start it.
 *
 * A build with no class service behind it (design work, a room that lost its network) has no
 * session to read and never had a real class code either. It starts straight away rather than
 * demanding a code that resolves against nothing.
 */
function OpeningStage() {
  const { state, dispatch, transport, setOffer } = useChallenge();
  const { offer, invitation, numbers } = BASKETBALL_SCENARIO;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // A build with no class service resolves to a seat during render rather than in an effect:
  // there is nothing to ask and nobody to ask, so it is a fact about the build, not a load.
  const [seat, setSeat] = useState<StartingSeat | null>(() => (transport.requiresClass ? null : OFFLINE_SEAT));
  const [problem, setProblem] = useState<string | null>(null);
  const started = useRef(false);
  // Whether a picker exists at all. The class decides whether it is offered, and that is not
  // known until the session has answered — but a build with one world can never show one, and
  // a build with two should not promise either before the student has chosen.
  const choosing = WORLD_CHOICE_UI_READY && PLAYABLE_WORLDS.length > 1;

  useEffect(() => {
    if (!transport.requiresClass) return;
    if (!studentToken()) {
      void navigate("/join", { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await readMyClasses();
      if (cancelled) return;
      if (!result.ok) {
        // A dead session is not an error to explain to a twelve-year-old, it is a sign-in to
        // do again. A service that is merely unreachable says so and keeps them here.
        if (result.message.startsWith("No connection")) { setProblem(result.message); return; }
        forgetStudent();
        void navigate("/join", { replace: true });
        return;
      }
      const wanted = (params.get("class") ?? "").toUpperCase();
      const classes = result.body.classes;
      const picked = wanted
        ? classes.find((entry) => entry.classCode === wanted)
        : classes.length === 1 ? classes[0] : undefined;
      // Nought classes, or several and no answer about which: both are questions the student's
      // own screen already asks better than this one can.
      if (!picked) {
        void navigate("/home", { replace: true });
        return;
      }
      setSeat({
        classCode: picked.classCode,
        seatCode: picked.seatCode,
        label: picked.label,
        displayName: picked.displayName,
        assignment: picked.assignments[0] ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [navigate, params, transport.requiresClass]);

  const start = () => {
    if (!seat) return;
    if (started.current) return;
    started.current = true;
    // What this class was set, carried to the picker so it does not have to ask again.
    setOffer(worldOffer({
      allowedWorldIds: seat.assignment?.allowedWorldIds ?? [],
      assignmentAllowsChoice: seat.assignment?.studentChoosesWorld ?? true,
      playableWorldIds: PLAYABLE_WORLDS.map((world) => world.id),
      pickerReady: WORLD_CHOICE_UI_READY,
      defaultWorldId: DEFAULT_WORLD_ID,
    }));
    // The teacher's own closing question, filed against this run before the first screen.
    // It belongs to the assignment rather than to the world, so it is kept outside both
    // reducers — see `student/closingQuestion.ts` — and asking for it later would mean every
    // surface that could show it needing the assignment threaded to it.
    const sessionId = crypto.randomUUID();
    rememberClosingQuestion(sessionId, seat.assignment?.closingQuestion);
    dispatch({
      type: "SESSION_STARTED",
      sessionId,
      classCode: seat.classCode,
      seatCode: seat.seatCode,
      ...(seat.assignment ? { assignmentId: seat.assignment.id } : {}),
    });
  };

  /**
   * A student who is already signed in does not meet a *second* screen asking them to confirm
   * it — that much of the old reasoning here was right. They came from their own home page,
   * which shows their name, offers "Not you?" and has a button reading *Start*, and a panel
   * that only repeated "You are signed in as · Ada L. · Period 2" back at them, with a button
   * reading *Go in* and nothing else on it, was one of four screens between the door and the
   * game that a red team counted as confirming what the student had just done.
   *
   * What used to live here did more than that, and firing `start()` from an effect the moment
   * `seat` resolved skipped all of it along with the confirmation: `entry` budgets 55 seconds
   * in `pacing.ts` for "read the offer and the roster card, **then start the run**", and the
   * offer and the roster card are drawn below, in this same component, for a signed-in
   * student and the no-service preview alike. An effect that dispatches `SESSION_STARTED`
   * before the first paint moves `state.meta.stage` off `entry` (`reducer.ts`) before any of
   * that is ever on screen — so a real student who chose a world card promising "Eight Weeks to
   * the Showcase" landed straight in the setup comparison having never met Avery, the roster
   * card or the goal, and `RosterCard` was dead code for every real class this product has ever
   * run. `startIfConfirmAsked` (`e2e/flow.ts`) already tolerated either outcome, which is the
   * reason no browser test caught it: it waits for whichever screen actually turns up and
   * presses the confirm button — *Start* or *Go in* — only when one is drawn.
   *
   * So the button is what starts the run, for a real class exactly as it already did for the
   * no-service preview below — there is no longer a second code path to keep in step. Resume is
   * unaffected: a returning student's initial state is read from a checkpoint or this device's
   * own draft (`ResumeGate.tsx`, `ChallengeContext.tsx`) with `meta.stage` already past `entry`,
   * so this component is never mounted on that stage for a run in progress — only a session
   * that has never dispatched `SESSION_STARTED` starts on `entry` at all.
   */

  if (!seat) {
    return (
      <div className="opening opening--waiting" data-world={state.meta.worldId}>
        <div className="opening__bar"><AppMark /><span>Plan Under Pressure</span></div>
        <p className="join-status" aria-live="polite">{problem ?? (seat ? "Opening your run…" : "Getting your class…")}</p>
        {problem && <Button type="button" variant="secondary" onClick={() => window.location.reload()}>Try again</Button>}
      </div>
    );
  }

  return (
    <div className="opening" data-world={state.meta.worldId}>
      <div className="opening__bar">
        <AppMark />
        <span>Plan Under Pressure</span>
      </div>
      <div className="opening__grid">
        {/* Avery, and the one thing Avery is playing for — but only where Avery is what the
            student is about to play. With a picker one screen away, this panel sold one of
            the two worlds before the student had been offered either, and a student who
            went on to choose the market had pressed a button promising eight weeks of
            basketball. Where there is a choice to make, the choice is the story. */}
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
            {/* Whose run this is, before it starts. On a cart Chromebook the previous
                student's session was indistinguishable from your own, and the answer to that
                is not a warning — it is saying whose it is, on the screen where starting is
                still free. */}
            {seat.displayName && (
              <p className="opening__whose">
                <span className="stamp">You are signed in as</span>
                <strong>{seat.displayName}</strong>
                {seat.label && <span className="opening__class">{seat.label}</span>}
              </p>
            )}
            <Button type="button" onClick={start}>
              {choosing ? "Go in" : "Start the eight weeks"}
            </Button>
            <p id="join-status" className="join-status" aria-live="polite">{transport.promise}</p>
            {seat.displayName && (
              <Button
                type="button"
                variant="quiet"
                onClick={() => { forgetStudent(); void navigate("/join", { replace: true }); }}
              >
                Not you?
              </Button>
            )}
            {/* Only where there is a class list for it to be true of. A build with no class
                service has no teacher and no roster, and telling a teacher trying the sample
                run that "the only name here is the one your teacher wrote on their class
                list" is a claim about a list that does not exist. */}
            {seat.displayName && <p className="privacy-note">{STUDENT_COPY.join.privacy}</p>}
          </div>
        </aside>
        {/* The story. It used to open with an 01/02/03 list of the decisions ahead — a
            syllabus handed over before any of it meant anything. The card above says who is
            about to do this; this says who they are doing it for. */}
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

/*
 * Beat 2 used to be here: "The terms", four payments in two columns, a Continue button and no
 * input of any kind. It was 165 rendered words against a 40-second budget, and every payment on
 * it is permanently available from "The four payments" in the top bar — the definition of a
 * corridor, and one of three no-input screens in a run whose reading already outran the period
 * it is sold for.
 *
 * What the top bar could not carry is the half of a conditional payment that matters: what
 * happens to the season when the rule is not met. Deleting the screen without that would have
 * thrown away the only place the product states it, so the two `ifNot` sentences moved onto the
 * bonus cards in `WorkingStage` — beside the rule, on the screen that asks the student to take a
 * position on it, where they cost twenty words instead of a hundred and sixty-five.
 *
 * The stage id survives in `StageId` and `STAGE_ORDER`: stored evidence logs name it, and a
 * saved attempt sitting on it lands on the setup comparison rather than on nothing.
 */

/**
 * What the ranking is called when it asks for help, in the same vocabulary as every other
 * gated question: `state.support` is keyed by the thing being worked out.
 */
const RANK_INTERACTION = "setup-order";

/**
 * Beat 3. Three places, priced in two currencies.
 *
 * Comparing full cost across time used to be two multiplication drills that gated the
 * screen. Here the comparison itself is the interaction: the student puts the three places
 * in order by what each really costs over eight weeks, working from the terms rather than
 * from totals the screen hands them. Only after that do the totals appear — and each card
 * also says what the place costs out of Avery's week, so the cheapest is not automatically
 * the best.
 *
 * It is also the first screen of the world, and it used to be the only gated question in the
 * product with no way out of it. Every sum has three rungs — two wrong tries open a worked
 * step, three open "show the answer and keep going", and the supply is recorded so it caps
 * credit — and this screen had none of them. Six wrong presses answered with the same
 * sentence six times, and the only route on was to permute three items until one of six
 * orders was accepted: brute force, which is the behaviour the ladder exists to prevent, on
 * the screen that decides whether a student meets the rest of the run at all. The student who
 * cannot do $225 × 8 in their head is stopped in the first two minutes of a twenty-five
 * minute period while the room moves on, and a student who cannot get past the front door
 * cannot be assessed on anything behind it.
 *
 * So the same three rungs, in the same words, with the same bargain: the answer is handed
 * over, it is recorded as handed over, and the ordering the student never made earns nothing.
 * `SHOW_AND_CONTINUE_USED` is the whole of what is written — no `SETUP_RANKED` is dispatched
 * for it, because a ranking event says the student put them in that order and they did not.
 */
function SetupStage() {
  const { state, dispatch } = useChallenge();
  const { setups } = BASKETBALL_SCENARIO;
  const [order, setOrder] = useState<SetupId[]>(() => state.setupRanking?.order ?? setups.map((setup) => setup.id));
  const wrongTries = rankingAttempts(state);
  const supplied = state.support[RANK_INTERACTION] === "answer_supplied";
  /**
   * The one beat between the answer being handed over and the screen moving on.
   *
   * A supplied sum lands in the box the student is looking at. A supplied order has to land
   * in the list, and the list is gone the instant the screen counts the ranking as done — so
   * the hand-over puts the three places in the right order and holds there until the student
   * says they have seen it. It is local, so a reload lands on the next question rather than
   * on an answer the student has already read.
   */
  const [showingAnswer, setShowingAnswer] = useState(false);
  /** Whether the worked step is open. Kept locally, and recovered from the record on reload. */
  const [openedStep, setOpenedStep] = useState(false);
  const ranked = state.setupRanking?.correct === true || (supplied && !showingAnswer);
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
  /**
   * The middle rung: one place worked all the way out, and the method for the other two.
   *
   * The dearest place rather than a named one, so a re-pricing cannot leave this hint doing
   * the arithmetic of a season that no longer exists. Its terms are already written per week,
   * which is the thing the student has to get past.
   */
  const dearest = [...setups].sort((first, second) => second.total - first.total)[0]!;
  const stepOpen = openedStep || state.support[RANK_INTERACTION] === "direct_scaffold";
  const openStep = () => {
    setOpenedStep(true);
    dispatch({ type: "SCAFFOLD_OPENED", interactionId: RANK_INTERACTION });
  };
  const handOverTheOrder = () => {
    setOrder(setupCostOrder(SCENARIO_NUMBERS));
    setShowingAnswer(true);
    dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: RANK_INTERACTION });
  };

  return (
    <StageShell
      stage="setup-comparison"
      kicker="Where Avery stays"
      // One screen, two jobs, and they used to share a headline — so the page looked
      // identical before and after the only thing that had happened on it.
      title={ranked ? "Now pick where Avery lives." : "Which place costs the least?"}
      // And when the headline changed, the heading took focus with it. Without this the
      // ranking was accepted, the whole screen became a different question, and a keyboard or
      // screen-reader user was left standing on a button that no longer existed, with nothing
      // announcing that the screen had moved on.
      focusKey={ranked ? "choose" : "rank"}
    >
      {!ranked ? (
        <>
          <p className="stage-deck">
            Three places, three ways of paying. Put them in order, cheapest first —
            <strong> over all eight weeks</strong>, not per week.
          </p>
          {/* A list showing the answer is not a list needing another look, whatever the last
              thing the student tried was. */}
          <ol className="rank-list" data-checked={showingAnswer ? "right" : state.setupRanking ? (state.setupRanking.correct ? "right" : "wrong") : "unchecked"}>
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
          <div className="stage-action" data-state={showingAnswer ? "neutral" : state.setupRanking && !state.setupRanking.correct ? "wrong" : "neutral"}>
            {showingAnswer
              ? <p aria-live="assertive"><b>That is the order.</b> Cheapest first, over all {SCENARIO_NUMBERS.weeks} weeks.</p>
              : state.setupRanking && !state.setupRanking.correct
                ? (
                  <p aria-live="assertive">
                    <b>Not that order.</b> One of these prices is for the whole eight weeks, not
                    for one week. Work out what each place costs across all {SCENARIO_NUMBERS.weeks} of them.
                  </p>
                )
                : <p>Cheapest over eight weeks goes first.</p>}
            {showingAnswer
              ? <Button type="button" onClick={() => setShowingAnswer(false)}>Keep going</Button>
              : <Button type="button" onClick={checkOrder}>{state.setupRanking && !state.setupRanking.correct ? "Check it again" : "Check the order"}</Button>}
          </div>
          {/* The ladder every other gated question in the product has, in the same words and
              the same order, so a student who has met one has met this one. Nothing here is
              on the screen until two orders have been refused — the first two minutes of the
              run are unchanged for the student who does not need it. */}
          {!showingAnswer && wrongTries >= 2 && (
            <div className="calculation-help">
              {!stepOpen
                ? <Button type="button" variant="quiet" onClick={openStep}>Show me one step</Button>
                : (
                  <div role="note">
                    <strong>Try it this way:</strong>
                    <span>
                      Take one place at a time. {dearest.title}: {dearest.terms} — that is {formatDollars(dearest.total)} over
                      the season. Work the other two out the same way, then put the cheapest first.
                    </span>
                  </div>
                )}
              {wrongTries >= 3 && <Button type="button" variant="quiet" onClick={handOverTheOrder}>Show the answer and keep going</Button>}
            </div>
          )}
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
                {/* Three cards carrying one label is three tab stops a screen reader cannot
                    tell apart, on the screen that carries the run's first real decision — and
                    the place names are `<b>`, not headings, so the tree does not separate them
                    either. Named the way the world picker two screens earlier already names
                    its two: the accessible name says which place it is and still contains the
                    visible words, so both readings agree. */}
                <Button
                  variant={state.setupId === setup.id ? "primary" : "secondary"}
                  type="button"
                  aria-label={`${state.setupId === setup.id ? "Selected" : "Choose this setup"}: ${setup.title}`}
                  onClick={() => dispatch({ type: "SETUP_SELECTED", setupId: setup.id })}
                >{state.setupId === setup.id ? "Selected" : "Choose this setup"}</Button>
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
            {/* What this footer may say, and when.
                It used to print the eight-week total the box above it was asking for —
                "…of Avery's money is spoken for", a hundred and twenty pixels under
                "What the Gym District Sublet costs Avery — Total $___". A student who read
                the whole screen was handed the answer and a student who read less carefully
                did the arithmetic, which is the opposite of the lesson. The hours are not the
                answer to anything on this screen, so they stay; the money arrives when the
                student has worked it out, as a confirmation of their own figure rather than
                as a crib for it.
                `hoursOfEveryWeek` is a whole clause from `units.ts` because the Gym District
                Sublet costs exactly one hour a week, and a hard-coded plural here is how the
                screen came to read "1 hour of every week belong to the trip". */}
            {/* One paragraph, always here, so the live region exists before it has anything
                to say. It used to be three: the "pick one" line carried no `aria-live` at
                all and the other two appeared only once a place was chosen, which meant the
                region arrived with its text already inside it and announced nothing. */}
            <p aria-live="polite">
              {!chosen
                ? "Each place asks for something different. Pick the one you want to build the plan around."
                : totalEntered
                  ? <><strong>{chosen.title}.</strong> {formatDollars(chosen.total)} of Avery’s money is spoken for, and {hoursOfEveryWeek(SCENARIO_NUMBERS.load.commuteBlocks[chosen.id])} to the trip.</>
                  : <><strong>{chosen.title}.</strong> {hoursOfEveryWeek(SCENARIO_NUMBERS.load.commuteBlocks[chosen.id])} to the trip. Now work out what eight weeks of it costs.</>}
            </p>
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
    // The working plan, not the backup check. The check is a what-if built on top of this
    // plan and the season never ran on it; opening Week 5 from it made the repair the student
    // was asked for disagree with the total they had just been made to work out.
    case "week5-first-response": return amountsFor(state, "working");
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
    // Every row is written as BOW's own figure. That is what it is, and it is what closes the
    // opening board honestly: three rows have been answered for, so the plan can be saved, and
    // every one of those answers says on the record that the student did not make it.
    //
    // It used to close by dispatching a $0 remainder onto Avery's week — a statement the
    // student never made, manufactured to get past a gate. The gate is now three rows with
    // something said about each, and a supplied plan says the true thing about all three.
    for (const category of CHOICE_KEYS) dispatch({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amounts[category]), via: "suggested" });
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

/**
 * Which rows of a plan the student has actually said something about.
 *
 * A row with an entry has been acted on — a figure typed, a stepper pressed, the leftovers
 * sent to it, or "nothing this season" said out loud. A row without one is at whatever the
 * board started it on and nobody has read it, which is a different fact about a child and the
 * one the opening board now refuses to close over.
 */
function spokenFor(state: ReturnType<typeof useChallenge>["state"], mode: PlanMode): CategoryId[] {
  const sources = state.amountSources[mode] ?? {};
  return CHOICE_KEYS.filter((category) => sources[category] !== undefined);
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
  // The opening plan carries the closing statement and no other board does. Week 5 is money
  // being taken away rather than money looking for a job, and the three adjustments after it
  // start from a plan that has already been closed once.
  const opening = mode === "working";
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
      opening={opening}
      spokenFor={spokenFor(state, mode)}
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
  // Whether the figure on screen is one the student produced or one the product handed over.
  // The log has always recorded the difference honestly; the screen said the same sentence
  // either way, and told a child who had just asked for the answer that they had worked it out.
  //
  // Read off `support`, which is what `SHOW_AND_CONTINUE_USED` actually writes and what the
  // grader prices this answer at. The flag this used to read — `calculations[id].supplied` —
  // is never set to `true` anywhere in this world, so `shown` was unreachable and every
  // student got `settled`: the child who asked for the answer was told "You worked this out."
  // in the same words as the child who did. Reading the one field the teacher's evidence also
  // reads is what stops the sentence and the record ever disagreeing again.
  const floorShown = state.support["reliable-floor"] === "answer_supplied";
  const essentialsShown = state.support["essentials-total"] === "answer_supplied";
  // Where the student has got to, read off their own answers rather than off a counter, so
  // a refresh lands them back on the question they were actually looking at. From there,
  // `visited` grows only by actually opening a question — the answers open the door to the
  // next one, they do not walk through it.
  /**
   * Which of the two bonuses this student has actually answered for.
   *
   * Both cards used to open with *"No — leave it out"* already pressed — the pedagogically
   * correct answer — so a student who pressed *Next* without reading got the question right,
   * the ledger recorded a decision they never made, and the micro-skill that asks whether
   * conditional money was kept out of the total scored full marks for not reading. The state
   * behind them still starts at "out", because a plan has to start somewhere and this is the
   * only safe place; what is gone is the screen claiming that is an answer.
   */
  const answeredBonus = (sourceId: string) => state.log.some((event) =>
    event.type === "INCOME_SOURCE_TOGGLED" && (event.payload as { sourceId?: string }).sourceId === sourceId);
  const bonusesAnswered = BETS.every(([sourceId]) => answeredBonus(sourceId));
  // Both boxes vanish the moment their answer is right, and the sentence that takes their
  // place is where the student now is — and, for a student who cannot see the screen, the
  // only thing left saying what the press did.
  const floorSettled = useInPlaceArrival<HTMLParagraphElement>(floorReady);
  const essentialsSettled = useInPlaceArrival<HTMLParagraphElement>(essentialsReady);
  const gates = { floorReady, essentialsReady, bonusesAnswered };
  const seed = seedVisited(gates);
  const [visited, setVisited] = useState(seed);
  const [wanted, setWanted] = useState(seed);
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
        const answered = answeredBonus(sourceId);
        // What it costs the season when the rule is not met. This is the sentence the deleted
        // contract screen existed for, and it reads as a consequence on its own — the line
        // above it has just said what the rule is, so this one does not need to name it again.
        const ifNot = BASKETBALL_SCENARIO.incomeCopy[key].ifNot ?? "";
        return (
          <article key={sourceId} className="bet" data-counted={included} data-struck={backup && included}>
            <div className="bet__head">
              <b>{BASKETBALL_SCENARIO.incomeCopy[key].label}</b>
              <strong className="money">{formatDollars(incomeAmount(SCENARIO_NUMBERS, key))}</strong>
            </div>
            <p className="bet__rule">Avery only gets this if {BASKETBALL_SCENARIO.incomeCopy[key].rule}</p>
            {!backup && ifNot && <p className="bet__rule" data-tone="ifnot">{ifNot}</p>}
            {backup ? (
              <p className="bet__verdict">{included ? "You counted on it. Take it back out and see." : "You left it out, so nothing here changes."}</p>
            ) : (
              /* The question is asked once, at the head of the screen. It used to be printed
                 again inside each card, and a chip repeated whichever button was already
                 pressed — one question and one answer, said three times each. The pressed
                 button carries the state, which is what a pressed button is for. */
              <div className="binary-choice">
                <button type="button" aria-pressed={answered && included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: true })}>{PLAN_COPY.steps.bonuses.yes}</button>
                <button type="button" aria-pressed={answered && !included} onClick={() => dispatch({ type: "INCOME_SOURCE_TOGGLED", sourceId, included: false })}>{PLAN_COPY.steps.bonuses.no}</button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );

  if (backup) {
    return (
      /* A check, and it now says so.
         It used to be headed "That money never arrives." and told the student "You counted on
         it. Take it back out of the plan." — which reads as the season having decided
         something. It has not. Every board after this one, the Week 5 arithmetic and Week 8's
         own reckoning all measure from the plan the student saved a screen ago; this one is
         the same question the last check of Week 5 asks — *would it still hold if the money
         you counted on never came* — and its amounts go no further than this screen.
         A student who was not told that rebuilt a plan, watched the next screen show them a
         different one, and was asked for a total that matched neither. */
      <StageShell stage="fallback-version" kicker={`A check · the same plan without ${removed.length > 1 ? "the bonuses" : "the bonus"}`} title={`What if ${removed.length > 1 ? "they never arrive" : "it never arrives"}?`}>
        <PlanScene ledger={<PlanLedgerFor mode="fallback" />}>
          <p className="stage-deck">
            Take out the {formatDollars(removed.reduce((sum, item) => sum + item.amount, 0))} you were counting on and see whether the plan still
            holds. Everything Avery owes is exactly where it was. Only your three amounts can move.
          </p>
          {bonusCards}
          <AdjustForMode
            mode="fallback"
            eyebrow="Safety check"
            headline={`Show it still works without ${removed.length > 1 ? "them" : "it"}.`}
            lead="Rent, the weekly basics and where Avery lives do not change. This is a check, not a new plan — the season runs on the plan you saved."
            changes={removed}
            commitLabel="Save this check"
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
  // Question two is now gated like the two arithmetic questions either side of it: no onward
  // button until it has been answered. It was the only one of the four a student could walk
  // past without touching, and walking past it was the right answer.
  const ready = at === 0 ? floorReady : at === 1 ? bonusesAnswered : at === 2 ? essentialsReady : true;
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
            known={{ certain: floorReady, bonuses: bonusesAnswered, essentials: essentialsReady }}
            placing={at >= 3}
          />
        )}
      >
        <PlanProgress position={position} onGo={go} />
        <p className="question__ask">{asked}</p>

        {at === 0 && (
          <div className="question">
            {/* No `why` line on the two calculation questions. Each of them already carried
                four framings of one sum — the rail's step name, the heading, this line, and
                the prompt that names which payments to add — and this was the one that only
                said "definitely" a second time. The prompt asks the question and the terms
                line guards it; a fifth sentence is the screen explaining what it is already
                showing. */}
            {floorReady ? (
              <p className="question__settled" ref={floorSettled} tabIndex={-1}>
                {floorShown ? question.countOn.shown : question.countOn.settled} Avery can count on <b className="money">{formatDollars(reliableFloorExpectation(SCENARIO_NUMBERS))}</b> whatever
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

            {essentialsReady ? (
              <p className="question__settled" ref={essentialsSettled} tabIndex={-1}>
                {essentialsShown ? question.committed.shown : question.committed.settled} <b className="money">{formatDollars(essentialsExpectation(SCENARIO_NUMBERS))}</b> of Avery’s
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

/**
 * What the course row is worth saying, given what has happened to the course.
 *
 * A reserved seat empties this row: the money left the plan and became a paid-for place, and
 * the board locks the row at $0 from that moment. Printing `$0` beside "Sports-media course"
 * in a summary is then a true statement about a row and a false one about the season — a
 * student who had just been told, in the resolution's own words, that the sports-media seat
 * was held and paid for at its full price read `Sports-media course $0` on the receipt for the
 * same run. (The figure is not spelled here on purpose: the scenario owns every amount, and a
 * comment quoting one is a second place to update when the price moves.)
 */
function courseRowReading(depositTaken: boolean | null, amount: number): string {
  return depositTaken ? `${formatDollars(SCENARIO_NUMBERS.course.depositPrice)} paid` : formatDollars(amount);
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
          <div key={category}>
            <dt>{CHOICE_LABELS[category]}</dt>
            <dd className="money">{category === "goal" ? courseRowReading(state.depositTaken, amounts[category]) : formatDollars(amounts[category])}</dd>
          </div>
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
 *
 * Two things a critic measured on this screen are why it looks the way it does now.
 *
 * **The answer was in the colour.** The cards carried `data-kind`, and the stylesheet drew a
 * different left border for each of its four values — so the two cards that had to be tapped
 * were the only two in red, and the colours partitioned the set exactly the way the question
 * does. Read off the live DOM: two cards at `rgb(168, 50, 31)`, and they were the answer. A
 * student who read nothing could tap the red ones and be half right, and a colour-blind
 * student had none of that to go on. The attribute is `data-line` now, which nothing colours,
 * so every card on the strip is drawn the same and the only thing separating them is what
 * they say. Whatever colour comes back here later must be one that both kinds of card carry.
 *
 * **The answer could be taken without seeing it.** Three wrong totals with nothing tapped
 * unlocked "show the answer and keep going", and the press moved the student two screens on
 * with the comprehension it is asking about never attempted. The rung stays — a gate with no
 * way out is the defect one screen earlier — but it now does what it says: the cards Week 5
 * moved are named on the strip, and the student says when they have seen them. The taps are
 * still theirs to make, so `C5.3` still reads what they selected and still scores a student
 * who selected nothing as partial.
 */
function Week5EventStage() {
  const { state, dispatch } = useChallenge();
  /**
   * Whether the last rung has handed the answer over, and this screen is showing it.
   *
   * The ref is not a duplicate of the state: `onShowAndContinue` and `onCorrect` both run
   * inside the one press, and the dispatch that records the hand-over has not come back
   * through `state.support` by the time `onCorrect` asks whether to leave the screen. The ref
   * is the answer to that question; the state is what redraws the strip.
   */
  const handedOver = useRef(false);
  const [answerShown, setAnswerShown] = useState(false);
  if (!state.setupId) return null;
  const expected = week5Change({ includeOutcome: state.income.includeOutcome, setupId: state.setupId }, SCENARIO_NUMBERS);
  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === state.setupId)!;
  const outcomeLabel = BASKETBALL_SCENARIO.incomeCopy.outcome.label;
  // The world writes its rules as standalone sentences ("The Flight qualifies for the
  // showcase."), so putting one after "Paid only if" needs the capital taken off the front or
  // the card reads "Paid only if The Flight qualifies…".
  const rule = BASKETBALL_SCENARIO.incomeCopy.outcome.rule ?? "";
  const outcomeRule = `Paid only if ${rule.charAt(0).toLowerCase()}${rule.slice(1)}`;
  // What Week 5 actually did to this plan. Only changes that moved money appear, so a setup
  // with no extra travel cost produces no card and nothing here is worth $0. These three ids
  // are the ones the component-selection observation has always read.
  /**
   * The cards, and what they may say.
   *
   * The task is "some of these changed this week, some did not — tap the ones that changed",
   * and the eyebrows used to answer it: **MONEY GONE**, **NEW BILL**, **ALREADY PROMISED**,
   * **ALREADY PAID**, **NEVER COUNTED**. Five labels partitioning the set exactly the way the
   * question does, which makes the only question on the screen a matter of reading five words
   * in capitals. The tag now says what *kind* of line it is, and both kinds contain cards that
   * moved and cards that did not, so it settles nothing.
   *
   * The details are facts about this student's own plan and about what each line is. What
   * they no longer contain is the verdict — "It is not coming", "A new bill" — because the
   * whole of the task is deriving that from the bulletins at the top of the screen and the
   * plan directly above the cards.
   */
  const moved = [
    ...(state.income.includeOutcome
      ? [{ id: "lost-outcome", kind: "lost" as const, tag: "Bonus", label: outcomeLabel, detail: `${outcomeRule} Your plan counted on it.`, amount: SCENARIO_NUMBERS.outcomeIncome as number }]
      : []),
    { id: "required-cost", kind: "bill" as const, tag: "Bill", label: BASKETBALL_SCENARIO.disruption.requiredCostLabel, detail: "What the clinic charges for the brace and the sessions.", amount: SCENARIO_NUMBERS.requiredWeek5Cost as number },
    ...(setup.eventCost > 0
      ? [{ id: "setup-cost", kind: "bill" as const, tag: "Bill", label: "Extra travel to rehab", detail: `Getting to rehab and back from the ${setup.title}.`, amount: setup.eventCost as number }]
      : []),
  ];
  // Real amounts out of this student's own season, each stated as what it is rather than as a
  // verdict on whether it belongs — working that out is the whole of the task.
  const held = [
    { id: "decoy-rent", kind: "committed" as const, tag: "Bill", label: "Where Avery lives", detail: `${SCENARIO_NUMBERS.weeks} weeks at the ${setup.title}.`, amount: Number(SCENARIO_NUMBERS.setupCosts[state.setupId]) },
    ...(state.income.includeOutcome
      ? []
      : [{ id: "decoy-outcome", kind: "uncounted" as const, tag: "Bonus", label: outcomeLabel, detail: `${outcomeRule} Your plan never counted on it.`, amount: SCENARIO_NUMBERS.outcomeIncome as number }]),
    ...(state.depositTaken
      ? [{ id: "decoy-deposit", kind: "committed" as const, tag: "Bill", label: "Course seat", detail: `Reserved at the Week ${SCENARIO_NUMBERS.course.depositDeadlineWeek} deadline.`, amount: Number(SCENARIO_NUMBERS.course.depositPrice) }]
      : []),
    { id: "decoy-essentials", kind: "committed" as const, tag: "Bill", label: "Food, phone and laundry", detail: `${formatDollars(SCENARIO_NUMBERS.essentialsPerWeek)} a week, all ${SCENARIO_NUMBERS.weeks} weeks.`, amount: Number(SCENARIO_NUMBERS.essentialsTotal) },
  ];
  // Interleaved to a fixed order rather than shuffled: the run has to be reproducible from the
  // log, and a set where every card that counts sits at the top is a set nobody has to read.
  const ORDER = ["decoy-rent", "lost-outcome", "decoy-outcome", "required-cost", "decoy-deposit", "setup-cost", "decoy-essentials"];
  const changes = [...moved, ...held].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const movedIds = new Set(moved.map((change) => change.id));
  // A reload during the reveal lands back on the reveal rather than on an unanswered box:
  // the record of the hand-over is the durable half of it, and it is already in `support`.
  const revealed = answerShown || state.support["week5-change"] === "answer_supplied";
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
      <PlanEcho mode="working" label="The plan Avery walked into this week with" note="It was built for a season that still had a showcase in it." />
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
              /* `data-line`, not `data-kind`: the stylesheet drew one border colour per kind,
                 and the kinds are the answer. See this component's note. */
              <button key={change.id} type="button" data-line={change.kind} aria-pressed={selected}
                // Shown the answer, the strip stops taking taps. It stays on screen and stays
                // readable — it is what the student is being shown — but a card tapped after
                // the product has named it is not a reading of anybody's plan, and `C5.3`
                // scores the selection without knowing how it was arrived at. What they had
                // tapped before they asked stands, which is what the observation is for.
                aria-disabled={revealed}
                onClick={() => { if (!revealed) dispatch({ type: "GAP_TILE_TOGGLED", tileId: change.id, selected: !selected }); }}>
                {/* A card with no mark on it is a card nobody knows they can press. */}
                <span className="gap-tiles__mark" aria-hidden="true" />
                <span className="gap-tiles__kind">{change.tag}</span>
                <span className="gap-tiles__label">
                  <b>{change.label}</b>
                  <small>{change.detail}</small>
                  {/* Said in words on the card, not drawn in a colour beside it, so it reads
                      the same to every student — and only once the answer has been asked for. */}
                  {revealed && movedIds.has(change.id) && <small>Week 5 changed this</small>}
                </span>
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
            // A student who worked the total out is done with this screen. A student who was
            // handed it has not seen the cards it came from yet, and that is the whole of what
            // the screen is asking, so the hand-over shows them and they say when to go on.
            onCorrect={() => { if (!handedOver.current) dispatch({ type: "GO_TO_STAGE", stage: "first-response" }); }}
            low="Too low. One of the cards that changed this week is missing from your total."
            high="Too high. Something in your total was already promised before Week 5, so it did not change."
            // How to read the cards, and not how many of them count. The count was the answer
            // to the half of this question the total does not carry, printed one rung early.
            scaffold="Take one card at a time and ask whether Week 5 changed that number. Money lost and a new bill make the same size hole, so add them together."
            onScaffold={() => dispatch({ type: "SCAFFOLD_OPENED", interactionId: "week5-change" })}
            onShowAndContinue={() => {
              handedOver.current = true;
              setAnswerShown(true);
              dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: "week5-change" });
            }}
          />
          {revealed && (
            <div className="stage-action" data-state="neutral">
              <p aria-live="polite">These are the ones Week 5 changed. Nothing else on this screen changed.</p>
              <Button type="button" onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "first-response" })}>Keep going</Button>
            </div>
          )}
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
          commitLabel="Save the last check"
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
           It is a status, so it is written as one. It is also the last thing on this screen
           before the board appears, so it is here on arrival and the region announces the
           change from two calls to one. */
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
  // The two pieces of this screen a reload used to destroy: the numbers tapped and the
  // paragraph a person is going to read and mark. Neither is an event — a half-written
  // sentence is not a claim about a student — so both are kept as drafts, written as they are
  // typed, and the screen comes back with the student's own words in it.
  const [selected, setSelected] = useDraft<string[]>(state.meta.worldId, "defense-tiles", state.defense.tileIds);
  const [text, setText] = useDraft(state.meta.worldId, "defense-text", state.defense.text);
  // Read once for the first render, then kept in step by the card's own callback. The card
  // owns the text; this screen owns the button; neither re-renders the other for free.
  const [closingOutstanding, setClosingOutstanding] = useState(() => closingAnswerOutstanding(state.meta.sessionId));
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
  // What this answer still needs, said out loud. The gate used to be a silent character
  // count: a student saw a dead button and one sentence of instruction that did not describe
  // the rule, and the fastest way past was padding.
  const gate = checkWriting({
    chosen: selected.flatMap((id) => {
      const tile = tiles.find((entry) => entry.id === id);
      return tile ? [{ label: tile.label, value: tile.value }] : [];
    }),
    text,
    whose: "Avery’s",
  });
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < NUMBERS_WANTED.max ? [...current, id] : current);
  return (
    <StageShell stage="defense" kicker="Week 8" title="Explain your plan.">
      <div className="interview">
        <section className="interview__ask scene">
          <CourtBackdrop variant="key" />
          <p className="eyebrow">Season review</p>
          <h2>Why does your plan hold up?</h2>
          {/* Two sentences, one box, because a second textarea would be a second writing task in
              a run already measured as more reading than deciding. The second sentence is the
              one BOW-B1's explanation requirement is scored against — what made one claim matter
              more than another — and it names the misconception out loud, because a rubric row
              that catches "it was the cheapest" is worth more if the student was told first. */}
          {/* It used to end "— 'it was the cheapest' is not an answer." Week 3 offers exactly
              that as one of its four answers, records it, and the ending says it back to the
              student in their own words. Telling a child three screens later that the answer
              the product took from them is not an answer is the product contradicting itself
              in front of them, and it does not teach the distinction — it only says the last
              thing they did was wrong. What separates price from worth is what the sentence
              now asks for, in the positive. */}
          <p>
            Say how it worked after Week 5, what you protected, and what you gave up. And say what
            made the thing you left unpaid in Week&nbsp;3 matter less than the ones you paid for —
            not what it cost, but what it was.
          </p>
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
            {/* Every rule, whether or not it is met, with the one thing outstanding named
                beside it. A student who cannot see the rule can only get past it by guessing,
                and the guess that worked was length. */}
            <div className="writing-rules" aria-live="polite">
              {gate.rules.map((rule) => (
                <p key={rule.id} data-met={rule.met}>
                  <span aria-hidden="true">{rule.met ? "✓" : "◦"}</span> {rule.said}
                </p>
              ))}
            </div>
            <Button aria-disabled={!gate.ready || closingOutstanding} onClick={() => gate.ready && !closingOutstanding && dispatch({ type: "DEFENSE_SUBMITTED", tileIds: selected, text })}>Turn in my plan</Button>
            {/* Named rather than left as a disabled button with no reason on it. A student who
                cannot see why the control is off can only get past it by guessing. */}
            {closingOutstanding && (
              <p className="writing-rules" aria-live="polite">
                <span aria-hidden="true">◦</span> Your teacher’s question needs an answer too.
              </p>
            )}
          </footer>
        </section>
        {/* The teacher's own question, after the challenge's own. Its own card, in their name,
            because a student has to be able to tell which one BOW is going to score. */}
        <ClosingQuestionCard
          sessionId={state.meta.sessionId}
          onAnswered={() => setClosingOutstanding(closingAnswerOutstanding(state.meta.sessionId))}
        />
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
            {/* The class, and not the seat. A seat is an internal allocation: since the door
                moved to /join a student never sees one, never types one and has never been told
                what one is, so the row was a word of vocabulary the run does not use. */}
            <dl className="handed-in__where">
              <div><dt>Class</dt><dd>{state.meta.classCode || "—"}</dd></div>
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
            <li key={category}>
              <span>{CHOICE_LABELS[category]}</span>
              <strong className="money">{category === "goal" ? courseRowReading(state.depositTaken, finalAmounts[category]) : formatDollars(finalAmounts[category])}</strong>
            </li>
          ))}
        </ul>
        <p className="handed-in__said">Your {state.defense.tileIds.length} numbers, and what you said about them:</p>
        {/* `data-own-words` marks this as the student's own writing for the reading-load ruler
            in `stages/readingLoad.test.tsx`, which reports it and does not charge it. A word
            count cannot tell comprehension from recognition, and re-reading your own paragraph
            ninety seconds after typing it to check it was sent is a glance rather than a read.
            Charged at 150 words a minute it made this the most expensive screen per second in
            the run and argued for deleting the receipt. The attribute belongs on this element
            and on nothing the product wrote. */}
        <blockquote data-own-words>{state.defense.text}</blockquote>
        {/* Was three sentences. The middle one — software can check the money but should not
            judge your thinking — is BOW's design philosophy addressed to a twelve-year-old who
            did not ask for it. What is left is the promise and the honest limit on it, which is
            the only claim on this screen a student could otherwise get wrong. */}
        <p className="handed-in__reader">A person reads the writing, not software. Nothing here has been read yet.</p>
      </section>

      {/* The paragraph that used to sit here said a different plan would have produced a
          different season — which is what the whole of Week 8 has just shown them, verdict by
          verdict — and then reassured them that starting again does not take this one back,
          which is what the button below it is for. Twenty-seven words, both of them already
          answered on screen. */}
      <div className="stage-action">
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
      // Both retired as screens. An attempt saved on either — a browser closed mid-run before
      // the contract screen was deleted, a log replayed out of the class service — opens on the
      // first screen that still exists rather than on a blank switch arm.
      case "the-offer": case "role-contract": case "setup-comparison": return <SetupStage />;
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
