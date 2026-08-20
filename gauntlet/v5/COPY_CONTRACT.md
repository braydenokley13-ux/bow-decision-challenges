# The copy contract

**Ruled after the product owner read the shipped screens: "The writing is still horrendous and
no one can understand it."** That judgement is correct and this file supersedes the previous
assessment, which was wrong.

## Why it was missed, twice

**The readability gate cannot see the problem.** `readability.ts:59` is Flesch–Kincaid:
`0.39 × wordsPerSentence + 11.8 × syllablesPerWord − 15.59`. It measures sentence length and
syllable count and nothing else. *"A first Saturday brings a booth the crowd it gets."* is nine
words of mostly one syllable and scores about grade 2. It is also close to unreadable. The world
declares `readingGradeLevel: 3.41` and `worldParity.test.ts` checks that declaration against the
measurement, so the number is honest and the instrument is wrong.

**The copy audit read the author's defence instead of the strings.** The source carries long,
well-argued comments explaining why each line was chosen. An auditor reading the file reads the
argument and the sentence together and finds the sentence persuasive. Judging blind — the
rendered strings alone, with no comments — produces the opposite verdict immediately. Every
future copy judgement is made on extracted strings, never on the source.

## What is actually wrong

The prose is *well-crafted for an adult reader*. That is the problem: it is a literary voice, and
the reader is twelve, often in a second language, and under time pressure in a classroom.

| Defect | Shipped | The fix |
| --- | --- | --- |
| **Inverted or withheld subject** | "A first Saturday brings a booth the crowd it gets." | Subject first, verb second. Say who does what. |
| **Ellipsis — the referent is left out** | "Yours at the end of the run, if nothing eats it." | Name the thing. "This is your money. Costs can still eat into it." |
| **Idiom that is not universal** | "Cash up", "the cheapest booth going", "packed up", "told you straight out", "the run" | Plain US English a 12-year-old uses. |
| **Metaphor used as a label** | "$1,110 still has no job." | "You still have $1,110 to place." |
| **Stacked clauses under one em-dash** | The 54-word three-lines paragraph | One idea per sentence. |
| **Abstract before concrete** | "Give every dollar a job." | Say what to do, then say why. |

## The rules

1. **One idea per sentence.** Typical 12–15 words. Hard ceiling 22.
2. **Subject, verb, object, in that order.** No inversion, no fronted subordinate clause, no
   sentence whose subject arrives late or never.
3. **Name the referent.** No "it", "this", "the one", "yours" where the noun is more than one
   sentence away.
4. **Plain US English.** If a 12-year-old would not use the word or phrase, do not use it.
   Concrete world nouns stay — tray, plate, booth, lane, generator, till — because they are
   specific and teachable, not idiomatic.
5. **No metaphor in a label, a button, or a status line.** Metaphor is allowed once, in flavour
   copy, where the literal meaning is also on screen.
6. **Say what to do before why it matters.** Explanation follows the instruction or hides behind
   disclosure. Never both at the same visual weight (see `QUALITY_DEBT.md` §D).
7. **Direct is not babyish.** No exclamation marks, no cheerleading, no "Let's...", no "Oops".
   Respect the reader; just be clear.

## What may not change

- **Every number, price, rule and threshold**, exactly.
- **What a decision does.** No screen may start asking a different question.
- **The evidence semantics.** A prompt that raises an evidence requirement keeps raising it.
  Check `eventEvidence.ts` and each world's `observer.ts` before touching a prompt.
- **The tips-jar and write-up prompts' meaning** — they are graded for reasoning.

## What must keep passing

`readingLoad.test.tsx` (per-screen word budgets — shorter is fine, re-declare if a budget
frees up), `glossary.test.ts` (every word defined or judged plain — new plain words go in
`PLAIN_ENOUGH` with a reason), `deadCopy.test.ts`, `docsDataClaims.test.ts`, and
`worldParity.test.ts` — which is the constraint that bites: `readingGradeLevel` must stay within
0.5 of measured, and `totalWordsStudentReads` within 15% of counted, **and** the two worlds must
stay inside the parity bands relative to each other. **Both worlds are therefore rewritten
together.** Fixing one alone moves it away from the other.

## The check the gate is missing

Flesch–Kincaid stays, because word and sentence length still matter. It gains a companion that
catches what it cannot: sentences whose subject is not in the first clause, sentences with more
than one subordinate clause, an idiom list, and pronouns with no antecedent in the same sentence.
A metric that scores "A first Saturday brings a booth the crowd it gets" as grade 2 is not a
reading-level check; it is a syllable counter, and it should say so.
