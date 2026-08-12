import { describe, expect, it } from "vitest";
import { PLAN_UNDER_PRESSURE_LAUNCH, PLAYABLE_WORLDS, WORLD_REGISTRY } from "./registry";

describe("world-ready registry", () => {
  it("ships Basketball as the finished world", () => {
    expect(WORLD_REGISTRY.basketball?.availability).toBe("available");
    expect(WORLD_REGISTRY.basketball?.scenario?.id).toBe("basketball");
  });

  it("registers only worlds a student can actually play", () => {
    expect(PLAYABLE_WORLDS.every((world) => world.scenario !== undefined)).toBe(true);
    expect(PLAYABLE_WORLDS.every((world) => world.availability === "available")).toBe(true);
  });

  it("skips the world choice while a single world is finished", () => {
    expect(PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld).toBe(false);
    expect(PLAN_UNDER_PRESSURE_LAUNCH.allowedWorlds).toEqual(["basketball"]);
  });
});
