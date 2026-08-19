import { describe, expect, it } from "vitest";
import { worldOffer } from "./worldOffer";
import { DEFAULT_WORLD_ID, PLAYABLE_WORLDS, WORLD_CHOICE_UI_READY } from "../domain/scenario/registry";
import { legacyAssignmentFor } from "../platform/classes/assignments";

/**
 * The picker is a screen a student must never meet with one card on it, and never miss when
 * their teacher meant them to have it.
 *
 * Both failures are silent in a browser: the first looks like a working screen with a
 * pointless question, and the second looks like a working challenge in the wrong world. So
 * the rule is a function and it is tested here, against the real registry and the real
 * assignment the class service synthesises for every class created before assignments
 * existed.
 */

const PLAYABLE = PLAYABLE_WORLDS.map((world) => world.id);

const base = {
  playableWorldIds: PLAYABLE,
  pickerReady: WORLD_CHOICE_UI_READY,
  defaultWorldId: DEFAULT_WORLD_ID,
};

describe("what the student is offered", () => {
  it("shows the picker when the class allows both worlds and says the student picks", () => {
    const offer = worldOffer({ ...base, allowedWorldIds: PLAYABLE, assignmentAllowsChoice: true });
    expect(offer.studentChooses).toBe(true);
    expect(offer.worldIds).toEqual(PLAYABLE);
  });

  it("skips straight into the one world a class was set", () => {
    const offer = worldOffer({ ...base, allowedWorldIds: ["food-truck"], assignmentAllowsChoice: true });
    expect(offer.studentChooses).toBe(false);
    expect(offer.worldIds).toEqual(["food-truck"]);
    expect(offer.opensInto).toBe("food-truck");
  });

  it("never asks a question with one answer, whatever the assignment says", () => {
    // `studentChoosesWorld` on an assignment is a teacher's intent, not a licence to draw a
    // one-card screen.
    const offer = worldOffer({ ...base, allowedWorldIds: ["basketball"], assignmentAllowsChoice: true });
    expect(offer.studentChooses).toBe(false);
    expect(offer.opensInto).toBe("basketball");
  });

  it("opens the default world when a class allows both and keeps the choice for itself", () => {
    const offer = worldOffer({ ...base, allowedWorldIds: PLAYABLE, assignmentAllowsChoice: false });
    expect(offer.studentChooses).toBe(false);
    expect(offer.opensInto).toBe(DEFAULT_WORLD_ID);
  });

  it("leaves every class created before worlds could be chosen exactly where it was", () => {
    // The class service synthesises this assignment for every class that predates them. A
    // student joining one of those classes must land in Basketball with no screen in between.
    const legacy = legacyAssignmentFor({ code: "H4KVW", label: "Period 3", challengeId: "plan-under-pressure", createdAt: 1, expiresAt: 2 });
    const offer = worldOffer({
      ...base,
      allowedWorldIds: legacy.allowedWorldIds,
      assignmentAllowsChoice: legacy.studentChoosesWorld,
    });
    expect(offer.studentChooses).toBe(false);
    expect(offer.opensInto).toBe(DEFAULT_WORLD_ID);
  });

  it("offers every playable world when no class said anything", () => {
    // A challenge opened outside a class. There is no teacher to have decided, so the offer
    // is what the build can open.
    const offer = worldOffer({ ...base, allowedWorldIds: [], assignmentAllowsChoice: true });
    expect(offer.worldIds).toEqual(PLAYABLE);
    expect(offer.studentChooses).toBe(PLAYABLE.length > 1);
  });

  it("holds the picker shut while the screen does not exist", () => {
    const offer = worldOffer({ ...base, pickerReady: false, allowedWorldIds: PLAYABLE, assignmentAllowsChoice: true });
    expect(offer.studentChooses).toBe(false);
    expect(offer.opensInto).toBe(DEFAULT_WORLD_ID);
  });

  it("falls back to something playable when a class names only a world this build cannot open", () => {
    const offer = worldOffer({ ...base, allowedWorldIds: ["a-world-nobody-built" as never], assignmentAllowsChoice: false });
    expect(offer.worldIds).toEqual(PLAYABLE);
    expect(offer.opensInto).toBe(DEFAULT_WORLD_ID);
  });

  it("draws the cards in registry order however the assignment lists them", () => {
    const reversed = [...PLAYABLE].reverse();
    const offer = worldOffer({ ...base, allowedWorldIds: reversed, assignmentAllowsChoice: true });
    expect(offer.worldIds).toEqual(PLAYABLE);
  });
});
