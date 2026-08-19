// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { countRenderedWords, screenTextOf } from "../domain/scenario/readability";
import { EducatorGuide } from "./EducatorPages";

/**
 * The guide told teachers the run makes no sound. The run speaks out loud.
 *
 * "20–28 minutes for most students. One sitting, one device, **no sound**." was the whole of
 * what any educator surface said about audio, and it was false the day `ReadingTools` shipped:
 * a student can press *Read this screen* on every screen of both stories and hear it, through
 * `window.speechSynthesis`. Nothing else on any teacher's screen mentioned reading help,
 * headphones or the word list — so the one thing the product told a teacher about its own
 * accommodation was that it did not exist.
 *
 * That is a copy defect that costs a specific child. A teacher plans the lesson off this
 * block, books a lab with no headphones on the strength of one clause, and the students who
 * need the voice are the ones the room fails.
 *
 * A drift detector is the right shape for it because the sentence was not written wrong — it
 * went wrong underneath, when a feature landed in `src/student/` and no one re-read
 * `src/educator/`. So each half is pinned to the other: the claim scan below fails if any
 * teacher surface says the run is silent, and the fixture assertions fail if read-aloud stops
 * being a thing the product does, which is the moment this guide's new row would start lying
 * in the other direction.
 *
 * **Every clause of the new row is checked against the thing that makes it true.**
 *
 * | The guide says | What makes it true |
 * | --- | --- |
 * | *press Reading help to hear the screen read out loud* | the pill and the button `ReadingTools` renders |
 * | *or to look up a word on it* | `GlossaryPanel`, opened by the same panel |
 * | *You turn nothing on* | no educator surface imports the reading tools; there is nothing to grant |
 * | *it stays on the device* | the directory makes no request of any kind |
 * | *who used it is never recorded* | it reaches no evidence, no transport, no context |
 * | *Nothing is translated* | one document language, `en`, and no translation anywhere |
 *
 * `nothingRecorded.test.ts` holds the last three from inside `src/student/reading` as rules
 * about that directory. They are re-checked here as claims a *teacher* has been given, which
 * is a different failure: the day one of them stops being true, somebody has to know that a
 * sentence on the educator guide has to change too.
 */

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1. No teacher surface may say the run is silent
// ---------------------------------------------------------------------------

/** Files a teacher reads sentences out of — every educator source, and any added since. */
function teacherSources(): string[] {
  const educator = readdirSync("src/educator", { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/educator/${entry}`);
  return [...educator, "src/App.tsx"].sort();
}

/** Comments are not read by anybody in a classroom. The `[^:]` guard protects `https://`. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Ways of promising a teacher there is nothing to hear.
 *
 * Claims, not the word *sound*: a future row that says "headphones are shared, so plan for a
 * quiet room" is the guide doing its job and must not fail this. What is banned is a surface
 * telling a teacher the run needs no audio provision — which is the only thing "no sound" was
 * ever read as, and the thing that empties a lab of headphones.
 */
const SILENCE_CLAIMS: readonly RegExp[] = [
  /\bno sound\b/i,
  /\bno audio\b/i,
  /\bwithout (?:sound|audio)\b/i,
  /\bsound[- ]free\b/i,
  /\bno (?:head)?phones\b/i,
  /\bnothing to listen to\b/i,
  /\bmakes no (?:sound|noise)\b/i,
  /\b(?:is|runs) silent\b/i,
  /\bnever speaks\b/i,
];

function silenceClaimsIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  const found: string[] = [];
  for (const claim of SILENCE_CLAIMS) {
    const match = claim.exec(source);
    if (!match) continue;
    // The sentence as a teacher would read it: the tags around it are not the offence.
    const line = source.slice(0, match.index).split("\n").length;
    const text = (source.split("\n")[line - 1] ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    found.push(`${path} — ${text.slice(0, 120)}`);
  }
  return found;
}

describe("no teacher surface tells a teacher the run makes no sound", () => {
  it("scans every educator surface, including any added since this was written", () => {
    const sources = teacherSources();
    expect(sources).toContain("src/educator/EducatorPages.tsx");
    expect(sources).toContain("src/App.tsx");
    expect(sources.length).toBeGreaterThan(15);
  });

  it("catches the exact sentence that shipped, rather than passing because it reads nothing", () => {
    const shipped = "<dd><b>{durationLabel(PLAN_UNDER_PRESSURE)}</b> for most students. One sitting, one device, no sound.</dd>";
    expect(SILENCE_CLAIMS.some((claim) => claim.test(shipped))).toBe(true);
    // And it does not fire on the row that replaced it, or the guide could not say the true thing.
    const replacement = "Yes, or a quiet room. Any student can press Reading help to hear the screen read out loud.";
    expect(SILENCE_CLAIMS.filter((claim) => claim.test(replacement))).toEqual([]);
  });

  it("finds no such claim on any surface a teacher plans from", () => {
    expect(
      teacherSources().flatMap(silenceClaimsIn),
      "a teacher surface promises there is nothing to hear. The product reads the screen out "
      + "loud on every screen of both stories, and a teacher who believes this books a lab "
      + "with no headphones",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. The product still does the thing the guide now describes
// ---------------------------------------------------------------------------

const READING_DIRECTORY = "src/student/reading";

function readingSources(): { path: string; text: string }[] {
  return readdirSync(READING_DIRECTORY, { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .sort()
    .map((entry) => ({ path: `${READING_DIRECTORY}/${entry}`, text: readFileSync(`${READING_DIRECTORY}/${entry}`, "utf8") }));
}

describe("the reading help the guide describes is the reading help students meet", () => {
  it("still offers a voice and a word list, under the names the guide uses", () => {
    const tools = readFileSync(`${READING_DIRECTORY}/ReadingTools.tsx`, "utf8");
    // The guide tells a teacher to expect a control called "Reading help". If that name
    // changes, a teacher is looking for something the screen no longer says.
    expect(tools).toContain("Reading help");
    expect(tools).toContain("Read this screen");
    expect(tools, "the word list the guide calls looking a word up").toContain("GlossaryPanel");
    // And the voice is a real one, which is why the headphones sentence exists at all.
    expect(readFileSync(`${READING_DIRECTORY}/readAloud.ts`, "utf8")).toContain("new SpeechSynthesisUtterance(text)");
  });

  it("is the student's own to turn on: no teacher surface can reach it", () => {
    const grants: string[] = [];
    for (const path of teacherSources()) {
      const source = withoutComments(readFileSync(path, "utf8"));
      for (const match of source.matchAll(/^\s*import\s[^;]*?from\s*["']([^"']+)["']/gm)) {
        if (/student\/reading/.test(match[1] ?? "")) grants.push(`${path} → ${match[1]}`);
      }
    }
    expect(
      grants,
      "an educator surface reaches into the reading tools. The guide says 'You turn nothing "
      + "on' — a teacher control over a child's accommodation makes that false",
    ).toEqual([]);
  });

  it("stays on the device and reaches no evidence, so using it cannot count against a student", () => {
    const leaks: string[] = [];
    for (const { path, text } of readingSources()) {
      // Comments are where the rule is explained, so they are allowed to name the thing.
      const code = withoutComments(text);
      for (const pattern of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/]) {
        if (pattern.test(code)) leaks.push(`${path} → ${pattern.source}`);
      }
      for (const match of code.matchAll(/^\s*import\s[^;]*?from\s*["']([^"']+)["']/gm)) {
        const specifier = match[1] ?? "";
        if (/evidence|transport|Context|educator|session/i.test(specifier)) leaks.push(`${path} → ${specifier}`);
      }
    }
    expect(
      leaks,
      "the reading tools now carry something off the device. The guide tells a teacher 'it "
      + "stays on the device, and who used it is never recorded' — and that a child cannot be "
      + "marked down for pressing it",
    ).toEqual([]);
  });

  it("is English, in one language, with nothing that translates", () => {
    // The voice speaks the document's language and the document declares one.
    expect(readFileSync("index.html", "utf8")).toMatch(/<html lang="en">/);
    expect(readFileSync(`${READING_DIRECTORY}/readAloud.ts`, "utf8"))
      .toContain('utterance.lang = document.documentElement.lang || "en"');
    const translating = readingSources()
      .filter(({ text }) => /\btranslat/i.test(withoutComments(text)))
      .map(({ path }) => path);
    expect(
      translating,
      "something here translates. The guide tells a teacher with students new to English that "
      + "nothing is translated, so that they plan for it rather than discover it in the room",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. What the guide actually says
// ---------------------------------------------------------------------------

function guideText(): string {
  const { container } = render(<MemoryRouter><EducatorGuide /></MemoryRouter>);
  return screenTextOf(container).chunks.join(" ").replace(/\s+/g, " ");
}

describe("the educator guide answers the questions a lesson is planned on", () => {
  it("tells a teacher the run makes sound and what the room needs", () => {
    const text = guideText();
    expect(text, "the row a teacher scans for the audio answer").toMatch(/headphones/i);
    expect(text, "the alternative for a room that has none").toMatch(/quiet room/i);
    expect(text, "what the sound is").toMatch(/read out loud/i);
  });

  it("tells a teacher it is the student's own, unrecorded, and not a mark against them", () => {
    const text = guideText();
    expect(text).toMatch(/You turn nothing on/);
    expect(text).toMatch(/stays on the device/);
    expect(text).toMatch(/never recorded/);
    expect(text, "the consequence a teacher is deciding about").toMatch(/cannot count against a student/);
  });

  it("says the one thing a teacher with students new to English has to plan for", () => {
    // Owed to this guide and never written. A teacher whose class includes newcomers gets one
    // sentence: there is no translation, and the two tools are theirs like everybody else's.
    expect(guideText()).toMatch(/Nothing is translated: a student new to English gets the same two tools, in English\./);
  });

  it("still says the run ends in the student's own writing", () => {
    // The summary sentence that used to close "What do students do?" paid for the headphones
    // row. Its clauses had to survive the trade, and this is the one that was not already
    // spelled out twice: a teacher reads and scores what the student wrote.
    const text = guideText();
    expect(text).toMatch(/one written explanation you read and score yourself/);
    expect(text).toMatch(/Read and score the written explanations/);
  });
});

// ---------------------------------------------------------------------------
// 4. The minute the heading promises
// ---------------------------------------------------------------------------

/**
 * What "The whole resource in one minute." costs, and why the number only goes down.
 *
 * The block is a teacher's first sixty seconds with this product and it makes a promise about
 * how long it takes to read. Nothing measured it, so a row could be added to it forever. This
 * is the meter, set at what ships today.
 *
 * It is a ceiling, not a target. At this length the heading is a promise about *scanning* — a
 * teacher reads the question in bold and one answer — and it is already generous: a minute of
 * ordinary adult reading is nearer 250 words than this. So the honest way to add a row is to
 * take the words out of a row that is already here, which is what the headphones row did.
 * When the count comes down, bring this constant down with it.
 */
const BRIEF_ANSWERS_WORDS = 437;

describe("the block that promises a minute", () => {
  it("costs no more than the words it costs today", () => {
    const { container } = render(<MemoryRouter><EducatorGuide /></MemoryRouter>);
    const block = container.querySelector<HTMLElement>(".brief-answers");
    expect(block, "the guide's opening block").not.toBeNull();
    const words = screenTextOf(block).chunks.reduce((total, chunk) => total + countRenderedWords(chunk), 0);
    expect(
      words,
      `"The whole resource in one minute." is now ${words} words. A new row is paid for out of `
      + "an existing one rather than by raising this number",
    ).toBeLessThanOrEqual(BRIEF_ANSWERS_WORDS);
  });
});
