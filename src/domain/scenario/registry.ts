import type { WorldId } from "../core/ids";
import { BASKETBALL_SCENARIO } from "./worlds/basketball";
import { SCENARIO_NUMBERS } from "./numbers";
import type { ScenarioNumbers, WorldRegistryEntry, WorldScenario } from "./types";

/**
 * The registry stays world-neutral so a second story can be added without touching
 * the finance, evidence, or scoring layers. Only worlds with a finished scenario are
 * registered — an unfinished world is absent rather than present-and-disabled, so no
 * surface can advertise something a student cannot play.
 */
export const WORLD_REGISTRY: Partial<Record<WorldId, WorldRegistryEntry>> = {
  basketball: {
    id: "basketball",
    title: BASKETBALL_SCENARIO.title,
    subtitle: "Step into Avery's eight-week run.",
    availability: "available",
    scenario: BASKETBALL_SCENARIO,
  },
};

export const PLAYABLE_WORLDS: readonly WorldRegistryEntry[] = Object.values(WORLD_REGISTRY);

export const DEFAULT_WORLD_ID: WorldId = "basketball";

export function isPlayableWorld(id: string): id is WorldId {
  return PLAYABLE_WORLDS.some((world) => world.id === id);
}

/**
 * The story a world tells, and the economy it runs on, looked up rather than imported.
 *
 * Every screen and every reducer used to reach for `BASKETBALL_SCENARIO` and
 * `SCENARIO_NUMBERS` by name. That is the defect that made a second world impossible and
 * would have made it dangerous: an attempt whose `worldId` said one thing while the
 * arithmetic pricing it came from another would produce evidence about a world the student
 * was never in.
 *
 * A world with no scenario registered falls back to the default rather than throwing. A
 * student mid-attempt is not a place to discover a configuration mistake, and the id that
 * got there is already recorded on every event in their log.
 */
export function scenarioFor(worldId: WorldId): WorldScenario {
  return WORLD_REGISTRY[worldId]?.scenario ?? BASKETBALL_SCENARIO;
}

export function numbersFor(worldId: WorldId): ScenarioNumbers {
  return WORLD_REGISTRY[worldId]?.scenario.numbers ?? SCENARIO_NUMBERS;
}

/**
 * Students pick a world only once more than one is finished. With a single world the
 * choice screen is an empty decision, so the challenge opens directly in that world.
 */
export const PLAN_UNDER_PRESSURE_LAUNCH = {
  challengeId: "plan-under-pressure" as const,
  get allowedWorlds(): readonly WorldId[] {
    return PLAYABLE_WORLDS.map((world) => world.id);
  },
  get studentChoosesWorld(): boolean {
    return PLAYABLE_WORLDS.length > 1;
  },
};
