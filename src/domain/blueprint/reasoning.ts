import type { ConceptDefinition, ReasoningCriterionId } from "./types";

/**
 * The rubric a person uses to score what a student wrote.
 *
 * Four criteria, and what they add up to is worked out from them rather than written down
 * anywhere — see `reasoningMaximumOf`. It is the only part of this product a machine does
 * not touch: the writing is never sent to a model, the student is told a person will read
 * it, and the number on the other side of that reading is a person's.
 *
 * It moved out of the review screen and into the blueprint because two things now read it —
 * the screen that renders it, and the world observer that restates the person's judgement as
 * evidence about a competency. Two copies of a rubric is two rubrics, and the second one
 * would drift silently.
 */
export interface ReasoningCriterion {
  id: ReasoningCriterionId;
  label: string;
  /** What earns the marks, in the words a teacher reads while marking. */
  hint: string;
  max: number;
}

export const REASONING_CRITERIA: readonly ReasoningCriterion[] = [
  { id: "C6.1", label: "Workability", hint: "Explains why the final plan actually holds", max: 2 },
  { id: "C6.2", label: "Protected priority", hint: "Names what they chose to keep, and why", max: 2 },
  // One name, hyphenated. It read "Tradeoff / opportunity cost": two names for one idea
  // offered in the same breath, in a four-item list where the other three are single noun
  // phrases — and the hint underneath already says what it means. The hyphen matches
  // `competencies.ts`'s "Explains the trade-off made", which is the sentence a teacher reads
  // about the same student on the same page.
  { id: "C6.3", label: "Trade-off", hint: "Names what that choice cost them", max: 2 },
  { id: "C6.4", label: "Numerical evidence", hint: "Two accurate, relevant numbers from their own plan", max: 4 },
] as const;

/**
 * What a rubric is out of, summed from it rather than declared beside it.
 *
 * A teacher reads a fraction — `8/10` in the reading queue and again on the class page. The
 * top of it is `reasoningTotal` over the criteria above; the bottom has to be the same
 * list's arithmetic or it is not a fraction. It takes the criteria as an argument instead
 * of reading `REASONING_CRITERIA` itself so `reasoningMaximumFrom` can be asked about a
 * fifth criterion nobody has added yet, which is the only moment the question matters.
 */
export function reasoningMaximumOf(criteria: readonly Pick<ReasoningCriterion, "max">[]): number {
  return criteria.reduce((total, criterion) => total + criterion.max, 0);
}

/**
 * The same number, having checked that the blueprint still agrees with it.
 *
 * Ten is stated twice on purpose and has to be stated twice: here as 2/2/2/4, the shape of
 * the marking a person does, and in `concepts.ts` as `weight: 10`, C6's share of the
 * hundred the whole assessment is out of. Neither can be derived from the other — a rubric
 * does not know what fraction of a course it is worth, and a weight does not know how the
 * marking is broken up. What was missing is that nothing compared them, so a fifth
 * criterion worth 2 added here and not there would have left the screen printing the new
 * total over the old maximum: `12/10`, on a teacher's report of a child, with a green
 * suite. The suite was green because there was no assertion to fail — `REASONING_MAXIMUM`
 * read the weight, the screen read the criteria, and the two tens were never introduced.
 *
 * Refusing to load is the right severity. This is authored data, fixed at build time, so
 * the condition is either false for every user of a build or true for none of them, and
 * every test that touches grading imports this module — the failure lands on the person who
 * made the edit, seconds after they made it, rather than on a teacher reading a number that
 * cannot be right.
 */
export function reasoningMaximumFrom(
  criteria: readonly Pick<ReasoningCriterion, "max">[],
  concepts: readonly ConceptDefinition[],
): number {
  const rubric = reasoningMaximumOf(criteria);
  const weight = concepts.find((concept) => concept.id === "financial-defense")?.weight;
  if (weight !== rubric) {
    throw new Error(
      `The written-reasoning rubric adds up to ${rubric} and the blueprint weights C6 ${weight ?? "not at all"}. `
      + "A teacher's screen prints the first over the second, so they have to be one number: "
      + "add the criterion's marks to `financial-defense`'s weight in `concepts.ts`.",
    );
  }
  return rubric;
}

/** A person's marks, criterion by criterion. Absent until somebody has read the writing. */
export type ReasoningScores = Partial<Record<ReasoningCriterionId, number>>;

export function reasoningCriterionById(id: ReasoningCriterionId): ReasoningCriterion | undefined {
  return REASONING_CRITERIA.find((criterion) => criterion.id === id);
}

/** Marks in, total out, each one held to its own maximum wherever it arrived from. */
export function reasoningTotal(scores: ReasoningScores): number {
  return REASONING_CRITERIA.reduce((total, criterion) => total + clampCriterion(criterion.id, scores[criterion.id] ?? 0), 0);
}

export function clampCriterion(id: ReasoningCriterionId, value: number): number {
  const criterion = reasoningCriterionById(id);
  if (!criterion) return 0;
  return Math.min(criterion.max, Math.max(0, Math.round(value)));
}
