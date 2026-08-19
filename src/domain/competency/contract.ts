import { requiredEvidenceRequirementsFor } from "./competencies";
import type { CompetencyId } from "./types";

/**
 * A fingerprint of what a competency currently requires.
 *
 * **This exists because of one failure, and it is worth naming.** A world was designed against
 * `is-the-add-on-worth-it` when it had four required rows. The competency gained a fifth — a
 * required explanation, added because the objective's verb is *analyze* and nothing was asking
 * the student to say anything. The design was not re-read, the court that judged it scored the
 * designer's own rubric rather than the shipped one, and the coverage that reached a summary
 * was wrong by two objectives. Nothing in the build was capable of noticing.
 *
 * The shape of that failure is general: **a competency's required set is a contract, and
 * everything downstream of it — a world's observer, a coverage claim, a verdict — is written
 * against a particular version of it.** When the contract moves, the things written against it
 * are stale, and staleness that nothing detects is indistinguishable from correctness.
 *
 * So a world records the fingerprint it was built against, and `worldContractFreshness.test.ts`
 * fails the build when the two disagree. It does not guess whether the world still works — that
 * is a person's judgement, and often the answer is that one new row needs producing. It says
 * *this world was built against a different contract than the one that ships*, which is the
 * fact nobody had.
 *
 * **The fingerprint covers required ids and their kinds, and nothing else.** Not the wording of
 * a rule, not a label, not a misconception: those change without changing what a world has to
 * produce, and a fingerprint that moved on a typo would be re-stamped without being read, which
 * is how a guard becomes a formality. Adding a required row, removing one, or turning a
 * decision into an explanation all move it, because all three change what the world must do.
 */
export function competencyContract(id: CompetencyId): string {
  const required = requiredEvidenceRequirementsFor(id);
  if (required.length === 0) return `${id}:none`;
  // Sorted, so the order rows happen to be written in is not part of the contract.
  const rows = [...required]
    .map((requirement) => `${requirement.id}/${requirement.kind}`)
    .sort()
    .join(",");
  return `${id}:${required.length}:${fingerprint(rows)}`;
}

/**
 * A short, stable digest. Not a security hash — nothing is defended by it — and deliberately
 * short enough to read in a diff, because a person comparing two of these by eye is the whole
 * point of writing it down.
 */
function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** What changed between a stored fingerprint and the current one, in words a person can act on. */
export function contractDrift(id: CompetencyId, stamped: string): string | null {
  const current = competencyContract(id);
  if (current === stamped) return null;
  const was = Number(stamped.split(":")[1] ?? NaN);
  const now = requiredEvidenceRequirementsFor(id).length;
  if (Number.isFinite(was) && was !== now) {
    return `${id} required ${was} rows when this was written and requires ${now} now`;
  }
  return `${id}'s required rows have changed shape since this was written`;
}
