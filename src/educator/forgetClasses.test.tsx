// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MyClasses } from "./MyClasses";
import { rememberClass, rememberedClasses } from "./classMemory";

/**
 * The most destructive control in the product, and the sentence that lied about where the key is.
 *
 * "Forget these classes on this computer" fired on one press. For a teacher with an account that
 * is a tidy-up — the classes come back from `GET /me/teaching` at the next sign-in. For a teacher
 * without one, on the screen that says "Saved in this browser only." a few inches higher, the
 * teacher keys are the only way into those classes and exist nowhere else: one press destroyed
 * them, and the classes and every student's work sat on the server for the rest of the retention
 * window with nothing able to open them. The roster has asked before erasing a single child since
 * it shipped; this asked nothing before erasing the way into all of them.
 *
 * These tests are about the promise, not the markup: nothing is destroyed until a teacher has been
 * told what they are destroying and said yes, the warning tells a signed-out teacher the truth
 * about their situation rather than the signed-in one's, and the safe choice holds focus.
 */

afterEach(cleanup);
beforeEach(() => { window.localStorage.clear(); });

function classes(count: number) {
  for (let index = 0; index < count; index += 1) {
    rememberClass({ code: `CODE${index}`, label: `Period ${index + 1}`, teacherKey: `KEY${index}`, createdAt: 1_700_000_000_000 + index });
  }
}

const view = () => render(<MemoryRouter><MyClasses /></MemoryRouter>);

describe("forgetting classes asks first", () => {
  it("destroys nothing on the first press", async () => {
    classes(3);
    view();
    await userEvent.click(screen.getByRole("button", { name: /forget these classes/i }));

    expect(rememberedClasses()).toHaveLength(3);
  });

  it("keeps them when the teacher backs out", async () => {
    classes(3);
    view();
    await userEvent.click(screen.getByRole("button", { name: /forget these classes/i }));
    await userEvent.click(screen.getByRole("button", { name: /keep them/i }));

    expect(rememberedClasses()).toHaveLength(3);
    expect(screen.getByRole("button", { name: /forget these classes/i })).toBeInTheDocument();
  });

  it("forgets them once the teacher has confirmed", async () => {
    classes(3);
    view();
    await userEvent.click(screen.getByRole("button", { name: /forget these classes/i }));
    await userEvent.click(screen.getByRole("button", { name: /^forget them$/i }));

    expect(rememberedClasses()).toEqual([]);
  });

  /**
   * The words are the whole point. A teacher with no account is one press from an unrecoverable
   * loss, and "on this computer" reads like a copy survives elsewhere. It must say that none does.
   */
  it("tells a signed-out teacher that this is the only copy", async () => {
    classes(3);
    view();
    await userEvent.click(screen.getByRole("button", { name: /forget these classes/i }));

    const warning = screen.getByText(/only way in/i);
    expect(warning).toHaveTextContent(/no account/i);
    expect(warning).toHaveTextContent(/cannot be undone/i);
    expect(warning).toHaveTextContent(/3 classes/);
  });

  /**
   * Focus on the safe button, held by a ref rather than by luck — the same rule, and the same
   * reasoning, as `keepIt` in `Roster.tsx`. A teacher who reaches this by keyboard must not be
   * one Enter from destroying the term.
   */
  it("lands focus on the safe button", async () => {
    classes(2);
    view();
    await userEvent.click(screen.getByRole("button", { name: /forget these classes/i }));

    expect(screen.getByRole("button", { name: /keep them/i })).toHaveFocus();
  });

  /** Both buttons carry the warning as their description, so it is read with either one. */
  it("describes both choices by the warning", async () => {
    classes(2);
    view();
    await userEvent.click(screen.getByRole("button", { name: /forget these classes/i }));

    const warnId = screen.getByText(/only way in/i).getAttribute("id");
    expect(warnId).toBeTruthy();
    for (const name of [/^forget them$/i, /keep them/i]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-describedby", warnId!);
    }
  });
});
