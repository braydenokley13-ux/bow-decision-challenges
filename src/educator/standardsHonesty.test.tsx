// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { isAssessable, type FrameworkId } from "../domain/standards";
import { EducatorGuide, StandardsView } from "./EducatorPages";

/**
 * S1's regression guard: two live surfaces once disagreed about NYSED 1.2 — the guide
 * badged it "Primary" from a hard-coded table keyed by objective id, while
 * `/educator/objectives` correctly read `isAssessable` and reported it not yet assessable.
 * Both fixture surfaces now derive their badge from `isAssessable` at render time rather
 * than restating a strength by hand, so this test renders the real components — not a copy
 * of their logic — and cross-checks every badge against the one function the product is
 * allowed to base that claim on. A future edit that reintroduces a hard-coded strength, on
 * either surface, fails here rather than shipping.
 */

afterEach(cleanup);

const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";
const GUIDE_OBJECTIVE_CODES = ["1.1", "1.2", "1.3", "4.1", "5.1"];

function assessabilityBadges(container: HTMLElement): Map<string, boolean> {
  const found = new Map<string, boolean>();
  for (const article of container.querySelectorAll("[data-code]")) {
    const code = article.getAttribute("data-code")!;
    const badge = article.querySelector<HTMLElement>("[data-assessable]");
    expect(badge, `${code} has no assessability badge`).not.toBeNull();
    found.set(code, badge!.getAttribute("data-assessable") === "true");
  }
  return found;
}

describe("no fixture surface can state a coverage strength isAssessable does not support", () => {
  it("badges every objective on the educator guide exactly as isAssessable says, never stronger", () => {
    const { container } = render(<MemoryRouter><EducatorGuide /></MemoryRouter>);
    const badges = assessabilityBadges(container);
    expect(badges.size).toBe(GUIDE_OBJECTIVE_CODES.length);
    for (const code of GUIDE_OBJECTIVE_CODES) {
      expect(badges.get(code), `guide's ${code} badge`).toBe(isAssessable({ frameworkId: FRAMEWORK_ID, code }));
    }
    // The specific regression: 1.2 has no full mapping to an available competency, so it
    // must never read as ready — this is the exact claim that shipped wrong.
    expect(badges.get("1.2")).toBe(false);
  });

  it("badges every objective on the demo standards view exactly as isAssessable says, never stronger", () => {
    const { container } = render(<MemoryRouter><StandardsView /></MemoryRouter>);
    const badges = assessabilityBadges(container);
    expect(badges.size).toBe(GUIDE_OBJECTIVE_CODES.length);
    for (const code of GUIDE_OBJECTIVE_CODES) {
      expect(badges.get(code), `standards view's ${code} badge`).toBe(isAssessable({ frameworkId: FRAMEWORK_ID, code }));
    }
    expect(badges.get("1.2")).toBe(false);
  });

  it("never prints a per-skill coverage word the mapping table did not actually assert", () => {
    // The demo's skill chips carry `data-coverage`; every one of them has to be a real
    // `Coverage` value, because these used to be micro-skill labels with no coverage
    // strength attached to them at all — a chip with no value here is exactly the silent
    // downgrade of a real claim into an unlabelled one.
    const { container } = render(<MemoryRouter><StandardsView /></MemoryRouter>);
    const chips = [...container.querySelectorAll<HTMLElement>("[data-coverage]")];
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(["full", "partial", "supporting"]).toContain(chip.getAttribute("data-coverage"));
    }
  });
});
