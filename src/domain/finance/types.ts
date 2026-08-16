import type { CategoryId, SetupId } from "../core/ids";
import type { Dollars } from "../core/money";

export type PlanMode = "working" | "fallback" | "week5-first-response" | "final" | "remaining-risk";
export type PlanAmounts = Record<CategoryId, Dollars>;

export interface SnapshotInputs {
  mode: PlanMode;
  amounts: PlanAmounts;
  includeCompletion: boolean;
  includeOutcome: boolean;
  includeOptionalWork: boolean;
  setupId: SetupId;
  week5Applied: boolean;
  /**
   * The course seat was reserved early at the deposit price. The money is committed —
   * it moves out of the three adjustable amounts and into the locked costs, which is
   * exactly the flexibility the discount is paid for.
   */
  depositTaken: boolean;
  numbersVersion: string;
}

export interface PlanReadout {
  available: Dollars;
  locked: Dollars;
  assignedTotal: Dollars;
  balance: Dollars;
  residual: Dollars;
  unassigned: Dollars;
  exposure: Dollars;
}
