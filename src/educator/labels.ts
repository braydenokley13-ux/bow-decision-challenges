import type { CompetencyResultState, SupportLevel } from "../domain/competency/types";
import {
  DEVELOPING_THRESHOLD_PERCENT,
  MINIMUM_ASSESSED_FOR_A_STATE,
  STRONG_THRESHOLD_PERCENT,
  type ObjectiveResultState,
} from "../domain/competency/objectiveState";
import { labelsFor, type Coverage, type FrameworkId } from "../domain/standards";

/**
 * Every word a teacher reads for a level, a state or a thing being assessed. One file.
 *
 * Before this file was rewritten the educator surface spoke four vocabularies for the same
 * ideas — six live tables for "how independently a student worked", plus eleven phrasings
 * improvised in JSX, plus two dead tables still documented as live. A teacher opening one
 * student read *Demonstrated with support* in the headline, *demonstrated with support* in
 * the skill list, *partly shown* in the flags, *After a hint* in the trail one tab over,
 * and *Needs support* in the What-next tab: six wordings, one fact, one screen.
 *
 * So there are four ladders and nothing else. Each answers a different question, each has
 * exactly one table here, and **no component spells a level**. If a screen needs a word for
 * a level it imports it; if the word is wrong it is wrong in one place.
 *
 * | Ladder | Question it answers | Table |
 * |---|---|---|
 * | 1 | What is this thing called? | `TERMS` |
 * | 2 | What did *one student* do on *one thing the work had to show*? | `LEVEL_LABELS` |
 * | 3 | What did *one student* show on *one skill*? | `SKILL_STATE_LABELS` |
 * | 4 | Where is *a class* on *one skill*? | `CLASS_STATE_LABELS` |
 *
 * **Ladder 2 and Ladder 3 are deliberately parallel and deliberately different verbs.**
 * Ladder 2 is the *do* family (`Did it after a hint`), Ladder 3 the *show* family (`Showed
 * it after a hint`). A teacher who learns that one distinction can tell, from the words
 * alone, whether a claim is about one requirement or about a whole skill — and the two
 * agree by construction rather than by anybody remembering to keep them aligned.
 *
 * **Ladder 4 never reads as a claim about a child.** Every Ladder-4 label names its subject
 * — *the class*, *half the class*, *Nobody* — and no Ladder-3 label names any subject at
 * all. That is the invariant, and it is what "Developing" broke: it meant one child in one
 * table and a whole room in another, and both appeared on the objective page within one
 * scroll. `wordLadders.test.ts` fails the build if a Ladder-4 label ever equals a Ladder-3
 * label, if a Ladder-4 label stops naming its subject, or if the two ladders come to share a
 * word of their own.
 *
 * The counts and the denominator travel with every Ladder-4 word, as they always have.
 * Nothing here changes that, and nothing here is allowed to be read without them.
 */

/** The framework this deployment names in its navigation. One today. */
const NAV_FRAMEWORK: FrameworkId = "nysed-pf-2026";

// ---------------------------------------------------------------------------
// Ladder 1 — what things are called
// ---------------------------------------------------------------------------

/**
 * The nouns, composed rather than typed, so a rename is one edit and not a grep.
 *
 * *Challenge* is the whole assessed experience — Plan Under Pressure. *Story* is one of the
 * two situations inside it; it replaces **world**, which was the internal registry key
 * (`WorldId`, `WORLD_REGISTRY`) escaping onto a teacher's screen and a twelve-year-old's,
 * where it named the same object the word *challenge* named one line above. *Skill* is one
 * BOW financial skill; it replaces **competency** and **concept**. *What the work had to
 * show* is one observable thing inside a skill; it replaces **evidence requirement**,
 * **micro-skill**, **requirement**, **required part** and **criterion**, and it is the
 * phrase `TeachNext` already used as a table header — the best one in the codebase.
 *
 * *Objective* and *Topic* are the state framework's units and are never BOW's. They are
 * composed from `FrameworkLabels` (see `NAV_LABELS`) so a New Jersey deployment reads New
 * Jersey's words, and a BOW skill is never called an objective anywhere.
 *
 * Type names are exempt from all of this: `CompetencyId`, `WorldId` and `RubricLevel` are
 * schema, not English, and no user reads them. `wordLadders.test.ts` scans quoted strings
 * and JSX text and exempts comments and identifiers, deliberately.
 */
export const TERMS = {
  challenge: "challenge",
  story: "story",
  stories: "stories",
  /** Title case, for the head of a sentence or a column. */
  Story: "Story",
  skill: "skill",
  skills: "skills",
  /** One observable thing inside a skill, in the words the work is judged against. */
  requirement: "what the work had to show",
  /** The same, as a column header over a list of them. */
  Requirement: "What the work had to show",
} as const;

/**
 * How much of one objective a skill covers, in a sentence rather than as a raw enum.
 *
 * This column used to print `full`, `partial` and `supporting` in lowercase under a header
 * reading "Covers", on a page a teacher is invited to print and hand to a department head.
 * The distinction it carries is the load-bearing one on the whole page — the difference
 * between *a student who shows this has met the standard* and *they have met some of it* —
 * and nothing said what "partial" meant for the number in front of them.
 */
export const COVERAGE_LABELS: Record<Coverage, string> = {
  full: "All of it",
  partial: "Part of it",
  supporting: "Related, but not enough on its own",
};

/** "Both stories" / "One story" / "—", for a column counting how many stories reach a skill. */
export function storyCoverageLabel(count: number): string {
  if (count <= 0) return "—";
  if (count === 1) return `One ${TERMS.story}`;
  if (count === 2) return `Both ${TERMS.stories}`;
  return `${count} ${TERMS.stories}`;
}

// ---------------------------------------------------------------------------
// Ladder 2 — one student, one thing the work had to show
// ---------------------------------------------------------------------------

/**
 * The rubric, in the words a teacher reads rather than as a bare digit.
 *
 * Used everywhere a single requirement is reported: the evidence trail, the override
 * control, the student's flags, the What-next tab, the gradebook. It replaced eleven
 * phrasings improvised in JSX — *not shown*, *partly shown*, *did not show it*, *partly
 * showed it*, *partly there*, *— after a hint*, *Fell short*, *Never asked*, *Needs
 * support*, *Could do*, *Showed every required part* — every one of which is one of these
 * six.
 *
 * Two of the words are chosen against the obvious ones, and both for the same reason.
 *
 * **5 is `Right first time`, not `Did it alone`.** Level 4 is *also* unaided — the cap that
 * produces it is `natural_consequence`, the situation showing the student what happened,
 * which is not a hint from BOW. So independence is not what separates 5 from 4 and a label
 * that said "alone" would put the distinguishing word in the wrong place, one line above a
 * label saying "themselves". What separates them is whether it went wrong first.
 *
 * **`null` is not a zero and never renders as one.** It is the run never having asked, and
 * a page that printed it as 0 would report a fact about a story's coverage as a fact about
 * a child. It keeps its own row, its own colour and its own column everywhere.
 *
 * `0` covers two different things and its sentence says so: the student did none of it, or
 * BOW supplied the answer — which the rubric scores as nothing because a copied answer is
 * evidence about BOW. The label cannot carry that on its own, so the sentence does, and
 * `EvidenceTrailPanel`'s cap line names the supplied answer explicitly whenever it applies.
 */
export const LEVEL_LABELS: Record<0 | 2 | 3 | 4 | 5 | "null", string> = {
  5: "Right first time",
  4: "Fixed it themselves",
  3: "Did it after a hint",
  2: "Part of it",
  0: "Did not do it",
  null: "Never came up",
};

/**
 * What each level means, in the words a teacher would use to a colleague.
 *
 * Six short labels are a glossary a teacher does not have. These are shown beside the
 * labels wherever a person is asked to pick one, and once per page wherever the labels are
 * only read, because "Part of it" and "Did it after a hint" are BOW's own distinctions and
 * nobody outside this codebase has agreed to them.
 */
export const LEVEL_DESCRIPTIONS: Record<0 | 2 | 3 | 4 | 5 | "null", string> = {
  5: "Did it unaided, the first time it mattered.",
  4: "Got it wrong, saw what that cost, and put it right — with no hint.",
  3: "Right, once BOW named the problem.",
  2: "Some of it, not all of it.",
  0: "None of it — or BOW supplied the answer, which shows nothing about the student.",
  null: "This run never asked it of them.",
};

/** Strongest first. The order every level list in the product is offered in. */
export const LEVEL_ORDER: readonly (0 | 2 | 3 | 4 | 5 | "null")[] = [5, 4, 3, 2, 0, "null"];

export function levelLabel(level: 0 | 2 | 3 | 4 | 5 | null): string {
  return level === null ? LEVEL_LABELS.null : LEVEL_LABELS[level];
}

export function levelDescription(level: 0 | 2 | 3 | 4 | 5 | null): string {
  return level === null ? LEVEL_DESCRIPTIONS.null : LEVEL_DESCRIPTIONS[level];
}

/**
 * The three buckets a set of levels falls into when they are counted rather than named.
 *
 * The gradebook line and its exported column both use these, so the number on the screen
 * and the number in the teacher's spreadsheet carry the same word. They are named as the
 * buckets they are rather than as levels: `Did it` spans 5, 4 and 3, and `Part of it, or
 * none of it` is the union of Ladder 2's two shortfalls and reads as one.
 *
 * **`Never came up` never folds into `Part of it or not at all`.** A question nobody asked
 * is not a question failed, and this is the one artefact in the product that gets copied
 * somewhere nothing can explain it.
 */
export const LEVEL_BUCKET_LABELS = {
  met: "Did it",
  short: "Part of it, or none of it",
  neverAsked: "Never came up",
} as const;

export const LEVEL_BUCKET_DESCRIPTIONS = {
  met: "All of it — alone, after seeing what went wrong, or after a hint.",
  short: "Some of what it asked for, or nothing.",
  neverAsked: "This run never asked it of them. Absences, not zeros.",
} as const;

/**
 * What was on screen when the student did it, said as the reason a level is capped.
 *
 * These are not a ladder and they are not levels. They are the four amounts of help the
 * rubric recognises, and each one carries a cap that `observe.ts` applies. They kept the
 * word *support* when Ladder 3 gave it up: *demonstrated with support* used to be a
 * roll-up state as well as a rubric category, and one word doing both jobs is how a teacher
 * came to read "a hint that named the problem caps this at After a hint" and have no way to
 * tell which of the two *support* meant.
 */
export const SUPPORT_LABELS: Record<SupportLevel, string> = {
  standard_access: "the tools every student has",
  natural_consequence: "seeing what happened",
  direct_scaffold: "a hint that named the problem",
  answer_supplied: "the answer being supplied",
};

// ---------------------------------------------------------------------------
// Ladder 3 — one student, one skill
// ---------------------------------------------------------------------------

/**
 * What one student showed on one skill. The roll-up over Ladder 2.
 *
 * One table where there were two. `COMPETENCY_STATE_LABELS` (lowercase, for the tail of a
 * sentence) and `COMPETENCY_STATE_HEADLINES` (Title Case, for a heading) were the same six
 * states written twice and free to drift — and they had: *not observed* against *Not
 * observed in this run*, *still incomplete* against *Not assessed yet*. The real need was
 * casing, so casing is what solves it: `skillStateInSentence` lowercases the one table, and
 * the headline uses it as written.
 *
 * **The two absences keep their own words rather than borrowing a low one.** *Never came
 * up* means the story never presented it. *Evidence not all in* means the judgement is not
 * all in — most often because nobody has read the writing, but also for an attempt that
 * stopped early. Neither is a score, and either rendered as one would put a fact about a
 * marking pile or a dead Chromebook on a page about a child.
 *
 * *Evidence not all in* is deliberately not "Not read yet": `observe.ts` produces this
 * state for an unfinished attempt too, where nothing is waiting to be read. It is also the
 * phrase the student page already uses underneath — *"…so the evidence is not all in"* —
 * so the headline and the sentence beneath it now say the same thing.
 *
 * *Showed it after a hint* beats *demonstrated with support* because it names what
 * happened rather than a category, and because it gives the word *support* back to
 * `SUPPORT_LABELS`, which is the only place it means one thing.
 */
export const SKILL_STATE_LABELS: Record<CompetencyResultState, string> = {
  demonstrated: "Showed it",
  "demonstrated-with-support": "Showed it after a hint",
  developing: "Part way",
  "not-yet-demonstrated": "Not yet",
  "not-observed": "Never came up",
  incomplete: "Evidence not all in",
};

/** The glossary sentence for each, shown once per page the first time one appears. */
export const SKILL_STATE_DESCRIPTIONS: Record<CompetencyResultState, string> = {
  demonstrated: "Showed every part the work had to show, with no hint.",
  "demonstrated-with-support": "Showed every part, and BOW named the problem for at least one of them.",
  developing: "Showed part of at least one, and missed none of them outright.",
  "not-yet-demonstrated": "At least one part was not shown.",
  "not-observed": "This run never asked for any of it.",
  incomplete: "Some of it has no judgement yet — usually because nobody has read the writing.",
};

/** Strongest first, so every distribution of these reads the same way in the product. */
export const SKILL_STATE_ORDER: readonly CompetencyResultState[] = [
  "demonstrated", "demonstrated-with-support", "developing", "not-yet-demonstrated", "not-observed", "incomplete",
];

/**
 * The same six words, lowercased for the tail of a sentence — `14 showed it · 3 not yet`.
 *
 * This is the whole of what the second table used to be for. It is a function rather than a
 * table so the two can never say different things.
 */
export function skillStateInSentence(state: CompetencyResultState): string {
  return SKILL_STATE_LABELS[state].toLowerCase();
}

// ---------------------------------------------------------------------------
// Ladder 4 — a class, one skill
// ---------------------------------------------------------------------------

/**
 * Where a class is on one skill. Deliberately not Ladder 3's words.
 *
 * A claim about a room and a claim about a child are different claims. *Developing* used to
 * be both — one child in `COMPETENCY_STATE_LABELS`, a whole room in
 * `OBJECTIVE_STATE_LABELS` — and both appeared on the objective detail page within one
 * scroll of each other. So every label here names its subject and no Ladder-3 label names
 * any, which makes the two impossible to confuse even read out of context.
 *
 * The bands come from `objectiveState.ts` and the words are true across the whole of each
 * one, which is why the middle state is *Half the class or more* rather than the shorter and
 * punchier *About half*: this band runs from 50% to 79%, and "about half" is a false report
 * of 79%. A label a teacher has to correct against the count beside it is a label doing harm.
 *
 * They are subjects rather than sentences — *Most of the class* and not *Most of the class
 * showed it* — because of where they have to fit. The Objective Map's status column is
 * `white-space: nowrap` and this table also supplies the map's filter options; a sentence
 * there squeezed the objective column to one word per line on the one page the product tells
 * a teacher to print and hand to somebody. The verb is not lost: it is in the sentence beside
 * each one, and the count and denominator travel with every use. The side effect is worth
 * having on its own — these five now share no word with Ladder 3 but the adverb *yet*.
 *
 * The two refusals are refusals, not low states. *Too few assessed* is a fact about a
 * denominator and *Nobody assessed yet* is a fact about a marking pile; neither is a result
 * and neither may be read as one.
 */
export const CLASS_STATE_LABELS: Record<ObjectiveResultState, string> = {
  strong: "Most of the class",
  developing: "Half the class or more",
  "needs-attention": "Fewer than half",
  "too-few-assessed": "Too few assessed",
  "not-assessed": "Nobody assessed yet",
};

/** The glossary sentence for each, shown once per page the first time one appears. */
export const CLASS_STATE_DESCRIPTIONS: Record<ObjectiveResultState, string> = {
  strong: `${STRONG_THRESHOLD_PERCENT}% or more of the assessed students showed it.`,
  developing: `${DEVELOPING_THRESHOLD_PERCENT}% or more of the assessed students showed it, and under ${STRONG_THRESHOLD_PERCENT}%.`,
  "needs-attention": `Under ${DEVELOPING_THRESHOLD_PERCENT}% of the assessed students showed it.`,
  "too-few-assessed": `Under ${MINIMUM_ASSESSED_FOR_A_STATE} students have a usable result, so BOW will not describe the class.`,
  "not-assessed": "No student has a usable result yet.",
};

// ---------------------------------------------------------------------------
// The one glossary the product needs
// ---------------------------------------------------------------------------

/** One line of a key: the word as it appears on the page, and the sentence behind it. */
export interface KeyEntry { label: string; description: string }

/**
 * The words on this page, each with its sentence, once.
 *
 * Ladders 2, 3 and 4 are BOW's own distinctions and nobody outside this codebase has agreed
 * to them, so the rule is: **the first time a word from one of them appears on a page, its
 * sentence appears with it — once per page, not once per row.** These three functions take
 * the states a page actually rendered and return exactly those entries, in the canonical
 * order, deduplicated. A page that renders three of the six states explains three, not six,
 * and never explains a word that is not on it.
 *
 * They are here rather than in a component so that no screen can build a key out of words
 * it invented.
 */
export function levelKey(levels: Iterable<0 | 2 | 3 | 4 | 5 | null>): KeyEntry[] {
  const present = new Set<0 | 2 | 3 | 4 | 5 | "null">([...levels].map((level) => (level === null ? "null" : level)));
  return LEVEL_ORDER.filter((level) => present.has(level))
    .map((level) => ({ label: LEVEL_LABELS[level], description: LEVEL_DESCRIPTIONS[level] }));
}

export function skillStateKey(states: Iterable<CompetencyResultState>): KeyEntry[] {
  const present = new Set(states);
  return SKILL_STATE_ORDER.filter((state) => present.has(state))
    .map((state) => ({ label: SKILL_STATE_LABELS[state], description: SKILL_STATE_DESCRIPTIONS[state] }));
}

export function classStateKey(states: Iterable<ObjectiveResultState>): KeyEntry[] {
  const order: readonly ObjectiveResultState[] = ["strong", "developing", "needs-attention", "too-few-assessed", "not-assessed"];
  const present = new Set(states);
  return order.filter((state) => present.has(state))
    .map((state) => ({ label: CLASS_STATE_LABELS[state], description: CLASS_STATE_DESCRIPTIONS[state] }));
}

/** The three gradebook buckets, as a key. Always all three: the page always shows all three. */
export function levelBucketKey(): KeyEntry[] {
  return (["met", "short", "neverAsked"] as const)
    .map((bucket) => ({ label: LEVEL_BUCKET_LABELS[bucket], description: LEVEL_BUCKET_DESCRIPTIONS[bucket] }));
}

// ---------------------------------------------------------------------------
// Everything else a teacher reads a name for
// ---------------------------------------------------------------------------

/**
 * The nav label that names a framework, composed rather than typed.
 *
 * A New Jersey deployment must not read a New York acronym in its own navigation, and
 * nobody would find it by reading a component that had no other framework in it.
 * `frameworkNaming.test.ts` fails the build if a framework's short name appears in a
 * teacher-facing string anywhere outside this file.
 */
export const NAV_LABELS = {
  objectives: `${labelsFor(NAV_FRAMEWORK)?.unitNounShort ?? "Objective"}s`,
} as const;

/**
 * "1 student was", "3 students were" — one join, because two of them disagreed.
 *
 * A teacher-experience review read *"1 student were never asked this in their run"* on the
 * class page and said, plainly, that they could not parse it. The noun was pluralised and the
 * verb was not, which is what happens when the two are written out at the call site each time:
 * one of the four places that composes this sentence had a ternary on the noun and a literal
 * verb. This is the join, so a fifth place cannot get it wrong on its own.
 */
export function studentsWho(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? "student" : "students"} ${count === 1 ? singular : plural}`;
}
