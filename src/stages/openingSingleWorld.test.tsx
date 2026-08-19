// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Context } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import type { EvidenceTransport } from "../platform/evidence/transport";
import type * as Registry from "../domain/scenario/registry";

/**
 * The exact content the ticket names: "the roster card, Avery's call, the $1,200 course,
 * 'eight weeks to the regional showcase'". `openingRendersForRealClass.test.tsx` proves
 * `entry` renders for a real class in *this* build, which currently offers two worlds and so
 * draws the choice-aware version of that same screen — "Where there is a choice to make, the
 * choice is the story" (`StudentChallenge.tsx`). This file narrows `PLAYABLE_WORLDS` to one,
 * the way a single-world deployment actually runs, to hold the specific branch the bug made
 * unreachable: `RosterCard`, `CourtBackdrop`, the goal strip and Avery's own invitation.
 */

vi.mock("../app/ChallengeContext", async () => {
  const { createContext: create, useContext: use } = await import("react");
  const Challenge = create<unknown>(null);
  return { useChallenge: () => use(Challenge), TestChallengeContext: Challenge };
});
vi.mock("../student/session", () => ({
  studentToken: () => "token",
  forgetStudent: vi.fn(),
  readMyClasses: () => Promise.resolve({
    ok: true,
    body: {
      classes: [{
        classCode: "H4KVW", label: "Period 3", seatCode: "7", displayName: "Ada L.",
        assignments: [], inProgress: null, completed: [], feedback: [],
      }],
    },
  }),
}));
vi.mock("../domain/scenario/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof Registry>();
  // One world compiled in — the configuration `choosing` is written for, and the one every
  // build ran until the second world shipped.
  return { ...actual, PLAYABLE_WORLDS: [actual.WORLD_REGISTRY.basketball] };
});

const { StudentChallenge } = await import("./StudentChallenge");
const { TestChallengeContext } = (await import("../app/ChallengeContext")) as unknown as {
  TestChallengeContext: Context<unknown>;
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const REAL_CLASS_TRANSPORT: EvidenceTransport = {
  id: "classService",
  requiresClass: true,
  promise: "Your work goes to your teacher’s class when you turn it in.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

describe("a single-world class meets Avery before the run starts", () => {
  it("draws the roster card and the offer, and waits for Start rather than the picker teaser", async () => {
    const dispatch = vi.fn<(action: ChallengeAction) => void>();
    render(
      <MemoryRouter>
        <TestChallengeContext.Provider
          value={{
            state: createInitialState(1), dispatch, transport: REAL_CLASS_TRANSPORT, setOffer: vi.fn(),
            activeWorldId: "basketball", delivery: { status: "idle" }, handOver: () => {},
          }}
        >
          <StudentChallenge />
        </TestChallengeContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Make the season work." })).toBeInTheDocument();
    expect(screen.getByText("Avery got the call.")).toBeInTheDocument();
    expect(screen.getByText(/Avery Reyes, 18, gets the last roster spot/)).toBeInTheDocument();
    expect(screen.getByText("Eight weeks · ends at the regional showcase")).toBeInTheDocument();
    expect(screen.getByText("$1,200")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Start the eight weeks" }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "SESSION_STARTED" }));
  });
});
