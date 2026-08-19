// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunMenu } from "./RunMenu";

/**
 * Where a student stands after asking to leave a run, and what they have been told by then.
 *
 * `runMenuTruth.test.tsx` next door holds what this control *says* about where the work is.
 * This holds the other half, which an accessibility critic measured with the keyboard and no
 * mouse: pressing *Leave this run* removed the button that was pressed, put two in its place,
 * and dropped focus on `<body>` — and the next `Tab` landed on
 * *"Yes — clear it and start again"*.
 *
 * The whole product teaches one motor pattern: `Tab` to the button, press `Enter`. On this
 * screen, once, that pattern erases an unfinished run off a shared Chromebook and it cannot be
 * got back. The sentence saying so was never announced either, because focus had gone to the
 * body instead of into the confirmation. And `Escape` did not close the menu, so the only ways
 * out of it were its own two buttons, one of which is the destructive one.
 */

afterEach(cleanup);

const PROPS = { classCode: "UXQCP", seatCode: "4", handIn: "idle" as const };

/** Open the disclosure the way a student does, and get to the confirm. */
async function askingToLeave(onLeave = vi.fn()) {
  const user = userEvent.setup();
  render(<RunMenu {...PROPS} onLeave={onLeave} />);
  await user.click(screen.getByText(/UXQCP/));
  await user.click(screen.getByRole("button", { name: /leave this run/i }));
  return { user, onLeave };
}

describe("asking to leave a run", () => {
  it("stands the student on the safe half of the confirm, not on the body", async () => {
    await askingToLeave();
    expect(document.activeElement, "focus fell to the body beside the destructive button")
      .toBe(screen.getByRole("button", { name: /no — keep working/i }));
  });

  it("never leaves the destructive button as the next thing Tab reaches", async () => {
    const { user } = await askingToLeave();
    const danger = screen.getByRole("button", { name: /yes — clear it/i });
    await user.tab();
    expect(document.activeElement, "one reflexive Tab put the student on the button that erases the run").not.toBe(danger);
  });

  it("carries what leaving costs on both buttons, so it is read wherever the student lands", async () => {
    await askingToLeave();
    for (const name of [/yes — clear it/i, /no — keep working/i]) {
      const button = screen.getByRole("button", { name });
      const described = button.getAttribute("aria-describedby");
      expect(described, `"${button.textContent}" says nothing about what leaving costs`).toBeTruthy();
      expect(document.getElementById(described!)).toHaveTextContent(/cannot be got back/i);
    }
  });

  it("puts the student back on the button they pressed when they decline", async () => {
    const { user } = await askingToLeave();
    await user.click(screen.getByRole("button", { name: /no — keep working/i }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /leave this run/i }));
  });
});

describe("getting out of the run menu", () => {
  it("closes on Escape and puts the student back on the control that opened it", async () => {
    const { user } = await askingToLeave();
    await user.keyboard("{Escape}");

    expect(document.querySelector(".run-menu")).not.toHaveAttribute("open");
    expect(document.activeElement).toBe(screen.getByText(/UXQCP/).closest("summary"));
  });

  it("does not leave the confirm standing open for the next time it is opened", async () => {
    const { user } = await askingToLeave();
    await user.keyboard("{Escape}");
    await user.click(screen.getByText(/UXQCP/));

    expect(screen.queryByRole("button", { name: /yes — clear it/i }), "the confirm was still open").toBeNull();
    expect(screen.getByRole("button", { name: /leave this run/i })).toBeInTheDocument();
  });
});
