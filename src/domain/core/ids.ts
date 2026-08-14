export type WorldId = "basketball" | "fashion";
export type SetupId = "gym-sublet" | "teammate-share" | "cousin-room";
export type IncomeSourceId = "saved-500" | "base-4500" | "completion-800" | "outcome-1000" | "optional-work-500";
export type CategoryId = "goal" | "reserve" | "flexibleCash";
export type CalcId = "setup-middle-total" | "setup-lowest-total" | "essentials-total" | "reliable-floor" | "week5-change";

export const CALCULATION_IDS: readonly CalcId[] = [
  "setup-middle-total",
  "setup-lowest-total",
  "essentials-total",
  "reliable-floor",
  "week5-change",
] as const;
