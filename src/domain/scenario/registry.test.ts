import { describe, expect, it } from "vitest";
import { isPlayableWorld, numbersFor, PLAN_UNDER_PRESSURE_LAUNCH, PLAYABLE_WORLDS, scenarioFor, WORLD_REGISTRY } from "./registry";
import { WORLD_IDS, isKnownWorld } from "../core/ids";

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
    // This flips on its own the moment a second world is registered, which is the point:
    // the choice screen is a consequence of what exists, not a flag somebody remembers.
    expect(PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld).toBe(PLAYABLE_WORLDS.length > 1);
    expect(PLAN_UNDER_PRESSURE_LAUNCH.allowedWorlds).toEqual(PLAYABLE_WORLDS.map((world) => world.id));
  });

  it("separates a world it knows about from one it can play", () => {
    // A reserved id is not a playable world. The gap is what stops a surface advertising,
    // an assignment naming, or an attempt restoring something a student cannot open.
    expect(isKnownWorld("food-truck")).toBe(true);
    expect(isPlayableWorld("food-truck")).toBe(false);
    expect(isKnownWorld("a-world-nobody-built")).toBe(false);
    for (const world of PLAYABLE_WORLDS) expect(isKnownWorld(world.id)).toBe(true);
  });

  it("looks a world's own story and economy up rather than importing one", () => {
    for (const world of PLAYABLE_WORLDS) {
      expect(scenarioFor(world.id).id).toBe(world.id);
      expect(numbersFor(world.id)).toBe(world.scenario.numbers);
    }
  });

  it("names every id the union carries", () => {
    expect([...WORLD_IDS]).toEqual(["basketball", "food-truck"]);
  });
});
