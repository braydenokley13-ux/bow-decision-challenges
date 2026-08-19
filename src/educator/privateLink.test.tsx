// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MyClasses } from "./MyClasses";

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
   */
  it("promises the key is already filed, and the list keeps that promise", async () => {
    await createAClass();
    expect(screen.getByText(/already in your class list/i)).toBeInTheDocument();

    cleanup();
    vi.unstubAllGlobals();
    render(<MemoryRouter><MyClasses /></MemoryRouter>);

    const row = await screen.findByRole("link", { name: /Period 3/ });
    expect(row).toHaveAttribute("href", expect.stringContaining(CREATED.teacherKey));
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
});
