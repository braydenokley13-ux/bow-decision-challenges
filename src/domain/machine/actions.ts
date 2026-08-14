import type { CalcId, CategoryId, IncomeSourceId, SetupId } from "../core/ids";
import type { Dollars } from "../core/money";
import type { PlanMode } from "../finance/types";
import type { StageId } from "../evidence/types";

export type ChallengeAction =
  | { type: "GO_TO_STAGE"; stage: StageId }
  | { type: "SESSION_STARTED"; sessionId: string; classCode: string; seatCode: string }
  | { type: "WORLD_CONFIRMED"; worldId: "basketball" }
  | { type: "CALCULATION_SUBMITTED"; calcId: CalcId; raw: string; value: Dollars | null; correct: boolean }
  | { type: "SETUP_SELECTED"; setupId: SetupId }
  | { type: "COURSE_DEPOSIT_DECIDED"; taken: boolean }
  | { type: "INCOME_SOURCE_TOGGLED"; sourceId: Extract<IncomeSourceId, "completion-800" | "outcome-1000">; included: boolean }
  | { type: "PLAN_AMOUNT_CHANGED"; mode: PlanMode; category: CategoryId; amount: Dollars }
  | { type: "PLAN_SAVE_REQUESTED"; mode: PlanMode; acknowledgedResidual?: Dollars }
  | { type: "LOCKED_MOVE_ATTEMPTED"; mode: PlanMode; lockedCardId: string }
  | { type: "WEEK5_ADVANCE_CONFIRMED" }
  | { type: "GAP_TILE_TOGGLED"; tileId: string; selected: boolean }
  | { type: "OPTIONAL_WORK_DECIDED"; accepted: boolean }
  | { type: "COMPLETION_INCOME_DECIDED"; included: boolean }
  | { type: "SCAFFOLD_OPENED"; interactionId: string }
  | { type: "SHOW_AND_CONTINUE_USED"; interactionId: string }
  | { type: "DEFENSE_SUBMITTED"; tileIds: string[]; text: string };
