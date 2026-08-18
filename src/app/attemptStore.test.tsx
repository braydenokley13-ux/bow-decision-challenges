// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import { attemptKeyForWorld, loadAttemptFor } from "../domain/io/persistence";
import { useAttemptAutosave, useDraft, useSingleFireDispatch } from "./attemptStore";

/**
 * The three promises the attempt store makes, each of them a defect somebody reproduced.
 *
 * A press that arrives twice is one press. Work that reached the evidence log is on disk
 * before the next line of code runs. And a screen holding something that is not a decision
 * yet — a paragraph, a tray order — still has it after a reload.
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("one press, one event", () => {
  it("drops the second half of a double-click", () => {
    const seen: unknown[] = [];
    const { result } = renderHook(() => useSingleFireDispatch<{ type: string }>((action) => seen.push(action)));
    act(() => {
      result.current({ type: "SETUP_RANKED" });
      result.current({ type: "SETUP_RANKED" });
    });
    expect(seen).toHaveLength(1);
  });

  it("keeps two different answers pressed in quick succession", () => {
    // "Count it in" then "leave it out" is a student changing their mind, which is two
    // decisions and has to be recorded as two.
    const seen: { included?: boolean }[] = [];
    const { result } = renderHook(() => useSingleFireDispatch<{ type: string; included: boolean }>((action) => seen.push(action)));
    act(() => {
      result.current({ type: "INCOME_SOURCE_TOGGLED", included: true });
      result.current({ type: "INCOME_SOURCE_TOGGLED", included: false });
    });
    expect(seen.map((action) => action.included)).toEqual([true, false]);
  });

  it("lets the same press through once the moment has passed", () => {
    vi.useFakeTimers();
    const seen: unknown[] = [];
    const { result } = renderHook(() => useSingleFireDispatch<{ type: string }>((action) => seen.push(action)));
    act(() => result.current({ type: "PLAN_SAVE_REQUESTED" }));
    act(() => {
      vi.advanceTimersByTime(2_000);
      vi.setSystemTime(Date.now() + 2_000);
      result.current({ type: "PLAN_SAVE_REQUESTED" });
    });
    expect(seen).toHaveLength(2);
  });

  it("stamps every action with the wall clock, so the reducer stays pure", () => {
    const seen: { at?: number }[] = [];
    const { result } = renderHook(() => useSingleFireDispatch<{ type: string }>((action) => seen.push(action)));
    act(() => result.current({ type: "GO_TO_STAGE" }));
    expect(typeof seen[0]?.at).toBe("number");
  });
});

describe("what gets written, and when", () => {
  /** A run with one real decision in it, and the same run with a draft nudged afterwards. */
  function ranked(): ChallengeState {
    const started = challengeReducer(createInitialState(1_800_000_000_000), {
      type: "SESSION_STARTED", sessionId: "s", classCode: "H4KVW", seatCode: "7", at: 1_800_000_000_000,
    });
    return challengeReducer(started, { type: "SETUP_SELECTED", setupId: "cousin-room", at: 1_800_000_001_000 });
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("writes work that reached the log without waiting for a timer", () => {
    // The reproduction: check a ranking, reload inside the debounce, and the ranking is gone —
    // and the student's second, identical attempt at it is recorded as a second attempt.
    const first = createInitialState(1_800_000_000_000);
    const { rerender } = renderHook(({ state }) => useAttemptAutosave(state), { initialProps: { state: first } });
    rerender({ state: ranked() });
    expect(loadAttemptFor<ChallengeState>("basketball")?.setupId).toBe("cousin-room");
  });

  it("lets a board being nudged wait, and writes it when the page goes away", () => {
    const settled = ranked();
    const nudged: ChallengeState = { ...settled, drafts: { working: { goal: 100, reserve: 0, flexibleCash: 0 } } as ChallengeState["drafts"] };
    const { rerender } = renderHook(({ state }) => useAttemptAutosave(state), { initialProps: { state: settled } });
    rerender({ state: nudged });
    // Nothing yet: no event was written, so this is a draft and it is allowed to wait.
    expect(loadAttemptFor<ChallengeState>("basketball")?.drafts.working).toBeUndefined();
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(loadAttemptFor<ChallengeState>("basketball")?.drafts.working?.goal).toBe(100);
  });

  it("writes nothing at all for a browser that only opened the page", () => {
    renderHook(() => useAttemptAutosave(createInitialState(1_800_000_000_000)));
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(window.localStorage.getItem(attemptKeyForWorld("basketball"))).toBeNull();
  });

  it("does not write from a tab that is not the one running the attempt", () => {
    const { rerender } = renderHook(({ state }) => useAttemptAutosave(state, false), {
      initialProps: { state: createInitialState(1_800_000_000_000) },
    });
    rerender({ state: ranked() });
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(window.localStorage.getItem(attemptKeyForWorld("basketball"))).toBeNull();
  });
});

describe("work a screen is holding", () => {
  it("survives the screen being thrown away and rebuilt", () => {
    const { result, unmount } = renderHook(() => useDraft("basketball", "defense-text", ""));
    act(() => result.current[1]("I protected the course money because"));
    unmount();
    const second = renderHook(() => useDraft("basketball", "defense-text", ""));
    expect(second.result.current[0]).toBe("I protected the course money because");
  });

  it("prefers what the student typed to whatever the screen was given", () => {
    const { result } = renderHook(() => useDraft("food-truck", "trays-saturday-2", 3));
    act(() => result.current[1](7));
    const reopened = renderHook(() => useDraft("food-truck", "trays-saturday-2", 3));
    expect(reopened.result.current[0]).toBe(7);
  });
});
