// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Context } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import type { EvidenceTransport } from "../platform/evidence/transport";

/** The one shape `readMyClasses` returns here — just enough of `/me/classes` to resolve a seat. */
interface FakeClassesResult {
  ok: true;
  body: { classes: { classCode: string; label: string; seatCode: string; displayName: string; assignments: unknown[]; inProgress: null; completed: never[]; feedback: never[] }[] };
}

/**
 * The defect this file exists to close: `OpeningStage` fired `SESSION_STARTED` from an effect
 * the instant a real class resolved a seat, which moved `state.meta.stage` off `entry`
 * (`reducer.ts`) before the roster card, the offer or a `Start` button were ever painted.
 * `RosterCard`, `CourtBackdrop` and Avery's own invitation were live code, reachable only by
 * the no-class-service preview a teacher plays from the guide — dead for every student in
 * every real class this product has ever run, exactly the world `pacing.ts` budgets 55 seconds
 * of reading for.
 *
 * These tests hold the fix at the seam the bug lived in: a class-connected transport
 * (`requiresClass: true`, what every real classroom uses — `transports.ts`) reaches the same
 * screen the offline preview always drew, and starting the run is something the student does,
 * not something an effect does to them. `openingSingleWorld.test.tsx` holds the branch of that
 * same screen the ticket names directly — Avery, the roster card, "eight weeks to the regional
 * showcase" — which this build's two playable worlds do not reach at `entry` (see below).
 */

vi.mock("../app/ChallengeContext", async () => {
  const { createContext: create, useContext: use } = await import("react");
  const Challenge = create<unknown>(null);
  return { useChallenge: () => use(Challenge), TestChallengeContext: Challenge };
});

const readMyClasses = vi.fn<() => Promise<FakeClassesResult>>();
vi.mock("../student/session", () => ({
  studentToken: () => "token",
  forgetStudent: vi.fn(),
  readMyClasses: () => readMyClasses(),
}));

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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); readMyClasses.mockReset(); });

const REAL_CLASS_TRANSPORT: EvidenceTransport = {
  id: "classService",
  requiresClass: true,
  promise: "Your work goes to your teacher’s class when you turn it in.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

/** One seat, resolved the way `/me/classes` actually shapes it, with no assignment to speak of. */
function oneRealClass() {
  readMyClasses.mockResolvedValue({
    ok: true,
    body: {
      classes: [{
        classCode: "H4KVW", label: "Period 3", seatCode: "7", displayName: "Ada L.",
        assignments: [], inProgress: null, completed: [], feedback: [],
      }],
    },
  });
}

function Arrival({ dispatch, setOffer }: { dispatch: (action: ChallengeAction) => void; setOffer: (offer: unknown) => void }) {
  return (
    <TestChallengeContext.Provider
      value={{
        state: createInitialState(1), dispatch, transport: REAL_CLASS_TRANSPORT, setOffer,
        activeWorldId: "basketball", delivery: { status: "idle" }, handOver: () => {},
      }}
    >
      <StudentChallenge />
    </TestChallengeContext.Provider>
  );
}

describe("a real student meets the world's opening before the run starts", () => {
  // This build offers two worlds (`PLAYABLE_WORLDS.length > 1`), so `entry` draws the
  // choice-aware version of this screen rather than Avery's specific invitation — "Where there
  // is a choice to make, the choice is the story" (`StudentChallenge.tsx`). The Avery-specific
  // branch, exactly as the ticket names it, is held by `openingSingleWorld.test.tsx`, which
  // mocks the registry down to one world the way a single-world deployment would run for real.
  it("draws this screen — not a waiting spinner it never leaves — and waits for a press before starting", async () => {
    oneRealClass();
    const dispatch = vi.fn();
    render(<MemoryRouter><Arrival dispatch={dispatch} setOffer={vi.fn()} /></MemoryRouter>);

    // Loading first — there is a real seat to resolve before anything else can be true.
    expect(screen.getByText("Getting your class…")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Two ways in. You pick one." })).toBeInTheDocument();
    expect(screen.getByText("Ada L.")).toBeInTheDocument();
    expect(screen.getByText("Period 3")).toBeInTheDocument();

    // The whole bug in one assertion: arriving at this screen must not, on its own, have
    // started the session. Only a press does — this used to fire from an effect the instant
    // `seat` resolved, before any of the above was ever painted.
    expect(dispatch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Go in" }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "SESSION_STARTED", classCode: "H4KVW", seatCode: "7" }));
  });

  it("still lets a class with no service preview the run without a button press waiting on it", async () => {
    // The branch this screen always drew, for the guide's "Try it as a student" — unaffected
    // by the fix, since it never went through the effect the bug lived in.
    const dispatch = vi.fn();
    const OFFLINE_TRANSPORT: EvidenceTransport = { ...REAL_CLASS_TRANSPORT, id: "fileHandoff", requiresClass: false };
    render(
      <MemoryRouter>
        <TestChallengeContext.Provider
          value={{
            state: createInitialState(1), dispatch, transport: OFFLINE_TRANSPORT, setOffer: vi.fn(),
            activeWorldId: "basketball", delivery: { status: "idle" }, handOver: () => {},
          }}
        >
          <StudentChallenge />
        </TestChallengeContext.Provider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: "Go in" })).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not stall on the waiting screen when a real class resolves — the old always-true gate is gone", async () => {
    oneRealClass();
    const dispatch = vi.fn();
    render(<MemoryRouter><Arrival dispatch={dispatch} setOffer={vi.fn()} /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText("Getting your class…")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Go in" })).toBeInTheDocument();
  });
});
