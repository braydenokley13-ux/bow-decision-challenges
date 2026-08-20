import { worldsAssessing, type WorldEvidenceCoverage } from "../../domain/competency/availability";
import type { WorldId } from "../../domain/core/ids";
import { isPlayableWorld } from "../../domain/scenario/registry";
import { demandFor, standardByRef } from "../../domain/standards";
import type { StandardRef } from "../../domain/standards/types";

/**
 * Which worlds can legitimately be offered for a learning objective.
 *
 * This is the mechanism behind the product's central sentence — *a teacher chooses what
 * students should learn, and BOW finds experiences capable of generating the required
 * evidence.* Until this file, that sentence was true and had nothing under it. What a teacher
 * was actually shown came from `PLAYABLE_WORLDS`, which is the **story** registry: it knows a
 * world's title and how long it runs and nothing whatever about evidence. The service, for
 * its part, checked `allowedWorldIds` against `BUILT_WORLD_IDS` — the set of worlds that
 * claim *something*, never joined to the objective in the same request.
 *
 * Two shipped worlds that both produce all three built competencies made that invisible. The
 * first world producing a different set would have published a false compatibility claim to a
 * district, which is the one failure this product has decided it will not have.
 *
 * ## Why the join lives here and not in the standards layer
 *
 * It cannot live in `domain/standards`: a framework describes a state's objectives and has no
 * idea any world exists, which is what makes adding a second state a mapping file rather than
 * a rebuild (`spineSeparation.test.ts` · *keeps worlds out of*). It cannot live in
 * `domain/competency` either: a competency does not know which framework names it, and that
 * layer may not import standards at all.
 *
 * So the join belongs above both, in the layer that assembles domain pieces into a product —
 * and an assignment is exactly the thing that holds an objective and a set of worlds in one
 * record. The one-way rule is preserved: this file imports all three layers and none of them
 * imports it.
 */

/**
 * Which worlds can, **on their own**, produce the evidence this objective demands.
 *
 * "On their own" is load-bearing, and it is a decision rather than an observation.
 * `isAssessable` asks whether each competency an objective needs is available *somewhere* —
 * the right question for *can BOW assess this at all*, and the wrong one here.
 *
 * A student plays one world. If an objective needs two competencies and no single world
 * produces both, then every student who picks a world produces partial evidence, and a screen
 * reporting that objective as covered would be inflating coverage one child at a time. So a
 * completion rule takes the **intersection**: a world qualifies only if it carries every part
 * itself. Without a completion rule the objective is met by any one `full`-mapped competency,
 * so the answer is the **union** — producing one of them is genuinely enough.
 *
 * Order is stable, so a teacher's list does not reshuffle between two identical requests.
 */
export function worldsProducingEvidenceFor(
  ref: StandardRef,
  coverage?: readonly WorldEvidenceCoverage[],
): readonly WorldId[] {
  if (standardByRef(ref) === undefined) return [];
  const demand = demandFor(ref);

  if (demand.allOf.length > 0) {
    const [first, ...rest] = demand.allOf.map((id) => worldsAssessing(id, coverage));
    if (first === undefined) return [];
    const everyPart = rest.reduce<readonly WorldId[]>(
      (kept, produced) => kept.filter((world) => produced.includes(world)),
      first,
    );
    return [...new Set(everyPart)].sort();
  }

  return [...new Set(demand.anyOf.flatMap((id) => worldsAssessing(id, coverage)))].sort();
}

/**
 * Whether one named world can produce the evidence this objective demands.
 *
 * The single-world form, for the write path: a service storing "objective 1.3, worlds [x, y]"
 * has to be able to refuse `y`.
 */
export function worldProducesEvidenceFor(
  ref: StandardRef,
  worldId: WorldId,
  coverage?: readonly WorldEvidenceCoverage[],
): boolean {
  return worldsProducingEvidenceFor(ref, coverage).includes(worldId);
}

/**
 * The worlds a teacher may actually be offered for one objective.
 *
 * Two conditions, and both are load-bearing:
 *
 *   1. **The world can produce the evidence** — `worldsProducingEvidenceFor`, above.
 *   2. **A student can get into it** — a world can be evidentially perfect and have no
 *      scenario registered, and offering one is a teacher publishing work nobody can open.
 *
 * `builtWorldIds` is passed in rather than imported so this module does not have to reach
 * back into the assignment record it is used by; it is the pre-objective answer only.
 *
 * A `null` objective is the pre-objective class (§17.3): nobody chose an objective, so there
 * is nothing to be compatible *with*, and every playable built world is offerable.
 */
export function compatibleWorldsFor(
  objectiveRef: StandardRef | null,
  builtWorldIds: readonly WorldId[],
  coverage?: readonly WorldEvidenceCoverage[],
): readonly WorldId[] {
  const evidential = objectiveRef === null
    ? builtWorldIds
    : worldsProducingEvidenceFor(objectiveRef, coverage);
  return evidential.filter((worldId) => isPlayableWorld(worldId));
}
