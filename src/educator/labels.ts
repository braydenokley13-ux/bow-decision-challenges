import type { MasteryStatus, Trajectory } from "../domain/evidence/types";
import type { CompetencyResultState } from "../domain/competency/types";
import type { ObjectiveResultState } from "../domain/competency/objectiveState";
import { labelsFor, type FrameworkId } from "../domain/standards";

/** The framework this deployment names in its navigation. One today. */
const NAV_FRAMEWORK: FrameworkId = "nysed-pf-2026";

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

/**
 * The competency layer's states, in words a teacher reads.
 *
 * The two absences keep their own names rather than borrowing a low one. *Not observed*
 * means the world never presented it and *incomplete* means the evidence is not all in yet
 * — most often because nobody has read the writing. Neither is a score, and calling either
 * of them one would put a fact about a marking backlog on a page about a child.
 */
export const COMPETENCY_STATE_LABELS: Record<CompetencyResultState, string> = {
  demonstrated: "demonstrated",
  "demonstrated-with-support": "demonstrated with support",
  developing: "developing",
  "not-yet-demonstrated": "not yet demonstrated",
  "not-observed": "not observed",
  incomplete: "still incomplete",
};

/** The class-level states, for the sentence that sits beside the number (§10.7). */
export const OBJECTIVE_STATE_LABELS: Record<ObjectiveResultState, string> = {
  strong: "Strong",
  developing: "Developing",
  "needs-attention": "Needs attention",
  "too-few-assessed": "Too few assessed for a class state",
  "not-assessed": "Not yet assessed",
};

/**
 * The two nav labels that name a framework, composed rather than typed.
 *
 * "NYSED view" was a literal in the shell. A New Jersey deployment would have shown a New
 * York acronym in its own navigation, and nobody would have found it by reading a component
 * that had no other framework in it. `frameworkNaming.test.ts` fails the build if a
 * framework's short name appears in a teacher-facing string anywhere outside this file.
 */
export const NAV_LABELS = {
  objectives: `${labelsFor(NAV_FRAMEWORK)?.unitNounShort ?? "Objective"}s`,
  frameworkView: `${labelsFor(NAV_FRAMEWORK)?.frameworkShort ?? "Framework"} view`,
} as const;
