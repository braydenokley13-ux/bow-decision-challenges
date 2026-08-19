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
 *   before it to the token after it.
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
}

export function withoutComments(source: string, options: StripOptions = {}): string {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return options.html ? stripped.replace(/<!--[\s\S]*?-->/g, " ") : stripped;
}

/** The same, for the callers that hold a path rather than a string. */
export function sourceWithoutComments(path: string, options: StripOptions = {}): string {
  return withoutComments(readFileSync(path, "utf8"), options);
}
