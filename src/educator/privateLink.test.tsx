// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MyClasses } from "./MyClasses";
import { Roster } from "./Roster";
import { keyForClass, rememberClass, rememberKey } from "./classMemory";
import { rememberTeacher } from "./teacherSession";

/**
 * What the class-created screen says about the private link, checked against what the next
 * screen actually does with it.
 *
 * The sentence used to be: "Bookmark this. It is saved in this browser, it is the only thing
 * that opens this class's evidence, and it is not shown again." Three claims, and the first
 * and third cannot both be true of the same string. The third was the false one: one link
 * away, `/educator/classes` renders every class as an anchor whose `href` carries the key.
 *
 * This is the shape of defect a single-screen test cannot see. Each screen was internally
 * coherent; they disagreed with each other. So this test renders both, and the assertion that
 * matters is the cross-check — whatever the created screen promises about where the key can be
 * seen, the list is the thing that has to honour it.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { window.localStorage.clear(); });

const CREATED = { code: "UXQCP", label: "Period 3", teacherKey: "JVX7NYHEX4A36UWAVPWQQFR9", createdAt: 1_700_000_000_000 };

function serviceThatCreates() {
  return vi.fn(() => Promise.resolve({
    ok: true, status: 200, json: () => Promise.resolve(CREATED),
  } as unknown as Response));
}

/**
 * The panel's own label. Scoped by selector because the phrase "your private link" is also in
 * the numbered steps above it — "Open the evidence with your private link when they are
 * finished." — and the two are saying different things to the same teacher.
 */
const keyLabel = () => screen.getByText("Your private link", { selector: "p.field-label" });

/** Fill in the name and press the button, which is the only way to reach the created screen. */
async function createAClass() {
  vi.stubGlobal("fetch", serviceThatCreates());
  render(<MemoryRouter><MyClasses /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText(/name this class/i), "Period 3");
  await userEvent.click(screen.getByRole("button", { name: /create/i }));
  await waitFor(() => expect(keyLabel()).toBeInTheDocument());
}

describe("what the created screen says about the private link", () => {
  it("does not claim the link is never shown again", async () => {
    await createAClass();

    const panel = keyLabel().closest("div")!;
    expect(panel.textContent).not.toMatch(/not shown again|shown only once|shown once/i);
  });

  /**
   * The claim it makes instead, and the one the list has to honour. If a future change stops
   * filing the key — reverting to "write this down or lose it" — this fails, because the
   * sentence would be false again in the other direction.
   *
   * *Filed* is the word doing the work, and it is now the whole of the promise: the list opens
   * the class because this browser holds the key, not because the key is written into the link.
   * It used to be written into the link, and an engineering review drove that in Chromium and
   * found it in `page.url()` on the roster while every child's name was on screen. So the
   * assertion is in two halves that have to hold together — the row does not carry the key, and
   * the key is nonetheless here.
   */
  it("promises the key is already filed, and the list keeps that promise", async () => {
    await createAClass();
    expect(screen.getByText(/already in your class list/i)).toBeInTheDocument();

    cleanup();
    vi.unstubAllGlobals();
    render(<MemoryRouter><MyClasses /></MemoryRouter>);

    const row = await screen.findByRole("link", { name: /Period 3/ });
    expect(row).toHaveAttribute("href", `/educator/class/${CREATED.code}`);
    expect(row.getAttribute("href")).not.toContain(CREATED.teacherKey);
    expect(keyForClass(CREATED.code)).toBe(CREATED.teacherKey);
  });

  /**
   * The one place the key is still written out, and the reason it stays there.
   *
   * The private link is a hand-over rather than navigation: it is what a teacher copies to open
   * this class on a second machine, and for a teacher with no account it is the only place the
   * key exists outside this browser's storage. Following it does not leave the key on screen —
   * `useTeacherKey` files it and rewrites the address bar — so what this pins is that the
   * screen which promises a link a teacher can keep is actually printing one.
   */
  it("still prints a link a teacher can carry to another computer", async () => {
    await createAClass();
    const panel = keyLabel().closest("div")!;
    expect(panel.textContent).toContain(`/educator/class/${CREATED.code}?key=${CREATED.teacherKey}`);
  });

  /**
   * The security claim is the one true clause of the original three, and it is the reason the
   * key exists at all. It stays.
   */
  it("keeps saying the class code alone will not open the evidence", async () => {
    await createAClass();
    expect(screen.getByText(/class code alone will not/i)).toBeInTheDocument();
  });

  /**
   * A teacher with no account is the one for whom losing this browser is unrecoverable, and
   * the old sentence said the same thing to everybody. Signed out, it must say so plainly.
   */
  it("warns a signed-out teacher that a wiped laptop takes it", async () => {
    await createAClass();
    expect(screen.getByText(/wiped laptop takes it/i)).toBeInTheDocument();
  });

  it("does not advertise the unusable creation key when an account owns the class", async () => {
    rememberTeacher("teacher-token");
    // Keep the creation form visible while the account list refreshes in the background.
    rememberClass({ ...CREATED, code: "H4KVW", label: "Existing class" });
    const calls: { url: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      const payload = url.endsWith("/me/teaching") ? { classes: [] } : CREATED;
      return Promise.resolve({
        ok: true,
        status: url.endsWith("/classes") ? 201 : 200,
        json: () => Promise.resolve(payload),
        text: () => Promise.resolve(JSON.stringify(payload)),
      } as Response);
    }));
    render(<MemoryRouter><MyClasses /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/name this class/i), "Period 3");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(await screen.findByText("Access to this class", { selector: "p.field-label" })).toBeInTheDocument();
    expect(screen.queryByText("Your private link", { selector: "p.field-label" })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(`?key=${CREATED.teacherKey}`);
    expect(screen.getAllByText(/account owns this class/i).length).toBeGreaterThan(0);
    expect(calls.find((call) => call.url.endsWith("/classes"))?.headers.Authorization).toBe("Bearer teacher-token");
  });

  it("shows a newly made access link immediately and explains its boundary", async () => {
    rememberTeacher("teacher-token");
    rememberKey(CREATED.code, CREATED.teacherKey);
    const newKey = "PPPPQQQQRRRRSSSSTTTTUUUU";
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      const payload = url.endsWith(`/classes/${CREATED.code}/key`) && init?.method === "POST"
        ? { code: CREATED.code, teacherKey: newKey, replacedAt: 2, message: "Private access link ready." }
        : { roster: [], joinMode: "roster" };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
        text: () => Promise.resolve(JSON.stringify(payload)),
      } as Response);
    }));
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CREATED.code}/roster`]}>
        <Routes><Route path="/educator/class/:code/roster" element={<Roster />} /></Routes>
      </MemoryRouter>,
    );

    const section = (await screen.findByRole("heading", { name: /make a new private link/i })).closest("section")!;
    const list = screen.getByRole("heading", { name: /^the list$/i });
    expect(section.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(within(section).getByRole("button", { name: /make a new private link/i }));
    await userEvent.click(within(section).getByRole("button", { name: /^make a new link$/i }));

    expect(await within(section).findByText(new RegExp(`/educator/class/${CREATED.code}\\?key=${newKey}`)))
      .toBeInTheDocument();
    expect(within(section).getByText(/grants access.*does not give away ownership/i)).toBeInTheDocument();
    expect(within(section).getByText(/every old private link has stopped working/i)).toBeInTheDocument();
  });
});
