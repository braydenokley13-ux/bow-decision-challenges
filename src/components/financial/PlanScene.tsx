import { useEffect, useRef, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from "react";

/**
 * Every planning moment, laid out the same way: the decision on the left, Avery's money on
 * the right, and neither of them ever off screen.
 *
 * The planning screen used to be a single column nearly three thousand pixels tall with the
 * money receipt buried two thirds of the way down it, which meant the answer to "how much
 * does Avery have" was a scroll away from every question that depended on it. The rail is
 * the fix, and it is the same rail at all five money moments so the student learns to look
 * in one place.
 *
 * Below the two-column breakpoint the rail becomes a summary the student can open, pinned to
 * the top of the decision, because a stacked rail on a phone is just the old problem with
 * the order reversed.
 */
export function PlanScene({ ledger, children }: PropsWithChildren<{ ledger: ReactNode }>) {
  const rail = useRef<HTMLElement>(null);
  const height = usePinnedRailHeight(rail);
  return (
    <div className="plan-scene" style={{ "--rail-height": `${height}px` } as CSSProperties}>
      <aside ref={rail} className="plan-rail">{ledger}</aside>
      <div className="plan-scene__work">{children}</div>
    </div>
  );
}

/**
 * How much of the bottom of the screen the pinned rail is standing on, right now.
 *
 * The stylesheet used to reserve a fixed 68px for it, which was a guess and was wrong in both
 * directions. Idle at 390px the rail is 94px tall, so the last allocation row sat under it
 * with nowhere left to scroll — a stepper a student could see and could not press. Opened, the
 * rail takes half the viewport, and at the bottom of the page that put the button that commits
 * the plan *behind the top bar*: not merely awkward, but a required control with no scroll
 * position that reveals it.
 *
 * A measurement cannot drift from the thing it measures, so the rail is measured. The number
 * feeds the padding the work column reserves and the scroll padding the browser uses when it
 * moves focus, which is the half that keeps a keyboard user from being sent behind the bar.
 */
function usePinnedRailHeight(rail: { current: HTMLElement | null }): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = rail.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const pinned = window.matchMedia("(max-width: 980px)");
    const measure = () => setHeight(pinned.matches ? Math.ceil(element.getBoundingClientRect().height) : 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    pinned.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      pinned.removeEventListener("change", measure);
    };
  }, [rail]);
  useEffect(() => {
    // Set on the document because the scroll container is the page, not the layout: this is
    // what stops `scrollIntoView` and a focus move parking a control under the pinned rail.
    document.documentElement.style.scrollPaddingBottom = height > 0 ? `${height + 16}px` : "";
    return () => {
      document.documentElement.style.scrollPaddingBottom = "";
    };
  }, [height]);
  return height;
}
