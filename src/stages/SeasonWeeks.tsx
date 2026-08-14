import { useEffect, useMemo, useRef, useState } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { formatDollars } from "../domain/core/money";
import { depositPreview, seasonLedger } from "../domain/finance/timeline";
import type { PlanMode } from "../domain/finance/types";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { weeksBeforeDisruption } from "../domain/scenario/season";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { amountsFor } from "../domain/machine/selectors";

const PLAYED_WEEKS = weeksBeforeDisruption(SCENARIO_NUMBERS);
const DEADLINE = SCENARIO_NUMBERS.course.depositDeadlineWeek;
const REMAINING_WEEKS = SCENARIO_NUMBERS.weeks - PLAYED_WEEKS.length;

/**
 * Weeks 1 to 4, played rather than described.
 *
 * This screen used to be a static feed: four cards of text, a Continue button, and nothing
 * on it that a student could change or that changed because of them. It was the weakest
 * beat in the product and the one carrying the most weight, because everything after it
 * depends on the plan feeling like a commitment rather than a form.
 *
 * Now the weeks are stepped one at a time, and each step spends. Rent and essentials leave
 * the account at the rate the student's own housing charges them, and the hours the trip
 * costs pile up at the rate their own housing charges. Two students who chose differently
 * watch visibly different seasons — one is short of money by Week 4, the other is short of
 * time — and neither is being punished, because both are only seeing the bill for a
 * decision they already made.
 *
 * The last week is the course deposit deadline, which the scenario has always carried and
 * nothing has ever used. It is the right place for it: the student has just watched four
 * weeks of evidence about how their plan behaves, and still knows nothing about Week 5.
 * That is the whole shape of the challenge in one decision — commit early and cheaply, or
 * hold the money and keep the option.
 */
export function SeasonWeeks() {
  const { state, dispatch } = useChallenge();
  const [played, setPlayed] = useState(1);
  const [reserving, setReserving] = useState<boolean | null>(null);

  const setupId = state.setupId;
  const savedMode: PlanMode = state.saved.fallback ? "fallback" : "working";
  const amounts = amountsFor(state, savedMode);
  const ledger = useMemo(() => (setupId ? seasonLedger(setupId, PLAYED_WEEKS.length, SCENARIO_NUMBERS) : []), [setupId]);
  const allPlayed = played >= PLAYED_WEEKS.length;

  // The deadline replaces the "play the next week" control rather than appearing below it,
  // so without moving focus a keyboard or screen-reader user is left on a button that no
  // longer exists with no announcement that a decision arrived.
  const deadlineRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (allPlayed) deadlineRef.current?.focus();
  }, [allPlayed]);

  if (!setupId) return null;

  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === setupId)!;
  const now = ledger[played - 1]!;
  const preview = depositPreview(amounts.goal, SCENARIO_NUMBERS);

  const commit = () => {
    if (reserving === null) return;
    dispatch({ type: "COURSE_DEPOSIT_DECIDED", taken: reserving });
    dispatch({ type: "WEEK5_ADVANCE_CONFIRMED" });
  };

  return (
    <StageShell
      stage="season-weeks"
      kicker={`Weeks 1 to ${PLAYED_WEEKS.length}`}
      title="The season starts."
      position={{ caption: `Week ${now.week}`, played: now.week - 1, current: now.week }}
    >
      <div className="season">
        {/* The running state, kept beside the weeks rather than under them, so what a week
            costs is legible at the moment it costs it. */}
        <aside className="season-ledger" aria-label="Where Avery stands">
          <p className="field-label">After Week {now.week} · {setup.title}</p>
          <div className="season-ledger__row" data-tone="money">
            <span>Money in hand</span>
            <strong className="money">{formatDollars(now.inHand)}</strong>
            <small>{formatDollars(now.received)} arrived · {formatDollars(now.paid)} gone</small>
            <span className="season-ledger__bar" aria-hidden="true">
              <i style={{ width: `${Math.round((now.inHand / now.received) * 100)}%` }} />
            </span>
          </div>
          <div className="season-ledger__row" data-tone="time">
            <span>Hours on the road</span>
            <strong>{now.hoursToDate}h</strong>
            <small>{now.hoursThisWeek}h of Avery’s {SCENARIO_NUMBERS.load.weeklyCapacity} free hours, every week</small>
            <span className="season-ledger__bar" aria-hidden="true">
              <i style={{ width: `${Math.min(100, Math.round((now.hoursThisWeek / SCENARIO_NUMBERS.load.weeklyCapacity) * 100))}%` }} />
            </span>
          </div>
          <dl className="season-ledger__plan">
            <div><dt>Set aside for the course</dt><dd className="money">{formatDollars(amounts.goal)}</dd></div>
            <div><dt>Backup money</dt><dd className="money">{formatDollars(amounts.reserve)}</dd></div>
            <div><dt>Avery’s week</dt><dd className="money">{formatDollars(amounts.flexibleCash)}</dd></div>
          </dl>
          <p className="season-ledger__note">
            The eight-week costs you already committed to, arriving one week at a time.
          </p>
        </aside>

        <ol className="feed feed--season">
          {ledger.slice(0, played).map((week, index) => {
            const entry = BASKETBALL_SCENARIO.season[index]!;
            return (
              <li key={week.week}>
                <article className="post">
                  <p className="post__tag">{entry.week}</p>
                  <p className="post__note">{entry.note}</p>
                  <p className="post__spend">
                    <span>−{formatDollars(week.setupThisWeek + week.essentialsThisWeek)}</span>
                    <span>{week.hoursThisWeek}h on the road</span>
                  </p>
                  <blockquote className="post__voice">
                    <span className="post__who" aria-hidden="true">{BASKETBALL_SCENARIO.offer.jersey}</span>
                    <p>{entry.voice[setupId]}</p>
                  </blockquote>
                </article>
              </li>
            );
          })}
          {!allPlayed && (
            <li>
              <article className="post" data-state="next">
                <p className="post__tag">Week {played + 1}</p>
                <p className="post__note">Not played yet.</p>
              </article>
            </li>
          )}
        </ol>
      </div>

      {!allPlayed ? (
        <div className="stage-action">
          <p aria-live="polite">
            Week {now.week} cost Avery {formatDollars(now.setupThisWeek + now.essentialsThisWeek)} and {now.hoursThisWeek} hours.
            {" "}{formatDollars(now.inHand)} of the money that has arrived is still there.
          </p>
          <Button onClick={() => setPlayed((week) => Math.min(PLAYED_WEEKS.length, week + 1))}>Play Week {played + 1}</Button>
        </div>
      ) : (
        <section className="deposit-call deposit-call--deadline" aria-labelledby="deposit-heading">
          <div className="deposit-call__intro">
            <p className="field-label">Week {DEADLINE} · The course office</p>
            <h2 id="deposit-heading" ref={deadlineRef} tabIndex={-1}>Hold the seat now, or pay full price later?</h2>
            <p>
              The course starts the week the season ends and it is filling up. Hold a seat today for
              less, or wait and pay full price — with {REMAINING_WEEKS} weeks still to play and no
              idea what they hold.
            </p>
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
      )}
    </StageShell>
  );
}
