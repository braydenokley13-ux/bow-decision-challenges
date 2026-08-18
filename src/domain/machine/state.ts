import type { CalcId, ClaimReasonId, SetupId, WorldId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import type { PlanAmounts, PlanMode } from "../finance/types";
import type { EvidenceEvent, PlanSnapshot, StageId, SupportLevel } from "../evidence/types";
import { PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";

export interface CalculationState {
  raw: string;
  value: Dollars | null;
  attempts: number;
  correct: boolean;
  supplied: boolean;
}

export interface ChallengeState {
  meta: {
    schemaVersion: 1;
    sessionId: string;
    classCode: string;
    seatCode: string;
    challengeId: string;
    /**
     * What this run was set, when a class said. Empty when nothing did — a challenge opened
     * outside a class has no assignment, and inventing one would file the evidence under a
     * decision no teacher made.
     */
    assignmentId: string;
    /** The registry's version at the moment the attempt started. */
    challengeVersion: string;
    worldId: WorldId;
    startedAt: number;
    updatedAt: number;
    completedAt?: number;
  };
  stage: StageId;
  stageHistory: StageId[];
  calculations: Partial<Record<CalcId, CalculationState>>;
  setupId: SetupId | null;
  /** The student's ordering of the places by full eight-week cost, and whether it held up. */
  setupRanking: { order: SetupId[]; correct: boolean } | null;
  /** The course seat was reserved early at the deposit price. Null until the call is made. */
  depositTaken: boolean | null;
  /**
   * How Week 3's cash was settled, and why. Null until the student settles it.
   *
   * It sits beside the plan rather than inside it. None of this money is in `drafts`, none
   * of it reaches a snapshot, and no line of the season ledger moves because of it — which
   * is what lets the beat ask a values question without changing the strategy space the
   * balance sweep proves has no dominant answer in it.
   */
  week3: { fundedIds: readonly string[]; reason: ClaimReasonId } | null;
  income: { includeCompletion: boolean; includeOutcome: boolean; includeCompletionFinal: boolean; includeOptionalWork: boolean | null };
  drafts: Partial<Record<PlanMode, PlanAmounts>>;
  snapshots: PlanSnapshot[];
  saved: Partial<Record<PlanMode, string>>;
  selectedGapTiles: string[];
  log: EvidenceEvent[];
  support: Partial<Record<string, SupportLevel>>;
  defense: { tileIds: string[]; text: string };
}

export const EMPTY_AMOUNTS: PlanAmounts = { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) };

export function createInitialState(now = 1): ChallengeState {
  return {
    meta: {
      schemaVersion: 1,
      sessionId: "",
      classCode: "",
      seatCode: "",
      challengeId: PLAN_UNDER_PRESSURE.id,
      assignmentId: "",
      challengeVersion: PLAN_UNDER_PRESSURE.version,
      worldId: "basketball",
      startedAt: now,
      updatedAt: now,
    },
    stage: "entry",
    stageHistory: ["entry"],
    calculations: {},
    setupId: null,
    setupRanking: null,
    depositTaken: null,
    week3: null,
    income: { includeCompletion: false, includeOutcome: false, includeCompletionFinal: false, includeOptionalWork: null },
    drafts: {},
    snapshots: [],
    saved: {},
    selectedGapTiles: [],
    log: [],
    support: {},
    defense: { tileIds: [], text: "" },
  };
}
