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

/**
 * Why a student left one of several competing claims unpaid.
 *
 * Written in no world's vocabulary on purpose. A claim on limited money is either something
 * only wanted, something nobody else is depending on, something that can be put off at a
 * price, or — and this is the one the competency exists to catch — the cheapest thing on
 * the list. Those four hold of a night market's stock order and a basketball season's week
 * alike, so a second world producing `COMPETING_CLAIMS_SETTLED` says the same four things
 * and its evidence pools with this one's. The claims themselves are the world's; this is
 * not.
 */
export type ClaimReasonId = "only-wanted" | "no-one-counting" | "can-wait" | "cheapest";

export const CALCULATION_IDS: readonly CalcId[] = [
  "chosen-setup-total",
  "essentials-total",
  "reliable-floor",
  "week5-change",
] as const;
