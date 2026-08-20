// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ObjectiveStanding } from "./ObjectiveStanding";
import type { CompetencyResult, CompetencyId, CompetencyResultState } from "../domain/competency/types";
import { completionRuleFor, FRAMEWORKS } from "../domain/standards";

/**
 * The card that joins one student's evidence to the objective their teacher assigned.
 *
 * Two of these tests are about what it must never say. A card reporting a child against a
 * state standard is the single most quotable surface in the product — it is what gets
 * screenshotted into a district deck — so the assertions that matter most are the negative
 * ones.
 */

function draw(objectiveRef: { frameworkId: "nysed-pf-2026"; code: string } | null, results: CompetencyResult[]) {
  return render(
    <MemoryRouter>
      <ObjectiveStanding objectiveRef={objectiveRef} results={results} />
    </MemoryRouter>,
  );
}

function result(competencyId: CompetencyId, state: CompetencyResultState): CompetencyResult {
  return { competencyId, state, requirements: [] } as unknown as CompetencyResult;
}

const BUDGET = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;

// This config does not set `globals`, so Testing Library's automatic cleanup never
// registers and every render accumulates in the same document. Without this, the second
// test to draw the same state fails on "found multiple elements" — which reads as a
// component defect and is a harness one.
afterEach(cleanup);

describe("where a student's evidence leaves the assigned objective", () => {
  it("says nothing at all for an assignment made before there was an objective to choose", () => {
    // §17.3: most stored assignments carry `null`. Printing a code here would manufacture a
    // selection nobody made.
    const { container } = draw(null, []);
    expect(container.textContent).toBe("");
  });

  it("prints the state's own sentence, not BOW's handle for it", () => {
    draw(BUDGET, []);
    expect(screen.getByText("1.3")).toBeInTheDocument();
    // `Standard.text` is the official sentence verbatim; `shortLabel` is BOW's scanning
    // handle and the type says it is never a substitute.
    expect(screen.getByText(/budget/i)).toBeInTheDocument();
  });

  it("reads Demonstrated when the competency mapped full to it was shown", () => {
    draw(BUDGET, [result("plan-within-income", "demonstrated")]);
    expect(screen.getByText("Demonstrated")).toBeInTheDocument();
  });

  it("counts a demonstration made with support as a demonstration", () => {
    // The support is recorded on the requirement. The state above it is the product's own
    // judgement that the skill was shown, and this card may not silently re-judge it.
    draw(BUDGET, [result("plan-within-income", "demonstrated-with-support")]);
    expect(screen.getByText("Demonstrated")).toBeInTheDocument();
  });

  it("reads Nothing yet when no mapped competency was demonstrated", () => {
    draw(BUDGET, [result("plan-within-income", "not-yet-demonstrated")]);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("never lets a partly-met bundled objective read as met, and names what is missing", () => {
    // The state that has to survive a hurried reader. A bundled objective with some of its
    // parts is not the objective.
    const bundled = { frameworkId: "nysed-pf-2026", code: "2.1" } as const;
    const rule = completionRuleFor(bundled);
    expect(rule, "2.1 is expected to carry a completion rule").toBeDefined();
    const [first] = rule!.requires;

    draw(bundled, [result(first!, "demonstrated")]);
    expect(screen.getByText("Partly")).toBeInTheDocument();
    expect(screen.queryByText("Demonstrated")).not.toBeInTheDocument();
    expect(screen.getByText("Still needs")).toBeInTheDocument();
  });

  it("shows no percentage, no score and no composite, in any state", () => {
    // The reference mockup puts `78% Proficient` and `38 / 50` on this exact card. A
    // composite is what this product's release gate treats as disqualifying, and an
    // objective is not a proportion of itself.
    for (const state of ["demonstrated", "not-yet-demonstrated", "developing"] as const) {
      const { container, unmount } = draw(BUDGET, [result("plan-within-income", state)]);
      const text = container.textContent ?? "";
      expect(text, `a percentage reached the card in state ${state}`).not.toMatch(/\d+\s*%/);
      expect(text, `a score out of something reached the card in state ${state}`).not.toMatch(/\d+\s*\/\s*\d+/);
      expect(text.toLowerCase(), `a grade word reached the card in state ${state}`).not.toMatch(/proficient|points|score/);
      unmount();
    }
  });

  it("carries the attribution a district reading it out of context needs", () => {
    draw(BUDGET, [result("plan-within-income", "demonstrated")]);
    // Composed from the framework, never typed into this layer — a second framework's
    // disclaimer says something different, and the build fails on a hardcoded one.
    const said = FRAMEWORKS["nysed-pf-2026"]?.labels.attribution ?? "";
    expect(said.length).toBeGreaterThan(10);
    expect(screen.getByText(said)).toBeInTheDocument();
  });
});
