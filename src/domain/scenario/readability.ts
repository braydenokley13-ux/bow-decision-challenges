/**
 * One ruler, for every world's copy.
 *
 * §9.2 calls `readingGradeLevel` "measured, checkable by reading it". A number that is
 * checkable has to have been produced by something, and two worlds whose grades came from two
 * different tools are two numbers that cannot be compared — which would quietly undo the one
 * band in the parity table that is about how hard a world is to *read*.
 *
 * So the ruler ships. It is Flesch–Kincaid, the formula the reading-grade band is written in,
 * with an English syllable heuristic. Nothing here claims to be the same instrument a
 * publisher would use: it claims to be the same instrument for every world in this repository,
 * which is the property the comparison actually needs. `worldParity.test.ts` holds the two
 * worlds' copy inside the same band the declarations claim.
 */

/**
 * Syllables in an English word, by the usual heuristic: count vowel runs, drop a silent
 * trailing `e`, and never return zero. It is wrong on `queue` and on `poem`, and it is wrong
 * on both of them for every world, which is what matters here.
 */
export function syllablesIn(word: string): number {
  const letters = word.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length === 0) return 0;
  if (letters.length <= 3) return 1;
  const trimmed = letters.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export interface ReadingMeasure {
  /** Flesch–Kincaid grade level, to two decimal places. */
  grade: number;
  words: number;
  sentences: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
}

/** Whether a string is a sentence a student reads rather than a label on a control. */
export function isProse(text: string): boolean {
  return text.split(/\s+/).filter(Boolean).length > 3 && /[a-z]/.test(text);
}

export function countWords(strings: readonly string[]): number {
  return strings.join(" ").split(/\s+/).filter(Boolean).length;
}

/** Flesch–Kincaid over whatever prose it is handed. Empty text reads zero rather than NaN. */
export function measureReading(strings: readonly string[]): ReadingMeasure {
  const text = strings.filter(isProse).join(" ");
  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const words = text.split(/\s+/).map((word) => word.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) {
    return { grade: 0, words: 0, sentences: 0, wordsPerSentence: 0, syllablesPerWord: 0 };
  }
  const syllables = words.reduce((total, word) => total + syllablesIn(word), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  return {
    grade: Math.round((0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59) * 100) / 100,
    words: words.length,
    sentences: sentences.length,
    wordsPerSentence,
    syllablesPerWord,
  };
}

/* ---------------------------------------------------------------------------
   The second ruler: how many words a student actually reads on the way through.

   `measureReading` above answers "how hard is this to read". It cannot answer "is
   there too much of it", and that is the question a lesson period asks. It also
   cannot answer it honestly, because it filters through `isProse`, which drops
   every string of three words or fewer — every button, every table header, every
   status line, every money figure. "Nothing here is new" is three words a student
   reads. So the ruler below has no such filter, and it does not read strings at
   all: it reads the rendered screen.
   --------------------------------------------------------------------------- */

/**
 * Words a minute, silent reading, Grades 5–8.
 *
 * 150 is the product's own figure. `machine/pacing.ts` and the pop-up's `stages.ts`
 * both build their per-screen budgets on "reading at roughly 150 words a minute",
 * so the budget and the check are made of the same number and cannot drift apart.
 * It is the optimistic end of the range for this band — commonly quoted rates for
 * Grade 5–8 silent reading run from about 120 to 180 — which is deliberate: a world
 * that does not fit at 150 does not fit at all, and nothing here can be waved away
 * as the ruler being unkind.
 *
 * `READING_RATE_REALISTIC_WPM` is carried alongside it, unused by any assertion, so
 * that every report can also say what the same screens cost a slower reader. It is
 * reported, never asserted: a gate a world could fail for being read by a slower
 * child is a gate about children rather than about the product.
 */
export const READING_RATE_WPM = 150;
export const READING_RATE_REALISTIC_WPM = 120;

/** The most words a budget of `seconds` can pay for, at the rate above. */
export function wordsAffordableIn(seconds: number): number {
  return Math.floor((seconds * READING_RATE_WPM) / 60);
}

/** What `words` costs in seconds, at a given rate. */
export function secondsToRead(words: number, wpm: number = READING_RATE_WPM): number {
  return (words / wpm) * 60;
}

/**
 * A token counts as a word when it contains a letter or a digit.
 *
 * That admits `$1,900`, `40`, `—$150` and `Saturday 2`, all of which are things a
 * student stops and reads. It excludes only tokens made entirely of punctuation and
 * symbols: the `·` between the class code and the seat, the `▾` on a disclosure, a
 * lone spaced em dash. Those are typography, not reading, and there are few enough
 * of them that `readingLoad.test.tsx` counts them and holds them under 3% of every
 * screen — an exclusion that has to keep proving it is small.
 */
export function isReadableToken(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token);
}

export function countRenderedWords(text: string): number {
  return text.split(/\s+/).filter(isReadableToken).length;
}

/** What one rendered screen puts in front of a student. */
export interface ScreenText {
  /** Every run of text on the critical path, in document order, whitespace collapsed. */
  chunks: readonly string[];
  /**
   * Text inside a collapsed `<details>` — Basketball's "The four payments" drawer and
   * anything like it. A student who is following the screen never opens these; a
   * student who has lost the thread does. Counted, reported, and kept out of the
   * critical-path total for that reason, rather than dropped.
   */
  scaffoldChunks: readonly string[];
  /** Tokens rejected for containing no letter or digit, so the exclusion can be checked. */
  symbolTokens: number;
}

/**
 * Reads a rendered subtree the way a student reads a screen.
 *
 * Everything visible counts — headings, decks, cards, table cells, hints, and the
 * words on every button, because a button whose label has to be read before it can
 * be pressed is reading. Two things are held out and both are named on the
 * `ScreenText` fields above: `aria-hidden` subtrees, which the product itself
 * declares are not for the reader, and collapsed disclosures.
 */
export function screenTextOf(root: Node | null): ScreenText {
  const chunks: string[] = [];
  const scaffoldChunks: string[] = [];
  let symbolTokens = 0;
  if (!root) return { chunks, scaffoldChunks, symbolTokens };

  const walk = (node: Node) => {
    if (node.nodeType === 3 /* text */) {
      const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
      if (!text) return;
      const tokens = text.split(" ");
      symbolTokens += tokens.filter((token) => !isReadableToken(token)).length;
      if (tokens.some(isReadableToken)) chunks.push(text);
      return;
    }
    if (node.nodeType !== 1 /* element */) return;
    const element = node as Element;
    if (element.getAttribute("aria-hidden") === "true") return;
    if (element.tagName === "DETAILS" && !element.hasAttribute("open")) {
      // Collected rather than skipped, so "the student can open this if stuck" is a
      // number in the report and not a hole in the count. The `<summary>` is the part a
      // student reads without opening anything, so it stays on the critical path.
      for (const child of Array.from(element.childNodes)) {
        if ((child as Element).tagName === "SUMMARY") walk(child);
        else scaffoldChunks.push(...screenTextOf(child).chunks);
      }
      return;
    }
    for (const child of Array.from(element.childNodes)) walk(child);
  };
  walk(root);
  return { chunks, scaffoldChunks, symbolTokens };
}

/**
 * The words on this screen that were not on the one before it.
 *
 * A run is a sequence of screen states, not a pile of independent pages, and the
 * persistent chrome, the money rail and the plan rows are on every one of them. A
 * ruler that added those up once per screen would charge a student thirteen readings
 * of "The four payments" and produce a number no classroom would recognise. So a run
 * of text that was on the previous screen, verbatim, is not read again; anything else
 * is read in full. The comparison is per text run rather than per word, so a new
 * sentence built out of familiar words still costs what it costs.
 */
export function freshWords(screen: readonly string[], previous: readonly string[]): number {
  const seen = new Map<string, number>();
  for (const chunk of previous) seen.set(chunk, (seen.get(chunk) ?? 0) + 1);
  let words = 0;
  for (const chunk of screen) {
    const left = seen.get(chunk) ?? 0;
    if (left > 0) seen.set(chunk, left - 1);
    else words += countRenderedWords(chunk);
  }
  return words;
}
