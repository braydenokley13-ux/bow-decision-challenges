import type { MasteryStatus, Trajectory } from "../domain/evidence/types";
import type { CompetencyResultState, SupportLevel } from "../domain/competency/types";
import type { ObjectiveMapState, ObjectiveResultState } from "../domain/competency/objectiveState";
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

/**
 * The same six states as a heading rather than as the tail of a sentence.
 *
 * The student page leads with one of these, so it is written as a status a teacher reads in
 * one glance. The two absences say what they are: *incomplete* is evidence that is not all
 * in yet, and the page says which piece is missing underneath.
 */
export const COMPETENCY_STATE_HEADLINES: Record<CompetencyResultState, string> = {
  demonstrated: "Demonstrated",
  "demonstrated-with-support": "Demonstrated with support",
  developing: "Developing",
  "not-yet-demonstrated": "Not yet demonstrated",
  "not-observed": "Not observed in this run",
  incomplete: "Not assessed yet",
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
 * The nav label that names a framework, composed rather than typed.
 *
 * A New Jersey deployment must not read a New York acronym in its own navigation, and
 * nobody would find it by reading a component that had no other framework in it.
 * `frameworkNaming.test.ts` fails the build if a framework's short name appears in a
 * teacher-facing string anywhere outside this file.
 *
 * The second entry here was "NYSED view", the nav item that dropped a teacher into
 * fabricated student records from the row beside their real class. It is reached from the
 * sample class now, so the label went with it.
 */
export const NAV_LABELS = {
  objectives: `${labelsFor(NAV_FRAMEWORK)?.unitNounShort ?? "Objective"}s`,
} as const;

/**
 * The Objective Map's states, in the words §15.3 defines them by.
 *
 * Four of the nine are not claims about students, and their words are chosen to make that
 * unmistakable on a page next to seven that are. "Coming" is a fact about BOW's coverage;
 * "Not taught" and "Taught" are a teacher's own record; "Assigned" is work still in flight.
 * None of them is a score, and none of them may be read as one.
 */
export const MAP_STATE_LABELS: Record<ObjectiveMapState, string> = {
  "not-available": "Coming",
  "not-taught": "Not taught",
  "taught-not-assessed": "Taught",
  assigned: "Assigned",
  "partially-assessed": "Partly assessed",
  "too-few-assessed": "Too few assessed",
  strong: "Strong",
  developing: "Developing",
  "needs-attention": "Needs attention",
};

/** Worst first, because a teacher scanning a filter is looking for what needs them. */
export const MAP_STATE_ORDER: readonly ObjectiveMapState[] = [
  "needs-attention", "developing", "strong", "too-few-assessed",
  "partially-assessed", "assigned", "taught-not-assessed", "not-taught", "not-available",
];

/**
 * The rubric, in the words a teacher reads rather than as a bare digit.
 *
 * `null` is the one that matters. It is not a zero and it is not a failure — it is the run
 * never having asked, and a page that printed it as "0" would be reporting a fact about a
 * world's coverage as a fact about a child.
 */
export const LEVEL_LABELS: Record<0 | 2 | 3 | 4 | 5 | "null", string> = {
  5: "Independently",
  4: "Corrected it",
  3: "After a hint",
  2: "Partly",
  0: "Not demonstrated",
  null: "Never came up",
};

/**
 * What each level means, in the words a teacher would use to a colleague.
 *
 * Six one-word labels are a glossary a teacher does not have. They are shown beside the
 * labels wherever a person is asked to pick one, because "Partly" and "After a hint" are BOW's
 * distinctions and nobody outside this codebase has agreed to them.
 */
export const LEVEL_DESCRIPTIONS: Record<0 | 2 | 3 | 4 | 5 | "null", string> = {
  5: "Did it unaided, the first time it mattered.",
  4: "Got it wrong, saw what that cost, and fixed it themselves.",
  3: "Did it after a hint that named the problem.",
  2: "Part of it, not all of it.",
  0: "Did not do it.",
  null: "The run never asked this of them.",
};

/** What was on screen when the student did it, said as the reason a level is capped. */
export const SUPPORT_LABELS: Record<SupportLevel, string> = {
  standard_access: "the tools every student has",
  natural_consequence: "seeing what happened",
  direct_scaffold: "a hint that named the problem",
  answer_supplied: "the answer being supplied",
};

/**
 * Teacher-facing names for the moments an evidence trail is built out of.
 *
 * The stage and event ids are the product's internal vocabulary. A trail printed in that
 * vocabulary would be a log file with a heading on it, so every id a teacher can reach is
 * named here, and anything unnamed falls back to its id rather than to a blank.
 */
export const MOMENT_LABELS: { stage: Record<string, string>; event: Record<string, string> } = {
  stage: {
    "role-contract": "The terms",
    "setup-comparison": "Choosing where to live",
    "working-plan": "The first plan",
    "fallback-version": "The plan without the bonus",
    "season-weeks": "Weeks 1–4",
    "week5-event": "Week 5 · the news",
    "first-response": "Week 5 · first response",
    "opportunity-final-repair": "Week 5 · the two calls",
    "remaining-risk-preview": "Week 5 · the last check",
    "week8-resolution": "Week 8",
    defense: "Explaining the plan",
    submitted: "Turned in",
  },
  event: {
    CALCULATION_SUBMITTED: "Worked out a total",
    SETUP_RANKED: "Ordered the places by cost",
    SETUP_SELECTED: "Chose a place to live",
    COURSE_DEPOSIT_DECIDED: "Decided about the course seat",
    INCOME_SOURCE_TOGGLED: "Decided about a bonus",
    PLAN_SAVE_REQUESTED: "Checked the plan",
    PLAN_SAVED: "Saved the plan",
    PLAN_REMAINDER_ASSIGNED: "Named the row that takes the rest",
    LOCKED_MOVE_ATTEMPTED: "Tried to move committed money",
    GAP_TILE_TOGGLED: "Counted up what Week 5 cost",
    OPTIONAL_WORK_DECIDED: "Decided about the Saturday clinics",
    COMPLETION_INCOME_DECIDED: "Decided about the attendance bonus",
    SCAFFOLD_OPENED: "Opened a hint",
    SHOW_AND_CONTINUE_USED: "Was shown the answer",
    DEFENSE_SUBMITTED: "Wrote the explanation",
  },
};
