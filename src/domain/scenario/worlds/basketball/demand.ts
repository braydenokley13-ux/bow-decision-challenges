import type { DemandProfile } from "../../demand";

/**
 * §9.2, for Plan Under Pressure's basketball world. Every number is read off the world.
 *
 * - **Reading grade** measured on the student-facing copy in `scenario.ts` and
 *   `studentCopy.ts`, which are written to a Grade 5 floor.
 * - **Words** counted across the eight screens a student passes through on the shortest
 *   complete path, including the plan rows' own sentences.
 * - **Arithmetic**: four totals the student types unaided — the eight-week cost of the place
 *   they chose, what Avery can count on, what is already owed, and what Week 5 cost. All
 *   four are add/subtract or a single multiply-then-add; nothing asks for a percentage.
 * - **Decisions that move money**: which place to live, whether to count each of the two
 *   bonuses, how to split what is left, whether to reserve the course seat, whether to take
 *   the clinics, and whether the attendance bonus stays in the plan.
 * - **Simultaneous constraints**: money, and Avery's week. Two.
 * - **Adaptation events**: one. Week 5.
 * - **Design minutes**: the pacing table's own budget for the longest path.
 *
 * These are declarations, not measurements of students. Fitting them to outcomes would turn
 * a checkable fact about the world into a claim about children.
 */
export const BASKETBALL_DEMAND: DemandProfile = {
  // Re-measured with `scenario/readability.ts` — the one ruler both worlds' copy goes
  // through — when the second world shipped its own. The original 5.4 came from an
  // instrument this repository does not contain, and a declared fact §9.2 calls checkable
  // has to come from the ruler that checks it.
  readingGradeLevel: 4.2,
  totalWordsStudentReads: 1180,
  arithmeticOperations: 4,
  arithmeticComplexity: "multiply",
  decisionsRequired: 7,
  simultaneousConstraints: 2,
  adaptationEvents: 1,
  designMinutes: 23,
};
