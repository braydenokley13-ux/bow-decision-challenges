import { readFileSync, readdirSync } from "node:fs";
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
function withoutComments(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * The files this rule does not reach, and why each one is on the list.
 *
 * - `labels.ts` composes the words out of the framework's own labels. It is the file the
 *   rule exists to route everything through, so it is the one place a name may appear.
 * - `EducatorPages.tsx` is the fixture surface, and its standards page renders the legacy
 *   five-objective alignment from `blueprint/standards.ts` — a pre-framework model that
 *   predates `FrameworkLabels` and names New York in its own data. It is not a real-class
 *   surface, and the Objective Map replaces it outright. Rewriting it to compose labels it
 *   has no framework behind would be dressing a fixture up as the thing that replaces it.
 *
 * The list is asserted below, so a new file cannot join it by accident.
 */
const EXEMPT = ["src/educator/labels.ts", "src/educator/EducatorPages.tsx"];

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
    // The exemptions, pinned. A third one has to be argued for here rather than added
    // quietly to make a failing scan go green.
    expect(EXEMPT).toEqual(["src/educator/labels.ts", "src/educator/EducatorPages.tsx"]);
    for (const path of EXEMPT) expect(sources).toContain(path);
  });

  it.each(surfaceSources().filter((path) => !EXEMPT.includes(path)))("does not name a framework in %s", (path) => {
    const source = withoutComments(path);
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
