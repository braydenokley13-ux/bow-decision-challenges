import { useMemo, useState } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { formatDollars } from "../domain/core/money";
import { hours, hoursPerWeek } from "../domain/core/units";
import { depositPreview, seasonLedger } from "../domain/finance/timeline";
import type { PlanMode } from "../domain/finance/types";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { weeksBeforeDisruption } from "../domain/scenario/season";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { amountsFor } from "../domain/machine/selectors";

const PLAYED_WEEKS = weeksBeforeDisruption(SCENARIO_NUMBERS);
const DEADLINE = SCENARIO_NUMBERS.course.depositDeadlineWeek;
const REMAINING_WEEKS = SCENARIO_NUMBERS.weeks - PLAYED_WEEKS.length;

/** The plan the student is living on, and the place they chose to live in. */
function useSeason() {
  const { state } = useChallenge();
  const setupId = state.setupId;
  const savedMode: PlanMode = state.saved.fallback ? "fallback" : "working";
  const amounts = amountsFor(state, savedMode);
  const ledger = useMemo(() => (setupId ? seasonLedger(setupId, PLAYED_WEEKS.length, SCENARIO_NUMBERS) : []), [setupId]);
  return { setupId, amounts, ledger };
}

/**
 * Weeks 1 to 4, played in one screen.
 *
 * This beat has been rebuilt twice and for the same reason both times. It began as a static
 * feed of four cards and a Continue button. It became four presses of "Play Week N" — which
 * looked like play and was not: every week charged the same rent, took the same hours and
 * asked the student for nothing, so three of the four presses were ceremony over a number
 * that had already been decided on the planning board.
 *
 * The weeks now resolve together, because that is what they are: one eight-week commitment
 * arriving on schedule. What is worth watching is not *whether* the money leaves, it is *how
 * fast it leaves for the plan this student built* — so the four weeks are drawn as a drain,
 * week by week, on their own account, and the hours their own housing charges pile up beside
 * it. Two students who chose differently read visibly different seasons off the same screen,
 * and neither is being punished: both are only seeing the bill for a decision they already
 * made.
 *
 * The deposit deadline used to sit at the bottom of this page, under about fourteen hundred
 * pixels of feed. It is the pivot the whole design turns on, so it is now its own screen.
 */
export function SeasonWeeks() {
  const { dispatch } = useChallenge();
  const { setupId, amounts, ledger } = useSeason();
  if (!setupId) return null;

  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === setupId)!;
  const closing = ledger.at(-1)!;
  const opening = ledger[0]!;
  const spent = closing.paid;
  const scale = Math.max(1, closing.received);

  return (
    <StageShell
      stage="season-weeks"
      kicker={`Weeks 1 to ${PLAYED_WEEKS.length}`}
      title="The season starts."
    >
      <p className="stage-deck">
        Four weeks of the plan you built, paid out one week at a time. Nothing here is new —
        it is the {formatDollars(spent)} you already committed, leaving the account on schedule.
      </p>
      <div className="season">
        {/* The running state, kept beside the weeks rather than under them, so what a week
            costs is legible at the moment it costs it. */}
        <aside className="season-ledger" aria-label="Where Avery stands">
          <p className="field-label">After Week {closing.week} · {setup.title}</p>
          <div className="season-ledger__row" data-tone="money">
            <span>Money in hand</span>
            <strong className="money">{formatDollars(closing.inHand)}</strong>
            <small>{formatDollars(closing.received)} arrived · {formatDollars(closing.paid)} gone</small>
            <span className="season-ledger__bar" aria-hidden="true">
              <i style={{ width: `${Math.round((closing.inHand / scale) * 100)}%` }} />
            </span>
          </div>
          <div className="season-ledger__row" data-tone="time">
            <span>Hours on the road</span>
            <strong>{closing.hoursToDate}h</strong>
            <small>{closing.hoursThisWeek}h of Avery’s {SCENARIO_NUMBERS.load.weeklyCapacity} free hours, every week</small>
            <span className="season-ledger__bar" aria-hidden="true">
              <i style={{ width: `${Math.min(100, Math.round((closing.hoursThisWeek / SCENARIO_NUMBERS.load.weeklyCapacity) * 100))}%` }} />
            </span>
          </div>
          <dl className="season-ledger__plan">
            <div><dt>Set aside for the course</dt><dd className="money">{formatDollars(amounts.goal)}</dd></div>
            <div><dt>Backup money</dt><dd className="money">{formatDollars(amounts.reserve)}</dd></div>
            <div><dt>Rides and rest</dt><dd className="money">{formatDollars(amounts.flexibleCash)}</dd></div>
          </dl>
          <p className="season-ledger__note">
            These three have not been touched. Rent and the weekly basics are what came out.
          </p>
        </aside>

        <ol className="feed feed--season">
          {ledger.map((week, index) => {
            const entry = BASKETBALL_SCENARIO.season[index]!;
            return (
              <li key={week.week}>
                <article className="post">
                  <p className="post__tag">{entry.week}</p>
                  <p className="post__note">{entry.note}</p>
                  <p className="post__spend">
                    <span>−{formatDollars(week.setupThisWeek + week.essentialsThisWeek)}</span>
                    <span>{hoursPerWeek(week.hoursThisWeek)} on the road</span>
                  </p>
                  {/* What was still in the account at the end of this week, drawn against
                      what had arrived by then. Pay lands weekly and outruns the weekly costs,
                      so this climbs — the housing choice shows up as how fast. It is the one
                      line on this screen that answers differently for two students who chose
                      differently. */}
                  <p className="post__hand">
                    <span>Left in hand</span>
                    <strong className="money">{formatDollars(week.inHand)}</strong>
                    <span className="post__hand-bar" aria-hidden="true">
                      <i style={{ width: `${Math.max(2, Math.round((week.inHand / scale) * 100))}%` }} />
                    </span>
                  </p>
                  <blockquote className="post__voice">
                    <span className="post__who" aria-hidden="true">#{BASKETBALL_SCENARIO.offer.jersey}</span>
                    <cite>Avery</cite>
                    <p>{entry.voice[setupId]}</p>
                  </blockquote>
                </article>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="stage-action">
        <p aria-live="polite">
          Four weeks at the {setup.title}: {formatDollars(spent)} gone, {hours(closing.hoursToDate)} on the road,
          {" "}{formatDollars(closing.inHand)} still in hand. Week {opening.week} looked the same as Week {closing.week} — that is what a plan
          holding is supposed to look like.
        </p>
        <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "week5-transition" })}>
          Week {DEADLINE} · the course office is calling
        </Button>
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
  const [reserving, setReserving] = useState<boolean | null>(state.depositTaken);
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
        <div className="deposit-call__intro">
          <h2 id="deposit-heading">Two prices, and what each one does to the plan.</h2>
          {/* Both sides in the same shape and the same number of words. The screen states the
              trade; it does not lean on it. */}
          <ul className="deposit-call__trade">
            <li>
              <b>Reserve it now</b>
              <span>{formatDollars(preview.price)} today. That money is committed, and the plan meets the rest of the season on the {formatDollars(preview.movableAfter)} left in your other two lines.</span>
            </li>
            <li>
              <b>Wait and decide later</b>
              <span>{formatDollars(preview.laterPrice)} at the end of the season — {formatDollars(preview.saving)} more. Every one of the {formatDollars(preview.movableNow)} in your plan stays where you can move it.</span>
            </li>
          </ul>
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
        <div className="stage-action">
          <p>Whatever the last {REMAINING_WEEKS} weeks bring, it lands on the plan you already built.</p>
          <Button aria-disabled={reserving === null} onClick={commit}>
            {reserving === null ? "Make the call to continue" : "Lock it in and play Week 5"}
          </Button>
        </div>
      </section>
    </StageShell>
  );
}
