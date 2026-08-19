import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The two standalone documents, checked against the code they describe.
 *
 * Comments in `src/` are maintained. They sit next to the thing they explain, so the edit
 * that makes one false is the edit a reviewer is already reading. `ARCHITECTURE.md` and
 * `README.md` have no such luck: nothing about renaming a function opens them. A
 * fresh-context review found two things wrong in `ARCHITECTURE.md` — a guard called
 * `isResultState` that had been deleted while the doc still called it "what any surface
 * asks", and a count of objective-map states that said nine where the union has five. A new
 * engineer sent looking for a function that does not exist loses an hour and some of their
 * trust in the rest of the document, which is the more expensive half.
 *
 * So the check is narrow and mechanical: **every backticked thing in those two documents
 * that is shaped like a name has to exist somewhere in the repository.** It cannot tell
 * whether a sentence is true — the count of five is beyond it, and beyond anything short of
 * a parser — but a dead name is the form staleness usually takes, because the prose around
 * it stays plausible after the thing it names is gone.
 *
 * *Shaped like a name* is deliberately conservative, so that ordinary prose in backticks is
 * left alone: a path or a filename, an identifier with an internal capital or an
 * `ALL_CAPS_ONE`, or a kebab id like `too-few-assessed`. Single lowercase words are not
 * checked — `both`, `full` and `partial` are English here — and neither is anything with a
 * space in it, which is a type expression or a phrase rather than a name.
 *
 * **When this fails**, the name in the message is gone from the code. Fix the sentence
 * around it, do not delete the backticks: a claim about a thing that no longer exists is
 * usually a claim that has stopped being true, not a formatting problem.
 */

const DOCUMENTS = ["ARCHITECTURE.md", "README.md"];

/** Build output, review notes and reports. A name found only in one of these is not in the code. */
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", "dist-server", "coverage", "gauntlet", "playwright-report", "test-results"]);
const READABLE = /\.(?:ts|tsx|js|jsx|mjs|cjs|css|md|json|html|sh|ya?ml|txt)$/;

function repositoryFiles(directory = ".", found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    // A dot directory is somebody's tooling or somebody's scratch space, and a name that
    // only survives in one of those is exactly the dead name this is looking for.
    if (entry.startsWith(".") || SKIP_DIRECTORIES.has(entry)) continue;
    const path = directory === "." ? entry : `${directory}/${entry}`;
    if (statSync(path).isDirectory()) repositoryFiles(path, found);
    else found.push(path);
  }
  return found;
}

const FILES = repositoryFiles();

/**
 * The documents, and this file.
 *
 * This one is not vanity. The docstring above names `isResultState` to explain what it is
 * for, and while this file was in the corpus that mention was enough to vouch for it: the
 * scan read its own prose and reported the document clean. A scanner that can clear a name
 * by talking about it is not a scanner.
 */
const NOT_EVIDENCE = new Set([...DOCUMENTS, "src/docsTruth.test.ts"]);

const CORPUS = FILES
  .filter((path) => READABLE.test(path) && !NOT_EVIDENCE.has(path))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

/** A backticked span, with the decoration a document adds around a name taken back off. */
function namesIn(document: string): string[] {
  // Fenced blocks are worked examples and shell transcripts. They are allowed to name a
  // file that does not exist yet, because that is what an example is.
  const prose = readFileSync(document, "utf8").replace(/^```[\s\S]*?^```/gm, " ");
  const names = new Set<string>();
  for (const span of prose.matchAll(/`([^`\n]+)`/g)) {
    const raw = (span[1] ?? "").trim();
    if (/\s/.test(raw)) continue;
    const name = raw.replace(/\(\)$/, "").replace(/:\d+(?:-\d+)?$/, "");
    const looksLikePath = name.includes("/") || /\.(?:ts|tsx|css|md|json|sh|js|ya?ml)$/.test(name);
    const looksLikeIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
      && (/[a-z][A-Z]/.test(name) || /^[A-Z][a-z]/.test(name) || (/^[A-Z0-9_]+$/.test(name) && name.includes("_")));
    const looksLikeKebabId = /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(name);
    if (looksLikePath || looksLikeIdentifier || looksLikeKebabId) names.add(name);
  }
  return [...names];
}

describe("the standalone documents name things that exist", () => {
  for (const document of DOCUMENTS) {
    it(`has no dead reference in ${document}`, () => {
      const dead = namesIn(document).filter((name) => {
        // A leading slash is a route and a trailing one is a directory; both are written the
        // way a person says them rather than the way a path is stored.
        const needle = name.replace(/^\//, "").replace(/\/$/, "");
        return !FILES.some((path) => path.includes(needle)) && !CORPUS.includes(needle);
      });
      expect(dead, `named in ${document} and nowhere in the code`).toEqual([]);
    });
  }

  it("is looking at enough of the documents to be worth running", () => {
    // A regex that quietly stopped matching would leave this file green and useless. The
    // floor is well under today's count and well over nothing.
    for (const document of DOCUMENTS) expect(namesIn(document).length, document).toBeGreaterThan(10);
    expect(FILES.length).toBeGreaterThan(200);
  });
});
