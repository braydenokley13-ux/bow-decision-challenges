import type { ReasoningCriterionId } from "./types";

/**
 * The rubric a person uses to score what a student wrote.
 *
 * Four criteria, ten points, and it is the only part of this product a machine does not
 * touch: the writing is never sent to a model, the student is told a person will read it,
 * and the number on the other side of that reading is a person's.
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
  { id: "C6.3", label: "Tradeoff / opportunity cost", hint: "Names what that choice cost them", max: 2 },
  { id: "C6.4", label: "Numerical evidence", hint: "Two accurate, relevant numbers from their own plan", max: 4 },
] as const;

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
