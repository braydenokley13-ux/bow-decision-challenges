import { useMemo } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { StageShell } from "../app/StageShell";
import { Button } from "../components/primitives/Button";
import { formatDollars } from "../domain/core/money";
import { resolveSeason, type RiskVerdict } from "../domain/finance/resolution";
import { CHOICE_LABELS, CHOICE_ORDER } from "../components/financial/choices";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
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
  const bonusLabel = BASKETBALL_SCENARIO.incomeCopy.completion.label;
  const resolution = useMemo(
    () => (final ? resolveSeason(final, SCENARIO_NUMBERS, opening, bonusLabel) : null),
    [final, opening, bonusLabel],
  );
  if (!final || !resolution) return null;

  const setup = BASKETBALL_SCENARIO.setups.find((item) => item.id === final.setupId)!;
  const { load } = resolution;

  // Avery's own line, chosen by what actually happened rather than by how well it went.
  const decidingWeeks = resolution.weeks.length;
  const averyLine = !resolution.attendanceHeld
    ? resolution.uncovered > 0
      ? `The weeks got away from me. I missed my first session in Week ${resolution.bonusLostWeek} and the bonus went with it — and we did not have the money put by.`
      : `The weeks got away from me. I missed my first session in Week ${resolution.bonusLostWeek} and the bonus went with it — but you kept enough back that it did not sink us.`
    : resolution.unplannedGain > 0
      ? `Every session, all ${decidingWeeks} weeks. The bonus turned up and neither of us was counting on it.`
      : `Every session, all ${decidingWeeks} weeks. The bonus landed exactly like you planned it would.`;

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
            <span className="post__who" aria-hidden="true">{BASKETBALL_SCENARIO.offer.jersey}</span>
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
            {resolution.courseFunded
              ? final.depositTaken
                ? `The seat was held from Week ${SCENARIO_NUMBERS.course.depositDeadlineWeek} and it is paid. Avery starts the week the season ends.`
                : `Enough for the ${formatDollars(resolution.coursePrice)} place. Avery starts the week the season ends.`
              : `${formatDollars(resolution.courseShort)} short of the ${formatDollars(resolution.coursePrice)} place. Avery does not start this term.`}
          </p>
        </section>

        <section className="resolve-card" data-tone="neutral">
          <p className="field-label">What Avery ends with</p>
          <strong className="money">{formatDollars(resolution.endCash)}</strong>
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

      {/* Beat 4: the plan then against the plan now, which is the thing the written
          explanation is about to ask them to account for. */}
      {resolution.changes.length > 0 && (
        <section className="resolve-changes" aria-labelledby="changes-heading">
          <div className="section-heading">
            <p className="eyebrow">Before Week 5 · After Week 5</p>
            <h2 id="changes-heading">How your plan moved.</h2>
          </div>
          <table>
            <caption className="visually-hidden">Your opening plan compared with the plan you landed</caption>
            <thead>
              <tr><th scope="col">Where the money went</th><th scope="col">Opening plan</th><th scope="col">Final plan</th><th scope="col">Change</th></tr>
            </thead>
            <tbody>
              {CHOICE_ORDER.map((category) => {
                const change = resolution.changes.find((item) => item.category === category)!;
                return (
                  <tr key={category}>
                    <th scope="row">{CHOICE_LABELS[category]}</th>
                    <td className="money">{formatDollars(change.before)}</td>
                    <td className="money">{formatDollars(change.after)}</td>
                    <td className="money" data-delta={change.delta === 0 ? "flat" : change.delta > 0 ? "up" : "down"}>
                      {change.delta === 0 ? "—" : `${change.delta > 0 ? "+" : "−"}${formatDollars(Math.abs(change.delta))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* A plan can finish larger than it started, and a table that shows it growing
              without saying what paid for the growth reads as a mistake. */}
          <p className="resolve-changes__note">
            Eight weeks at the {setup.title}.{" "}
            {final.includeOptionalWork
              ? `Coaching the Saturday clinics brought in ${formatDollars(SCENARIO_NUMBERS.optionalWorkIncome)} after Week 5, which is why the final plan holds more than the opening one.`
              : "The Saturdays stayed Avery’s, so no new money came in after Week 5."}
          </p>
        </section>
      )}

      <div className="stage-action">
        <p>That is how it went. Now say why you played it that way.</p>
        <Button onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "defense" })}>Explain my plan</Button>
      </div>
    </StageShell>
  );
}
