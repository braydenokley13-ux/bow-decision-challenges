import { sourceWithoutComments } from "../../test/source";
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
 * A world's **assessment edge** is the set of files that are *supposed* to know evidence
 * requirements exist — that is the whole of Checkpoint 2, and it is the direction the
 * one-way rule allows. Everything else in a world is Avery's season, and the competency
 * layer has no business in it: a scenario that imported competencies would make the story
 * depend on the measurement rather than the other way round.
 *
 * The edge is named rather than matched on a filename, so adding a file to it is a decision
 * somebody writes down here. Per world it is the observer, which maps what the world saw onto
 * evidence requirements, and the written-answer module, which does the same job for the half
 * of the evidence a person scores rather than the world.
 *
 * Run the Pop-Up adds two more: the table that says which of its moments are evidence about
 * which requirement, and its end of the coverage claim. Both are edge files by the same test —
 * they exist to state what this world produces, and they are the only files in it that name a
 * requirement. Its scenario, numbers, machine, ledger and balance harness name none, which is
 * the property this scan is actually protecting.
 */
const WORLD_ASSESSMENT_EDGE = [
  "src/domain/scenario/worlds/basketball/observer.ts",
  "src/domain/scenario/worlds/basketball/writtenDefense.ts",
  "src/domain/scenario/worlds/food-truck/observer.ts",
  "src/domain/scenario/worlds/food-truck/writtenAnswer.ts",
  "src/domain/scenario/worlds/food-truck/eventEvidence.ts",
  "src/domain/scenario/worlds/food-truck/coverage.ts",
];

const WORLD_STORY_SOURCES = WORLD_SOURCES.filter((path) => !WORLD_ASSESSMENT_EDGE.includes(path));

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
    expect(sourceWithoutComments(path)).not.toMatch(NAMES_A_STATE);
  });

  it.each(COMPETENCY_SOURCES)("keeps a bare objective code out of %s", (path) => {
    const found = sourceWithoutComments(path).match(BARE_OBJECTIVE_CODE);
    expect(found, `${path} carries objective codes ${String(found)}`).toBeNull();
  });

  it.each(COMPETENCY_SOURCES)("never imports the standards layer into %s", (path) => {
    const source = sourceWithoutComments(path);
    for (const [, specifier] of source.matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/standards/);
    }
  });

  it.each(CANONICAL_COMPETENCY_SOURCES)("keeps worlds out of the canonical competency definitions in %s", (path) => {
    // A competency does not know which worlds assess it. `availability.ts` holds that edge
    // on purpose and is deliberately excluded from this case.
    expect(sourceWithoutComments(path)).not.toMatch(/world/i);
  });

  it.each(STANDARDS_SOURCES)("keeps worlds out of %s", (path) => {
    // A framework describes a state's objectives. It has no idea any world exists, which is
    // what makes adding a second state a mapping file rather than a rebuild.
    const source = sourceWithoutComments(path);
    expect(source).not.toMatch(/worldId|WorldId/);
    for (const [, specifier] of source.matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/scenario|worlds/);
    }
  });

  it("addresses a standard as a framework plus a code, never as a bare string", () => {
    const types = readFileSync("src/domain/standards/types.ts", "utf8");
    expect(types).toContain("export interface StandardRef");
    const index = sourceWithoutComments("src/domain/standards/index.ts");
    // Every public lookup that takes a standard takes the framework with it. A signature
    // of `(code: string)` alone is the defect this asserts against.
    expect(index).toMatch(/standardByRef\(ref: StandardRef\)/);
    expect(index).toMatch(/mappingsForStandard\(ref: StandardRef\)/);
    expect(index).toMatch(/completionRuleFor\(ref: StandardRef\)/);
    expect(index).toMatch(/competenciesFor\(frameworkId: FrameworkId, code: string\)/);
  });

  it("scans every file in every world, including any added since this test was written", () => {
    expect(WORLD_SOURCES).toContain("src/domain/scenario/worlds/basketball/scenario.ts");
    expect(WORLD_SOURCES).toContain("src/domain/scenario/worlds/food-truck/scenario.ts");
    for (const path of WORLD_ASSESSMENT_EDGE) {
      expect(WORLD_SOURCES, `${path} is not in the scan`).toContain(path);
      expect(WORLD_STORY_SOURCES).not.toContain(path);
    }
    // A world's edge is small and it is argued for here rather than grown quietly to make a
    // failing scan go green. Basketball needs two files; Run the Pop-Up needs four, because it
    // states its own event tagging and its own coverage claim instead of leaving both in the
    // shared layer. Every other file in both worlds is story, and names no requirement at all.
    expect(WORLD_ASSESSMENT_EDGE.filter((path) => path.includes("/basketball/"))).toHaveLength(2);
    expect(WORLD_ASSESSMENT_EDGE.filter((path) => path.includes("/food-truck/"))).toHaveLength(4);
    expect(WORLD_ASSESSMENT_EDGE).toHaveLength(6);
  });

  it.each(WORLD_SOURCES)("keeps the standards layer out of %s", (path) => {
    // A world assesses competencies. It must never know that New York calls one of them
    // 1.3, or the world would have to change when New York renumbers.
    const source = sourceWithoutComments(path);
    expect(source, path).not.toMatch(NAMES_A_STATE);
    for (const [, specifier] of source.matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/standards/);
    }
  });

  it.each(WORLD_STORY_SOURCES)("keeps the competency layer out of the story in %s", (path) => {
    for (const [, specifier] of sourceWithoutComments(path).matchAll(IMPORTS)) {
      expect(specifier, `${path} imports ${String(specifier)}`).not.toMatch(/competency/);
    }
  });
});
