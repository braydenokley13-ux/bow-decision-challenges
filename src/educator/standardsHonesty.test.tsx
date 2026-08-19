// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { isAssessable, type FrameworkId } from "../domain/standards";
import { EducatorGuide } from "./EducatorPages";

/**
 * S1's regression guard: two live surfaces once disagreed about NYSED 1.2 — the guide
 * badged it "Primary" from a hard-coded table keyed by objective id, while
 * `/educator/objectives` correctly read `isAssessable` and reported it not yet assessable.
 * The guide derives its badge from `isAssessable` at render time rather than restating a
 * strength by hand, so this test renders the real component — not a copy of its logic — and
 * cross-checks every badge against the one function the product is allowed to base that
 * claim on. A future edit that reintroduces a hard-coded strength here fails rather than
 * ships.
 *
 * The second half of this guard used to be `StandardsView`, the demo's own standards page —
 * a second fixture surface making the same claim, which is exactly how two surfaces get to
 * disagree in the first place. The demo/real-class unification deleted it along with every
 * other bespoke demo component; `/educator/demo` now redirects its old `/standards` route to
 * `/educator/objectives`, the one real surface that speaks this claim, so there is no longer
 * a second copy of it to drift from this one.
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
});
