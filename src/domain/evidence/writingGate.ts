/**
 * What a written answer has to contain before it can be turned in, and what is still missing.
 *
 * **This is not a quality check and it must never become one.** BOW does not score student
 * writing — a person reads it — and that refusal is one of the best decisions in the product.
 * What this replaces is not a judgement but a *disguise*: the gate used to be
 * `text.trim().length >= 40`, silently, behind a disabled button whose only explanation was
 * "write two to four sentences". Measured on a real screen, `idk` was refused, `idk. idk. idk.
 * idk.` was refused, `$1,128 and $216. idk.` was refused, and forty characters of
 * `aaaaaaaaaa` went straight through. A child who works out that length is the rule gets past
 * a gate faster than a child who tries, and the product taught padding to whoever noticed.
 *
 * Two things had to become true, and neither of them is "score the writing".
 *
 * **The rule has to be stated.** Every requirement below is written in the words the student
 * is shown, and the screen names the one that is still outstanding — including *which* of
 * their numbers is not in the paragraph yet. A rule a student cannot see is a rule they can
 * only get past by guessing.
 *
 * **The cheapest way through has to be answering.** These check the two things the prompt
 * actually asks for and a machine can honestly verify: the student's own figures are in the
 * writing, and there is more than one sentence with something in each. The shortest thing
 * that satisfies both is a sentence about one number and a sentence about another — which is
 * the answer. Padding is no longer shorter than trying.
 *
 * Nothing here reads what the sentences *say*. Sorting a good explanation from a bad one is
 * the reader's job, and every answer that gets through still goes to a person unscored.
 */

/**
 * One thing the answer has to contain, in the words the student is shown.
 *
 * `said` is the whole line, and it carries the state in the sentence rather than only in a
 * tick beside it: *"Tap 2 or 3 of Avery's numbers. Tap 1 more."* against *"Two of Avery's
 * numbers, tapped."* A row whose only difference from its neighbour is a glyph is a row a
 * screen reader reads identically twice.
 */
export interface WritingRule {
  id: "numbers-chosen" | "numbers-written" | "sentences";
  met: boolean;
  said: string;
}

export interface WritingGate {
  rules: readonly WritingRule[];
  ready: boolean;
}

/** One of the student's own figures, as the chip offered it. */
export interface ChosenNumber {
  label: string;
  value: number;
}

/** How many of their own numbers the prompt asks a student to stand on. */
export const NUMBERS_WANTED = { min: 2, max: 3 } as const;

/**
 * A sentence that says something.
 *
 * Three words, which is the shortest thing in English that is a claim rather than a token —
 * "I protected rides", "It still balances". `idk` is one word and four of them in a row was
 * the exact answer that used to be refused while forty letters of one repeated character was
 * accepted, so the floor is on the sentence rather than on the string.
 */
const WORDS_PER_SENTENCE = 3;

/** And more than one of them, because the prompt asks for two things and gets one otherwise. */
const SENTENCES_WANTED = 2;

/** Every number written anywhere in the text, however the student punctuated it. */
export function numbersIn(text: string): ReadonlySet<number> {
  const found = new Set<number>();
  for (const match of text.matchAll(/\d[\d,]*/g)) {
    const value = Number(match[0].replaceAll(",", ""));
    if (Number.isFinite(value)) found.add(value);
  }
  return found;
}

/** Sentences with something in them: split on the marks a student actually types. */
export function sentencesIn(text: string): readonly string[] {
  return text
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.split(/\s+/).filter(Boolean).length >= WORDS_PER_SENTENCE);
}

/** "$1,200", "$1,200 and $900", "$1,200, $900 and $400" — one comma rule for every list. */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function money(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

/**
 * The gate, and the sentence beside each half of it.
 *
 * `chosen` is the figures the student tapped, in the order they tapped them. Everything is
 * derived: nothing is stored, nothing is scored, and calling this twice with the same
 * arguments says the same thing.
 */
export function checkWriting(input: { chosen: readonly ChosenNumber[]; text: string }): WritingGate {
  const text = input.text.trim();
  const enoughChosen = input.chosen.length >= NUMBERS_WANTED.min && input.chosen.length <= NUMBERS_WANTED.max;
  const written = numbersIn(text);
  const absent = input.chosen.filter((number) => !written.has(number.value));
  const sentences = sentencesIn(text);

  const stillToPick = Math.max(0, NUMBERS_WANTED.min - input.chosen.length);
  const chosenSaid = enoughChosen
    ? `${input.chosen.length} of Avery’s numbers, tapped.`
    : stillToPick > 0
      ? `Tap ${NUMBERS_WANTED.min} or ${NUMBERS_WANTED.max} of Avery’s numbers. ${stillToPick} more to go.`
      : `Tap ${NUMBERS_WANTED.min} or ${NUMBERS_WANTED.max} of Avery’s numbers. That is one too many — untap one.`;
  const writtenSaid = !enoughChosen
    ? "Then write each number you tapped into your answer."
    : absent.length === 0
      ? "Both of your numbers are in what you wrote."
      : `Write each number you tapped into your answer. ${listOf(absent.map((number) => money(number.value)))} ${absent.length === 1 ? "is" : "are"} not in it yet.`;
  const sentencesSaid = sentences.length >= SENTENCES_WANTED
    ? `${sentences.length} sentences so far.`
    : `Write ${SENTENCES_WANTED} sentences or more, each with something in it. ${sentences.length === 0 ? "None yet." : `${sentences.length} so far.`}`;

  const rules: WritingRule[] = [
    { id: "numbers-chosen", met: enoughChosen, said: chosenSaid },
    // Vacuously true is not met: a student who has tapped nothing has not written their
    // numbers, and a tick beside a rule they have not reached is the gate lying twice.
    { id: "numbers-written", met: enoughChosen && absent.length === 0, said: writtenSaid },
    { id: "sentences", met: sentences.length >= SENTENCES_WANTED, said: sentencesSaid },
  ];
  return { rules, ready: rules.every((rule) => rule.met) };
}
