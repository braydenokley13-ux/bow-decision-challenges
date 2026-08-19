// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalculationInput } from "./CalculationInput";
import { useInPlaceArrival } from "./useInPlaceArrival";

/**
 * What happens in the half-second after a control removes itself.
 *
 * An accessibility critic played both worlds and a teacher's whole pass with no mouse at all,
 * reading `document.activeElement` out of the page and recording every mutation inside every
 * live region. Sixty-seven screens, **zero** axe violations — and eleven screen changes that
 * left focus on `<body>`. Every one of them is invisible to a rule-based scanner, because the
 * DOM is valid before the press and valid after it and the defect lives in between.
 *
 * Three of those are here, and they are the same shape:
 *
 * 1. **Getting the sum right produced silence.** The whole box — the Check button and the
 *    `aria-live` line that was about to say *"That's the full amount."* — was unmounted in the
 *    same tick, so the message never reached an assistive technology and focus fell to
 *    `<body>`. Measured at six separate sums, in both worlds.
 * 2. **A repeated wrong answer produced silence too.** Attempt one announced
 *    `Too low. Both payments count…`; attempt two announced nothing, because identical text is
 *    not a mutation and a live region announces mutations. A student hears a hint once and
 *    then presses Check into silence however many times they try.
 * 3. **Both rungs of the hint ladder produced silence** — the two controls in this product
 *    that exist for a student who cannot do the task were the two that gave that student the
 *    least.
 *
 * jsdom cannot speak, so what these hold is the two things a screen reader needs and the
 * critic measured: where focus is, and whether the region carrying the words changed. The
 * browser transcripts are in `gauntlet/receipts/a11y-fix-pg1522/`.
 */

const PROPS = {
  calcId: "reliable-floor",
  label: "What Avery can count on",
  prompt: "Avery’s savings, plus base pay for every week of the season.",
  expected: 5000,
  low: "Too low. Both payments count — the money already saved and the base pay.",
  onSubmit: () => {},
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/**
 * The shape both worlds use: a box that is replaced by a sentence the moment its answer is
 * right. Basketball swaps in `p.question__settled`, the pop-up swaps in `p.popup-settled`;
 * this is the same swap with the same hook holding the focus, so what it pins is the rule
 * rather than one screen's markup.
 */
function SumThatSettles({ settled: initiallySettled = false }: { settled?: boolean }) {
  const [settled, setSettled] = useState(initiallySettled);
  const answer = useInPlaceArrival<HTMLParagraphElement>(settled);
  return settled
    ? <p className="settled" tabIndex={-1} ref={answer}>You worked this out. Avery can count on $5,000.</p>
    : <CalculationInput {...PROPS} onSubmit={(_raw, _value, correct) => { if (correct) setSettled(true); }} />;
}

/** Every mutation inside the polite region, identical text included — no dedupe. */
function watchLiveRegion(): { count: () => number } {
  const region = document.querySelector("[aria-live='polite']");
  if (!region) throw new Error("the verdict line is not a live region");
  let mutations = 0;
  const observer = new MutationObserver((records) => { mutations += records.length; });
  observer.observe(region, { subtree: true, childList: true, characterData: true });
  return { count: () => mutations };
}

describe("the verdict outlives the press that produced it", () => {
  it("says the same thing again when the student is wrong the same way twice", async () => {
    const user = userEvent.setup();
    render(<CalculationInput {...PROPS} />);
    const box = screen.getByLabelText(PROPS.label);
    const check = screen.getByRole("button", { name: "Check" });

    await user.type(box, "100");
    await user.click(check);
    expect(screen.getByText(PROPS.low)).toBeInTheDocument();

    // The same verdict, a second time. Before this fix nothing in the region changed and a
    // screen reader said nothing at all.
    const live = watchLiveRegion();
    await user.clear(box);
    await user.type(box, "200");
    await user.click(check);

    expect(live.count(), "the second wrong answer did not change the live region").toBeGreaterThan(0);
    expect(screen.getByText(PROPS.low)).toBeInTheDocument();
  });

  it("leaves focus on Check when the answer is wrong, so the student can try again where they are", async () => {
    const user = userEvent.setup();
    render(<CalculationInput {...PROPS} />);
    await user.type(screen.getByLabelText(PROPS.label), "100");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Check" }));
  });
});

describe("the hint ladder speaks to the student who asked for it", () => {
  it("puts the student on the step-by-step hint, not on the body of the document", async () => {
    const user = userEvent.setup();
    render(<CalculationInput {...PROPS} priorAttempts={2} scaffold="Add the two that arrive no matter what: $500 + $4,500." />);
    await user.click(screen.getByRole("button", { name: /show me one step/i }));

    const hint = document.querySelector("[role='note']");
    expect(hint).toHaveTextContent(/Add the two that arrive no matter what/);
    expect(document.activeElement, "focus went to the body instead of to the hint").toBe(hint);
  });

  it("puts the student back on the box holding the answer when the last rung supplies it", async () => {
    const user = userEvent.setup();
    render(<CalculationInput {...PROPS} priorAttempts={3} />);
    await user.click(screen.getByRole("button", { name: /show the answer and keep going/i }));

    const box = screen.getByLabelText(PROPS.label);
    expect(box).toHaveValue("5000");
    expect(document.activeElement, "focus went to the body instead of back to the answer").toBe(box);
  });
});

describe("the line that replaces the box is where the student is put", () => {
  it("moves focus to the sentence that took the box's place when the answer is right", async () => {
    const user = userEvent.setup();
    render(<SumThatSettles />);
    await user.type(screen.getByLabelText(PROPS.label), "5000");
    await user.click(screen.getByRole("button", { name: "Check" }));

    const settled = document.querySelector(".settled");
    expect(settled).toBeInTheDocument();
    expect(document.activeElement, "focus fell to the body when the box was removed").toBe(settled);
  });

  it("does not pull focus on a screen that opens with the answer already settled", () => {
    render(<SumThatSettles settled />);
    // A refresh, or a step back to a question that is done. The screen's own arrival owns
    // focus there; taking it here would move the reader away from where they were.
    expect(document.activeElement).toBe(document.body);
  });
});
