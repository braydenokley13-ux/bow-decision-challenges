// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalculationInput } from "./CalculationInput";

/**
 * Pressing Check has to change something the student can see.
 *
 * On a phone the input and the Check button sit at the bottom edge of the window and the
 * verdict renders under them. Measured in Chromium at 390 x 844: three presses of **Check**
 * left "Too low…" at y=840–857 and the "Show me one step" / "Show the answer and keep going"
 * pair at y=866–971 — every one of them below an 844px fold, with the page not scrolling at
 * all. A student who presses a button three times and sees nothing move decides the product
 * is broken, and the two controls they never saw are the whole scaffold ladder.
 *
 * jsdom has no layout, so this cannot assert pixels. What it can hold is the contract that
 * produced them: an answer scrolls its own verdict into view, with the smallest scroll that
 * will do, and an untouched field does not scroll the page at all.
 */

const PROPS = {
  calcId: "sublet-total",
  label: "What the Gym District Sublet costs Avery",
  prompt: "$225 a week × 8 weeks",
  expected: 1800,
  onSubmit: () => {},
};

let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as Element["scrollIntoView"];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("the answer to Check is put on the screen", () => {
  it("does not scroll the page before anything has been checked", () => {
    render(<CalculationInput {...PROPS} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls the verdict into view after a wrong answer, by the smallest scroll that will do", async () => {
    const user = userEvent.setup();
    render(<CalculationInput {...PROPS} />);
    await user.type(screen.getByLabelText(PROPS.label), "123");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText(/too low/i)).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.calls.at(-1)?.[0]).toMatchObject({ block: "nearest" });
  });

  it("scrolls again when the help ladder appears, so the buttons it offers are on the screen", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CalculationInput {...PROPS} priorAttempts={0} />);
    await user.type(screen.getByLabelText(PROPS.label), "123");
    await user.click(screen.getByRole("button", { name: "Check" }));
    const afterFirst = scrollIntoView.mock.calls.length;

    rerender(<CalculationInput {...PROPS} priorAttempts={2} />);
    expect(screen.getByRole("button", { name: /show me one step/i })).toBeInTheDocument();
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it("keeps the verdict in a polite live region, so it reaches a screen reader as well", async () => {
    const user = userEvent.setup();
    const { container } = render(<CalculationInput {...PROPS} />);
    await user.type(screen.getByLabelText(PROPS.label), "123");
    await user.click(screen.getByRole("button", { name: "Check" }));

    const live = container.querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent(/too low/i);
  });
});
