// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { evidenceTrail, judgementsOf } from "../domain/competency/trail";
import type { TeacherOverride } from "../platform/classes/types";
import { buildSubmission } from "../test/runChallenge";
import { EvidenceTrailPanel, StudentSummary } from "./EvidenceTrailPanel";
import { competencyObservationsFor } from "./objectiveResults";
import { levelLabel } from "./labels";

/**
 * The summary reads a requirement the way the standing override says, including when the
 * override says *nothing stands*.
 *
 * The regression this pins down: a teacher recording "not observed" (`level: null`) used to
 * fall through `??` back to the machine level, so the trail showed the teacher's withdrawal
 * and the summary next to it went on counting BOW's number. An explicit null is a reading,
 * not an absence of one.
 *
 * The matchers below moved from `getByText(label)` to a row lookup, because every row on this
 * tab now carries its own Ladder-2 word beside the label — `Covers what is required first —
 * Right first time` in one element. The tab used to bucket the same fact under two headings
 * it invented for itself, *Needs support* and *Could do*: a seventh and eighth wording for a
 * thing the trail one tab away already said three ways, and "support" in a sense the rubric
 * uses for something else entirely. The headings now say what the two lists are *for* and the
 * level word comes from the one table.
 */

/** The row for one requirement, found by its label rather than by exact text. */
function rowFor(label: string): HTMLElement {
  const item = screen.queryAllByRole("listitem").find((entry) => entry.textContent?.includes(label));
  expect(item, `no row on this tab mentions “${label}”`).toBeDefined();
  return item!;
}

function hasRowFor(label: string): boolean {
  return screen.queryAllByRole("listitem").some((entry) => entry.textContent?.includes(label));
}

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

  it("lists the machine reading when no override exists, under its own level", () => {
    render(<StudentSummary submission={submission} />);
    // The level is the group heading rather than a word repeated on every chip: ten chips
    // each ending "— Right first time" is the same word ten times and the eye stops reading
    // it. What matters is that the level word is on the page and that this requirement sits
    // under the right one, which is what the enclosing block asserts.
    const block = rowFor(strength.label).closest("div");
    expect(block).toHaveTextContent(levelLabel(strength.level));
  });

  it("drops a requirement the teacher has set to not observed, rather than restoring BOW's level", () => {
    render(<StudentSummary submission={overridden(null)} />);
    // Both lists, and the third one that used to exist: "— after a hint" was an improvised
    // level word on a list of its own, and level 3 is now a row like any other carrying
    // Ladder 2's `Did it after a hint`.
    expect(hasRowFor(strength.label)).toBe(false);
  });

  it("moves a requirement to what-to-work-on when the teacher's standing level says so", () => {
    render(<StudentSummary submission={overridden(0)} />);
    const item = rowFor(strength.label);
    expect(item.closest("ul")).toHaveAttribute("data-tone", "gap");
    // And it says which level put it there, in the words the trail and the override control
    // both use. On this side the level is on the row, because these levels genuinely mix and
    // every row carries a paragraph of its own reason underneath.
    expect(item).toHaveTextContent(levelLabel(0));
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
    expect(hasRowFor(strength.label)).toBe(false);
  });
});

describe("the trail panel beside it", () => {
  it("shows both readings, so the summary's silence is explained one tab over", () => {
    render(<EvidenceTrailPanel submission={overridden(null)} onOverride={null} />);
    const row = screen.getAllByText(strength.label)[0]!.closest("li")!;
    expect(row.querySelector(".judgement__override")).not.toBeNull();
  });
});
