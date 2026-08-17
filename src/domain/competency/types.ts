/**
 * The BOW competency model — the permanent internal spine.
 *
 * A competency is one financial skill, written in BOW's own words, that belongs to no
 * state. It is what a world assesses and what the rubric scores. A state framework's
 * objective is how that skill gets *named* to a teacher in one jurisdiction, and that
 * naming lives in `src/domain/standards/`, never here.
 *
 * **The one-way rule.** Competencies never reference frameworks; frameworks never
 * reference worlds; a world never references an objective. Everything is joined through
 * the mapping table, which is the only file that changes when a state is added. Nothing in
 * this directory may name NYSED, carry a bare objective code like `"1.3"`, or import from
 * `src/domain/standards/**` — `spineSeparation.test.ts` fails the build if it does.
 *
 * The cost of getting this wrong is not aesthetic. An event carrying `"1.3"` is an event
 * that has to be migrated the first time a second framework exists, or the first time
 * NYSED revises its numbering. An event carrying `plan-within-income` never does.
 */

/** The five BOW groups. BOW's own, not any state's, and not renamed when a state is added. */
export type CompetencyGroupId = "B" | "C" | "E" | "R" | "S";

/**
 * A stable slug. Never reused, never renamed — a competency id appears in stored evidence,
 * so renaming one silently rewrites the meaning of work students have already submitted.
 */
export type CompetencyId =
  | "sort-by-need-want-goal"
  | "plan-within-income"
  | "adapt-a-plan"
  | "explain-different-outcomes"
  | "judge-a-claim"
  | "notice-influence"
  | "choose-how-to-pay"
  | "decide-to-borrow"
  | "keep-credit-costs-down"
  | "compare-earning-paths"
  | "gross-to-net"
  | "what-taxes-fund"
  | "plan-for-the-unexpected"
  | "use-insurance"
  | "is-the-add-on-worth-it"
  | "protect-your-information"
  | "save-toward-a-goal"
  | "how-savings-grow"
  | "compare-rates"
  | "weigh-investment-risk"
  | "spread-the-risk";

/** `"plan-within-income.er2"`. Namespaced by competency so it is unique without a registry. */
export type EvidenceRequirementId = `${CompetencyId}.er${1 | 2 | 3 | 4 | 5 | 6}`;

/**
 * Decision evidence comes from what the student did, derived deterministically from the
 * event log. Explanation evidence comes from what the student wrote, and a person scores
 * it. Every evidence requirement is one or the other, never both.
 */
export type EvidenceKind = "decision" | "explanation";

/**
 * The kind of decision experience that can assess this competency honestly. A competency
 * whose shape is `compare-two-lives` cannot be assessed by a budgeting board, and the
 * shape is what stops a world being built for a competency it cannot actually observe.
 */
export type AssessmentShape =
  | "plan-and-repair"
  | "choose-under-pressure"
  | "run-it-forward"
  | "read-and-judge"
  | "compare-two-lives";

export type GradeBand = "5-8";

/**
 * The common rubric scale, support-aware, shared by every evidence requirement in every
 * competency in every world.
 *
 * There is deliberately no level 1: two neighbouring levels a teacher cannot tell apart
 * are a rubric defect. This is the scale the evidence engine already uses today
 * (`EvidencePoints` in `../blueprint/types.ts`); `competencyShape.test.ts` asserts the two
 * have not drifted apart. It is restated rather than imported because the blueprint module
 * is Plan Under Pressure's, and the spine must not depend on one world.
 *
 * | 5 | Right at the first real opportunity, with nothing but the standard tools |
 * | 4 | Wrong, saw the consequence, fixed it before any hint                    |
 * | 3 | Right after a direct hint                                              |
 * | 2 | Partly right; a real gap remains                                       |
 * | 0 | Not demonstrated, or the answer was supplied                           |
 */
export type RubricLevel = 0 | 2 | 3 | 4 | 5;

/**
 * How much help was on the screen when the student did it.
 *
 * Support is part of the rubric rather than a note beside it: the same action taken after
 * BOW named the problem is a different piece of evidence from the same action taken cold.
 * Each level carries a cap, and the cap is applied by the shared engine in `observe.ts`, so
 * a world cannot report a 5 for something it also says it scaffolded.
 *
 * | `standard_access`     | Tools that are always on screen. No cap — 5 is reachable. |
 * | `natural_consequence` | The situation showed what happened. Caps at 4.            |
 * | `direct_scaffold`     | BOW named the problem. Caps at 3.                         |
 * | `answer_supplied`     | BOW gave the answer so the student could continue. Scores 0. |
 *
 * Restated here rather than imported for the same reason `RubricLevel` is: the taxonomy the
 * codebase already uses lives beside Plan Under Pressure's scorer, and the spine must not
 * depend on one challenge. `competencyShape.test.ts` fails to compile if the two drift.
 */
export type SupportLevel = "standard_access" | "natural_consequence" | "direct_scaffold" | "answer_supplied";

/** Bumped when the meaning of a rubric level changes. Analyses may not pool two versions. */
export const RUBRIC_VERSION = "1.0.0";

/** Bumped when a competency's statement, evidence requirements or shape change meaning. */
export const COMPETENCY_MODEL_VERSION = "1.0.0";

/**
 * One observable thing a student must do. It belongs to a competency, not to a world —
 * that is precisely what lets two different worlds produce comparable evidence.
 */
export interface EvidenceRequirement {
  id: EvidenceRequirementId;
  competencyId: CompetencyId;
  /** What a teacher would call it. Short enough to sit in a results list. */
  label: string;
  kind: EvidenceKind;
  /** A world may only claim a competency if it produces every required one of these. */
  required: boolean;
  /** The plain-English statement of what counts. The rubric row, in words. */
  observableRule: string;
  /**
   * Which named misconception a failure here indicates. Drives the reteach card.
   *
   * `null` where the product definition names no misconception behind this particular
   * failure — an omission or an arithmetic slip is not a wrong idea about money, and
   * inventing a name for one would put a made-up diagnosis on a teacher's screen.
   */
  misconceptionIfNot: string | null;
}

/**
 * One financial skill, written so a person could watch a student and say whether they did
 * it.
 *
 * A competency deliberately does **not** carry a state objective number, a point value, a
 * world or a difficulty. Those live in other layers so that adding a state is a mapping
 * job rather than a rebuild.
 */
export interface Competency {
  /** A stable slug. Never reused, never renamed. */
  id: CompetencyId;
  /** A short human code for internal use only: `BOW-B2`. Never shown to a student. */
  displayCode: string;
  group: CompetencyGroupId;
  /** One sentence in plain English describing what the student can do. */
  statement: string;
  /** Two to four concrete, observable bullets. */
  whatTheStudentMustDo: readonly string[];
  /**
   * The 3–6 specific things that must be observed.
   *
   * An empty array means *not yet specified* — the competency is defined and mapped, and
   * nobody has written its evidence requirements yet. A competency with no evidence
   * requirements can never be satisfied by any world, so it is never assessable.
   */
  evidenceRequirements: readonly EvidenceRequirement[];
  /** The named wrong ideas this competency exists to catch. */
  misconceptions: readonly string[];
  gradeBand: GradeBand;
  /** Whether a written explanation is required evidence or optional. */
  explanationRequired: boolean;
  assessmentShape: AssessmentShape;
}

/**
 * What a student's required evidence requirements added up to, per §10.4.
 *
 * `not-observed` is not zero and `incomplete` is not a low score: a student whose
 * Chromebook died is not a student who cannot budget. Every roll-up must treat both as
 * absent rather than as a bad result.
 */
export type CompetencyResultState =
  | "demonstrated"
  | "demonstrated-with-support"
  | "developing"
  | "not-yet-demonstrated"
  | "not-observed"
  | "incomplete";

/** One evidence requirement's outcome. `null` means the world never presented it. */
export interface EvidenceRequirementLevel {
  evidenceRequirementId: EvidenceRequirementId;
  level: RubricLevel | null;
}

/**
 * One judgement a world's observer offers about one evidence requirement.
 *
 * This is the only thing a world hands the shared engine. The observer knows the world; the
 * engine knows the rubric; neither knows the other's details. That is what lets a second
 * world produce evidence about `plan-within-income` that pools with this one's.
 *
 * The level is what the observer *claims*; the engine re-applies the support cap before
 * using it, so a claim of 5 alongside `direct_scaffold` becomes a 3 rather than being
 * trusted. `null` is *not observed* — the situation never presented the opportunity — and
 * it is never a zero at any point downstream.
 */
export interface EvidenceRequirementObservation {
  evidenceRequirementId: EvidenceRequirementId;
  /**
   * Which kind of evidence this is, restated by the observer rather than looked up.
   *
   * The engine checks it against the requirement's own `kind` and discards a mismatch. A
   * challenge that machine-scored a written explanation would be inferring a grade for
   * student writing, which §10.6 forbids outright, so the engine refuses the observation
   * instead of trusting the caller to have read the rule.
   */
  kind: EvidenceKind;
  /** The rubric level, before the engine applies the support cap. `null` is not observed. */
  level: RubricLevel | null;
  supportLevel: SupportLevel;
  /** Event ids. A teacher who disagrees has to be able to see what BOW saw. */
  evidenceRefs: readonly string[];
  /** One plain sentence for the evidence trail, in the words a teacher would use. */
  reason: string;
}

/**
 * One competency's outcome for one student, on one attempt.
 *
 * The rule that turns levels into a state lives in the shared engine (Checkpoint 2), not
 * here — this file declares the shape the engine and the reporting layer both read.
 */
export interface CompetencyResult {
  competencyId: CompetencyId;
  state: CompetencyResultState;
  levels: readonly EvidenceRequirementLevel[];
  /** Stamped so an analysis can exclude mixed model versions rather than pool them. */
  competencyModelVersion: string;
  rubricVersion: string;
}
