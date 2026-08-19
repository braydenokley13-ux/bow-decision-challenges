// @vitest-environment jsdom
import { useRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePinnedTopBar } from "./useStageArrival";

/**
 * The reserve a pinned bar makes at the top of the page has to be space that exists.
 *
 * At 400% zoom on a 1280×1024 screen the challenge top bar wraps to 456px tall inside a 256px
 * viewport, and this hook reserved 468px of `scroll-padding-top`. The browser honours that: it
 * aligns a scrolled-to element 468px from the top of the scrollport, which on a 256px window is
 * 212px past the bottom of it. Measured in a real browser, the button that takes a booth landed
 * at `top: 446` in a window `256` high, and a keyboard user could not reach it by any scroll the
 * browser performs on their behalf.
 *
 * These are the two rules that came out of it, tested at the sizes that produced it.
 */
function Bar({ height, position }: { height: number; position: string }) {
  const ref = useRef<HTMLDivElement>(null);
  usePinnedTopBar(ref);
  return <div ref={ref} data-testid="bar" style={{ height, position } as never} />;
}

// jsdom has no ResizeObserver, and the hook correctly refuses to run without one.
class StubResizeObserver {
  observe() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", StubResizeObserver);

const at = (viewport: number, barHeight: number, position: string) => {
  Object.defineProperty(window, "innerHeight", { value: viewport, configurable: true, writable: true });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: barHeight } as DOMRect);
  vi.spyOn(window, "getComputedStyle").mockReturnValue({ position } as CSSStyleDeclaration);
  render(<Bar height={barHeight} position={position} />);
  return document.documentElement.style.scrollPaddingTop;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.scrollPaddingTop = "";
});

describe("what a pinned bar may reserve", () => {
  it("reserves its own height plus a step where there is room for it", () => {
    expect(at(768, 72, "sticky")).toBe("84px");
  });

  it("never reserves more than a third of the window", () => {
    // The measured case. 456 + 12 would be 468, inside a 256px window — the reserve that put
    // every scrolled-to control below the fold. A third of 256 is 85.
    expect(at(256, 456, "sticky")).toBe("85px");
  });

  it("caps a bar that is merely tall, not only one that is absurd", () => {
    // 200 + 12 inside a 400px window is 212 — under half the screen and still too much to
    // reserve. The rule is a fraction of the window, not a check for the pathological case.
    expect(at(400, 200, "sticky")).toBe("133px");
  });

  it("reserves nothing at all when the bar is not pinned", () => {
    // `scenes.css` un-pins this chrome below 480px of viewport height. A bar that scrolls away
    // stands on nothing, so there is nothing to stop short of — and the hook reads the computed
    // position rather than re-deriving the stylesheet's rule in a second place.
    expect(at(256, 456, "static")).toBe("");
  });
});
