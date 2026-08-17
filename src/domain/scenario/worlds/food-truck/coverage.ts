import type { WorldEvidenceCoverage } from "../../../competency/availability";
import { BUILT_WORLD_COVERAGE } from "../../../competency/availability";
import type { CompetencyId } from "../../../competency/types";

/**
 * What Run the Pop-Up claims it can produce — earned by an observer, not declared by a plan.
 *
 * The rows themselves live in `competency/availability.ts` beside Basketball's, because that
 * array is the sentence a district eventually reads as "BOW can assess this" and it is worth a
 * person being able to read every world's claim in one place. This file is the world's end of
 * the join: it selects its own rows, and `coverage.test.ts` beside it fails the build if the
 * claim there ever names a requirement `observer.ts` has no route for, or leaves out one it
 * does.
 */
export const POP_UP_COVERAGE: readonly WorldEvidenceCoverage[] = BUILT_WORLD_COVERAGE.filter(
  (claim) => claim.worldId === "food-truck",
);

/**
 * Competencies this world was examined against and does not produce, with the reason.
 *
 * **`save-toward-a-goal`.** Your cut is money being put aside on purpose, so this was examined
 * requirement by requirement, and every one of them fails the same way Basketball's did: the
 * target, the deadline, the per-period figure and whether the line survives are all the
 * *student's strategy* here, and `balance.ts` sweeps this market specifically to prove that no
 * strategy is the right one. Producing evidence about them would mean scoring a preference,
 * which is the one thing neither world may do.
 *
 * There is a second reason to leave it uncovered rather than reach for it, and it is the one
 * that matters for the product's central claim: Basketball produces none of this competency
 * either. A pop-up that claimed it would put a competency on a teacher's screen that only one
 * of two worlds could ever produce, and a student who chose the other story would be measured
 * on less. §9.1 is the claim that the choice of story does not change what is measured, and
 * the honest way to keep it is to leave a gap in both worlds rather than close it in one.
 *
 * **`plan-for-the-unexpected`.** This world does produce evidence about it — the cushion is
 * exactly a lower-resource version of a plan built before knowing what will go wrong, and the
 * generator is the thing that goes wrong. It stays unlisted for the same reason Basketball's
 * does: that competency's evidence requirements are an empty array, nobody has written what
 * would count, and an implementer inventing them would be inventing a rubric row, a reteach
 * card and a claim about a student. `coverage.test.ts` fails the moment somebody writes them.
 */
export const POP_UP_NOT_PRODUCED: readonly { competencyId: CompetencyId; because: string }[] = [
  {
    competencyId: "save-toward-a-goal",
    because: "The size of the cut, whether it survives the generator and what it is for are the student's strategy, and this world refuses to grade a strategy. Basketball produces none of it either, so leaving it uncovered is what keeps the two worlds measuring the same things.",
  },
  {
    competencyId: "plan-for-the-unexpected",
    because: "The world produces the evidence and the competency has no evidence requirements written yet. Inventing them here would be inventing a rubric row rather than routing one.",
  },
];
