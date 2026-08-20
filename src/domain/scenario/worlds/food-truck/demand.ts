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
/**
 * One more thing this world declares, which §9.2 has no field for and which the next person to
 * read these numbers needs: **nothing in Run the Pop-Up is hidden and nothing is rolled.**
 *
 * All four crowds are printed on the booth card before a booth is taken and again on the order
 * screen before an order is placed. A student who can multiply can work the whole market out
 * before the first Saturday, and a student red team did exactly that and reported it as a
 * dominant strategy. It is deliberate, and the reasons are worth having in one place:
 *
 * - The competencies assessed here are planning inside money that is actually there, and
 *   repairing a plan when a cost changes. Neither is forecasting demand. A hidden crowd would
 *   score a child's stocking partly on a roll, and put luck in the evidence.
 * - A consequence a student cannot trace back to a decision teaches nothing. "You were told
 *   Saturday 3 would be cold and you cooked for a warm one" is a lesson; "the crowd was small
 *   this time" is weather.
 * - A teacher has to be able to replay a run and get the same market, and `balance.ts` has to
 *   be able to sweep it. Neither survives a die.
 *
 * The cost is real and belongs in the declaration rather than in a defence of it: for a
 * student who wants to optimise, this world is arithmetic. What follows from that is not to
 * hide the numbers — it is that nothing in the run may present one axis as the score, which is
 * why `observer.ts` refuses to read any preference and why the ending now names the unit its
 * own comparisons are counted in.
 */
export const POP_UP_DEMAND: DemandProfile = {
  // Re-measured after the copy-clarity pass (`COPY_CONTRACT.md`), which is the reason this
  // number moved so far from the density pass's 3.41 rather than a little: Flesch–Kincaid
  // scores sentence length and syllables, and the pass's whole method was shortening sentences
  // to one idea apiece — "A first Saturday brings a booth the crowd it gets" (nine words, one
  // clause, grade ~2) became three plain sentences, each shorter still. The grade falling is
  // the instrument correctly reading shorter sentences; it is not a claim that the writing is
  // easier to *follow* than it was, which `COPY_CONTRACT.md`'s own companion check — not this
  // ruler — is what actually catches. Measured with `measureReading` over `popUpStudentCopy()`.
  readingGradeLevel: 2.66,
  // Two rulers reach this number and it has to satisfy both. `worldParity.test.ts` counts the
  // prose in `scenario.ts` — every branch, including the ending verdicts a single run never
  // prints — and `stages/readingLoad.test.tsx` renders the ten screens of the shortest
  // complete path and counts what is actually on the glass. The declaration sits between them,
  // inside fifteen per cent of each, because a number that matched one and not the other would
  // be true of a run nobody has.
  //
  // Re-measured after the copy-clarity pass. Splitting stacked and inverted sentences into one
  // plain clause apiece costs a few words per sentence — a subject named twice reads better
  // than a pronoun that has to reach back two sentences for its noun, and it is not free — so
  // the total rose a little even as most individual lines shortened. Counted with `countWords`
  // over `popUpStudentCopy().filter(isProse)`.
  totalWordsStudentReads: 2783,
  arithmeticOperations: 4,
  arithmeticComplexity: "multiply",
  // Nine now: the booth, the two pieces of conditional money, the three-way split, the first
  // Saturday's order, the standing order across two unequal nights, the friend on the window,
  // where the generator money comes from — and the tips jar, which is the only one of them
  // this world grades.
  decisionsRequired: 9,
  simultaneousConstraints: 2,
  adaptationEvents: 1,
  // `stages.ts` budgets the ten screens at 19m 22s, against 19m 20s across the eleven this
  // world used to have. The pitch screen and the ending's table are gone; the booths absorbed
  // the pitch's facts and now state four different crowds, the settle-up names what each call
  // did, and the first Saturday's takings buy a tips jar that three things want. Every one of
  // those additions was paid for out of what the two deletions returned, and the run is
  // two seconds longer than the eleven-screen version rather than shorter. The two seconds are
  // seventeen words, both of them answers to a student red team: the standing order says what
  // an order leaves on the stock line, which is the fact they lost the last Saturday of the
  // market for want of, and the settle-up says what its own comparisons are counted in, which
  // is the fact that turned "would have found $222 more" into a score in their reading of it.
  // `readingLoad.test.tsx` prices those seconds in words at a fixed rate rather than taking
  // this declaration's word for them.
  designMinutes: 22,
};
