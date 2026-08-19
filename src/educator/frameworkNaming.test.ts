import { sourceWithoutComments } from "../test/source";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FRAMEWORKS } from "../domain/standards";

/**
 * A New Jersey teacher must not read New York's acronym.
 *
 * Every teacher-facing string that names a framework, or names one of its parts, is composed
 * from `FrameworkLabels`. That is the whole reason the labels exist: `unitNoun`,
 * `groupNoun` and `frameworkShort` are what one state calls an objective, a topic and
 * itself, and a second state supplies its own without a component changing.
 *
 * This is a source scan rather than a render assertion because the failure it guards is a
 * literal somebody types in a hurry, and a literal is invisible to a test that only renders
 * the one framework that exists today.
 */

/** Where a framework name would actually reach a person. Domain data is where it belongs. */
function surfaceSources(): string[] {
  const roots = ["src/educator", "src/stages", "src/components", "src/app"];
  return roots.flatMap((root) =>
    readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((entry) => /\.tsx?$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx"))
      .map((entry) => `${root}/${entry}`),
  ).sort();
}

/** Comments are stripped: a comment explaining the rule is not a violation of it. */

/**
 * The files this rule does not reach, and why the one that is on the list is on it.
 *
 * `labels.ts` composes the words out of the framework's own labels. It is the file the rule
 * exists to route everything through, so it is the one place a name may appear.
 *
 * `EducatorPages.tsx` used to be here too, on the theory that its standards page rendered a
 * pre-framework model (`blueprint/standards.ts`) that predated `FrameworkLabels` and had no
 * framework behind it to compose from. That model is deleted; `AlignmentBlock` and
 * `StandardsView` now read `src/domain/standards/` and compose every name through
 * `labelsFor` the same as the real surfaces do, so the exemption is gone with it — this file
 * is what proves that stayed true rather than merely happening to be true today.
 *
 * The list is asserted below, so a new file cannot join it by accident.
 */
const EXEMPT = ["src/educator/labels.ts"];

const FRAMEWORK_NAMES = Object.values(FRAMEWORKS).flatMap((framework) => [
  framework.labels.frameworkShort,
  framework.name,
  framework.jurisdiction,
]);

describe("no teacher-facing string hardcodes a framework", () => {
  it("scans every surface a teacher can read, including any added since this was written", () => {
    const sources = surfaceSources();
    expect(sources).toContain("src/educator/ObjectivePages.tsx");
    expect(sources).toContain("src/educator/EducatorShell.tsx");
    expect(sources.length).toBeGreaterThan(10);
    // The exemption, pinned. A second one has to be argued for here rather than added
    // quietly to make a failing scan go green.
    expect(EXEMPT).toEqual(["src/educator/labels.ts"]);
    for (const path of EXEMPT) expect(sources).toContain(path);
  });

  it.each(surfaceSources().filter((path) => !EXEMPT.includes(path)))("does not name a framework in %s", (path) => {
    const source = sourceWithoutComments(path);
    for (const name of FRAMEWORK_NAMES) {
      // The framework *id* is data — a key into `FRAMEWORKS`, not a word anybody reads —
      // so it is allowed. What is not allowed is the acronym or the published name.
      expect(source, `${path} names ${name}`).not.toMatch(new RegExp(`["'\`>][^"'\`<]*\\b${name}\\b`));
    }
  });

  it("composes the words a teacher reads from the framework's own labels", () => {
    // The check above proves absence. This proves the labels are actually the source, so a
    // second framework changes the words rather than silently keeping New York's.
    const labels = FRAMEWORKS["nysed-pf-2026"].labels;
    expect(labels.unitNounShort).toBe("Objective");
    expect(labels.groupNoun).toBe("Topic");
    expect(labels.frameworkShort).toBe("NYSED");
    expect(labels.attribution.length).toBeGreaterThan(20);
  });
});
