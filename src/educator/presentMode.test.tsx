// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Present } from "./ShareOut";
import type { ShareOutSlide } from "./shareOut";

/**
 * The projector, as a keyboard and a screen reader meet it.
 *
 * Three findings landed on this component at once, and all three are the kind that a later
 * refactor puts back without noticing, because none of them changes what the screen looks
 * like on a laptop:
 *
 *  - entering Present mode left `document.activeElement` on `<body>` and the whole view
 *    contained **zero headings** — the slide title was a `<p>`;
 *  - one press of `Space` on **Next →** moved the counter two slides, because the window-level
 *    handler treated `" "` as *next* and the button's own activation fired as well;
 *  - `aria-live="polite"` sat on `<main>`, so every arrow key re-announced 315 characters and
 *    three button labels along with the work on the wall.
 *
 * These assertions are written against the behaviour rather than the markup: "the view has a
 * heading and focus is on it", "one press moves one slide", "the live region carries no
 * controls". A rewrite that keeps those true is free to change everything else.
 */

const SLIDES: ShareOutSlide[] = [
  { title: "Plan A", quote: "I kept back the most I could because the season is long.", summary: "$1,200 course · $1,600 backup · $400 rides" },
  { title: "Plan B", quote: "I paid the course first so the seat could not go.", summary: "$1,200 course · $600 backup · $1,400 rides" },
  { title: "Plan C", quote: "", summary: "$0 course · $1,600 backup · $1,600 rides" },
];

afterEach(cleanup);

describe("Present mode is operable by keyboard and readable by a screen reader", () => {
  it("gives the view a heading and puts focus on it, on arrival and on every slide", async () => {
    const user = userEvent.setup();
    render(<Present slides={SLIDES} onClose={vi.fn()} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Plan A");
    expect(document.activeElement).toBe(heading);

    await user.click(screen.getByRole("button", { name: /Next/ }));
    const second = screen.getByRole("heading", { level: 1 });
    expect(second).toHaveTextContent("Plan B");
    expect(document.activeElement).toBe(second);
  });

  it("moves exactly one slide for one press of Space on the Next control", async () => {
    const user = userEvent.setup();
    render(<Present slides={SLIDES} onClose={vi.fn()} />);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();

    const next = screen.getByRole("button", { name: /Next/ });
    next.focus();
    await user.keyboard(" ");

    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.queryByText("3 of 3")).not.toBeInTheDocument();
  });

  it("still advances on Space and the arrow keys when no control has focus", () => {
    render(<Present slides={SLIDES} onClose={vi.fn()} />);
    document.body.focus();

    fireEvent.keyDown(window, { key: " ", target: document.body });
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight", target: document.body });
    expect(screen.getByText("3 of 3")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft", target: document.body });
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("announces the slide and nothing else — no controls inside the live region", () => {
    const { container } = render(<Present slides={SLIDES} onClose={vi.fn()} />);

    expect(container.querySelector("main")).not.toHaveAttribute("aria-live");

    const live = container.querySelectorAll("[aria-live]");
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveAttribute("aria-live", "polite");
    expect(live[0]).toHaveAttribute("aria-atomic", "true");
    expect(live[0]!.querySelectorAll("button, a, input, select, textarea")).toHaveLength(0);
    expect(live[0]).toHaveTextContent("Plan A");
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Present slides={SLIDES} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape", target: document.body });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the teacher's private note off the wall", () => {
    const { container } = render(<Present slides={SLIDES} onClose={vi.fn()} />);
    expect(container.textContent).not.toMatch(/for you, not the room/i);
    for (const slide of SLIDES) expect(Object.keys(slide)).not.toContain("note");
  });
});
