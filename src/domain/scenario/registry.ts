import type { WorldId } from "../core/ids";
import type { StageId } from "../evidence/types";
import { BASKETBALL_SCENARIO } from "./worlds/basketball";
import { POP_UP_SCENARIO, POP_UP_STAGES } from "./worlds/food-truck";
import { STAGE_ORDER } from "../machine/stages";
import { SCENARIO_NUMBERS } from "./numbers";
import type { ScenarioNumbers, WorldRegistryEntry, WorldStory } from "./types";

/**
 * The registry stays world-neutral so a second story can be added without touching the
 * finance, evidence, or scoring layers. Only worlds with a finished scenario are registered —
 * an unfinished world is absent rather than present-and-disabled, so no surface can advertise
 * something a student cannot play.
 *
 * What the registry holds about a world is deliberately thin: what it is called, the line on
 * its card, how long to allow, and which stages its own machine can be in. Everything else —
 * the economy, the decisions, the mechanics — lives in the world's own module, because §7.1
 * says the interior belongs to the world and a registry that knew all of it would be a world
 * template with two entries in it.
 */
export const WORLD_REGISTRY: Partial<Record<WorldId, WorldRegistryEntry>> = {
  basketball: {
    id: "basketball",
    title: BASKETBALL_SCENARIO.title,
    subtitle: "Step into Avery's eight-week run.",
    durationMinutes: { min: 20, max: 25 },
    availability: "available",
    stages: STAGE_ORDER,
    scenario: BASKETBALL_SCENARIO,
  },
  "food-truck": {
    id: "food-truck",
    title: POP_UP_SCENARIO.title,
    subtitle: POP_UP_SCENARIO.subtitle,
    durationMinutes: { min: 18, max: 24 },
    availability: "available",
    // Plus the two screens that belong to the platform rather than to either world: an
    // attempt saved on the join screen is a real attempt and has to restore.
    stages: ["entry", "join", "choose-world", ...POP_UP_STAGES],
    scenario: POP_UP_SCENARIO,
  },
};

export const PLAYABLE_WORLDS: readonly WorldRegistryEntry[] = Object.values(WORLD_REGISTRY);

export const DEFAULT_WORLD_ID: WorldId = "basketball";

export function isPlayableWorld(id: string): id is WorldId {
  return PLAYABLE_WORLDS.some((world) => world.id === id);
}

/** The stages a world's machine can be in, or an empty list for a world nobody has built. */
export function stagesFor(worldId: WorldId): readonly StageId[] {
  return WORLD_REGISTRY[worldId]?.stages ?? [];
}

/**
 * The story a world tells, looked up rather than imported.
 *
 * Every screen and every reducer used to reach for `BASKETBALL_SCENARIO` by name. That is the
 * defect that made a second world impossible and would have made it dangerous: an attempt
 * whose `worldId` said one thing while the story on screen came from another would produce
 * evidence about a world the student was never in.
 *
 * A world with no scenario registered falls back to the default rather than throwing. A
 * student mid-attempt is not a place to discover a configuration mistake, and the id that got
 * there is already recorded on every event in their log.
 */
export function scenarioFor(worldId: WorldId): WorldStory {
  return WORLD_REGISTRY[worldId]?.scenario ?? BASKETBALL_SCENARIO;
}

/**
 * The board economy Plan Under Pressure's shared finance layer prices against.
 *
 * It is Basketball's, and it is deliberately not every world's. §7.1 says a world's interior
 * is its own, and Run the Pop-Up prices trays, crowds and food that goes in the bin — none of
 * which `ScenarioNumbers` can express. A world that is not in this map does not use the shared
 * board at all: its own machine prices its own decisions with its own numbers, and asking here
 * for its economy is a caller mistake rather than a missing entry.
 *
 * The fallback stays for the reason it was written: a student mid-attempt is not the place to
 * discover a configuration error, and every event in their log already records which world
 * they are really in.
 */
const SHARED_BOARD_NUMBERS: Partial<Record<WorldId, ScenarioNumbers>> = {
  basketball: SCENARIO_NUMBERS,
};

export function numbersFor(worldId: WorldId): ScenarioNumbers {
  return SHARED_BOARD_NUMBERS[worldId] ?? SCENARIO_NUMBERS;
}

/** Whether this world's plan boards are the shared ones `finance/` prices. */
export function usesSharedBoard(worldId: WorldId): boolean {
  return SHARED_BOARD_NUMBERS[worldId] !== undefined;
}

/**
 * Whether the screen where a student picks a world exists yet.
 *
 * The launch derives choice from how many worlds are playable, and the day the second world's
 * domain landed that arithmetic routed every new session onto a `"choose-world"` stage nothing
 * rendered — a student typed their code and met the join form again. The picker is a screen,
 * and a screen that does not exist cannot be where a session starts. The UI phase flips this
 * with the screen in the same change.
 */
export const WORLD_CHOICE_UI_READY = false;

/**
 * Students pick a world only once more than one is finished and the picker itself is built.
 * With a single world the choice screen is an empty decision, so the challenge opens directly
 * in that world.
 */
export const PLAN_UNDER_PRESSURE_LAUNCH = {
  challengeId: "plan-under-pressure" as const,
  get allowedWorlds(): readonly WorldId[] {
    return PLAYABLE_WORLDS.map((world) => world.id);
  },
  get studentChoosesWorld(): boolean {
    return WORLD_CHOICE_UI_READY && PLAYABLE_WORLDS.length > 1;
  },
};
