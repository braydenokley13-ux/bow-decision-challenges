// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeGate } from "./ResumeGate";
import { useChallenge } from "../app/ChallengeContext";
import { createInitialState } from "../domain/machine/state";
import { challengeReducer } from "../domain/machine/reducer";

import type { ChallengeState } from "../domain/machine/state";
import { attemptKeyForWorld } from "../domain/io/persistence";

/**
 * Tuesday's run, opened on Thursday, on a different machine.
 *
 * The attempt used to live in one browser's local storage and nowhere else, so a student handed
 * a different Chromebook got a blank board and no warning that twenty minutes of their own
 * decisions were on a laptop in another room — while the product told teachers homework across
 * three days was a thing a class could be set.
 *
 * The rule these tests hold is the one that is easy to get backwards: **the machine in front of
 * the student wins a tie and wins outright when it is ahead.** A student who carried on offline
 * after the last checkpoint has work here the service has never seen, and pulling the server's
 * older copy over it would be the sync losing the thing sync is for.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

/**
 * A run that has got somewhere, built through the real reducer.
 *
 * Through the reducer rather than hand-written, because what the precedence rule compares is
 * how far along a run is, and a hand-built pair could differ in a way no real run ever does.
 */
type TimedAction = Parameters<typeof challengeReducer>[1];

function aRunAt(sessionId: string, extra: readonly TimedAction[] = []): ChallengeState {
  const at = 1_770_000_000_000;
  let state = challengeReducer(createInitialState(at), { type: "SESSION_STARTED", sessionId, classCode: "H4KVW", seatCode: "7", at });
  for (const action of extra) state = challengeReducer(state, action);
  return state;
}

/** Two more real decisions than the copy the service is holding. */
const TWO_MORE: readonly TimedAction[] = [
  { type: "SETUP_RANKED", order: ["gym-sublet", "teammate-share", "cousin-room"], correct: true, at: 1_770_000_000_001 },
  { type: "SETUP_SELECTED", setupId: "cousin-room", at: 1_770_000_000_002 },
];

function Where() {
  const { state } = useChallenge();
  return <p data-testid="where">{state.meta.sessionId || "nothing"} · {state.log.length}</p>;
}

function open() {
  return render(
    <MemoryRouter initialEntries={["/challenges/plan-under-pressure?class=H4KVW"]}>
      <Routes>
        <Route path="/challenges/plan-under-pressure" element={<ResumeGate><Where /></ResumeGate>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The service, answering `/me/attempt` with whatever this test says it holds. */
function service(attempt: unknown) {
  return vi.fn(() => Promise.resolve({
    ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ attempt, seatCode: "7" })),
  } as Response));
}

describe("a run can be picked up on a machine that never saw it", () => {
  it("opens the attempt the service is holding when this browser has none", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    const there = aRunAt("session-from-tuesday");
    vi.stubGlobal("fetch", service({ worldId: "basketball", stage: there.stage, payload: there }));
    open();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("session-from-tuesday"));
  });

  it("keeps what is on this machine when this machine is further along", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    const here = aRunAt("one-run", TWO_MORE);
    const there = aRunAt("one-run");
    // The premise of the test, asserted rather than assumed: two runs of genuinely different
    // lengths. Without this the comparison could pass because both sides are the same.
    expect(here.log.length).toBeGreaterThan(there.log.length);
    window.localStorage.setItem(attemptKeyForWorld("basketball"), JSON.stringify(here));
    vi.stubGlobal("fetch", service({ worldId: "basketball", stage: there.stage, payload: there }));
    open();
    // Same run, and this browser has two events the service has not been told about — work done
    // after the last checkpoint, which the service's older copy would silently destroy.
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`one-run · ${String(here.log.length)}`));
  });

  it("never resumes a run that has already been turned in", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    const finished = { ...aRunAt("session-finished"), stage: "submitted" as const };
    vi.stubGlobal("fetch", service({ worldId: "basketball", stage: "submitted", payload: finished }));
    open();
    // Re-opening a submitted attempt would offer to turn the same work in twice.
    await waitFor(() => expect(screen.getByTestId("where")).not.toHaveTextContent("session-finished"));
  });

  it("asks nobody anything when there is no session or no class named", async () => {
    const fetcher = service(null);
    vi.stubGlobal("fetch", fetcher);
    render(
      <MemoryRouter initialEntries={["/challenges/plan-under-pressure"]}>
        <Routes><Route path="/challenges/plan-under-pressure" element={<ResumeGate><Where /></ResumeGate>} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("where")).toBeInTheDocument());
    expect(fetcher).not.toHaveBeenCalled();
  });
});
