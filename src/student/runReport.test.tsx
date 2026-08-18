// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunReport } from "./RunReport";
import { StudentHome } from "./Home";
import { attemptKeyForWorld } from "../domain/io/persistence";
import { runPopUp } from "../test/runPopUp";
import type { PopUpState } from "../domain/scenario/worlds/food-truck/machine";

/**
 * The page a student opens after they have turned in, read as each of the four students it
 * has to be true for.
 *
 * These are the screen's half of the promises `domain/recap/recap.test.ts` holds for the
 * derivation: that the page prints no mark, that it says out loud it is silent about the
 * writing, that a teacher's words sit above BOW's, and that a run whose log is not on this
 * machine is described as a fact about the computer rather than as a fact about the child.
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

function service(state: PopUpState, feedback: unknown[] = []) {
  return vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({
      classes: [{
        classCode: CLASS_CODE,
        label: "Period 3 · Grade 7",
        seatCode: "7",
        displayName: "Robin",
        assignments: [],
        inProgress: null,
        completed: [{ sessionId: state.meta.sessionId, submittedAt: 1_780_000_100_000, worldId: "food-truck" }],
        feedback,
      }],
    })),
  } as Response));
}

function open(state: PopUpState) {
  return render(
    <MemoryRouter initialEntries={[`/run/${CLASS_CODE}/${state.meta.sessionId}`]}>
      <Routes><Route path="/run/:classCode/:sessionId" element={<RunReport />} /></Routes>
    </MemoryRouter>,
  );
}

function signedIn() {
  window.localStorage.setItem("bow.student.v1.token", "a-session");
}

describe("the confident student", () => {
  it("gets their own decisions back, with no mark anywhere on the page", async () => {
    signedIn();
    const state = runPopUp({ spotId: "bridge-gate", countCatering: true, coverLine: "cut" });
    stash(state);
    vi.stubGlobal("fetch", service(state));
    open(state);

    await screen.findByRole("heading", { name: "What your run shows", level: 1 });
    expect(await screen.findByText(/Bridge Gate booth/)).toBeInTheDocument();
    expect(screen.getByText(/There is no score on this page/)).toBeInTheDocument();
    // Scoped to what BOW derived, because the page's own opening paragraph has to be able
    // to say the words "no score" and "no level" out loud.
    const derived = [...document.querySelectorAll("[data-recap-topic]")].map((node) => node.textContent).join(" ");
    expect(derived).not.toMatch(/\bscore\b|\bpoints?\b|\blevel\b|\bbadge\b|\bgrade[sd]?\b/i);
    expect(derived).not.toMatch(/\d+\s*(?:\/|out of)\s*\d+|\d+\s?%/);
  });

  it("says the writing is a person's job and has not been read", async () => {
    signedIn();
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    open(state);
    expect(await screen.findByText(/has not read it yet/)).toBeInTheDocument();
  });
});

describe("the student who walked past whole beats", () => {
  it("is told the beat never came up, and reads nothing about it", async () => {
    signedIn();
    const state = runPopUp({ skipTipClaims: true, closeByHand: true });
    stash(state);
    vi.stubGlobal("fetch", service(state));
    open(state);
    expect(await screen.findByText(/The tips jar never came up in your run/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/cool box|night cleaner/i);
  });
});

describe("the student who used every scaffold", () => {
  it("reads that using help is allowed and is written down as help", async () => {
    signedIn();
    const state = runPopUp({ scaffold: ["owed-up-front", "cash-to-plan", "first-order", "swap-gap"] });
    stash(state);
    vi.stubGlobal("fetch", service(state));
    open(state);
    expect(await screen.findByText(/Using them is allowed/)).toBeInTheDocument();
    expect(screen.getAllByText(/You opened the step-by-step help/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/\bfailed\b|\bcheat|\bshould have\b/i);
  });
});

describe("the student who got things wrong", () => {
  it("reads the mistake and what they did next in the same sentence", async () => {
    signedIn();
    const state = runPopUp({ fumbleSums: ["owed-up-front"], reachForCommitted: 2 });
    stash(state);
    vi.stubGlobal("fetch", service(state));
    open(state);
    expect(await screen.findByText(/Your first answer was .*; you changed it to .* and carried on\./)).toBeInTheDocument();
    expect(screen.getByText(/You reached twice for money that was already spent/)).toBeInTheDocument();
  });
});

describe("the teacher goes first", () => {
  it("puts a note from a person above everything BOW derived", async () => {
    signedIn();
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state, [{ id: "note-1", body: "Strong on the cushion. Read your last sentence again.", at: 1_780_000_200_000, sessionId: state.meta.sessionId }]));
    open(state);
    const note = await screen.findByText(/Strong on the cushion/);
    const derived = await screen.findByText(/booth\./);
    // The note is earlier in the document than the first derived sentence.
    expect(note.compareDocumentPosition(derived) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("a run whose log is not on this computer", () => {
  it("says so as a fact about the machine, and never as nothing to show", async () => {
    signedIn();
    const state = runPopUp();
    // Nothing stashed: this is the class laptop's copy opened at home.
    vi.stubGlobal("fetch", service(state));
    open(state);
    expect(await screen.findByText(/This one is not on this computer\./)).toBeInTheDocument();
    expect(screen.getByText(/went to your teacher and it is safe/)).toBeInTheDocument();
  });
});

describe("somebody else's run", () => {
  it("is not opened, whatever the URL says", async () => {
    signedIn();
    const state = runPopUp();
    stash(state);
    vi.stubGlobal("fetch", service(state));
    render(
      <MemoryRouter initialEntries={[`/run/${CLASS_CODE}/not-my-session`]}>
        <Routes><Route path="/run/:classCode/:sessionId" element={<RunReport />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/That run is not one of yours\./)).toBeInTheDocument();
  });
});

describe("the way in", () => {
  it("is one link on the finished card, and it says what is behind it", async () => {
    signedIn();
    const state = runPopUp();
    vi.stubGlobal("fetch", service(state));
    render(<MemoryRouter initialEntries={["/home"]}><StudentHome /></MemoryRouter>);
    const link = await screen.findByRole("link", { name: "See what your run shows" });
    expect(link).toHaveAttribute("href", `/run/${CLASS_CODE}/${state.meta.sessionId}`);
  });
});
