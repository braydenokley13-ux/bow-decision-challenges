// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentHome } from "./Home";
import { RunReport } from "./RunReport";
import { attemptKeyForWorld, loadAttemptFor } from "../domain/io/persistence";
import { runPopUp } from "../test/runPopUp";
import type { PopUpState } from "../domain/scenario/worlds/food-truck/machine";

/**
 * The way back in, and the thing it must not destroy on the way.
 *
 * A student who finished had no offered route to a second run — the turn-in screen's own
 * button clears the attempt and lands on the marketing home page, and `/home` drew the start
 * card only while nothing had been turned in. The route a student actually used was typing
 * the challenge URL, which is the one route the product cannot label.
 *
 * The trap in fixing it is that "again" has to clear this machine's copy of the attempt, and
 * that copy is where the recap of the finished run is read from. These tests hold both ends:
 * the button exists and works, and using it does not cost a student the account of the run
 * they just turned in.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

const CLASS_CODE = "H4KVW";

function stash(state: PopUpState) {
  window.localStorage.setItem(attemptKeyForWorld("food-truck"), JSON.stringify({
    meta: { schemaVersion: 1, challengeId: state.meta.challengeId, worldId: "food-truck" },
    stage: state.stage,
    log: state.log,
    snapshots: [],
  }));
}

function service(state: PopUpState, options: { inProgress?: unknown; chooses?: boolean } = {}) {
  const classes = JSON.stringify({
      classes: [{
        classCode: CLASS_CODE,
        label: "Period 3 · Grade 7",
        seatCode: "7",
        displayName: "Robin",
        assignments: [{
          id: "a1", classId: CLASS_CODE, objectiveRef: null, competencyIds: [],
          allowedWorldIds: ["basketball", "food-truck"],
          studentChoosesWorld: options.chooses ?? true,
          format: "decision-challenge", assignedStudentIds: null, createdAt: 1,
        }],
        inProgress: options.inProgress ?? null,
        completed: [{ sessionId: state.meta.sessionId, submittedAt: 1_780_000_100_000, worldId: "food-truck" }],
        feedback: [],
      }],
  });
  return vi.fn((url: string) => {
    // The finished run comes from the class service now, so clearing this machine's attempt
    // cannot cost the student the account of it. That is what the last test here proves.
    if (String(url).includes("/me/runs/")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          sessionId: state.meta.sessionId,
          classCode: CLASS_CODE,
          label: "Period 3 · Grade 7",
          seatCode: "7",
          submittedAt: 1_780_000_100_000,
          log: state.log,
        }),
      } as unknown as Response);
    }
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(classes), json: () => Promise.resolve(JSON.parse(classes)) } as unknown as Response);
  });
}

function openHome() {
  window.localStorage.setItem("bow.student.v1.token", "a-session");
  return render(<MemoryRouter initialEntries={["/home"]}><StudentHome /></MemoryRouter>);
}

describe("a student who finished can go again, and is offered it", () => {
  it("puts one labelled way back in on the screen they land on", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    openHome();
    const again = await screen.findByRole("link", { name: "Play it again" });
    expect(again).toHaveAttribute("href", `/challenges/plan-under-pressure?class=${CLASS_CODE}`);
  });

  it("says plainly that the run already turned in is not taken back", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    openHome();
    expect(await screen.findByText(/Starting again does not take the last one back/)).toBeInTheDocument();
    expect(screen.getByText(/turned in as well as it, not instead of it/)).toBeInTheDocument();
  });

  it("names the story that is still unplayed when the class lets the student pick", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    openHome();
    expect(await screen.findByText(/Eight Weeks to the Showcase is still there/)).toBeInTheDocument();
  });

  it("offers nothing to beat, because there is nothing to beat", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    openHome();
    expect(await screen.findByText(/no score here to beat/)).toBeInTheDocument();
  });

  it("is not offered while a run is still unfinished", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state, { inProgress: { worldId: "food-truck", stage: "popup-plan", updatedAt: 1 } }));
    openHome();
    await screen.findByRole("link", { name: "Carry on" });
    expect(screen.queryByRole("link", { name: "Play it again" })).not.toBeInTheDocument();
  });

  it("clears this machine's attempt so the new run is a new run", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    openHome();
    const again = await screen.findByRole("link", { name: "Play it again" });
    expect(loadAttemptFor("food-truck")).not.toBeNull();
    await userEvent.click(again);
    expect(loadAttemptFor("food-truck")).toBeNull();
  });
});

describe("a network that drops is not a student who signed out", () => {
  it("keeps the session and says what happened, rather than sending them back to the door", async () => {
    const state = runPopUp();
    stash(state);
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network"))));
    render(<MemoryRouter initialEntries={["/home"]}><StudentHome /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Your class did not load.", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/almost always the wifi/)).toBeInTheDocument();
    // The one that matters: their card still gets them back in without typing it again.
    expect(window.localStorage.getItem("bow.student.v1.token")).toBe("a-session");
  });

  it("still signs a student out when the service says the session is dead", async () => {
    window.localStorage.setItem("bow.student.v1.token", "a-session");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) } as unknown as Response)));
    render(<MemoryRouter initialEntries={["/home"]}><StudentHome /></MemoryRouter>);
    await waitFor(() => expect(window.localStorage.getItem("bow.student.v1.token")).toBeNull());
  });
});

describe("a checkpoint on a screen before the story starts is not a run in progress", () => {
  it("draws no Carry on for a student who only ever opened the picker", async () => {
    const state = runPopUp();
    stash(state);
    // A real checkpoint, not a bug: a student who opened the challenge, read both cards and
    // closed the tab is parked on `choose-world` with no decisions behind them. "Carry on"
    // there is a button back into a screen they have already answered.
    vi.stubGlobal("fetch", service(state, { inProgress: { worldId: "basketball", stage: "choose-world", updatedAt: 9 } }));
    openHome();
    await screen.findByRole("link", { name: "Play it again" });
    expect(screen.queryByRole("link", { name: "Carry on" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Choosing a story/)).not.toBeInTheDocument();
  });

  it("leaves a real unfinished run exactly where it is", async () => {
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state, { inProgress: { worldId: "food-truck", stage: "popup-plan", updatedAt: 9 } }));
    openHome();
    expect(await screen.findByRole("link", { name: "Carry on" })).toBeInTheDocument();
    expect(screen.getByText(/You stopped at/)).toBeInTheDocument();
  });
});

describe("going again does not cost a student the run they just turned in", () => {
  it("reads the finished run back from the service after the attempt it lived in is cleared", async () => {
    const state = runPopUp({ spotId: "bridge-gate" });
    stash(state);
    vi.stubGlobal("fetch", service(state));
    openHome();
    const again = await screen.findByRole("link", { name: "Play it again" });
    await userEvent.click(again);
    expect(loadAttemptFor("food-truck")).toBeNull();

    cleanup();
    render(
      <MemoryRouter initialEntries={[`/run/${CLASS_CODE}/${state.meta.sessionId}`]}>
        <Routes><Route path="/run/:classCode/:sessionId" element={<RunReport />} /></Routes>
      </MemoryRouter>,
    );
    // The same sentences, out of the copy the student turned in rather than out of the one
    // "again" has just deleted.
    expect(await screen.findByText(/Bridge Gate booth/)).toBeInTheDocument();
    expect(screen.queryByText(/could not reach your class/)).not.toBeInTheDocument();
  });
});
