import { describe, expect, it } from "vitest";
import { attemptKeyForWorld, ATTEMPT_KEY, lastWorldPlayed, loadAttempt, loadAttemptFor, saveAttempt } from "./persistence";
import { createInitialState, type ChallengeState } from "../machine/state";
import { challengeReducer } from "../machine/reducer";
import { createPopUpState, popUpReducer, type PopUpState } from "../scenario/worlds/food-truck/machine";

/**
 * §CP8 acceptance 6 — playing one world never opens or corrupts another world's attempt.
 *
 * This is the failure that would be invisible until it had already happened: two worlds under
 * one challenge share a challenge id, so a single key hands a student back somebody else's
 * board — priced by one world's economy, telling another world's story — and the evidence
 * written from there is about a game nobody played.
 *
 * Both attempts below are built by the real reducers rather than by hand. A fixture would test
 * a shape somebody typed; these two are the shapes the product actually stores, and the second
 * one has a stage, a log and a snapshot list the first one's machine has never heard of.
 */

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

/** A real Basketball attempt, part-way through the opening plan. */
function basketballAttempt(): ChallengeState {
  return [
    { type: "SESSION_STARTED", sessionId: "session-basketball", classCode: "H4KVW", seatCode: "07" } as const,
    { type: "SETUP_SELECTED", setupId: "teammate-share" } as const,
    { type: "GO_TO_STAGE", stage: "working-plan" } as const,
  ].reduce(challengeReducer, createInitialState(1_800_000_000_000));
}

/** A real Run the Pop-Up attempt, part-way through picking a booth. */
function popUpAttempt(): PopUpState {
  return [
    { type: "SESSION_STARTED", sessionId: "session-food-truck", classCode: "H4KVW", seatCode: "07" } as const,
    { type: "GO_TO_STAGE", stage: "popup-spot" } as const,
    { type: "POPUP_SPOT_SELECTED", spotId: "bridge-gate" } as const,
  ].reduce((state, action) => popUpReducer(state, action), createPopUpState(1_800_000_000_000));
}

describe("two worlds in one browser", () => {
  it("keeps each world's attempt under its own key", () => {
    const storage = fakeStorage();
    saveAttempt(basketballAttempt(), storage);
    saveAttempt(popUpAttempt(), storage);
    expect(storage.values.has(attemptKeyForWorld("basketball"))).toBe(true);
    expect(storage.values.has(attemptKeyForWorld("food-truck"))).toBe(true);
    expect(attemptKeyForWorld("basketball")).not.toBe(attemptKeyForWorld("food-truck"));
  });

  it("never hands one world the other's work", () => {
    const storage = fakeStorage();
    saveAttempt(basketballAttempt(), storage);
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
    expect(loadAttemptFor("basketball", storage)?.meta.worldId).toBe("basketball");
  });

  it("restores each world's own attempt, at its own screen", () => {
    const storage = fakeStorage();
    saveAttempt(basketballAttempt(), storage);
    saveAttempt(popUpAttempt(), storage);
    expect(loadAttemptFor<ChallengeState>("basketball", storage)?.stage).toBe("working-plan");
    expect(loadAttemptFor<PopUpState>("food-truck", storage)?.stage).toBe("popup-spot");
    // And each carries its own decisions, not the other's.
    expect(loadAttemptFor<ChallengeState>("basketball", storage)?.setupId).toBe("teammate-share");
    expect(loadAttemptFor<PopUpState>("food-truck", storage)?.spotId).toBe("bridge-gate");
  });

  it("leaves the other world's attempt exactly where it was", () => {
    const storage = fakeStorage();
    saveAttempt(basketballAttempt(), storage);
    const before = storage.values.get(attemptKeyForWorld("basketball"));

    loadAttemptFor("food-truck", storage);
    saveAttempt(popUpAttempt(), storage);
    loadAttempt(storage);

    expect(storage.values.get(attemptKeyForWorld("basketball"))).toBe(before);
    expect(loadAttemptFor<ChallengeState>("basketball", storage)?.stage).toBe("working-plan");
    // And nothing was quarantined: another world's attempt is readable, just not ours.
    expect([...storage.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(false);
  });

  it("keeps playing one world from writing anything into the other's log", () => {
    // The end-to-end version of the same claim. A whole Saturday is played in the pop-up and
    // the Basketball attempt beside it is byte-for-byte what it was.
    const storage = fakeStorage();
    saveAttempt(basketballAttempt(), storage);
    const before = storage.values.get(attemptKeyForWorld("basketball"));
    let popUp = popUpAttempt();
    for (const action of [
      { type: "GO_TO_STAGE", stage: "popup-money" },
      { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: true },
    ] as const) {
      popUp = popUpReducer(popUp, action);
      saveAttempt(popUp, storage);
    }
    expect(storage.values.get(attemptKeyForWorld("basketball"))).toBe(before);
    const restored = loadAttemptFor<ChallengeState>("basketball", storage)!;
    expect(restored.log.every((event) => event.worldId === "basketball")).toBe(true);
    expect(loadAttemptFor<PopUpState>("food-truck", storage)!.log.every((event) => event.worldId === "food-truck")).toBe(true);
  });

  it("remembers which world was last open", () => {
    const storage = fakeStorage();
    saveAttempt(basketballAttempt(), storage);
    saveAttempt(popUpAttempt(), storage);
    expect(lastWorldPlayed(storage)).toBe("food-truck");
    expect(loadAttempt(storage)?.meta.worldId).toBe("food-truck");

    saveAttempt(basketballAttempt(), storage);
    expect(lastWorldPlayed(storage)).toBe("basketball");
    expect(loadAttempt(storage)?.meta.worldId).toBe("basketball");
  });

  it("refuses an attempt whose screen belongs to a different world", () => {
    // The check that makes the shared stage union safe. A stored attempt claiming to be in the
    // food truck but sitting on one of Basketball's screens is not readable by either machine,
    // so it is quarantined rather than restored into a board with no story behind it.
    const storage = fakeStorage();
    const confused = { ...popUpAttempt(), stage: "working-plan" as const };
    saveAttempt(confused, storage);
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
    expect([...storage.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(true);
  });

  it("falls back to the default world when nothing has been played", () => {
    expect(lastWorldPlayed(fakeStorage())).toBe("basketball");
    expect(loadAttempt(fakeStorage())).toBeNull();
  });

  it("ignores a pointer naming a world this build has never heard of", () => {
    const storage = fakeStorage();
    storage.setItem("bow.attempt.v2.plan-under-pressure.world", "a-world-nobody-built");
    expect(lastWorldPlayed(storage)).toBe("basketball");
  });

  it("carries a pre-world attempt forward, and only into the world that wrote it", () => {
    const storage = fakeStorage();
    // What a student mid-attempt had in storage before worlds were keyed separately.
    storage.setItem(ATTEMPT_KEY, JSON.stringify(basketballAttempt()));
    expect(loadAttemptFor<ChallengeState>("basketball", storage)?.stage).toBe("working-plan");
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
  });

  it("still quarantines work it genuinely cannot read", () => {
    const storage = fakeStorage();
    storage.setItem(attemptKeyForWorld("basketball"), "{not json");
    expect(loadAttemptFor("basketball", storage)).toBeNull();
    expect([...storage.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(true);
  });
});
