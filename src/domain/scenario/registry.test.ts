import { describe, expect, it } from "vitest";
import { isPlayableWorld, numbersFor, PLAN_UNDER_PRESSURE_LAUNCH, PLAYABLE_WORLDS, scenarioFor, stagesFor, usesSharedBoard, WORLD_CHOICE_UI_READY, WORLD_REGISTRY } from "./registry";
import { WORLD_IDS, isKnownWorld } from "../core/ids";
import { SCENARIO_NUMBERS } from "./numbers";
import { POP_UP_STAGES } from "./worlds/food-truck";

describe("world-ready registry", () => {
  it("ships both finished worlds", () => {
    expect(WORLD_REGISTRY.basketball?.availability).toBe("available");
    expect(WORLD_REGISTRY.basketball?.scenario?.id).toBe("basketball");
    expect(WORLD_REGISTRY["food-truck"]?.availability).toBe("available");
    expect(WORLD_REGISTRY["food-truck"]?.scenario?.id).toBe("food-truck");
    expect(WORLD_REGISTRY["food-truck"]?.title).toBe("Run the Pop-Up");
  });

  it("registers only worlds a student can actually play", () => {
    expect(PLAYABLE_WORLDS.every((world) => world.scenario !== undefined)).toBe(true);
    expect(PLAYABLE_WORLDS.every((world) => world.availability === "available")).toBe(true);
    expect(PLAYABLE_WORLDS.every((world) => world.stages.length > 0)).toBe(true);
  });

  it("asks the student which world only once the picker itself exists", () => {
    // Two worlds are playable, and choice still waits on WORLD_CHOICE_UI_READY: routing a new
    // session to a stage nothing renders would strand the student at the join form. The flag
    // flips in the same change that ships the choose-world screen, and this assertion flips
    // with it.
    expect(PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld).toBe(WORLD_CHOICE_UI_READY && PLAYABLE_WORLDS.length > 1);
    expect(PLAN_UNDER_PRESSURE_LAUNCH.allowedWorlds).toEqual(PLAYABLE_WORLDS.map((world) => world.id));
  });

  it("separates a world it knows about from one it can play", () => {
    // The gap is what stops a surface advertising, an assignment naming, or an attempt
    // restoring something a student cannot open. Both known worlds are now playable; a name
    // nobody has built is neither.
    expect(isKnownWorld("food-truck")).toBe(true);
    expect(isPlayableWorld("food-truck")).toBe(true);
    expect(isKnownWorld("a-world-nobody-built")).toBe(false);
    expect(isPlayableWorld("a-world-nobody-built")).toBe(false);
    for (const world of PLAYABLE_WORLDS) expect(isKnownWorld(world.id)).toBe(true);
  });

  it("looks a world's own story up rather than importing one", () => {
    for (const world of PLAYABLE_WORLDS) {
      expect(scenarioFor(world.id).id).toBe(world.id);
      expect(scenarioFor(world.id).title.length).toBeGreaterThan(0);
    }
  });

  it("keeps the shared board's economy to the world that uses it", () => {
    // §7.1 — a world's interior is its own. Run the Pop-Up prices trays, crowds and food that
    // goes in the bin, none of which `ScenarioNumbers` can express, so it does not appear here
    // at all rather than appearing with somebody else's prices.
    expect(usesSharedBoard("basketball")).toBe(true);
    expect(numbersFor("basketball")).toBe(SCENARIO_NUMBERS);
    expect(usesSharedBoard("food-truck")).toBe(false);
  });

  it("declares each world's own screens, so a restored attempt is checked against its own", () => {
    expect(stagesFor("basketball")).toContain("working-plan");
    expect(stagesFor("basketball")).not.toContain("popup-plan");
    expect(stagesFor("food-truck")).toContain("popup-plan");
    expect(stagesFor("food-truck")).not.toContain("working-plan");
    for (const stage of POP_UP_STAGES) expect(stagesFor("food-truck")).toContain(stage);
  });

  it("names every id the union carries", () => {
    expect([...WORLD_IDS]).toEqual(["basketball", "food-truck"]);
  });
});
