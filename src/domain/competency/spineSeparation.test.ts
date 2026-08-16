import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The one-way rule, enforced on the source rather than trusted.
 *
 * > Competencies never reference frameworks. Frameworks never reference worlds. A world
 * > never references an objective. Everything is joined through the mapping table, which is
 * > the only file that changes when a state is added.
 *
 * This is a source scan for the same reason `pricing.test.ts` is: the drift it catches is
 * invisible to a behavioural test. A `"1.3"` written into the competency layer works
 * perfectly, passes every test, and costs a migration of already-stored student evidence
 * the first time NYSED renumbers or a second state appears — because a bare `"1.3"` is
 * ambiguous the moment New Jersey has one too.
 *
 * Comments are stripped before scanning. A comment explaining the boundary is not a
 * violation of it; a string literal or an identifier is.
 */

/** Where a competency and its evidence requirements are actually defined. */
const CANONICAL_COMPETENCY_SOURCES = [
  "src/domain/competency/types.ts",
  "src/domain/competency/competencies.ts",
];

/**
 * `availability.ts` is the deliberate exception on worlds and only on worlds. §4.5 makes a
 * competency's availability depend on whether a world can produce its evidence, so the
 * edge has to exist somewhere; it is confined to that one file — plus `index.ts`, which
 * re-exports it as the layer's public surface — and neither may name a state.
 */
const COMPETENCY_SOURCES = [
  ...CANONICAL_COMPETENCY_SOURCES,
  "src/domain/competency/availability.ts",
  "src/domain/competency/index.ts",
];

const STANDARDS_SOURCES = [
  "src/domain/standards/types.ts",
  "src/domain/standards/index.ts",
  "src/domain/standards/frameworks/nysed-2026.ts",
  "src/domain/standards/mappings/nysed-2026.ts",
];

/** `//` is only a comment when it is not the `//` in a URL. */
function withoutComments(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** A framework code like `1.3`, but not the `1.0` inside a version string like `1.0.0`. */
const BARE_OBJECTIVE_CODE = /(?<![\w.])[1-5]\.\d(?![\d.])/g;
const NAMES_A_STATE = /nysed|new york|nysld|\bNY\b/i;
const IMPORTS = /from\s+"([^"]+)"/g;

describe("the spine stays separated", () => {
  it.each(COMPETENCY_SOURCES)("keeps a state's name out of %s", (path) => {
    expect(withoutComments(path)).not.toMatch(NAMES_A_STATE);
  });

  it.each(COMPETENCY_SOURCES)("keeps a bare objective code out of %s", (path) => {
    const found = withoutComments(path).match(BARE_OBJECTIVE_CODE);
    expect(found, `${path} carries objective codes ${String(found)}`).toBeNull();
  });

  it.each(COMPETENCY_SOURCES)("never imports the standards layer into %s", (path) => {
    const source = withoutComments(path);
    for (const [, specifier] of source.matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/standards/);
    }
  });

  it.each(CANONICAL_COMPETENCY_SOURCES)("keeps worlds out of the canonical competency definitions in %s", (path) => {
    // A competency does not know which worlds assess it. `availability.ts` holds that edge
    // on purpose and is deliberately excluded from this case.
    expect(withoutComments(path)).not.toMatch(/world/i);
  });

  it.each(STANDARDS_SOURCES)("keeps worlds out of %s", (path) => {
    // A framework describes a state's objectives. It has no idea any world exists, which is
    // what makes adding a second state a mapping file rather than a rebuild.
    const source = withoutComments(path);
    expect(source).not.toMatch(/worldId|WorldId/);
    for (const [, specifier] of source.matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/scenario|worlds/);
    }
  });

  it("addresses a standard as a framework plus a code, never as a bare string", () => {
    const types = readFileSync("src/domain/standards/types.ts", "utf8");
    expect(types).toContain("export interface StandardRef");
    const index = withoutComments("src/domain/standards/index.ts");
    // Every public lookup that takes a standard takes the framework with it. A signature
    // of `(code: string)` alone is the defect this asserts against.
    expect(index).toMatch(/standardByRef\(ref: StandardRef\)/);
    expect(index).toMatch(/mappingsForStandard\(ref: StandardRef\)/);
    expect(index).toMatch(/completionRuleFor\(ref: StandardRef\)/);
    expect(index).toMatch(/competenciesFor\(frameworkId: FrameworkId, code: string\)/);
  });

  it("keeps the standards layer out of every world", () => {
    // A world assesses competencies. It must never know that New York calls one of them
    // 1.3, or the world would have to change when New York renumbers.
    for (const path of ["src/domain/scenario/worlds/basketball.ts", "src/domain/scenario/registry.ts", "src/domain/scenario/types.ts"]) {
      const source = withoutComments(path);
      expect(source, path).not.toMatch(NAMES_A_STATE);
      for (const [, specifier] of source.matchAll(IMPORTS)) {
        expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/standards|competency/);
      }
    }
  });
});
