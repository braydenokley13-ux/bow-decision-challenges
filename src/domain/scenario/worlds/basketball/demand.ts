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
 *   bonuses, how to split what is left, how to settle Week 3's three competing claims,
 *   whether to reserve the course seat, whether to take the clinics, and whether the
 *   attendance bonus stays in the plan. Saying which value drove the Week 3 call is counted
 *   with the call rather than beside it: it is one decision stated twice, not two.
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
  // Re-measured again for the copy-clarity pass (`COPY_CONTRACT.md`), which rewrote every
  // student-facing sentence in `scenario.ts` for one idea per sentence, subject before verb,
  // and no idiom or metaphor in a label. Shorter, more numerous sentences move
  // `wordsPerSentence` down; the measured grade is 3.72, and 3.87 was still inside the 0.5
  // tolerance but was a claim about the old prose, not this one.
  readingGradeLevel: 3.72,
  // Was 1180, asserted on nothing. It counted the world's story — the strings in
  // `scenario.ts` — and not the run: a critic who played the whole thing and counted what was
  // on the glass measured 3,167, and the only test looking at this field was the pop-up's,
  // which filtered through `isProse` and so could not see a button, a table header or a money
  // figure. This number is now the one `stages/readingLoad.test.tsx` renders and counts,
  // screen by screen along the shortest complete path, and that test fails if the two drift.
  // Re-measured again after the copy-clarity pass: splitting stacked clauses into short,
  // explicit-subject sentences adds a handful of repeated words ("Avery", "the bonus") back
  // in, so the rendered count moved from 2,367 to 2,396 — 1.2% of itself, well inside the 15%
  // the parity test allows, and declared at the number actually rendered rather than left at
  // a figure that happened to still clear the band.
  totalWordsStudentReads: 2396,
  arithmeticOperations: 4,
  arithmeticComplexity: "multiply",
  decisionsRequired: 8,
  simultaneousConstraints: 2,
  adaptationEvents: 1,
  // Was 23 against a pacing table that budgeted 19m45s. The table now budgets 23m20s honestly
  // — the biggest correction being `working-plan`, which renders 491 words against a declared
  // 165 seconds — and this carries the same margin over it that Run the Pop-Up carries over
  // its own, which is what §9.2's margin check is for.
  designMinutes: 27,
};
