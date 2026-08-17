/**
 * The world's front door, and it opens onto the story only.
 *
 * `observer.ts`, `facts.ts` and `writtenAnswer.ts` are deliberately absent. The bundle a
 * student downloads must not contain the code that judges them, and the moment those two live
 * behind one import that guarantee is gone. Assessment is reached through the `WorldContract`
 * in `scenario/contracts.ts`, which nothing on a student route imports.
 */
export { POP_UP_SCENARIO, popUpStudentCopy, type PopUpScenario } from "./scenario";
export { POP_UP_NUMBERS } from "./numbers";
export { POP_UP_STAGES, POP_UP_STAGE_BUDGET, POP_UP_PATH, popUpBudget, marketPositionFor } from "./stages";
export {
  createPopUpState,
  popUpReducer,
  ledgerOf,
  ledgerInputFor,
  previewSaturday,
  type PopUpState,
  type PopUpAction,
  type PopUpSnapshot,
} from "./machine";
export { popUpLedger, planSum, EMPTY_PLAN, type PopUpLedger } from "./ledger";
export {
  owedUpFront,
  cashToPlan,
  orderCost,
  swapBill,
  sellCap,
  crowdOn,
  playSaturday,
  rebateEarned,
  availableToPlan,
  type SaturdayOutcome,
} from "./economy";
export { POP_UP_LINES, type PopUpLineId, type PopUpSourceId, type PopUpSumId, type SpotId, type PopUpPlan } from "./types";
