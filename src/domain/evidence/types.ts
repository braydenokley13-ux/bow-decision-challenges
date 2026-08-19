import type { CalcId, CategoryId, ClaimReasonId, SetupId, WorldId } from "../core/ids";
import type { Dollars } from "../core/money";
import type { PlanAmounts, PlanMode, PlanReadout, SnapshotInputs } from "../finance/types";
import type { StructuredMicroSkillId, EvidencePoints, ConceptId } from "../blueprint/types";
import type { CompetencyId, EvidenceRequirementId } from "../competency/types";

export type SupportLevel = "standard_access" | "natural_consequence" | "direct_scaffold" | "answer_supplied";
export type MasteryStatus = "demonstrated_independently" | "demonstrated_with_support" | "developing" | "not_demonstrated" | "not_observed";
export type Trajectory = "independent_first_opportunity" | "corrected_after_consequence" | "corrected_after_scaffold" | "new_difficulty_during_adaptation" | "persistent_gap" | "insufficient_evidence";
export type C4ObservationContext = "opening_income_fallback" | "week5_cost_response";

/**
 * Every screen any world can be on.
 *
 * The three at the top belong to the platform — a student joins and picks a world before any
 * world's story starts. Everything after them belongs to one world and is named for it, so
 * the union reads as what it is: two worlds' interiors, side by side, sharing an envelope and
 * nothing else. A world does not inherit another world's stages, and `WorldRegistryEntry`
 * declares which of these each one can actually be in — a restored attempt is checked against
 * its own world's list rather than against all of them.
 */
export type StageId =
  | "entry" | "join" | "choose-world"
  // Plan Under Pressure, in the basketball world.
  | "the-offer" | "role-contract" | "setup-comparison" | "working-plan"
  | "fallback-version" | "income-check" | "season-weeks" | "week5-transition" | "week5-event" | "first-response"
  | "opportunity-final-repair" | "remaining-risk-preview" | "week8-resolution" | "defense" | "submitted"
  // Run the Pop-Up, at the Riverside Night Market.
  | "popup-spot" | "popup-money" | "popup-plan" | "popup-first-saturday"
  | "popup-standing-order" | "popup-generator" | "popup-repair" | "popup-settle"
  | "popup-writeup" | "popup-submitted";

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
  // The platform's own moments, and the two supports. Every world writes these.
  | "SESSION_STARTED" | "WORLD_CONFIRMED" | "STAGE_ENTERED" | "SCAFFOLD_OPENED" | "SHOW_AND_CONTINUE_USED"
  // Plan Under Pressure, in the basketball world.
  | "CALCULATION_SUBMITTED" | "SETUP_RANKED" | "SETUP_SELECTED"
  | "COURSE_DEPOSIT_DECIDED"
  // Named for what it is rather than for where it happens: three claims wanted the same
  // money, the student said which ones got it, and said what made them leave the rest.
  // A second world with a week like this writes the same type and the same payload.
  | "COMPETING_CLAIMS_SETTLED"
  | "INCOME_SOURCE_TOGGLED" | "PLAN_SAVE_REQUESTED" | "PLAN_SAVED" | "PLAN_REMAINDER_ASSIGNED" | "LOCKED_MOVE_ATTEMPTED"
  | "WEEK5_ADVANCE_CONFIRMED" | "GAP_TILE_TOGGLED" | "OPTIONAL_WORK_DECIDED"
  | "COMPLETION_INCOME_DECIDED"
  | "DEFENSE_SUBMITTED"
  // Run the Pop-Up, at the Riverside Night Market.
  | "POPUP_SUM_SUBMITTED" | "POPUP_SPOT_SELECTED" | "POPUP_CONDITIONAL_MONEY_DECIDED" | "POPUP_COVER_LINE_NAMED"
  | "POPUP_PLAN_SAVE_REQUESTED" | "POPUP_PLAN_SAVED" | "POPUP_REMAINDER_ASSIGNED" | "POPUP_LOCKED_MOVE_ATTEMPTED"
  | "POPUP_STOCK_ORDERED" | "POPUP_HELPER_DECIDED" | "POPUP_SATURDAY_PLAYED"
  | "POPUP_WRITEUP_SUBMITTED";

export const EVIDENCE_EVENT_TYPES: readonly EvidenceEventType[] = [
  "SESSION_STARTED", "WORLD_CONFIRMED", "STAGE_ENTERED", "SCAFFOLD_OPENED", "SHOW_AND_CONTINUE_USED",
  "CALCULATION_SUBMITTED", "SETUP_RANKED", "SETUP_SELECTED",
  "COURSE_DEPOSIT_DECIDED",
  "COMPETING_CLAIMS_SETTLED",
  "INCOME_SOURCE_TOGGLED", "PLAN_SAVE_REQUESTED", "PLAN_SAVED", "PLAN_REMAINDER_ASSIGNED", "LOCKED_MOVE_ATTEMPTED",
  "WEEK5_ADVANCE_CONFIRMED", "GAP_TILE_TOGGLED", "OPTIONAL_WORK_DECIDED",
  "COMPLETION_INCOME_DECIDED",
  "DEFENSE_SUBMITTED",
  "POPUP_SUM_SUBMITTED", "POPUP_SPOT_SELECTED", "POPUP_CONDITIONAL_MONEY_DECIDED", "POPUP_COVER_LINE_NAMED",
  "POPUP_PLAN_SAVE_REQUESTED", "POPUP_PLAN_SAVED", "POPUP_REMAINDER_ASSIGNED", "POPUP_LOCKED_MOVE_ATTEMPTED",
  "POPUP_STOCK_ORDERED", "POPUP_HELPER_DECIDED", "POPUP_SATURDAY_PLAYED",
  "POPUP_WRITEUP_SUBMITTED",
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
  /**
   * The BOW competencies this event can speak to, and the specific things it is evidence
   * about. Empty when it is evidence about none.
   *
   * These sit beside `conceptIds` rather than replacing them. Concepts are Plan Under
   * Pressure's own grouping and every educator surface reads them today; competencies are
   * the product's spine and the only vocabulary a second world can share. Both are written
   * at the point the event is created, so the two never have to be reconciled later.
   *
   * A tag is a claim about relevance, never about mastery: it says "this action is evidence
   * about whether savings was planned," never "this student plans savings." The level lives
   * in an observation, and only a world's observer produces one.
   *
   * `evidenceRequirementIds` is deliberately stored rather than derived. It is what lets the
   * §19.2 evidence timeline link a judgement back to the exact moment it came from, on a log
   * written by a version of the world whose observer no longer exists.
   */
  competencyIds: readonly CompetencyId[];
  evidenceRequirementIds: readonly EvidenceRequirementId[];
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

/**
 * Where the figure standing in one row of a plan came from.
 *
 * This exists because a board with one-press shortcuts on it produces two things that look
 * identical in a saved plan and are not the same fact about a student: an amount they chose,
 * and an amount that arrived because they pressed the biggest button on the screen. A run
 * that cannot tell them apart credits a decision nobody made — which is exactly what
 * "Savings is a planned amount — the course line held a figure the student set" was saying
 * about students who never touched that line.
 *
 * It is deliberately **not** a `SupportLevel`. Support answers "how much help did they have
 * with the arithmetic", and `answer_supplied` scores zero because a copied number says
 * nothing about whether a student can produce one. A one-press fill is a different fact in
 * both directions: the student really did choose *which line to protect*, and really did not
 * choose *the amount*. Folding the two together would either deny them the decision they
 * made or credit them with one they did not.
 *
 * - `typed` — the student produced this figure: the steppers, the keyboard, or a figure that
 *   arrived some other way and that they then changed. This is the only value that means
 *   "the amount is theirs".
 * - `suggested` — BOW proposed this figure and the student accepted it whole. They chose the
 *   line; the number is BOW's. The scaffold that fills in one balanced plan writes this.
 * - `remainder` — the student named this row to take whatever the rest of the plan left
 *   over. They chose the line; the *arithmetic* chose the number. It is separated from
 *   `suggested` because the two mean different things to the one requirement that reads
 *   them: a suggested figure is a number BOW picked, and a remainder is not a number anybody
 *   picked. "Savings is whatever is left" is the misconception this product exists to catch,
 *   and it is `remainder` on the savings row, not `suggested` on it.
 *
 * The fourth state is the absence of an entry: a row nobody touched. It is not a value here
 * on purpose — a map with no key for a row cannot be mistaken for a decision, and every
 * reader has to handle it.
 */
export type AmountSource = "typed" | "suggested" | "remainder";

/** How one row's figure arrived, and whether the student has since changed it. */
export interface AmountProvenance {
  source: AmountSource;
  /**
   * The row has held a figure BOW produced, and the student changed it afterwards.
   *
   * It is what makes an accepted suggestion earnable back: a student who pressed a fill,
   * looked at what it did and moved the number has made the amount theirs, and `source`
   * reads `typed` from that moment. This flag is what lets the sentence a teacher reads say
   * which of those two things happened rather than only that the figure is now the
   * student's.
   */
  revised: boolean;
}

/** One plan's rows, by where each figure came from. A missing row was never touched. */
export type PlanAmountSources = Partial<Record<CategoryId, AmountProvenance>>;

/**
 * One moment where the student sent the money still unassigned to a named row.
 *
 * The board has always demanded that every dollar end up somewhere. What it never recorded
 * was *which line the student let the arithmetic decide*, and that is the difference between
 * a savings figure that was planned and one that is what happened to be left — the whole of
 * `plan-within-income.er3`, and the misconception the multiple-world model exists to catch.
 *
 * Only the category and the two amounts are kept, never a rank or a click order. This is a
 * statement the student made on purpose with a labelled button, not an inference from the
 * sequence they touched three steppers in.
 */
export interface RemainderChoice {
  mode: PlanMode;
  category: CategoryId;
  /** What this row took. */
  amount: Dollars;
  /**
   * What was still unassigned afterwards, and the field that decides what the move meant.
   * Zero means this row took the last of the money and closed the plan. Anything else means
   * the row filled up on the way past — a deliberate figure being placed, not leftovers
   * being absorbed.
   */
  remaining: Dollars;
  sequence: number;
  supportLevel: SupportLevel;
  evidenceRef: string;
}

/**
 * One week's worth of competing claims, settled.
 *
 * The payload of `COMPETING_CLAIMS_SETTLED`, and world-neutral in the same way the event
 * name is: ids are the world's own strings, everything else is the shared vocabulary. It
 * carries what was paid for, what was left unpaid, the reason the student gave, and the
 * amounts — enough for an observer to judge it and enough for the world's own ending to
 * say what actually happened, without either one re-deriving the other's half.
 *
 * `unfundedIds` is stored rather than computed from `fundedIds`, because the set of claims
 * a world put in front of the student is a fact about the run and not about the world as it
 * stands today. A log written by a version that offered a fourth claim has to still read.
 */
export interface CompetingClaimsSettlement {
  /** The money that was on the table, and only for this. It never reaches the plan. */
  cash: Dollars;
  fundedIds: readonly string[];
  unfundedIds: readonly string[];
  /** What the funded claims cost together. */
  spent: Dollars;
  /** What was left over once they were paid for. */
  leftOver: Dollars;
  /** What the student said made them leave the rest out. */
  reason: ClaimReasonId;
}

export interface AssessmentFacts {
  calculations: Partial<Record<CalcId, CalculationEvidence>>;
  /**
   * `sources` is optional and absent means *this log predates the record*, not *no row was
   * touched*. An attempt saved before the board recorded where each figure came from cannot
   * be re-read through the new rule without changing what a finished attempt means, so the
   * observer falls back to what such a log can actually support. A run recorded today always
   * carries one, with a key for every row the student acted on and none for the rest.
   */
  opening?: { snapshot: PlanSnapshot; balance: Dollars; firstSaveBalance: Dollars; conditionalExposure: Dollars; support: SupportLevel; evidenceRefs: string[]; sources?: PlanAmountSources };
  fallback?: AlternateStateEvidence;
  firstResponse?: AlternateStateEvidence;
  preview?: AlternateStateEvidence;
  final?: { snapshot: PlanSnapshot; balance: Dollars; acknowledgedResidual: boolean; lockedMoveAttempts: number; support: SupportLevel; evidenceRefs: string[] };
  selectedSetupId?: SetupId;
  /** Ordering the three places by true eight-week cost — the comparison, as an action. */
  setupRanking?: { attempts: number; firstCorrect: boolean; correct: boolean; evidenceRefs: string[] };
  selectedGapTiles: string[];
  applicableGapTiles: string[];
  /**
   * Every "put the rest here", in the order they were made. Optional only because hand-built
   * test fixtures predate it; `deriveFacts` always sets it, empty when the log holds none.
   */
  remainderChoices?: readonly RemainderChoice[];
  optionalDecision?: { accepted: boolean; sequence: number; evidenceRef: string };
  /**
   * What the student said about each piece of conditional income while building the opening
   * plan, in the order they said it.
   *
   * The bonus screen will not advance until both cards have been answered, so a run recorded
   * today always carries one of these per source. Absent means *this log predates the record*
   * — not *no decision was made* — which is the same rule `sources` follows on the plan
   * snapshot, and for the same reason: a finished attempt must not be re-read under a rule
   * that did not exist when it was saved.
   */
  conditionalIncomeDecisions?: readonly { sourceId: string; included: boolean; sequence: number; evidenceRef: string }[];
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

/**
 * `summary` used to be a sixth field here, and it is gone.
 *
 * It was a sixth vocabulary for "how well did this student do" — `strong_application`,
 * `secure_application`, `developing_application`, `limited_application` — computed for every
 * attempt from a 65/80/90 threshold ladder over the composite total, and rendered on no
 * screen since the bespoke demo pages were deleted. Four `*_application` strings would be
 * indefensible in front of a teacher, and a field sitting in the result type waiting to be
 * rendered is not dead weight so much as a loaded gun: the next person adding a status reads
 * `GradeResult`, finds a ready-made verdict, and a sixth vocabulary is back on a screen.
 *
 * Deleted rather than fenced, for the same reason `STATUS_LABELS` and `conceptSummaries`
 * were. It also took the last live use of the composite total's thresholds with it — the
 * same composite `studentSpine.test.ts` says must not come back.
 */
export interface GradeResult {
  structuredPoints: number;
  structuredMaximum: number;
  reasoningPoints: number | null;
  finalPoints: number | null;
  incomplete: boolean;
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
