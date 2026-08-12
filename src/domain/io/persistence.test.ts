import { describe, expect, it } from "vitest";
import { createInitialState } from "../machine/state";
import { ATTEMPT_KEY, loadAttempt, saveAttempt } from "./persistence";

function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

describe("schema-versioned persistence", () => {
  it("round-trips a valid attempt", () => {
    const memory = storage();
    const state = { ...createInitialState(10), stage: "fallback-version" as const };
    saveAttempt(state, memory);
    expect(loadAttempt(memory)?.stage).toBe("fallback-version");
  });

  it("backs up malformed or unknown state instead of crashing", () => {
    const memory = storage({ [ATTEMPT_KEY]: "{broken" });
    expect(loadAttempt(memory)).toBeNull();
    expect([...memory.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(true);
  });

  // A stage this build cannot render would leave the student looking at nothing.
  it("refuses an attempt parked on a stage this build does not know", () => {
    const memory = storage({ [ATTEMPT_KEY]: JSON.stringify({ ...createInitialState(10), stage: "world-picker-v0" }) });
    expect(loadAttempt(memory)).toBeNull();
    expect([...memory.values.keys()].some((key) => key.startsWith("bow.backup."))).toBe(true);
  });
});
