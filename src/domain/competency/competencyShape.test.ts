import { describe, expect, it } from "vitest";
import type { EvidencePoints } from "../blueprint/types";
import { supportCap } from "../evidence/support";
import type { SupportLevel as EngineSupportLevel } from "../evidence/types";
import { BUILT_WORLD_COVERAGE } from "./availability";
import { COMPETENCIES, COMPETENCY_GROUPS, competenciesInGroup, competencyById, findCompetency, requiredEvidenceRequirementsFor } from "./competencies";
import { SUPPORT_CAPS } from "./observe";
import type { AssessmentShape, CompetencyId, RubricLevel, SupportLevel } from "./types";
import { COMPETENCY_MODEL_VERSION, RUBRIC_VERSION } from "./types";

/**
 * The shape every competency has to hold, whether or not a world exists for it yet.
 *
 * A competency is the unit two different worlds are compared through. If one of them is
 * malformed — a duplicate id, a missing shape, evidence requirements that belong to another
 * competency — the comparison silently measures something other than what it claims, and
 * the failure surfaces months later as "these two worlds do not agree."
 *
 * The rule the product definition sets for a competency that has a world is: **at least
 * three required evidence requirements, at least two of them decision evidence.** Fewer
 * than three and there is not enough to distinguish demonstrated from developing; fewer
 * than two decision requirements and the result rests on writing, which a simulation did
 * not measure. That rule is asserted below for every competency that carries evidence
 * requirements at all — not only for the ones with worlds — so it cannot pass vacuously
 * while no world exists.
 */

const SHAPES: readonly AssessmentShape[] = ["plan-and-repair", "choose-under-pressure", "run-it-forward", "read-and-judge", "compare-two-lives"];

/** Every competency some built world produces evidence about, whole or partial. */
const WITH_A_BUILT_WORLD: readonly CompetencyId[] = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.competencyId))];

/** The ones somebody has actually written the observable rules for. */
const WITH_EVIDENCE_WRITTEN = COMPETENCIES.filter((competency) => competency.evidenceRequirements.length > 0);

describe("competency shape", () => {
  it("carries all 21 competencies across BOW's five groups", () => {
    expect(COMPETENCIES).toHaveLength(21);
    expect(COMPETENCY_GROUPS.map((group) => group.id)).toEqual(["B", "C", "E", "R", "S"]);
    expect(COMPETENCY_GROUPS.map((group) => competenciesInGroup(group.id).length)).toEqual([7, 2, 3, 4, 5]);
    expect(COMPETENCY_GROUPS.reduce((total, group) => total + competenciesInGroup(group.id).length, 0)).toBe(21);
  });

  it("gives every competency a unique id and a unique display code", () => {
    // A competency id appears in stored evidence. Two competencies sharing one would merge
    // two skills in every roll-up ever computed from that evidence.
    expect(new Set(COMPETENCIES.map((competency) => competency.id)).size).toBe(21);
    expect(new Set(COMPETENCIES.map((competency) => competency.displayCode)).size).toBe(21);
    for (const competency of COMPETENCIES) {
      expect(competency.id, competency.id).toMatch(/^[a-z][a-z-]+[a-z]$/);
      expect(competency.displayCode, competency.id).toMatch(/^BOW-[BCERS][1-9]$/);
      expect(competency.displayCode.startsWith(`BOW-${competency.group}`), competency.id).toBe(true);
    }
  });

  it("states what the student can do, and what they must actually do", () => {
    for (const competency of COMPETENCIES) {
      expect(competency.statement.trim().length, competency.id).toBeGreaterThan(40);
      expect(competency.statement.endsWith("."), competency.id).toBe(true);
      // Two to four concrete, observable bullets. One is a restatement; five is a lesson.
      expect(competency.whatTheStudentMustDo.length, competency.id).toBeGreaterThanOrEqual(2);
      expect(competency.whatTheStudentMustDo.length, competency.id).toBeLessThanOrEqual(4);
      expect(competency.misconceptions.length, competency.id).toBeGreaterThan(0);
      expect(competency.gradeBand, competency.id).toBe("5-8");
      expect(SHAPES, competency.id).toContain(competency.assessmentShape);
    }
  });

  it("gives every assessment shape at least one competency to justify it", () => {
    // A shape with no competency is a category invented ahead of a need, and the next
    // world built for it would have nothing to assess.
    for (const shape of SHAPES) {
      const inShape = COMPETENCIES.filter((competency) => competency.assessmentShape === shape);
      expect(inShape.length, shape).toBeGreaterThan(0);
    }
  });

  it("keeps evidence requirements owned by their own competency, and correctly numbered", () => {
    const seen = new Set<string>();
    for (const competency of COMPETENCIES) {
      competency.evidenceRequirements.forEach((requirement, index) => {
        const where = `${competency.id} ${requirement.id}`;
        expect(requirement.competencyId, where).toBe(competency.id);
        expect(requirement.id, where).toBe(`${competency.id}.er${index + 1}`);
        expect(seen.has(requirement.id), `duplicate ${requirement.id}`).toBe(false);
        seen.add(requirement.id);
        expect(requirement.label.trim().length, where).toBeGreaterThan(5);
        expect(requirement.observableRule.trim().length, where).toBeGreaterThan(20);
        expect(["decision", "explanation"], where).toContain(requirement.kind);
      });
    }
  });

  it("holds every competency with evidence written to three required requirements, two of them decisions", () => {
    expect(WITH_EVIDENCE_WRITTEN.length).toBeGreaterThan(0);
    for (const competency of WITH_EVIDENCE_WRITTEN) {
      const required = requiredEvidenceRequirementsFor(competency.id);
      expect(required.length, `${competency.id} required`).toBeGreaterThanOrEqual(3);
      const decisions = required.filter((requirement) => requirement.kind === "decision");
      expect(decisions.length, `${competency.id} required decision evidence`).toBeGreaterThanOrEqual(2);
      // Three to six is the stated band. More than six and a teacher cannot read the row.
      expect(competency.evidenceRequirements.length, `${competency.id} total`).toBeLessThanOrEqual(6);
    }
  });

  it("holds every competency with a built world to the same rule", () => {
    // The literal acceptance criterion, and no longer vacuous: Basketball now declares
    // coverage, so this bites on real rows.
    expect(WITH_A_BUILT_WORLD.length).toBeGreaterThan(0);
    for (const competencyId of WITH_A_BUILT_WORLD) {
      const competency = competencyById(competencyId);
      const required = requiredEvidenceRequirementsFor(competencyId);
      expect(required.length, `${competency.id} has a world and ${required.length} required requirements`).toBeGreaterThanOrEqual(3);
      expect(required.filter((requirement) => requirement.kind === "decision").length, competency.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("requires an explanation of the competencies whose objective asks for words", () => {
    // Six competencies sit behind objectives whose verb is analyze, evaluate, describe or
    // explain. A simulation can prove a student acted correctly; it cannot prove they can
    // say why, and those objectives explicitly ask them to. For these the written
    // explanation is the primary evidence, so it cannot be optional.
    const mustExplain: CompetencyId[] = [
      "explain-different-outcomes",
      "what-taxes-fund",
      "use-insurance",
      "judge-a-claim",
      "compare-earning-paths",
      "weigh-investment-risk",
    ];
    for (const id of mustExplain) expect(competencyById(id).explanationRequired, id).toBe(true);
  });

  it("makes the explanation flag agree with the array it describes", () => {
    /**
     * `explanationRequired` is a promise that a written explanation is *required evidence*, and
     * `isCompetencyAvailable` only ever checks required rows — so a competency carrying the flag
     * over an array with no required explanation in it promises something no world can be held
     * to. `save-toward-a-goal` records the rule in its own margin: the flag "has to agree with
     * the array it describes."
     *
     * Nothing checked it. `is-the-add-on-worth-it` was written in this run with four decision
     * rows under a docstring asserting the flag was `false`, and it is `true`; the suite was
     * green either way. The test above holds six named competencies to carrying the flag, which
     * is the other half of the same rule and was the half that existed.
     *
     * Only one direction is asserted. A `false` flag over an *optional* explanation row is
     * `adapt-a-plan`, deliberately: the writing is worth having and the competency does not
     * stand or fall on it.
     */
    for (const competency of WITH_EVIDENCE_WRITTEN) {
      if (!competency.explanationRequired) continue;
      const written = competency.evidenceRequirements.filter(
        (requirement) => requirement.kind === "explanation" && requirement.required,
      );
      expect(
        written.map((requirement) => requirement.id).length,
        `${competency.id} requires an explanation and has no required explanation row`,
      ).toBeGreaterThan(0);
    }
  });

  it("names a misconception on an evidence requirement only from its own competency's list", () => {
    // `misconceptionIfNot` becomes a reteach card on a teacher's screen. One that names a
    // misconception the competency does not claim to catch is a diagnosis nobody decided.
    for (const competency of COMPETENCIES) {
      const named = new Set(competency.misconceptions);
      for (const requirement of competency.evidenceRequirements) {
        if (requirement.misconceptionIfNot === null) continue;
        expect(named.has(requirement.misconceptionIfNot), `${requirement.id} → "${requirement.misconceptionIfNot}"`).toBe(true);
      }
    }
  });

  it("resolves a competency by id, and refuses one that does not exist", () => {
    expect(competencyById("plan-within-income").displayCode).toBe("BOW-B2");
    expect(findCompetency("plan-within-income")?.id).toBe("plan-within-income");
    expect(findCompetency("1.3")).toBeUndefined();
    expect(findCompetency("budgeting")).toBeUndefined();
  });

  it("keeps the common rubric on the scale the evidence engine already uses", () => {
    // §10.3 keeps the existing 0/2/3/4/5 scale as the common rubric, with deliberately no
    // level 1 — two neighbouring levels a teacher cannot tell apart are a rubric defect.
    // These two conversions fail to compile if the scales ever drift apart, which is the
    // only way to catch it: nothing at runtime reads both. Neither uses a cast — a cast
    // would keep compiling for exactly as long as the drift went unnoticed.
    const asRubricLevel = (points: EvidencePoints): RubricLevel => points;
    const asEvidencePoints = (level: RubricLevel): EvidencePoints => level;
    expect([asRubricLevel(0), asEvidencePoints(5)]).toEqual([0, 5]);
    const levels: RubricLevel[] = [0, 2, 3, 4, 5];
    expect(levels).not.toContain(1);
  });

  it("keeps the support taxonomy on the one the evidence engine already uses", () => {
    // Restated in the spine rather than imported, for the same reason the rubric scale is,
    // and guarded the same way: these two conversions stop compiling the moment a level is
    // added or renamed on either side.
    const asSpineSupport = (level: EngineSupportLevel): SupportLevel => level;
    const asEngineSupport = (level: SupportLevel): EngineSupportLevel => level;
    expect([asSpineSupport("direct_scaffold"), asEngineSupport("answer_supplied")])
      .toEqual(["direct_scaffold", "answer_supplied"]);
  });

  it("caps a level the same way the evidence engine does, wherever the engine has an opinion", () => {
    // The spine caps `natural_consequence` at 4 because §10.3 says so. Plan Under Pressure's
    // own cap returns 5 for it — it expresses "saw the consequence and fixed it" on the
    // quality axis and never stamps that support level on an event — so the two can only be
    // compared on the three levels it actually produces. Those three have to agree, or the
    // same run scores differently depending on which layer read it.
    for (const level of ["standard_access", "direct_scaffold", "answer_supplied"] as const) {
      expect(SUPPORT_CAPS[level], level).toBe(supportCap(level));
    }
    expect(SUPPORT_CAPS.natural_consequence).toBe(4);
  });

  it("stamps a version on the model and the rubric", () => {
    // Every future analysis depends on being able to exclude mixed versions rather than
    // pool them. Stamping costs nothing now and cannot be backfilled.
    expect(COMPETENCY_MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(RUBRIC_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
