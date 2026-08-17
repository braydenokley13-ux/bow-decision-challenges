import type { CategoryId } from "../../domain/core/ids";

/** The three amounts a student can move, in the order they appear everywhere. */
export const CHOICE_ORDER: readonly CategoryId[] = ["goal", "reserve", "flexibleCash"] as const;

/**
 * Three jobs money can do, and they now differ from each other.
 *
 * The old third category was "Anything else — Avery's to spend", which was mechanically
 * identical to the reserve: two rows, one meaning, over a total forced to balance at zero.
 * This money buys hours back — rides instead of two bus changes, food that isn't cooked,
 * the physio a tired body needs — so the split is future, safety, and present capacity.
 *
 * It was called "Avery's week", which is also the name of the hours meter directly below
 * it. One name, one screen, dollars in one place and hours in the other: readers could not
 * tell which of the two the row was, and said so. The row is now named for what the money
 * buys, and the meter keeps the name of the thing being measured.
 */
export const CHOICE_LABELS: Record<CategoryId, string> = {
  goal: "Sports-media course",
  reserve: "Backup money",
  flexibleCash: "Rides and rest",
};
