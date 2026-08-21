import { describe, expect, it } from "vitest";
import { PLAYABLE_WORLDS, stageLabel, stagesFor } from "../domain/scenario/registry";
import { chaptersFor, stepPosition, storyStages } from "./chapters";

/**
 * The two things a progress indicator on a student's screen has to be, and was not.
 *
 * Both indicators drawn in the design work this screen was judged from were fabricated: "Week 2
 * of 4 Saturdays" rendered with five bars, and "Step 3 of 8" for a world with fourteen story
 * screens in it. An indicator that disagrees with its own caption is worse than none, because a
 * student cannot tell which half is wrong.
 *
 * So: every number is read off the world's own ordered stage list, and every chapter name is
 * authored inside the world it belongs to. These tests walk the registry rather than naming a
 * world, so a third world added next year is covered by a test written today.
 */

describe("what a step count counts", () => {
  it("counts the story's screens, and neither the door nor the receipt", () => {
    for (const world of PLAYABLE_WORLDS) {
      const all = stagesFor(world.id);
      // The three screens that belong to the platform rather than to any story.
      expect(all.slice(0, 3), `${world.id} does not open on the platform's own screens`)
        .toEqual(["entry", "join", "choose-world"]);
      // And the last one is the turn-in receipt — a screen a run *ends on*, not a step through
      // it. `storyStages` drops it, and this is what holds that to being true of every world.
      expect(stageLabel(world.id, all.at(-1)!), `${world.id}'s last stage is not its turn-in screen`)
        .toBe("Turned in");
      expect(storyStages(world.id)).toEqual(all.slice(3, -1));
    }
  });

  it("agrees with the world's own ordering, stage by stage", () => {
    for (const world of PLAYABLE_WORLDS) {
      const stages = storyStages(world.id);
      stages.forEach((stage, index) => {
        expect(stepPosition(world.id, stage)).toEqual({ step: index + 1, of: stages.length });
      });
    }
  });

  it("counts nothing for a screen that is not part of a story", () => {
    expect(stepPosition("basketball", "choose-world")).toBeNull();
    expect(stepPosition("basketball", "not-a-stage")).toBeNull();
  });
});

describe("what a chapter track names", () => {
  it("covers every story screen of every world that authors chapters", () => {
    for (const world of PLAYABLE_WORLDS) {
      const stages = storyStages(world.id);
      const covered = stages.filter((stage) => chaptersFor(world.id, stage) !== null);
      // Either the world authors a grouping and it covers the whole story, or it authors none
      // and every screen falls back to the step label. A track with holes in it is the one
      // outcome that is not allowed, because it would put "you are here" nowhere.
      expect(covered.length === stages.length || covered.length === 0, `${world.id} has a partial chapter map`).toBe(true);
    }
  });

  it("marks exactly one chapter as the one the student is in", () => {
    const track = chaptersFor("basketball", "week5-event");
    expect(track?.map((chapter) => chapter.state)).toEqual(["done", "done", "done", "here", "ahead"]);
    expect(track?.map((chapter) => chapter.label)).toEqual(["The offer", "The plan", "Weeks 1–4", "Week 5", "Week 8"]);
  });

  it("uses the market's own captions for the market, in its own order", () => {
    const track = chaptersFor("food-truck", "popup-generator");
    expect(track?.map((chapter) => chapter.label)).toEqual([
      "Before the market", "Saturday 1", "Saturdays 2 and 3", "After Saturday 3", "Saturday 4", "Market over",
    ]);
    expect(track?.find((chapter) => chapter.state === "here")?.label).toBe("After Saturday 3");
  });

  it("draws no track for a student who is not part-way through a story", () => {
    expect(chaptersFor("basketball", "choose-world")).toBeNull();
  });
});
