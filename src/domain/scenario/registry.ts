import type { WorldId } from "../core/ids";
import { BASKETBALL_SCENARIO } from "./worlds/basketball";
import type { WorldRegistryEntry } from "./types";

export const WORLD_REGISTRY: Record<WorldId, WorldRegistryEntry> = {
  basketball: {
    id: "basketball",
    title: BASKETBALL_SCENARIO.title,
    subtitle: "Step into Avery's eight-week run.",
    availability: "available",
    scenario: BASKETBALL_SCENARIO,
  },
  fashion: {
    id: "fashion",
    title: "Eight Weeks on Campaign",
    subtitle: "A second decision world is coming soon.",
    availability: "coming-soon",
  },
};

export const PLAN_UNDER_PRESSURE_LAUNCH = {
  challengeId: "plan-under-pressure" as const,
  allowedWorlds: ["basketball", "fashion"] as const,
  studentChoosesWorld: true,
};
