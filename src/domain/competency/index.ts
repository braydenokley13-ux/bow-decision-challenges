/**
 * The competency layer — BOW's own words for the financial skills the product measures.
 *
 * Read the chain downward and it says *this is what we measure*. Read it upward and it
 * says *a teacher assigns their state's objective, BOW resolves it to a competency, offers
 * the worlds that assess it, and reports back in that state's language*:
 *
 * ```
 * BOW Competency
 *   → Evidence Requirements   what a student must actually do
 *     → Common Rubric         how each requirement is judged
 *       → Assessment Worlds   the situations that create the opportunity
 *         → Standards Mappings   NYSED 1.3, and whatever a second state calls it
 *           → Teacher-facing labels
 * ```
 *
 * This module is the first two links. It knows nothing about the last two, and importing
 * `../standards/**` from anywhere in here is a build failure.
 */
export type {
  AssessmentShape,
  Competency,
  CompetencyGroupId,
  CompetencyId,
  CompetencyResult,
  CompetencyResultState,
  EvidenceKind,
  EvidenceRequirement,
  EvidenceRequirementId,
  EvidenceRequirementLevel,
  EvidenceRequirementObservation,
  GradeBand,
  RubricLevel,
  SupportLevel,
} from "./types";
export { COMPETENCY_MODEL_VERSION, RUBRIC_VERSION } from "./types";

export type { CompetencyGroup } from "./competencies";
export {
  COMPETENCIES,
  COMPETENCY_GROUPS,
  competenciesInGroup,
  competencyById,
  evidenceRequirementById,
  evidenceRequirementsFor,
  findCompetency,
  requiredEvidenceRequirementsFor,
} from "./competencies";

export type { MasteryContext } from "./observe";
export {
  SUPPORT_CAPS,
  competencyResultFor,
  isCountable,
  isDemonstrated,
  levelUnderRubric,
  masteryStateFor,
  observeCompetencies,
} from "./observe";

export type {
  ObjectiveDemand,
  ObjectiveResult,
  ObjectiveResultState,
  StudentObjectiveOutcome,
} from "./objectiveState";
export {
  DEVELOPING_THRESHOLD_PERCENT,
  MINIMUM_ASSESSED_FOR_A_STATE,
  MINIMUM_RESULTS_FOR_CLASS_NARRATION,
  STALE_AFTER_DAYS,
  STRONG_THRESHOLD_PERCENT,
  isStale,
  objectiveResultFrom,
  studentOutcomeFor,
} from "./objectiveState";

export type { WorldEvidenceCoverage } from "./availability";
export {
  BUILT_WORLD_COVERAGE,
  availableCompetencyIds,
  isCompetencyAvailable,
  worldsAssessing,
} from "./availability";
