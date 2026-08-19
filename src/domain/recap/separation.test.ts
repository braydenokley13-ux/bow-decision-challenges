import { sourceWithoutComments, withoutComments } from "../../test/source";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The recap never touches the code that judges the student.
 *
 * `contracts.ts` states the rule this file enforces on the source rather than trusting it:
 *
 * > the bundle a student downloads must not contain the code that judges them, and the
 * > moment those two live in one module that guarantee is gone.
 *
 * The recap is the first thing in this product that reads an event log *and* renders to a
 * student, so it is the first place that guarantee could be lost by accident — one import of
 * `observeCompetencies` to "reuse the parsing" and a rubric level is one refactor away from a
 * twelve-year-old's screen. A source scan catches it; a behavioural test never would, because
 * importing the observer and not calling it behaves identically and ships identically.
 *
 * Type-only imports are allowed and are checked for: `import type` is erased at compile time,
 * so a shared shape costs nothing at runtime. A value import of the same module does not.
 */

function sourcesIn(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
    .map((entry) => `${directory}/${entry}`)
    .sort();
}

/** The recap, and the student screens that render it. */
const SOURCES = [
  ...sourcesIn("src/domain/recap"),
  "src/student/RunReport.tsx",
  "src/student/completedRun.ts",
];

/** Every module whose job is to decide how a student did. */
const JUDGEMENT = [
  "domain/competency",
  "domain/evidence/observe",
  "domain/evidence/grade",
  "domain/evidence/result",
  "domain/evidence/support",
  "domain/blueprint",
  "domain/scenario/contracts",
  "educator/",
  "worlds/basketball/observer",
  "worlds/food-truck/observer",
];

function importsIn(source: string): { module: string; typeOnly: boolean }[] {
  // The shared rule, rather than the local variant this used to hold — which stripped only
  // whole-line `//` comments and left a trailing one in place. On an import scan that is very
  // nearly harmless and exactly the kind of nearly that stops being true: `import { judge }
  // from "./x"; // not from ../scoring` would have been read as two imports, one of them
  // imaginary, and the imaginary one is in the layer this test exists to keep out.
  const stripped = withoutComments(source);
  return [...stripped.matchAll(/import\s+(type\s+)?[^"';]*from\s+["']([^"']+)["']/g)]
    .map((match) => ({ module: match[2]!, typeOnly: Boolean(match[1]) }));
}

describe("a recap can never become a judgement", () => {
  it("value-imports nothing from the layers that decide how a student did", () => {
    for (const path of SOURCES) {
      const source = readFileSync(path, "utf8");
      for (const entry of importsIn(source)) {
        if (entry.typeOnly) continue;
        for (const judgement of JUDGEMENT) {
          expect(entry.module.includes(judgement), `${path} imports ${entry.module}`).toBe(false);
        }
      }
    }
  });

  it("writes no rubric word anywhere in its own source", () => {
    for (const path of sourcesIn("src/domain/recap")) {
      const source = sourceWithoutComments(path);
      // The vocabulary of the assessment side, absent by construction from the student side.
      expect(source).not.toMatch(/RubricLevel|MasteryStatus|EvidenceRequirement|CompetencyResult|observeCompetencies|structuredPoints/);
    }
  });
});
