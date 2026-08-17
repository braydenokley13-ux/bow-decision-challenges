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
