import type { ReasoningScores } from "../blueprint/reasoning";
import type { WorldEvidenceCoverage } from "../competency/availability";
import type { EvidenceRequirementObservation } from "../competency/types";
import type { WorldId } from "../core/ids";
import type { EvidenceEvent } from "../evidence/types";
import { observeBasketballFromLog } from "./worlds/basketball/observer";
import { scoredExplanationsFrom } from "./worlds/basketball/writtenDefense";
import { BASKETBALL_DEMAND } from "./worlds/basketball/demand";
import { observePopUpFromLog } from "./worlds/food-truck/observer";
import { popUpScoredExplanationsFrom } from "./worlds/food-truck/writtenAnswer";
import { POP_UP_DEMAND } from "./worlds/food-truck/demand";
import { POP_UP_COVERAGE } from "./worlds/food-truck/coverage";
import { BUILT_WORLD_COVERAGE } from "../competency/availability";
import type { DemandProfile } from "./demand";

/**
 * §7.2 — what a world owes the product, as one object.
 *
 * A world used to be reached three different ways: its story by importing
 * `BASKETBALL_SCENARIO`, its economy by importing `SCENARIO_NUMBERS`, and its assessment by
 * importing its observer. Three static imports, none of them keyed by the world an attempt
 * says it is in — so a second world was not merely unbuilt, it was unreachable by anything
 * that had to decide *which* world it was talking about.
 *
 * **The split is deliberate.** The story and the numbers live in `registry.ts`, which the
 * student screens import. The assessment lives here, which they do not. A world's own
 * `index.ts` re-exports only the story for the same reason: the bundle a student downloads
 * must not contain the code that judges them, and the moment those two live in one module
 * that guarantee is gone.
 *
 * `observe` is stated in the shared vocabulary and takes nothing world-specific. A world
 * that needed the contract widened to admit its own shape would be a world whose evidence
 * does not pool with anybody's, which is the one thing the multiple-world thesis cannot
 * survive.
 */
export interface WorldContract {
  id: WorldId;
  /**
   * The log in, the shared observations out.
   *
   * `reasoningCriteria` is a person's marks on the written explanation. It is passed rather
   * than inferred, and a world that has not been given it produces no level for its
   * explanation requirements — never a zero. §10.6 forbids BOW grading student writing, and
   * the contract is where that refusal has to be structural rather than remembered.
   */
  observe: (
    log: readonly EvidenceEvent[],
    options?: { reasoningCriteria?: ReasoningScores | undefined },
  ) => readonly EvidenceRequirementObservation[];
  /** What this world claims it can produce. `worldEvidenceCoverage.test.ts` checks the claim. */
  coverage: readonly WorldEvidenceCoverage[];
  /** §9.2. Facts about the world, declared, and held to the parity bands. */
  demandProfile: DemandProfile;
}

const BASKETBALL: WorldContract = {
  id: "basketball",
  observe: (log, options) =>
    observeBasketballFromLog(log, {
      ...(scoredExplanationsFrom(options?.reasoningCriteria) ? { scoredExplanations: scoredExplanationsFrom(options?.reasoningCriteria)! } : {}),
    }),
  coverage: BUILT_WORLD_COVERAGE.filter((claim) => claim.worldId === "basketball"),
  demandProfile: BASKETBALL_DEMAND,
};

/**
 * Run the Pop-Up.
 *
 * The two contracts are the same three fields and share not one line of implementation. That
 * is the whole thesis in one object: the observers read completely different logs by
 * completely different rules, and what comes out of both is the same named evidence about the
 * same two competencies, on the same rubric, which the engine below rolls up without ever
 * learning which world it is holding.
 */
const FOOD_TRUCK: WorldContract = {
  id: "food-truck",
  observe: (log, options) => {
    const scored = popUpScoredExplanationsFrom(options?.reasoningCriteria);
    return observePopUpFromLog(log, { ...(scored ? { scoredExplanations: scored } : {}) });
  },
  coverage: POP_UP_COVERAGE,
  demandProfile: POP_UP_DEMAND,
};

export const WORLD_CONTRACTS: Partial<Record<WorldId, WorldContract>> = {
  basketball: BASKETBALL,
  "food-truck": FOOD_TRUCK,
};

export const CONTRACTED_WORLDS: readonly WorldContract[] = Object.values(WORLD_CONTRACTS);

/**
 * The contract for a world, or `undefined`.
 *
 * Undefined rather than a fallback. A caller reading evidence has to know it is holding
 * nothing, because the alternative is observing one world's log with another world's rules
 * and publishing the result under a child's name.
 */
export function contractFor(worldId: WorldId): WorldContract | undefined {
  return WORLD_CONTRACTS[worldId];
}

/** Every contracted world's declared demand, for the parity check. */
export function demandProfiles(): ReadonlyMap<WorldId, DemandProfile> {
  return new Map(CONTRACTED_WORLDS.map((contract) => [contract.id, contract.demandProfile]));
}
