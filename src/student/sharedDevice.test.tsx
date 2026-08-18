// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentJoin } from "./Join";
import { attemptKeyForWorld } from "../domain/io/persistence";
import { studentIdHeld, studentToken } from "./session";

/**
 * The cart Chromebook, and the thing that must never survive a new person sitting down.
 *
 * The account system was built to stop exactly one failure and then left it standing in the
 * one place accounts do not reach. A student red team signed in with their own card on a
 * shared classroom machine and was shown **the previous student's turned-in plan and their
 * private written explanation** — because the attempt lives in this browser's storage and
 * nothing about signing in had ever touched it. They then played a whole run inside somebody
 * else's session state and were refused at submission, so both children lost the lesson.
 *
 * The rule these tests hold is one line and it is the whole of it: **a different account
 * signing in clears everything the last one left here; the same account signing in again keeps
 * its own work.** The comparison is the account id, not the token — a token is opaque and a
 * fresh one is issued on every sign-in, so comparing tokens would clear a student's own work
 * every time they came back.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

const CLASS = "H4KVW";

/** A service that lets anybody in and says which account they are. */
function door(studentId: string) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = url.endsWith("/roster") && (init?.method ?? "GET") === "GET"
      ? { label: "Period 3", joinMode: "roster" }
      : { studentId, seatCode: "7", displayName: "Ana R.", token: `token-for-${studentId}`, classCode: CLASS, label: "Period 3" };
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) } as Response);
  });
}

async function signIn(joinCode: string) {
  render(
    <MemoryRouter initialEntries={["/join"]}>
      <Routes>
        <Route path="/join" element={<StudentJoin />} />
        <Route path="/home" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.type(screen.getByLabelText("Class code"), CLASS);
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.type(await screen.findByLabelText("Your code"), joinCode);
  await userEvent.click(screen.getByRole("button", { name: "Go in" }));
  await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
  cleanup();
}

/** Somebody's half-finished run, sitting in this browser exactly as it would be. */
function leaveARunBehind(mark: string) {
  window.localStorage.setItem(attemptKeyForWorld("basketball"), JSON.stringify({ meta: { sessionId: mark } }));
  window.localStorage.setItem(attemptKeyForWorld("food-truck"), JSON.stringify({ meta: { sessionId: mark } }));
}

function whatIsLeft(): string {
  return `${window.localStorage.getItem(attemptKeyForWorld("basketball")) ?? ""}${window.localStorage.getItem(attemptKeyForWorld("food-truck")) ?? ""}`;
}

describe("a shared machine belongs to whoever is signed in now", () => {
  it("clears the last student's work when a different student signs in", async () => {
    vi.stubGlobal("fetch", door("s_first"));
    await signIn("AAAAA");
    leaveARunBehind("the-first-student-run");
    expect(whatIsLeft()).toContain("the-first-student-run");

    vi.stubGlobal("fetch", door("s_second"));
    await signIn("BBBBB");
    // Not "the second student sees a warning". Not "the second student can clear it". Gone.
    expect(whatIsLeft(), "one student could read another's run off a shared machine").not.toContain("the-first-student-run");
    expect(studentIdHeld()).toBe("s_second");
    expect(studentToken()).toBe("token-for-s_second");
  });

  it("keeps a student's own work when they sign in again", async () => {
    vi.stubGlobal("fetch", door("s_same"));
    await signIn("AAAAA");
    leaveARunBehind("my-own-run");

    await signIn("AAAAA");
    // A student who signs in again on their own laptop — after a session expired, or because
    // they closed the tab — must not be punished for it by losing twenty minutes of decisions.
    expect(whatIsLeft(), "a student's own work was cleared by their own sign-in").toContain("my-own-run");
  });

  it("takes the session with the work when a student hands the machine over", async () => {
    vi.stubGlobal("fetch", door("s_first"));
    await signIn("AAAAA");
    const { forgetStudent } = await import("./session");
    forgetStudent();
    // Clearing one and keeping the other is the shared-cart failure with an extra step.
    expect(studentToken()).toBeNull();
    expect(studentIdHeld()).toBeNull();
  });
});
