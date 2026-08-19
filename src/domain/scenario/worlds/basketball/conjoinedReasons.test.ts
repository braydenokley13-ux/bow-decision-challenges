import { describe, expect, it } from "vitest";
import { deriveFacts } from "../../../evidence/facts";
import { observeStructured } from "../../../evidence/observe";
import type { MicroSkillObservation } from "../../../evidence/types";
import { runChallenge } from "../../../../test/runChallenge";
import { observeBasketballEvidence, observeBasketballFromLog } from "./observer";

/**
 * What a teacher is told about a requirement that two micro-skills have to satisfy.
 *
 * `plan-within-income.er1` is a conjunction: total the money that actually arrives, **and**
 * keep the two payments that might not arrive out of it unless they are treated as removable.
 * The level has always been the weaker half's. The sentence was too — and on a run where both
 * halves held, that meant the trail printed one of the two things the student did.
 *
 * An assessment-validity review read the strongest run in a class and found that row saying
 * only *"The calculation reconciled with the scenario terms at the first attempt."* The
 * conceptual half is why the row was met and a teacher could not see it, in the world's own
 * words: *"One world shows a teacher half the reason."* The market's `conjoin` has always
 * joined both halves and says why in a comment. This is that rule, here.
 *
 * The other half of the same finding is not fixed and is not fixable here: the *level* is a
 * minimum, so a student who understands exactly which money is conditional and never lands
 * the sum still scores zero on a row about conditional money. That is an argument about what
 * the requirement is, not about what its sentence says, and it belongs with the people who
 * wrote the requirement.
 */
describe("a requirement built from two micro-skills reports both of them", () => {
  const er1 = (observations: readonly { evidenceRequirementId: string; reason: string; level: number | null }[]) =>
    observations.find((observation) => observation.evidenceRequirementId === "plan-within-income.er1")!;

  it("gives a teacher both halves when both halves held", () => {
    const log = [...runChallenge({ seatCode: "6" }).log];
    const row = er1(observeBasketballFromLog(log));
    expect(row.level).toBe(5);
    // The arithmetic half, and the half the row's own rule is about. Both sentences, one row.
    expect(row.reason).toMatch(/reconciled with the scenario terms/i);
    expect(row.reason).toMatch(/payments that might not arrive|conditional income/i);
  });

  it("lets the deciding half speak alone when a half failed", () => {
    // A failure is the whole of the judgement, and padding it with the halves that were fine
    // would bury the thing a teacher is being told to look at.
    const facts = deriveFacts([...runChallenge({ seatCode: "7" }).log]);
    const observations = observeStructured(facts).map((observation): MicroSkillObservation =>
      observation.microSkillId === "C1.1"
        ? { ...observation, points: 0, outcome: "not_demonstrated", reason: "The calculation did not reconcile with the scenario terms after 2 tries, and the student moved on without it." }
        : observation);
    const row = er1(observeBasketballEvidence({ observations, defense: { submitted: false, evidenceRefs: [] } }));
    expect(row.level).toBe(0);
    expect(row.reason).toMatch(/did not reconcile/i);
    expect(row.reason).not.toMatch(/payments that might not arrive/i);
  });
});
