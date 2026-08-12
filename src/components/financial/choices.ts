import type { CategoryId } from "../../domain/core/ids";

/** The three amounts a student can move, in the order they appear everywhere. */
export const CHOICE_ORDER: readonly CategoryId[] = ["goal", "reserve", "flexibleCash"] as const;

export const CHOICE_LABELS: Record<CategoryId, string> = {
  goal: "Sports-media course",
  reserve: "Backup money",
  flexibleCash: "Anything else",
};
