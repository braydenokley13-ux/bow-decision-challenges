import { Link } from "react-router-dom";
import type { CompetencyResult } from "../domain/competency/types";
import { competencyById } from "../domain/competency/competencies";
import {
  FRAMEWORKS,
  missingCompetenciesFor,
  resolveObjectiveCoverage,
  standardByRef,
} from "../domain/standards";
import type { ObjectiveCoverageState, StandardRef } from "../domain/standards/types";

/**
 * Where one student's evidence leaves the objective their teacher assigned.
 *
 * Every reference mockup carries a standards card on the student page, and the product had
 * nowhere that answered the question for one child: a teacher could see which *skills* an
 * attempt showed, and had to do the join to the objective in their head. This does the join,
 * and does it with `resolveObjectiveCoverage` — the same function the class page uses — so a
 * student page and a class page cannot disagree about the same objective.
 *
 * ## Three words, and why the middle one is the important one
 *
 * The states come from the standards layer and mean exactly what it says they mean:
 *
 * - **Demonstrated** — a `full`-mapped competency was demonstrated, or every competency a
 *   completion rule names was.
 * - **Partly** — there is real evidence toward the objective and it does not reach it. Either
 *   a bundled objective has some of its parts, or the only evidence is from a `partial`
 *   mapping. This is the state that has to survive contact with a hurried reader: it is not a
 *   score of "about half", it is *BOW is not entitled to the whole claim yet*, and the panel
 *   says which part is missing rather than leaving a teacher to guess.
 * - **Nothing yet** — no competency mapped to it was demonstrated by this attempt.
 *
 * A `supporting` mapping never moves any of them (§10.5). It is in the evidence trail and
 * nowhere else, which is why nothing here counts one.
 *
 * ## What this panel refuses to do
 *
 * It shows no percentage and no score. The reference mockup puts `78% Proficient` and
 * `38 / 50` on this exact card, and a composite is the one thing this product's release gate
 * treats as disqualifying — an objective is not a proportion of itself, and a child who
 * showed three of four required rows has not "scored 75%" on anything.
 *
 * It also never says a student failed an objective the run never asked about. An attempt that
 * structurally could not raise a requirement is an absence, and absences belong to the
 * evidence trail where the reason is visible.
 */

const STATE_WORD: Record<ObjectiveCoverageState, string> = {
  demonstrated: "Demonstrated",
  "partially-assessed": "Partly",
  "not-assessed": "Nothing yet",
};

/**
 * The sentence under the word. Each names its subject — *this attempt* — because the same
 * three states are reported about a whole class two clicks away, and a label a teacher has to
 * work out the subject of is a label doing harm.
 */
const STATE_SENTENCE: Record<ObjectiveCoverageState, string> = {
  demonstrated: "This attempt shows everything this objective asks for.",
  "partially-assessed": "This attempt shows real evidence toward this objective, and not all of it.",
  "not-assessed": "Nothing in this attempt reaches this objective yet.",
};

export function ObjectiveStanding({ objectiveRef, results }: {
  objectiveRef: StandardRef | null;
  results: readonly CompetencyResult[];
}) {
  // An assignment made before there was an objective to choose carries `null`, and most do.
  // Printing a code here would manufacture a selection nobody made (§17.3).
  if (!objectiveRef) return null;
  const standard = standardByRef(objectiveRef);
  if (!standard) return null;

  // Only competencies this attempt actually demonstrated. `demonstrated-with-support` is a
  // demonstration — the support is recorded on the requirement, and the state above it is
  // the product's own judgement that the skill was shown.
  const demonstrated = new Set(
    results
      .filter((result) => result.state === "demonstrated" || result.state === "demonstrated-with-support")
      .map((result) => result.competencyId),
  );

  const state = resolveObjectiveCoverage(objectiveRef, demonstrated);
  const missing = missingCompetenciesFor(objectiveRef, demonstrated);

  return (
    <section className="objective-standing" data-state={state} aria-labelledby="objective-standing-title">
      <p className="field-label" id="objective-standing-title">The objective this was set for</p>

      <p className="objective-standing__code">
        <span className="objective-standing__chip">{standard.code}</span>
        {standard.text}
      </p>

      <p className="objective-standing__state">
        <strong>{STATE_WORD[state]}</strong>
        <span>{STATE_SENTENCE[state]}</span>
      </p>

      {/* Only ever shown for a bundled objective, because `missingCompetenciesFor` returns
          nothing without a completion rule. "2.1 partly — still needs the borrowing decision"
          is a sentence a teacher can act on; "2.1: 33%" is not. */}
      {missing.length > 0 && (
        <div className="objective-standing__missing">
          <p className="field-label">Still needs</p>
          <ul>
            {missing.map((competencyId) => (
              <li key={competencyId}>{competencyById(competencyId)?.statement ?? competencyId}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="objective-standing__link">
        <Link to={`/educator/objectives/${objectiveRef.frameworkId}/${standard.code}`}>
          What this objective asks for →
        </Link>
      </p>

      {/* The same disclaimer the objectives page carries, composed from the framework rather
          than typed here. A state's objective text appearing inside a product is not that state
          endorsing the product, and a district reading this card out of context is exactly who
          needs to be told so — but the sentence belongs to the framework, because a second
          framework's would say something different and `frameworkNaming.test.ts` fails the
          build on any teacher-facing string that hardcodes one. */}
      <p className="objective-standing__attribution">
        {FRAMEWORKS[objectiveRef.frameworkId]?.labels.attribution}
      </p>
    </section>
  );
}
