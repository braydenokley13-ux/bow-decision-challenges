import { readFileSync, readdirSync } from "node:fs";
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

/**
 * Read from disk rather than listed by hand.
 *
 * A hand-maintained list rots in the one direction that matters: the next file added to
 * the competency layer is the file nobody remembers to add to the list, and it is
 * unscanned from the moment it exists. Globbing means a new module is covered by default
 * and someone has to deliberately exclude it.
 */
function sourcesIn(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
    .map((entry) => `${directory}/${entry}`)
    .sort();
}

const COMPETENCY_SOURCES = sourcesIn("src/domain/competency");
const STANDARDS_SOURCES = sourcesIn("src/domain/standards");

/** Every module inside a world, plus the two shared files that describe worlds generally. */
const WORLD_SOURCES = [
  ...sourcesIn("src/domain/scenario/worlds"),
  "src/domain/scenario/registry.ts",
  "src/domain/scenario/types.ts",
];

/**
 * A world's story, as opposed to its assessment edge.
 *
 * A world's observer is the one file that is *supposed* to know evidence requirements
 * exist — that is the whole of Checkpoint 2, and it is the direction the one-way rule
 * allows. Everything else in a world is Avery's season, and the competency layer has no
 * business in it: a scenario that imported competencies would make the story depend on the
 * measurement rather than the other way round.
 */
const WORLD_STORY_SOURCES = WORLD_SOURCES.filter((path) => !path.endsWith("observer.ts"));

/**
 * Where a competency and its evidence requirements are actually defined.
 *
 * `availability.ts` is the deliberate exception on worlds and only on worlds: §4.5 makes a
 * competency's availability depend on whether a world can produce its evidence, so the
 * edge has to exist somewhere. It is confined to that one file, plus `index.ts` which
 * re-exports it as the layer's public surface, and neither may name a state.
 */
const CANONICAL_COMPETENCY_SOURCES = COMPETENCY_SOURCES.filter(
  (path) => !path.endsWith("availability.ts") && !path.endsWith("index.ts"),
);

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
  it("scans every module in both layers, including any added since this test was written", () => {
    // The assertion that stops the glob quietly matching nothing.
    expect(COMPETENCY_SOURCES).toContain("src/domain/competency/competencies.ts");
    expect(COMPETENCY_SOURCES.length).toBeGreaterThanOrEqual(4);
    expect(STANDARDS_SOURCES).toContain("src/domain/standards/frameworks/nysed-2026.ts");
    expect(STANDARDS_SOURCES.length).toBeGreaterThanOrEqual(4);
    expect(CANONICAL_COMPETENCY_SOURCES.length).toBeGreaterThanOrEqual(2);
  });

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

  it("scans every file in every world, including any added since this test was written", () => {
    expect(WORLD_SOURCES).toContain("src/domain/scenario/worlds/basketball/scenario.ts");
    expect(WORLD_SOURCES).toContain("src/domain/scenario/worlds/basketball/observer.ts");
    expect(WORLD_STORY_SOURCES).not.toContain("src/domain/scenario/worlds/basketball/observer.ts");
  });

  it.each(WORLD_SOURCES)("keeps the standards layer out of %s", (path) => {
    // A world assesses competencies. It must never know that New York calls one of them
    // 1.3, or the world would have to change when New York renumbers.
    const source = withoutComments(path);
    expect(source, path).not.toMatch(NAMES_A_STATE);
    for (const [, specifier] of source.matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/standards/);
    }
  });

  it.each(WORLD_STORY_SOURCES)("keeps the competency layer out of the story in %s", (path) => {
    for (const [, specifier] of withoutComments(path).matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/competency/);
    }
  });
});
