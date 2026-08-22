// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentJoin } from "./Join";
import { attemptKeyForWorld } from "../domain/io/persistence";
import { forgetStudent, joinCodeHeld, rememberStudentId, studentIdHeld, studentToken } from "./session";

/**
 * The defect `RULING.md` §5 names: an open-class student's join code is minted once
 * (`identity.ts`'s join route) and used to be thrown away unread. Their session dies in ten
 * hours on a shared device with no refresh route, and retyping their name the next day minted
 * a second seat, a second account, and an empty board under it — while the screen they landed
 * on already said "I have been here before" and pointed at a code nobody had shown them.
 *
 * These tests hold three things against that: the code is actually shown once, the same
 * browser can get back in on it without the code ever having to be retyped from memory or
 * paper, and — the property `sharedDevice.test.tsx` holds for the older failure — none of that
 * survives a different account being the one this browser last signed in as. A browser
 * recognising a class is not a browser recognising a *child*, so recognising one asks first
 * rather than filling a stranger's code into a box for them to press `Go in` on.
 */

const CLASS = "P6MKT";
const RECOVERY_KEY = "BOWRECOVERY1";

/** A fetch response built the way `session.ts`'s `call` expects to read it. */
function respond(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response);
}

/**
 * An open class with no roster, exactly as `server/identity.ts` actually behaves: a brand-new
 * name mints a seat and hands back a join code once; that same code, presented again, resolves
 * the same account and never repeats it.
 */
function openClassService() {
  let minted = 0;
  const accounts: Record<string, { displayName: string; seatCode: string }> = {};
  const codeToStudent: Record<string, string> = {};
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    if (url.endsWith("/roster") && method === "GET") {
      return respond({ label: "Room 9", joinMode: "open" });
    }
    if (url.endsWith("/join") && method === "POST") {
      const body = JSON.parse((init?.body as string) ?? "{}") as { joinCode?: string; displayName?: string };
      if (body.joinCode) {
        const studentId = codeToStudent[body.joinCode];
        if (!studentId) return respond({ error: "bad_credentials", message: "That did not match. Check it and try again." }, 401);
        const account = accounts[studentId]!;
        return respond({
          studentId, seatCode: account.seatCode, displayName: account.displayName,
          token: `token-${studentId}`, classCode: CLASS, label: "Room 9",
        });
      }
      minted += 1;
      const studentId = `s${minted}`;
      const seatCode = String(minted);
      const joinCode = `JOINCODE${minted}`;
      accounts[studentId] = { displayName: body.displayName ?? "", seatCode };
      codeToStudent[joinCode] = studentId;
      return respond({
        studentId, seatCode, displayName: body.displayName, token: `token-${studentId}`,
        classCode: CLASS, label: "Room 9", joinCode, recoveryKey: RECOVERY_KEY,
      }, 201);
    }
    return respond({ error: "not_found", message: "not found" }, 404);
  });
  return fetchMock;
}

function door(initialEntry = "/join") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/join" element={<StudentJoin />} />
        <Route path="/home" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function enterClassCode() {
  await userEvent.type(screen.getByLabelText("Class code"), CLASS);
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
}

async function signUpFresh(name: string) {
  door();
  await enterClassCode();
  await userEvent.type(await screen.findByLabelText("Name"), name);
  await userEvent.click(screen.getByRole("button", { name: "Go in" }));
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.localStorage.clear(); });

async function confirmCredentialsSaved() {
  const continueButton = screen.getByRole("button", { name: "Continue to my work" });
  expect(continueButton).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox", { name: "I saved it somewhere private." }));
  expect(continueButton).toBeEnabled();
  await userEvent.click(continueButton);
}

describe("an open-class student is shown their code and can use it to get back in", () => {
  it("keeps an ordinary first open-class join in new-account mode", async () => {
    vi.stubGlobal("fetch", openClassService());
    door();
    await enterClassCode();
    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Your BOW Key")).not.toBeInTheDocument();
  });

  it("shows the code the moment it is issued, before the run, and keeps it for this browser", async () => {
    vi.stubGlobal("fetch", openClassService());
    await signUpFresh("Ana");

    // Not home yet — the code has to be read first.
    expect(screen.queryByText("home")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Save these sign-in details." })).toBeInTheDocument();
    expect(screen.getByText("JOINCODE1")).toBeInTheDocument();
    expect(screen.getAllByText(RECOVERY_KEY)).toHaveLength(1);

    await confirmCredentialsSaved();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());

    // Persisted for the account it belongs to, not just displayed once and forgotten.
    expect(joinCodeHeld(CLASS)).toEqual({ studentId: "s1", joinCode: "JOINCODE1" });
    expect(studentIdHeld()).toBe("s1");
  });

  it("recognises the same browser, asks first, and gets back in on one honest yes", async () => {
    vi.stubGlobal("fetch", openClassService());
    await signUpFresh("Ana");
    await screen.findByRole("heading", { name: "Save these sign-in details." });
    await confirmCredentialsSaved();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());

    // A shared-device session dying overnight, with nothing else about this browser touched:
    // the token goes, `WHO_KEY` and the remembered code do not (`token.ts`).
    forgetStudent();
    expect(studentToken()).toBeNull();
    window.localStorage.setItem(attemptKeyForWorld("basketball"), JSON.stringify({ meta: { sessionId: "anas-run" } }));

    cleanup();
    door();
    await enterClassCode();

    // Recognised, but not handed the code without asking — see `token.ts`'s note on why a
    // recognised browser is not a recognised child.
    expect(await screen.findByRole("heading", { name: "Have you signed in here before?" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Class sign-in code")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Yes — that was me" }));
    const codeField = await screen.findByLabelText("Class sign-in code");
    expect(codeField).toHaveValue("JOINCODE1");
    // This is a return to the same class with the code this browser remembered. A BOW Key is
    // for linking a *new* class card; requiring it here defeats the same-device return path.
    expect(screen.queryByLabelText("Your BOW Key")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Go in" }));
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());

    // The same account, and — because it is the same account signing in again — the run this
    // browser was holding is still here rather than cleared as a stranger's would be.
    expect(studentIdHeld()).toBe("s1");
    expect(window.localStorage.getItem(attemptKeyForWorld("basketball"))).toContain("anas-run");
  });

  it("answering the recognition question honestly starts a fresh account rather than revealing the old code", async () => {
    vi.stubGlobal("fetch", openClassService());
    await signUpFresh("Ana");
    await screen.findByRole("heading", { name: "Save these sign-in details." });
    await confirmCredentialsSaved();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    forgetStudent();

    cleanup();
    door();
    await enterClassCode();
    await screen.findByRole("heading", { name: "Have you signed in here before?" });
    await userEvent.click(screen.getByRole("button", { name: "No — I am new here" }));

    // Landed on the ordinary name box, exactly as a student this browser has never seen would
    // — Ana's code was never put in a field for whoever answered "no" to see or submit.
    const nameField = await screen.findByLabelText("Name");
    expect(nameField).toHaveValue("");
    await userEvent.type(nameField, "Devon");
    await userEvent.click(screen.getByRole("button", { name: "Go in" }));

    // A second, distinct account — the ordinary open-join outcome for a child this browser
    // does not recognise, not a takeover of the first one's — with its own fresh code shown,
    // never Ana's.
    expect(await screen.findByText("JOINCODE2")).toBeInTheDocument();
    expect(screen.queryByText("JOINCODE1")).not.toBeInTheDocument();
    await confirmCredentialsSaved();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    expect(studentIdHeld()).toBe("s2");
  });

  it("a browser that has since signed somebody else in never offers the recognition question", async () => {
    vi.stubGlobal("fetch", openClassService());
    await signUpFresh("Ana");
    await screen.findByRole("heading", { name: "Save these sign-in details." });
    await confirmCredentialsSaved();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    forgetStudent();

    // The cart moved on: a different account is now the one `WHO_KEY` says this browser holds
    // (exactly what a second child's own join already does — see `sharedDevice.test.tsx`).
    // Ana's code is still sitting in `token.ts`'s map for this class; it must not matter.
    rememberStudentId("someone-else");

    cleanup();
    door();
    await enterClassCode();

    const nameField = await screen.findByLabelText("Name");
    expect(nameField).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Have you signed in here before?" })).not.toBeInTheDocument();
  });

  it("shows a recovery-key-only response once before Home, can copy it, and never stores it", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/roster") && (init?.method ?? "GET") === "GET") {
        return respond({ label: "Period 3", joinMode: "roster" });
      }
      if (url.endsWith("/join") && init?.method === "POST") {
        return respond({
          studentId: "roster-student", seatCode: "7", displayName: "Ana",
          token: "roster-token", classCode: CLASS, label: "Period 3", recoveryKey: RECOVERY_KEY,
        });
      }
      return respond({ error: "not_found", message: "not found" }, 404);
    }));

    door();
    await enterClassCode();
    await userEvent.type(await screen.findByLabelText("Class sign-in code"), "CARD7");
    await userEvent.click(screen.getByRole("button", { name: "Go in" }));

    expect(await screen.findByRole("heading", { name: "Save these sign-in details." })).toBeInTheDocument();
    expect(screen.queryByText("home")).not.toBeInTheDocument();
    expect(screen.getAllByText(RECOVERY_KEY)).toHaveLength(1);
    expect(screen.queryByText("JOINCODE1")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Copy BOW Key" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(RECOVERY_KEY));

    const stored = Array.from({ length: window.localStorage.length }, (_, index) => {
      const key = window.localStorage.key(index)!;
      return `${key}:${window.localStorage.getItem(key)}`;
    }).join("\n");
    expect(stored).not.toContain(RECOVERY_KEY);

    await confirmCredentialsSaved();
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    expect(screen.queryByText(RECOVERY_KEY)).not.toBeInTheDocument();
  });

  it("still requires the BOW Key when a new class card is linked to an existing account", async () => {
    const joins: Array<Record<string, string>> = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/roster") && (init?.method ?? "GET") === "GET") {
        return respond({ label: "Period 3", joinMode: "roster" });
      }
      if (url.endsWith("/join") && init?.method === "POST") {
        joins.push(JSON.parse((init.body as string) ?? "{}") as Record<string, string>);
        return respond({
          studentId: "same-account", seatCode: "7", displayName: "Ana",
          token: "linked-token", classCode: CLASS, label: "Period 3",
        });
      }
      return respond({ error: "not_found", message: "not found" }, 404);
    }));

    door("/join?intent=add-class");
    await enterClassCode();
    await userEvent.type(await screen.findByLabelText("Class sign-in code"), "NEWCARD7");
    expect(screen.getByLabelText("Link this new class to my BOW account")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Go in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/BOW Key.*new class card/i);
    expect(joins).toHaveLength(0);

    await userEvent.type(screen.getByLabelText("Your BOW Key"), RECOVERY_KEY);
    await userEvent.click(screen.getByRole("button", { name: "Go in" }));
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    expect(joins).toEqual([expect.objectContaining({ joinCode: "NEWCARD7", bowRecoveryKey: RECOVERY_KEY })]);
  });

  it("links an open class by name when Home carries add-class intent", async () => {
    const joins: Array<Record<string, string>> = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/roster") && (init?.method ?? "GET") === "GET") {
        return respond({ label: "Open Studio", joinMode: "open" });
      }
      if (url.endsWith("/join") && init?.method === "POST") {
        joins.push(JSON.parse((init.body as string) ?? "{}") as Record<string, string>);
        return respond({
          studentId: "same-account", seatCode: "12", displayName: "Ana",
          token: "linked-open-token", classCode: CLASS, label: "Open Studio",
        });
      }
      return respond({ error: "not_found", message: "not found" }, 404);
    }));

    door("/join?intent=add-class");
    await enterClassCode();
    await userEvent.type(await screen.findByLabelText("Name"), "Ana");
    expect(screen.getByLabelText("Your BOW Key")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Go in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/BOW Key.*link this class/i);
    expect(joins).toHaveLength(0);

    await userEvent.type(screen.getByLabelText("Your BOW Key"), RECOVERY_KEY);
    await userEvent.click(screen.getByRole("button", { name: "Go in" }));
    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    expect(joins).toEqual([expect.objectContaining({ displayName: "Ana", bowRecoveryKey: RECOVERY_KEY })]);
  });
});
