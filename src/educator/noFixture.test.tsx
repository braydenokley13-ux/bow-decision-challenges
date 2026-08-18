// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { PropsWithChildren } from "react";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { analyseClass } from "./analysis";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { useClassEvidence, type ClassEvidenceState } from "./useClassEvidence";
import { DEMO_CLASS_CODE, demoClassBundle } from "../fixtures/demoClass";
import { CODE_LENGTH, isWellFormedClassCode } from "../platform/classes/codes";
import type { SubmissionRecord } from "../platform/classes/types";
import { buildSubmission } from "../test/runChallenge";

/**
 * The no-fixture invariant.
 *
 * Once a real class is being viewed, no student row, explanation, score, observation,
 * competency result, class count, distribution, debrief insight or recommendation may come
 * from `demoClass` or any other synthetic source. Missing data renders as missing.
 *
 * **This used to be checked structurally**: a scan of every real-class module's own import
 * list, failing the build if one of them so much as mentioned `fixtures` or `demo`. That
 * check is gone, and not because the invariant stopped mattering — because the fix for the
 * defect this replaces (`/educator/demo` rendering a bespoke product a real class never
 * produces) is to feed the sample class through the *same* real-class code the service feeds
 * a real one, `useClassEvidence` included. The moment that hook can answer "ready" for the
 * sample, it necessarily imports the fixture — an import scan of that file would fail on
 * sight of a change that made the product more honest, not less. A structural ban on an
 * import can only ever say "this module never mentions that module." It cannot say the one
 * thing that actually matters, which is a claim about *runtime reachability for a specific
 * value*: no class code a real teacher's room could ever hold reaches this data, no matter
 * how the code that touches the fixture is organised.
 *
 * So the invariant is behavioural instead, built on one structural fact that cannot drift:
 * `DEMO_CLASS_CODE` is four characters, and every class code the service will ever hand a
 * teacher is exactly `CODE_LENGTH` (five) characters drawn from `CODE_ALPHABET`
 * (`src/platform/classes/codes.ts`). That is not a promise anybody has to keep by
 * discipline — it is arithmetic, checked below, and it is what makes it safe for
 * `useClassEvidence` to special-case one literal string. The four tests below are the
 * behavioural replacement, one per way this could still go wrong: the marker could stop
 * being well-formed-code-shaped (it must never become able to), a well-formed code could
 * start reaching the fixture instead of the service (it must not), an empty real class could
 * start looking like the twenty-student sample instead of like nothing (it must not), and the
 * sample could stop announcing itself on a screen that added new content (it must not). What
 * all four are protecting against is the same failure stated in `standardsHonesty.test.tsx`'s
 * neighbourhood but sharper here: a teacher who cannot tell a distribution is real cannot use
 * any of it, and a teacher who *can't tell the difference* plans a lesson on numbers that
 * came from nobody.
 */

afterEach(cleanup);

function withEntries(path: string) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  };
}

type ReadyState = Extract<ClassEvidenceState, { status: "ready" }>;

describe("the demo marker cannot be mistaken for a real class code", () => {
  it("fails isWellFormedClassCode", () => {
    expect(isWellFormedClassCode(DEMO_CLASS_CODE)).toBe(false);
  });

  it("fails on length alone — no rearrangement of these four letters becomes five", () => {
    expect(DEMO_CLASS_CODE).toHaveLength(4);
    expect(CODE_LENGTH).toBe(5);
  });
});

describe("a class code either reaches the service or reaches the fixture, never either for the other", () => {
  it("sends a well-formed class code to the service, and calls the fixture builder zero times to do it", async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = ((url: string) => {
      calls.push(String(url));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          class: { code: "H4KVW", label: "Period 3", challengeId: "plan-under-pressure", createdAt: 0, expiresAt: 0 },
          assignments: [],
          submissions: [],
        }),
      });
    }) as unknown as typeof fetch;
    try {
      const { result } = renderHook(() => useClassEvidence("H4KVW"), {
        wrapper: withEntries("/educator/class/H4KVW?key=abcdefghijklmnop"),
      });
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      expect(calls).toHaveLength(1);
      expect(calls[0]).toContain("/classes/H4KVW/submissions");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("never sends the demo marker to the service, and answers ready from the fixture instead", async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    // A regression that let the demo branch fall through to the fetch effect would show up
    // here as a non-empty `calls`, not as a thrown error — the service would answer
    // `class_not_found` for a code it never allocated, and the page would silently show that
    // instead of the sample. Counting calls catches it either way.
    globalThis.fetch = ((url: string) => {
      calls.push(String(url));
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "class_not_found" }) });
    }) as unknown as typeof fetch;
    try {
      const { result } = renderHook(() => useClassEvidence(DEMO_CLASS_CODE), {
        wrapper: withEntries(`/educator/class/${DEMO_CLASS_CODE}`),
      });
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      expect(calls).toHaveLength(0);
      const ready = result.current.state as ReadyState;
      expect(ready.record.code).toBe(DEMO_CLASS_CODE);
      expect(ready.analysis.rows.length).toBe(demoClassBundle().submissions.length);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("a real class with no submissions reports nothing", () => {
  const empty = analyseClass([]);

  it("has no students, no counts and no contrast", () => {
    expect(empty.rows).toEqual([]);
    expect(empty.contrast).toBeNull();
    expect(empty.awaitingReview).toEqual([]);
    expect(empty.totalMoneyCommittedToCourse).toBe(0);
  });

  it("reports every distribution as empty rather than as a shape", () => {
    expect(empty.distributions.length).toBeGreaterThan(0);
    for (const distribution of empty.distributions) {
      for (const share of distribution.shares) expect(share.seats).toEqual([]);
    }
  });

  /**
   * This used to count every *concept* as zero across every *status* — the `C1`–`C6`
   * taxonomy and the `demonstrated_independently`/`not_observed` status words, neither of
   * which any screen has rendered since the bespoke demo was deleted, and both of which are
   * now gone from `ClassAnalysis` rather than sitting in it waiting for a fifth vocabulary to
   * be wired back onto a teacher's page.
   *
   * The claim underneath is the one that matters and it survives verbatim: an empty class
   * reports an empty shape, never a shape with zeros standing in for children.
   */
  it("reports an empty class as empty rather than as a room of zeros", () => {
    expect(empty.worlds.every((world) => world.seats === 0)).toBe(true);
    expect(empty.adaptation.cutFirst).toEqual([]);
    expect(empty.prompts).toEqual([]);
  });

  it("offers no discussion prompts it has not earned", () => {
    expect(empty.prompts).toEqual([]);
  });

  it("never reports a count the sample class would have produced", () => {
    const sample = demoClassBundle().submissions;
    expect(sample.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(empty);
    for (const submission of sample) expect(serialised).not.toContain(`"${submission.seatCode}"`);
  });

  it("renders as empty on the real class page, and never as the sample", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        class: { code: "H4KVW", label: "Period 3", challengeId: "plan-under-pressure", createdAt: 0, expiresAt: 0 },
        assignments: [],
        submissions: [],
      }),
    })) as unknown as typeof fetch;
    try {
      render(
        <MemoryRouter initialEntries={["/educator/class/H4KVW?key=abcdefghijklmnop"]}>
          <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
        </MemoryRouter>,
      );
      await screen.findByText(/nothing turned in yet/i);
      expect(screen.queryByText(/sample/i)).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("a real class reports exactly what it was given", () => {
  function classOf(...seats: string[]): SubmissionRecord[] {
    return seats.map((seatCode) => buildSubmission({ seatCode }));
  }

  it("counts one student when one student submitted", () => {
    const analysis = analyseClass(classOf("3"));
    expect(analysis.rows.map((row) => row.seatCode)).toEqual(["3"]);
    const total = analysis.distributions[0]!.shares.reduce((sum, share) => sum + share.seats.length, 0);
    expect(total).toBe(1);
  });

  it("draws no contrast from a single student", () => {
    expect(analyseClass(classOf("3")).contrast).toBeNull();
  });

  it("attributes every count to seats that actually submitted", () => {
    const analysis = analyseClass(classOf("4", "9", "11"));
    const seats = new Set(analysis.rows.map((row) => row.seatCode));
    for (const distribution of analysis.distributions) {
      for (const share of distribution.shares) {
        for (const seat of share.seats) expect(seats).toContain(seat);
      }
    }
  });

  it("leaves reasoning unscored until a person scores it", () => {
    const analysis = analyseClass(classOf("4", "9"));
    expect(analysis.awaitingReview).toEqual(["4", "9"]);
    for (const row of analysis.rows) expect(row.result.grade.finalPoints).toBeNull();
  });
});

describe("the sample is labelled as a sample on every screen it appears on", () => {
  it("says so on the class overview", async () => {
    render(
      <MemoryRouter initialEntries={[`/educator/class/${DEMO_CLASS_CODE}`]}>
        <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(/sample/i)).length).toBeGreaterThan(0);
  });

  it("says so on a seat inside it, reached the same way a real one is", async () => {
    const firstSeat = demoClassBundle().submissions[0]!.seatCode;
    render(
      <MemoryRouter initialEntries={[`/educator/class/${DEMO_CLASS_CODE}/students/${firstSeat}`]}>
        <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(/sample/i)).length).toBeGreaterThan(0);
  });
});
