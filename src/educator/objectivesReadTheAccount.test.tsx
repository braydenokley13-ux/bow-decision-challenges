// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectiveDetail } from "./ObjectivePages";
import { rememberedClasses } from "./classMemory";
import { rememberTeacher } from "./teacherSession";
import { buildSubmission } from "../test/runChallenge";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { PLAN_UNDER_PRESSURE_LAUNCH } from "../domain/scenario/registry";
import { BUILT_WORLD_COVERAGE } from "../domain/competency/availability";
import type { CompetencyId } from "../domain/competency/types";

/**
 * "An account is how your classes come back on another computer" — including here.
 *
 * ## What a teacher found
 *
 * Two classes on the account, both listed by *My classes*, one of them assigned to
 * `nysed-pf-2026 · 1.3`. Straight to `/educator/objectives/nysed-pf-2026/1.3` on a fresh
 * browser: **one** class listed, no row for the other, no "not enough yet", nothing. Visiting
 * `/educator/classes` once populated `localStorage['bow.educator.v1.classes']`, and on the next
 * load the missing class appeared.
 *
 * So the answer to "what has Grade 7 shown against 1.3?" silently dropped classes on a computer
 * that had not happened to open them, against a sign-in page that promises the opposite. It was
 * the one educator surface still reading only this browser.
 *
 * ## What is asserted
 *
 * The review's own test: sign in on a browser that has never opened a class, go straight to the
 * objective, and the class on the account is there. `localStorage` is asserted empty at the
 * start of the render, because a test that let anything pre-populate it would pass without the
 * fix.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "CDT3H";
const KEY = "ARK4KYMMUU9PKJRRW4X6M3NE";
const CREATED_AT = 1_776_000_000_000;

function evidenceBody() {
  const competencyIds: CompetencyId[] = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.competencyId))];
  const submissions = Array.from({ length: 6 }, (_, index) => ({
    ...buildSubmission({ seatCode: String(index + 1), startedAt: CREATED_AT + index * 60_000 }),
    classCode: CODE,
    assignmentId: "assignment-CDT3H",
    displayName: `Student ${index + 1}`,
  }));
  return {
    class: { code: CODE, label: "Period 5 · Grade 7", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10 },
    assignments: [{
      id: "assignment-CDT3H", classId: CODE, objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" },
      competencyIds,
      allowedWorldIds: PLAN_UNDER_PRESSURE_LAUNCH.allowedWorlds,
      studentChoosesWorld: PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld,
      format: "decision-challenge", assignedStudentIds: null, createdAt: CREATED_AT,
    }],
    submissions,
    roster: submissions.map((submission, index) => ({ seatCode: submission.seatCode, displayName: `Student ${index + 1}`, claimed: true, claimedAt: 1, removedAt: null })),
    progress: [],
    feedback: [],
  };
}

/** The service a signed-in teacher's browser talks to, and nothing this browser remembers. */
function service() {
  const body = evidenceBody();
  return vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const payload = url.endsWith("/me/teaching")
      ? { classes: [{ code: CODE, label: "Period 5 · Grade 7", createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10, teacherKey: KEY }] }
      : url.includes("/submissions") ? body
        : {};
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(payload),
      text: () => Promise.resolve(JSON.stringify(payload)),
    } as Response);
  });
}

function openObjective() {
  return render(
    <MemoryRouter initialEntries={["/educator/objectives/nysed-pf-2026/1.3"]}>
      <Routes><Route path="/educator/objectives/:frameworkId/:code" element={<ObjectiveDetail />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { window.localStorage.clear(); });

describe("the objective page reads the account, not the browser", () => {
  it("lists a class this browser has never opened", async () => {
    rememberTeacher("a-signed-in-teacher");
    // The precondition. With a class already in `localStorage` this test would pass on the old
    // behaviour, which is exactly how the defect survived a browser that had opened the class.
    expect(rememberedClasses()).toEqual([]);
    vi.stubGlobal("fetch", service());

    openObjective();

    expect(await screen.findByText(/Period 5 · Grade 7/)).toBeInTheDocument();
  });

  /**
   * And it does not say "no classes on this computer" while the account is still answering. A
   * teacher who reads that sentence for two seconds has been told their term of work is gone.
   */
  it("does not announce an empty result before the account has answered", async () => {
    rememberTeacher("a-signed-in-teacher");
    vi.stubGlobal("fetch", service());

    openObjective();

    expect(screen.queryByText(/None of your classes has been set/i)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Period 5 · Grade 7/)).toBeInTheDocument());
  });

  /**
   * A teacher who never signs in loses nothing they had: with no token there is nothing to wait
   * for, and this browser's own classes are read exactly as before.
   */
  it("still reads this browser for a teacher with no account", async () => {
    vi.stubGlobal("fetch", service());
    window.localStorage.setItem("bow.educator.v1.classes", JSON.stringify([
      { code: CODE, label: "Period 5 · Grade 7", teacherKey: KEY, createdAt: CREATED_AT },
    ]));

    openObjective();

    expect(await screen.findByText(/Period 5 · Grade 7/)).toBeInTheDocument();
  });
});
