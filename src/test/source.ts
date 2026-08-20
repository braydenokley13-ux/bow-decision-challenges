import { readFileSync } from "node:fs";

/**
 * What a source file says, with the parts nobody reads on screen taken out.
 *
 * A dozen tests in this repository are drift detectors: they read product source from disk and
 * assert something about the words in it — that no screen names a seat number, that every term
 * a student meets is in the glossary, that the educator guide does not claim the run is silent,
 * that a competency file never imports a state framework. They are the strongest tests here,
 * because they fail when somebody writes the wrong sentence rather than when somebody breaks a
 * function.
 *
 * All of them have to strip comments first, or every one of them fails the moment a comment
 * quotes the thing it is warning about — which happened three times in one evening, each time
 * to a different person, each time on a comment explaining the very rule being enforced.
 *
 * Ten copies of that stripper had accumulated, in three behaviours wearing one name: most took
 * a string, three took a path, one also stripped HTML comments because it reads Markdown, and
 * one stripped only whole-line `//` comments and left trailing ones in place. An engineering
 * review put the problem exactly: this function decides what every boundary scan in the
 * repository is able to see. Ten of them cannot each decide it differently and still mean
 * anything together.
 *
 * The rule, stated once:
 *
 * - `/* ... *\/` blocks become a single space, so removing one cannot silently weld the token
 *   before it to the token after it — or, with `lines`, the newlines they contained, for a
 *   scan that prints the coordinate of what it found.
 * - `// ...` runs to end of line — **unless the slashes are preceded by a colon**, which is
 *   `https://`, and a scan that ate the rest of the line at every URL would be blind past it.
 * - `<!-- ... -->` only when asked, because it is Markdown syntax and stripping it from
 *   TypeScript is a rule that has nothing to enforce.
 *
 * What it deliberately does not do is understand string literals. A stripper that did would be
 * a parser, and every caller here is asking "what words are in this file", not "what does this
 * file evaluate to". The one place that distinction would matter — a string containing `//`
 * that is not a URL — does not exist in this codebase, and a test proves it.
 */
export interface StripOptions {
  /** Also remove HTML comments. For Markdown; off by default, where it would mean nothing. */
  html?: boolean;
  /**
   * Keep the newlines that were inside a stripped comment, so line *n* of the result is
   * line *n* of the file.
   *
   * Off by default because most callers ask "what words are in this file" and a block
   * comment collapsing to a space is the cheapest answer. On for the scans that report a
   * coordinate: `pricing.test.ts` prints `line 103: …` next to every price it objects to,
   * and after a 90-line file header that number was pointing a reader at the wrong line —
   * which is the same class of defect as the offence it was reporting, on the other side of
   * the message. A scan may not be more precise than its own coordinates.
   */
  lines?: boolean;
}

export function withoutComments(source: string, options: StripOptions = {}): string {
  const blank = (match: string): string =>
    options.lines === true ? match.replace(/[^\n]/g, "") || " " : " ";
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return options.html ? stripped.replace(/<!--[\s\S]*?-->/g, blank) : stripped;
}

/**
 * The other half of the same rule: the comments on their own, for the one scan that reads them.
 *
 * `withoutComments` exists because a scan that reads comments fails on its own explanation.
 * This exists because two of this product's false claims about what it holds of a child were
 * *only* in comments — `classes/types.ts` and `identity/types.ts` both opened by denying the
 * roster — and a file head is what the next engineer believes. No scan in the repository could
 * reach either.
 *
 * It lives here rather than in its caller for the reason stated above and enforced by
 * `source.test.ts`: a scan that defines its own idea of where a comment starts is a scan
 * enforcing a private one, and the extractor and the stripper have to be the same idea seen
 * from two sides or the pair covers less than either claims. Same three rules, same colon
 * exemption for `https://`.
 *
 * The caller is `src/platform/dataClaims.sweep.test.ts`, and it defuses the landmine the
 * stripper exists for by exempting *quoted* claims rather than all comments: to write the
 * retired sentence down you mark it as a quotation, which is what makes it safe to write down.
 */
export function commentsOnly(source: string): string {
  const found: string[] = [];
  for (const block of source.matchAll(/\/\*[\s\S]*?\*\//g)) found.push(block[0]);
  for (const line of source.matchAll(/(^|[^:])(\/\/[^\n]*)/g)) found.push(line[2] ?? "");
  return found.join("\n");
}

/** The same, for the callers that hold a path rather than a string. */
export function sourceWithoutComments(path: string, options: StripOptions = {}): string {
  return withoutComments(readFileSync(path, "utf8"), options);
}
