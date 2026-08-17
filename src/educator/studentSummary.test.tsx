// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { evidenceTrail, judgementsOf } from "../domain/competency/trail";
import type { TeacherOverride } from "../platform/classes/types";
import { buildSubmission } from "../test/runChallenge";
import { EvidenceTrailPanel, StudentSummary } from "./EvidenceTrailPanel";
import { competencyObservationsFor } from "./objectiveResults";

/**
 * The summary reads a requirement the way the standing override says, including when the
 * override says *nothing stands*.
 *
 * The regression this pins down: a teacher recording "not observed" (`level: null`) used to
 * fall through `??` back to the machine level, so the trail showed the teacher's withdrawal
 * and the summary next to it went on counting BOW's number. An explicit null is a reading,
 * not an absence of one.
 */

afterEach(cleanup);

const submission = buildSubmission({ seatCode: "9" });
const standing = judgementsOf(evidenceTrail(submission.log, competencyObservationsFor(submission)))
  .filter((judgement) => !judgement.superseded);
// Any requirement the machine placed among the strengths. Found rather than hard-coded, so
// a rebalanced grader cannot quietly turn this into a test of nothing.
const strength = standing.find((judgement) => judgement.level !== null && judgement.level >= 4)!;

function overridden(level: TeacherOverride["level"]): typeof submission {
  const override: TeacherOverride = {
    evidenceRequirementId: strength.evidenceRequirementId,
    level,
    note: "I watched this student, and the screen did not see what I saw.",
    at: 1_790_000_000_000,
  };
  return { ...submission, overrides: [override] };
}

describe("the student summary under an override", () => {
  it("has a machine strength to test with", () => {
    expect(strength).toBeDefined();
  });

  it("lists the machine reading when no override exists", () => {
    render(<StudentSummary submission={submission} />);
    expect(screen.getByText(strength.label)).toBeInTheDocument();
  });

  it("drops a requirement the teacher has set to not observed, rather than restoring BOW's level", () => {
    render(<StudentSummary submission={overridden(null)} />);
    expect(screen.queryByText(strength.label)).not.toBeInTheDocument();
    expect(screen.queryByText(`${strength.label} — after a hint`)).not.toBeInTheDocument();
  });

  it("moves a requirement to needs-support when the teacher's standing level says so", () => {
    render(<StudentSummary submission={overridden(0)} />);
    const item = screen.getByText(strength.label);
    expect(item.closest("ul")).toHaveAttribute("data-tone", "gap");
  });

  it("keeps the last override standing when there are several", () => {
    const second: TeacherOverride = {
      evidenceRequirementId: strength.evidenceRequirementId,
      level: null,
      note: "Looked again. The run never really asked this of them.",
      at: 1_790_000_100_000,
    };
    const doubled = { ...submission, overrides: [...(overridden(0).overrides ?? []), second] };
    render(<StudentSummary submission={doubled} />);
    expect(screen.queryByText(strength.label)).not.toBeInTheDocument();
  });
});

describe("the trail panel beside it", () => {
  it("shows both readings, so the summary's silence is explained one tab over", () => {
    render(<EvidenceTrailPanel submission={overridden(null)} onOverride={null} />);
    const row = screen.getAllByText(strength.label)[0]!.closest("li")!;
    expect(row.querySelector(".judgement__override")).not.toBeNull();
  });
});
