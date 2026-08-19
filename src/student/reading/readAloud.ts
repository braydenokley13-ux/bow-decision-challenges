import { isReadableToken } from "../../domain/scenario/readability";

/**
 * Reading the screen the student is on, out loud, on the device it is already on.
 *
 * `window.speechSynthesis` is in every browser this product supports. It needs no dependency,
 * makes no network call, and nothing a student has written leaves the machine — which is not a
 * side benefit here but the reason this is the only acceptable way to build it. The one thing
 * a child types into BOW is a paragraph explaining their own decisions, and posting that to a
 * speech service to be read back to them would be the product breaking the promise it makes on
 * its own sign-in screen.
 *
 * **What gets read, and what does not.** The reader is pointed at a region — in the run, the
 * `<main>` landmark, which is the stage and nothing else. The bar above it is chrome: the
 * wordmark, the eight-week strip, the class code and seat, the drawer of Avery's four payments.
 * A student who asks for the scenario to be read does not want to hear their seat number first,
 * and would have to sit through it on all thirteen screens.
 *
 * Inside the region the rules are the ones `screenTextOf` already sets in
 * `domain/scenario/readability.ts`, and deliberately the same ones: `aria-hidden` subtrees are
 * skipped because the product has declared they are not for the reader, and a collapsed
 * `<details>` is skipped because its contents are not on the screen. So **what the voice reads
 * is what the product's own reading-load instrument counts.** If the two ever disagree, one of
 * them is wrong about what a student is facing; `readAloud.test.ts` holds them together.
 *
 * The one difference is written down rather than left to be discovered: the ruler holds the
 * student's own sentences out of its word count (`data-own-words`) because re-reading your own
 * paragraph is a glance, not a read. The voice does read them. On the screen that shows a
 * student what they turned in, their own words are the thing they are most likely to want read
 * back, and a reader that fell silent exactly there would be answering a measurement problem
 * with a product decision.
 *
 * **Values are read as they are at the moment they are read.** A unit holds its text nodes, not
 * a copy of their text, so a money rail that changes while the voice is working down the screen
 * is spoken at its current figure rather than at the figure it held when the student pressed
 * play. Reading a stale number aloud inside an assessment is worse than not reading at all.
 */

/** One run of text the voice says in one breath: everything inside one block-level element. */
export interface ReadUnit {
  readonly nodes: readonly Text[];
}

/**
 * Elements that do not break a line, so their text belongs to the sentence around them.
 *
 * A `<strong>` holding an amount is part of the sentence it sits in — *"Enough to pay the
 * $1,200 the course costs."* is one thing a person says, not three. Everything not listed here
 * ends the run: paragraphs, list items, table cells, headings, buttons, and the definition
 * lists the money rail is built from.
 */
const INLINE = new Set([
  "A", "ABBR", "B", "BDI", "BDO", "CITE", "CODE", "DATA", "DEL", "DFN", "EM", "I", "INS", "KBD",
  "LABEL", "MARK", "OUTPUT", "Q", "RUBY", "S", "SAMP", "SMALL", "SPAN", "STRONG", "SUB", "SUP",
  "TIME", "U", "VAR", "WBR",
]);

/** Never read, whatever they contain. */
const NEVER = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "IFRAME", "SVG"]);

/**
 * The text of a unit, as it stands right now.
 *
 * Whitespace collapses the way the browser lays it out, so a paragraph broken across source
 * lines is one sentence rather than one with gaps in it. The runs inside a block are joined
 * with a space rather than butted together, because the money rail is built out of `<dt>` and
 * `<small>` pairs with no whitespace between them and *Perfect attendance bonus$800* is not a
 * thing anybody says. The space is then taken back off a following full stop or comma, which
 * is the one place that rule reads wrong: `<b>$2,000</b>.` is a sentence ending, not a pause.
 */
export function textOf(unit: ReadUnit): string {
  return unit.nodes
    .map((node) => node.nodeValue ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

/** Whether a run of text has anything in it a person would say. `·` and `▾` do not. */
function worthSaying(text: string): boolean {
  return text.split(/\s+/).some(isReadableToken);
}

/**
 * The screen, in reading order, in the order a person would say it.
 *
 * Document order, which is the order the product laid the screen out in and the order a
 * screen reader would take it in. Nothing here re-sequences a page: a screen whose reading
 * order is wrong is a screen to fix, not one to paper over in a voice.
 */
export function collectUnits(root: Node | null): readonly ReadUnit[] {
  const units: ReadUnit[] = [];
  if (!root) return units;
  let open: Text[] = [];

  const flush = () => {
    if (open.length === 0) return;
    const unit: ReadUnit = { nodes: open };
    open = [];
    if (worthSaying(textOf(unit))) units.push(unit);
  };

  const walk = (node: Node) => {
    if (node.nodeType === 3 /* text */) {
      const text = node.nodeValue ?? "";
      if (text.trim()) open.push(node as Text);
      return;
    }
    if (node.nodeType !== 1 /* element */) return;
    const element = node as Element;
    if (NEVER.has(element.tagName)) return;
    if (element.getAttribute("aria-hidden") === "true") return;
    // The lever the wiring has for a region that should stay silent. Nothing in the run uses
    // it yet; it exists so that excluding one does not mean editing this file.
    if (element.getAttribute("data-read-aloud") === "skip") return;
    if (element.tagName === "DETAILS" && !element.hasAttribute("open")) {
      // Only the summary is on the screen. What is behind a closed disclosure is not, and
      // reading it would put the voice somewhere the student's eyes cannot follow.
      for (const child of Array.from(element.childNodes)) {
        if ((child as Element).tagName === "SUMMARY") walk(child);
      }
      return;
    }
    const inline = INLINE.has(element.tagName);
    if (!inline) flush();
    for (const child of Array.from(element.childNodes)) walk(child);
    if (!inline) flush();
  };

  walk(root);
  flush();
  return units;
}

/** Where a unit sits, so it can be marked while it is being said. */
export function rangeOf(unit: ReadUnit): Range | null {
  const first = unit.nodes[0];
  const last = unit.nodes[unit.nodes.length - 1];
  if (!first || !last || typeof document.createRange !== "function") return null;
  const range = document.createRange();
  range.setStart(first, 0);
  range.setEnd(last, (last.nodeValue ?? "").length);
  return range;
}

/* ---------------------------------------------------------------------------
   The voice, behind a seam.

   `speechSynthesis` is a browser global with no constructor a test can drive, so the reader
   never touches it: it is handed something that can say a string and stop. The browser
   implementation below is the only place the global appears.
   --------------------------------------------------------------------------- */

export interface Voice {
  /** Says one run of text and calls back once, when it has finished or failed. */
  say(text: string, done: () => void): void;
  /** Stops at once. Nothing queued behind it is said. */
  stop(): void;
}

/** Whether this browser can speak at all. Everything visible is gated on it. */
export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";
}

/**
 * The browser's own voice, at its own speed.
 *
 * No rate, pitch or voice is set. A student who wants a slower voice has already set one, in
 * the operating system, where it applies to everything they use; a second speed control in
 * one web page that disagrees with it is a worse experience than none. The language is taken
 * from the document so the browser picks an English voice rather than whichever came first.
 */
export function browserVoice(): Voice {
  let live: SpeechSynthesisUtterance | null = null;
  return {
    say(text, done) {
      const synthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || "en";
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        if (live === utterance) live = null;
        done();
      };
      utterance.onend = settle;
      utterance.onerror = settle;
      live = utterance;
      // Chrome leaves the queue paused if a previous page paused it, and a paused queue
      // accepts `speak` and says nothing at all.
      synthesis.resume();
      synthesis.speak(utterance);
    },
    stop() {
      live = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
  };
}

/* ---------------------------------------------------------------------------
   Marking the line being read.
   --------------------------------------------------------------------------- */

export interface Marker {
  show(range: Range | null): void;
  clear(): void;
}

/**
 * The line being spoken, marked without touching the page.
 *
 * The CSS Custom Highlight API paints a range from the stylesheet, so nothing in the run's
 * own markup is wrapped, replaced or re-keyed to show where the voice is — which matters
 * because the boards under it are React components another change is editing this week, and a
 * reading aid that rewrote their DOM would be a reading aid that broke them.
 *
 * Where the API is missing the voice still works and nothing is marked. That is a real loss
 * for a student following along, and it is a smaller loss than a highlight implemented by
 * mutating somebody else's tree.
 */
export function browserMarker(name = "bow-read-aloud"): Marker {
  const supported = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function";
  if (!supported) return { show: () => {}, clear: () => {} };
  const highlight = new Highlight();
  CSS.highlights.set(name, highlight);
  return {
    show(range) {
      highlight.clear();
      if (range) highlight.add(range);
    },
    clear() {
      highlight.clear();
    },
  };
}

/* ---------------------------------------------------------------------------
   The reader.
   --------------------------------------------------------------------------- */

export type ReaderState = "idle" | "reading" | "changed";

export interface Reader {
  /** Reads a region from the top. Anything already being read stops first. */
  start(region: HTMLElement | null): void;
  stop(): void;
  state(): ReaderState;
  /** Called on every state change, so a control can say what it is doing. */
  subscribe(listener: (state: ReaderState) => void): () => void;
}

export interface ReaderOptions {
  voice: Voice;
  marker?: Marker;
  /** Brings the line being read into view. Off in tests, where there is no viewport. */
  scroll?: (unit: ReadUnit) => void;
}

/**
 * Brings the line being read into view, and only when it is not already.
 *
 * A reader that scrolls on every line takes the page away from a student who is following it
 * with their finger. This moves only when the line is off the screen entirely.
 */
export function scrollUnitIntoView(unit: ReadUnit): void {
  const anchor = unit.nodes[0]?.parentElement;
  if (!anchor || typeof anchor.getBoundingClientRect !== "function" || typeof anchor.scrollIntoView !== "function") return;
  const box = anchor.getBoundingClientRect();
  const height = window.innerHeight || 0;
  if (box.top >= 0 && box.bottom <= height) return;
  const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  anchor.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
}

export function createReader({ voice, marker, scroll }: ReaderOptions): Reader {
  let state: ReaderState = "idle";
  let units: readonly ReadUnit[] = [];
  let index = 0;
  let region: HTMLElement | null = null;
  // Every start gets a number. A callback from the run before it — Chrome fires `onerror` on
  // whatever it cancels — is then ignorable rather than something that advances the new one.
  let run = 0;
  const listeners = new Set<(state: ReaderState) => void>();

  const settle = (next: ReaderState) => {
    state = next;
    for (const listener of listeners) listener(state);
  };

  const halt = (next: ReaderState) => {
    run += 1;
    marker?.clear();
    voice.stop();
    units = [];
    index = 0;
    settle(next);
  };

  const speakNext = (mine: number) => {
    if (mine !== run || state !== "reading") return;
    const unit = units[index];
    if (!unit) return halt("idle");
    // Two cheap questions, both meaning "is this still the screen I was reading?". A stage
    // that has moved on, or a question that has appeared under the voice, stops it — the
    // student is told the screen changed rather than hearing a sentence that is no longer
    // there. A figure changing in place does neither, because the text is read live.
    if (!unit.nodes.every((node) => node.isConnected)) return halt("changed");
    if (index > 0 && collectUnits(region).length !== units.length) return halt("changed");
    marker?.show(rangeOf(unit));
    scroll?.(unit);
    voice.say(textOf(unit), () => {
      if (mine !== run) return;
      index += 1;
      speakNext(mine);
    });
  };

  return {
    start(next) {
      halt("idle");
      region = next;
      units = collectUnits(next);
      if (units.length === 0) return;
      index = 0;
      run += 1;
      settle("reading");
      speakNext(run);
    },
    stop() {
      halt("idle");
    },
    state() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
