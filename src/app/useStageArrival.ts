import { useEffect, useRef, type RefObject } from "react";
// Sets the flag `design/app.css` reads to keep the arrival ring off a page nobody has touched.
import "./arrivalRing";

/**
 * Arriving at a new screen puts you at the top of it, looking at its heading.
 *
 * A stage change replaces the whole screen but leaves the scroll position where the last one
 * ended, so a student who scrolled to commit a plan met the next beat already scrolled past
 * its own headline — including the one screen in the product where something goes wrong and
 * the whole page turns dark to say so. A story that opens mid-sentence is not a story, and a
 * keyboard user was never told the screen had changed at all.
 *
 * Both are the same fix: put the page back to the top and move focus to the new heading,
 * which is what announces the change to a screen reader. The first render is exempt — the
 * page is already at the top, and taking focus on arrival at the very first screen would
 * move it away from wherever the reader actually was.
 *
 * **It has to be the last scroll of the transition, and once it was not.** React runs a
 * child's effects before its parent's, and the stage renders the shell — so this hook is the
 * child, and a stage that scrolls its own newly revealed content into view on the same commit
 * had the final word. Measured at 1366×768: answering *Which place costs the least?* landed
 * the new headline *Now pick where Avery lives.* at `top: -11px` behind a 72px pinned bar,
 * with eighteen pixels of the question showing. `StudentChallenge.tsx` says of that reveal
 * that "where a screen starts is `useStageArrival`'s to say"; it is, now, because the same
 * scroll is asked for again on the next frame, after every effect in the commit has run.
 *
 * `preventScroll` on the focus is the other half. `focus()` scrolls the element into view
 * itself, instantly, which cancelled the smooth scroll this hook had just started and left the
 * page wherever the browser's own alignment put it. The heading still takes focus — that is
 * the announcement — it simply no longer argues with the scroll about where the top is.
 */
export function useStageArrival(heading: RefObject<HTMLElement | null>, stage: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const toTheTop = () => {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      heading.current?.focus({ preventScroll: true });
    };
    toTheTop();
    const frame = requestAnimationFrame(toTheTop);
    return () => cancelAnimationFrame(frame);
  }, [heading, stage]);
}

/**
 * How much of the top of the window the pinned bar is standing on, kept as the page's own
 * scroll padding.
 *
 * The stylesheet reserves a fixed step for it, which is right at the widths the bar was
 * designed at and wrong everywhere else: at 400% zoom the same bar wraps to three rows and
 * takes a third of the window, and a browser scrolling a control into view puts it underneath.
 * The bar knows its own height, so it says so, and every scroll the browser performs — moving
 * focus to a heading, revealing a section, following an anchor — stops short of it.
 */
export function usePinnedTopBar(bar: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = bar.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      document.documentElement.style.scrollPaddingTop = `${Math.ceil(element.getBoundingClientRect().height) + 12}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.scrollPaddingTop = "";
    };
  }, [bar]);
}
