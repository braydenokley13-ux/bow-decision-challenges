import type { CalcId, SetupId, WorldId } from "../core/ids";
import { dollars, type Dollars } from "../core/money";
import type { PlanAmounts, PlanMode } from "../finance/types";
import type { EvidenceEvent, PlanSnapshot, StageId, SupportLevel } from "../evidence/types";

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
    challengeId: "plan-under-pressure";
    challengeVersion: "2.1.0-mvp";
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
      challengeId: "plan-under-pressure",
      challengeVersion: "2.1.0-mvp",
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
