// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runPopUp } from "../../test/runPopUp";
import type { PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { attemptKeyForWorld } from "../../domain/io/persistence";
import type { EvidenceTransport } from "../../platform/evidence/transport";

/**
 * Tuesday's market, opened on Thursday, on a different Chromebook.
 *
 * Two halves, and the product had neither of them for this world. The checkpoint half —
 * `PUT /me/attempt` — is what a teacher's live panel reads, and without it the panel named a
 * student "Not started" while she was mid-run. The resume half is what the student gets back.
 *
 * These are about the market's own gate: given a service that is holding this seat's market
 * run, the provider must have it *before* the reducer chooses its initial state, because a
 * reducer's initial state is chosen once at mount and a run dispatched in afterwards is a
 * reducer adopting a state it did not produce.
 */

const service = vi.hoisted(() => ({
  attempt: null as { worldId: string; stage: string; payload: unknown } | null,
  token: "student-token",
  checkpoints: [] as { classCode: string; worldId: string; stage: string }[],
}));

vi.mock("../../student/session", () => ({
  studentToken: () => service.token,
  readMyAttempt: () => Promise.resolve({ ok: true as const, body: { attempt: service.attempt, seatCode: "7" } }),
  checkpointAttempt: (input: { classCode: string; worldId: string; stage: string }) => {
    service.checkpoints.push(input);
    return Promise.resolve({ ok: true as const, body: { savedAt: 1 } });
  },
}));

const { PopUpProvider, usePopUp } = await import("./PopUpContext");

const TRANSPORT: EvidenceTransport = {
  id: "localOnly",
  requiresClass: true,
  promise: "Your work stays on this device.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

function Where() {
  const { state } = usePopUp();
  return (
    <div>
      <p data-testid="stage">{state.stage}</p>
      <p data-testid="spot">{state.spotId ?? "none"}</p>
      <p data-testid="events">{state.log.length}</p>
    </div>
  );
}

function mount(seat: { classCode: string; seatCode: string; assignmentId: string }) {
  return render(
    <MemoryRouter>
      <PopUpProvider seed={seat} transport={TRANSPORT}><Where /></PopUpProvider>
    </MemoryRouter>,
  );
}

/** A real run, stopped part-way, exactly as the service would be holding it. */
function partway(): PopUpState {
  const state = runPopUp({ seatCode: "7", stopAfterSaturdayThree: true });
  return state;
}

beforeEach(() => {
  window.localStorage.clear();
  service.attempt = null;
  service.token = "student-token";
  service.checkpoints = [];
  Object.defineProperty(window, "crypto", { value: { randomUUID: () => "session-fixed" }, configurable: true });
});
afterEach(cleanup);

describe("a market run started on another machine", () => {
  it("is in hand before the reducer picks its initial state", async () => {
    const there = partway();
    service.attempt = { worldId: "food-truck", stage: there.stage, payload: there };
    mount({ classCode: there.meta.classCode, seatCode: there.meta.seatCode, assignmentId: "" });
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent(there.stage));
    expect(screen.getByTestId("spot")).toHaveTextContent("middle-row");
    expect(screen.getByTestId("events")).toHaveTextContent(String(there.log.length));
  });

  it("is left alone when this machine is at least as far along", async () => {
    // Sync losing the thing sync is for. A student who carried on offline here has work the
    // service has never seen, and an older server copy must not land on top of it.
    const there = partway();
    const here = runPopUp({ seatCode: "7" });
    window.localStorage.setItem(attemptKeyForWorld("food-truck"), JSON.stringify(here));
    service.attempt = { worldId: "food-truck", stage: there.stage, payload: there };
    mount({ classCode: here.meta.classCode, seatCode: here.meta.seatCode, assignmentId: "" });
    await waitFor(() => expect(screen.getByTestId("events")).toHaveTextContent(String(here.log.length)));
  });

  it("is refused when it belongs to a different seat", async () => {
    // The case the seat check exists for: a shared Chromebook where the last student left an
    // unfinished market behind. A run filed under somebody else's seat is not this student's
    // to carry on with, whichever machine it came from.
    const there = partway();
    service.attempt = { worldId: "food-truck", stage: there.stage, payload: there };
    mount({ classCode: there.meta.classCode, seatCode: "11", assignmentId: "" });
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("popup-spot"));
    expect(screen.getByTestId("spot")).toHaveTextContent("none");
  });

  it("is ignored when the service is holding the other world's run", async () => {
    service.attempt = { worldId: "basketball", stage: "working-plan", payload: { meta: { sessionId: "x" } } };
    mount({ classCode: "H4KVW", seatCode: "7", assignmentId: "" });
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("popup-spot"));
  });

  it("asks nobody when there is no session to ask with", () => {
    service.token = "";
    service.attempt = { worldId: "food-truck", stage: "popup-plan", payload: partway() };
    mount({ classCode: "H4KVW", seatCode: "7", assignmentId: "" });
    // Settled during render rather than after a load, so the market opens without a flash.
    expect(screen.getByTestId("stage")).toHaveTextContent("popup-spot");
  });
});

describe("what the teacher's live panel is told", () => {
  it("checkpoints the market run to the service, under this world's id", async () => {
    mount({ classCode: "H4KVW", seatCode: "7", assignmentId: "assignment-1" });
    await waitFor(() => expect(service.checkpoints.length).toBeGreaterThan(0));
    const last = service.checkpoints.at(-1)!;
    expect(last.worldId).toBe("food-truck");
    expect(last.classCode).toBe("H4KVW");
    expect(last.stage).toBe("popup-spot");
  });
});
