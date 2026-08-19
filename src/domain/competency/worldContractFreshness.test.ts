import { describe, expect, it } from "vitest";
import { BUILT_WORLD_COVERAGE } from "./availability";
import type { WorldEvidenceCoverage } from "./availability";
import { competencyContract, contractDrift, contractOf } from "./contract";
import { requiredEvidenceRequirementsFor } from "./competencies";

/**
 * The guard that notices a world was built against a competency that has since moved.
 *
 * **The failure this is for happened.** `is-the-add-on-worth-it` had four required rows when a
 * world was designed against it. It gained a fifth — a required explanation, because the
 * objective's verb is *analyze* and nothing was asking the student to say anything. The design
 * was never re-read. The court that judged the world scored the designer's own rubric rather
 * than the shipped competency. A coverage figure went out two objectives wrong, and no part of
 * the build was capable of noticing, because a coverage row records **which** requirements a
 * world produces and never recorded **which version of the competency** that was checked against.
 *
 * So each row carries the fingerprint it was written against, and this file fails when the
 * fingerprint and the competency disagree. It deliberately does not decide whether the world
 * still works: usually the answer is that one new row needs a production route, sometimes it is
 * that the world can already produce it and only the stamp is behind. Both are a person's call.
 * What the build owes that person is the fact that the call is due.
 *
 * **Re-stamping is an act, not a chore.** A stamp bumped to silence this test, without opening
 * the world and checking it against the new contract, converts the guard into a formality — so
 * the failure message says what re-stamping means before it says how to do it.
 */
describe("a coverage claim knows which competency it was checked against", () => {
  it("has no shipped row stamped against a contract that has since moved", () => {
    const stale = BUILT_WORLD_COVERAGE.filter((claim) => contractDrift(claim.competencyId, claim.contract) !== null);
    const report = stale.map((claim) => {
      const drift = contractDrift(claim.competencyId, claim.contract);
      return [
        `${claim.worldId} → ${claim.competencyId}: ${drift}.`,
        `  Open ${claim.worldId}'s observer and check it still produces every required row.`,
        `  Then, and only then, stamp contract: "${competencyContract(claim.competencyId)}".`,
      ].join("\n");
    });
    expect(stale.length, `\n${report.join("\n\n")}\n`).toBe(0);
  });

  it("stamps every row it ships, so a missing stamp cannot read as a fresh one", () => {
    for (const claim of BUILT_WORLD_COVERAGE) {
      expect(claim.contract, `${claim.worldId} → ${claim.competencyId}`).toMatch(/^[a-z-]+:(none|\d+:[0-9a-z]+)$/);
      expect(claim.contract.startsWith(`${claim.competencyId}:`), claim.contract).toBe(true);
    }
  });

  describe("what the guard actually detects", () => {
    /** A row exactly as it ships, except stamped against a version that no longer exists. */
    const stampedAgainstFourRows = (): WorldEvidenceCoverage => ({
      worldId: "basketball",
      competencyId: "plan-within-income",
      producedEvidenceRequirementIds: requiredEvidenceRequirementsFor("plan-within-income").map((row) => row.id),
      contract: "plan-within-income:4:oldstamp",
    });

    it("catches a row whose competency gained a required row after it was written", () => {
      const claim = stampedAgainstFourRows();
      const drift = contractDrift(claim.competencyId, claim.contract);
      expect(drift).not.toBeNull();
      // The message has to be actionable on its own — someone reads it in CI output with no
      // other context and has to know what moved.
      expect(drift).toContain("required 4 rows when this was written");
      expect(drift).toContain(`requires ${requiredEvidenceRequirementsFor("plan-within-income").length} now`);
    });

    it("catches a decision row that became an explanation without the count changing", () => {
      const current = competencyContract("plan-within-income");
      const [id, count] = current.split(":");
      // Same competency, same number of required rows, different kinds. The count check
      // cannot see this one; the fingerprint is why it is caught at all.
      const sameCountDifferentShape = `${id}:${count}:zzzzzz`;
      expect(contractDrift("plan-within-income", sameCountDifferentShape)).toBe(
        "plan-within-income's required rows have changed shape since this was written",
      );
    });

    it("passes a row stamped against the competency as it stands", () => {
      expect(contractDrift("plan-within-income", competencyContract("plan-within-income"))).toBeNull();
    });

    it("does not move on a reworded rule, so a stamp is never bumped without being read", () => {
      // The fingerprint covers required ids and kinds. Labels, observable rules and
      // misconceptions all change without changing what a world must produce, and a guard
      // that fired on a typo would be re-stamped reflexively — which is how it stops working.
      const rows = requiredEvidenceRequirementsFor("plan-within-income");
      expect(rows.length).toBeGreaterThan(0);
      const reworded = rows.map((row) => ({
        ...row,
        label: `${row.label} (reworded)`,
        observableRule: `${row.observableRule} — said a different way`,
        misconceptionIfNot: `${row.misconceptionIfNot} — said a different way`,
      }));
      expect(contractOf("plan-within-income", reworded)).toBe(competencyContract("plan-within-income"));
    });

    it("moves when a decision row becomes an explanation, which is what a world has to notice", () => {
      const rows = requiredEvidenceRequirementsFor("plan-within-income");
      const decision = rows.find((row) => row.kind === "decision");
      expect(decision, "plan-within-income should still have a decision row to flip").toBeDefined();
      const flipped = rows.map((row) => (row.id === decision?.id ? { ...row, kind: "explanation" as const } : row));
      // Same ids, same count. Only the fingerprint separates these two contracts, and the
      // difference between them is a whole written answer the world now has to collect.
      expect(contractOf("plan-within-income", flipped)).not.toBe(competencyContract("plan-within-income"));
    });

    it("moves when a required row is dropped", () => {
      const rows = requiredEvidenceRequirementsFor("plan-within-income");
      expect(contractOf("plan-within-income", rows.slice(0, -1))).not.toBe(
        competencyContract("plan-within-income"),
      );
    });
  });
});
