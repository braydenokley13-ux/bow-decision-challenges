// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "react";
import type * as CompletedRun from "../completedRun";

/**
 * Reading help exists on the screens a student has to read to decide, not only inside a run.
 *
 * It was mounted in `StageShell` and `PopUpShell` and nowhere else, which put the accommodation
 * on every screen of the run and on none of the screens before it. The world picker is the one
 * that matters: roughly 150 words, two story descriptions, a *"You are…"* line and a length
 * each, and it asks a twelve-year-old to commit to one of them for the next twenty to
 * twenty-eight minutes. It is the last screen before the help exists and the first screen where
 * a student has to read in order to choose — so a child who cannot read it unaided made that
 * choice unaided, and only then met the control that would have read it to them.
 *
 * `/home` is the same argument one screen earlier: it says what this student has done, what is
 * left, and which of two stories they are being offered.
 *
 * `/join` is still without it and is deliberately not asserted here — the class door belongs to
 * another change.
 */

const seen = vi.hoisted(() => ({ classes: [] as unknown[] }));
vi.mock("../session", () => ({
  studentToken: () => "tok",
  forgetStudent: () => {},
}));
vi.mock("../completedRun", async (importOriginal) => ({
  ...(await importOriginal<typeof CompletedRun>()),
  readClasses: () => Promise.resolve({ ok: true as const, body: { classes: seen.classes } }),
}));
vi.mock("../../app/ChallengeContext", async () => {
  const { createContext, useContext } = await import("react");
  const Challenge = createContext<unknown>(null);
  return { useChallenge: () => useContext(Challenge), TestChallengeContext: Challenge };
});

const { StudentHome } = await import("../Home");
const { WorldChoice } = await import("../../stages/WorldChoice");
const { TestChallengeContext } = await import("../../app/ChallengeContext") as unknown as { TestChallengeContext: Context<unknown> };

beforeEach(() => {
  window.localStorage.clear();
  seen.classes = [];
});
afterEach(cleanup);

describe("the screens outside a run", () => {
  it("offers reading help on the student's own page", async () => {
    render(<MemoryRouter><StudentHome /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: /you are not in a class yet/i })).toBeVisible());
    expect(screen.getByRole("button", { name: /reading help/i })).toBeVisible();
  });

  it("offers reading help on the screen where the student picks a story", () => {
    // The picker needs an offer with a choice in it; without one it draws no screen at all and
    // opens the only world there is.
    render(
      <MemoryRouter>
        <TestChallengeContext.Provider value={{
          state: { meta: { classCode: "H4KVW", assignmentId: "a", worldId: "basketball" } },
          dispatch: () => {},
          transport: { join: () => Promise.resolve({ ok: false }) },
          offer: { studentChooses: true, worldIds: ["basketball", "food-truck"], opensInto: "basketball" },
          setOffer: () => {},
          enterWorld: () => {},
        }}>
          <WorldChoice />
        </TestChallengeContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByRole("button", { name: /reading help/i })).toBeVisible();
    // And it reads the two cards rather than the chrome around them, which is what `<main>` is.
    expect(document.querySelector("main.worldpick__main")).toBeInTheDocument();
  });
});
