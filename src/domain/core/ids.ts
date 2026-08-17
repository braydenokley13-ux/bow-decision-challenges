/**
 * A world a student can be in.
 *
 * `"fashion"` used to sit here as a placeholder for a world nobody had started. A union
 * member that names nothing is worse than an empty seat: it typechecks everywhere, so a
 * surface can claim it, an assignment can be set against it, and nothing fails until a
 * student tries to play it. A world belongs in this union when it has a contract.
 */
export const WORLD_IDS = ["basketball", "food-truck"] as const;

export type WorldId = (typeof WORLD_IDS)[number];

/** Whether a stored string names a world this build knows about at all. */
export function isKnownWorld(id: string): id is WorldId {
  return (WORLD_IDS as readonly string[]).includes(id);
}
export type SetupId = "gym-sublet" | "teammate-share" | "cousin-room";
export type IncomeSourceId = "saved-500" | "base-4500" | "completion-800" | "outcome-1000" | "optional-work-500";
export type CategoryId = "goal" | "reserve" | "flexibleCash";
export type CalcId = "chosen-setup-total" | "essentials-total" | "reliable-floor" | "week5-change";

export const CALCULATION_IDS: readonly CalcId[] = [
  "chosen-setup-total",
  "essentials-total",
  "reliable-floor",
  "week5-change",
] as const;
