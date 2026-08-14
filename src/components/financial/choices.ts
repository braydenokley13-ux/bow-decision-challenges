import type { CategoryId } from "../../domain/core/ids";

/** The three amounts a student can move, in the order they appear everywhere. */
export const CHOICE_ORDER: readonly CategoryId[] = ["goal", "reserve", "flexibleCash"] as const;

/**
 * Three jobs money can do, and they now differ from each other.
 *
 * The old third category was "Anything else — Avery's to spend", which was mechanically
 * identical to the reserve: two rows, one meaning, over a total forced to balance at zero.
 * Money in Avery's week buys hours back — rides instead of the bus, food that isn't
 * cooked — so the split is future, safety, and present capacity.
 */
export const CHOICE_LABELS: Record<CategoryId, string> = {
  goal: "Sports-media course",
  reserve: "Backup money",
  flexibleCash: "Avery’s week",
};
