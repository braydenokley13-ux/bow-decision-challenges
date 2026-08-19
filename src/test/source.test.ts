import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceWithoutComments, withoutComments } from "./source";

/**
 * The function that decides what every drift detector in this repository can see.
 *
 * Ten copies of it had accumulated, in three behaviours wearing one name — an engineering
 * review found them. Copies of a rule are not a style problem when the rule is *what counts as
 * a comment*: a scan that strips differently from the scan beside it is enforcing a different
 * rule, and neither of them says which.
 *
 * It had no test of its own anywhere, in any copy. So these are the cases the callers actually
 * depend on, stated once, where a change to the rule has to come and argue with them.
 */

describe("what a comment is", () => {
  it("takes out a block comment, and leaves a space where it was", () => {
    // A space rather than nothing, so removing a comment cannot weld its neighbours together.
    expect(withoutComments("const a =/* thinking */1;")).toBe("const a = 1;");
  });

  it("takes out a line comment to the end of its line and no further", () => {
    expect(withoutComments("keep me // drop me\nkeep me too")).toBe("keep me \nkeep me too");
  });

  /**
   * The exception the whole rule turns on. Every one of these scans reads product source full
   * of URLs, and a stripper that ate the rest of the line at each one would be blind past it —
   * silently, and in the direction that makes a test pass.
   */
  it("does not mistake a URL for a comment", () => {
    expect(withoutComments('const site = "https://example.org/thing";'))
      .toContain("https://example.org/thing");
  });

  it("takes out a comment that quotes the thing it warns about", () => {
    // The failure this function exists for: three people in one evening tripped a drift
    // detector with a comment explaining the very rule it enforces.
    const source = '// never write "seat 17" on a screen\nconst copy = "your card";';
    expect(withoutComments(source)).not.toContain("seat 17");
    expect(withoutComments(source)).toContain("your card");
  });

  it("leaves HTML comments alone unless asked", () => {
    const html = "<p>real</p><!-- Grades 6-8 -->";
    expect(withoutComments(html)).toContain("Grades 6-8");
    expect(withoutComments(html, { html: true })).not.toContain("Grades 6-8");
  });

  it("reads a file when given a path", () => {
    const own = sourceWithoutComments(join(__dirname, "source.ts"));
    expect(own).toContain("export function withoutComments");
    // Its own long explanation is a block comment, so it strips itself.
    expect(own).not.toContain("Ten copies of that stripper had accumulated");
  });

  /**
   * The documented limit, asserted rather than claimed. This is not a parser and does not know
   * a string literal from code — which is safe here only because no string in this codebase
   * contains `//` outside a URL. If one ever does, this fails and somebody has to decide.
   */
  it("has no string in the product it would damage", () => {
    const suspects: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) { walk(path); continue; }
        if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
        for (const [, quoted] of readFileSync(path, "utf8").matchAll(/"([^"\n]*\/\/[^"\n]*)"/g)) {
          if (quoted && !/:\/\//.test(quoted)) suspects.push(`${path}: ${quoted}`);
        }
      }
    };
    walk(join(__dirname, ".."));
    expect(suspects, "a string holding // that is not a URL — the one case this stripper eats").toEqual([]);
  });
});

describe("the rule is written once", () => {
  /**
   * The copies came back once already, so this is the test that stops it. A scan that defines
   * its own stripper is a scan enforcing its own private idea of what a comment is, and the
   * whole point of these tests is that they agree.
   */
  it("has no second definition of a comment stripper", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) { walk(path); continue; }
        if (!/\.tsx?$/.test(name)) continue;
        if (path.endsWith(join("test", "source.ts"))) continue;
        const text = readFileSync(path, "utf8");
        if (/(function|const)\s+\w*[wW]ithoutComments\s*[=(]/.test(text)) offenders.push(path);
        else if (/\/\\\*\[\\s\\S\]\*\?\\\*\\\//.test(text)) offenders.push(path);
      }
    };
    walk(join(__dirname, ".."));
    expect(offenders, "define it in src/test/source.ts and import it, so every scan sees the same file").toEqual([]);
  });
});
