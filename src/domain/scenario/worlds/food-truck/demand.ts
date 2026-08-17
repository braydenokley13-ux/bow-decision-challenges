import type { DemandProfile } from "../../demand";

/**
 * §9.2, for Run the Pop-Up. Every number is read off the world rather than off a student.
 *
 * - **Reading grade** measured on `scenario.ts` with the ruler in `scenario/readability.ts`,
 *   which is the same ruler `worldParity.test.ts` measures Basketball's copy with. The two
 *   worlds' copy sits about one grade apart under it, well inside the 1.5-grade band, and the
 *   test fails if new copy drifts either of them out.
 * - **Words** counted across the copy a student passes through on the one complete path this
 *   world has. There is no branch that skips a screen here, which is a real difference from
 *   Basketball and not one the profile equalises.
 * - **Arithmetic**: four sums the student types unaided — what the permit and the booth come
 *   to, what is left to plan with, what a tray order costs, and what is still owed on the
 *   generator once the deposit is put against it. The tray order is a multiply; the rest are
 *   add and subtract; nothing asks for a percentage.
 * - **Decisions that move money**: which booth, whether to count the catering job, whether to
 *   count the rebate, how the opening plan splits three ways, the first Saturday's order, the
 *   order for the two middle Saturdays, the friend on the window for the last one, and where
 *   the generator money comes from. Eight.
 * - **Simultaneous constraints**: money, and what the crowd at your spot will actually buy.
 *   Two. Spoilage is what happens when the second one is ignored, not a third constraint.
 * - **Adaptation events**: one. The generator, after the third Saturday. The catering job
 *   falling through is news the student has to live with, not a second repair — it lands on
 *   the same board, which is what makes an early misjudgement cost something later.
 * - **Design minutes**: `stages.ts` budgets the eleven screens at just over nineteen, and this
 *   allows the same margin over the budget that Basketball's declaration does, because a real
 *   student re-reads, hesitates and talks to the person next to them.
 *
 * These are declarations, not measurements of students. Fitting them to outcomes would turn a
 * checkable fact about the world into a claim about children.
 */
export const POP_UP_DEMAND: DemandProfile = {
  readingGradeLevel: 5.2,
  totalWordsStudentReads: 1020,
  arithmeticOperations: 4,
  arithmeticComplexity: "multiply",
  decisionsRequired: 8,
  simultaneousConstraints: 2,
  adaptationEvents: 1,
  designMinutes: 22,
};
