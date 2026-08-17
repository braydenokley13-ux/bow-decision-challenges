import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { evidenceTrail, judgementsOf } from "../domain/competency/trail";
import { requiredEvidenceRequirementsFor } from "../domain/competency/competencies";
import { buildSubmission } from "../test/runChallenge";
import { competencyObservationsFor } from "./objectiveResults";

/**
 * The trail, on evidence a real run produced.
 *
 * `trail.test.ts` proves the builder. This proves the promise: that for a student who
 * actually played the world, every judgement a teacher can read points at a moment that is
 * genuinely in that student's log.
 */

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

function trailFor(options: Parameters<typeof buildSubmission>[0] = {}, read = true) {
  const built = buildSubmission(options);
  const submission = read ? { ...built, reasoningPoints: 10, reasoningCriteria: READ_AND_STRONG } : built;
  return { submission, trail: evidenceTrail(submission.log, competencyObservationsFor(submission)) };
}

describe("what a teacher can audit", () => {
  it("hangs every judgement it made on an event in this student's own log", () => {
    const { submission, trail } = trailFor();
    const ids = new Set(submission.log.map((event) => event.id));
    expect(trail.moments.length).toBeGreaterThan(0);
    for (const moment of trail.moments) expect(ids.has(moment.eventId)).toBe(true);
  });

  it("gives every observed judgement at least one reference that resolves", () => {
    const { submission, trail } = trailFor();
    const ids = new Set(submission.log.map((event) => event.id));
    const observed = judgementsOf(trail).filter((judgement) => judgement.level !== null);
    expect(observed.length).toBeGreaterThan(0);
    for (const judgement of observed) {
      expect(judgement.evidenceRefs.some((ref) => ids.has(ref)), judgement.evidenceRequirementId).toBe(true);
    }
  });

  it("reads in the order the student produced it", () => {
    const { trail } = trailFor();
    const sequences = trail.moments.map((moment) => moment.sequence);
    expect([...sequences].sort((a, b) => a - b)).toEqual(sequences);
  });

  it("carries a sentence for every judgement, so none of them is a bare number", () => {
    const { trail } = trailFor();
    for (const judgement of judgementsOf(trail)) expect(judgement.reason.trim().length).toBeGreaterThan(0);
  });

  it("covers every required requirement of the competency this world claims", () => {
    const { trail } = trailFor();
    const spoken = new Set(judgementsOf(trail).map((judgement) => judgement.evidenceRequirementId));
    for (const requirement of requiredEvidenceRequirementsFor("plan-within-income")) {
      expect(spoken.has(requirement.id), requirement.id).toBe(true);
    }
  });

  it("reports an unread explanation as not observed rather than as a zero", () => {
    const { submission, trail } = trailFor({}, false);
    const explanation = judgementsOf(trail).find((judgement) => judgement.kind === "explanation");
    expect(explanation).toBeDefined();
    expect(explanation?.level).toBeNull();
    // It stays on the timeline, on the moment the student turned it in, because writing it
    // is something they did. What has not happened is somebody reading it — §19.2 shows
    // exactly this line, awaiting review.
    const ids = new Set(submission.log.map((event) => event.id));
    expect(explanation?.evidenceRefs.some((ref) => ids.has(ref))).toBe(true);
  });

  it("keeps anything it could not anchor off the timeline, and never as a level", () => {
    // Nothing may sit in `notObserved` carrying a real level: an absence with a number on it
    // is exactly the shape "not observed became zero" would take.
    const { trail } = trailFor();
    for (const judgement of trail.notObserved) expect(judgement.level).toBeNull();
  });

  it("moves a judgement to the moment that settled it when a student revisits the plan", () => {
    const { trail } = trailFor();
    const adapt = judgementsOf(trail).filter((judgement) => judgement.competencyId === "adapt-a-plan" && judgement.level !== null);
    expect(adapt.length).toBeGreaterThan(0);
    // Week 5 comes after the opening plan, so nothing about repairing a plan may be anchored
    // to a moment before the disruption that caused it.
    const openingMoments = trail.moments.filter((moment) => moment.stage === "working-plan");
    for (const moment of openingMoments) {
      expect(moment.judgements.every((judgement) => judgement.competencyId !== "adapt-a-plan")).toBe(true);
    }
  });
});
