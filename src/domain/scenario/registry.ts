import type { WorldId } from "../core/ids";
import { BASKETBALL_SCENARIO } from "./worlds/basketball";
import type { WorldRegistryEntry } from "./types";

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
