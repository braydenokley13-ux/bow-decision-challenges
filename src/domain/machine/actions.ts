import type { CalcId, CategoryId, ClaimReasonId, IncomeSourceId, SetupId } from "../core/ids";
import type { Dollars } from "../core/money";
import type { PlanMode } from "../finance/types";
import type { StageId } from "../evidence/types";

export type ChallengeAction =
  | { type: "GO_TO_STAGE"; stage: StageId }
  | { type: "SESSION_STARTED"; sessionId: string; classCode: string; seatCode: string; assignmentId?: string }
  | { type: "WORLD_CONFIRMED"; worldId: "basketball" }
  | { type: "CALCULATION_SUBMITTED"; calcId: CalcId; raw: string; value: Dollars | null; correct: boolean }
  | { type: "SETUP_RANKED"; order: readonly SetupId[]; correct: boolean }
  | { type: "SETUP_SELECTED"; setupId: SetupId }
  | { type: "COURSE_DEPOSIT_DECIDED"; taken: boolean }
  /**
   * Week 3: three claims wanted the same cash, and the student said which ones got it and
   * what made them leave the rest out. The ids are the world's own; the reason is not.
   */
  | { type: "COMPETING_CLAIMS_SETTLED"; fundedIds: readonly string[]; reason: ClaimReasonId }
  | { type: "INCOME_SOURCE_TOGGLED"; sourceId: Extract<IncomeSourceId, "completion-800" | "outcome-1000">; included: boolean }
  | { type: "PLAN_AMOUNT_CHANGED"; mode: PlanMode; category: CategoryId; amount: Dollars }
  /** "Put the rest here" — the student names the row that takes what is still unassigned. */
  | { type: "PLAN_REMAINDER_ASSIGNED"; mode: PlanMode; category: CategoryId; amount: Dollars }
  | { type: "PLAN_SAVE_REQUESTED"; mode: PlanMode; acknowledgedResidual?: Dollars }
  | { type: "LOCKED_MOVE_ATTEMPTED"; mode: PlanMode; lockedCardId: string }
  | { type: "WEEK5_ADVANCE_CONFIRMED" }
  | { type: "GAP_TILE_TOGGLED"; tileId: string; selected: boolean }
  | { type: "OPTIONAL_WORK_DECIDED"; accepted: boolean }
  | { type: "COMPLETION_INCOME_DECIDED"; included: boolean }
  | { type: "SCAFFOLD_OPENED"; interactionId: string }
  | { type: "SHOW_AND_CONTINUE_USED"; interactionId: string }
  | { type: "DEFENSE_SUBMITTED"; tileIds: string[]; text: string };
