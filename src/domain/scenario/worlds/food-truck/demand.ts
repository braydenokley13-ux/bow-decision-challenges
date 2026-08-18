import type { DemandProfile } from "../../demand";

/**
 * §9.2, for Run the Pop-Up. Every number is read off the world rather than off a student.
 *
 * - **Reading grade** measured on `scenario.ts` with the ruler in `scenario/readability.ts`,
 *   which is the same ruler `worldParity.test.ts` measures Basketball's copy with. The two
 *   worlds' copy sits well inside the 1.5-grade band, and the test fails if new copy drifts
 *   either of them out.
 * - **Words** counted across the copy a student passes through on the one complete path this
 *   world has. There is no branch that skips a screen here, which is a real difference from
 *   Basketball and not one the profile equalises.
 *
 * **Both numbers moved when the screens shipped, and it is worth saying why rather than
 * leaving a diff to explain it.** The declaration used to describe the story alone: 961 words
 * of market prose reading 5.17. The screens then put another nine hundred words in front of
 * the student — what each control is called, what a night did, what the shop wants — and the
 * handoff rule is that all of it lives in `scenario.ts` and is measured. So the count rose to
 * what a student actually reads, and the grade fell to 3.5, because a screen speaks in short
 * fragments and Flesch–Kincaid reads a four-word status line as a very easy sentence. The
 * story's own prose still measures 5.2; the whole world measures 3.5, and the whole world is
 * what the profile is about.
 *
 * Two consequences are deliberate. The count includes every branch a student *could* read —
 * all four rebate verdicts, all four step-by-step hints — where only one of each is on any one
 * run, so the figure overstates rather than understates the load, which is the safe direction
 * for a comparability claim. And Basketball's 1180 counts its story only, because its screen
 * copy lives in JSX and `studentCopy.ts` where no ruler reaches it; the two are still inside
 * the §9.2 band, but the pair is not measuring quite the same thing yet and should be.
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
  // Re-measured after the density pass. Cutting the pitch screen, the settle table and three
  // summary sentences the ending's verdicts now say better took the copy from 3.78 to here.
  readingGradeLevel: 3.44,
  // Two rulers reach this number and it has to satisfy both. `worldParity.test.ts` counts the
  // prose in `scenario.ts` — every branch, including the twenty-six ending verdicts a single
  // run never prints — and measures 2290. `stages/readingLoad.test.tsx` renders the ten
  // screens of the shortest complete path and counts what is actually on the glass: 1932.
  // The declaration sits between them, inside fifteen per cent of each, because a number that
  // matched one and not the other would be true of a run nobody has.
  totalWordsStudentReads: 2120,
  arithmeticOperations: 4,
  arithmeticComplexity: "multiply",
  decisionsRequired: 8,
  simultaneousConstraints: 2,
  adaptationEvents: 1,
  // `stages.ts` budgets the ten screens at 18m 10s, down from 19m 20s across eleven: the
  // pitch screen is gone, the ending's table is gone, and the two screens that grew — the
  // booths, which absorbed the pitch's facts and now states four different crowds, and the
  // settle-up, which now names what each call did — were paid for out of the cut.
  designMinutes: 21,
};
