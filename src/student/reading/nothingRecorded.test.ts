import { withoutComments } from "../../test/source";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Read-aloud is not a support level, and this is the file that keeps it from becoming one.
 *
 * The evidence a student turns in says what they did with the money. A note beside it saying
 * they had the screen read to them would be read as part of that — by a teacher deciding what
 * a child can do, by a district comparing two classrooms, and eventually by whoever inherits
 * the export. It would also change the child's own calculus: a control that reports you for
 * using it is a control you do not use.
 *
 * So the rule is that nothing here can record anything, and the rule is checked rather than
 * promised. A scan is the right shape for it because the failure would arrive as an ordinary
 * helpful-looking import — `useChallenge` for the stage id, the transport for "just a count" —
 * and by the time it is on a teacher's screen it is in the data model.
 *
 * The preference itself lives in `localStorage`, on one key, and this holds that too: a second
 * key, or a write anywhere else, is how a device-local choice starts becoming a profile.
 */

const DIRECTORY = "src/student/reading";

function sources(): { path: string; text: string }[] {
  return readdirSync(DIRECTORY, { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .sort()
    .map((entry) => ({ path: `${DIRECTORY}/${entry}`, text: readFileSync(`${DIRECTORY}/${entry}`, "utf8") }));
}

/** What every module in here is allowed to reach for. Everything else is a new decision. */
const ALLOWED_IMPORTS = [
  /^react$/,
  // `react-dom`, for `createPortal` and nothing else. The opened panel docks to the bottom of
  // the window, and it is rendered at the end of the document so that the order it is tabbed to
  // matches the order it is read in. That is a renderer, not a transport: it can put an element
  // somewhere else on this page and it cannot put anything anywhere else at all.
  /^react-dom$/,
  /^\.\/[\w]+$/,
  /^\.\.\/\.\.\/design\/reading\.css$/,
  // One domain import, and it is the reading ruler: the voice and the word count have to
  // agree about what is on a screen. It is pure, and it carries no evidence of anything.
  /^\.\.\/\.\.\/domain\/scenario\/readability$/,
  // One primitive, and it is a focus hook: opening the tools removes the pill and closing them
  // removes the panel, and both were dropping focus on `<body>` — on the control a student
  // presses because they are having trouble with the screen. Named exactly rather than by its
  // directory, and the test below holds it to importing nothing but React, so this allowance
  // cannot widen into a door.
  /^\.\.\/\.\.\/components\/primitives\/useInPlaceArrival$/,
];

/** The one module outside this directory that is allowed in, and all it may reach for. */
const BORROWED = "src/components/primitives/useInPlaceArrival.ts";

describe("nothing about who used this goes anywhere", () => {
  it("imports nothing that could carry it off the device", () => {
    const strays: string[] = [];
    for (const { path, text } of sources()) {
      for (const match of text.matchAll(/^\s*import\s[^;]*?from\s*["']([^"']+)["']/gm)) {
        const specifier = match[1] ?? "";
        if (!ALLOWED_IMPORTS.some((allowed) => allowed.test(specifier))) strays.push(`${path} → ${specifier}`);
      }
    }
    expect(strays, "an import that could reach the evidence log, the class service or a teacher's screen").toEqual([]);
  });

  it("holds the one borrowed primitive to importing nothing but React", () => {
    // The allowance above is only as good as what it lets in. A focus hook that grew an import
    // of the challenge context would be a reading control that knows which stage a student is
    // on, which is the first half of a record of who used it.
    const borrowed = readFileSync(BORROWED, "utf8");
    const specifiers = [...borrowed.matchAll(/^\s*import\s[^;]*?from\s*["']([^"']+)["']/gm)].map((match) => match[1]);
    expect(specifiers, `what ${BORROWED} reaches for`).toEqual(["react"]);
  });

  it("makes no request of any kind", () => {
    const calls: string[] = [];
    for (const { path, text } of sources()) {
      for (const pattern of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/]) {
        if (pattern.test(text)) calls.push(`${path} → ${pattern.source}`);
      }
    }
    expect(calls).toEqual([]);
  });

  it("names no event, no log and no support level", () => {
    const leaks: string[] = [];
    for (const { path, text } of sources()) {
      // Comments are where the rule is explained, so they are allowed to name the thing.
      const code = withoutComments(text);
      for (const pattern of [/\bdispatch\b/, /\bevidence\b/i, /\bsubmission\b/i, /\bcheckpoint\b/i, /\bsupportLevel\b/, /\bobserve\b/]) {
        if (pattern.test(code)) leaks.push(`${path} → ${pattern.source}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("writes one key on this device and no other", () => {
    const keys = new Set<string>();
    for (const { text } of sources()) {
      for (const match of text.matchAll(/localStorage\.(?:setItem|getItem|removeItem)\(\s*([A-Za-z_$][\w$]*|"[^"]*")/g)) {
        keys.add(match[1] ?? "");
      }
    }
    expect([...keys]).toEqual(["KEY"]);
    expect(readFileSync(`${DIRECTORY}/preference.ts`, "utf8")).toContain('const KEY = "bow.reading.v1"');
  });
});
