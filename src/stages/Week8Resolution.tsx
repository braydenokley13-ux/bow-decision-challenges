import { useMemo } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { dollars, formatDollars } from "../domain/core/money";
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
  const opening = amountsFor(state, state.saved.fallback ? "fallback" : "working");
  const response = snapshotForMode(state, "week5-first-response");
  const bonusLabel = BASKETBALL_SCENARIO.incomeCopy.completion.label;
  /**
   * What Week 5 asked of the plan Avery walked into it with, and what was left that could
   * still move. Both are read off plans the student saved — the shortfall is this world's own
   * pricing of their pre-Week-5 amounts against the Week 5 board, and the movable money is
   * what those amounts held. A reserved seat has already emptied the course line, so the same
   * sum is the right one either way.
   */
  const pressure = useMemo<Week5Pressure | undefined>(
    () => (response
      ? {
          shortfall: residualOf(balanceOf({ ...response, amounts: opening }, SCENARIO_NUMBERS)),
          movable: assigned(opening),
          courseLineCut: final ? final.amounts.goal < opening.goal : false,
        }
      : undefined),
    [response, opening, final],
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
        .map((claim) => ({ id: claim.id, label: claim.verdictLabel, cost: claim.cost, wentUnpaid: claim.wentUnpaid })),
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
  const averyLine = !resolution.attendanceHeld
    ? resolution.uncovered > 0
      ? `I missed a session in Week ${resolution.bonusLostWeek} and the bonus went with it. We had nothing saved for it.`
      : `I missed a session in Week ${resolution.bonusLostWeek} and the bonus went with it. You kept enough back that it did not sink us.`
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
          <ol className="resolve-weeks__list">
            {resolution.weeks.map((week) => (
              <li key={week.week} data-made={week.madeIt}>
                <span>Week {week.week}</span>
                <b>{week.madeIt ? "Made every session" : "Missed a session"}</b>
              </li>
            ))}
          </ol>
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
              ? `${formatDollars(resolution.spentOnTime)} of the plan went into Avery’s week and bought ${load.bought} hours back.`
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
