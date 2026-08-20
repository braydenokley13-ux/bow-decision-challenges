import type { WorldId } from "../domain/core/ids";
import type { SubmissionRecord } from "../platform/classes/types";
import { buildSubmission } from "./runChallenge";
import { buildPopUpSubmission } from "./runPopUp";

/**
 * One complete, honest run per world — the harness every check that has to hold *for every
 * world* is driven from.
 *
 * ## Why this is a `Record` and not a lookup
 *
 * The type is total over `WorldId`. Adding a world to `WORLD_IDS` without adding a harness
 * here is a **compile error**, and that is the entire point of the file.
 *
 * Before this existed, three separate test files each kept their own two-entry map keyed by
 * world id, and each did `RUNS[world.id]()` on it. A third world reached those lines as
 * `undefined()` — a `TypeError` in a test that reads as a broken test rather than as a world
 * making a claim nothing had checked. Worse, the strongest guard in the product
 * (`contracts.test.ts` · *produces every requirement of every competency it claims*) iterates
 * `CONTRACTED_WORLDS`, so a world that declared coverage and never registered a contract was
 * not checked at all — it was skipped in silence.
 *
 * A recon pass proved what that costs. A single well-formed false row in
 * `BUILT_WORLD_COVERAGE` — a world claiming all four required rows of a competency it has no
 * observer for, correctly contract-stamped — passes `isCompetencyAvailable`,
 * `availableCompetencyIds`, `worldsAssessing`, `isAssessable`, `assessableStandards` and
 * `contractDrift`, reaches `MODULE_COVERAGE.md`, and would reach a district. The only thing
 * standing in its way was the world's own `coverage.test.ts`: a file the next world's author
 * has to remember to write.
 *
 * "Remember to write a file" is not a guarantee. A total record is.
 *
 * ## What a harness owes
 *
 * A real run through the world's own reducer, ending in a submission — not a fixture, not a
 * hand-built log. `coverageIsEarned.test.ts` reads the evidence out of whatever this returns
 * and holds the world's coverage claim to it, so a harness that quietly skipped the screens
 * where the hard evidence is raised would let the claim through. Drive the whole world.
 */
export const WORLD_RUNS: Record<WorldId, () => SubmissionRecord> = {
  basketball: () => buildSubmission({}),
  "food-truck": () => buildPopUpSubmission({}),
};
