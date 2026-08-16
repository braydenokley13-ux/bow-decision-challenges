import type { MasteryStatus, Trajectory } from "../domain/evidence/types";

/**
 * The words the educator surface uses for the evidence engine's vocabulary. One copy, read
 * by the real-class pages and the demo alike, so the two can never describe the same status
 * differently.
 */
export const STATUS_LABELS: Record<MasteryStatus, string> = {
  demonstrated_independently: "Independent",
  demonstrated_with_support: "With support",
  developing: "Developing",
  not_demonstrated: "Not demonstrated",
  not_observed: "Not observed",
};

export const TRAJECTORY_LABELS: Record<Trajectory, string> = {
  independent_first_opportunity: "Independent first opportunity",
  corrected_after_consequence: "Corrected after consequence",
  corrected_after_scaffold: "Corrected after scaffold",
  new_difficulty_during_adaptation: "New difficulty during adaptation",
  persistent_gap: "Persistent gap",
  insufficient_evidence: "Insufficient evidence",
};

/** Strongest first, so every distribution bar in the product reads the same way. */
export const STATUS_ORDER: readonly MasteryStatus[] = [
  "demonstrated_independently", "demonstrated_with_support", "developing", "not_demonstrated", "not_observed",
];
