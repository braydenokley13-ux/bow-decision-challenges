import { useMemo } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { dollars, formatDollars } from "../domain/core/money";
import { hours } from "../domain/core/units";
import { resolveSeason, type CompetingClaimsOutcome, type RiskVerdict, type Week5Pressure } from "../domain/finance/resolution";
import { assigned, balanceOf, residualOf } from "../domain/finance/formulas";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { claimReason, costOfClaims, week3Claims } from "../domain/scenario/worlds/basketball/claims";
import { amountsFor, snapshotForMode } from "../domain/machine/selectors";

const OUTCOME_LABEL: Record<RiskVerdict["outcome"], string> = {
  paid_off: "Paid off",
  cost_you: "Cost you",
  fell_short: "Fell short",
  no_effect: "No effect",
};

/**
 * Week 8. The season resolves.
 *
 * The product used to end without the season ending: a student built a plan, absorbed a
 * shock, repaired it, wrote a paragraph, and never found out what happened to Avery. Every
 * decision they made was a decision about a future the product never showed them.
 *
 * Nothing here is rolled and nothing here is new information. It is the same load model,
 * the same money model and the student's own final plan, run forward three weeks. The part
 * that makes it worth watching is the counterfactuals: a student does not only learn that
 * the bonus did not arrive, they learn it would have arrived if they had not taken the
 * clinics — which is a thing two students can genuinely disagree about afterwards.
 *
 * This sits before the written explanation on purpose. A student who has seen how it went
 * can say what they would protect next time; a student who has not can only restate their
 * plan.
 */
export function Week8Resolution() {
  const { state, dispatch } = useChallenge();
  const final = snapshotForMode(state, "final");
  // The plan the season ran on. The backup check is a what-if built on top of it and is not
  // what Week 5 landed on, so reading the shortfall off it understated what the student
  // actually had to absorb.
  const opening = amountsFor(state, "working");
  const response = snapshotForMode(state, "week5-first-response");
  const bonusLabel = BASKETBALL_SCENARIO.incomeCopy.completion.label;
  /**
   * What Week 5 asked of the plan Avery walked into it with, and what was left that could
   * still move. Both are read off plans the student saved — the shortfall is this world's own
   * pricing of their pre-Week-5 amounts against the Week 5 board, and the movable money is
   * what those amounts held. A reserved seat has already emptied the course line, so the same
   * sum is the right one either way.
   *
   * Whether the student took the course line down is *not* passed from here. It used to be,
   * as `final.amounts.goal < opening.goal`, which is true of every student who reserved the
   * seat after saving for it — the product empties that row, not the student. `resolveSeason`
   * derives it from the row's own ceiling.
   */
  const pressure = useMemo<Week5Pressure | undefined>(
    () => (response
      ? {
          shortfall: residualOf(balanceOf({ ...response, amounts: opening }, SCENARIO_NUMBERS)),
          movable: assigned(opening),
        }
      : undefined),
    [response, opening],
  );
  /**
   * Week 3, coming back.
   *
   * Something always went unpaid — three claims cost more than the cash between them — so
   * the ending has something to say about this week for every student who reached it, and
   * what it says is read off their own settlement rather than chosen from a list of
   * outcomes. A run that never got there passes nothing and the panel is exactly as it was.
   */
  const claims = useMemo<CompetingClaimsOutcome | undefined>(() => {
    if (!state.week3) return undefined;
    const funded = state.week3.fundedIds;
    const spent = costOfClaims(funded);
    return {
      cash: SCENARIO_NUMBERS.week3.cash,
      spent: dollars(spent),
      leftOver: dollars(SCENARIO_NUMBERS.week3.cash - spent),
      paidFor: week3Claims().filter((claim) => funded.includes(claim.id)).map((claim) => claim.inSentence),
      unpaid: week3Claims()
        .filter((claim) => !funded.includes(claim.id))
        .map((claim) => ({ id: claim.id, label: claim.verdictLabel, inSentence: claim.inSentence, cost: claim.cost, wentUnpaid: claim.wentUnpaid })),
      reasonToldBack: claimReason(state.week3.reason).toldBack,
    };
  }, [state.week3]);
  const resolution = useMemo(
    () => (final ? resolveSeason(final, SCENARIO_NUMBERS, opening, bonusLabel, pressure, claims) : null),
    [final, opening, bonusLabel, pressure, claims],
  );
  if (!final || !resolution) return null;

  const { load } = resolution;

  // Avery's own line, chosen by what actually happened rather than by how well it went.
  const decidingWeeks = resolution.weeks.length;
  // "Put by" is a British idiom for *saved*, and it was landing in Avery's own voice at the
  // peak of the story in front of American twelve-year-olds. The four lines are also shorter
  // than they were: this is the one place on the screen where a sentence is doing emotional
  // work rather than reporting, and a long one blunts it.
  // Avery is speaking to the student, so every line stays in that one relation. The second
  // of these used to read "You kept enough back that it did not sink us" — a reassurance
  // rather than a report, and a slide from *you* to *us* inside one sentence. What Avery has
  // to say here is what happened to Avery.
  const averyLine = !resolution.attendanceHeld
    ? resolution.uncovered > 0
      ? `I missed a session in Week ${resolution.bonusLostWeek} and the bonus went with it. There was no backup money left to cover it.`
      : `I missed a session in Week ${resolution.bonusLostWeek} and the bonus went with it. The backup money you kept covered it.`
    : resolution.unplannedGain > 0
      ? `Every session, all ${decidingWeeks} weeks. The bonus turned up and neither of us was counting on it.`
      : `Every session, all ${decidingWeeks} weeks. The bonus landed exactly as you planned.`;

  return (
    <StageShell
      stage="week8-resolution"
      kicker={`Week ${SCENARIO_NUMBERS.weeks}`}
      title="The season ends."
      tone="dark"
      /* Beat 1: the three weeks that decided the bonus, played out against the line the
         student's own plan left Avery sitting on. */
      banner={
        <div className="resolve-weeks" aria-label="The last weeks">
          <div className="resolve-weeks__read">
            <p className="eyebrow">Avery’s week, weeks {resolution.weeks[0]?.week}–{SCENARIO_NUMBERS.weeks}</p>
            <p className="resolve-weeks__load">
              <strong>{load.net} hours</strong>
              <span>of getting places every week, and only {load.limit} spare to do it in.</span>
            </p>
          </div>
          {/* What the week did, not what Avery is like.

              These read "Missed a session" three times over for a student whose only decision
              was a cheaper room, and an economics review named it the finding a teacher would
              raise first: the model has never read Avery's diligence — `load.attendanceHolds`
              is hours on the road against hours the plan bought back — and a run that prints
              three weeks of missed sessions is telling a child that being careful with money
              made the character unreliable. In a unit whose subject is that being careful with
              money is a virtue.

              The trade itself is good and stays exactly as it is: a cheap room far from the
              club really does cost hours, and money and time competing is the best thing in
              this world. What is fixed is the sentence, which now says what ran out. */}
          <ol className="resolve-weeks__list">
            {resolution.weeks.map((week) => (
              <li key={week.week} data-made={week.madeIt}>
                <span>Week {week.week}</span>
                <b>{week.madeIt ? "Made every session" : "The travel did not fit"}</b>
              </li>
            ))}
          </ol>
          {/* Said once, under the list, and only where there is something to explain away. A
              child reading a column of weeks that did not work needs to be told, in the
              product's own voice, that it is not a verdict on the person. */}
          {resolution.weeks.some((week) => !week.madeIt) && (
            <p className="resolve-weeks__cause">
              None of this is about how hard Avery tried. A week fits or it does not, and what
              decides it is the hours the road takes.
            </p>
          )}
          <blockquote className="post__voice post__voice--scene">
            <span className="post__who" aria-hidden="true">#{BASKETBALL_SCENARIO.offer.jersey}</span>
            <cite>Avery</cite>
            <p>{averyLine}</p>
          </blockquote>
        </div>
      }
    >
      {/* Beat 2: where the money landed. Only lines that actually happened are drawn, so
          nothing on this panel is a zero standing in for an event that never occurred. */}
      <div className="resolve-grid">
        <section className="resolve-card" data-tone={resolution.uncovered > 0 ? "over" : "balanced"}>
          <p className="field-label">The {bonusLabel}</p>
          {resolution.attendanceHeld ? (
            <>
              <strong className="money">+{formatDollars(SCENARIO_NUMBERS.completionIncome)}</strong>
              <p>{resolution.countedOnBonus ? "It arrived, and your plan was built on it." : "It arrived, and your plan never needed it."}</p>
            </>
          ) : (
            <>
              <strong className="money">{formatDollars(0)}</strong>
              <p>
                {resolution.countedOnBonus
                  ? `Your plan expected ${formatDollars(resolution.shortfall)} that never came.`
                  : "It never came, and your plan was never counting on it."}
              </p>
            </>
          )}
          {resolution.shortfall > 0 && (
            <dl className="resolve-card__lines">
              <div><dt>Backup money you kept</dt><dd className="money">{formatDollars(resolution.bufferHeld)}</dd></div>
              <div><dt>What it absorbed</dt><dd className="money">{formatDollars(resolution.absorbed)}</dd></div>
              <div data-alert={resolution.uncovered > 0}><dt>Left uncovered</dt><dd className="money">{formatDollars(resolution.uncovered)}</dd></div>
            </dl>
          )}
        </section>

        <section className="resolve-card" data-tone={resolution.courseFunded ? "balanced" : "over"}>
          <p className="field-label">{BASKETBALL_SCENARIO.goalLabel}</p>
          <strong className="money">{formatDollars(resolution.courseSaved)}</strong>
          <p>
            {/* What happened to the goal, and nothing about how. A student who reserved the
                seat gets the full price story from the verdict below, which also says what
                reserving early saved them; saying it twice on one screen is what the ending
                did before. */}
            {resolution.courseFunded
              ? final.depositTaken
                ? "The seat is held and paid. Avery starts the week the season ends."
                : `Enough for the ${formatDollars(resolution.coursePrice)} place. Avery starts the week the season ends.`
              : `${formatDollars(resolution.courseShort)} short of the ${formatDollars(resolution.coursePrice)} place. Avery does not start this term.`}
          </p>
          {/* The two figures on this screen that did not add up, made to add up in words.

              `courseSaved` is the goal row; `endCash` on the card beside this one is the
              buffer that survived plus anything unplanned. They are separate accumulators and
              they never meet, so 1,676 of the 6,552 reachable endings print *"Avery does not
              start this term"* inches from a card holding more than the shortfall. An
              economics review called that the one thing in this model that teaches something
              false about money without qualification, and they were right that the screen was
              silent about it. `finance/resolution.ts` carries the measurement and why letting
              the cash flow was written, swept and reverted: it puts an answer key in the
              challenge.

              So the ending says what happened instead. The claim is narrow and true of this
              model — that money was never sent to the course — and where it would have closed
              the gap the screen says so rather than hoping the student does not notice. That
              is a better lesson than the silence was: it is the product's own thesis, which is
              that a goal is reached by the money a plan sends to it. */}
          {!resolution.courseFunded && resolution.endCash > 0 && (
            <p className="resolve-card__reconcile">
              Avery ends the season with {formatDollars(resolution.endCash)} in hand.
              {" "}{resolution.endCash >= resolution.courseShort
                ? "It would have covered this, and none of it was ever sent to the course."
                : "None of it was ever sent to the course."}
              {" "}A goal is reached by the money a plan puts toward it.
            </p>
          )}
        </section>

        <section className="resolve-card" data-tone="neutral">
          <p className="field-label">What Avery ends with</p>
          <strong className="money">{formatDollars(resolution.endCash)}</strong>
          {/* A headline number with nothing to read it against tells a student nothing: $250
              is either a good season or a bad one and the figure alone cannot say which. The
              two lines it is actually measured against are what the season started with and
              what this plan set aside to survive on. */}
          <dl className="resolve-card__lines">
            <div><dt>Avery started the eight weeks with</dt><dd className="money">{formatDollars(SCENARIO_NUMBERS.savings)}</dd></div>
            <div><dt>Backup money this plan kept</dt><dd className="money">{formatDollars(resolution.bufferHeld)}</dd></div>
          </dl>
          <p>
            {resolution.spentOnTime > 0
              ? `${formatDollars(resolution.spentOnTime)} of the plan went into Avery’s week and bought ${hours(load.bought)} back.`
              : "None of the plan went into buying Avery’s time back."}
          </p>
        </section>
      </div>

      {/* Beat 3: which risk paid and which one cost, each with the counterfactual that
          makes it answerable rather than merely true. */}
      <section className="resolve-risks" aria-labelledby="risks-heading">
        <div className="section-heading">
          <p className="eyebrow">Your calls</p>
          <h2 id="risks-heading">What each decision actually did.</h2>
        </div>
        <ul>
          {resolution.risks.map((risk) => (
            <li key={risk.id} data-outcome={risk.outcome} data-taken={risk.taken}>
              <span className="resolve-risks__verdict">{OUTCOME_LABEL[risk.outcome]}</span>
              <div>
                <b>{risk.label}</b>
                <p>{risk.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Beat 4 used to sit here: "What moved after Week 5", three rows of before-and-after
          and a note explaining why the plan finished larger. It is gone, and the reason is the
          list directly above it. Every row it drew was the money consequence of a decision the
          verdicts already name and price — its closing note, that coaching the Saturday clinics
          is why the final plan holds more than the opening one, is verdict three said a second
          time — and the three current amounts are on the money rail on every screen of the run.
          Sixty words at the emotional end of a season, none of them new. */}

      <div className="stage-action">
        <p>Now say why you played it that way.</p>
        <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "defense" })}>Explain my plan</Button>
      </div>
    </StageShell>
  );
}
