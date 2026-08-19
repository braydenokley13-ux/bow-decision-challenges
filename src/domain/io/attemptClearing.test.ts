import { describe, expect, it } from "vitest";
import {
  ATTEMPT_KEY,
  attemptKeyForWorld,
  attemptKeysFor,
  clearAttemptFor,
  clearEveryAttempt,
  lastWorldPlayed,
  loadAttemptFor,
  readDraft,
  saveAttempt,
  writeDraft,
} from "./persistence";
import { createInitialState, type ChallengeState } from "../machine/state";
import { challengeReducer } from "../machine/reducer";
import { createPopUpState, popUpReducer, type PopUpState } from "../scenario/worlds/food-truck/machine";

/**
 * Starting again has to actually start again, and leaving has to actually leave.
 *
 * Both failures below were found on a shared computer, which is the only kind most of these
 * students have. "Try a different plan" removed two of the three keys the loader reads, so the
 * student who asked to abandon a plan was handed that plan straight back from the third. And a
 * quarantined attempt was written under a key stamped with the millisecond, for ever, on a
 * device handed to a different student every period — an unbounded store on the one browser
 * API with a hard quota.
 */

/** A localStorage that behaves like one, including the parts a Map-backed fake leaves out. */
function fakeStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

function basketballAttempt(): ChallengeState {
  return [
    { type: "SESSION_STARTED", sessionId: "session-basketball", classCode: "H4KVW", seatCode: "07" } as const,
    { type: "SETUP_SELECTED", setupId: "teammate-share" } as const,
    { type: "GO_TO_STAGE", stage: "working-plan" } as const,
  ].reduce(challengeReducer, createInitialState(1_800_000_000_000));
}

function popUpAttempt(): PopUpState {
  return [
    { type: "SESSION_STARTED", sessionId: "session-food-truck", classCode: "H4KVW", seatCode: "07" } as const,
    { type: "GO_TO_STAGE", stage: "popup-spot" } as const,
  ].reduce((state, action) => popUpReducer(state, action), createPopUpState(1_800_000_000_000));
}

describe("clearing an attempt", () => {
  it("names every key the loader would restore this world from", () => {
    // The list is the fix: the loader and the clearer read the same one, so a key added to the
    // fallback chain cannot be forgotten here again.
    expect(attemptKeysFor("basketball")).toEqual([attemptKeyForWorld("basketball"), ATTEMPT_KEY, "bow.student.v1.attempt"]);
    expect(attemptKeysFor("food-truck")).toEqual([attemptKeyForWorld("food-truck")]);
  });

  it("clears the unversioned key the loader still falls back to", () => {
    const storage = fakeStorage({ "bow.student.v1.attempt": JSON.stringify(basketballAttempt()) });
    expect(loadAttemptFor<ChallengeState>("basketball", storage)?.stage).toBe("working-plan");
    clearAttemptFor("basketball", storage);
    expect(loadAttemptFor("basketball", storage)).toBeNull();
  });

  it("takes the drafts of the world it clears, and leaves the other world's alone", () => {
    const storage = fakeStorage();
    writeDraft("basketball", "defense-text", "half a sentence about the course money", storage);
    writeDraft("food-truck", "writeup-text", "half a sentence about the trays", storage);
    clearAttemptFor("basketball", storage);
    expect(readDraft("basketball", "defense-text", storage)).toBeNull();
    expect(readDraft("food-truck", "writeup-text", storage)).toBe("half a sentence about the trays");
  });

  it("moves the pointer off a world whose attempt has just gone", () => {
    const storage = fakeStorage();
    saveAttempt(popUpAttempt(), storage);
    expect(lastWorldPlayed(storage)).toBe("food-truck");
    clearAttemptFor("food-truck", storage);
    expect(lastWorldPlayed(storage)).toBe("basketball");
  });

  it("leaves nothing of any world behind when the next student sits down", () => {
    const storage = fakeStorage({ "bow.student.v1.attempt": JSON.stringify(basketballAttempt()) });
    saveAttempt(basketballAttempt(), storage);
    saveAttempt(popUpAttempt(), storage);
    writeDraft("food-truck", "trays-saturday-2", 6, storage);
    clearEveryAttempt(storage);
    expect(loadAttemptFor("basketball", storage)).toBeNull();
    expect(loadAttemptFor("food-truck", storage)).toBeNull();
    expect(readDraft("food-truck", "trays-saturday-2", storage)).toBeNull();
    expect([...storage.values.keys()]).toEqual([]);
  });
});

describe("quarantined work", () => {
  it("keeps the newest few and stops growing", () => {
    const storage = fakeStorage();
    // Six unreadable attempts in a row, which is a term of shared-device use.
    for (let round = 0; round < 6; round += 1) {
      storage.setItem(attemptKeyForWorld("basketball"), `{broken ${round}`);
      expect(loadAttemptFor("basketball", storage)).toBeNull();
    }
    const backups = [...storage.values.keys()].filter((key) => key.startsWith("bow.backup."));
    expect(backups.length).toBeLessThanOrEqual(3);
    expect(backups.length).toBeGreaterThan(0);
  });

  it("still keeps the work itself, which is the whole point of quarantining it", () => {
    const storage = fakeStorage({ [attemptKeyForWorld("basketball")]: "{not json" });
    expect(loadAttemptFor("basketball", storage)).toBeNull();
    const backup = [...storage.values.entries()].find(([key]) => key.startsWith("bow.backup."));
    expect(backup?.[1]).toBe("{not json");
  });
});

describe("drafts", () => {
  it("round-trip whatever a screen was holding", () => {
    const storage = fakeStorage();
    writeDraft("basketball", "deposit-choice", true, storage);
    writeDraft("food-truck", "writeup-tiles", ["takings", "binned"], storage);
    expect(readDraft<boolean>("basketball", "deposit-choice", storage)).toBe(true);
    expect(readDraft<string[]>("food-truck", "writeup-tiles", storage)).toEqual(["takings", "binned"]);
  });

  it("answer null rather than throwing when what is stored cannot be read", () => {
    // A draft is a convenience. Losing one costs a student a sentence; a crash on the way into
    // a screen costs them the run.
    const storage = fakeStorage({ "bow.draft.basketball.defense-text": "{not json" });
    expect(readDraft("basketball", "defense-text", storage)).toBeNull();
  });
});
