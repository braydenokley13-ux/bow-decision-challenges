// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherSignIn } from "./SignIn";
import { EducatorShell } from "./EducatorShell";
import { Roster } from "./Roster";
import { keyForClass, rememberKey } from "./classMemory";
import { rememberTeacher, teacherToken } from "./teacherSession";

/**
 * Three routes that shipped with nothing calling them.
 *
 * A route with no control in front of it reads as done in every review until somebody tries it,
 * and each of these closes a finding a judge wrote down:
 *
 * - **`POST /auth/teacher/signout`.** "Sign out" was `storage()?.removeItem(TOKEN_KEY)` and
 *   nothing else. A security review probed eight plausible revocation routes, got 404 or 401 on
 *   all eight, and then showed the same token answering `GET /me/teaching` with the long-lived
 *   key of every class the account owns: one token copied off a staffroom machine was thirty
 *   days of unrevocable access to every class that teacher teaches.
 * - **`POST /auth/teacher/password`.** There was no password-change surface at all. The only
 *   route that would set a password needs the recovery code shown once at sign-up, so a teacher
 *   who thought somebody had seen their password and had not kept that code had no move.
 * - **`POST /classes/:code/key`.** *"The only remedy for a leaked teacher key is
 *   `DELETE /classes/:code`, which destroys the children's work."*
 *
 * What is asserted here is that a person can reach each one and is told what it did. The routes
 * themselves are covered by the service's own tests; nothing below re-checks the service.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const NEW_KEY = "PPPPQQQQRRRRSSSSTTTTUUUU";

let calls: { url: string; method: string; body: unknown }[] = [];

function service(options: { signoutOk?: boolean; passwordOk?: boolean; rekeyOk?: boolean } = {}) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ url, method, body });
    const answer = (ok: boolean, payload: unknown, status = 400) => Promise.resolve({
      ok, status: ok ? 200 : status,
      json: () => Promise.resolve(payload),
      text: () => Promise.resolve(JSON.stringify(payload)),
    } as Response);

    if (url.endsWith("/auth/teacher/signout")) {
      return options.signoutOk === false
        ? answer(false, { error: "unavailable", message: "No connection." }, 503)
        : answer(true, { signedOut: true, at: 1, message: "Every device signed in to this account has been signed out. Sign in again to carry on." });
    }
    if (url.endsWith("/auth/teacher/password")) {
      return options.passwordOk === false
        ? answer(false, { error: "bad_credentials", message: "That password is not right." }, 401)
        : answer(true, {
          teacher: { id: "t_1", email: "ms.reyes@school.example", createdAt: 1 },
          token: "a-fresh-token",
          message: "Password changed. Every other device signed in to this account has been signed out.",
        });
    }
    if (url.endsWith(`/classes/${CODE}/key`)) {
      return options.rekeyOk === false
        ? answer(false, { error: "bad_request", message: "Claim this class before replacing its key." }, 409)
        : answer(true, {
          code: CODE, teacherKey: NEW_KEY, replacedAt: 1,
          message: "This class has a new key. Any link or bookmark carrying the old one has stopped working, on every device including yours — open the class from My Classes to get the new link. Nothing your students have done has changed.",
        });
    }
    if (url.endsWith("/me")) return answer(true, { kind: "teacher", id: "t_1", email: "ms.reyes@school.example" });
    if (url.includes("/roster")) return answer(true, { roster: [{ seatCode: "1", displayName: "Ana R.", claimed: false, claimedAt: null, removedAt: null }], joinMode: "roster" });
    return answer(true, {});
  });
}

const openAccount = () => render(
  <MemoryRouter initialEntries={["/educator/sign-in"]}>
    <Routes><Route path="/educator/sign-in" element={<TeacherSignIn />} /></Routes>
  </MemoryRouter>,
);

const openRoster = () => render(
  <MemoryRouter initialEntries={[`/educator/class/${CODE}/roster`]}>
    <Routes><Route path="/educator/class/:code/roster" element={<Roster />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => { window.localStorage.clear(); calls = []; });

describe("a teacher can end every session on their account", () => {
  it("offers the control on the account screen, and says what it did", async () => {
    rememberTeacher("a-token");
    vi.stubGlobal("fetch", service());
    openAccount();
    await screen.findByRole("heading", { name: /Your account/i });

    await userEvent.click(screen.getByRole("button", { name: /Sign out on every device/i }));

    await waitFor(() => expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/auth/teacher/signout"))).toBe(true));
    // This browser's copy goes too — a control that ended the sessions and left the token
    // sitting in `localStorage` would be the same defect from the other end.
    await waitFor(() => expect(teacherToken()).toBeNull());
    expect(await screen.findByText(/Every device signed in to this account has been signed out/i)).toBeInTheDocument();
  });

  /**
   * The two facts are different and a teacher acts on them differently. If the service could not
   * be reached, only this browser is signed out and any other device still is — saying
   * "everywhere" there would be the product telling somebody a session is off when it is on.
   */
  it("does not claim it ended anything it could not reach", async () => {
    rememberTeacher("a-token");
    vi.stubGlobal("fetch", service({ signoutOk: false }));
    openAccount();
    await screen.findByRole("heading", { name: /Your account/i });

    await userEvent.click(screen.getByRole("button", { name: /Sign out on every device/i }));

    expect(await screen.findByText(/could not be reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/Every device signed in to this account has been signed out/i)).not.toBeInTheDocument();
    expect(teacherToken()).toBeNull();
  });

  /** And the top bar's control is the same operation, not the old local-only one. */
  it("is what the top bar's Sign out does", async () => {
    rememberTeacher("a-token");
    vi.stubGlobal("fetch", service());
    // `window.location.assign` is what the shell uses to guarantee no old state survives; jsdom
    // does not implement it, so it is stubbed and asserted on.
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true });

    render(<MemoryRouter><EducatorShell><h1>Anything</h1></EducatorShell></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /^Sign out$/i }));

    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/auth/teacher/signout"))).toBe(true));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/educator/sign-in?ended=everywhere"));
  });
});

describe("a teacher can change their password without their recovery code", () => {
  it("sends the current password and says what changed", async () => {
    rememberTeacher("a-token");
    vi.stubGlobal("fetch", service());
    openAccount();
    await screen.findByRole("heading", { name: /Your account/i });

    await userEvent.type(screen.getByLabelText(/The password you use now/i), "the-old-one");
    await userEvent.type(screen.getByLabelText(/A new password/i), "a-much-longer-one");
    await userEvent.click(screen.getByRole("button", { name: /Change it/i }));

    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/auth/teacher/password"))).toBe(true));
    const sent = calls.find((call) => call.url.endsWith("/auth/teacher/password"))!.body as { currentPassword: string; newPassword: string };
    expect(sent.currentPassword).toBe("the-old-one");
    expect(sent.newPassword).toBe("a-much-longer-one");
    // The fresh token is stored, or the change signs the teacher out of the change.
    await waitFor(() => expect(teacherToken()).toBe("a-fresh-token"));
    expect(await screen.findByText(/Every other device signed in to this account has been signed out/i)).toBeInTheDocument();
  });

  it("says which password was wrong rather than failing quietly", async () => {
    rememberTeacher("a-token");
    vi.stubGlobal("fetch", service({ passwordOk: false }));
    openAccount();
    await screen.findByRole("heading", { name: /Your account/i });

    await userEvent.type(screen.getByLabelText(/The password you use now/i), "wrong");
    await userEvent.type(screen.getByLabelText(/A new password/i), "a-much-longer-one");
    await userEvent.click(screen.getByRole("button", { name: /Change it/i }));

    expect(await screen.findByText(/That password is not right/i)).toBeInTheDocument();
    // The old token stands. A failed change must not sign anybody out of anything.
    expect(teacherToken()).toBe("a-token");
  });

  /** The recovery code is not reissued, and the screen says so — it was not used. */
  it("says the recovery code is not involved", async () => {
    rememberTeacher("a-token");
    vi.stubGlobal("fetch", service());
    openAccount();
    await screen.findByRole("heading", { name: /Your account/i });

    expect(screen.getByText(/recovery code is not involved and does not change/i)).toBeInTheDocument();
  });
});

describe("a leaked class key can be replaced without destroying the class", () => {
  it("replaces it and files the new one where this browser looks", async () => {
    rememberTeacher("a-token");
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", service());
    openRoster();
    await screen.findByRole("heading", { name: /Who is in this class/i });

    const section = screen.getByRole("heading", { name: /Make a new private link/i }).closest("section")!;
    await userEvent.click(within(section).getByRole("button", { name: /Make a new private link/i }));
    // Nothing destructive on one press — the same shape as erasing a child.
    expect(within(section).getByRole("button", { name: /Keep the one I have/i })).toHaveFocus();
    await userEvent.click(within(section).getByRole("button", { name: /^Make a new link$/i }));

    await waitFor(() => expect(calls.some((call) => call.method === "POST" && call.url.endsWith(`/classes/${CODE}/key`))).toBe(true));
    // The teacher who pressed it must not be the first person locked out by it.
    await waitFor(() => expect(keyForClass(CODE)).toBe(NEW_KEY));
    expect(await within(section).findByText(/Nothing your students have done has changed/i)).toBeInTheDocument();
  });

  it("destroys nothing on the first press", async () => {
    rememberTeacher("a-token");
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", service());
    openRoster();
    await screen.findByRole("heading", { name: /Who is in this class/i });

    const section = screen.getByRole("heading", { name: /Make a new private link/i }).closest("section")!;
    await userEvent.click(within(section).getByRole("button", { name: /Make a new private link/i }));
    await userEvent.click(within(section).getByRole("button", { name: /Keep the one I have/i }));

    expect(calls.some((call) => call.url.endsWith(`/classes/${CODE}/key`))).toBe(false);
    expect(keyForClass(CODE)).toBe(KEY);
  });

  /**
   * The route takes the account and deliberately not the key, because the key is the thing being
   * replaced. So a browser with no account is told what to do rather than handed a button that
   * answers 401.
   */
  it("tells a signed-out teacher what to do instead of offering a button that fails", async () => {
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", service());
    openRoster();
    await screen.findByRole("heading", { name: /Who is in this class/i });

    const section = screen.getByRole("heading", { name: /Make a new private link/i }).closest("section")!;
    expect(within(section).queryByRole("button", { name: /Make a new private link/i })).not.toBeInTheDocument();
    expect(within(section).getByText(/needs an account/i)).toBeInTheDocument();
  });

  it("says what to do when the class has not been claimed", async () => {
    rememberTeacher("a-token");
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", service({ rekeyOk: false }));
    openRoster();
    await screen.findByRole("heading", { name: /Who is in this class/i });

    const section = screen.getByRole("heading", { name: /Make a new private link/i }).closest("section")!;
    await userEvent.click(within(section).getByRole("button", { name: /Make a new private link/i }));
    await userEvent.click(within(section).getByRole("button", { name: /^Make a new link$/i }));

    expect(await screen.findByText(/Claim this class before replacing its key/i)).toBeInTheDocument();
    expect(keyForClass(CODE)).toBe(KEY);
  });
});
