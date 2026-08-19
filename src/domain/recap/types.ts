import type { WorldId } from "../core/ids";

/**
 * What a student gets back, as data.
 *
 * The rule this whole directory exists to keep: **software may check whether the money
 * works; it may not decide whether a student's thinking makes sense.** Everything below is
 * a *fact about a decision* — what was chosen, what it cost, what the board said, what
 * happened next — read out of one student's own event log and said back to them in the
 * nouns of the world they played. There is no level in this file, no score, no status, no
 * band, no count of anything that stands for the student, and nothing anywhere about their
 * writing.
 *
 * It is deliberately a different module from `domain/evidence` and `domain/competency`.
 * Those two produce judgements for a teacher, against a rubric, and `contracts.ts` says out
 * loud that the bundle a student downloads must not contain the code that judges them. So
 * this reads the same log and shares none of that code: a recap can never accidentally
 * become an observation, and an observation can never leak onto a student's screen.
 */

/**
 * The six ideas a Plan Under Pressure run is about, world-neutral.
 *
 * The ids are the product's own; the sentences a student reads are the world's. Both worlds
 * produce all six topics, in this order, every time — a topic a run never reached is
 * present and says so, because "never came up" and "did not do it" are different sentences
 * and this product has never let a surface confuse them.
 */
export type RecapTopicId =
  | "money-you-can-count-on"
  | "what-had-to-be-paid"
  | "the-last-of-the-money"
  | "whether-it-added-up"
  | "not-enough-for-everything"
  | "when-the-money-changed";

export const RECAP_TOPIC_ORDER: readonly RecapTopicId[] = [
  "money-you-can-count-on",
  "what-had-to-be-paid",
  "the-last-of-the-money",
  "whether-it-added-up",
  "not-enough-for-everything",
  "when-the-money-changed",
] as const;

/**
 * The name grown-ups use for the idea, and one plain sentence saying what it means.
 *
 * This is the one thing on a student's screen that is not about them. District 26's review
 * put it plainly: the product never lets a student meet the words for what they have just
 * spent twenty minutes doing, so nothing tells them that the thing they did in a night
 * market is the same thing a bill at home is. Naming an idea is not grading a child, and a
 * word is transferable in a way that "the catering job" is not.
 *
 * Identical in both worlds by construction — `parity.test.ts` fails the build otherwise —
 * because the whole multiple-world claim is that the story changes and the idea does not.
 */
export interface RecapConcept {
  id: RecapTopicId;
  /** What it is called. Two or three words. */
  term: string;
  /** What that means, in one sentence a twelve-year-old can read. */
  means: string;
}

export const RECAP_CONCEPTS: Readonly<Record<RecapTopicId, RecapConcept>> = {
  "money-you-can-count-on": {
    id: "money-you-can-count-on",
    term: "Conditional money",
    means: "Money you only get if something else happens first. It is not the same as money that is already yours.",
  },
  "what-had-to-be-paid": {
    id: "what-had-to-be-paid",
    term: "Required costs",
    means: "The money that is already spoken for before you get to decide anything.",
  },
  "the-last-of-the-money": {
    id: "the-last-of-the-money",
    term: "Pay yourself first",
    means: "Deciding what you are keeping before you spend the rest — instead of keeping whatever happens to be left.",
  },
  "whether-it-added-up": {
    id: "whether-it-added-up",
    term: "A plan that balances",
    means: "Every dollar has a job, and the plan does not promise more money than there is.",
  },
  "not-enough-for-everything": {
    id: "not-enough-for-everything",
    term: "Needs, wants and goals",
    means: "When money will not stretch to everything, the choice is about what each thing is to you, not only what it costs.",
  },
  "when-the-money-changed": {
    id: "when-the-money-changed",
    term: "Committed money",
    means: "Money you have already promised or spent cannot be taken back. A repair has to come out of the rest.",
  },
} as const;

/**
 * Why a note is on the page. Never a grade — this exists so the screen can order the notes
 * and so the tests can hold the product to its own promises about each kind.
 *
 * - `decision` — a choice the student made, and what it was worth.
 * - `correction` — an answer that was wrong and then was right. Both halves, always.
 * - `support` — help the student used. Recorded as help used, never as a failure, because
 *   the buttons are there to be pressed and a product that punishes pressing them is lying
 *   about what it offered.
 * - `absence` — the run never asked. Never rendered as a zero, ever.
 */
export type RecapNoteKind = "decision" | "correction" | "support" | "absence";

export interface RecapNote {
  kind: RecapNoteKind;
  /** One sentence, in the student's second person and this world's nouns. */
  text: string;
  /**
   * The ids of the events in this student's own log that produced the sentence.
   *
   * Every note carries at least one, and `recap.test.ts` fails the build if a note ever
   * names an event the log does not contain. That is the mechanical form of "nothing on
   * this surface is derived from anything but that student's own log": a sentence with no
   * provenance cannot be written, and a sentence about somebody else's run cannot exist.
   */
  eventRefs: readonly string[];
}

export interface RecapTopic {
  id: RecapTopicId;
  /** This world's own heading for the idea. */
  heading: string;
  concept: RecapConcept;
  notes: readonly RecapNote[];
  /** True when the run never presented this at all. The notes then hold one absence. */
  neverCameUp: boolean;
}

export interface RunRecap {
  worldId: WorldId;
  /** The session this was read out of. A recap is about one run and cannot be about two. */
  sessionId: string;
  /** The world's own name for the run, for the page's first line. */
  worldTitle: string;
  topics: readonly RecapTopic[];
}
