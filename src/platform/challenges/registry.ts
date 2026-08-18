import type { ConceptId } from "../../domain/blueprint/types";

/**
 * What a BOW Decision Challenge is, independent of what it is about.
 *
 * Plan Under Pressure is the first challenge, not the system. Everything a surface needs
 * to list, route to, describe or time a challenge lives here, so the home page, the
 * educator brief, the class service and the evidence envelope all read one definition
 * instead of four copies of the same sentence. Duration in particular used to be written
 * out in three places and had already drifted — the home page and the educator brief both
 * advertised "12–15 minutes" for an experience that is not that length.
 *
 * This is deliberately a record of facts, not a framework. There is no rule engine, no
 * config-driven interaction layer and no JSON challenge builder here: a challenge still
 * ships its own stages, scenario and copy as code. The registry only makes a challenge
 * addressable.
 */
export interface ChallengeDefinition {
  /** Stable across versions. Names the evidence, the persistence key and the route. */
  id: string;
  /** Bumped when the model, stages or scoring change in a way evidence must record. */
  version: string;
  title: string;
  subtitle: string;
  /** The BOW pillar this challenge sits under. */
  pillar: string;
  grades: string;
  /** The canonical concepts a completed attempt can speak to. */
  conceptIds: readonly ConceptId[];
  /** Honest wall-clock range for a typical student, in minutes. */
  duration: { min: number; max: number };
  route: string;
  /** Where in a unit this belongs. */
  placement: string;
  skillId: string;
}

export const PLAN_UNDER_PRESSURE: ChallengeDefinition = {
  id: "plan-under-pressure",
  /**
   * 2.3.0 — one bump for the season rework.
   *
   * Three moments changed what they mean, and none of them changed what is recorded. Week 5's
   * card set now includes committed lines the week does not move, so selecting is a judgement
   * about the student's own plan rather than tapping everything on screen, and the app no
   * longer prints the running sum. Weeks 1–4 resolve together and the course deposit is its
   * own decision rather than a panel under a feed. Questions one and three stopped printing
   * the sum they ask for.
   *
   * The event vocabulary, the expected totals, the applicable component set and every scoring
   * rule are untouched — `oldLogs.regression.test.ts` pins three finished attempts captured
   * before the rework and fails if any of them would now be read differently. The version
   * moves because what a student was asked at those moments is not the same question, and an
   * attempt has to record which question it answered.
   */
  version: "2.3.0",
  title: "Plan Under Pressure",
  subtitle: "Eight weeks to the showcase.",
  pillar: "Financial Literacy",
  /**
   * The band the content is actually written for, and the one every other surface names.
   *
   * It said "Grades 6–8" here — on the front door and at the head of the educator guide —
   * while the objectives page, the framework footer and the whole competency spine said
   * "Grades 5–8", because that is what the material is: the objectives this challenge reports
   * against are NYSED's Grades 5–8 Personal Finance band, every competency in
   * `src/domain/competency/competencies.ts` carries `gradeBand: "5-8"`, and the student copy is
   * written to a Grade 5 reading floor. A teacher deciding whether this fits their Grade 5
   * class was being told two different answers by the same product, and the one on the front
   * door was the wrong one. `gradeBandAgreement.test.ts` fails if any user-visible grade band
   * ever disagrees with another again.
   */
  grades: "Grades 5–8",
  conceptIds: ["income-reliability", "full-cost", "viable-budget", "contingency", "adaptation", "financial-defense"],
  duration: { min: 20, max: 25 },
  route: "/challenges/plan-under-pressure",
  placement: "Use after instruction",
  skillId: "adaptive-budgeting-under-uncertainty",
};

export const CHALLENGES: readonly ChallengeDefinition[] = [PLAN_UNDER_PRESSURE] as const;

export function challengeById(id: string): ChallengeDefinition | undefined {
  return CHALLENGES.find((challenge) => challenge.id === id);
}

/** "20–25 minutes", written once. An en dash, because it is a range and not a subtraction. */
export function durationLabel(challenge: ChallengeDefinition): string {
  return `${challenge.duration.min}–${challenge.duration.max} minutes`;
}

/**
 * Where this challenge's attempt is kept.
 *
 * The key used to be `bow.student.v1.attempt` for the whole product, so a second challenge
 * would have opened Plan Under Pressure's saved attempt, failed to recognise it, and
 * quietly backed it up — losing a student's work to a challenge they were not playing.
 */
export function attemptKeyFor(challenge: ChallengeDefinition): string {
  return `bow.attempt.v2.${challenge.id}`;
}
