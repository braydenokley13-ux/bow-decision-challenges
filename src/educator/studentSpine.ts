import { competencyById, requiredEvidenceRequirementsFor } from "../domain/competency/competencies";
import { observeCompetencies } from "../domain/competency/observe";
import { isShortfall, levelFor } from "../domain/competency/teachNext";
import type { CompetencyId, CompetencyResult, CompetencyResultState, EvidenceRequirementId, RubricLevel } from "../domain/competency/types";
import type { SubmissionRecord } from "../platform/classes/types";
import { competencyObservationsFor } from "./objectiveResults";

/**
 * One student, read the way every teacher surface now leads with them.
 *
 * The product carries two accounts of the same attempt: the competency spine — evidence
 * requirements, judged against the common rubric — and a points total a gradebook needs.
 * Only the first says what a student can do, so only the first leads. A page that put
 * `100/100` above `Savings is a planned amount — not demonstrated` was printing both and
 * reconciling neither, and a teacher who notices that once stops believing the rest.
 *
 * So this module answers three questions and no others: which competencies this attempt
 * speaks to and where each one landed, which required requirements the student did not
 * show, and which the run never asked. The points are computed elsewhere, unchanged, and
 * appear once per student at the bottom of their page, labelled as what they are.
 */

export interface RequirementFlag {
  evidenceRequirementId: EvidenceRequirementId;
  competencyId: CompetencyId;
  /** What a teacher would call it. */
  label: string;
  /** The rubric row in words, so a flag can be checked against the rule that raised it. */
  observableRule: string;
  /** `null` where the run never presented it. An absence, and never rendered as a zero. */
  level: RubricLevel | null;
}

export interface CompetencyLine {
  competencyId: CompetencyId;
  /** BOW's own sentence for the skill. The teacher-facing name of what was measured. */
  statement: string;
  state: CompetencyResultState;
}

export interface StudentSpine {
  results: readonly CompetencyResult[];
  competencies: readonly CompetencyLine[];
  /**
   * The one state that leads the page: the least this attempt can be said to have shown.
   *
   * Weakest rather than best, because the reason to open a student is what they still need.
   * *Incomplete* most often means nobody has read their writing yet, which is a fact about a
   * marking pile rather than about a child, and the page says which it is underneath.
   */
  lead: CompetencyResultState;
  /** Required requirements this student did not show. Level 2 or 0, per §18.2. */
  shortfalls: readonly RequirementFlag[];
  /** Required requirements the run never presented. Absences, carried separately. */
  notObserved: readonly RequirementFlag[];
}

/**
 * The order the lead is picked in: the least this attempt can be said to have shown.
 *
 * A shortfall leads, because it is the reason to open the student. An absence outranks both
 * positive states on purpose — a page whose headline read *Demonstrated* while one of the
 * competencies behind it was still incomplete would be claiming a skill from evidence that
 * has not all arrived, which is the same overstatement `observe.ts` refuses one layer down.
 */
const STATE_SEVERITY: readonly CompetencyResultState[] = [
  "not-yet-demonstrated",
  "developing",
  "incomplete",
  "demonstrated-with-support",
  "demonstrated",
  "not-observed",
];

export function studentSpineFor(submission: SubmissionRecord): StudentSpine {
  const results = observeCompetencies(competencyObservationsFor(submission), { submitted: true });
  const competencies: CompetencyLine[] = results.map((result) => ({
    competencyId: result.competencyId,
    statement: competencyById(result.competencyId)?.statement ?? result.competencyId,
    state: result.state,
  }));

  const shortfalls: RequirementFlag[] = [];
  const notObserved: RequirementFlag[] = [];
  for (const result of results) {
    for (const requirement of requiredEvidenceRequirementsFor(result.competencyId)) {
      const level = levelFor(results, requirement.id);
      const flag: RequirementFlag = {
        evidenceRequirementId: requirement.id,
        competencyId: requirement.competencyId,
        label: requirement.label,
        observableRule: requirement.observableRule,
        level,
      };
      if (level === null) notObserved.push(flag);
      else if (isShortfall(level)) shortfalls.push(flag);
    }
  }

  const lead = [...competencies]
    .map((line) => line.state)
    .sort((a, b) => STATE_SEVERITY.indexOf(a) - STATE_SEVERITY.indexOf(b))[0] ?? "not-observed";

  return { results, competencies, lead, shortfalls, notObserved };
}
