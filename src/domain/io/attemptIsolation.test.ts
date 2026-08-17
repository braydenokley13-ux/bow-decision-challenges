import { describe, expect, it } from "vitest";
import { attemptKeyForWorld, ATTEMPT_KEY, lastWorldPlayed, loadAttempt, loadAttemptFor, saveAttempt } from "./persistence";
import { createInitialState } from "../machine/state";
import type { ChallengeState } from "../machine/state";
import type { WorldId } from "../core/ids";

/**
 * §CP8 acceptance 6 — playing one world never opens or corrupts another world's attempt.
 *
 * This is the failure that would be invisible until it had already happened: two worlds
 * under one challenge share a challenge id, so a single key hands a student back somebody
 * else's board — priced by one world's economy, telling another world's story — and the
 * evidence written from there is about a game nobody played.
 */

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

function attempt(worldId: WorldId, stage: ChallengeState["stage"] = "working-plan"): ChallengeState {
  const base = createInitialState(1_800_000_000_000);
  return { ...base, stage, meta: { ...base.meta, worldId, sessionId: `session-${worldId}` } };
}

describe("two worlds in one browser", () => {
  it("keeps each world's attempt under its own key", () => {
    const storage = fakeStorage();
    saveAttempt(attempt("basketball"), storage);
    saveAttempt(attempt("food-truck", "setup-comparison"), storage);
    expect(storage.values.has(attemptKeyForWorld("basketball"))).toBe(true);
    expect(storage.values.has(attemptKeyForWorld("food-truck"))).toBe(true);
    expect(attemptKeyForWorld("basketball")).not.toBe(attemptKeyForWorld("food-truck"));
  });

  it("never hands one world the other's work", () => {
    const storage = fakeStorage();
    saveAttempt(attempt("basketball"), storage);
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
    expect(loadAttemptFor("basketball", storage)?.meta.worldId).toBe("basketball");
  });

  it("leaves the other world's attempt exactly where it was", () => {
    const storage = fakeStorage();
    const basketball = attempt("basketball");
    saveAttempt(basketball, storage);
    const before = storage.values.get(attemptKeyForWorld("basketball"));

    loadAttemptFor("food-truck", storage);
    saveAttempt(attempt("food-truck", "setup-comparison"), storage);
    loadAttempt(storage);

    expect(storage.values.get(attemptKeyForWorld("basketball"))).toBe(before);
    expect(loadAttemptFor("basketball", storage)?.stage).toBe("working-plan");
    // And nothing was quarantined: another world's attempt is readable, just not ours.
    expect([...storage.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(false);
  });

  it("remembers which world was last open", () => {
    const storage = fakeStorage();
    saveAttempt(attempt("basketball"), storage);
    saveAttempt(attempt("food-truck", "setup-comparison"), storage);
    expect(lastWorldPlayed(storage)).toBe("food-truck");

    saveAttempt(attempt("basketball", "defense"), storage);
    expect(lastWorldPlayed(storage)).toBe("basketball");
    expect(loadAttempt(storage)?.meta.worldId).toBe("basketball");
    expect(loadAttempt(storage)?.stage).toBe("defense");
  });

  it("refuses to restore an attempt in a world this build cannot render", () => {
    // The food truck has a reserved id and no scenario yet. An attempt claiming it is real
    // work, so it is left alone — and it is not opened, because there is nothing to open it
    // into. The student starts fresh rather than landing on a board with no story.
    const storage = fakeStorage();
    saveAttempt(attempt("food-truck", "setup-comparison"), storage);
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
    expect(loadAttempt(storage)).toBeNull();
    expect(storage.values.has(attemptKeyForWorld("food-truck"))).toBe(true);
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
    storage.setItem(ATTEMPT_KEY, JSON.stringify(attempt("basketball", "first-response")));
    expect(loadAttemptFor("basketball", storage)?.stage).toBe("first-response");
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
  });

  it("still quarantines work it genuinely cannot read", () => {
    const storage = fakeStorage();
    storage.setItem(attemptKeyForWorld("basketball"), "{not json");
    expect(loadAttemptFor("basketball", storage)).toBeNull();
    expect([...storage.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(true);
  });
});
