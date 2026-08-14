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

/**
 * The closed set of things this product records.
 *
 * Data doctrine: collect only what creates real educational, product, evidence, reliability
 * or pilot value. Challenge start, stage progression, meaningful decisions, consequence and
 * adaptation events, submission, and roughly how long it took — nothing else. There is
 * deliberately no mouse tracking, no clickstream, no keystroke capture, no hesitation
 * telemetry and no behavioural analytics, and `evidenceEnvelope.test.ts` fails the build if
 * an event type appears that is not on this list.
 */
export type EvidenceEventType =
  | "SESSION_STARTED" | "WORLD_CONFIRMED" | "STAGE_ENTERED" | "CALCULATION_SUBMITTED" | "SETUP_RANKED" | "SETUP_SELECTED"
  | "COURSE_DEPOSIT_DECIDED"
  | "INCOME_SOURCE_TOGGLED" | "PLAN_SAVE_REQUESTED" | "PLAN_SAVED" | "LOCKED_MOVE_ATTEMPTED"
  | "WEEK5_ADVANCE_CONFIRMED" | "GAP_TILE_TOGGLED" | "OPTIONAL_WORK_DECIDED"
  | "COMPLETION_INCOME_DECIDED" | "SCAFFOLD_OPENED" | "SHOW_AND_CONTINUE_USED"
  | "DEFENSE_SUBMITTED";

export const EVIDENCE_EVENT_TYPES: readonly EvidenceEventType[] = [
  "SESSION_STARTED", "WORLD_CONFIRMED", "STAGE_ENTERED", "CALCULATION_SUBMITTED", "SETUP_RANKED", "SETUP_SELECTED",
  "COURSE_DEPOSIT_DECIDED",
  "INCOME_SOURCE_TOGGLED", "PLAN_SAVE_REQUESTED", "PLAN_SAVED", "LOCKED_MOVE_ATTEMPTED",
  "WEEK5_ADVANCE_CONFIRMED", "GAP_TILE_TOGGLED", "OPTIONAL_WORK_DECIDED",
  "COMPLETION_INCOME_DECIDED", "SCAFFOLD_OPENED", "SHOW_AND_CONTINUE_USED",
  "DEFENSE_SUBMITTED",
] as const;

/**
 * The common envelope every Decision Challenge writes, whatever its subject or mechanics.
 * Challenge-specific detail lives in `payload`; everything outside it is the language the
 * platform reasons in, so a second challenge's evidence can sit beside this one's.
 */
export interface EvidenceEvent<TPayload = unknown> {
  id: string;
  sequence: number;
  /** Wall clock, in epoch milliseconds. Ordering comes from `sequence`, not from this. */
  timestamp: number;
  type: EvidenceEventType;
  stage: StageId;
  challengeId: string;
  challengeVersion: string;
  sessionId: string;
  worldId: WorldId;
  /** Canonical BOW concepts this event can speak to. Empty when it speaks to none. */
  conceptIds: readonly ConceptId[];
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
  /** Ordering the three places by true eight-week cost — the comparison, as an action. */
  setupRanking?: { attempts: number; firstCorrect: boolean; correct: boolean; evidenceRefs: string[] };
  selectedGapTiles: string[];
  applicableGapTiles: string[];
  optionalDecision?: { accepted: boolean; sequence: number; evidenceRef: string };
  /** Whether the student decided about the still-conditional payment, and when. */
  completionDecision?: { included: boolean; sequence: number; evidenceRef: string };
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
  structuredMaximum: number;
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
