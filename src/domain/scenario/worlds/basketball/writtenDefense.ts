import { REASONING_CRITERIA, type ReasoningScores } from "../../../blueprint/reasoning";
import type { RubricLevel } from "../../../competency/types";
import type { ScoredExplanations } from "./observer";

/**
 * What a person's reading of the writing says about each explanation requirement.
 *
 * **Nothing here scores writing.** Every number this reads was typed by a teacher who read
 * the student's own words against the four criteria in `blueprint/reasoning.ts`. What this
 * does is restate that judgement on the common rubric, so the same reading can stand behind
 * a competency result the way a decision observation does. §10.6 forbids BOW inferring a
 * level for an explanation; it does not ask a teacher to mark the same paragraph twice on
 * two different scales.
 *
 * The mapping is criterion by criterion rather than banded off the ten-point total, because
 * the requirements ask for different things and the total cannot tell them apart. A student
 * who explained the trade-off perfectly and quoted no numbers, and one who quoted four
 * numbers and named no trade-off, can reach the same total and have met opposite halves of
 * `plan-within-income.er5`.
 *
 * | Requirement | What it asks (§10.2) | Which marks answer it |
 * | --- | --- | --- |
 * | `plan-within-income.er5` | Names something given up, says what it was given up for, refers to one of their own numbers | tradeoff + priority + numbers |
 * | `adapt-a-plan.er5` | Names what they refused to cut and why | priority |
 *
 * Workability is scored and used by neither: "why the plan holds" is a claim about the plan
 * rather than about a trade-off or a protected line, and filing it under a requirement it
 * does not answer would put marks behind a sentence they were not given for.
 */

/** The parts of `plan-within-income.er5`, and the mark that answers each. */
const TRADE_OFF_PARTS = ["C6.3", "C6.2", "C6.4"] as const;

/** The single part of `adapt-a-plan.er5`. */
const PROTECTED_PART = "C6.2" as const;

/**
 * Marks → a level, for a requirement built of several parts.
 *
 * The shape follows §10.3 without inventing a sixth level: everything asked for, at full
 * marks, is 5; everything present but one part short of full is 4; a part missing entirely
 * is a real gap and reads 2; more than one missing is 0. There is no 3, deliberately — 3 is
 * "right after a direct hint", and a hint is not a thing that happens to a paragraph a
 * student wrote days before anybody read it.
 */
function levelFrom(parts: readonly { earned: number; max: number }[]): RubricLevel {
  const missing = parts.filter((part) => part.earned === 0).length;
  // Nothing the requirement asked for was there. That holds however many parts it has, and
  // it is the case a "one part missing is partial" rule gets wrong on a single-part one.
  if (missing === parts.length) return 0;
  if (missing > 1) return 0;
  if (missing === 1) return 2;
  return parts.every((part) => part.earned === part.max) ? 5 : 4;
}

function partsOf(scores: ReasoningScores, ids: readonly string[]): { earned: number; max: number }[] {
  return ids.flatMap((id) => {
    const criterion = REASONING_CRITERIA.find((entry) => entry.id === id);
    return criterion ? [{ earned: Math.min(criterion.max, Math.max(0, scores[criterion.id] ?? 0)), max: criterion.max }] : [];
  });
}

/**
 * The two explanation requirements, from one person's marks — or nothing at all.
 *
 * An unread piece of writing produces no levels rather than zeros. "Nobody has read this
 * yet" and "this student explained nothing" are different sentences, and only the second is
 * a fact about a student.
 */
export function scoredExplanationsFrom(scores: ReasoningScores | undefined): ScoredExplanations | undefined {
  if (!scores || REASONING_CRITERIA.every((criterion) => scores[criterion.id] === undefined)) return undefined;
  return {
    "plan-within-income.er5": levelFrom(partsOf(scores, TRADE_OFF_PARTS)),
    "adapt-a-plan.er5": levelFrom(partsOf(scores, [PROTECTED_PART])),
  };
}
