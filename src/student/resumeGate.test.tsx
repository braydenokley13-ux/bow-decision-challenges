// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeGate } from "./ResumeGate";
import { runToCarryOn } from "../app/attemptStore";
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
 * the student keeps what is here when it is genuinely ahead.** A student who carried on offline
 * after the last checkpoint has work here the service has never seen, and pulling the server's
 * older copy over it would be the sync losing the thing sync is for.
 *
 * **"Ahead" used to be measured as "longer", and that was wrong.** The file asserted
 * `here.log.length >= there.log.length → keep the local copy`, which is true of a device that
 * is ahead and *also* true of a device that has parted company with the service — so a verifier
 * put one seat on two machines, had one of them answer the bonuses offline while the other
 * answered them the other way online, and got two plans that never converged: `$1,800` counted
 * on one screen, `$0` on the other, both online, both reloaded twice, neither told. Both logs
 * were the same length, so both "won" for ever and each overwrote the service in turn.
 *
 * So the tests below hold ancestry rather than length, and the case the old rule could not see
 * — a fork — has tests of its own. The one that mattered is the last: **two machines given the
 * same pair of copies must reach the same answer**, because that, and not any message between
 * them, is what makes them converge.
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

  it("keeps what is on this machine when this machine is genuinely ahead of the service", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    const here = aRunAt("one-run", TWO_MORE);
    const there = aRunAt("one-run");
    // The premise of the test, asserted rather than assumed: the service's copy is a genuine
    // prefix of this one — the same run, with two decisions on the end that the last checkpoint
    // did not carry. Without this the comparison could pass because both sides are the same.
    expect(here.log.length).toBeGreaterThan(there.log.length);
    expect(here.log.slice(0, there.log.length)).toEqual(there.log);
    window.localStorage.setItem(attemptKeyForWorld("basketball"), JSON.stringify(here));
    vi.stubGlobal("fetch", service({ worldId: "basketball", stage: there.stage, payload: there }));
    open();
    // Same run, and this browser has two events the service has not been told about — work done
    // after the last checkpoint, which the service's older copy would silently destroy.
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`one-run · ${String(here.log.length)}`));
  });

  /**
   * One child, two machines, and the same question answered both ways.
   *
   * This is the verifier's reproduction in a test: a shared prefix, then the attendance bonus
   * counted **in** on one machine and **out** on the other. The two logs are the same length,
   * which is exactly why the old rule could not see it — `here.log.length >= there.log.length`
   * was true on both machines at once, so both kept their own copy for ever and each overwrote
   * the service on its next checkpoint.
   */
  function twoPlans() {
    const shared = aRunAt("one-run", TWO_MORE);
    const countedIn = challengeReducer(shared, { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: true, at: 1_770_000_000_500 });
    const leftOut = challengeReducer(shared, { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: false, at: 1_770_000_000_900 });
    // The premise, asserted rather than assumed: two copies of one run, the same length, that
    // disagree. A pair that differed in length would pass this test for the wrong reason.
    expect(countedIn.log.length).toBe(leftOut.log.length);
    expect(countedIn.meta.sessionId).toBe(leftOut.meta.sessionId);
    return { countedIn, leftOut };
  }

  it("takes the answer the student gave most recently when two machines have parted", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    const { countedIn, leftOut } = twoPlans();
    // This machine is the one that answered first, so its copy is the one set aside.
    window.localStorage.setItem(attemptKeyForWorld("basketball"), JSON.stringify(countedIn));
    vi.stubGlobal("fetch", service({ worldId: "basketball", stage: leftOut.stage, payload: leftOut }));
    open();
    // The student is told, before the board comes back, that the copy on this computer is not
    // the one being kept. Under the old rule this screen did not exist and this machine went on
    // showing $800 counted in for ever.
    await waitFor(() => expect(screen.getByRole("heading", { name: /Carry on where you left off/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Carry on" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`one-run · ${String(leftOut.log.length)}`));
    // And written down, so a second reload does not say it a second time.
    const kept = JSON.parse(window.localStorage.getItem(attemptKeyForWorld("basketball")) ?? "null") as ChallengeState;
    expect(kept.log).toEqual(leftOut.log);
  });

  it("keeps this machine's copy, and says nothing, when this machine holds the later answer", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    const { countedIn, leftOut } = twoPlans();
    window.localStorage.setItem(attemptKeyForWorld("basketball"), JSON.stringify(leftOut));
    vi.stubGlobal("fetch", service({ worldId: "basketball", stage: countedIn.stage, payload: countedIn }));
    open();
    // Nothing of this student's is gone, so nothing interrupts them. The machine that lost the
    // fork is the one that has something to say, and it says it where it can be acted on.
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`one-run · ${String(leftOut.log.length)}`));
    expect(screen.queryByRole("heading", { name: /Carry on where you left off/i })).not.toBeInTheDocument();
    const kept = JSON.parse(window.localStorage.getItem(attemptKeyForWorld("basketball")) ?? "null") as ChallengeState;
    expect(kept.log).toEqual(leftOut.log);
  });

  it("gives both machines the same answer, which is what makes them converge", () => {
    const { countedIn, leftOut } = twoPlans();
    // No message passes between two devices. They agree because the rule is a function of the
    // two copies, so the machine holding the earlier answer adopts and the machine holding the
    // later one keeps — and after one load each, both are showing the same plan.
    expect(runToCarryOn(countedIn, leftOut)).toEqual({ take: "there", forked: true });
    expect(runToCarryOn(leftOut, countedIn)).toEqual({ take: "here", forked: true });
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
