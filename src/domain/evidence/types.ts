import type { CalcId, CategoryId, SetupId, WorldId } from "../core/ids";
import type { Dollars } from "../core/money";
import type { PlanAmounts, PlanMode, PlanReadout, SnapshotInputs } from "../finance/types";
import type { StructuredMicroSkillId, EvidencePoints, ConceptId } from "../blueprint/types";

export type SupportLevel = "standard_access" | "natural_consequence" | "direct_scaffold" | "answer_supplied";
export type MasteryStatus = "demonstrated_independently" | "demonstrated_with_support" | "developing" | "not_demonstrated" | "not_observed";
export type Trajectory = "independent_first_opportunity" | "corrected_after_consequence" | "corrected_after_scaffold" | "new_difficulty_during_adaptation" | "persistent_gap" | "insufficient_evidence";
export type C4ObservationContext = "opening_income_fallback" | "week5_cost_response";

export type StageId =
  | "entry" | "join" | "choose-world" | "the-offer" | "role-contract" | "setup-comparison" | "working-plan"
  | "fallback-version" | "income-check" | "week5-transition" | "week5-event" | "first-response"
  | "opportunity-final-repair" | "remaining-risk-preview" | "defense" | "submitted";

export interface PlanSnapshot {
  id: string;
  sequence: number;
  inputs: SnapshotInputs;
  acknowledgedResidual?: Dollars;
  /**
   * What the plan was worth at the moment it was saved, priced with the numbers in force
   * then. Scoring reads this rather than re-pricing the amounts, so re-balancing the
   * scenario cannot silently rewrite a student's past result. Optional only because
   * hand-built test fixtures predate it; real runs always carry one.
   */
  readout?: PlanReadout;
}

export type EvidenceEventType =
  | "SESSION_STARTED" | "WORLD_CONFIRMED" | "CALCULATION_SUBMITTED" | "SETUP_SELECTED"
  | "INCOME_SOURCE_TOGGLED" | "PLAN_SAVE_REQUESTED" | "PLAN_SAVED" | "LOCKED_MOVE_ATTEMPTED"
  | "WEEK5_ADVANCE_CONFIRMED" | "GAP_TILE_TOGGLED" | "OPTIONAL_WORK_DECIDED"
  | "COMPLETION_INCOME_DECIDED" | "SCAFFOLD_OPENED" | "SHOW_AND_CONTINUE_USED"
  | "DEFENSE_SUBMITTED";

export interface EvidenceEvent<TPayload = unknown> {
  id: string;
  sequence: number;
  timestamp: number;
  type: EvidenceEventType;
  stage: StageId;
  worldId: WorldId;
  payload: TPayload;
  supportLevel: SupportLevel;
  dedupeKey?: string;
}

export interface CalculationEvidence {
  calcId: CalcId;
  attempts: Array<{ raw: string; value: Dollars | null; correct: boolean; eventRef: string }>;
  support: SupportLevel;
  supplied: boolean;
}

export interface AlternateStateEvidence {
  entered: boolean;
  saved: boolean;
  amountFreed: Dollars;
  /**
   * The most money the student could have freed from the state they were handed:
   * the smaller of the shortfall they faced and the adjustable money they held.
   * Lets a full response be recognised even when a full repair was impossible.
   */
  absorbTarget: Dollars;
  residual: Dollars;
  unassigned: Dollars;
  residualAcknowledged: boolean;
  lockedMoveAttempts: number;
  changedOnlyAdjustable: boolean;
  savesBeforeAcceptable: number;
  support: SupportLevel;
  evidenceRefs: string[];
}

export interface AssessmentFacts {
  calculations: Partial<Record<CalcId, CalculationEvidence>>;
  opening?: { snapshot: PlanSnapshot; balance: Dollars; firstSaveBalance: Dollars; conditionalExposure: Dollars; support: SupportLevel; evidenceRefs: string[] };
  fallback?: AlternateStateEvidence;
  firstResponse?: AlternateStateEvidence;
  preview?: AlternateStateEvidence;
  final?: { snapshot: PlanSnapshot; balance: Dollars; acknowledgedResidual: boolean; lockedMoveAttempts: number; support: SupportLevel; evidenceRefs: string[] };
  selectedSetupId?: SetupId;
  selectedGapTiles: string[];
  applicableGapTiles: string[];
  optionalDecision?: { accepted: boolean; sequence: number; evidenceRef: string };
  finalPlanSequence?: number;
  defenseSubmitted: boolean;
}

export interface MicroSkillObservation {
  microSkillId: StructuredMicroSkillId;
  conceptId: ConceptId;
  points: EvidencePoints | null;
  outcome: "demonstrated" | "partial" | "not_demonstrated" | "not_observed";
  supportLevel: SupportLevel;
  evidenceRefs: string[];
  reason: string;
  c4ObservationContext?: C4ObservationContext;
}

export interface ConceptResult {
  conceptId: ConceptId;
  points: number | null;
  maxPoints: number;
  status: MasteryStatus;
  trajectory: Trajectory;
  observations: MicroSkillObservation[];
  misconceptionTags: string[];
}

export interface GradeResult {
  structuredPoints: number;
  structuredMaximum: 90;
  reasoningPoints: number | null;
  finalPoints: number | null;
  incomplete: boolean;
  summary: "strong_application" | "secure_application" | "developing_application" | "limited_application" | "incomplete" | "pending_reasoning";
}

export interface AssessmentResult {
  observations: MicroSkillObservation[];
  concepts: ConceptResult[];
  grade: GradeResult;
}

export interface DraftState {
  mode: PlanMode;
  amounts: PlanAmounts;
}

export const CATEGORY_ORDER: readonly CategoryId[] = ["goal", "reserve", "flexibleCash"];
