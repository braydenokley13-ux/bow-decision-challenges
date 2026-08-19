// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runPopUp } from "../../test/runPopUp";
import type { EvidenceTransport } from "../../platform/evidence/transport";

/**
 * Who the market thinks is sitting here, on a machine that has never seen the run.
 *
 * The defect this file exists against was measured in two browser profiles: a student stopped
 * at *Saturdays 2 and 3* on one laptop, signed in on another, was told *"Run the Pop-Up — you
 * stopped at Saturdays 2 and 3 — Carry on"*, pressed it, and landed at *NO SEAT YET · Where do
 * you set up?* with all three booths on offer and $1,900 back in the account — while the
 * service was answering `GET /me/attempt` with the whole eighteen-event run.
 *
 * The cause was a seam, not a bug in the market. `PopUpChallenge` read the class and the seat
 * out of `useChallenge().state.meta`, which is Basketball's reducer. On the same device that
 * happens to be populated, because the screen that starts a run dispatches `SESSION_STARTED`
 * into it before either world opens. On a second device the outer `ResumeGate` carries only
 * the world id — each world's state is a different shape — so that reducer mounts virgin, the
 * seed is empty, and the market's own resume gate short-circuits on `!seed.classCode` before
 * it ever asks the question it already knows the answer to.
 *
 * So these tests mount the market the way the second device mounts it: an empty seed from the
 * other world, a class named on the URL, and a service holding the run. Remove `useSessionSeat`
 * from `PopUpChallenge` and the first test lands on `popup-spot`, which is the screenshot.
 */

const service = vi.hoisted(() => ({
  token: "student-token",
  classes: [] as { classCode: string; seatCode: string; assignments: { id: string }[] }[],
  attempt: null as { worldId: string; stage: string; payload: unknown } | null,
  attemptAsks: [] as string[],
  classAsks: 0,
}));

vi.mock("../../student/session", () => ({
  studentToken: () => service.token,
  readMyClasses: () => {
    service.classAsks += 1;
    return Promise.resolve({ ok: true as const, body: { classes: service.classes } });
  },
  readMyAttempt: (classCode: string) => {
    service.attemptAsks.push(classCode);
    return Promise.resolve({ ok: true as const, body: { attempt: service.attempt, seatCode: "" } });
  },
  checkpointAttempt: () => Promise.resolve({ ok: true as const, body: { savedAt: 1 } }),
}));

const challenge = vi.hoisted(() => ({ meta: { classCode: "", seatCode: "", assignmentId: "" } }));

vi.mock("../../app/ChallengeContext", () => ({
  useChallenge: () => ({
    state: { meta: challenge.meta },
    transport: TRANSPORT,
    sample: false,
  }),
}));

const TRANSPORT: EvidenceTransport = {
  id: "localOnly",
  requiresClass: true,
  promise: "Your work stays on this device.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

const { PopUpChallenge } = await import("./PopUpChallenge");

/** The market, mounted at a URL that names a class, exactly as `/home`'s Carry on does. */
function open(classOnUrl: string) {
  return render(
    <MemoryRouter initialEntries={[`/challenges/plan-under-pressure?class=${classOnUrl}`]}>
      <PopUpChallenge />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  service.token = "student-token";
  service.classes = [];
  service.attempt = null;
  service.attemptAsks = [];
  service.classAsks = 0;
  challenge.meta = { classCode: "", seatCode: "", assignmentId: "" };
  Object.defineProperty(window, "crypto", { value: { randomUUID: () => "session-fixed" }, configurable: true });
});
afterEach(cleanup);

describe("the market on a second device", () => {
  it("carries on the run the service is holding, with an empty reducer beside it", async () => {
    const there = runPopUp({ seatCode: "2", stopAfterSaturdayThree: true });
    service.classes = [{ classCode: "H4KVW", seatCode: "2", assignments: [{ id: "assignment-1" }] }];
    service.attempt = { worldId: "food-truck", stage: there.stage, payload: there };
    open("H4KVW");
    // Three Saturdays sold and the generator down: this screen exists nowhere in a market
    // that started again, so finding it is finding the run.
    await waitFor(() => expect(screen.getByText(/The last two Saturdays/i)).toBeInTheDocument());
    expect(screen.getByText("H4KVW · seat 2")).toBeInTheDocument();
    expect(service.attemptAsks).toContain("H4KVW");
  });

  it("never opens a run with no seat when a class is named and a session is held", async () => {
    // The tell from the browser. A market that cannot say whose it is does not checkpoint, so
    // home goes on offering Carry on and Carry on goes on landing at the booths.
    service.classes = [{ classCode: "P6MKT", seatCode: "2", assignments: [{ id: "assignment-1" }] }];
    open("P6MKT");
    await waitFor(() => expect(screen.getByText("P6MKT · seat 2")).toBeInTheDocument());
    expect(screen.queryByText("No seat yet")).not.toBeInTheDocument();
  });
});

describe("what the market will take another world's word for", () => {
  it("takes the seat from the run it is already in, without a request", async () => {
    challenge.meta = { classCode: "P6MKT", seatCode: "2", assignmentId: "assignment-1" };
    open("P6MKT");
    await waitFor(() => expect(screen.getByText("P6MKT · seat 2")).toBeInTheDocument());
    // No second errand: a student already inside a run must not meet a request between
    // themselves and the screen they are on. The market's own gate asks about the *run*; who
    // is sitting here was settled during render.
    expect(service.classAsks).toBe(0);
  });

  it("refuses a seat filed under a class this arrival does not name", async () => {
    // The coupling, stated as a rule rather than left to luck. `state.meta` belongs to the
    // other world's reducer and is restored from this browser's last run, not from this
    // arrival — so a market that trusted it whenever it was populated would file a student's
    // work under whichever class they happened to play last.
    challenge.meta = { classCode: "OLDONE", seatCode: "9", assignmentId: "assignment-old" };
    service.classes = [{ classCode: "P6MKT", seatCode: "2", assignments: [{ id: "assignment-1" }] }];
    open("P6MKT");
    await waitFor(() => expect(screen.getByText("P6MKT · seat 2")).toBeInTheDocument());
    expect(service.attemptAsks).toEqual(["P6MKT"]);
  });

  it("opens with no seat rather than a guessed one when the class is not this student's", async () => {
    // A guessed seat files one child's work under another. Nothing is worth that.
    service.classes = [{ classCode: "OTHER", seatCode: "5", assignments: [] }];
    open("P6MKT");
    await waitFor(() => expect(screen.getByText("No seat yet")).toBeInTheDocument());
  });
});
