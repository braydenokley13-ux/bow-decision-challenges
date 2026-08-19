import { useMemo, useState } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { useDraft } from "../app/attemptStore";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { formatDollars } from "../domain/core/money";
import type { ClaimReasonId } from "../domain/core/ids";
import { hours } from "../domain/core/units";
import { depositPreview, seasonLedger } from "../domain/finance/timeline";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { weeksBeforeDisruption } from "../domain/scenario/season";
import { CLAIM_REASONS, costOfClaims, week3Claims } from "../domain/scenario/worlds/basketball/claims";
import { amountsFor } from "../domain/machine/selectors";

const PLAYED_WEEKS = weeksBeforeDisruption(SCENARIO_NUMBERS);
const DEADLINE = SCENARIO_NUMBERS.course.depositDeadlineWeek;
const REMAINING_WEEKS = SCENARIO_NUMBERS.weeks - PLAYED_WEEKS.length;
const CLAIMS = week3Claims();

/**
 * A sentence the student taps, put inside a sentence the product writes.
 *
 * The four reasons are written as things a student says out loud — "It was the cheapest one
 * to drop." — so dropping one into the middle of a clause produced "…because It was the
 * cheapest one to drop." One capital letter, and the sentence stops reading as English.
 */
function lowerFirst(label: string): string {
  const trimmed = label.replace(/\.$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}
const CASH = SCENARIO_NUMBERS.week3.cash;
const CASH_WEEK = SCENARIO_NUMBERS.week3.week;

/** The plan the student is living on, and the place they chose to live in. */
function useSeason() {
  const { state } = useChallenge();
  const setupId = state.setupId;
  // The plan the season runs on is the one the student committed, not the backup check they
  // were asked to build on top of it. The check asks "would this still hold if the money you
  // counted on never came" and is never a plan Avery lives on — every later board, the Week 5
  // arithmetic and Week 8's own reckoning all measure from the working plan, and this used to
  // be the one place that did not.
  const amounts = amountsFor(state, "working");
  const ledger = useMemo(() => (setupId ? seasonLedger(setupId, PLAYED_WEEKS.length, SCENARIO_NUMBERS) : []), [setupId]);
  return { setupId, amounts, ledger };
}

/**
 * Weeks 1 to 4, and the one decision inside them.
 *
 * This beat has been rebuilt three times. It began as a static feed of four cards and a
 * Continue button; it became four presses of "Play Week N", which looked like play and was
 * not; and it went back to a feed of four cards whose own deck opened with the sentence
 * *"Nothing here is new."* Three hundred and twenty rendered words, one button, and — read
 * back out of a real submission — an evidence log for the whole beat that said
 * `season-weeks: 1 event → STAGE_ENTERED`.
 *
 * The four weeks still resolve together, because that is what they are: one eight-week
 * commitment arriving on schedule, and watching it drain at the rate this student's housing
 * charges is worth the strip it takes. What is gone is the narration around it. What is
 * here instead is Week 3.
 *
 * **Week 3.** Avery covers a teammate's shift and is paid in cash. Three things want it in
 * the same week and together they cost more than it, so something is going to go unpaid;
 * and because the money is outside the plan and cannot be banked, the decision is not about
 * arithmetic. Two ways of spending it reach as far as the money goes — the shoes on their
 * own, or the trip and the present together — and they say opposite things about what
 * matters. Nothing on this screen prefers either.
 *
 * **Why the money is outside the plan.** `balance.ts` sweeps the whole space of plans a
 * student can reach and proves no strategy dominates. A new pot that could be moved into
 * the plan would multiply that space, for a beat whose subject is not the plan at all. So
 * this cash never touches the board, the snapshots, or the season ledger — and the sweep
 * runs over exactly the model it ran over before.
 *
 * The deposit deadline used to sit at the bottom of this page, under about fourteen hundred
 * pixels of feed. It is the pivot the whole design turns on, so it is its own screen below.
 */
export function SeasonWeeks() {
  const { state, dispatch } = useChallenge();
  const { setupId, ledger } = useSeason();
  // Selecting is not deciding — nothing is recorded until the settle — but a student who
  // has chosen and then reloads must not find the screen has forgotten, for the same reason
  // the deposit screen remembers: a page refresh may not quietly reverse a decision.
  const [funded, setFunded] = useDraft<string[]>(state.meta.worldId, "week3-claims", state.week3?.fundedIds ? [...state.week3.fundedIds] : []);
  const [reason, setReason] = useDraft<ClaimReasonId | null>(state.meta.worldId, "week3-reason", state.week3?.reason ?? null);
  // What the last press refused for, or null. Not a draft: it belongs to a press, and a
  // student who reloads has not just pressed anything.
  const [refusal, setRefusal] = useState<"nothing-paid" | "no-reason" | null>(null);
  if (!setupId) return null;

  const closing = ledger.at(-1)!;
  const scale = Math.max(1, closing.received);
  const spent = costOfClaims(funded);
  const left = CASH - spent;
  const inSentence = (claims: readonly typeof CLAIMS[number][]) => (claims.length <= 1
    ? claims[0]?.inSentence ?? ""
    : `${claims.slice(0, -1).map((claim) => claim.inSentence).join(", ")} and ${claims.at(-1)!.inSentence}`);
  const unfunded = CLAIMS.filter((claim) => !funded.includes(claim.id));
  const unpaidNames = inSentence(unfunded);
  const fundedNames = inSentence(CLAIMS.filter((claim) => funded.includes(claim.id)));

  const toggle = (id: string) => {
    setRefusal(null);
    setFunded(funded.includes(id) ? funded.filter((entry) => entry !== id) : [...funded, id]);
  };

  /**
   * The press always answers.
   *
   * The plan board next door was reported for exactly the opposite: a primary button that
   * refused silently, leaving a student unable to tell whether the application was broken or
   * they were. It was fixed with a real control and an alert saying what is missing, and a
   * greyed rectangle wearing an instruction as its label is the same defect wearing a
   * different hat — worse here, because the instruction is the only thing on screen telling
   * a twelve-year-old what to do and it is written on the one control they cannot use.
   */
  const settle = () => {
    if (funded.length === 0) return setRefusal("nothing-paid");
    if (reason === null) return setRefusal("no-reason");
    dispatch({ type: "COMPETING_CLAIMS_SETTLED", fundedIds: funded, reason });
  };

  return (
    <StageShell
      stage="season-weeks"
      kicker={`Weeks 1 to ${PLAYED_WEEKS.length}`}
      title={`Week ${CASH_WEEK} pays Avery in cash.`}
      focusOnArrival
    >
      <p className="stage-deck">
        Rent and the basics leave the account on schedule. Then Avery covers a teammate’s shift
        and is handed {formatDollars(CASH)}. It is not in the plan and it cannot go in — and three
        things want it before Sunday.
      </p>

      {/* Named rather than headed: the screen's own title already says which week this is,
          and a hidden heading repeating it is two more words in a beat that is being kept
          short on purpose. */}
      <section className="claims" aria-label={`The three claims on Week ${CASH_WEEK}’s cash`}>
        <ul className="claims__list">
          {CLAIMS.map((claim) => {
            const chosen = funded.includes(claim.id);
            const overBudget = !chosen && claim.cost > left;
            return (
              <li key={claim.id}>
                <button
                  type="button"
                  aria-pressed={chosen}
                  aria-disabled={overBudget}
                  onClick={() => !overBudget && toggle(claim.id)}
                >
                  {/* A card with no mark on it is a card nobody knows they can press — the
                      sentence this product already wrote once, about the Week 5 cards, and
                      the same square is drawn here for the same reason. Without it the three
                      claims read as facts and the four reason pills below them are the only
                      things on screen that look like controls, which invites a student to
                      answer the question before making the decision. */}
                  <span className="claims__mark" aria-hidden="true" />
                  <b>{claim.title}</b>
                  <strong className="money">{formatDollars(claim.cost)}</strong>
                  <span className="claims__detail">{claim.detail}</span>
                  {/* Only where it is true, and where it is true it is the whole reason the
                      card cannot be taken. A disabled control with no stated cause is a bug
                      as far as the person pressing it is concerned. */}
                  {overBudget && <em>More than the {formatDollars(left)} left.</em>}
                </button>
              </li>
            );
          })}
        </ul>
        {/* The one figure the decision turns on, and the sentence that makes leaving money
            behind a real cost here rather than a free saving.

            It used to read "Cash Avery does not spend this week goes nowhere", which is a
            claim about money and not a true one: a person handed cash can keep it. What is
            true is narrower and is what it says now — this cash does not reach the plan, and
            none of these three claims is served by holding on to it. An economics review
            found the false version in both worlds; `worlds/basketball/claims.ts` records why
            the beat is walled off from the plan and what a real fourth "keep it" option would
            cost. "What Avery does not spend" was also read as though it could mean the plan;
            it is the cash and only the cash, and the sentence has to survive one reading. */}
        <p className="claims__left" aria-live="polite">
          <strong className="money">{formatDollars(left)}</strong>
          <span>left of {formatDollars(CASH)}. What Avery keeps in hand does nothing for any of these three.</span>
        </p>

        {/* Not asked until something has actually been left out. Asked at the top of the
            screen it is a question about nothing — all three claims are still in — and it is
            answerable, which lets a student tap a reason first and then allocate to fit it.
            That turns a judgement about what matters into a justification exercise, and it is
            the one thing this beat exists to avoid. */}
        {funded.length > 0 && (
          <div className="claims__why">
            {/* Named, not "the rest". The question is about the specific things this student
                is walking away from, and reading their own names beside the four answers is
                what makes an answer that is not true of them visible — calling the shoes that
                are splitting the one Avery only wanted is a much harder thing to tap when the
                shoes are in the question. */}
            <p className="field-label" id="why-heading">What made you leave {unpaidNames} out?</p>
            <ul aria-labelledby="why-heading">
              {CLAIM_REASONS.map((entry) => (
                <li key={entry.id}>
                  <button type="button" aria-pressed={reason === entry.id} onClick={() => { setRefusal(null); setReason(entry.id); }}>
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* The drain, and nothing around it. Two students who chose differently read visibly
          different seasons off the same four bars, and neither is being punished — both are
          seeing the bill for a decision they already made. */}
      <aside className="season-run" aria-label={`Weeks 1 to ${PLAYED_WEEKS.length}`}>
        {/* "Left in hand" over a bar that climbs every week fought itself: the money is not
            draining, it is pay arriving faster than rent and the basics leave. The label says
            what the figure is and lets the direction be what it is. */}
        <p className="field-label">
          In hand at the end of each week · {hours(closing.hoursToDate)} on the road
        </p>
        <ol>
          {ledger.map((week) => (
            <li key={week.week} data-now={week.week === CASH_WEEK}>
              <span>Week {week.week}</span>
              <strong className="money">{formatDollars(week.inHand)}</strong>
              <i aria-hidden="true" style={{ width: `${Math.max(2, Math.round((week.inHand / scale) * 100))}%` }} />
            </li>
          ))}
        </ol>
      </aside>

      <div className="stage-action">
        {/* An answer to something the student just did, so it is an alert. Both branches name
            what is missing rather than repeating the instruction that is already on screen. */}
        {refusal !== null && (
          <p className="claims__refusal" role="alert">
            {refusal === "nothing-paid"
              ? <><b>Nothing paid for yet.</b> This money is Avery’s, not the plan’s, so it does not reach the plan. These three are what it can do something about this week — pay for at least one of them.</>
              : <><b>One thing left.</b> Say what made you leave {formatDollars(CASH - spent)} worth of it out.</>}
          </p>
        )}
        {/* The pairing the whole beat is about, stated once the student has made both halves
            of it and directly above the press that records them. It is the same sentence the
            evidence trail will carry, and it is here because a run in which the claim and the
            reason are never on screen together is a run where the second is answered without
            reading the first. */}
        {/* Permanent, so the sentence is announced when it arrives rather than appearing in a
            region that was not there a moment ago. An empty paragraph in this bar takes no
            height and the button keeps its place. */}
        <p className="claims__settled" aria-live="polite">
          {funded.length > 0 && reason !== null && (
          <>
            <strong>{formatDollars(spent)}</strong> goes on {fundedNames}. {unpaidNames.charAt(0).toUpperCase()}{unpaidNames.slice(1)} {unfunded.length > 1 ? "go" : "goes"} unpaid,
            because <strong>{lowerFirst(CLAIM_REASONS.find((entry) => entry.id === reason)?.label ?? "")}</strong>.
          </>
          )}
        </p>
        <Button onClick={settle}>Week {DEADLINE} · the course office is calling</Button>
      </div>
    </StageShell>
  );
}

/**
 * The course seat, as its own moment.
 *
 * This is the pivot of the design — commit early and cheaply, or hold the money and keep the
 * option — and it used to be a panel below four weeks of feed on a screen already fourteen
 * hundred pixels tall. It is one decision, so it is one screen, and both sides of it are
 * stated in the same register: what each costs, and what each does to the money that still
 * has to survive whatever is left of the season.
 *
 * Nothing here recommends either answer, and nothing downstream scores which one the student
 * picks. What Week 8 says about it is derived from what the season actually did with the
 * money — which is exactly why the trade has to be legible before it is taken.
 */
export function DepositDeadline() {
  const { state, dispatch } = useChallenge();
  const { setupId, amounts } = useSeason();
  // Selecting a price is not yet deciding it — nothing is recorded until "lock it in" — but a
  // student who has chosen and then reloads should not find the screen has forgotten. It came
  // back saying "wait and decide later" to students who had selected the deposit, which is the
  // pivot decision of the whole design being quietly reversed by a page refresh.
  const [reserving, setReserving] = useDraft<boolean | null>(state.meta.worldId, "deposit-choice", state.depositTaken);
  if (!setupId) return null;

  const preview = depositPreview(amounts, SCENARIO_NUMBERS);

  const commit = () => {
    if (reserving === null) return;
    dispatch({ type: "COURSE_DEPOSIT_DECIDED", taken: reserving });
    dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" });
  };

  return (
    <StageShell
      stage="week5-transition"
      kicker={`Week ${DEADLINE} · The course office`}
      title="Hold the seat now, or pay full price later?"
      focusOnArrival
    >
      <p className="stage-deck">
        The sports-media course starts the week the season ends and it is filling up. There are
        two prices for the same seat, and {REMAINING_WEEKS} weeks still to play.
      </p>

      <section className="deposit-call deposit-call--deadline" aria-labelledby="deposit-heading">
        {/* The list that used to sit here named both options, both prices and both
            consequences — fifty-four words — directly above two buttons that name the same two
            options, the same two prices and the same two consequences, and directly above a
            live line that prices whichever one is selected against this student's own plan.
            Three statements of one trade on one screen. The buttons are the decision, so the
            buttons keep it; what the list alone carried, how much stays movable either way, is
            what the live line below says once a side is picked. */}
        <div className="deposit-call__intro">
          <h2 id="deposit-heading">Two prices for the same seat.</h2>
        </div>
        <div className="deposit-call__options">
          <button type="button" aria-pressed={reserving === true} onClick={() => setReserving(true)}>
            <b>Reserve it now</b>
            <strong className="money">{formatDollars(preview.price)}</strong>
            <span>{formatDollars(preview.saving)} cheaper. The money stops being yours to move.</span>
          </button>
          <button type="button" aria-pressed={reserving === false} onClick={() => setReserving(false)}>
            <b>Wait and decide later</b>
            <strong className="money">{formatDollars(preview.laterPrice)}</strong>
            <span>Costs more. Every dollar stays where you can reach it.</span>
          </button>
        </div>
        {/* Worked out before the student commits, never discovered afterwards. A plan that
            set nothing aside can still reserve the seat; it just sees how far under that
            puts it first. */}
        <p className="deposit-call__effect" aria-live="polite">
          {reserving === null
            ? `Your plan has ${formatDollars(preview.setAside)} set aside for the course. Pick one to see what it does.`
            : reserving === false
              ? `Nothing moves today. The course still needs ${formatDollars(preview.laterPrice)} by the end of the season, and your plan holds ${formatDollars(preview.setAside)} toward it.`
              : preview.shortBy > 0
                ? `The seat is yours. ${formatDollars(preview.setAside)} of it comes from your course money and the plan is ${formatDollars(preview.shortBy)} short — you will have to find that somewhere else.`
                : preview.freed > 0
                  ? `The seat is yours and the course is paid. ${formatDollars(preview.freed)} of course money comes back needing a new job.`
                  : "The seat is yours and the course is paid in full. Your course money covered it exactly."}
        </p>
        {/* "Whatever the last weeks bring, it lands on the plan you already built" used to sit
            here. The deck at the top of this screen already says there are weeks still to play,
            and the button says the call is being locked in. */}
        <div className="stage-action">
          <Button aria-disabled={reserving === null} onClick={commit}>
            {reserving === null ? "Make the call to continue" : "Lock it in and play Week 5"}
          </Button>
        </div>
      </section>
    </StageShell>
  );
}
