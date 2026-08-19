// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import { attemptKeyForWorld, loadAttemptFor } from "../domain/io/persistence";
import { useAttemptAutosave, useDraft, useRunLock, useSingleFireDispatch } from "./attemptStore";

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

/**
 * Who is running this attempt, and what a student is told about it.
 *
 * The lock was right about the danger — two tabs on one attempt was silent, total data loss —
 * and wrong about the evidence. A tab that found a claim it did not own announced *your
 * challenge is open in another tab* without ever having heard from that tab, so the screen
 * every student met was the one they got by closing the browser at the end of a lesson and
 * coming back the next morning. A red screen, in the product's own emergency voice, about a
 * window that did not exist, at the moment a twelve-year-old sat down to finish their work.
 *
 * These are the two halves of the rule: **a claim nobody answers is nobody's**, and **a claim
 * somebody answers is theirs**. Both are checked against what a browser actually does — the
 * `storage` event another tab's write fires — rather than against elapsed time alone.
 */
const LOCK_KEY = "bow.run.tab";
const PING_KEY = "bow.run.ping";

/** A write from another tab, as this tab experiences it. */
function fromAnotherTab(key: string, value: string | null) {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
}

function claimBy(tabId: string, at: number) {
  return JSON.stringify({ tabId, at });
}

/** This tab's own id, as the lock knows it. */
function thisTabId(): string {
  return window.sessionStorage.getItem("bow.run.tabId") ?? "";
}

/** A live tab answering the knock: a claim addressed to whoever knocked. */
function answerFrom(tabId: string) {
  return JSON.stringify({ tabId, at: Date.now(), ack: thisTabId() });
}

describe("one browser, one writer — and only what it can actually check", () => {
  beforeEach(() => {
    // Only the shared store is cleared. Session storage is this tab's identity and the lock
    // caches it in module scope, so wiping one and not the other would make the tab in the
    // test a different tab from the tab in the code.
    window.localStorage.clear();
  });

  it("takes a run nobody has renewed, and says nothing to the student about it", () => {
    // The end of Tuesday's lesson: the tab that held the run went away without cleaning up.
    window.localStorage.setItem(LOCK_KEY, claimBy("tuesday-tab", Date.now() - 60 * 60 * 1000));
    const { result } = renderHook(() => useRunLock());
    expect(result.current.state).toBe("running");
    expect(result.current.shadowed).toBe(false);
  });

  it("asks a claim that looks live rather than believing it, and takes the run when nobody answers", async () => {
    vi.useFakeTimers();
    // A claim written a moment ago by a tab that is no longer there: a browser force-quit, a
    // Chromebook lid closed on the trolley, a tab the operating system discarded.
    window.localStorage.setItem(LOCK_KEY, claimBy("closed-tab", Date.now()));
    const { result } = renderHook(() => useRunLock());
    // Not knowing is its own state, and it is not an accusation.
    expect(result.current.state).toBe("checking");
    expect(result.current.shadowed).toBe(true);
    expect(window.localStorage.getItem(PING_KEY)).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(result.current.state).toBe("running");
    expect(result.current.shadowed).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(LOCK_KEY)!).tabId).not.toBe("closed-tab");
  });

  it("stands down when the other tab answers the knock", async () => {
    vi.useFakeTimers();
    const at = Date.now();
    window.localStorage.setItem(LOCK_KEY, claimBy("live-tab", at));
    const { result } = renderHook(() => useRunLock());
    expect(result.current.state).toBe("checking");
    // A heartbeat that was already on its way is not an answer — it says nothing about
    // whether anybody heard the knock, and treating it as one is how a tab that had just been
    // closed came to be reported as open.
    act(() => fromAnotherTab(LOCK_KEY, claimBy("live-tab", Date.now() + 5)));
    expect(result.current.state).toBe("checking");
    // The other tab is alive: it answers by name the instant the knock lands.
    act(() => fromAnotherTab(LOCK_KEY, answerFrom("live-tab")));
    expect(result.current.state).toBe("elsewhere");
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    // And it stays stood down while that tab keeps saying it is there.
    act(() => fromAnotherTab(LOCK_KEY, claimBy("live-tab", Date.now())));
    expect(result.current.state).toBe("elsewhere");
    expect(result.current.shadowed).toBe(true);
  });

  it("answers a knock at once, so the arriving tab does not have to wait out a heartbeat", () => {
    const { result } = renderHook(() => useRunLock());
    expect(result.current.state).toBe("running");
    const before = JSON.parse(window.localStorage.getItem(LOCK_KEY)!).at as number;
    vi.setSystemTime(new Date(Date.now() + 50));
    act(() => fromAnotherTab(PING_KEY, JSON.stringify({ from: "arriving-tab", at: Date.now() })));
    const after = JSON.parse(window.localStorage.getItem(LOCK_KEY)!).at as number;
    expect(after).toBeGreaterThan(before);
    vi.useRealTimers();
  });

  it("does not strand a student behind a tab that has since died", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(LOCK_KEY, claimBy("live-tab", Date.now()));
    const { result } = renderHook(() => useRunLock());
    act(() => fromAnotherTab(LOCK_KEY, answerFrom("live-tab")));
    expect(result.current.state).toBe("elsewhere");
    // That tab now goes away without releasing anything, and fires no event of any kind.
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(result.current.state).toBe("running");
    expect(result.current.shadowed).toBe(false);
  });

  it("stops writing the moment another tab takes the run", () => {
    const { result } = renderHook(() => useRunLock());
    expect(result.current.state).toBe("running");
    act(() => fromAnotherTab(LOCK_KEY, claimBy("other-tab", Date.now())));
    expect(result.current.state).toBe("elsewhere");
    expect(result.current.shadowed).toBe(true);
  });
});
